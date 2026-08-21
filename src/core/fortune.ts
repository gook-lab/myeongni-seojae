/**
 * 명리서재 — 부가 운세 (오늘 · 신년 · 궁합)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 점수가 없다
 *
 * 원본 구현은 오늘의 운세·궁합·신년운세 세 곳 모두에서 Math.sin 난수로
 * 점수를 만들고 있었다. 명리에는 정설화된 점수법이 없다. 새 산식을 만드는
 * 것도 근거 없는 숫자를 근거 있어 보이게 포장하는 것일 뿐이다.
 *
 * 타임라인이 정확한데 옆 탭에서 가짜 숫자가 뜨면 전체 신뢰가 무너진다.
 * 그래서 숫자를 버리고 문장만 남긴다. 대신 "왜 그런가"를 보여준다 —
 * 오늘의 일진 간지가 무엇이고 내 일간과 어떤 십성 관계인지.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 오늘·올해의 간지는 어느 타임라인으로 읽는가
 *
 * 사용자의 출생 시각이 아니라 "지금"을 읽는 것이므로 출생지 경도가 아니라
 * 현재 한국 시각을 쓴다. 절기 비교가 필요한 세운(년)은 UTC+8 로,
 * 일진(일)은 한국 진태양시로 읽는다 — 원국과 같은 규칙이다.
 */

import { Solar } from 'lunar-javascript';
import { TEN_GOD_CATEGORY } from './constants';
import { tenGodOf } from './daeun';
import { ERROR_MESSAGES, err, ok, type SajuResult } from './errors';
import {
  LIBRARY_TZ_OFFSET_MINUTES,
  SEOUL_LONGITUDE,
  fieldsAtOffset,
  longitudeOffsetMinutes,
} from './korea-time';
import { pillarFromGanZhi } from './manse';
import type { Pillar, TenGod, TenGodCategory } from './types';

const STEM_HANJA_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

const stemIdx = (hanja: string) => STEM_HANJA_ORDER.indexOf(hanja);

export interface FortuneRelation {
  pillar: Pillar;
  ganji: string;
  tenGod: TenGod;
  category: TenGodCategory;
}

export interface DailyFortune extends FortuneRelation {
  date: { year: number; month: number; day: number };
}

export interface MonthFortune extends FortuneRelation {
  /** 1~12 (양력 기준 월 번호가 아니라 절기월 순서의 표시용 라벨) */
  label: string;
}

export interface YearFortune extends FortuneRelation {
  year: number;
  months: MonthFortune[];
}

/** 일간(한자)과 상대 천간(한자)으로 십성 관계를 만든다 */
function relate(dayStemHanja: string, ganji: string): FortuneRelation | null {
  const pillar = pillarFromGanZhi(ganji);
  if (!pillar) return null;
  const d = stemIdx(dayStemHanja);
  const o = stemIdx(pillar.stemHanja);
  if (d < 0 || o < 0) return null;
  const tenGod = tenGodOf(d, o);
  return { pillar, ganji, tenGod, category: TEN_GOD_CATEGORY[tenGod] };
}

/**
 * 오늘의 일진.
 * @param dayMaster 사용자의 일간
 * @param now       지금. 테스트에서 고정할 수 있게 주입한다
 */
