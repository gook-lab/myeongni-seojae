/**
 * 우리가 직접 세운 네 기둥
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 관계가 뒤집혔다
 *
 * 여태 사주팔자는 lunar-javascript 가 계산했다. 해석(대운·용신·신살)만
 * 우리 알고리즘이었으니, 해석이 아무리 좋아도 뼈대는 남의 블랙박스였다.
 *
 * 이제 src/core/pillars.ts 가 직접 세운다. 근거는 지어낸 것이 아니라
 * 이미 독립 검증해둔 규칙들이다.
 *
 *   절기        천체력으로 황경 직접 계산 (solar-terms.test.ts)
 *   일주        율리우스일 + 상수 하나     (day-pillar.test.ts)
 *   월주 천간   오호둔(五虎遁)             (day-pillar.test.ts)
 *   시주 천간   오자시두법(五鼠遁)          (day-pillar.test.ts)
 *
 * 그래서 이 파일에서 lunar-javascript 는 **계산의 근거가 아니라 대조
 * 상대**다. 같은 표를 물려받은 둘이 서로 맞다고 하는 상황이 아니라,
 * 방법이 다른 둘이 맞춰보는 상황이다.
 */
import { Solar } from 'lunar-javascript';
import { describe, expect, it } from 'vitest';
import {
  BRANCH_HANJA,
  HIDDEN_STEMS,
  STEM_HANJA,
  daeunPillars,
  daeunStart,
  dayPillar,
  fromSexagenary,
  ganZhiHanja,
  hourBranch,
  hourPillar,
  jeolOf,
  monthPillar,
  ratHourStem,
  sexagenaryIndex,
  tigerMonthStem,
  voidBranches,
  yearPillar,
} from '../src/core/pillars';

/**
 * 라이브러리의 절기표는 UTC+8 벽시계다. 우리 표는 UTC 순간이다.
 * 같은 순간을 가리키도록 벽시계를 순간으로 옮겨 견준다.
 */
const instantOf = (y: number, m: number, d: number, h: number, mi = 0): number =>
  Date.UTC(y, m - 1, d, h, mi, 0) - 8 * 3_600_000;

const CLOCKS = [
  [1, 5, 3], [2, 4, 10], [3, 20, 15], [5, 5, 9],
  [6, 15, 9], [8, 7, 23], [10, 23, 17], [11, 8, 0], [12, 31, 21],
] as const;

interface Row {
  label: string;
  ours: { year: string; month: string; day: string; hour: string };
  theirs: { year: string; month: string; day: string; hour: string };
}

const ROWS: Row[] = (() => {
  const out: Row[] = [];
  for (let y = 1901; y <= 2099; y += 1) {
    for (const [m, d, h] of CLOCKS) {
      const ec = Solar.fromYmdHms(y, m, d, h, 30, 0).getLunar().getEightChar();
      const at = instantOf(y, m, d, h, 30);
      const yp = yearPillar(at);
      const mp = monthPillar(at);
      const dp = dayPillar(y, m, d);
      const hp = hourPillar(dp.stem, h);
      if (!yp || !mp) continue;
      out.push({
        label: `${y}-${m}-${d} ${h}시`,
        ours: {
          year: ganZhiHanja(yp), month: ganZhiHanja(mp),
          day: ganZhiHanja(dp), hour: ganZhiHanja(hp),
        },
        theirs: {
          year: ec.getYear(), month: ec.getMonth(),
          day: ec.getDay(), hour: ec.getTime(),
        },
      });
    }
  }
  return out;
})();

describe('★네 기둥이 독립 구현과 전부 일치한다★', () => {
  it('표본이 충분하다', () => {
    expect(ROWS.length).toBeGreaterThan(1500);
  });

  it.each(['year', 'month', 'day', 'hour'] as const)('%s주 불일치 0', (key) => {
    const bad = ROWS.filter((r) => r.ours[key] !== r.theirs[key])
      .slice(0, 5)
      .map((r) => `${r.label} 우리 ${r.ours[key]} / lib ${r.theirs[key]}`);
    expect(bad).toEqual([]);
  });

  it('절기 경계 초를 버리지 않는다', () => {
    /*
     * 처음엔 절기표를 분 단위로 반올림했다. 1977년 입추가 23:30:25 인데
     * 23:30:00 이 되면서, 23시 30분에 태어난 사람이 경계 위에 얹혀
     * 월주가 한 칸 어긋났다. 초까지 담아 그 사고를 없앴다.
     */
    const ipchu = jeolOf(1977)?.find((j) => j.name === '입추');
    expect(ipchu).toBeDefined();
    const wall = new Date((ipchu as { at: number }).at + 8 * 3_600_000);
    expect(wall.getUTCSeconds()).not.toBe(0);

    const born = instantOf(1977, 8, 7, 23, 30);
    expect(ganZhiHanja(monthPillar(born) as never)).toBe('丁未');
  });
});

describe('규칙을 표가 아니라 식으로 적었다', () => {
  it('오호둔 — 년간이 인월 천간을 정한다', () => {
    // 갑·기 → 병 / 을·경 → 무 / 병·신 → 경 / 정·임 → 임 / 무·계 → 갑
    const expected = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
    for (let s = 0; s < 10; s += 1) expect(tigerMonthStem(s)).toBe(expected[s]);
  });

  it('오자시두법 — 일간이 자시 천간을 정한다', () => {
    // 갑·기 → 갑 / 을·경 → 병 / 병·신 → 무 / 정·임 → 경 / 무·계 → 임
    const expected = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];
    for (let s = 0; s < 10; s += 1) expect(ratHourStem(s)).toBe(expected[s]);
  });

  it('자시는 23시에 시작해 두 시간씩 간다', () => {
    expect(hourBranch(23)).toBe(0);
    expect(hourBranch(0)).toBe(0);
    expect(hourBranch(1)).toBe(1);
    expect(hourBranch(12)).toBe(6); // 오시
    expect(hourBranch(22)).toBe(11); // 해시
  });

  it('60갑자 왕복', () => {
    for (let i = 0; i < 60; i += 1) expect(sexagenaryIndex(fromSexagenary(i))).toBe(i);
  });
});

