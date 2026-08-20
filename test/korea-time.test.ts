/**
 * korea-time 단위 테스트
 *
 * 이 파일이 지키는 것: 진태양시 보정량이 상수가 아니라는 사실.
 * "−32분 고정" 회귀가 들어오면 1954~61 케이스가 즉시 깨진다.
 */

import { describe, expect, it } from 'vitest';
import {
  KOREA_TZ,
  SEOUL_LONGITUDE,
  __resetTzdataCache,
  equationOfTimeMinutes,
  fieldsAtOffset,
  isDaylightSaving,
  isTzdataUsable,
  longitudeOffsetMinutes,
  toSolarTime,
  tzdataDiagnostics,
  wallClockToUtc,
  zoneOffsetMinutes,
} from '../src/core/korea-time';
import type { BirthInput } from '../src/core/types';

const baseInput = (over: Partial<BirthInput> = {}): BirthInput => ({
  calendar: 'solar',
  year: 1990,
  month: 5,
  day: 5,
  leapMonth: false,
  hour: { known: true, hour: 12, minute: 0 },
  gender: '남',
  longitude: SEOUL_LONGITUDE,
  yajasi: 'preserve-day',
  applyEquationOfTime: false,
  ...over,
});

describe('zoneOffsetMinutes — 한국 표준시 이력', () => {
  const cases: Array<[string, number, string]> = [
    ['1910-06-15T00:00:00Z', 510, '대한제국기 UTC+8:30'],
    ['1930-06-15T00:00:00Z', 540, '일제강점기 UTC+9'],
    ['1953-06-15T00:00:00Z', 540, '1954년 이전 UTC+9'],
    ['1957-06-15T00:00:00Z', 570, '1954~61 서머타임 UTC+9:30'],
    ['1957-12-15T00:00:00Z', 510, '1954~61 겨울 UTC+8:30'],
    ['1959-07-15T00:00:00Z', 570, '1959 서머타임 UTC+9:30'],
    ['1965-06-15T00:00:00Z', 540, '1961 이후 UTC+9'],
    ['1987-07-15T00:00:00Z', 600, '1987 서머타임 UTC+10'],
    ['1987-02-15T00:00:00Z', 540, '1987 겨울 UTC+9'],
    ['1988-08-15T00:00:00Z', 600, '1988 서머타임 UTC+10'],
    ['1990-08-15T00:00:00Z', 540, '현재 UTC+9'],
  ];

  it.each(cases)('%s → %i분 (%s)', (iso, expected) => {
    expect(zoneOffsetMinutes(new Date(iso), KOREA_TZ)).toBe(expected);
  });
});

describe('longitudeOffsetMinutes', () => {
  it('서울 126.978°E → 8시간 27분 54.7초', () => {
    const minutes = longitudeOffsetMinutes(SEOUL_LONGITUDE);
    expect(minutes).toBeCloseTo(507.912, 3);
    // 정확히는 30474.72초 = 8h27m54.72s.
    // 설계 문서의 "8:27:55" 는 반올림 표기다 (경도 126.979166° 에 해당).
    expect(minutes * 60).toBeCloseTo(30474.72, 2);
  });
});

describe('toSolarTime — 진태양시 보정량은 상수가 아니다 (A1)', () => {
  /** 보정량을 "분 초" 문자열로 — 회귀를 눈으로 잡기 쉽게 */
  const fmt = (min: number) => {
    const totalSec = Math.round(Math.abs(min) * 60);
    return `${min < 0 ? '−' : '+'}${Math.floor(totalSec / 60)}분 ${String(totalSec % 60).padStart(2, '0')}초`;
  };

  const cases: Array<[string, { year: number; month: number; day: number }, number, string]> = [
    ['1990년 (UTC+9)', { year: 1990, month: 5, day: 5 }, -32, '−32분 05초'],
    ['1930년 (UTC+9, 일제강점기)', { year: 1930, month: 5, day: 5 }, -32, '−32분 05초'],
    ['2026년 (UTC+9, 현재)', { year: 2026, month: 5, day: 5 }, -32, '−32분 05초'],
    ['1957년 겨울 (UTC+8:30)', { year: 1957, month: 12, day: 15 }, -2, '−2분 05초'],
    ['1957년 여름 (UTC+9:30 서머타임)', { year: 1957, month: 6, day: 15 }, -62, '−62분 05초'],
    ['1988년 여름 (UTC+10 서머타임)', { year: 1988, month: 8, day: 15 }, -92, '−92분 05초'],
    ['1910년 (UTC+8:30)', { year: 1910, month: 6, day: 15 }, -2, '−2분 05초'],
  ];

  it.each(cases)('%s → %i분대', (_label, ymd, roughMinutes, exact) => {
    const res = toSolarTime(baseInput({ ...ymd }), { solarYmd: ymd });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(Math.trunc(res.value.offsetMinutes)).toBe(roughMinutes);
    expect(fmt(res.value.offsetMinutes)).toBe(exact);
  });

  it('회귀 방지: 1957년 겨울이 −32분이면 실패해야 한다', () => {
    const ymd = { year: 1957, month: 12, day: 15 };
    const res = toSolarTime(baseInput(ymd), { solarYmd: ymd });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // −32분 고정 구현이 들어오면 여기서 걸린다
    expect(res.value.offsetMinutes).toBeGreaterThan(-5);
    expect(res.value.standardOffsetMinutes).toBe(510);
  });
});

