/**
 * ★배포 게이트★ 골든 케이스 (T1)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 이 파일이 지키는 것
 *
 * 1) 회귀 방지 — 50건의 명식을 스냅샷으로 고정한다. 계산 코드를 건드려
 *    결과가 바뀌면 여기서 먼저 걸린다. 만세력이 조용히 틀리는 걸 막는
 *    유일한 장치다.
 *
 * 2) 교차 검증 — 완전히 독립된 구현(manseryeok v2)과 대조한다.
 *    차이가 나는 자리는 전부 이유가 분류돼 있어야 한다.
 *    'unexplained' 가 하나라도 나오면 실패다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 두 구현이 갈리는 세 가지 이유 (전부 실측으로 확인됨)
 *
 *   standard-time-history  manseryeok 은 KST=UTC+9 로 고정 가정한다.
 *                          1954~61(UTC+8:30)·서머타임 구간에서 절기 비교가
 *                          어긋나 년주·월주가 갈린다. 여기선 우리가 맞다.
 *   true-solar-time        경도 보정 유무. manseryeok 은 시주에 미적용.
 *   yajasi                 23시대 시두 기준 유파 차이.
 *
 * 정답지를 갱신하려면: pnpm golden:gen
 * 갱신 시 diff 를 반드시 눈으로 확인할 것. 이 파일이 통과한다는 것은
 * "예전과 같다"는 뜻이지 "맞다"는 뜻이 아니다.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeReading } from '../src/engine/index';
import type { RawFormValues } from '../src/core/types';

interface Golden {
  today: string;
  cases: Array<{
    label: string;
    group: string;
    raw: Partial<RawFormValues>;
    ours: { year: string; month: string; day: string; hour: string | null };
    manseryeok: { year: string; month: string; day: string; hour: string } | null;
    agrees: { year: boolean; month: boolean; day: boolean; hour: boolean } | null;
    divergences: Array<{ pillar: string; reason: string; ours: string; theirs: string }>;
    lunar?: { korean: string; chinese: string; differs: boolean };
    solarTime: { standardOffsetMinutes: number; offsetMinutes: number; daylightSaving: boolean };
    daeun: { startAge: number; direction: string; first: string; ganjis: string[] };
  }>;
}

const golden = JSON.parse(readFileSync('test/golden-cases.json', 'utf8')) as Golden;
const TODAY = new Date(golden.today);

const BASE: RawFormValues = {
  calendar: 'solar', year: 1990, month: 5, day: 5, leapMonth: false,
  hourKnown: true, hour: 9, minute: 30, gender: '남',
  yajasi: 'preserve-day', applyEquationOfTime: false,
};

const recompute = (raw: Partial<RawFormValues>) => {
  const r = computeReading({ ...BASE, ...raw } as RawFormValues, { today: TODAY });
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.value;
};

const gz = (p: { stem: string; branch: string } | null) => (p ? `${p.stem}${p.branch}` : null);

describe('골든 케이스 — 데이터셋 자체', () => {
  it('54건이 있다', () => {
    expect(golden.cases).toHaveLength(54);
  });

  it('설계 문서가 요구한 분포를 채운다', () => {
    const byGroup = golden.cases.reduce<Record<string, number>>((a, c) => {
      a[c.group] = (a[c.group] ?? 0) + 1;
      return a;
    }, {});
    expect(byGroup['절기경계']).toBeGreaterThanOrEqual(10);
    expect(byGroup['1954-61']).toBeGreaterThanOrEqual(10);
    expect(byGroup['서머타임']).toBeGreaterThanOrEqual(10);
    expect(byGroup['윤달']).toBeGreaterThanOrEqual(5);
    expect(byGroup['야자시']).toBeGreaterThanOrEqual(5);
    expect(byGroup['평범']).toBeGreaterThanOrEqual(10);
    expect(byGroup['한국음력']).toBeGreaterThanOrEqual(4);
  });

  it('★한국 음력 케이스가 실제로 중국 음력과 갈린다★', () => {
    // 갈리지 않는 케이스만 모아두면 이 그룹은 아무것도 지키지 못한다.
    const korean = golden.cases.filter((c) => c.group === '한국음력');
    expect(korean.length).toBeGreaterThan(0);
    for (const c of korean) {
      expect(c.lunar, `${c.label}: 변환 기록이 없다`).toBeDefined();
      expect(c.lunar?.differs, `${c.label}: 중국 음력과 같다`).toBe(true);
    }
  });

  it('2017년 윤5월은 중국 음력에는 아예 없다', () => {
    // 하루 틀리는 것보다 나쁘다 — 예전 코드는 이 입력을 거절했다.
    const c = golden.cases.find((x) => x.label.includes('2017 윤5/10'));
    expect(c?.lunar?.korean).toBe('2017-07-03');
    expect(c?.lunar?.chinese).toBe('--');
  });

  it('★설명되지 않는 불일치가 하나도 없다★', () => {
    const unexplained = golden.cases.flatMap((c) =>
      c.divergences
        .filter((d) => d.reason === 'unexplained')
        .map((d) => `${c.label} — ${d.pillar}: 우리 ${d.ours} / manseryeok ${d.theirs}`),
    );
    expect(unexplained).toEqual([]);
  });

  it('차이의 이유가 세 종류로만 분류된다', () => {
    const reasons = new Set(golden.cases.flatMap((c) => c.divergences.map((d) => d.reason)));
    for (const r of reasons) {
      expect(['standard-time-history', 'true-solar-time', 'yajasi']).toContain(r);
    }
  });
});

describe('골든 케이스 — 회귀 방지 스냅샷', () => {
  it.each(golden.cases.map((c) => [c.label, c] as const))('%s', (_label, c) => {
    const { chart, timeline } = recompute(c.raw);
    const p = chart.pillars;

    expect(gz(p.year), '년주').toBe(c.ours.year);
    expect(gz(p.month), '월주').toBe(c.ours.month);
    expect(gz(p.day), '일주').toBe(c.ours.day);
    expect(gz(p.hour), '시주').toBe(c.ours.hour);

    expect(chart.solarTime.standardOffsetMinutes, '표준시 오프셋').toBe(
      c.solarTime.standardOffsetMinutes,
    );
    expect(Math.round(chart.solarTime.offsetMinutes * 100) / 100, '진태양시 보정').toBe(
      c.solarTime.offsetMinutes,
    );
    expect(chart.solarTime.daylightSaving, '서머타임').toBe(c.solarTime.daylightSaving);

    expect(timeline.startAge, '대운수').toBe(c.daeun.startAge);
    expect(timeline.direction, '순역').toBe(c.daeun.direction);
    expect(
      timeline.entries.map((e) => `${e.pillar.stemHanja}${e.pillar.branchHanja}`),
      '대운 간지',
    ).toEqual(c.daeun.ganjis);
  });
});

describe('★핵심★ 1954~61 표준시 이력 — 여기서 남들이 틀린다', () => {
  /**
   * 1957 입춘 = UTC 01:55:00
   * 당시 한국 표준시는 UTC+8:30 이므로 시계로는 10:25:00.
   * KST 10:30 출생은 입춘 이후 → 丁酉(당년).
   *
   * manseryeok 은 KST=UTC+9 로 가정 → UTC 01:30 → 입춘 이전 → 丙申. 오답.
   */
  const before = golden.cases.find((c) => c.label.includes('입춘 직전'));
  const after = golden.cases.find((c) => c.label.includes('입춘 직후'));

  it('입춘 5분 전후로 년주가 갈린다', () => {
    expect(before?.ours.year).toBe('병신');
    expect(after?.ours.year).toBe('정유');
  });

  it('월주도 함께 갈린다', () => {
    expect(before?.ours.month).toBe('신축');
    expect(after?.ours.month).toBe('임인');
  });

  it('그 시각의 한국 표준시가 UTC+8:30 으로 반영돼 있다', () => {
    expect(after?.solarTime.standardOffsetMinutes).toBe(510);
  });

  it('manseryeok 은 이 자리에서 전년으로 오판한다 (기록으로 남긴다)', () => {
    const d = after?.divergences.filter((x) => x.reason === 'standard-time-history') ?? [];
    expect(d.length).toBeGreaterThanOrEqual(2);
    expect(d.map((x) => x.pillar).sort()).toEqual(['month', 'year']);
    expect(d.find((x) => x.pillar === 'year')?.theirs).toBe('병신');
  });
});

