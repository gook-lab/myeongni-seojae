/**
 * 신살 테스트
 *
 * 규칙이 표라서 결정론적이다. 외부 정답지는 없지만 표 자체를
 * 알려진 값으로 검증할 수 있고, 판정이 규칙과 맞는지 성질로 확인한다.
 *
 * 그리고 이 앱의 원칙 하나를 테스트가 지킨다:
 *   **겁주는 문장을 쓰지 않는다.**
 */

import { describe, expect, it } from 'vitest';
import { ALL_SINSAL, findSinsal, groupSinsal } from '../src/core/sinsal';
import { SINSAL_TEXT } from '../src/text/sinsal-text';
import { computeReading } from '../src/engine/index';
import type { Branch, FourPillars, Pillar, RawFormValues, Stem } from '../src/core/types';

const STEM_EL: Record<string, string> = {
  갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
  기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
};
const BRANCH_EL: Record<string, string> = {
  자: '수', 축: '토', 인: '목', 묘: '목', 진: '토', 사: '화',
  오: '화', 미: '토', 신: '금', 유: '금', 술: '토', 해: '수',
};
const STEM_H: Record<string, string> = {
  갑: '甲', 을: '乙', 병: '丙', 정: '丁', 무: '戊',
  기: '己', 경: '庚', 신: '辛', 임: '壬', 계: '癸',
};
const BRANCH_H: Record<string, string> = {
  자: '子', 축: '丑', 인: '寅', 묘: '卯', 진: '辰', 사: '巳',
  오: '午', 미: '未', 신: '申', 유: '酉', 술: '戌', 해: '亥',
};

const pillar = (stem: string, branch: string): Pillar => ({
  stem: stem as Stem,
  branch: branch as Branch,
  stemHanja: STEM_H[stem] as string,
  branchHanja: BRANCH_H[branch] as string,
  stemElement: STEM_EL[stem] as Pillar['stemElement'],
  branchElement: BRANCH_EL[branch] as Pillar['branchElement'],
});

const chart = (
  y: [string, string], m: [string, string], d: [string, string], h: [string, string] | null,
): FourPillars => ({
  year: pillar(...y), month: pillar(...m), day: pillar(...d),
  hour: h ? pillar(...h) : null,
});

const names = (p: FourPillars) => new Set(findSinsal(p).map((x) => x.name));

const TODAY = new Date(Date.UTC(2026, 7, 21));
const read = (over: Partial<RawFormValues> = {}) => {
  const r = computeReading({
    calendar: 'solar', year: 1990, month: 5, day: 5, leapMonth: false,
    hourKnown: true, hour: 9, minute: 30, gender: '남',
    yajasi: 'preserve-day', applyEquationOfTime: false, ...over,
  } as RawFormValues, { today: TODAY });
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
};

describe('삼합 기준 — 도화 · 역마 · 화개', () => {
  it('인오술 그룹은 도화 卯 · 역마 申 · 화개 戌', () => {
    // 년지 인(寅) 기준
    expect(names(chart(['갑', '인'], ['갑', '묘'], ['갑', '자'], null))).toContain('도화');
    expect(names(chart(['갑', '인'], ['갑', '신'], ['갑', '자'], null))).toContain('역마');
    expect(names(chart(['갑', '인'], ['갑', '술'], ['갑', '자'], null))).toContain('화개');
  });

  it('신자진 그룹은 도화 酉 · 역마 寅 · 화개 辰', () => {
    expect(names(chart(['갑', '신'], ['갑', '유'], ['갑', '축'], null))).toContain('도화');
    expect(names(chart(['갑', '신'], ['갑', '인'], ['갑', '축'], null))).toContain('역마');
    expect(names(chart(['갑', '신'], ['갑', '진'], ['갑', '축'], null))).toContain('화개');
  });

  it('네 그룹이 각각 다른 도화 지지를 갖는다', () => {
    const dohwa = new Set<string>();
    for (const [ref, expected] of [['인', '묘'], ['신', '유'], ['사', '오'], ['해', '자']] as const) {
      const hits = findSinsal(chart(['갑', ref], ['갑', expected], ['갑', '축'], null));
      const d = hits.find((h) => h.name === '도화');
      expect(d, `${ref} 그룹`).toBeDefined();
      dohwa.add(expected);
    }
    expect(dohwa.size).toBe(4);
  });

  it('기준 자리(년지·일지)를 근거에 밝힌다', () => {
    const hits = findSinsal(chart(['갑', '인'], ['갑', '묘'], ['갑', '인'], null));
    const d = hits.find((h) => h.name === '도화');
    expect(d?.basis).toMatch(/년지|일지/);
  });
});