export function dailyFortune(
  dayMaster: Pillar,
  now: Date = new Date(),
): SajuResult<DailyFortune> {
  // 일진은 원국의 일주와 같은 규칙 — 한국 진태양시로 읽는다
  const f = fieldsAtOffset(now, longitudeOffsetMinutes(SEOUL_LONGITUDE));
  try {
    const ec = Solar.fromYmdHms(f.year, f.month, f.day, f.hour, f.minute, f.second)
      .getLunar()
      .getEightChar();
    const rel = relate(dayMaster.stemHanja, ec.getDay());
    if (!rel) return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE);
    return ok({ ...rel, date: { year: f.year, month: f.month, day: f.day } });
  } catch (e) {
    return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE, {
      cause: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * 신년운세 — 세운(년간지)과 열두 달.
 *
 * 절기월 기준이므로 2월(인월)부터 시작해 다음해 1월(축월)로 끝난다.
 * 각 달의 대표 시각은 해당 절기월의 중간쯤(양력 15일 정오)을 쓴다 —
 * 절입 경계에 걸리지 않게 하기 위해서다.
 */
export function yearFortune(
  dayMaster: Pillar,
  year: number,
  now: Date = new Date(),
): SajuResult<YearFortune> {
  try {
    // 세운은 절기 비교가 걸리므로 원국의 년주와 같은 규칙 — UTC+8 로 읽는다.
    // 그 해 한여름을 대표 시각으로 잡으면 입춘 경계에 걸리지 않는다.
    const mid = fieldsAtOffset(
      new Date(Date.UTC(year, 5, 15, 3, 0, 0)),
      LIBRARY_TZ_OFFSET_MINUTES,
    );
    const yearEc = Solar.fromYmdHms(mid.year, mid.month, mid.day, mid.hour, mid.minute, 0)
      .getLunar()
      .getEightChar();
    const yearRel = relate(dayMaster.stemHanja, yearEc.getYear());
    if (!yearRel) return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE);

    const months: MonthFortune[] = [];
    for (let i = 0; i < 12; i += 1) {
      // 인월(2월)부터. 12번째는 다음해 1월이다.
      const m = 2 + i;
      const calYear = m > 12 ? year + 1 : year;
      const calMonth = m > 12 ? m - 12 : m;
      const f = fieldsAtOffset(
        new Date(Date.UTC(calYear, calMonth - 1, 15, 3, 0, 0)),
        LIBRARY_TZ_OFFSET_MINUTES,
      );
      const ec = Solar.fromYmdHms(f.year, f.month, f.day, f.hour, f.minute, 0)
        .getLunar()
        .getEightChar();
      const rel = relate(dayMaster.stemHanja, ec.getMonth());
      if (!rel) continue;
      months.push({ ...rel, label: `${calMonth}월` });
    }

    return ok({ ...yearRel, year, months });
  } catch (e) {
    return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE, {
      cause: e instanceof Error ? e.message : String(e),
      year,
      now: now.toISOString(),
    });
  }
}

// ── 궁합 ──────────────────────────────────────────────────────────

export type GunghapKind = 'same' | 'generating' | 'controlling';

export interface Gunghap {
  kind: GunghapKind;
  /** 두 사람의 일간 */
  pair: { a: Pillar; b: Pillar };
  /** 일지가 합(合)을 이루는가 */
  branchHarmony: boolean;
  /** 일지가 충(沖)인가 */
  branchClash: boolean;
}

/** 오행 상생: 목→화→토→금→수→목 */
const generates = (e: number) => (e + 1) % 5;
/** 오행 상극: 목→토→수→화→금→목 */
const controls = (e: number) => (e + 2) % 5;

const ELEMENT_INDEX: Record<string, number> = {
  목: 0, 화: 1, 토: 2, 금: 3, 수: 4,
};

/** 지지 육합 짝 */
const HARMONY_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];

const BRANCH_ORDER = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

/**
 * 두 사람의 일간·일지로 관계의 결을 본다.
 *
 * 점수를 내지 않는다. "78점"은 아무것도 설명하지 않지만
 * "상생이라 함께 있을수록 힘이 된다"는 읽힌다.
 */
export function gunghap(a: Pillar, b: Pillar): Gunghap {
  const ae = ELEMENT_INDEX[a.stemElement] ?? 0;
  const be = ELEMENT_INDEX[b.stemElement] ?? 0;

  const kind: GunghapKind =
    ae === be ? 'same'
    : generates(ae) === be || generates(be) === ae ? 'generating'
    : controls(ae) === be || controls(be) === ae ? 'controlling'
    : 'generating';

  const ab = BRANCH_ORDER.indexOf(a.branch);
  const bb = BRANCH_ORDER.indexOf(b.branch);
  const branchHarmony = HARMONY_PAIRS.some(
    ([x, y]) => (ab === x && bb === y) || (ab === y && bb === x),
  );
  const branchClash = ab >= 0 && bb >= 0 && Math.abs(ab - bb) === 6;

  return { kind, pair: { a, b }, branchHarmony, branchClash };
}
