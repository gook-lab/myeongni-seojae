/**
 * daeun 단위 테스트 — 주인공 기능
 *
 * 이 파일이 지키는 핵심 계약:
 *   대운 타임라인은 시주를 참조하지 않는다.
 *   관객(부모님 세대)이 태어난 시각을 몰라도 주인공 화면은 온전하다.
 */

import { describe, expect, it } from 'vitest';
import { DAEUN_COUNT, buildTimeline, tenGodOf } from '../src/core/daeun';
import { normalize, resolveSolarYmd } from '../src/core/input';
import { toSolarTime } from '../src/core/korea-time';
import { computeChart } from '../src/core/manse';
import type { DaeunTimeline, RawFormValues } from '../src/core/types';

/** 테스트를 시간에 의존하지 않게 오늘을 고정한다 */
const TODAY = new Date(Date.UTC(2026, 7, 21));

const timeline = (raw: Partial<RawFormValues>): DaeunTimeline => {
  const n = normalize({
    calendar: 'solar', gender: '남', hourKnown: true, hour: 9, minute: 30,
    year: 1990, month: 5, day: 5, ...raw,
  } as RawFormValues);
  if (!n.ok) throw new Error(`normalize: ${n.error.code}`);
  const s = resolveSolarYmd(n.value);
  if (!s.ok) throw new Error(`resolve: ${s.error.code}`);
  const t = toSolarTime(n.value, { solarYmd: s.value });
  if (!t.ok) throw new Error(`solarTime: ${t.error.code}`);
  const c = computeChart(n.value, t.value);
  if (!c.ok) throw new Error(`chart: ${c.error.code}`);
  const d = buildTimeline(n.value, t.value, c.value.dayMaster, { today: TODAY });
  if (!d.ok) throw new Error(`daeun: ${d.error.code}`);
  return d.value;
};

describe('tenGodOf — 일간 기준 십성', () => {
  // 천간 인덱스: 0갑 1을 2병 3정 4무 5기 6경 7신 8임 9계
  it.each([
    [4, 4, '비견'], // 무 vs 무 — 같은 오행 같은 극성
    [4, 5, '겁재'], // 무 vs 기 — 같은 오행 다른 극성
    [4, 6, '식신'], // 무(토) vs 경(금) — 토생금, 같은 극성
    [4, 7, '상관'], // 무(토) vs 신(금) — 토생금, 다른 극성
    [4, 8, '편재'], // 무(토) vs 임(수) — 토극수, 같은 극성
    [4, 9, '정재'], // 무(토) vs 계(수) — 토극수, 다른 극성
    [4, 0, '편관'], // 무(토) vs 갑(목) — 목극토, 같은 극성
    [4, 1, '정관'], // 무(토) vs 을(목) — 목극토, 다른 극성
    [4, 2, '편인'], // 무(토) vs 병(화) — 화생토, 같은 극성
    [4, 3, '정인'], // 무(토) vs 정(화) — 화생토, 다른 극성
  ])('일간[%i] vs 천간[%i] → %s', (day, other, expected) => {
    expect(tenGodOf(day, other)).toBe(expected);
  });

  it('열 가지 십성을 모두 만들어낼 수 있다', () => {
    const all = new Set<string>();
    for (let d = 0; d < 10; d += 1) {
      for (let o = 0; o < 10; o += 1) all.add(tenGodOf(d, o));
    }
    expect(all.size).toBe(10);
  });
});

describe('★계약★ 대운은 시주를 참조하지 않는다 (A4)', () => {
  const base = { year: 1990, month: 5, day: 5, gender: '남' as const };

  it('시간 미상과 시각 입력이 완전히 같은 타임라인을 만든다', () => {
    const unknown = timeline({ ...base, hourKnown: false });
    const known = timeline({ ...base, hourKnown: true, hour: 9, minute: 30 });
    expect(unknown).toEqual(known);
  });

  it('어떤 시각을 넣어도 타임라인이 흔들리지 않는다', () => {
    const reference = timeline({ ...base, hourKnown: false });
    for (const hour of [0, 6, 12, 18, 23]) {
      const c = timeline({ ...base, hourKnown: true, hour, minute: 0 });
      expect(c.entries.map((e) => e.pillar.stemHanja + e.pillar.branchHanja)).toEqual(
        reference.entries.map((e) => e.pillar.stemHanja + e.pillar.branchHanja),
      );
      expect(c.startAge).toBe(reference.startAge);
      expect(c.direction).toBe(reference.direction);
    }
  });
});

