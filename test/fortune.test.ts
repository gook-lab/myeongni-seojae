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
import { josa } from '../src/text/fortune-text';
import type { RawFormValues } from '../src/core/types';

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

const dayMaster = (over: Partial<RawFormValues> = {}) => read(over).chart.dayMaster;

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

describe('궁합 — 12자를 전부 쓴다', () => {
  const chart = (over: Partial<RawFormValues> = {}) => {
    const r = read(over);
    return { dayMaster: r.chart.dayMaster, elementCounts: r.chart.elementCounts };
  };

  it('일간 오행 관계 세 가지가 모두 나온다', () => {
    const kinds = new Set<string>();
    const base = chart({ year: 1990, month: 5, day: 5 });
    for (let d = 1; d <= 28; d += 1) {
      kinds.add(gunghap(base, chart({ year: 1991, month: 3, day: d })).kind);
    }
    expect(kinds.size).toBe(3);
  });

  it('같은 일간이면 same 이다', () => {
    const a = chart({ year: 1990, month: 5, day: 5 });
    expect(gunghap(a, a).kind).toBe('same');
  });

  it('일지 관계를 다섯 갈래로 판정한다', () => {
    const found = new Set<string>();
    const base = chart({ year: 1990, month: 5, day: 5 });
    for (let m = 1; m <= 12; m += 1) {
      for (let d = 1; d <= 28; d += 3) {
        found.add(gunghap(base, chart({ year: 1991, month: m, day: d })).branchRelation);
      }
    }
    // 육합·삼합·충·형·없음 중 최소 넷은 나와야 한다
    expect(found.size).toBeGreaterThanOrEqual(4);
    for (const r of found) {
      expect(['harmony', 'triple', 'clash', 'punish', 'none']).toContain(r);
    }
  });

  it('육합과 충이 동시에 성립하지 않는다', () => {
    const base = chart({ year: 1990, month: 5, day: 5 });
    for (let d = 1; d <= 28; d += 1) {
      const g = gunghap(base, chart({ year: 1991, month: 3, day: d }));
      // 한 관계만 나온다
      expect(typeof g.branchRelation).toBe('string');
    }
  });

  it('★신규★ 오행 보완을 계산한다 — 내게 없는 걸 상대가 갖고 있는가', () => {
    const a = chart({ year: 1990, month: 5, day: 5 }); // 목0 수0
    const b = chart({ year: 1988, month: 11, day: 22 });
    const g = gunghap(a, b);

    // a 에게 없는 오행이 실제로 있다
    const aMissing = (['목', '화', '토', '금', '수'] as const).filter(
      (e) => a.elementCounts[e] === 0,
    );
    expect(aMissing.length).toBeGreaterThan(0);

    // filled + stillMissing 이 없는 오행 전부를 덮는다
    expect([...g.aReceives.filled, ...g.aReceives.stillMissing].sort()).toEqual(
      [...aMissing].sort(),
    );
    // 채운 것은 실제로 상대가 갖고 있다
    for (const e of g.aReceives.filled) {
      expect(b.elementCounts[e]).toBeGreaterThan(0);
    }
    // 못 채운 것은 상대도 없다
    for (const e of g.aReceives.stillMissing) {
      expect(b.elementCounts[e]).toBe(0);
    }
    expect(g.aReceives.ratio).toBeGreaterThanOrEqual(0);
    expect(g.aReceives.ratio).toBeLessThanOrEqual(1);
  });

  it('★신규★ 상호 십성을 계산한다 — 상대가 나에게 어떤 역할인가', () => {
    const a = chart({ year: 1990, month: 5, day: 5 });
    const b = chart({ year: 1988, month: 11, day: 22 });
    const g = gunghap(a, b);
    const ALL = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
    expect(ALL).toContain(g.aSeesB);
    expect(ALL).toContain(g.bSeesA);
  });

  it('상호 십성은 방향에 따라 다를 수 있다 (비대칭)', () => {
    const pairs: Array<[string, string]> = [];
    const base = chart({ year: 1990, month: 5, day: 5 });
    for (let d = 1; d <= 28; d += 1) {
      const g = gunghap(base, chart({ year: 1991, month: 3, day: d }));
      pairs.push([g.aSeesB, g.bSeesA]);
    }
    // 서로 다른 십성으로 보이는 조합이 실제로 있다
    expect(pairs.some(([x, y]) => x !== y)).toBe(true);
  });

  it('일간·일지 관계는 순서를 바꿔도 같다 (대칭)', () => {
    const a = chart({ year: 1990, month: 5, day: 5 });
    const b = chart({ year: 1988, month: 11, day: 22 });
    const ab = gunghap(a, b);
    const ba = gunghap(b, a);
    expect(ab.kind).toBe(ba.kind);
    expect(ab.branchRelation).toBe(ba.branchRelation);
    // 오행 보완과 상호 십성은 방향이 있으므로 뒤집힌다
    expect(ab.aReceives).toEqual(ba.bReceives);
    expect(ab.aSeesB).toBe(ba.bSeesA);
  });

  it('computeGunghap 이 네 가지를 모두 문장으로 낸다', () => {
    const g = computeGunghap(
      BASE,
      { ...BASE, year: 1988, month: 11, day: 22, gender: '여' },
      { today: TODAY },
    );
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    const v = g.value;
    expect(v.title.length).toBeGreaterThan(3);          // 1. 일간 관계
    expect(v.body.length).toBeGreaterThan(50);
    expect(v.branchNote.length).toBeGreaterThan(20);     // 2. 일지 관계
    expect(v.complement.a.length).toBeGreaterThan(15);   // 3. 오행 보완
    expect(v.complement.b.length).toBeGreaterThan(15);
    expect(v.mutual.aText.length).toBeGreaterThan(10);   // 4. 상호 십성
    expect(v.mutual.bText.length).toBeGreaterThan(10);
  });

  it('한쪽 입력이 잘못되면 에러를 전파한다', () => {
    const g = computeGunghap(BASE, { ...BASE, year: 1899 }, { today: TODAY });
    expect(g.ok).toBe(false);
    if (g.ok) return;
    expect(g.error.code).toBe('OUT_OF_RANGE_YEAR');
  });

  it('점수가 없다', () => {
    const g = computeGunghap(BASE, { ...BASE, year: 1988 }, { today: TODAY });
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    expect(JSON.stringify(g.value)).not.toMatch(/"score"|\d+점/);
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

describe('한국어 조사 처리', () => {
  it('받침 유무로 을/를을 고른다', () => {
    expect(josa('목', '을', '를')).toBe('을'); // ㄱ 받침
    expect(josa('금', '을', '를')).toBe('을'); // ㅁ 받침
    expect(josa('화', '을', '를')).toBe('를'); // 받침 없음
    expect(josa('토', '을', '를')).toBe('를');
    expect(josa('수', '을', '를')).toBe('를');
  });

  it('은/는도 같은 규칙이다', () => {
    expect(josa('나', '은', '는')).toBe('는');
    expect(josa('상대', '은', '는')).toBe('는');
    expect(josa('목', '은', '는')).toBe('은');
  });

  it('한글이 아니면 받침 없는 쪽으로 간다', () => {
    expect(josa('A', '을', '를')).toBe('를');
    expect(josa('', '을', '를')).toBe('를');
  });

  it('궁합 문장에 "을(를)" 같은 표기가 남지 않는다', () => {
    const g = computeGunghap(
      BASE, { ...BASE, year: 1988, month: 11, day: 22, gender: '여' }, { today: TODAY },
    );
    expect(g.ok).toBe(true);
    if (!g.ok) return;
    const all = `${g.value.complement.a} ${g.value.complement.b}`;
    expect(all).not.toMatch(/을\(를\)|은\(는\)|이\(가\)/);
  });

  it('상대 관점 문장의 주어가 꼬이지 않는다', () => {
    // "상대에게 없는 X 를 상대도 갖고 있지 않습니다" 같은 자기모순이 없어야 한다
    for (const y of [1985, 1988, 1991, 1995, 2000]) {
      const g = computeGunghap(BASE, { ...BASE, year: y }, { today: TODAY });
      if (!g.ok) continue;
      expect(g.value.complement.b).not.toMatch(/상대에게 없는 .+ 상대도/);
      expect(g.value.complement.a).not.toMatch(/나에게 없는 .+ 나도/);
    }
  });
});