describe('지장간 · 공망', () => {
  it('★지장간 12지가 독립 구현과 일치한다★', () => {
    const seen = new Map<string, string>();
    for (let y = 2000; y <= 2003; y += 1) {
      for (let m = 1; m <= 12; m += 1) {
        for (const d of [3, 8, 13, 18, 23, 28]) {
          const ec = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar();
          const b = ec.getDay()[1] as string;
          if (!seen.has(b)) seen.set(b, JSON.stringify(ec.getDayHideGan()));
        }
      }
    }
    expect(seen.size).toBe(12);
    for (let i = 0; i < 12; i += 1) {
      const ours = JSON.stringify((HIDDEN_STEMS[i] as number[]).map((s) => STEM_HANJA[s]));
      expect(ours, `${BRANCH_HANJA[i]}`).toBe(seen.get(BRANCH_HANJA[i] as string));
    }
  });

  it('★공망을 표 없이 순(旬)에서 구한다★', () => {
    let n = 0;
    for (let y = 1950; y <= 2050; y += 3) {
      for (const [m, d] of [[3, 3], [7, 17], [11, 29]] as const) {
        const ec = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar();
        const ours = voidBranches(dayPillar(y, m, d))
          .map((b) => BRANCH_HANJA[b])
          .join('');
        n += 1;
        expect(ours, `${y}-${m}-${d}`).toBe(ec.getDayXunKong());
      }
    }
    expect(n).toBeGreaterThan(90);
  });
});

describe('대운', () => {
  const CASES: Array<[number, number, number, number, '남' | '여']> = [];
  for (let y = 1920; y <= 2040; y += 3) {
    for (const [m, d, h] of [[2, 4, 10], [5, 20, 7], [8, 8, 15], [11, 28, 2]] as const) {
      for (const g of ['남', '여'] as const) CASES.push([y, m, d, h, g]);
    }
  }

  it('★순행·역행이 전부 일치한다★', () => {
    // 양남음녀 순행, 음남양녀 역행
    const bad: string[] = [];
    for (const [y, m, d, h, g] of CASES) {
      const at = instantOf(y, m, d, h);
      const ours = daeunStart(at, { year: y, month: m, day: d, hour: h, minute: 0 },
        (yearPillar(at) as { stem: number }).stem, g);
      const yun = Solar.fromYmdHms(y, m, d, h, 0, 0).getLunar().getEightChar()
        .getYun(g === '남' ? 1 : 0);
      if (ours?.forward !== yun.isForward() && bad.length < 5) {
        bad.push(`${y}-${m}-${d} ${g}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('★대운 간지 열 칸이 전부 일치한다★', () => {
    const bad: string[] = [];
    for (const [y, m, d, h, g] of CASES) {
      const at = instantOf(y, m, d, h);
      const mp = monthPillar(at);
      const ours = daeunStart(at, { year: y, month: m, day: d, hour: h, minute: 0 },
        (yearPillar(at) as { stem: number }).stem, g);
      if (!mp || !ours) continue;
      const mine = daeunPillars(mp, ours.forward, 10).map(ganZhiHanja).join(' ');
      const raw = Solar.fromYmdHms(y, m, d, h, 0, 0).getLunar().getEightChar()
        .getYun(g === '남' ? 1 : 0).getDaYun(11);
      const theirs = raw.slice(1, 11).map((x: { getGanZhi: () => string }) => x.getGanZhi()).join(' ');
      if (mine !== theirs && bad.length < 3) bad.push(`${y}-${m}-${d} ${g}\n  우리 ${mine}\n  lib  ${theirs}`);
    }
    expect(bad).toEqual([]);
  });

  it('시작 나이는 99% 일치하고, 남는 1%는 반올림 습관 차이다', () => {
    /*
     * 대운수는 절입까지의 일수 ÷ 3 이다. 그 규칙은 천체력으로 확인했다
     * (daeun-start.test.ts, 408건 최대차 0.0385년).
     *
     * 남는 차이는 규칙이 아니라 **나머지를 어떻게 끊느냐**다. 옛 계산법은
     * 나머지를 시진(두 시간)으로 끊고 한 시진을 열흘로 친다. 우리는 전체를
     * 시진으로 끊는데 라이브러리는 중간 단계마다 다르게 끊는다.
     *
     * 한 살 차이라 무시할 것은 아니지만, 어느 쪽이 옳다고 말할 근거가
     * 없는 자리다. 그래서 숨기지 않고 수치로 적어둔다.
     */
    let bad = 0;
    for (const [y, m, d, h, g] of CASES) {
      const at = instantOf(y, m, d, h);
      const ours = daeunStart(at, { year: y, month: m, day: d, hour: h, minute: 0 },
        (yearPillar(at) as { stem: number }).stem, g);
      const first = Solar.fromYmdHms(y, m, d, h, 0, 0).getLunar().getEightChar()
        .getYun(g === '남' ? 1 : 0).getDaYun(11)[1];
      const lib = first?.getStartAge();
      if (ours?.startAge !== lib) bad += 1;
    }
    expect(bad / CASES.length, `${bad}/${CASES.length} 어긋남`).toBeLessThan(0.02);
  });
});
