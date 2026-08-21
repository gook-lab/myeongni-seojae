/**
 * 명리서재 — 공유 토큰
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 정직하게 시작하자
 *
 * 서버가 없다. 그러니 링크로 결과를 복원하려면 링크 안에 입력이 들어 있어야
 * 한다. 이건 **암호화가 아니다.** 링크를 받은 사람은 생년월일시를 되읽을 수
 * 있고, 되읽을 수 있어야 링크가 작동한다. 그걸 숨기지 않고 화면에 적는다.
 *
 * 그럼 왜 그냥 ?year=1990&month=5 로 안 하는가. 막으려는 게 다른 것이기
 * 때문이다 — **지나가다 읽히는 것**이다.
 *
 *   · 브라우저 주소창과 방문 기록에 생년월일이 평문으로 남는 것
 *   · 링크를 붙여넣은 채팅·문서에서 미리보기로 노출되는 것
 *   · 오류 리포트·분석 도구가 URL 을 통째로 삼키는 것
 *
 * 그래서 두 가지를 한다.
 *
 *   1. 쿼리스트링이 아니라 **프래그먼트(#)** 에 싣는다. 프래그먼트는 서버로
 *      전송되지 않고 Referer 헤더에도 실리지 않는다. 정적 호스팅의 접근
 *      로그에 남지 않는다는 뜻이다.
 *   2. 비트로 접어 base64url 로 만든다. 열 글자짜리 불투명 문자열이 된다.
 *      복호화를 막지는 못하지만 어깨너머로 읽히지는 않는다.
 *
 * Sentry 는 URL 의 프래그먼트를 통째로 버린다(observability/sentry.ts).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 비트로 접나
 *
 * JSON 을 base64 하면 80자가 넘는다. 카카오톡에서 줄이 접히고, 어떤 앱은
 * 긴 URL 뒤를 잘라버린다. 잘린 링크는 조용히 다른 사주를 보여주는 게 아니라
 * 반드시 실패해야 하므로 체크섬을 붙였다.
 *
 * 47비트(버전 포함) + 체크섬 16비트 = 63비트 → 8바이트 → base64url 11글자.
 *
 * 체크섬을 16비트로 둔 이유: 8비트면 손상된 링크가 256분의 1 확률로 통과한다.
 * 통과하면 조용히 **다른 사람의 사주**가 나온다. 계산이 틀리는 것보다 나쁘다.
 * 두 글자 더 쓰고 65,536분의 1로 내린다.
 */

import { REGIONS, SEOUL, findRegion } from './regions';
import type { RawFormValues } from './types';

/** 토큰 형식 버전. 필드가 바뀌면 올린다 — 옛 링크를 조용히 오독하지 않으려고. */
const VERSION = 1;

/** 연도 기준점. 8비트로 1900~2155 를 담는다. */
const YEAR_BASE = 1900;

/**
 * 폼 값은 문자열로도 들어온다("1990"). 접기 전에 숫자로 만든다.
 * 비어 있으면 기본값 — 링크를 만들 수 있는 시점이면 이미 검증을 통과한
 * 입력이므로 여기서 다시 따지지 않는다.
 */
const num = (v: number | string | undefined, fallback: number): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Math.trunc(n) : fallback;
};

interface Field {
  readonly bits: number;
  readonly read: (f: RawFormValues) => number;
  readonly write: (v: number, out: Partial<RawFormValues>) => void;
}

/**
 * 필드 순서가 곧 형식이다. 순서를 바꾸면 옛 링크가 깨지므로
 * 바꿔야 한다면 VERSION 을 올릴 것.
 */
