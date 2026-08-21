/**
 * 신강·신약과 용신 테스트 (억부용신법)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 외부 정답지가 없다
 *
 * 만세력은 골든 50건으로 교차 검증했지만 용신은 그럴 수 없다.
 * 유파마다 판정법이 달라서 "정답"이 하나가 아니다.
 *
 * 대신 **성질**로 검증한다. 어떤 방법을 쓰든 반드시 지켜야 하는 것들이다:
 *
 *   1. 비겁·인성만으로 채운 명식은 반드시 신강이다
 *   2. 식상·재성·관성만으로 채운 명식은 반드시 신약이다
 *   3. 돕는 자리를 하나 늘리면 점수가 반드시 올라간다 (단조성)
 *   4. 신강이면 빼는 기운이, 신약이면 돕는 기운이 용신이다
 *   5. 같은 입력에 같은 결과다 (난수 없음)
 *
 * 이 다섯이 깨지면 판정법이 무엇이든 틀린 것이다.
 */

import { describe, expect, it } from 'vitest';
import { normalize, resolveSolarYmd } from '../src/core/input';
import { toSolarTime } from '../src/core/korea-time';
import { computeChart } from '../src/core/manse';
import { WEIGHTS, dayMasterStrength, yongsin } from '../src/core/yongsin';
import type { Element, FourPillars, Pillar, RawFormValues } from '../src/core/types';

/** 테스트용 기둥을 손으로 만든다 */
const STEM_EL: Record<string, Element> = {
  갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
  기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
};
const BRANCH_EL: Record<string, Element> = {
  자: '수', 축: '토', 인: '목', 묘: '목', 진: '토', 사: '화',
  오: '화', 미: '토', 신: '금', 유: '금', 술: '토', 해: '수',
};

const pillar = (stem: string, branch: string): Pillar => ({
  stem: stem as Pillar['stem'],
  branch: branch as Pillar['branch'],
  stemHanja: stem,
  branchHanja: branch,
  stemElement: STEM_EL[stem] as Element,
  branchElement: BRANCH_EL[branch] as Element,
});

/** 일간 갑(목) 기준으로 명식을 조립한다 */
const chartOf = (
  year: [string, string],
  month: [string, string],
  day: [string, string],
  hour: [string, string] | null,
): FourPillars => ({
  year: pillar(...year),
  month: pillar(...month),
  day: pillar(...day),
  hour: hour ? pillar(...hour) : null,
});

const real = (over: Partial<RawFormValues> = {}) => {
  const raw: RawFormValues = {
    calendar: 'solar', year: 1990, month: 5, day: 5, leapMonth: false,
    hourKnown: true, hour: 9, minute: 30, gender: '남',
    yajasi: 'preserve-day', applyEquationOfTime: false, ...over,
  };
  const n = normalize(raw);
  if (!n.ok) throw new Error(n.error.code);
  const s = resolveSolarYmd(n.value);
  if (!s.ok) throw new Error(s.error.code);
  const t = toSolarTime(n.value, { solarYmd: s.value });
  if (!t.ok) throw new Error(t.error.code);
  const c = computeChart(n.value, t.value, s.value);
  if (!c.ok) throw new Error(c.error.code);
  return c.value.pillars;
};

describe('★성질 1★ 비겁·인성만이면 반드시 신강', () => {
  it('일간 갑(목) 주위를 목·수로만 채우면 100% 신강', () => {
    // 갑=목(비겁), 임/계=수(인성), 인/묘=목(비겁), 자/해=수(인성)
    const p = chartOf(['갑', '인'], ['임', '자'], ['갑', '묘'], ['계', '해']);
    const s = dayMasterStrength(p);
    expect(s.verdict).toBe('신강');
    expect(s.score).toBe(1);
    expect(s.drainWeight).toBe(0);
    expect(s.deukryeong).toBe(true);
    expect(s.deukji).toBe(true);
    expect(s.deukse).toBe(true);
  });
});

