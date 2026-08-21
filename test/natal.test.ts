/**
 * 원국 심화 테스트 — 궁위 · 오행 균형 · 지장간 · 공망
 *
 * 원본은 여덟 자를 계산해놓고 십성 카운트 하나(dominant)로 뭉갰다.
 * 여기서는 그 여덟 자가 실제로 다 쓰이는지를 본다.
 */

import { Solar } from 'lunar-javascript';
import { describe, expect, it } from 'vitest';
import { PALACE_ORDER, elementBalance, natalDetail } from '../src/core/natal';
import { normalize, resolveSolarYmd } from '../src/core/input';
import { toSolarTime } from '../src/core/korea-time';
import { computeChart } from '../src/core/manse';
import { computeReading } from '../src/engine/index';
import type { RawFormValues } from '../src/core/types';

const TODAY = new Date(Date.UTC(2026, 7, 21));

const BASE: RawFormValues = {
  calendar: 'solar', year: 1990, month: 5, day: 5, leapMonth: false,
  hourKnown: true, hour: 9, minute: 30, gender: '남',
  yajasi: 'preserve-day', applyEquationOfTime: false,
};

const detail = (over: Partial<RawFormValues> = {}) => {
  const raw = { ...BASE, ...over };
  const n = normalize(raw);
  if (!n.ok) throw new Error(n.error.code);
  const s = resolveSolarYmd(n.value);
  if (!s.ok) throw new Error(s.error.code);
  const t = toSolarTime(n.value, { solarYmd: s.value });
  if (!t.ok) throw new Error(t.error.code);
  const c = computeChart(n.value, t.value, s.value);
  if (!c.ok) throw new Error(c.error.code);
  return {
    chart: c.value,
    natal: natalDetail(c.value.pillars, t.value, 2),
  };
};

const read = (over: Partial<RawFormValues> = {}) => {
  const r = computeReading({ ...BASE, ...over }, { today: TODAY });
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
};

describe('궁위 — 십성이 어느 자리에 있는가', () => {
  it('시각을 알면 네 자리가 모두 나온다', () => {
    const { natal } = detail();
    expect(natal.palaces.map((p) => p.palace)).toEqual([...PALACE_ORDER]);
  });

  it('시간 미상이면 시주가 빠진다', () => {
    const { natal } = detail({ hourKnown: false });
    expect(natal.palaces.map((p) => p.palace)).toEqual(['년주', '월주', '일주']);
  });

  it('일주의 천간 십성은 없다 (일간 자신이므로)', () => {
    const { natal } = detail();
    const day = natal.palaces.find((p) => p.palace === '일주');
    expect(day?.stemTenGod).toBeNull();
  });

  it('★지장간을 전부 쓴다 — 원본은 [0] 만 썼다★', () => {
    const { natal } = detail();
    // 지지마다 지장간이 1~3개다. 최소 하나는 2개 이상이어야 한다.
    const counts = natal.palaces.map((p) => p.hiddenTenGods.length);
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(2);
    for (const n of counts) expect(n).toBeGreaterThanOrEqual(1);
  });

  it('지장간 정기가 branchTenGod 과 같다', () => {
    const { natal } = detail();
    for (const p of natal.palaces) {
      expect(p.branchTenGod).toBe(p.hiddenTenGods[0] ?? null);
    }
  });

  it('궁위마다 십이운성이 붙는다', () => {
    const { natal } = detail();
    const STAGES = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];
    for (const p of natal.palaces) expect(STAGES).toContain(p.stage);
  });
});

describe('공망 — 라이브러리 값과 일치한다', () => {
  it('공망 지지가 두 개다', () => {
    const { natal } = detail();
    expect(natal.voidBranches).toHaveLength(2);
  });

  it('라이브러리 getDayXunKong 과 같은 지지를 가리킨다', () => {
    for (const year of [1957, 1975, 1990, 2005, 2020]) {
      const { natal, chart } = detail({ year });
      const f = chart.solarTime.solarFields;
      const ec = Solar.fromYmdHms(f.year, f.month, f.day, f.hour, f.minute, f.second)
        .getLunar().getEightChar();
      const hanja = ec.getDayXunKong();
      const HB = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
      const KB = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
      const expected = [...hanja].map((h) => KB[HB.indexOf(h)]).filter(Boolean);
      expect(natal.voidBranches, `${year}년`).toEqual(expected);
    }
  });

  it('공망 표시가 실제 지지와 맞물린다', () => {
    for (const year of [1957, 1975, 1990, 2005, 2020]) {
      const { natal } = detail({ year });
      for (const p of natal.palaces) {
        expect(p.isVoid).toBe(natal.voidBranches.includes(p.pillar.branch));
      }
    }
  });
});

