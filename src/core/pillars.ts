/**
 * 명리서재 — 네 기둥을 직접 세운다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 직접 쓰는가
 *
 * 여태 해석(대운·십이운성·용신·신살·궁합)은 우리 알고리즘인데 정작 뼈대인
 * 사주팔자는 라이브러리 위임이었다. 해석이 아무리 좋아도 뼈대가 남의
 * 블랙박스면 "우리 알고리즘" 이라 말하기 어렵다.
 *
 * 그런데 그 라이브러리가 쓰는 규칙을 전부 독립 검증해뒀다.
 *
 *   절기        천체력으로 황경 직접 계산    3,624 표본, 최대 55.8초
 *   일주        율리우스일 + 상수 하나       73,414일, 불일치 0
 *   월주 천간   오호둔(五虎遁)               1,452건, 불일치 0
 *   시주 천간   오자시두법(五鼠遁)            9,720건, 불일치 0
 *
 * 검증한 규칙이 곧 구현할 규칙이다. 그래서 여기 있는 코드는 새로 지어낸
 * 것이 아니라 이미 확인된 것을 옮겨 적은 것이다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 관계가 뒤집힌다
 *
 * 이제 lunar-javascript 는 계산의 근거가 아니라 **대조 상대**가 된다.
 * 런타임에서는 빠지고 테스트에만 남는다. 같은 표를 물려받은 두 구현이
 * 서로 맞다고 하는 상황이 아니라, 방법이 다른 둘이 맞춰보는 상황이다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 두 타임라인
 *
 * 년주·월주는 절기가 가른다. 절기는 **순간**이므로 출생의 UTC 순간과
 * 곧바로 견준다 — 어느 시간대의 벽시계인지 따질 필요가 없다.
 *
 * 일주·시주는 **진태양시**가 가른다. 그 땅에서 해가 실제로 남중하는
 * 시각을 기준으로 날과 시가 갈리기 때문이다.
 *
 * 이 갈라놓기가 이 프로젝트의 뼈대다.
 */

import { solarTermsOf, TERMS_FROM_YEAR, TERMS_TO_YEAR } from './data/solar-terms';
import { DAY_PILLAR_PHASE, julianDayNumber } from './day-cycle';

export const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const BRANCHES = [
  '자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해',
] as const;

export const STEM_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCH_HANJA = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
] as const;

/** 십이지 띠 */
export const ANIMALS = [
  '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지',
] as const;

export interface GanZhi {
  /** 0~9 */
  stem: number;
  /** 0~11 */
  branch: number;
}

/** 간지를 한글로 */
export const ganZhiKorean = (gz: GanZhi): string => `${STEMS[gz.stem]}${BRANCHES[gz.branch]}`;
/** 간지를 한자로 */
export const ganZhiHanja = (gz: GanZhi): string =>
  `${STEM_HANJA[gz.stem]}${BRANCH_HANJA[gz.branch]}`;

/** 60갑자에서 몇 번째인가 */
export function sexagenaryIndex(gz: GanZhi): number {
  // 천간 10, 지지 12 의 최소공배수는 60. 둘을 동시에 만족하는 자리를 찾는다.
  for (let i = 0; i < 60; i += 1) {
    if (i % 10 === gz.stem && i % 12 === gz.branch) return i;
  }
  throw new Error(`있을 수 없는 간지 조합: ${gz.stem}/${gz.branch}`);
}

/** 60갑자 index → 간지 */
export const fromSexagenary = (i: number): GanZhi => {
  const n = ((i % 60) + 60) % 60;
  return { stem: n % 10, branch: n % 12 };
};

/* ────────────────────────────────────────────────────────────────────────
 * 절기
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 달을 여는 절기(節) 12개의 표 안 위치.
 *
 * 표는 소한(285°)부터 30°씩 24개다. 그중 짝수 번째가 節,
 * 홀수 번째가 中氣다. 달을 가르는 것은 節이다 — 中氣는 음력 달의 번호를
 * 정하는 데 쓰이지 사주의 월주와는 무관하다.
 *
 * 소한이 축월(丑), 입춘이 인월(寅) 을 연다.
 */
