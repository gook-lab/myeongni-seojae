/**
 * manse 단위 테스트
 *
 * 이 파일이 지키는 것:
 *  1. 년주·월주는 UTC+8 타임라인, 일주·시주는 진태양시 타임라인으로 계산된다
 *  2. 절기 경계에서 시대별 표준시가 반영된다 (단순 구현과 갈리는 지점)
 *  3. 시간 미상이어도 년·월·일주가 온전히 나온다
 *  4. 야자시 정책이 진태양시 23:00 에서 갈린다
 */

import { Solar } from 'lunar-javascript';
import { describe, expect, it } from 'vitest';
import { normalize, resolveSolarYmd } from '../src/core/input';
import { toSolarTime } from '../src/core/korea-time';
import { computeChart, countElements, pillarFromGanZhi } from '../src/core/manse';
import type { RawFormValues, SajuChart } from '../src/core/types';

const chart = (raw: Partial<RawFormValues>): SajuChart => {
  const n = normalize({
    calendar: 'solar',
    gender: '남',
    hourKnown: true,
    hour: 9,
    minute: 30,
    year: 1990,
    month: 5,
    day: 5,
    ...raw,
  } as RawFormValues);
  if (!n.ok) throw new Error(`normalize: ${n.error.code}`);
  const s = resolveSolarYmd(n.value);
  if (!s.ok) throw new Error(`resolveSolarYmd: ${s.error.code}`);
  const t = toSolarTime(n.value, { solarYmd: s.value });
  if (!t.ok) throw new Error(`toSolarTime: ${t.error.code}`);
  const c = computeChart(n.value, t.value, s.value);
  if (!c.ok) throw new Error(`computeChart: ${c.error.code}`);
  return c.value;
};

const gz = (p: { stemHanja: string; branchHanja: string } | null) =>
  p ? `${p.stemHanja}${p.branchHanja}` : null;

/** 흔한 오구현: KST 시각을 그대로 라이브러리에 먹인다 */
const naive = (y: number, m: number, d: number, h: number, mi: number) => {
  const e = Solar.fromYmdHms(y, m, d, h, mi, 0).getLunar().getEightChar();
  return { year: e.getYear(), month: e.getMonth() };
};

describe('pillarFromGanZhi', () => {
  it('간지를 한글 기둥으로 바꾼다', () => {
    const p = pillarFromGanZhi('庚午');
    expect(p).toMatchObject({
      stem: '경',
      branch: '오',
      stemElement: '금',
      branchElement: '화',
    });
  });

  it('잘못된 입력은 null', () => {
    expect(pillarFromGanZhi('')).toBeNull();
    expect(pillarFromGanZhi('X')).toBeNull();
    expect(pillarFromGanZhi('ZZ')).toBeNull();
  });
});

describe('절기 경계 — 시대별 표준시가 반영된다 (A1 회귀 방지)', () => {
  // 1957 입춘 = 1957-02-04 09:54:37 (UTC+8 기준)
  //           = 1957-02-04 10:24:37 KST(당시 UTC+8:30)
  it('입춘 직전(KST 10:20)은 전년(丙申)이다', () => {
    const c = chart({ year: 1957, month: 2, day: 4, hour: 10, minute: 20 });
    expect(gz(c.pillars.year)).toBe('丙申');
    expect(gz(c.pillars.month)).toBe('辛丑');
  });

  it('입춘 직후(KST 10:30)는 당년(丁酉)이다', () => {
    const c = chart({ year: 1957, month: 2, day: 4, hour: 10, minute: 30 });
    expect(gz(c.pillars.year)).toBe('丁酉');
    expect(gz(c.pillars.month)).toBe('壬寅');
  });

  it('단순 구현(KST 그대로 투입)과 실제로 다른 답을 준다', () => {
    const ours = chart({ year: 1957, month: 2, day: 4, hour: 10, minute: 20 });
    const theirs = naive(1957, 2, 4, 10, 20);
    // 30분 차이가 년주와 월주를 둘 다 바꾼다
    expect(gz(ours.pillars.year)).not.toBe(theirs.year);
    expect(gz(ours.pillars.month)).not.toBe(theirs.month);
  });
});

describe('시대별 보정량이 결과에 실려 있다', () => {
  it.each([
    [{ year: 1990, month: 5, day: 5 }, 540, -32],
    [{ year: 1957, month: 12, day: 15 }, 510, -2],
    [{ year: 1957, month: 6, day: 15 }, 570, -62],
    [{ year: 1988, month: 8, day: 15 }, 600, -92],
  ])('%o → 표준시 %i분, 보정 %i분대', (ymd, stdOffset, roughCorrection) => {
    const c = chart(ymd);
    expect(c.solarTime.standardOffsetMinutes).toBe(stdOffset);
    expect(Math.trunc(c.solarTime.offsetMinutes)).toBe(roughCorrection);
  });
});