const FIELDS: readonly Field[] = [
  { bits: 8, read: (f) => num(f.year, YEAR_BASE) - YEAR_BASE, write: (v, o) => { o.year = v + YEAR_BASE; } },
  { bits: 4, read: (f) => num(f.month, 1) - 1, write: (v, o) => { o.month = v + 1; } },
  { bits: 5, read: (f) => num(f.day, 1) - 1, write: (v, o) => { o.day = v + 1; } },
  { bits: 1, read: (f) => (f.calendar === 'lunar' ? 1 : 0), write: (v, o) => { o.calendar = v ? 'lunar' : 'solar'; } },
  { bits: 1, read: (f) => (f.leapMonth ? 1 : 0), write: (v, o) => { o.leapMonth = v === 1; } },
  { bits: 1, read: (f) => (f.hourKnown ? 1 : 0), write: (v, o) => { o.hourKnown = v === 1; } },
  { bits: 5, read: (f) => num(f.hour, 12), write: (v, o) => { o.hour = v; } },
  { bits: 6, read: (f) => num(f.minute, 0), write: (v, o) => { o.minute = v; } },
  { bits: 1, read: (f) => (f.gender === '여' ? 1 : 0), write: (v, o) => { o.gender = v ? '여' : '남'; } },
  {
    bits: 5,
    read: (f) => {
      const lon = f.longitude ?? SEOUL.longitude;
      const i = REGIONS.findIndex((r) => Math.abs(r.longitude - lon) < 0.0005);
      return i < 0 ? 0 : i;
    },
    write: (v, o) => { o.longitude = (REGIONS[v] ?? SEOUL).longitude; },
  },
  { bits: 1, read: (f) => (f.yajasi === 'advance-day' ? 1 : 0), write: (v, o) => { o.yajasi = v ? 'advance-day' : 'preserve-day'; } },
  { bits: 1, read: (f) => (f.applyEquationOfTime ? 1 : 0), write: (v, o) => { o.applyEquationOfTime = v === 1; } },
];

const PAYLOAD_BITS = 4 + FIELDS.reduce((a, f) => a + f.bits, 0);

class BitWriter {
  private acc = 0;
  private n = 0;
  readonly bytes: number[] = [];

  push(value: number, bits: number): void {
    for (let i = bits - 1; i >= 0; i -= 1) {
      this.acc = (this.acc << 1) | ((value >> i) & 1);
      this.n += 1;
      if (this.n === 8) {
        this.bytes.push(this.acc & 0xff);
        this.acc = 0;
        this.n = 0;
      }
    }
  }

  finish(): number[] {
    if (this.n > 0) {
      this.bytes.push((this.acc << (8 - this.n)) & 0xff);
      this.acc = 0;
      this.n = 0;
    }
    return this.bytes;
  }
}

class BitReader {
  private pos = 0;
  constructor(private readonly bytes: Uint8Array) {}

  take(bits: number): number {
    let v = 0;
    for (let i = 0; i < bits; i += 1) {
      const byte = this.bytes[this.pos >> 3] ?? 0;
      v = (v << 1) | ((byte >> (7 - (this.pos & 7))) & 1);
      this.pos += 1;
    }
    return v;
  }
}

const CHECKSUM_BITS = 16;

/** FNV-1a 를 16비트로 접는다. 암호용이 아니라 손상된 링크를 걸러내는 용도다. */
function checksum(bytes: readonly number[]): number {
  let h = 0x811c9dc5;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ((h >>> 16) ^ h) & 0xffff;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(bytes: readonly number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const n = (a << 16) | (b << 8) | c;
    const chars = [(n >> 18) & 63, (n >> 12) & 63, (n >> 6) & 63, n & 63];
    const keep = i + 3 <= bytes.length ? 4 : bytes.length - i + 1;
    for (let k = 0; k < keep; k += 1) out += B64[chars[k] as number];
  }
  return out;
}

function fromBase64Url(s: string): Uint8Array | null {
  const vals: number[] = [];
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) return null;
    vals.push(v);
  }
  const bytes: number[] = [];
  for (let i = 0; i < vals.length; i += 4) {
    const chunk = vals.slice(i, i + 4);
    const n =
      ((chunk[0] ?? 0) << 18) | ((chunk[1] ?? 0) << 12) | ((chunk[2] ?? 0) << 6) | (chunk[3] ?? 0);
    const count = chunk.length - 1;
    if (count >= 1) bytes.push((n >> 16) & 0xff);
    if (count >= 2) bytes.push((n >> 8) & 0xff);
    if (count >= 3) bytes.push(n & 0xff);
  }
  return new Uint8Array(bytes);
}

