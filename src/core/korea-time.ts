/**
 * 명리서재 — 한국 시각 보정 레이어  ★이 프로젝트의 심장★
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 이 모듈이 존재하는가
 *
 * 사주는 "시계가 몇 시였나"가 아니라 "해가 하늘 어디에 있었나"로 본다.
 * 그런데 한국은 표준자오선이 네 번 바뀌었고 서머타임도 세 시기 있었다.
 * 그래서 시계 → 진태양시 보정량은 **상수가 아니다.**
 *
 *   시계 기준     보정량                        해당 구간
 *   ──────────────────────────────────────────────────────────────
 *   UTC+9:00   →  −32분 05초   1912~54, 1961~현재
 *   UTC+8:30   →   −2분 05초   1954~61 겨울      ← −32분 고정이면 30분 오차
 *   UTC+9:30   →  −62분 05초   1954~61 서머타임
 *   UTC+10:00  →  −92분 05초   1987~88 서머타임
 *
 * 흔한 오구현: "서울 126.978°E, 표준자오선 135°E → −32분" 을 상수로 박는 것.
 * 1954~61년생(부모님 세대의 핵심 구간) 시주가 통째로 30분 어긋난다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 해법: 시대 분기를 없앤다
 *
 *   1) 시계시각 + 'Asia/Seoul'  →  UTC        [IANA tzdata 가 전담]
 *   2) UTC + 경도/15h           →  진태양시    [시대와 무관한 상수 하나]
 *
 * 두 지점 사이에 시대별 표를 들고 있을 이유가 없다. tzdata 가 이미 갖고 있다.
 * 위 네 보정량은 이 공식에서 자동으로 도출된다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 두 개의 타임라인을 반환하는 이유
 *
 *   solarFields — 출생지 평균태양시.  일주·시주 계산용.
 *   cstFields   — UTC+8.              년주·월주 계산용.
 *
 * lunar-javascript 의 절기표가 UTC+8 기준으로 계산돼 있다.
 * (검증: 1957 입춘 = 1957-02-04 09:54:37 → CST)
 * 두 순간을 비교하는 일이므로 같은 타임라인에 올려놓기만 하면 되고,
 * 경도 보정분(+27:55)은 양변에서 상쇄된다. 따라서 라이브러리에는
 * "UTC+8 로 읽은 출생시각"을 주면 절기 비교가 정확해진다.
 *
 * 반면 시주는 진태양시 기준이어야 하므로 solarFields 로 따로 계산한다.
 */

import type { BirthInput, CalendarFields, SolarTimeResult } from './types';
import { err, ok, type SajuResult } from './errors';

export const KOREA_TZ = 'Asia/Seoul';

/** 서울(경복궁 부근) 경도. 기본 출생지. */
export const SEOUL_LONGITUDE = 126.978;

/** lunar-javascript 절기표의 기준 타임존 오프셋(분). UTC+8. */
export const LIBRARY_TZ_OFFSET_MINUTES = 8 * 60;

const MS_PER_MINUTE = 60_000;

/**
 * 어떤 순간에 해당 타임존이 UTC 로부터 몇 분 앞서 있었는지.
 * tzdata 를 직접 파싱하지 않고 Intl 이 노출하는 값을 읽는다.
 */
export function zoneOffsetMinutes(instant: Date, timeZone: string = KOREA_TZ): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(instant);
  const num = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((p) => p.type === type);
    return found ? Number(found.value) : 0;
  };
  // hourCycle 에 따라 24 가 나올 수 있다 (자정).
  const hour = num('hour') % 24;
  const asIfUtc = Date.UTC(num('year'), num('month') - 1, num('day'), hour, num('minute'), num('second'));
  return Math.round((asIfUtc - instant.getTime()) / MS_PER_MINUTE);
}

/**
 * 벽시계 시각(해당 타임존의 달력/시계 표기)을 절대 시각(UTC)으로.
 *
 * 오프셋이 그 순간의 오프셋에 의존하는 순환이라 2패스로 푼다.
 * 서머타임 전환 구간에서만 2패스가 의미를 갖는다.
 */
export function wallClockToUtc(
  fields: CalendarFields,
  timeZone: string = KOREA_TZ,
): Date {
  const naive = Date.UTC(
    fields.year,
    fields.month - 1,
    fields.day,
    fields.hour,
    fields.minute,
    fields.second,
  );
  const firstGuess = new Date(naive);
  const offset1 = zoneOffsetMinutes(firstGuess, timeZone);
  let timestamp = naive - offset1 * MS_PER_MINUTE;

  const offset2 = zoneOffsetMinutes(new Date(timestamp), timeZone);
  if (offset2 !== offset1) {
    timestamp = naive - offset2 * MS_PER_MINUTE;
  }
  return new Date(timestamp);
}