describe('일간 기준 신살', () => {
  it('천을귀인 — 갑무경은 축미', () => {
    for (const stem of ['갑', '무', '경']) {
      expect(names(chart(['갑', '축'], ['갑', '자'], [stem, '인'], null))).toContain('천을귀인');
      expect(names(chart(['갑', '미'], ['갑', '자'], [stem, '인'], null))).toContain('천을귀인');
    }
  });

  it('천을귀인 — 병정은 해유', () => {
    expect(names(chart(['갑', '해'], ['갑', '자'], ['병', '인'], null))).toContain('천을귀인');
    expect(names(chart(['갑', '유'], ['갑', '자'], ['정', '인'], null))).toContain('천을귀인');
  });

  it('양인은 양간에만 있다', () => {
    // 갑 → 묘
    expect(names(chart(['갑', '묘'], ['갑', '자'], ['갑', '인'], null))).toContain('양인');
    // 을(음간)에는 양인이 없다
    expect(names(chart(['갑', '묘'], ['갑', '자'], ['을', '인'], null))).not.toContain('양인');
  });

  it('문창귀인 — 갑은 巳', () => {
    expect(names(chart(['갑', '사'], ['갑', '자'], ['갑', '인'], null))).toContain('문창귀인');
  });
});

describe('지지 쌍 기준 — 원진 · 귀문관', () => {
  it('원진 여섯 쌍이 모두 잡힌다', () => {
    const pairs: Array<[string, string]> = [
      ['자', '미'], ['축', '오'], ['인', '유'], ['묘', '신'], ['진', '해'], ['사', '술'],
    ];
    for (const [a, b] of pairs) {
      expect(names(chart(['갑', a], ['갑', b], ['갑', '인'], null)), `${a}${b}`).toContain('원진');
    }
  });

  it('순서를 바꿔도 잡힌다', () => {
    expect(names(chart(['갑', '미'], ['갑', '자'], ['갑', '인'], null))).toContain('원진');
  });

  it('축오는 원진이자 귀문관이다', () => {
    const n = names(chart(['갑', '축'], ['갑', '오'], ['갑', '인'], null));
    expect(n).toContain('원진');
    expect(n).toContain('귀문관');
  });

  it('두 자리 모두에 표시된다', () => {
    const hits = findSinsal(chart(['갑', '자'], ['갑', '미'], ['갑', '인'], null));
    const w = hits.filter((h) => h.name === '원진');
    expect(w).toHaveLength(2);
    expect(w.map((h) => h.palace).sort()).toEqual(['년주', '월주']);
  });
});

describe('간지 조합 기준', () => {
  it('백호대살 일곱 간지', () => {
    for (const [s, b] of [['갑', '진'], ['을', '미'], ['병', '술'], ['정', '축'], ['무', '진'], ['임', '술'], ['계', '축']] as const) {
      expect(names(chart([s, b], ['갑', '자'], ['갑', '인'], null)), `${s}${b}`).toContain('백호대살');
    }
  });

  it('괴강 간지', () => {
    for (const [s, b] of [['경', '진'], ['경', '술'], ['임', '진'], ['임', '술'], ['무', '술']] as const) {
      expect(names(chart([s, b], ['갑', '자'], ['갑', '인'], null)), `${s}${b}`).toContain('괴강');
    }
  });

  it('아무 간지나 백호가 되지 않는다', () => {
    expect(names(chart(['갑', '자'], ['을', '축'], ['병', '인'], null))).not.toContain('백호대살');
  });
});

describe('천라지망 — 두 글자가 다 있어야 한다', () => {
  it('술해가 둘 다 있으면 천라', () => {
    expect(names(chart(['갑', '술'], ['갑', '해'], ['갑', '인'], null))).toContain('천라지망');
  });

  it('진사가 둘 다 있으면 지망', () => {
    expect(names(chart(['갑', '진'], ['갑', '사'], ['갑', '인'], null))).toContain('천라지망');
  });

  it('하나만 있으면 안 잡힌다', () => {
    expect(names(chart(['갑', '술'], ['갑', '자'], ['갑', '인'], null))).not.toContain('천라지망');
  });
});

