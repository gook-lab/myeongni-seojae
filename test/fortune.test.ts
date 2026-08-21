/**
 * 부가 운세 테스트 — 오늘 · 신년 · 궁합
 *
 * 이 파일이 지키는 핵심: **점수가 없다.**
 * 원본은 세 곳 모두 Math.sin 난수로 숫자를 만들고 있었다.
 * 숫자가 되살아나면 여기서 걸린다.
 */

import { describe, expect, it } from 'vitest';
import { dailyFortune, gunghap, yearFortune } from '../src/core/fortune';
import { computeGunghap, computeReading } from '../src/engine/index';
import type { Pillar, RawFormValues } from '../src/core/types';

const TODAY = new Date(Date.UTC(2026, 7, 21, 3, 0, 0));

const BASE: RawFormValues = {
  calendar: 'solar', year: 1990, month: 5, day: 5, leapMonth: false,
  hourKnown: true, hour: 9, minute: 30, gender: '남',
  yajasi: 'preserve-day', applyEquationOfTime: false,
};

const read = (over: Partial<RawFormValues> = {}) => {
  const r = computeReading({ ...BASE, ...over }, { today: TODAY });
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
};

const dayMaster = (over: Partial<RawFormValues> = {}): Pillar => read(over).chart.dayMaster;

describe('★전제 4★ 부가 운세에 점수가 없다', () => {
  const r = read();

  it('오늘의 운세에 숫자 점수가 없다', () => {
    expect(r.daily).not.toBeNull();
    expect(Object.keys(r.daily!)).not.toContain('score');
    expect(JSON.stringify(r.daily)).not.toMatch(/"score"/);
  });

  it('신년운세와 월운에 점수가 없다', () => {
    expect(r.year).not.toBeNull();
    expect(JSON.stringify(r.year)).not.toMatch(/"score"/);
    for (const m of r.year!.months) {
      expect(Object.keys(m)).not.toContain('score');
    }
  });

  it('궁합에 점수가 없다', () => {
    const g = computeGunghap(BASE, { ...BASE, year: 1988, gender: '여' }, { today: TODAY });
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(JSON.stringify(g.value)).not.toMatch(/"score"|\d+점/);
  });
});

describe('오늘의 운세', () => {
  it('일진 간지와 십성 관계를 준다', () => {
    const f = dailyFortune(dayMaster(), TODAY);
    expect(f.ok).toBe(true);
    if (!f.ok) return;
    expect(f.value.ganji).toHaveLength(2);
    expect(f.value.date).toEqual({ year: 2026, month: 8, day: 21 });
    expect(['비겁', '식상', '재성', '관성', '인성']).toContain(f.value.category);
  });

  it('같은 날이면 항상 같은 결과다 (난수 없음)', () => {
    const a = dailyFortune(dayMaster(), TODAY);
    const b = dailyFortune(dayMaster(), TODAY);
    expect(a).toEqual(b);
  });

  it('일간이 다르면 같은 날도 십성이 다를 수 있다', () => {
    const gods = new Set<string>();
    for (const year of [1988, 1990, 1992, 1994, 1996]) {
      const f = dailyFortune(dayMaster({ year }), TODAY);
      if (f.ok) gods.add(f.value.tenGod);
    }
    expect(gods.size).toBeGreaterThan(1);
  });

  it('머리말이 왜 그런 날인지 설명한다', () => {
    const r = read();
    expect(r.daily!.lead).toContain('오늘은');
    expect(r.daily!.lead).toContain(r.daily!.ganji);
    expect(r.daily!.lead).toContain(r.daily!.tenGod);
  });
});