describe('toSolarTime — 두 타임라인', () => {
  it('cstFields 는 UTC+8, solarFields 는 UTC+8:27:55 로 읽는다', () => {
    const ymd = { year: 1990, month: 5, day: 5 };
    const res = toSolarTime(
      baseInput({ ...ymd, hour: { known: true, hour: 9, minute: 0 } }),
      { solarYmd: ymd },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const { cstFields, solarFields } = res.value;
    // KST 09:00 = UTC 00:00 → CST 08:00
    expect(cstFields.hour).toBe(8);
    expect(cstFields.minute).toBe(0);
    // 진태양시 = UTC 00:00 + 8:27:54.72 = 08:27:54
    expect(solarFields.hour).toBe(8);
    expect(solarFields.minute).toBe(27);
    expect(solarFields.second).toBe(54);
    // 둘의 차이는 항상 경도 보정분. 시대와 무관하다.
    expect(solarFields.minute - cstFields.minute).toBe(27);
  });

  it('시간 미상이면 정오를 대표 시각으로 쓴다', () => {
    const ymd = { year: 1957, month: 6, day: 15 };
    const res = toSolarTime(baseInput({ ...ymd, hour: { known: false } }), { solarYmd: ymd });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // 정오는 일주 경계(자정/23시)에서 가장 멀다 → 일주가 흔들리지 않는다
    // 1957-06-15 12:00 KST(+9:30) → UTC 02:30 → CST(+8) 10:30
    expect(res.value.cstFields.hour).toBe(10);
    expect(res.value.cstFields.minute).toBe(30);
    expect(res.value.solarFields.day).toBe(15);
  });
});

describe('wallClockToUtc', () => {
  it('1957-06-15 12:00 KST(+9:30) → UTC 02:30', () => {
    const utc = wallClockToUtc(
      { year: 1957, month: 6, day: 15, hour: 12, minute: 0, second: 0 },
      KOREA_TZ,
    );
    expect(utc.toISOString()).toBe('1957-06-15T02:30:00.000Z');
  });

  it('1990-05-05 12:00 KST(+9) → UTC 03:00', () => {
    const utc = wallClockToUtc(
      { year: 1990, month: 5, day: 5, hour: 12, minute: 0, second: 0 },
      KOREA_TZ,
    );
    expect(utc.toISOString()).toBe('1990-05-05T03:00:00.000Z');
  });

  it('왕복 변환이 안정적이다', () => {
    const fields = { year: 1957, month: 12, day: 15, hour: 23, minute: 30, second: 0 };
    const utc = wallClockToUtc(fields, KOREA_TZ);
    const back = fieldsAtOffset(utc, zoneOffsetMinutes(utc, KOREA_TZ));
    expect(back).toEqual(fields);
  });
});

describe('isDaylightSaving', () => {
  it.each([
    ['1957-06-15T00:00:00Z', true],
    ['1957-12-15T00:00:00Z', false],
    ['1988-08-15T00:00:00Z', true],
    ['1988-02-15T00:00:00Z', false],
    ['2026-08-15T00:00:00Z', false],
  ])('%s → %s', (iso, expected) => {
    expect(isDaylightSaving(new Date(iso))).toBe(expected);
  });
});

describe('equationOfTimeMinutes', () => {
  it('연중 ±16분 범위를 벗어나지 않는다', () => {
    for (let day = 0; day < 365; day += 1) {
      const d = new Date(Date.UTC(2026, 0, 1 + day));
      const eot = equationOfTimeMinutes(d);
      expect(Math.abs(eot)).toBeLessThan(17);
    }
  });

  it('기본값은 비활성이라 보정량에 영향이 없다', () => {
    const ymd = { year: 1990, month: 11, day: 3 }; // 균시차가 큰 시기
    const off = toSolarTime(baseInput(ymd), { solarYmd: ymd });
    const on = toSolarTime(
      baseInput({ ...ymd, applyEquationOfTime: true }),
      { solarYmd: ymd },
    );
    expect(off.ok && on.ok).toBe(true);
    if (!off.ok || !on.ok) return;
    expect(off.value.equationOfTimeMinutes).toBe(0);
    expect(on.value.equationOfTimeMinutes).not.toBe(0);
    expect(off.value.offsetMinutes).not.toBe(on.value.offsetMinutes);
  });
});

describe('F1 — tzdata 자가진단', () => {
  it('이 런타임은 한국 표준시 이력을 알고 있다', () => {
    __resetTzdataCache();
    expect(isTzdataUsable()).toBe(true);
  });

  it('진단 상세가 네 구간을 모두 통과한다', () => {
    const diag = tzdataDiagnostics();
    expect(diag).toHaveLength(4);
    for (const d of diag) {
      expect(d.pass, `${d.label}: expected ${d.expected}, got ${d.actual}`).toBe(true);
    }
  });
});