const JEOL_INDEX = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] as const;

/** JEOL_INDEX 순서에 대응하는 월지. 소한 → 축(1), 입춘 → 인(2) … */
const JEOL_BRANCH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0] as const;

export interface JeolBoundary {
  /** 절입 순간 (UTC ms) */
  at: number;
  /** 이 절기가 여는 월지 (0=자) */
  branch: number;
  /** 절기 이름 */
  name: string;
}

const JEOL_NAMES = [
  '소한', '입춘', '경칩', '청명', '입하', '망종',
  '소서', '입추', '백로', '한로', '입동', '대설',
] as const;

/** 그 해의 절입 12개. 이른 순서대로. */
export function jeolOf(year: number): JeolBoundary[] | null {
  const terms = solarTermsOf(year);
  if (!terms) return null;
  return JEOL_INDEX.map((idx, k) => ({
    at: terms[idx] as number,
    branch: JEOL_BRANCH[k] as number,
    name: JEOL_NAMES[k] as string,
  }));
}

/**
 * 그 순간이 속한 절기 구간을 찾는다.
 *
 * 앞뒤 해까지 훑는 이유는 1월 초와 12월 말이 각각 앞해·다음해 절기에
 * 걸리기 때문이다. 연초 출생이 전해 대설월에 속하는 일이 실제로 있다.
 */
export function jeolAt(instant: number): { jeol: JeolBoundary; solarYear: number } | null {
  const y = new Date(instant).getUTCFullYear();
  for (const cand of [y, y - 1]) {
    const list = jeolOf(cand);
    if (!list) continue;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const j = list[i] as JeolBoundary;
      if (instant >= j.at) return { jeol: j, solarYear: cand };
    }
  }
  return null;
}

/* ────────────────────────────────────────────────────────────────────────
 * 년주
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 년주는 입춘이 가른다. 1월 1일이 아니다.
 *
 * 갑자년이 서기 4년이므로 (연도 - 4) mod 60 이 60갑자 자리다.
 * 입춘 전이면 아직 전해다.
 */
export function yearPillar(instant: number): GanZhi | null {
  const y = new Date(instant).getUTCFullYear();
  let sajuYear = y;
  const terms = solarTermsOf(y);
  if (!terms) return null;
  const ipchun = terms[2] as number; // 입춘 = 315°
  if (instant < ipchun) sajuYear = y - 1;
  return fromSexagenary(sajuYear - 4);
}

/* ────────────────────────────────────────────────────────────────────────
 * 월주
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 오호둔(五虎遁) — 년간이 인월(寅月)의 천간을 정한다.
 *
 *   갑·기년 → 병인월    을·경년 → 무인월    병·신년 → 경인월
 *   정·임년 → 임인월    무·계년 → 갑인월
 *
 * 년간 index 를 2배 하고 2를 더하면 그대로 나온다. 표를 적는 대신
 * 규칙을 적는 편이 틀릴 자리가 적다.
 *   갑(0) → 2(병) · 을(1) → 4(무) · 병(2) → 6(경) · 정(3) → 8(임) · 무(4) → 10%10=0(갑)
 */
export const tigerMonthStem = (yearStem: number): number => (yearStem * 2 + 2) % 10;

/** 월주. 년주와 절입 구간이 있어야 정해진다. */
export function monthPillar(instant: number): GanZhi | null {
  const found = jeolAt(instant);
  const yp = yearPillar(instant);
  if (!found || !yp) return null;

  // 인월부터 몇 번째 달인가 (인=2 기준)
  const stepsFromTiger = ((found.jeol.branch - 2) % 12 + 12) % 12;
  const stem = (tigerMonthStem(yp.stem) + stepsFromTiger) % 10;
  return { stem, branch: found.jeol.branch };
}

/* ────────────────────────────────────────────────────────────────────────
 * 일주
 * ──────────────────────────────────────────────────────────────────────── */

/*
 * 율리우스일과 일주 위상은 core/day-cycle.ts 에 있다.
 * 절기표 없이도 도는 산술이라, 첫 화면이 절기표까지 받지 않도록 떼어뒀다.
 */