describe('신년운세', () => {
  const f = yearFortune(dayMaster(), 2026, TODAY);

  it('세운 간지가 병오다 (2026년)', () => {
    expect(f.ok).toBe(true);
    if (!f.ok) return;
    expect(f.value.ganji).toBe('丙午');
  });

  it('열두 달을 준다', () => {
    if (!f.ok) return;
    expect(f.value.months).toHaveLength(12);
  });

  it('절기월이라 2월부터 시작해 1월로 끝난다', () => {
    if (!f.ok) return;
    expect(f.value.months[0]?.label).toBe('2월');
    expect(f.value.months[11]?.label).toBe('1월');
  });

  it('열두 달 간지가 서로 다르다', () => {
    if (!f.ok) return;
    expect(new Set(f.value.months.map((m) => m.ganji)).size).toBe(12);
  });

  it('월 간지가 육십갑자 순서로 이어진다', () => {
    if (!f.ok) return;
    const STEMS = '甲乙丙丁戊己庚辛壬癸';
    const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
    for (let i = 1; i < 12; i += 1) {
      const prev = f.value.months[i - 1]!.ganji;
      const cur = f.value.months[i]!.ganji;
      expect(STEMS.indexOf(cur[0]!)).toBe((STEMS.indexOf(prev[0]!) + 1) % 10);
      expect(BRANCHES.indexOf(cur[1]!)).toBe((BRANCHES.indexOf(prev[1]!) + 1) % 12);
    }
  });

  it('첫 달이 인월(寅)이다', () => {
    if (!f.ok) return;
    expect(f.value.months[0]?.ganji[1]).toBe('寅');
  });

  it('engine 이 머리말과 월별 색을 붙인다', () => {
    const r = read();
    expect(r.year!.lead).toContain('2026년');
    expect(r.year!.lead).toContain('丙午');
    for (const m of r.year!.months) {
      expect(m.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(m.text.length).toBeGreaterThan(10);
    }
  });
});

describe('궁합', () => {
  const p = (over: Partial<RawFormValues>) => dayMaster(over);

  it('같은 오행 일간은 same', () => {
    // 일간이 같은 두 사람을 찾는다
    const a = p({ year: 1990, month: 5, day: 5 });
    const b = p({ year: 1990, month: 5, day: 5, gender: '여' });
    expect(gunghap(a, b).kind).toBe('same');
  });

  it('세 가지 관계가 모두 나온다', () => {
    const kinds = new Set<string>();
    const base = p({ year: 1990, month: 5, day: 5 });
    for (let d = 1; d <= 28; d += 1) {
      kinds.add(gunghap(base, p({ year: 1991, month: 3, day: d })).kind);
    }
    expect(kinds.size).toBe(3);
  });

  it('일지 합·충을 판정한다', () => {
    const results = [];
    for (let d = 1; d <= 28; d += 1) {
      results.push(gunghap(p({ year: 1990, month: 5, day: 5 }), p({ year: 1991, month: 3, day: d })));
    }
    expect(results.some((r) => r.branchHarmony)).toBe(true);
    expect(results.some((r) => r.branchClash)).toBe(true);
    // 합과 충이 동시에 성립하지는 않는다
    expect(results.every((r) => !(r.branchHarmony && r.branchClash))).toBe(true);
  });

  it('대칭이다 — 순서를 바꿔도 관계는 같다', () => {
    const a = p({ year: 1990, month: 5, day: 5 });
    const b = p({ year: 1988, month: 11, day: 22 });
    const ab = gunghap(a, b);
    const ba = gunghap(b, a);
    expect(ab.kind).toBe(ba.kind);
    expect(ab.branchHarmony).toBe(ba.branchHarmony);
    expect(ab.branchClash).toBe(ba.branchClash);
  });

  it('computeGunghap 이 문장을 붙인다', () => {
    const g = computeGunghap(BASE, { ...BASE, year: 1988, month: 11, day: 22, gender: '여' }, { today: TODAY });
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(g.value.title.length).toBeGreaterThan(3);
    expect(g.value.body.length).toBeGreaterThan(50);
    expect(g.value.pairLabel).toContain('·');
  });

  it('한쪽 입력이 잘못되면 에러를 전파한다', () => {
    const g = computeGunghap(BASE, { ...BASE, year: 1899 }, { today: TODAY });
    expect(g.ok).toBe(false);
    if (g.ok) return;
    expect(g.error.code).toBe('OUT_OF_RANGE_YEAR');
  });
});

describe('시간 미상이어도 부가 운세가 나온다', () => {
  it('오늘·신년이 모두 계산된다', () => {
    const r = read({ hourKnown: false });
    expect(r.daily).not.toBeNull();
    expect(r.year).not.toBeNull();
    expect(r.year!.months).toHaveLength(12);
  });

  it('일간은 시각과 무관하므로 부가 운세도 같다', () => {
    const known = read({ hourKnown: true, hour: 9, minute: 30 });
    const unknown = read({ hourKnown: false });
    expect(known.daily).toEqual(unknown.daily);
    expect(known.year).toEqual(unknown.year);
  });
});
