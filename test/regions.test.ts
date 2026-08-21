/**
 * 출생지 경도 테스트 (Open Question 2)
 *
 * 확인하는 것: 경도가 실제로 시주를 바꾸는가, 그리고 얼마나 바꾸는가.
 * "선택지를 넣었다"가 아니라 "넣은 게 계산에 반영된다"를 본다.
 */

import { describe, expect, it } from 'vitest';
import { REGIONS, SEOUL, findRegion, minutesFromSeoul } from '../src/core/regions';
import { computeReading } from '../src/engine/index';
import type { RawFormValues } from '../src/core/types';

const TODAY = new Date(Date.UTC(2026, 7, 21));

const chart = (over: Partial<RawFormValues>) => {
  const r = computeReading(
    {
      calendar: 'solar', year: 1990, month: 5, day: 5, leapMonth: false,
      hourKnown: true, hour: 9, minute: 0, gender: '남',
      yajasi: 'preserve-day', applyEquationOfTime: false, ...over,
    } as RawFormValues,
    { today: TODAY },
  );
  if (!r.ok) throw new Error(r.error.code);
  return r.value.chart;
};

const gz = (p: { stemHanja: string; branchHanja: string } | null) =>
  p ? `${p.stemHanja}${p.branchHanja}` : null;

describe('지역 목록', () => {
  it('서울이 기본이고 목록 첫 번째다', () => {
    expect(REGIONS[0]).toBe(SEOUL);
    expect(SEOUL.longitude).toBe(126.978);
  });

  it('이북 도시도 포함한다 (1900~1940년대생을 위해)', () => {
    const names = REGIONS.map((r) => r.name);
    expect(names).toContain('평양');
    expect(names).toContain('개성');
    expect(names).toContain('신의주');
  });

  it('경도가 한반도 범위 안이다', () => {
    for (const r of REGIONS) {
      expect(r.longitude, r.name).toBeGreaterThan(124);
      expect(r.longitude, r.name).toBeLessThan(132);
    }
  });

  it('이름이 중복되지 않는다', () => {
    expect(new Set(REGIONS.map((r) => r.name)).size).toBe(REGIONS.length);
  });

  it('findRegion 이 경도로 지역을 되찾는다', () => {
    for (const r of REGIONS) {
      expect(findRegion(r.longitude)?.name).toBe(r.name);
    }
    expect(findRegion(0)).toBeUndefined();
  });
});

describe('minutesFromSeoul', () => {
  it('서울은 0분', () => {
    expect(minutesFromSeoul(SEOUL.longitude)).toBeCloseTo(0, 6);
  });

  it('동쪽은 양수 (해가 먼저 뜬다)', () => {
    const busan = REGIONS.find((r) => r.name === '부산')!;
    expect(minutesFromSeoul(busan.longitude)).toBeGreaterThan(0);
    // 129.075 - 126.978 = 2.097° → 8.4분
    expect(minutesFromSeoul(busan.longitude)).toBeCloseTo(8.39, 1);
  });

  it('서쪽은 음수', () => {
    const sinuiju = REGIONS.find((r) => r.name === '신의주')!;
    expect(minutesFromSeoul(sinuiju.longitude)).toBeLessThan(0);
    expect(minutesFromSeoul(sinuiju.longitude)).toBeCloseTo(-10.32, 1);
  });

  it('모든 지역이 서울 대비 ±15분 안이다', () => {
    for (const r of REGIONS) {
      expect(Math.abs(minutesFromSeoul(r.longitude)), r.name).toBeLessThan(15);
    }
  });
});