export { DAY_PILLAR_PHASE, julianDayNumber } from './day-cycle';

/** 일주. 진태양시 기준의 달력 날짜를 받는다. */
export const dayPillar = (year: number, month: number, day: number): GanZhi =>
  fromSexagenary(julianDayNumber(year, month, day) + DAY_PILLAR_PHASE);

/* ────────────────────────────────────────────────────────────────────────
 * 시주
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 시지. 자시가 23시에 시작해 두 시간씩 간다.
 *
 *   23~01 자 · 01~03 축 · 03~05 인 … 21~23 해
 */
export const hourBranch = (hour: number): number => Math.floor(((hour + 1) % 24) / 2);

/**
 * 오자시두법(五鼠遁) — 일간이 자시(子時)의 천간을 정한다.
 *
 *   갑·기일 → 갑자시    을·경일 → 병자시    병·신일 → 무자시
 *   정·임일 → 경자시    무·계일 → 임자시
 *
 * 일간 index 를 2배 하면 그대로 나온다.
 */
export const ratHourStem = (dayStem: number): number => (dayStem * 2) % 10;

/**
 * 시주.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 23시의 자시는 다음 날의 자시다
 *
 * 자시는 23시에 시작해 다음 날 01시에 끝난다. 그러니 23시대에 태어난
 * 사람의 자시는 **다음 날에 속한 자시**이고, 그 천간은 다음 날의 일간에서
 * 나온다. 일간이 하루 앞서므로 자시 천간은 두 자리 앞선다.
 *
 * 일주까지 다음 날로 넘길지는 유파가 갈린다(야자시 / 조자시).
 * 그건 부르는 쪽이 정하고(core/types.ts 의 YajasiPolicy), 여기서는
 * 시주의 천간만 규칙대로 낸다.
 */
export function hourPillar(dayStem: number, hour: number): GanZhi {
  const branch = hourBranch(hour);
  const base = hour >= 23 ? (dayStem + 1) % 10 : dayStem;
  return { stem: (ratHourStem(base) + branch) % 10, branch };
}

/* ────────────────────────────────────────────────────────────────────────
 * 지원 범위
 * ──────────────────────────────────────────────────────────────────────── */

export const supportsYear = (year: number): boolean =>
  year >= TERMS_FROM_YEAR && year <= TERMS_TO_YEAR;

export { TERMS_FROM_YEAR, TERMS_TO_YEAR };

/* ────────────────────────────────────────────────────────────────────────
 * 지장간 (支藏干)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 지지 속에 숨은 천간.
 *
 * 지지는 겉으로 한 글자지만 안에 천간이 두셋 들어 있다. 원국을 여덟 자로만
 * 읽으면 놓치는 힘이 여기 있다 — 겉에 없는 오행이 지장간으로 숨어 있는
 * 경우가 흔하다.
 *
 * 순서는 **정기 · 중기 · 여기**다. 정기가 그 지지의 본래 성질이고,
 * 나머지는 앞뒤 계절에서 넘어온 기운이다. 자·묘·유는 순수해서 하나뿐이다.
 *
 * 값은 천간 index(0=갑). 표기법은 유파마다 조금씩 다르지만 이 배열은
 * 널리 쓰이는 것이고, 라이브러리와 12지 전부 일치하는지 테스트가 본다.
 */
export const HIDDEN_STEMS: readonly (readonly number[])[] = [
  [9],           // 자 — 계
  [5, 9, 7],     // 축 — 기 계 신
  [0, 2, 4],     // 인 — 갑 병 무
  [1],           // 묘 — 을
  [4, 1, 9],     // 진 — 무 을 계
  [2, 6, 4],     // 사 — 병 경 무
  [3, 5],        // 오 — 정 기
  [5, 3, 1],     // 미 — 기 정 을
  [6, 8, 4],     // 신 — 경 임 무
  [7],           // 유 — 신
  [4, 7, 3],     // 술 — 무 신 정
  [8, 0],        // 해 — 임 갑
];

