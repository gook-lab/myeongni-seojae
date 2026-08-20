/**
 * input 단위 테스트 — C1: 조용한 오답을 내지 않는다
 */

import { describe, expect, it } from 'vitest';
import {
  isRealSolarDate,
  leapMonthOf,
  lunarToSolar,
  normalize,
  resolveSolarYmd,
} from '../src/core/input';
import { SEOUL_LONGITUDE } from '../src/core/korea-time';
import type { RawFormValues } from '../src/core/types';

const raw = (over: Partial<RawFormValues> = {}): RawFormValues => ({
  calendar: 'solar',
  year: 1990,
  month: 5,
  day: 5,
  hourKnown: true,
  hour: 9,
  minute: 30,
  gender: '남',
  ...over,
});

describe('isRealSolarDate', () => {
  it.each([
    [2026, 2, 28, true],
    [2026, 2, 29, false], // 2026은 평년
    [2024, 2, 29, true], // 윤년
    [2026, 2, 30, false],
    [2026, 4, 31, false],
    [2026, 13, 1, false],
    [2026, 0, 1, false],
    [1957, 6, 15, true],
  ])('%i-%i-%i → %s', (y, m, d, expected) => {
    expect(isRealSolarDate(y, m, d)).toBe(expected);
  });
});

describe('normalize — 조용한 오답 방지', () => {
  it('정상 입력을 통과시킨다', () => {
    const res = normalize(raw());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.year).toBe(1990);
    expect(res.value.hour).toEqual({ known: true, hour: 9, minute: 30 });
    expect(res.value.longitude).toBe(SEOUL_LONGITUDE);
    expect(res.value.yajasi).toBe('preserve-day');
    expect(res.value.applyEquationOfTime).toBe(false);
  });

  it('존재하지 않는 양력 날짜를 막는다 (라이브러리는 그냥 통과시킨다)', () => {
    const res = normalize(raw({ year: 2026, month: 2, day: 30 }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('INVALID_DATE');
    expect(res.error.message).toContain('달력에 없는 날짜');
  });

  it.each([
    [1899, 'OUT_OF_RANGE_YEAR'],
    [2101, 'OUT_OF_RANGE_YEAR'],
  ])('지원 범위 밖 연도 %i 를 막는다', (year, code) => {
    const res = normalize(raw({ year }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe(code);
  });

  it.each([
    [1900, true],
    [2100, true],
  ])('경계 연도 %i 는 통과한다', (year, expected) => {
    expect(normalize(raw({ year })).ok).toBe(expected);
  });

  it.each([
    [-1, 'INVALID_TIME'],
    [24, 'INVALID_TIME'],
  ])('시각 %i 를 막는다', (hour, code) => {
    const res = normalize(raw({ hour }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe(code);
  });

  it('분이 범위를 벗어나면 막는다', () => {
    const res = normalize(raw({ minute: 60 }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('INVALID_TIME');
  });

  it('빈 문자열 입력을 막는다', () => {
    const res = normalize(raw({ year: '' }));
    expect(res.ok).toBe(false);
  });
});

describe('normalize — 시간 미상은 1급 입력이다 (A4)', () => {
  it('hourKnown=false 는 정상 통과한다', () => {
    const res = normalize(raw({ hourKnown: false, hour: undefined, minute: undefined }));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.hour).toEqual({ known: false });
  });

  it('시간 미상이면 시/분 값이 이상해도 무시한다', () => {
    const res = normalize(raw({ hourKnown: false, hour: 99, minute: 99 }));
    expect(res.ok).toBe(true);
  });
});

describe('음력 변환', () => {
  it('2023년 윤달은 2월이다', () => {
    expect(leapMonthOf(2023)).toBe(2);
    expect(leapMonthOf(2026)).toBe(0);
  });

  it('평2월과 윤2월은 다른 양력 날짜다', () => {
    const plain = lunarToSolar(2023, 2, 15, false);
    const leap = lunarToSolar(2023, 2, 15, true);
    expect(plain.ok && leap.ok).toBe(true);
    if (!plain.ok || !leap.ok) return;
    expect(plain.value).toEqual({ year: 2023, month: 3, day: 6 });
    expect(leap.value).toEqual({ year: 2023, month: 4, day: 5 });
  });

  it('없는 윤달을 요청하면 NO_SUCH_LEAP_MONTH', () => {
    const res = lunarToSolar(2026, 2, 15, true);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('NO_SUCH_LEAP_MONTH');
    expect(res.error.message).toContain('윤달이 없습니다');
  });

  it('없는 음력 날짜(2월 30일)를 막는다', () => {
    const res = lunarToSolar(2026, 2, 30, false);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('INVALID_DATE');
  });

  it('normalize 가 음력 입력을 검증한다', () => {
    const good = normalize(raw({ calendar: 'lunar', year: 2023, month: 2, day: 15, leapMonth: true }));
    expect(good.ok).toBe(true);
    const bad = normalize(raw({ calendar: 'lunar', year: 2026, month: 2, day: 15, leapMonth: true }));
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.error.code).toBe('NO_SUCH_LEAP_MONTH');
  });

  it('resolveSolarYmd 가 음력을 양력으로 되돌린다', () => {
    const input = normalize(raw({ calendar: 'lunar', year: 2023, month: 2, day: 15, leapMonth: true }));
    expect(input.ok).toBe(true);
    if (!input.ok) return;
    const solar = resolveSolarYmd(input.value);
    expect(solar.ok).toBe(true);
    if (!solar.ok) return;
    expect(solar.value).toEqual({ year: 2023, month: 4, day: 5 });
  });

  it('양력 입력은 그대로 통과한다', () => {
    const input = normalize(raw());
    expect(input.ok).toBe(true);
    if (!input.ok) return;
    const solar = resolveSolarYmd(input.value);
    expect(solar.ok).toBe(true);
    if (!solar.ok) return;
    expect(solar.value).toEqual({ year: 1990, month: 5, day: 5 });
  });
});