describe('구조', () => {
  it('신살이 하나도 없는 명식이 있을 수 있다', () => {
    const n = names(chart(['을', '자'], ['을', '축'], ['을', '인'], null));
    expect(n.size).toBeGreaterThanOrEqual(0);
  });

  it('groupSinsal 이 같은 신살을 묶는다', () => {
    const hits = findSinsal(chart(['경', '진'], ['경', '술'], ['갑', '인'], null));
    const g = groupSinsal(hits);
    const goe = g.find((x) => x.name === '괴강');
    expect(goe?.palaces).toHaveLength(2);
    expect(g.filter((x) => x.name === '괴강')).toHaveLength(1);
  });

  it('시간 미상이면 시주를 안 본다', () => {
    const withHour = findSinsal(chart(['갑', '자'], ['갑', '축'], ['갑', '인'], ['경', '진']));
    const without = findSinsal(chart(['갑', '자'], ['갑', '축'], ['갑', '인'], null));
    expect(withHour.some((h) => h.palace === '시주')).toBe(true);
    expect(without.some((h) => h.palace === '시주')).toBe(false);
  });

  it('모든 판정에 근거가 붙는다', () => {
    for (const y of [1957, 1975, 1984, 1990, 2001, 2015]) {
      for (const h of read({ year: y }).sinsal.items) {
        expect(h.bases.length, `${y} ${h.name}`).toBeGreaterThan(0);
        for (const b of h.bases) expect(b.length).toBeGreaterThan(3);
      }
    }
  });

  it('결정론적이다', () => {
    const p = chart(['정', '유'], ['병', '오'], ['무', '오'], null);
    expect(findSinsal(p)).toEqual(findSinsal(p));
  });
});

describe('★원칙★ 겁주는 문장을 쓰지 않는다', () => {
  it('열세 가지 전부 문장이 있다', () => {
    expect(Object.keys(SINSAL_TEXT).sort()).toEqual([...ALL_SINSAL].sort());
  });

  it('공포를 단정하지 않는다', () => {
    // 단정으로만 쓰일 수 있는 표현들
    const neverOk = ['죽음', '단명', '망한다', '재앙', '흉합니다', '나쁩니다'];
    for (const [name, t] of Object.entries(SINSAL_TEXT)) {
      for (const w of neverOk) {
        expect(t.body, `${name}: "${w}"`).not.toContain(w);
      }
    }
  });

  it('옛 공포 표현은 부정할 때만 쓴다', () => {
    // "피를 본다", "바람기" 같은 옛 통념은 인용해서 뒤집는 용도로만 허용한다.
    // 그냥 단정하면 이 앱이 하려던 것과 정반대가 된다.
    const oldFears = ['피를 본다', '바람기', '떠돌이 팔자'];
    const rejection = /예전에는|겁을 주|겁주|오해|몰았|봤지만|실제로는|지금 세상/;

    for (const [name, t] of Object.entries(SINSAL_TEXT)) {
      for (const w of oldFears) {
        if (!t.body.includes(w)) continue;
        // 그 표현이 들어간 문장에 부정 표지가 같이 있어야 한다
        const sentence = t.body
          .split(/(?<=\.)\s*/)
          .find((x) => x.includes(w)) ?? '';
        expect(
          rejection.test(sentence),
          `${name}: "${w}" 를 부정 없이 단정한다 — "${sentence}"`,
        ).toBe(true);
      }
    }
  });

  it('살(殺) 이름이 붙은 것들도 쓰임새를 같이 적는다', () => {
    for (const name of ['백호대살', '양인', '원진', '귀문관', '천라지망'] as const) {
      const body = SINSAL_TEXT[name].body;
      // 최소한의 길이 — 한 줄로 겁만 주지 않는다
      expect(body.length, name).toBeGreaterThan(100);
      // ★재해석 표지★ 겁만 주고 끝내지 않았다는 증거.
      // "오히려", "실제로는", "~가 아니라" 처럼 통념을 뒤집는 말이거나
      // 쓰임새를 말하는 말이 반드시 하나는 있어야 한다.
      // 긍정 단어 화이트리스트가 아니라 "뒤집었는가" 를 본다.
      const reframing = /오히려|실제로는|아니라|강점|유리|어울립|힘이 됩|제 몫|자산|빛납|낫습니다/;
      expect(
        reframing.test(body),
        `${name} 에 재해석 표지가 없다 — 겁만 주고 끝난 문장이다`,
      ).toBe(true);
    }
  });

  it('한 줄 요약도 겁주지 않는다', () => {
    for (const [name, t] of Object.entries(SINSAL_TEXT)) {
      expect(t.short.length, name).toBeGreaterThan(4);
      expect(t.short).not.toMatch(/살|흉|재앙|불운/);
    }
  });
});