describe('오행 균형', () => {
  it('여덟 자를 센다 (시각을 알 때)', () => {
    const { natal } = detail();
    expect(natal.balance.total).toBe(8);
    const sum = Object.values(natal.balance.counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(8);
  });

  it('시간 미상이면 여섯 자를 센다', () => {
    const { natal } = detail({ hourKnown: false });
    expect(natal.balance.total).toBe(6);
  });

  it('없는 오행을 찾아낸다', () => {
    const { natal } = detail({ year: 1990, month: 5, day: 5 });
    // 1990-05-05 09:30 은 목0 수0
    expect(natal.balance.missing).toContain('목');
    expect(natal.balance.missing).toContain('수');
    for (const e of natal.balance.missing) {
      expect(natal.balance.counts[e]).toBe(0);
    }
  });

  it('넘치는 오행(4개 이상)을 찾아낸다', () => {
    const { natal } = detail({ year: 1990, month: 5, day: 5 });
    expect(natal.balance.excessive).toContain('금');
    for (const e of natal.balance.excessive) {
      expect(natal.balance.counts[e]).toBeGreaterThanOrEqual(4);
    }
  });

  it('strongest 가 실제로 가장 많다', () => {
    for (const year of [1957, 1975, 1990, 2005, 2020]) {
      const { natal } = detail({ year });
      const b = natal.balance;
      for (const e of ['목','화','토','금','수'] as const) {
        expect(b.counts[b.strongest]).toBeGreaterThanOrEqual(b.counts[e]);
      }
    }
  });

  it('elementBalance 는 순수 함수다 — 같은 입력에 같은 결과', () => {
    const { chart } = detail();
    expect(elementBalance(chart.pillars)).toEqual(elementBalance(chart.pillars));
  });
});

describe('engine 이 궁위·균형을 문장으로 낸다', () => {
  const r = read();

  it('궁위 카드가 자리마다 문장을 갖는다', () => {
    expect(r.palaces.length).toBeGreaterThanOrEqual(3);
    for (const p of r.palaces) {
      expect(p.span).toBeTruthy();
      expect(p.domain).toBeTruthy();
      expect(p.text.length).toBeGreaterThan(20);
      expect(p.ganji).toHaveLength(2);
    }
  });

  it('공망 자리에만 공망 문장이 붙는다', () => {
    for (const p of r.palaces) {
      if (p.isVoid) expect(p.voidText).toBeTruthy();
      else expect(p.voidText).toBeNull();
    }
  });

  it('오행 균형에 리드 문장과 없는 오행 안내가 있다', () => {
    expect(r.balance.lead).toContain('여덟 자 중');
    expect(r.balance.missing).not.toBeNull();
    expect(r.balance.missing!.notes.length).toBe(r.balance.missing!.lead.split('·').length);
  });

  it('조사가 "이(가)" 같은 표기로 남지 않는다', () => {
    const all = [r.balance.lead, r.balance.missing?.lead ?? ''].join(' ');
    expect(all).not.toMatch(/이\(가\)|은\(는\)|을\(를\)/);
  });

  it('없는 오행이 하나도 없으면 missing 이 null 이다', () => {
    // 오행이 고른 명식을 찾는다
    let found = false;
    for (let y = 1950; y <= 2020 && !found; y += 1) {
      const x = read({ year: y, month: 6, day: 15 });
      if (x.balance.missing === null) {
        found = true;
        expect(x.balance.missing).toBeNull();
      }
    }
    expect(found, '오행이 고른 명식을 못 찾음').toBe(true);
  });
});

describe('오늘의 운세 심화', () => {
  const r = read();

  it('★지지 십성이 추가됐다 — 원본은 천간만 봤다★', () => {
    expect(r.daily).not.toBeNull();
    expect(r.daily!.branchTenGod).toBeTruthy();
  });

  it('십이운성이 붙는다', () => {
    const STAGES = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];
    expect(STAGES).toContain(r.daily!.stage);
    expect(r.daily!.stageText.length).toBeGreaterThan(20);
  });

  it('내 일지와의 합충 안내가 있다', () => {
    expect(r.daily!.branchNote.length).toBeGreaterThan(20);
  });

  it('여전히 점수가 없다', () => {
    expect(JSON.stringify(r.daily)).not.toMatch(/"score"|\d+점/);
  });

  it('일간이 다르면 오늘의 결과도 갈린다', () => {
    const stages = new Set<string>();
    for (const y of [1988, 1990, 1992, 1994, 1996]) {
      stages.add(read({ year: y }).daily!.stage);
    }
    expect(stages.size).toBeGreaterThan(1);
  });
});