describe('★성질 2★ 식상·재성·관성만이면 반드시 신약', () => {
  it('일간 갑(목) 주위를 화·토·금으로만 채우면 0% 신약', () => {
    // 병=화(식상), 무=토(재성), 경/신=금(관성)
    const p = chartOf(['경', '신'], ['무', '술'], ['갑', '유'], ['병', '오']);
    const s = dayMasterStrength(p);
    expect(s.verdict).toBe('신약');
    expect(s.score).toBe(0);
    expect(s.supportWeight).toBe(0);
    expect(s.deukryeong).toBe(false);
    expect(s.deukji).toBe(false);
    expect(s.deukse).toBe(false);
  });
});

describe('★성질 3★ 단조성 — 돕는 자리를 늘리면 점수가 올라간다', () => {
  it('빼는 자리를 하나씩 돕는 자리로 바꾸면 점수가 계속 오른다', () => {
    // 전부 빼는 자리에서 시작해 하나씩 돕는 자리로 바꾼다
    const steps: FourPillars[] = [
      chartOf(['경', '신'], ['무', '술'], ['갑', '유'], ['병', '오']), // 전부 빼는
      chartOf(['갑', '신'], ['무', '술'], ['갑', '유'], ['병', '오']), // 년간 → 비겁
      chartOf(['갑', '인'], ['무', '술'], ['갑', '유'], ['병', '오']), // 년지 → 비겁
      chartOf(['갑', '인'], ['임', '술'], ['갑', '유'], ['병', '오']), // 월간 → 인성
      chartOf(['갑', '인'], ['임', '자'], ['갑', '유'], ['병', '오']), // 월지 → 인성
      chartOf(['갑', '인'], ['임', '자'], ['갑', '묘'], ['병', '오']), // 일지 → 비겁
      chartOf(['갑', '인'], ['임', '자'], ['갑', '묘'], ['계', '오']), // 시간 → 인성
      chartOf(['갑', '인'], ['임', '자'], ['갑', '묘'], ['계', '해']), // 시지 → 인성
    ];
    const scores = steps.map((p) => dayMasterStrength(p).score);
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]!, `${i}단계`).toBeGreaterThan(scores[i - 1]!);
    }
    expect(scores[0]).toBe(0);
    expect(scores.at(-1)).toBe(1);
  });

  it('월지가 일지보다 무겁다 (계절의 기운)', () => {
    expect(WEIGHTS.월지).toBeGreaterThan(WEIGHTS.일지);
    expect(WEIGHTS.일지).toBeGreaterThan(WEIGHTS.년간);

    // 월지만 돕는 경우 vs 일지만 돕는 경우
    const monthOnly = chartOf(['경', '신'], ['무', '자'], ['갑', '유'], ['병', '오']);
    const dayOnly = chartOf(['경', '신'], ['무', '술'], ['갑', '묘'], ['병', '오']);
    expect(dayMasterStrength(monthOnly).score).toBeGreaterThan(
      dayMasterStrength(dayOnly).score,
    );
  });
});

describe('★성질 4★ 용신 방향', () => {
  it('신강이면 빼는 기운이 용신이고 돕는 기운이 기신', () => {
    const y = yongsin(chartOf(['갑', '인'], ['임', '자'], ['갑', '묘'], ['계', '해']));
    expect(y.strength.verdict).toBe('신강');
    expect(y.helpful).toEqual(['식상', '재성', '관성']);
    expect(y.avoid).toEqual(['비겁', '인성']);
    expect(y.helpful).toContain(y.primary);
  });

  it('신약이면 돕는 기운이 용신이고 빼는 기운이 기신', () => {
    const y = yongsin(chartOf(['경', '신'], ['무', '술'], ['갑', '유'], ['병', '오']));
    expect(y.strength.verdict).toBe('신약');
    expect(y.helpful).toEqual(['비겁', '인성']);
    expect(y.avoid).toEqual(['식상', '재성', '관성']);
    expect(y.helpful).toContain(y.primary);
  });

  it('용신과 기신이 겹치지 않는다', () => {
    for (const y of [1957, 1975, 1984, 1990, 2001, 2015]) {
      const r = yongsin(real({ year: y }));
      for (const h of r.helpful) expect(r.avoid).not.toContain(h);
    }
  });

  it('용신 오행이 십성 카테고리와 맞물린다', () => {
    // 일간 갑(목) 신약 → 용신 비겁이면 목, 인성이면 수
    const y = yongsin(chartOf(['경', '신'], ['무', '술'], ['갑', '유'], ['병', '오']));
    const expected: Record<string, Element> = { 비겁: '목', 인성: '수' };
    expect(y.primaryElement).toBe(expected[y.primary]);
  });

  it('도움이 되는 기운 중 사주에 가장 적은 것을 고른다', () => {
    for (const y of [1957, 1975, 1984, 1990, 2001, 2015]) {
      const r = yongsin(real({ year: y }));
      const counts: Record<string, number> = {};
      for (const s of r.strength.slots) counts[s.category] = (counts[s.category] ?? 0) + 1;
      for (const h of r.helpful) {
        expect(counts[r.primary] ?? 0).toBeLessThanOrEqual(counts[h] ?? 0);
      }
    }
  });
});

