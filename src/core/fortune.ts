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
import type { Element, Pillar, TenGod, TenGodCategory } from './types';

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
//
// 원본 saju.js 는 두 사람의 일간 오행과 일지 합충만 봤다. 사주 열두 자를
// 계산해놓고 네 자만 쓰고 버리는 구조였다. 여기서는 이미 계산된 데이터를
// 전부 쓴다.
//
// 보는 것 네 가지:
//   1. 일간 관계        내 일간과 상대 일간의 오행 상생·상극  (원본에 있던 것)
//   2. 일지 관계        육합 / 충 / 삼합 / 형                 (원본은 육합·충만)
//   3. 오행 보완        내게 없는 오행을 상대가 갖고 있는가   (신규)
//   4. 상호 십성        상대 일간이 나에게 어떤 십성인가      (신규)
//
// 용신·기신은 넣지 않는다. 신강·신약 판정법이 유파마다 갈려서 교차 검증할
// 정답지가 없다. 검증할 수 없는 산식은 대운 타임라인의 신뢰까지 갉아먹는다.

export type GunghapKind = 'same' | 'generating' | 'controlling';

/** 지지 관계. 아래로 갈수록 약하다. */
export type BranchRelation = 'harmony' | 'triple' | 'clash' | 'punish' | 'none';

export interface ElementComplement {
  /** 내게 없는 오행 중 상대가 가진 것 */
  filled: Element[];
  /** 내게 없고 상대에게도 없는 오행 */
  stillMissing: Element[];
  /** 상대가 채워주는 정도. 0~1 */
  ratio: number;
}

export interface Gunghap {
  kind: GunghapKind;
  /** 두 사람의 일주 */
  pair: { a: Pillar; b: Pillar };
  branchRelation: BranchRelation;
  /** a 가 b 에게서 받는 오행 보완 */
  aReceives: ElementComplement;
  /** b 가 a 에게서 받는 오행 보완 */
  bReceives: ElementComplement;
  /** 상대 일간이 나에게 어떤 십성인가 */
  aSeesB: TenGod;
  bSeesA: TenGod;
}

/** 오행 상생: 목→화→토→금→수→목 */
const generates = (e: number) => (e + 1) % 5;
// 상극은 별도 함수가 필요 없다. 같지도 않고 상생도 아니면 상극이다.

const ELEMENT_INDEX: Record<string, number> = {
  목: 0, 화: 1, 토: 2, 금: 3, 수: 4,
};

const BRANCH_ORDER = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

/** 지지 육합 */
const HARMONY_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];

/** 지지 삼합 — 세 글자 중 둘만 있어도 반합으로 본다 */
const TRIPLE_GROUPS: ReadonlyArray<readonly number[]> = [
  [8, 0, 4],   // 신자진 수국
  [2, 6, 10],  // 인오술 화국
  [11, 3, 7],  // 해묘미 목국
  [5, 9, 1],   // 사유축 금국
];

/** 지지 삼형·상형 */
const PUNISH_GROUPS: ReadonlyArray<readonly number[]> = [
  [2, 5, 8],   // 인사신
  [1, 10, 7],  // 축술미
  [0, 3],      // 자묘
];

function branchRelation(ab: number, bb: number): BranchRelation {
  if (ab < 0 || bb < 0) return 'none';
  if (HARMONY_PAIRS.some(([x, y]) => (ab === x && bb === y) || (ab === y && bb === x))) {
    return 'harmony';
  }
  if (TRIPLE_GROUPS.some((g) => g.includes(ab) && g.includes(bb) && ab !== bb)) {
    return 'triple';
  }
  if (Math.abs(ab - bb) === 6) return 'clash';
  if (PUNISH_GROUPS.some((g) => g.includes(ab) && g.includes(bb) && ab !== bb)) {
    return 'punish';
  }
  return 'none';
}

const ALL_ELEMENTS: readonly Element[] = ['목', '화', '토', '금', '수'];

/**
 * 내게 없는 오행을 상대가 갖고 있는가.
 *
 * 사주에서 없는 오행은 그 방면의 힘이 약하다고 본다. 상대가 그걸 갖고
 * 있으면 함께 있을 때 채워진다 — 궁합에서 실제로 크게 보는 대목이다.
 */
function complement(
  mine: Record<Element, number>,
  theirs: Record<Element, number>,
): ElementComplement {
  const missing = ALL_ELEMENTS.filter((e) => (mine[e] ?? 0) === 0);
  const filled = missing.filter((e) => (theirs[e] ?? 0) > 0);
  const stillMissing = missing.filter((e) => (theirs[e] ?? 0) === 0);
  return {
    filled,
    stillMissing,
    ratio: missing.length === 0 ? 1 : filled.length / missing.length,
  };
}

const STEM_ORDER = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

/**
 * 두 사람의 명식으로 관계의 결을 본다.
 *
 * 점수를 내지 않는다. "78점"은 아무것도 설명하지 않지만
 * "내게 없는 수(水)를 상대가 둘 갖고 있다"는 읽힌다.
 */
export function gunghap(
  a: { dayMaster: Pillar; elementCounts: Record<Element, number> },
  b: { dayMaster: Pillar; elementCounts: Record<Element, number> },
): Gunghap {
  const ae = ELEMENT_INDEX[a.dayMaster.stemElement] ?? 0;
  const be = ELEMENT_INDEX[b.dayMaster.stemElement] ?? 0;

  const kind: GunghapKind =
    ae === be ? 'same'
    : generates(ae) === be || generates(be) === ae ? 'generating'
    : 'controlling';

  const ai = STEM_ORDER.indexOf(a.dayMaster.stem);
  const bi = STEM_ORDER.indexOf(b.dayMaster.stem);

  return {
    kind,
    pair: { a: a.dayMaster, b: b.dayMaster },
    branchRelation: branchRelation(
      BRANCH_ORDER.indexOf(a.dayMaster.branch),
      BRANCH_ORDER.indexOf(b.dayMaster.branch),
    ),
    aReceives: complement(a.elementCounts, b.elementCounts),
    bReceives: complement(b.elementCounts, a.elementCounts),
    aSeesB: tenGodOf(ai, bi),
    bSeesA: tenGodOf(bi, ai),
  };
}
