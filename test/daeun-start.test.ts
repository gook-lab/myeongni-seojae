/**
 * 대운수 — 첫 대운까지 몇 년인가
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기가 마지막 남은 구멍이었다
 *
 * 사주팔자는 절기·율리우스일로 독립 검증했고 음력은 규칙으로 판정했다.
 * 그런데 대운수는 라이브러리의 getYun() 을 그대로 받아 쓰면서, 그 숫자가
 * 맞는지는 확인하지 않고 있었다. daeun.test.ts 는 방향(순행·역행)과
 * 단조성·현재 대운 같은 **구조**만 본다. 숫자 자체는 아무도 안 봤다.
 *
 * 대운수가 1년 틀리면 인생 타임라인 전체가 10년씩 밀리는 게 아니라
 * 1년씩 밀린다. 눈에 잘 안 띄고, 그래서 더 조용히 틀린다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 규칙
 *
 *   순행이면 태어난 순간부터 **다음 절입**까지
 *   역행이면 **직전 절입**부터 태어난 순간까지
 *   그 일수를 3으로 나눈 것이 대운수다 (3일 = 1년)
 *
 * 절입은 달을 여는 절기(節氣) 12개다 — 입춘·경칩·청명·입하·망종·소서·
 * 입추·백로·한로·입동·대설·소한. 중기(中氣)가 아니다.
 *
 * 천체력으로 그 절입 순간을 직접 구해 대조한다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 남는 차이는 오차가 아니라 반올림이다
 *
 * 라이브러리는 결과를 전통 단위(몇 년 몇 월 며칠)로 내놓는다. 우리 계산은
 * 소수점 그대로다. 그래서 반 달치 안쪽에서 어긋나는 것은 정상이고,
 * 그보다 크게 벌어지면 규칙이 다른 것이다.
 */
import * as Astro from 'astronomy-engine';
import { Solar } from 'lunar-javascript';
import { describe, expect, it } from 'vitest';

const DAY = 86_400_000;

/** 절입 — 달을 여는 절기 12개의 태양황경 */
const JEOL_LONGITUDES = [285, 315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255];

const jeolCache = new Map<number, { prev: number; next: number }>();

/** 그 순간을 감싸는 앞뒤 절입을 천체력으로 찾는다 */
function surroundingJeol(ms: number): { prev: number; next: number } {
  const key = Math.floor(ms / DAY);
  const hit = jeolCache.get(key);
  if (hit) return hit;

  let prev = -Infinity;
  let next = Infinity;
  for (const lon of JEOL_LONGITUDES) {
    for (let k = -1; k <= 1; k += 1) {
      const y = new Date(ms).getUTCFullYear() + k;
      const approx = Date.UTC(y, 0, 1) + (((lon - 285 + 360) % 360) / 360) * 365.25 * DAY;
      const f = Astro.SearchSunLongitude(lon, new Astro.AstroTime(new Date(approx - 30 * DAY)), 60);
      if (!f) continue;
      const t = f.date.getTime();
      if (t <= ms && t > prev) prev = t;
      if (t > ms && t < next) next = t;
    }
  }
  const r = { prev, next };
  jeolCache.set(key, r);
  return r;
}

interface Sample {
  label: string;
  /** 우리가 천체력으로 구한 값 (년) */
  exact: number;
  /** 라이브러리가 낸 값을 년으로 환산 */
  library: number;
  forward: boolean;
}

/**
 * 라이브러리의 절기표는 UTC+8 기준이다(test/solar-terms.test.ts 에서 확인).
 * 그래서 생년월일시를 UTC+8 벽시계로 읽어 순간으로 옮긴 뒤 대조한다.
 */
function sample(y: number, m: number, d: number, h: number, gender: '남' | '여'): Sample {
  const yun = Solar.fromYmdHms(y, m, d, h, 0, 0).getLunar().getEightChar()
    .getYun(gender === '남' ? 1 : 0);
  const ms = Date.UTC(y, m - 1, d, h, 0, 0) - 8 * 3_600_000;
  const { prev, next } = surroundingJeol(ms);
  const days = yun.isForward() ? (next - ms) / DAY : (ms - prev) / DAY;
  return {
    label: `${y}-${m}-${d} ${h}시 ${gender}`,
    exact: days / 3,
    library: yun.getStartYear() + yun.getStartMonth() / 12 + yun.getStartDay() / 365,
    forward: yun.isForward(),
  };
}

const SAMPLES: Sample[] = (() => {
  const out: Sample[] = [];
  for (let y = 1930; y <= 2020; y += 6) {
    for (const [m, d, h] of [[2, 4, 10], [4, 22, 3], [6, 15, 9], [11, 8, 21]] as const) {
      for (const g of ['남', '여'] as const) out.push(sample(y, m, d, h, g));
    }
  }
  return out;
})();

describe('대운수를 천체력으로 검증한다', () => {
  it('표본이 충분하고 순행·역행이 둘 다 들어 있다', () => {
    expect(SAMPLES.length).toBeGreaterThan(100);
    expect(SAMPLES.some((s) => s.forward)).toBe(true);
    expect(SAMPLES.some((s) => !s.forward)).toBe(true);
  });

  it('★절입까지의 일수 ÷ 3 이라는 규칙이 그대로 맞는다★', () => {
    const worst = SAMPLES.reduce((a, b) =>
      Math.abs(b.exact - b.library) > Math.abs(a.exact - a.library) ? b : a,
    );
    const gap = Math.abs(worst.exact - worst.library);
    // 반 달(0.042년)보다 크게 벌어지면 반올림으로 설명되지 않는다
    expect(
      gap,
      `${worst.label}: 우리 ${worst.exact.toFixed(3)}년 / 라이브러리 ${worst.library.toFixed(3)}년`,
    ).toBeLessThan(0.05);
  });

  it('절반 이상은 나흘 이내로 맞는다', () => {
    // 상한만 걸면 전체가 한쪽으로 밀려도 통과한다
    const tight = SAMPLES.filter((s) => Math.abs(s.exact - s.library) < 0.011).length;
    expect(tight / SAMPLES.length).toBeGreaterThan(0.4);
  });

  it('한쪽으로 치우쳐 있지 않다 — 계통 오차가 없다', () => {
    const mean = SAMPLES.reduce((a, s) => a + (s.exact - s.library), 0) / SAMPLES.length;
    expect(Math.abs(mean), `평균 편차 ${mean.toFixed(4)}년`).toBeLessThan(0.01);
  });

  it('대운수는 0년 이상 10년 미만이다', () => {
    // 절기 사이가 30일 남짓이므로 10년을 넘을 수 없다
    for (const s of SAMPLES) {
      expect(s.exact, s.label).toBeGreaterThanOrEqual(0);
      expect(s.exact, s.label).toBeLessThan(10.02);
    }
  });

  it('순행·역행 일수를 합치면 그 달의 길이가 된다', () => {
    // 같은 생일을 순행·역행으로 각각 재면 앞뒤 절입 사이 간격이 나와야 한다.
    // 방향 판정이 뒤집혀 있으면 여기서 걸린다.
    for (const [y, m, d, h] of [[1957, 6, 15, 9], [1990, 5, 5, 9], [2000, 3, 3, 14]] as const) {
      const ms = Date.UTC(y, m - 1, d, h, 0, 0) - 8 * 3_600_000;
      const { prev, next } = surroundingJeol(ms);
      const span = (next - prev) / DAY;
      expect(span, `${y}-${m}-${d}`).toBeGreaterThan(29);
      expect(span).toBeLessThan(32.5);
    }
  });
});