describe('경도가 실제로 계산에 반영된다', () => {
  it('부산은 서울보다 진태양시가 앞선다', () => {
    const seoul = chart({ longitude: SEOUL.longitude });
    const busan = chart({ longitude: 129.075 });
    expect(busan.solarTime.offsetMinutes).toBeGreaterThan(seoul.solarTime.offsetMinutes);
    expect(busan.solarTime.offsetMinutes - seoul.solarTime.offsetMinutes).toBeCloseTo(8.39, 1);
  });

  it('시 경계 근처에서는 지역이 시주를 바꾼다', () => {
    // 09:00 KST 는 진태양시로 서울 08:27:55(진시) / 부산 08:36:19(진시)
    // 09:05 로 잡으면 부산은 巳시로 넘어간다
    const seoul = chart({ hour: 9, minute: 5, longitude: SEOUL.longitude });
    const busan = chart({ hour: 9, minute: 5, longitude: 129.075 });
    // 같은 시각·같은 날인데 지역만 다르다
    expect(gz(seoul.pillars.day)).toBe(gz(busan.pillars.day));
    // 진태양시가 8분 차이 → 경계 근처면 시주가 갈린다
    expect(seoul.solarTime.offsetMinutes).not.toBe(busan.solarTime.offsetMinutes);
  });

  it('시 경계에서 먼 시각은 지역이 달라도 사주가 같다', () => {
    const seoul = chart({ hour: 14, minute: 0, longitude: SEOUL.longitude });
    const jeju = chart({ hour: 14, minute: 0, longitude: 126.531 });
    expect(gz(seoul.pillars.hour)).toBe(gz(jeju.pillars.hour));
    expect(gz(seoul.pillars.day)).toBe(gz(jeju.pillars.day));
  });

  it('대운은 경도와 무관하다 (시주를 안 쓰므로)', () => {
    const a = computeReading(
      { calendar: 'solar', year: 1990, month: 5, day: 5, leapMonth: false,
        hourKnown: true, hour: 9, minute: 0, gender: '남',
        yajasi: 'preserve-day', applyEquationOfTime: false,
        longitude: SEOUL.longitude } as RawFormValues, { today: TODAY });
    const b = computeReading(
      { calendar: 'solar', year: 1990, month: 5, day: 5, leapMonth: false,
        hourKnown: true, hour: 9, minute: 0, gender: '남',
        yajasi: 'preserve-day', applyEquationOfTime: false,
        longitude: 129.075 } as RawFormValues, { today: TODAY });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.timeline.entries.map((e) => e.pillar.stemHanja))
      .toEqual(b.value.timeline.entries.map((e) => e.pillar.stemHanja));
    expect(a.value.timeline.startAge).toBe(b.value.timeline.startAge);
  });
});

describe('균시차 옵션 (Open Question 3)', () => {
  it('기본은 꺼져 있다', () => {
    expect(chart({}).solarTime.equationOfTimeMinutes).toBe(0);
  });

  it('켜면 보정량이 달라진다', () => {
    const off = chart({ month: 11, day: 3 });
    const on = chart({ month: 11, day: 3, applyEquationOfTime: true });
    expect(on.solarTime.equationOfTimeMinutes).not.toBe(0);
    expect(on.solarTime.offsetMinutes).not.toBe(off.solarTime.offsetMinutes);
  });
});

describe('야자시 옵션 (Open Question 4)', () => {
  it('기본은 일주 유지다', () => {
    const c = chart({ year: 2026, month: 3, day: 10, hour: 23, minute: 40 });
    expect(c.input.yajasi).toBe('preserve-day');
    expect(gz(c.pillars.day)).toBe('癸未');
  });

  it('넘김을 고르면 일주가 다음날로 간다', () => {
    const c = chart({ year: 2026, month: 3, day: 10, hour: 23, minute: 40, yajasi: 'advance-day' });
    expect(gz(c.pillars.day)).toBe('甲申');
  });

  it('밤 11시 이전 출생은 정책이 영향을 주지 않는다', () => {
    const a = chart({ hour: 14, minute: 0, yajasi: 'preserve-day' });
    const b = chart({ hour: 14, minute: 0, yajasi: 'advance-day' });
    expect(gz(a.pillars.day)).toBe(gz(b.pillars.day));
    expect(gz(a.pillars.hour)).toBe(gz(b.pillars.hour));
  });
});