describe('순행 / 역행', () => {
  it('음간 남자는 역행한다 (1957 년간 丁)', () => {
    expect(timeline({ year: 1957, month: 6, day: 15, gender: '남' }).direction).toBe('backward');
  });

  it('음간 여자는 순행한다', () => {
    expect(timeline({ year: 1957, month: 6, day: 15, gender: '여' }).direction).toBe('forward');
  });

  it('양간 남자는 순행한다 (1990 년간 庚)', () => {
    expect(timeline({ year: 1990, month: 5, day: 5, gender: '남' }).direction).toBe('forward');
  });

  it('성별이 다르면 대운 간지가 반대 방향으로 흐른다', () => {
    const male = timeline({ year: 1957, month: 6, day: 15, gender: '남' });
    const female = timeline({ year: 1957, month: 6, day: 15, gender: '여' });
    expect(male.entries[0]?.pillar.stemHanja).not.toBe(female.entries[0]?.pillar.stemHanja);
  });
});

describe('타임라인 구조', () => {
  const tl = timeline({ year: 1957, month: 6, day: 15, gender: '남' });

  it(`대운을 ${DAEUN_COUNT}개 만든다`, () => {
    expect(tl.entries).toHaveLength(DAEUN_COUNT);
  });

  it('간지가 비어 있는 선행 구간을 걸러낸다', () => {
    for (const e of tl.entries) {
      expect(e.pillar.stemHanja).toMatch(/^[甲乙丙丁戊己庚辛壬癸]$/);
      expect(e.pillar.branchHanja).toMatch(/^[子丑寅卯辰巳午未申酉戌亥]$/);
    }
  });

  it('나이가 10년 간격으로 오름차순이다', () => {
    for (let i = 1; i < tl.entries.length; i += 1) {
      const prev = tl.entries[i - 1];
      const cur = tl.entries[i];
      expect(cur?.startAge).toBe((prev?.startAge ?? 0) + 10);
      expect(cur?.startYear).toBe((prev?.startYear ?? 0) + 10);
    }
  });

  it('index 가 0부터 연속이다', () => {
    expect(tl.entries.map((e) => e.index)).toEqual([...Array(DAEUN_COUNT).keys()]);
  });

  it('현재 대운은 정확히 하나다', () => {
    expect(tl.entries.filter((e) => e.isCurrent)).toHaveLength(1);
  });

  it('현재 대운이 오늘 연도를 품는다', () => {
    const current = tl.entries.find((e) => e.isCurrent);
    expect(current).toBeDefined();
    expect(current!.startYear).toBeLessThanOrEqual(2026);
    expect(current!.endYear).toBeGreaterThanOrEqual(2026);
  });

  it('다음 전환까지 개월수가 0~120 범위다', () => {
    expect(tl.monthsToNextTransition).not.toBeNull();
    expect(tl.monthsToNextTransition!).toBeGreaterThanOrEqual(0);
    expect(tl.monthsToNextTransition!).toBeLessThanOrEqual(120);
  });

  it('startAge 는 첫 대운의 나이와 같다', () => {
    expect(tl.startAge).toBe(tl.entries[0]?.startAge);
  });

  it('모든 십성에 카테고리가 붙는다', () => {
    const cats = new Set(tl.entries.map((e) => e.category));
    for (const c of cats) {
      expect(['비겁', '식상', '재성', '관성', '인성']).toContain(c);
    }
  });
});

describe('대운수', () => {
  it('절입 직전 출생은 대운수가 작다 (1990-05-05, 입하 직전)', () => {
    const tl = timeline({ year: 1990, month: 5, day: 5, gender: '남' });
    expect(tl.startAge).toBe(1);
    // 순행이면 월주(庚辰) 다음 간지가 첫 대운
    expect(tl.entries[0]?.pillar.stemHanja + tl.entries[0]?.pillar.branchHanja).toBe('辛巳');
  });

  it('역행이면 월주 이전 간지가 첫 대운이다 (1957-06-15 월주 丙午)', () => {
    const tl = timeline({ year: 1957, month: 6, day: 15, gender: '남' });
    expect(tl.entries[0]?.pillar.stemHanja + tl.entries[0]?.pillar.branchHanja).toBe('乙巳');
  });
});

describe('시대별 케이스도 타임라인이 나온다', () => {
  it.each([
    [1910, 6, 15],
    [1930, 5, 5],
    [1957, 12, 15],
    [1988, 8, 15],
    [2026, 3, 10],
  ])('%i-%i-%i', (year, month, day) => {
    const tl = timeline({ year, month, day, hourKnown: false });
    expect(tl.entries).toHaveLength(DAEUN_COUNT);
    expect(tl.startAge).toBeGreaterThanOrEqual(0);
  });
});