describe('시간 미상 (A4)', () => {
  const known = chart({ year: 1957, month: 6, day: 15, hourKnown: true, hour: 9, minute: 30 });
  const unknown = chart({ year: 1957, month: 6, day: 15, hourKnown: false });

  it('년·월·일주는 시각 유무와 무관하게 동일하다', () => {
    expect(gz(unknown.pillars.year)).toBe(gz(known.pillars.year));
    expect(gz(unknown.pillars.month)).toBe(gz(known.pillars.month));
    expect(gz(unknown.pillars.day)).toBe(gz(known.pillars.day));
  });

  it('시주만 null 이고 hourUnknown 플래그가 선다', () => {
    expect(unknown.pillars.hour).toBeNull();
    expect(unknown.hourUnknown).toBe(true);
    expect(known.hourUnknown).toBe(false);
    expect(unknown.tenGods.hour).toBeNull();
  });

  it('오행 분포가 8글자가 아니라 6글자 기준이 된다', () => {
    const sum = (c: SajuChart) => Object.values(c.elementCounts).reduce((a, b) => a + b, 0);
    expect(sum(known)).toBe(8);
    expect(sum(unknown)).toBe(6);
  });
});

describe('야자시 정책', () => {
  // KST 23:30 → 진태양시 22:57 (아직 자시 아님)
  // KST 23:33 → 진태양시 23:00 (자시 진입)
  const at = (hour: number, minute: number, yajasi: 'preserve-day' | 'advance-day') =>
    chart({ year: 2026, month: 3, day: 10, hour, minute, yajasi });

  it('진태양시 23시 전에는 정책 차이가 없다', () => {
    const a = at(23, 30, 'preserve-day');
    const b = at(23, 30, 'advance-day');
    expect(gz(a.pillars.day)).toBe(gz(b.pillars.day));
    expect(gz(a.pillars.hour)).toBe('癸亥'); // 해시. 아직 자시 아님
  });

  it('진태양시 23시부터 정책이 갈린다', () => {
    const preserve = at(23, 40, 'preserve-day');
    const advance = at(23, 40, 'advance-day');
    expect(gz(preserve.pillars.hour)).toBe('甲子');
    expect(gz(advance.pillars.hour)).toBe('甲子');
    // 시주는 같고 일주만 갈린다 — 그게 야자시 유파 차이다
    expect(gz(preserve.pillars.day)).toBe('癸未');
    expect(gz(advance.pillars.day)).toBe('甲申');
  });

  it('KST 23:30 은 진태양시로 아직 22시대다 (경도 보정 확인)', () => {
    const c = at(23, 30, 'preserve-day');
    expect(c.solarTime.solarFields.hour).toBe(22);
    expect(c.solarTime.solarFields.minute).toBe(57);
  });
});

describe('음력 입력', () => {
  it('윤2월과 평2월이 다른 사주를 만든다', () => {
    const leap = chart({
      calendar: 'lunar', year: 2023, month: 2, day: 15, leapMonth: true, hourKnown: false,
    });
    const plain = chart({
      calendar: 'lunar', year: 2023, month: 2, day: 15, leapMonth: false, hourKnown: false,
    });
    expect(gz(leap.pillars.month)).not.toBe(gz(plain.pillars.month));
    expect(gz(leap.pillars.day)).not.toBe(gz(plain.pillars.day));
  });
});

describe('기본 정합성', () => {
  it('1990-05-05 09:30 → 庚午 庚辰 庚午 庚辰', () => {
    const c = chart({ year: 1990, month: 5, day: 5, hour: 9, minute: 30 });
    expect([
      gz(c.pillars.year), gz(c.pillars.month), gz(c.pillars.day), gz(c.pillars.hour),
    ]).toEqual(['庚午', '庚辰', '庚午', '庚辰']);
    expect(c.animal).toBe('말');
    expect(c.dayMaster.stem).toBe('경');
  });

  it('일간의 십성은 항상 일간이다', () => {
    expect(chart({}).tenGods.day.stem).toBe('일간');
  });

  it('countElements 는 오행 다섯 종을 모두 키로 갖는다', () => {
    const c = chart({});
    const counts = countElements(c.pillars);
    expect(new Set(Object.keys(counts))).toEqual(new Set(['목', '화', '토', '금', '수']));
  });
});
