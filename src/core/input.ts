/**
 * 명리서재 — 입력 정규화 및 검증
 *
 * 규칙: 여기를 통과한 값만 계산 계층으로 넘어간다.
 * 예외를 던지지 않고 SajuResult 를 반환한다.
 *
 * 왜 필요한가: lunar-javascript 는 존재하지 않는 양력 날짜를 그대로 통과시킨다.
 *   Solar.fromYmd(2026, 2, 30).toYmd() → "2026-02-30"   (throw 안 함)
 * 검증이 없으면 말도 안 되는 날짜에 자신만만한 오답이 나온다.
 * 정확도를 간판으로 건 앱에서 조용한 오답이 가장 나쁜 실패다.
 */

import {
  koreanLeapMonthOf,
  koreanLunarToSolar,
  supportsKoreanLunar,
} from './korean-lunar';
import {
  ERROR_MESSAGES,
  SUPPORTED_YEAR_MAX,
  SUPPORTED_YEAR_MIN,
  err,
  ok,
  type SajuResult,
} from './errors';
import { SEOUL_LONGITUDE } from './korea-time';
import type { BirthInput, HourInput, RawFormValues, YajasiPolicy } from './types';

const toInt = (v: number | string | undefined): number => {
  if (typeof v === 'number') return Math.trunc(v);
  if (typeof v === 'string' && v.trim() !== '') return Math.trunc(Number(v));
  return Number.NaN;
};

/** 양력 날짜가 달력에 실제로 존재하는가. Date 왕복으로 검사한다. */
export function isRealSolarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * 해당 음력 연도의 윤달. 없으면 0.
 *
 * ★한국 음력 기준이다.★ 중국 음력과 갈리는 해가 있다 — 2017년은
 * 한국 윤5월, 중국 윤6월이다. 사용자는 가족관계등록부에 적힌 대로
 * 넣으므로 한국 기준으로 받아야 통과한다. 왜 갈리는지는
 * core/korean-lunar.ts 에 적어뒀다.
 *
 * 2050년을 넘으면 한국 자료가 없다. 0을 돌려주므로 윤달 선택이 막힌다.
 */
export function leapMonthOf(lunarYear: number): number {
  return koreanLeapMonthOf(lunarYear) ?? 0;
}

export interface SolarYmd {
  year: number;
  month: number;
  day: number;
}

/**
 * 음력 → 양력.
 *
 * ★한국 음력으로 읽는다.★ 사용자가 넣는 음력은 가족관계등록부에 적힌
 * 한국 음력이고, 그건 중국 음력과 달의 3.6% 에서 하루 어긋난다. 하루
 * 어긋나면 일주가 통째로 바뀐다. 근거는 core/korean-lunar.ts.
 *
 * 한국천문연구원 자료는 2050년까지다. 그 뒤는 **거절한다.**
 * 예전에는 중국 음력으로 물러났는데, 그건 달의 3.6%에서 하루 어긋나는
 * 값을 아무 말 없이 내주는 것이라 조용한 오답이 된다. 못 하는 것은
 * 못 한다고 말하는 편이 낫다. 2051년 이후 음력 생일을 가진 사람은
 * 아직 태어나지도 않았다.
 *
 * 없는 윤달·없는 날짜는 결과 타입으로 감싼다.
 */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  leapMonth: boolean,
): SajuResult<SolarYmd> {
  if (leapMonth) {
    const leap = leapMonthOf(year);
    if (leap !== month) {
      return err('NO_SUCH_LEAP_MONTH', ERROR_MESSAGES.NO_SUCH_LEAP_MONTH, {
        requested: month,
        actualLeapMonth: leap === 0 ? null : leap,
      });
    }
  }
  if (!supportsKoreanLunar(year)) {
    return err('OUT_OF_RANGE_YEAR', ERROR_MESSAGES.LUNAR_OUT_OF_RANGE, {
      reason: '한국천문연구원 음양력 자료 범위 밖',
      year,
    });
  }

  const korean = koreanLunarToSolar(year, month, day, leapMonth);
  if (korean) return ok(korean);

  // 범위 안인데 변환이 안 됐다는 건 그런 날짜가 없다는 뜻이다.
  return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE, {
    reason: '한국 음력에 없는 날짜입니다',
    year, month, day, leapMonth,
  });
}

/**
 * 폼 값 → 검증된 BirthInput.
 *
 * 시간 미상은 예외가 아니라 정상 경로다 (부모님 세대 관객).
 * 시간 미상이어도 대운 타임라인은 100% 정확하게 나온다.
 */
export function normalize(raw: RawFormValues): SajuResult<BirthInput> {
  const year = toInt(raw.year);
  const month = toInt(raw.month);
  const day = toInt(raw.day);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE);
  }
  if (year < SUPPORTED_YEAR_MIN || year > SUPPORTED_YEAR_MAX) {
    return err('OUT_OF_RANGE_YEAR', ERROR_MESSAGES.OUT_OF_RANGE_YEAR, { year });
  }
  if (month < 1 || month > 12) {
    return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE, { month });
  }

  let hour: HourInput;
  if (raw.hourKnown) {
    const h = toInt(raw.hour);
    const mi = toInt(raw.minute ?? 0);
    if (!Number.isFinite(h) || h < 0 || h > 23) {
      return err('INVALID_TIME', ERROR_MESSAGES.INVALID_TIME, { hour: raw.hour });
    }
    if (!Number.isFinite(mi) || mi < 0 || mi > 59) {
      return err('INVALID_TIME', ERROR_MESSAGES.INVALID_TIME, { minute: raw.minute });
    }
    hour = { known: true, hour: h, minute: mi };
  } else {
    hour = { known: false };
  }

  const leapMonth = raw.calendar === 'lunar' && raw.leapMonth === true;

  // 달력별 날짜 존재 검사
  if (raw.calendar === 'solar') {
    if (!isRealSolarDate(year, month, day)) {
      return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE, { year, month, day });
    }
  } else {
    const converted = lunarToSolar(year, month, day, leapMonth);
    if (!converted.ok) return converted;
    // 변환된 양력이 지원 범위를 벗어날 수 있다 (음력 연말 → 다음해 양력)
    if (
      converted.value.year < SUPPORTED_YEAR_MIN ||
      converted.value.year > SUPPORTED_YEAR_MAX
    ) {
      return err('OUT_OF_RANGE_YEAR', ERROR_MESSAGES.OUT_OF_RANGE_YEAR, converted.value);
    }
  }

  const longitude =
    typeof raw.longitude === 'number' && Number.isFinite(raw.longitude)
      ? raw.longitude
      : SEOUL_LONGITUDE;

  const yajasi: YajasiPolicy = raw.yajasi ?? 'preserve-day';

  return ok({
    calendar: raw.calendar,
    year,
    month,
    day,
    leapMonth,
    hour,
    gender: raw.gender,
    longitude,
    yajasi,
    applyEquationOfTime: raw.applyEquationOfTime ?? false,
    ...(raw.name ? { name: raw.name } : {}),
  });
}

/** 검증된 입력의 양력 생년월일. 음력이면 변환한다. */
export function resolveSolarYmd(input: BirthInput): SajuResult<SolarYmd> {
  if (input.calendar === 'solar') {
    return ok({ year: input.year, month: input.month, day: input.day });
  }
  return lunarToSolar(input.year, input.month, input.day, input.leapMonth);
}
