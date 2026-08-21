/**
 * 일진 — 표도 절기도 필요 없는 계산
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 따로 떼어놓나
 *
 * 일주는 끊기지 않는 60갑자 순환이라 율리우스일 하나로 정해진다. 절기표도,
 * 음력 자료도, 천체력도 필요 없다. 산술 몇 줄이 전부다.
 *
 * pillars.ts 안에 두면 절기표(23.6KB)까지 딸려 들어온다. 첫 화면에서
 * "오늘은 무오일입니다" 한 줄을 보여주려고 그걸 받게 할 수는 없다.
 * 그래서 이 부분만 떼어 따로 둔다 — 진입 청크에 들어가도 부담이 없다.
 */

export const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const BRANCHES_KO = [
  '자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해',
] as const;
export const STEMS_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const BRANCHES_HANJA = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
] as const;

/** 그레고리력 → 율리우스일. 천문학 표준 공식이다. */
export function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
  );
}

/**
 * 일주 위상 상수.
 *
 * 임의의 값이 아니라 관측으로 고정된 값이다. 이 상수 하나가 1900~2100년
 * 73,414일 전부를 설명한다(test/day-pillar.test.ts). 파이썬 독립 구현이
 * "1949-10-01 이 갑자일" 이라는 사실 하나에서 스스로 구한 값과도 같다
 * (verify/reference.py).
 */
export const DAY_PILLAR_PHASE = 49;

/** 그 날의 60갑자 자리 (0 = 갑자) */
export const dayCycleIndex = (year: number, month: number, day: number): number =>
  (julianDayNumber(year, month, day) + DAY_PILLAR_PHASE) % 60;

export interface DayGanZhi {
  korean: string;
  hanja: string;
  stem: number;
  branch: number;
}

export function dayGanZhi(year: number, month: number, day: number): DayGanZhi {
  const i = dayCycleIndex(year, month, day);
  const s = i % 10;
  const b = i % 12;
  return {
    korean: `${STEMS_KO[s]}${BRANCHES_KO[b]}`,
    hanja: `${STEMS_HANJA[s]}${BRANCHES_HANJA[b]}`,
    stem: s,
    branch: b,
  };
}

/**
 * 한국 날짜 기준 오늘의 일진.
 *
 * 진태양시 보정은 하지 않는다 — 여기 쓰는 곳은 첫 화면의 인사말이라
 * 자정 무렵 32분의 차이가 의미를 갖지 않는다. 사주 계산은 core/pillars.ts
 * 가 진태양시로 제대로 한다.
 */
export function todayInKorea(now: Date = new Date()): DayGanZhi & { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
  const [y, m, d] = parts.split('-').map(Number) as [number, number, number];
  return { ...dayGanZhi(y, m, d), year: y, month: m, day: d };
}