/* ────────────────────────────────────────────────────────────────────────
 * 공망 (空亡)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 공망 — 비어 있는 두 지지.
 *
 * 천간은 열, 지지는 열둘이다. 육십갑자를 열 개씩 끊으면(순旬) 지지 둘이
 * 남는데 그 둘이 공망이다. 표를 적을 필요 없이 순의 시작에서 바로 나온다.
 *
 * 일주 기준으로 보는 것이 보통이다.
 */
export function voidBranches(gz: GanZhi): [number, number] {
  const idx = sexagenaryIndex(gz);
  const headOfDecade = idx - (idx % 10);      // 그 순의 첫 간지 (갑○)
  const first = (headOfDecade + 10) % 12;     // 남는 지지 둘
  return [first % 12, (first + 1) % 12];
}

/* ────────────────────────────────────────────────────────────────────────
 * 대운
 * ──────────────────────────────────────────────────────────────────────── */

export interface DaeunStart {
  /** 순행이면 true */
  forward: boolean;
  /** 첫 대운이 시작되는 나이 (세는나이) */
  startAge: number;
  /** 첫 대운이 시작되는 양력 연도 */
  startYear: number;
  /** 절입까지의 실제 일수. 반올림 전 값이라 근거로 낼 수 있다 */
  daysToJeol: number;
}

/**
 * 대운의 방향과 시작 나이.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 방향
 *
 * 년간이 양(갑·병·무·경·임)인 남자와 음(을·정·기·신·계)인 여자는 순행,
 * 그 반대는 역행이다. 양남음녀 순행, 음남양녀 역행이라고 외운다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 시작 나이
 *
 * 순행이면 태어난 순간부터 **다음 절입**까지, 역행이면 **직전 절입**부터
 * 태어난 순간까지의 일수를 3으로 나눈다. 사흘이 한 해에 대응한다.
 *
 * 여기 쓰인 규칙은 천체력으로 구한 절입과 대조해 확인했다
 * (test/daeun-start.test.ts, 408건 최대차 0.0385년).
 * 남는 차이는 오차가 아니라 전통 단위(년·월·일)로 반올림한 잔차다.
 *
 * 절기는 순간이므로 여기서도 UTC 순간으로 견준다.
 */
export function daeunStart(
  instant: number,
  /**
   * 출생의 **벽시계** 날짜. 절기 판정은 순간으로 하지만, 대운이 시작되는
   * 나이는 달력 위에서 세므로 벽시계가 필요하다. UTC 로 세면 자정 무렵
   * 출생이 전해로 넘어가 나이가 한 살 어긋난다 — 실제로 걸렸던 자리다.
   */
  wall: { year: number; month: number; day: number; hour: number; minute: number },
  yearStem: number,
  gender: '남' | '여',
): DaeunStart | null {
  const yangYear = yearStem % 2 === 0;
  const forward = yangYear === (gender === '남');

  const y = new Date(instant).getUTCFullYear();
  // 앞뒤 해까지 모아야 연초·연말 출생이 걸린다
  const all: number[] = [];
  for (const cand of [y - 1, y, y + 1]) {
    const list = jeolOf(cand);
    if (list) all.push(...list.map((j) => j.at));
  }
  all.sort((a, b) => a - b);

  const next = all.find((t) => t > instant);
  const prevList = all.filter((t) => t <= instant);
  const prev = prevList[prevList.length - 1];
  if (forward ? next === undefined : prev === undefined) return null;

  const days = forward
    ? ((next as number) - instant) / 86_400_000
    : (instant - (prev as number)) / 86_400_000;

  /*
   * 전통 환산 — 사흘이 한 해, 하루가 넉 달, 한 시진(두 시간)이 열흘.
   *
   *   3일 = 1년 → 1일 = 4개월 = 120일 → 1시진(1/12일) = 10일
   *
   * 이 셋은 같은 비율의 다른 표현이라 서로 어긋나지 않는다.
   * 대운수를 소수로 반올림하지 않고 **날짜**로 환산하는 이유는, 시작
   * 나이가 그 날짜가 속한 해로 정해지기 때문이다.
   */
  /*
   * 옛 사람은 분 단위로 재지 않았다. 나머지는 **시진(두 시간)** 으로 끊는다.
   * 한 시진이 열흘이므로 하루는 열두 시진 = 넉 달이 된다.
   *
   * 이 끊기를 안 하면 23일 23시간이 "7년 11월 26일" 이 되지만, 시진으로
   * 끊으면 24일이 되어 "8년 0월 0일" 이 된다. 후자가 이 계산법의 원래 모습이다.
   */
  const quantized = Math.round(days * 12) / 12;
  const years = Math.floor(quantized / 3);
  const restDays = quantized - years * 3;
  const months = Math.floor(restDays * 4);
  const extraDays = (restDays - months / 4) * 120;

  const startAt = new Date(
    Date.UTC(
      wall.year + years,
      wall.month - 1 + months,
      wall.day + Math.floor(extraDays),
      wall.hour,
      wall.minute,
    ),
  );
  const startYear = startAt.getUTCFullYear();

  return {
    forward,
    // 세는나이. 태어난 해가 한 살이므로 해 차이에 하나를 더한다.
    startAge: startYear - wall.year + 1,
    startYear,
    daysToJeol: days,
  };
}

