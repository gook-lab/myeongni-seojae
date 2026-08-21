/**
 * 명리서재 — 핵심 도메인 타입
 *
 * 설계 근거: design rev.2 의 RADIO / D — Data Model
 * core/* 는 순수 함수다. React·Zustand·Sentry 를 import 하지 않는다.
 */

export type Stem = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';
export type Branch =
  | '자' | '축' | '인' | '묘' | '진' | '사'
  | '오' | '미' | '신' | '유' | '술' | '해';
export type Element = '목' | '화' | '토' | '금' | '수';

export type TenGod =
  | '비견' | '겁재' | '식신' | '상관' | '편재'
  | '정재' | '편관' | '정관' | '편인' | '정인';

export type TenGodCategory = '비겁' | '식상' | '재성' | '관성' | '인성';

export type Palace = '년주' | '월주' | '일주' | '시주';

export type TwelveStage =
  | '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠'
  | '병' | '사' | '묘' | '절' | '태' | '양';

export interface Pillar {
  stem: Stem;
  branch: Branch;
  stemHanja: string;
  branchHanja: string;
  stemElement: Element;
  branchElement: Element;
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  /** 시간 미상이면 null. 대운 계산은 이 값을 참조하지 않는다. */
  hour: Pillar | null;
}

// ── 입력 ──────────────────────────────────────────────────────────

/** 시간 미상은 예외가 아니라 1급 시민이다 (부모님 세대 관객). */
export type HourInput =
  | { known: false }
  | { known: true; hour: number; minute: number };

export type CalendarKind = 'solar' | 'lunar';
export type Gender = '남' | '여';

/** 야자시 유파. 23:00~24:00 출생 시 일주를 다음날로 넘길지. */
export type YajasiPolicy =
  /** 야자시: 시주만 다음날 자시로, 일주는 당일 유지 (lunar-javascript sect 2, 기본) */
  | 'preserve-day'
  /** 조자시: 일주도 다음날로 넘김 (lunar-javascript sect 1) */
  | 'advance-day';

export interface BirthInput {
  calendar: CalendarKind;
  year: number;
  month: number;
  day: number;
  /** 음력 윤달 여부. calendar === 'lunar' 일 때만 의미 있다. */
  leapMonth: boolean;
  hour: HourInput;
  gender: Gender;
  /** 출생지 경도(동경 양수). 기본 서울 126.9780 */
  longitude: number;
  yajasi: YajasiPolicy;
  /** 균시차 적용 여부. 기본 false (Open Question 3) */
  applyEquationOfTime: boolean;
  name?: string;
}

/** 폼에서 들어오는 미검증 값. normalize() 가 BirthInput 으로 만든다. */
export interface RawFormValues {
  calendar: CalendarKind;
  year: number | string;
  month: number | string;
  day: number | string;
  leapMonth?: boolean;
  hourKnown: boolean;
  hour?: number | string;
  minute?: number | string;
  gender: Gender;
  longitude?: number;
  yajasi?: YajasiPolicy;
  applyEquationOfTime?: boolean;
  name?: string;
}

// ── 시각 보정 ─────────────────────────────────────────────────────

/**
 * 시계 시각을 명리 계산에 쓸 타임라인들로 변환한 결과.
 *
 * 핵심: 보정량은 상수가 아니다. 시대별 표준시가 달라지므로
 * (당시 표준시 오프셋 − 경도/15h) 만큼 달라진다.
 *   UTC+9   → −32분 05초   (1912~54, 1961~현재)
 *   UTC+8:30→  −2분 05초   (1954~61 겨울)
 *   UTC+9:30→ −62분 05초   (1954~61 서머타임)
 *   UTC+10  → −92분 05초   (1987~88 서머타임)
 */
export interface SolarTimeResult {
  /** 출생 순간 (절대 시각) */
  utc: Date;
  /** 출생지 평균태양시로 읽은 달력 필드 (일주·시주용) */
  solarFields: CalendarFields;
  /** UTC+8 로 읽은 달력 필드 (년주·월주용 — 라이브러리 절기표가 UTC+8 기준) */
  cstFields: CalendarFields;
  /** tzdata 가 준 당시 표준시 오프셋(분). 진단·표시용 */
  standardOffsetMinutes: number;
  /** 시계 → 진태양시 보정량(분). 음수. 시대별로 다르다 */
  offsetMinutes: number;
  /** 해당 시각에 서머타임이 적용 중이었는가 (표시용) */
  daylightSaving: boolean;
  equationOfTimeMinutes: number;
}

export interface CalendarFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

// ── 대운 타임라인 (주인공) ────────────────────────────────────────

export interface DaeunEntry {
  index: number;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  pillar: Pillar;
  tenGod: TenGod;
  category: TenGodCategory;
  /**
   * 십이운성 — 그 대운 지지에서 일간의 상태.
   * 십성이 "무슨 일이 있나"라면 십이운성은 "그때 힘이 있나"다.
   */
  stage: TwelveStage;
  /** 밖으로 뻗는 힘 0~1. 좋고 나쁨이 아니다. */
  outwardness: number;
  isCurrent: boolean;
}

export interface DaeunTimeline {
  /** 대운수 — 첫 대운이 시작되는 나이 */
  startAge: number;
  direction: 'forward' | 'backward';
  entries: DaeunEntry[];
  /** 다음 대운 전환까지 남은 개월. 마지막 대운이면 null */
  monthsToNextTransition: number | null;
}

// ── 결과 ──────────────────────────────────────────────────────────

export interface SajuChart {
  input: BirthInput;
  solarTime: SolarTimeResult;
  pillars: FourPillars;
  dayMaster: Pillar;
  /** 목화토금수 순 개수. 시주가 없으면 6글자 기준이 된다. */
  elementCounts: Record<Element, number>;
  tenGods: {
    year: { stem: TenGod; branch: TenGod };
    month: { stem: TenGod; branch: TenGod };
    day: { stem: '일간'; branch: TenGod };
    hour: { stem: TenGod; branch: TenGod } | null;
  };
  animal: string;
  /** 시주 없이 계산됐는가 — UI 가 정확도 표시에 쓴다 */
  hourUnknown: boolean;
}