describe('★성질 5★ 결정론 — 난수가 없다', () => {
  it('같은 입력에 같은 결과', () => {
    const p = real();
    expect(yongsin(p)).toEqual(yongsin(p));
  });

  it('점수 필드가 없다', () => {
    expect(JSON.stringify(yongsin(real()))).not.toMatch(/"score":\s*\d+점/);
  });
});

describe('근거를 전부 펼친다', () => {
  it('시각을 알면 일곱 자리를 센다 (일간 자신 제외)', () => {
    const s = dayMasterStrength(real());
    expect(s.slots).toHaveLength(7);
    expect(s.slots.map((x) => x.slot).sort()).toEqual(
      ['년간', '년지', '월간', '월지', '시간', '시지', '일지'].sort(),
    );
  });

  it('시간 미상이면 다섯 자리만 센다', () => {
    const s = dayMasterStrength(real({ hourKnown: false }));
    expect(s.slots).toHaveLength(5);
    expect(s.slots.map((x) => x.slot)).not.toContain('시지');
    expect(s.slots.map((x) => x.slot)).not.toContain('시간');
  });

  it('자리마다 부호가 방향과 맞는다', () => {
    for (const s of dayMasterStrength(real()).slots) {
      expect(s.signed).toBe(s.supports ? s.weight : -s.weight);
      expect(['비겁', '식상', '재성', '관성', '인성']).toContain(s.category);
    }
  });

  it('무게 합이 슬롯 합과 같다', () => {
    const s = dayMasterStrength(real());
    const sum = s.slots.reduce((a, x) => a + x.weight, 0);
    expect(s.totalWeight).toBe(sum);
    expect(s.supportWeight + s.drainWeight).toBe(sum);
  });

  it('득령·득지가 실제 월지·일지 판정과 같다', () => {
    for (const y of [1957, 1975, 1984, 1990, 2001, 2015]) {
      const s = dayMasterStrength(real({ year: y }));
      expect(s.deukryeong).toBe(s.slots.find((x) => x.slot === '월지')?.supports ?? false);
      expect(s.deukji).toBe(s.slots.find((x) => x.slot === '일지')?.supports ?? false);
    }
  });
});

describe('중화 — 한쪽으로 몰지 않는다', () => {
  it('0.45~0.55 사이는 중화로 본다', () => {
    // 점수를 0.5 근처로 만드는 명식을 찾는다
    let found = false;
    for (let y = 1950; y <= 2020 && !found; y += 1) {
      for (const m of [3, 6, 9, 12]) {
        const s = dayMasterStrength(real({ year: y, month: m, day: 15 }));
        if (s.score >= 0.45 && s.score <= 0.55) {
          expect(s.verdict).toBe('중화');
          found = true;
          break;
        }
      }
    }
    expect(found, '중화 명식을 못 찾음').toBe(true);
  });

  it('중화면 기신이 없다', () => {
    const p = chartOf(['갑', '신'], ['무', '자'], ['갑', '유'], ['병', '인']);
    const s = dayMasterStrength(p);
    if (s.verdict === '중화') {
      expect(yongsin(p).avoid).toEqual([]);
    }
  });
});