/**
 * 대운 간지 목록. 월주에서 순행·역행으로 한 칸씩 옮긴다.
 *
 * 대운은 월주에서 출발한다 — 태어난 계절이 인생의 출발점이라는 뜻이다.
 * 그래서 시주를 몰라도 대운은 흔들리지 않는다.
 */
export function daeunPillars(monthGz: GanZhi, forward: boolean, count: number): GanZhi[] {
  const base = sexagenaryIndex(monthGz);
  return Array.from({ length: count }, (_, i) =>
    fromSexagenary(base + (forward ? i + 1 : -(i + 1))),
  );
}


/* ────────────────────────────────────────────────────────────────────────
 * 십성 (十星)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 십성 — 일간이 다른 천간을 어떻게 보는가.
 *
 * 표가 아니라 규칙이다. 오행의 상생·상극과 음양이 같은지만 보면 열 가지가
 * 그대로 나온다. 표를 적으면 백 칸을 손으로 채워야 하고 그중 하나만
 * 틀려도 조용히 어긋난다.
 *
 *   같은 오행   음양 같으면 비견, 다르면 겁재
 *   내가 낳음   식신 / 상관
 *   내가 이김   편재 / 정재
 *   나를 이김   편관 / 정관
 *   나를 낳음   편인 / 정인
 */
export type TenGodName =
  | '비견' | '겁재' | '식신' | '상관' | '편재'
  | '정재' | '편관' | '정관' | '편인' | '정인';

export function tenGodBetween(dayStem: number, other: number): TenGodName {
  const el = (i: number) => Math.floor(i / 2);   // 0목 1화 2토 3금 4수
  const yin = (i: number) => i % 2;
  const de = el(dayStem);
  const oe = el(other);
  const same = yin(dayStem) === yin(other);

  const generates = (a: number) => (a + 1) % 5;  // 내가 낳는 것
  const controls = (a: number) => (a + 2) % 5;   // 내가 이기는 것

  if (oe === de) return same ? '비견' : '겁재';
  if (oe === generates(de)) return same ? '식신' : '상관';
  if (oe === controls(de)) return same ? '편재' : '정재';
  if (controls(oe) === de) return same ? '편관' : '정관';
  return same ? '편인' : '정인';
}

/**
 * 지지의 십성. 지장간 전부를 정기·중기·여기 순으로 낸다.
 *
 * 지지는 겉으로 한 글자지만 안에 천간이 두셋 들어 있다. 정기만 보면
 * 놓치는 힘이 있어 전부 낸다 — 화면은 첫 번째를 대표로 쓰고, 심화
 * 분석은 전부를 읽는다.
 */
export const branchTenGods = (dayStem: number, branch: number): TenGodName[] =>
  (HIDDEN_STEMS[branch] as number[]).map((hidden) => tenGodBetween(dayStem, hidden));