/** 입력을 열 글자짜리 불투명 토큰으로 접는다. */
export function encodeShareToken(form: RawFormValues): string {
  const w = new BitWriter();
  w.push(VERSION, 4);
  for (const f of FIELDS) w.push(f.read(form), f.bits);
  const payload = w.finish();
  const full = new BitWriter();
  for (const b of payload) full.push(b, 8);
  full.push(checksum(payload), CHECKSUM_BITS);
  return toBase64Url(full.finish());
}

export type ShareDecodeError = 'malformed' | 'checksum' | 'version' | 'range';

export interface ShareDecodeResult {
  ok: boolean;
  form?: RawFormValues;
  error?: ShareDecodeError;
}

/**
 * 토큰을 편다.
 *
 * 잘렸거나 손상된 링크는 **반드시 실패해야 한다.** 조용히 다른 사람의
 * 사주를 보여주는 것이 최악이다.
 */
export function decodeShareToken(token: string): ShareDecodeResult {
  const trimmed = token.trim();
  const bytes = fromBase64Url(trimmed);
  const payloadBytes = Math.ceil(PAYLOAD_BITS / 8);
  const total = payloadBytes + CHECKSUM_BITS / 8;
  if (!bytes || bytes.length !== total) return { ok: false, error: 'malformed' };

  // base64 의 마지막 글자에는 실제로 안 쓰는 여분 비트가 있다. 그 비트만
  // 바뀐 토큰은 같은 바이트로 풀리므로 체크섬이 잡아내지 못한다. 다시 접어
  // 원본과 같은지 봐서 표준형이 아닌 토큰을 걸러낸다 — 모든 글자가
  // 의미를 갖게 하는 것이다.
  if (toBase64Url([...bytes]) !== trimmed) return { ok: false, error: 'malformed' };

  const payload = [...bytes.slice(0, payloadBytes)];
  const given = ((bytes[payloadBytes] ?? 0) << 8) | (bytes[payloadBytes + 1] ?? 0);
  if (checksum(payload) !== given) return { ok: false, error: 'checksum' };

  const r = new BitReader(new Uint8Array(payload));
  if (r.take(4) !== VERSION) return { ok: false, error: 'version' };

  const out: Partial<RawFormValues> = {};
  for (const f of FIELDS) f.write(r.take(f.bits), out);

  // 이름은 담지 않는다. 이름이 들어간 링크는 생년월일이 들어간 링크보다
  // 나쁘다 — 누구 것인지가 붙는 순간 성질이 달라진다.
  const form = out as RawFormValues;
  const y = num(form.year, 0);
  const m = num(form.month, 0);
  const d = num(form.day, 0);
  const hh = num(form.hour, -1);
  const mi = num(form.minute, -1);
  const sane =
    y >= 1900 && y <= 2155 &&
    m >= 1 && m <= 12 &&
    d >= 1 && d <= 31 &&
    hh >= 0 && hh <= 23 &&
    mi >= 0 && mi <= 59 &&
    form.longitude !== undefined &&
    findRegion(form.longitude) !== undefined;
  if (!sane) return { ok: false, error: 'range' };

  return { ok: true, form };
}

/** 프래그먼트 키. 쿼리가 아니라 # 뒤에 실린다. */
export const SHARE_HASH_KEY = 'r';

export function buildShareUrl(base: string, form: RawFormValues): string {
  const url = new URL(base);
  url.hash = `${SHARE_HASH_KEY}=${encodeShareToken(form)}`;
  return url.toString();
}

/** 현재 주소의 프래그먼트에서 토큰을 꺼낸다. 없으면 null. */
export function readShareToken(hash: string): string | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!h) return null;
  for (const part of h.split('&')) {
    const [k, v] = part.split('=');
    if (k === SHARE_HASH_KEY && v) return v;
  }
  return null;
}

/**
 * 저장 키. 인생 대조표가 이걸 쓴다 — 같은 사주면 같은 키가 나오고,
 * 키 자체는 생년월일을 평문으로 담지 않는다.
 */
export function chartKey(form: RawFormValues): string {
  return encodeShareToken(form);
}