/** 절대 시각을 "UTC 로부터 offsetMinutes 앞선 곳"의 달력 필드로 읽는다. */
export function fieldsAtOffset(instant: Date, offsetMinutes: number): CalendarFields {
  const shifted = new Date(instant.getTime() + offsetMinutes * MS_PER_MINUTE);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

/** 경도를 평균태양시 오프셋(분)으로. 서울 126.978° → +507.912분 (8:27:55) */
export function longitudeOffsetMinutes(longitude: number): number {
  return (longitude / 15) * 60;
}

/**
 * 균시차 (equation of time) — 평균태양시와 진태양시의 차이. 최대 ±16분.
 * 기본 비활성 (design rev.2 Open Question 3). 넣으면 주류 만세력과
 * 결과가 갈리는 경우가 생기므로 옵트인으로만 쓴다.
 *
 * NOAA 근사식. 분 단위 반환.
 */
export function equationOfTimeMinutes(instant: Date): number {
  const start = Date.UTC(instant.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((instant.getTime() - start) / 86_400_000) + 1;
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * 시간 미상일 때 쓰는 대표 시각. 정오를 쓴다.
 *
 * 정오인 이유: 일주 경계(자정/23시)에서 가장 멀어 어떤 야자시 정책으로도
 * 일주가 흔들리지 않는다. 시주는 어차피 null 로 버린다.
 */
export const UNKNOWN_HOUR_PROXY = { hour: 12, minute: 0 } as const;

export interface ToSolarTimeOptions {
  /** 양력으로 확정된 생년월일. 음력 입력은 input.ts 가 먼저 변환한다. */
  solarYmd: { year: number; month: number; day: number };
}

/**
 * 시계 시각 → 명리 계산용 두 타임라인.
 *
 * @param input  경도·균시차 옵션·시간 미상 여부를 읽는다
 * @param opts   양력으로 확정된 생년월일
 */
export function toSolarTime(
  input: BirthInput,
  opts: ToSolarTimeOptions,
): SajuResult<SolarTimeResult> {
  if (!isTzdataUsable()) {
    return err('TZDATA_UNSUPPORTED', TZDATA_MESSAGE);
  }

  const { hour, minute } = input.hour.known
    ? { hour: input.hour.hour, minute: input.hour.minute }
    : UNKNOWN_HOUR_PROXY;

  const clock: CalendarFields = {
    year: opts.solarYmd.year,
    month: opts.solarYmd.month,
    day: opts.solarYmd.day,
    hour,
    minute,
    second: 0,
  };

  // 1) 벽시계 → UTC. tzdata 가 시대별 표준시와 서머타임을 전부 처리한다.
  const utc = wallClockToUtc(clock, KOREA_TZ);
  const standardOffsetMinutes = zoneOffsetMinutes(utc, KOREA_TZ);

  // 2) UTC → 진태양시. 시대와 무관한 상수 하나.
  const lonOffset = longitudeOffsetMinutes(input.longitude);
  const eot = input.applyEquationOfTime ? equationOfTimeMinutes(utc) : 0;
  const solarOffset = lonOffset + eot;

  return ok({
    utc,
    solarFields: fieldsAtOffset(utc, solarOffset),
    cstFields: fieldsAtOffset(utc, LIBRARY_TZ_OFFSET_MINUTES),
    standardOffsetMinutes,
    // 시계 → 진태양시 보정량. 시대별로 달라지는 값이 여기서 자동 도출된다.
    offsetMinutes: solarOffset - standardOffsetMinutes,
    daylightSaving: isDaylightSaving(utc),
    equationOfTimeMinutes: eot,
  });
}

/**
 * 해당 순간에 한국이 서머타임 중이었는가.
 * 같은 해 1월 15일의 오프셋과 비교한다 (한국 서머타임은 늘 여름철이었다).
 */
export function isDaylightSaving(instant: Date, timeZone: string = KOREA_TZ): boolean {
  const winter = new Date(Date.UTC(instant.getUTCFullYear(), 0, 15));
  return zoneOffsetMinutes(instant, timeZone) > zoneOffsetMinutes(winter, timeZone);
}

// ── F1: 런타임 tzdata 자가진단 ────────────────────────────────────────
//
// tzdata 에 위임한 대가로 "런타임이 제대로 된 tzdata 를 갖고 있는가"가
// 새 가정이 됐다. 골든 테스트는 CI(Node)에서만 돈다. 사용자 브라우저는
// 검증되지 않는다. 결손 시 예외가 아니라 조용히 UTC+9 로 계산되므로
// 유일하게 침묵하며 틀리는 경로다.

const TZDATA_MESSAGE =
  '이 기기의 시간대 정보가 오래되어 1954~1961년 구간을 정확히 계산할 수 없습니다. 브라우저를 업데이트하시면 정확도가 올라갑니다.';

/** [기대 오프셋(분), 검사 순간, 설명] */
const TZDATA_PROBES: ReadonlyArray<readonly [number, string, string]> = [
  [510, '1957-12-15T00:00:00Z', '1954~61 겨울 UTC+8:30'],
  [570, '1957-06-15T00:00:00Z', '1954~61 서머타임 UTC+9:30'],
  [600, '1988-08-15T00:00:00Z', '1988 서머타임 UTC+10'],
  [540, '1990-08-15T00:00:00Z', '현재 UTC+9'],
];

let tzdataCache: boolean | null = null;

/**
 * 앱 부팅 시 1회 호출. 캐시된다.
 * 실패하면 UI 가 경고를 띄우고, 계산은 진행하되 정확도 주의를 표시한다.
 */
export function isTzdataUsable(): boolean {
  if (tzdataCache !== null) return tzdataCache;
  tzdataCache = TZDATA_PROBES.every(
    ([expected, iso]) => zoneOffsetMinutes(new Date(iso), KOREA_TZ) === expected,
  );
  return tzdataCache;
}

/** 진단 상세 — 어느 구간이 틀렸는지 보고한다. */
export function tzdataDiagnostics(): Array<{
  label: string;
  expected: number;
  actual: number;
  pass: boolean;
}> {
  return TZDATA_PROBES.map(([expected, iso, label]) => {
    const actual = zoneOffsetMinutes(new Date(iso), KOREA_TZ);
    return { label, expected, actual, pass: actual === expected };
  });
}

/** 테스트 전용 — 캐시 초기화 */
export function __resetTzdataCache(): void {
  tzdataCache = null;
}