describe('시대별 보정량이 골든에 박혀 있다', () => {
  const find = (label: string) => golden.cases.find((c) => c.label.includes(label));

  it.each([
    ['1990-05-05 09:30 남', 540, -32],
    ['1957-12-15', 510, -2],
    ['1957-06-15 서머타임', 570, -62],
    ['1988-08-15 서머타임', 600, -92],
    ['1910-06-15', 510, -2],
  ])('%s → 표준시 %i분 / 보정 %i분대', (label, std, corr) => {
    const c = find(label);
    expect(c, label).toBeDefined();
    expect(c!.solarTime.standardOffsetMinutes).toBe(std);
    expect(Math.trunc(c!.solarTime.offsetMinutes)).toBe(corr);
  });
});

describe('시간 미상 케이스가 골든에 포함돼 있다', () => {
  it('시주가 null 로 고정돼 있다', () => {
    const c = golden.cases.find((x) => x.label.includes('시간 미상'));
    expect(c?.ours.hour).toBeNull();
  });

  it('시각을 알 때와 대운이 같다', () => {
    const unknown = golden.cases.find((x) => x.label === '1990-05-05 시간 미상');
    const known = golden.cases.find((x) => x.label === '1990-05-05 09:30 남');
    expect(unknown?.daeun.ganjis).toEqual(known?.daeun.ganjis);
    expect(unknown?.daeun.startAge).toBe(known?.daeun.startAge);
  });
});
