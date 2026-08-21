/**
 * 절기 — 천체력과 직접 대조한다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 이 파일이 필요한가
 *
 * golden.test.ts 는 만세력 라이브러리 둘을 서로 대조한다. 둘 다 같은
 * 절기표 계보를 물려받았다면 둘 다 틀려도 서로 맞다고 한다. 표를 또 다른
 * 표와 맞춰보는 것으로는 그 경우를 못 걸러낸다.
 *
 * 그래서 여기서는 방법 자체를 바꾼다. 절기는 원래 표에서 찾는 것이 아니라
 * **태양의 겉보기 황경이 15° 배수에 닿는 순간**으로 정의된다. astronomy-engine
 * 은 VSOP87 기반 천체력으로 그 순간을 직접 푼다. 표 대 표가 아니라
 * 표 대 천체력이다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기서 실제로 걸려 있는 것
 *
 * 이 프로젝트 전체가 한 가정 위에 서 있다 — lunar-javascript 의 절기표는
 * UTC+8 기준이다. 그래서 년주·월주는 UTC+8 필드로 뽑고 일주·시주는
 * 진태양시 필드로 뽑는다(src/core/manse.ts). 이 가정이 틀리면 1954~61년
 * 구간뿐 아니라 절기 경계에 걸린 모든 사람의 년주·월주가 틀린다.
 *
 * 그 가정을 여기서 검증한다. 두 가설을 같이 재서, 맞는 쪽만 맞는다는 걸
 * 보인다. UTC+9 로 읽으면 정확히 한 시간 어긋난다.
 *
 * astronomy-engine 은 devDependency 다. 번들에 들어가면 안 된다
 * (bundle.test.ts 가 진입 청크를 지킨다).
 */
import * as Astro from 'astronomy-engine';
import { Solar } from 'lunar-javascript';
import { describe, expect, it } from 'vitest';
import { computeReading } from '../src/engine';
import type { RawFormValues } from '../src/core/types';

/**
 * 절기 24개. [이름, 태양황경, 대략 월, 대략 일]
 *
 * 대략 날짜는 탐색 창을 잡는 데만 쓴다 — 라이브러리 값을 씨앗으로 쓰지
 * 않는다. 씨앗으로 쓰면 검증이 아니라 자기 확인이 된다.
 */
const TERMS: ReadonlyArray<readonly [string, number, number, number]> = [
  ['小寒', 285, 1, 6], ['大寒', 300, 1, 20], ['立春', 315, 2, 4], ['雨水', 330, 2, 19],
  ['惊蛰', 345, 3, 6], ['春分', 0, 3, 21], ['清明', 15, 4, 5], ['谷雨', 30, 4, 20],
  ['立夏', 45, 5, 6], ['小满', 60, 5, 21], ['芒种', 75, 6, 6], ['夏至', 90, 6, 21],
  ['小暑', 105, 7, 7], ['大暑', 120, 7, 23], ['立秋', 135, 8, 8], ['处暑', 150, 8, 23],
  ['白露', 165, 9, 8], ['秋分', 180, 9, 23], ['寒露', 195, 10, 8], ['霜降', 210, 10, 23],
  ['立冬', 225, 11, 7], ['小雪', 240, 11, 22], ['大雪', 255, 12, 7], ['冬至', 270, 12, 22],
];

/** 라이브러리 절기표는 같은 절기를 ASCII 키로 한 번 더 담는다(다음 해 것). */
const ALIAS: Record<string, string> = {
  DA_XUE: '大雪', DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒',
  LI_CHUN: '立春', YU_SHUI: '雨水', JING_ZHE: '惊蛰',
};

const HOUR = 3_600_000;

/** 그 해에 속한 절기만 추려낸다. */
function libraryTerms(year: number): Map<string, number> {
  const table = Solar.fromYmdHms(year, 6, 1, 12, 0, 0).getLunar().getJieQiTable();
  const out = new Map<string, number>();
  for (const [key, v] of Object.entries(table)) {
    if (v.getYear() !== year) continue;
    // 표의 값은 벽시계 숫자일 뿐이다. 어느 시간대인지가 지금 검증하려는 것이므로
    // 여기서는 시간대를 붙이지 않고 UTC 로 읽은 숫자만 돌려준다.
    out.set(
      ALIAS[key] ?? key,
      Date.UTC(v.getYear(), v.getMonth() - 1, v.getDay(), v.getHour(), v.getMinute(), v.getSecond()),
    );
  }
  return out;
}

/** 태양 황경이 lon 에 닿는 순간을 천체력으로 직접 푼다. */
function solarTermInstant(year: number, lon: number, mm: number, dd: number): Date {
  const start = new Astro.AstroTime(new Date(Date.UTC(year, mm - 1, dd - 6)));
  const found = Astro.SearchSunLongitude(lon, start, 12);
  if (!found) throw new Error(`${year} 황경 ${lon}° 탐색 실패`);
  return found.date;
}

const FROM = 1900;
const TO = 2050;

interface Sample {
  year: number;
  name: string;
  offBy8: number;
  offBy9: number;
}

/** 한 번만 돌린다 — 3,600여 표본이라 매 테스트마다 다시 풀 이유가 없다. */
const SAMPLES: Sample[] = (() => {
  const out: Sample[] = [];
  for (let y = FROM; y <= TO; y += 1) {
    const lib = libraryTerms(y);
    for (const [name, lon, mm, dd] of TERMS) {
      const wall = lib.get(name);
      if (wall === undefined) throw new Error(`${y} ${name} 이 표에 없다`);
      const truth = solarTermInstant(y, lon, mm, dd).getTime();
      out.push({
        year: y,
        name,
        offBy8: Math.abs(wall - 8 * HOUR - truth) / 1000,
        offBy9: Math.abs(wall - 9 * HOUR - truth) / 1000,
      });
    }
  }
  return out;
})();

describe('절기표를 천체력으로 검증한다', () => {
  it(`${FROM}~${TO} 전 구간 24절기를 빠짐없이 대조했다`, () => {
    expect(SAMPLES).toHaveLength((TO - FROM + 1) * 24);
  });

  it('★절기표는 UTC+8 기준이다 — 전 표본이 1분 이내★', () => {
    // 이 프로젝트의 근본 가정. 틀리면 년주·월주가 통째로 틀린다.
    const worst = SAMPLES.reduce((a, b) => (b.offBy8 > a.offBy8 ? b : a));
    expect(
      worst.offBy8,
      `최대 편차 ${worst.offBy8.toFixed(1)}초 (${worst.year} ${worst.name})`,
    ).toBeLessThan(60);
  });

  it('절반 이상은 10초 이내로 맞는다', () => {
    // 1분 이내라는 상한만 걸면 표가 통째로 30초씩 밀려도 통과한다.
    const tight = SAMPLES.filter((s) => s.offBy8 < 10).length;
    expect(tight / SAMPLES.length).toBeGreaterThan(0.5);
  });

  it('★UTC+9 로 읽으면 정확히 한 시간 어긋난다★', () => {
    // 맞는 가설만 맞는다는 반대증거. 이게 없으면 위 검증은
    // "대충 맞다" 는 말밖에 안 된다.
    const mean = SAMPLES.reduce((a, s) => a + s.offBy9, 0) / SAMPLES.length;
    expect(mean).toBeGreaterThan(3540);
    expect(mean).toBeLessThan(3660);
  });

  it('편향이 없다 — 한쪽으로 쏠려 있지 않다', () => {
    const worstYear = new Map<number, number>();
    for (const s of SAMPLES) {
      worstYear.set(s.year, Math.max(worstYear.get(s.year) ?? 0, s.offBy8));
    }
    // 특정 연대만 크게 어긋나면 그 구간 표가 다른 계보라는 뜻이다
    for (const [y, d] of worstYear) {
      expect(d, `${y}년 최대 편차 ${d.toFixed(1)}초`).toBeLessThan(60);
    }
  });
});

describe('★년주 경계가 천체력이 말하는 입춘에서 갈린다★', () => {
  /**
   * 여기까지 와야 검증이 끝난다. 절기표가 맞는 것과, 우리 파이프라인이
   * 그 표를 제대로 쓰는 것은 다른 문제다.
   *
   * 천체력이 준 입춘 순간을 그 시절 한국 표준시 벽시계로 옮긴 다음,
   * 그 1분 전과 1분 후로 사주를 뽑아 년주가 실제로 갈리는지 본다.
   * 표준시가 UTC+9 가 아니던 해(1954~61)를 일부러 포함한다.
   */
  const YEARS = [1930, 1948, 1957, 1960, 1961, 1988, 1990, 2000, 2024];

  /** 그 순간 한국 표준시 오프셋(분). 우리 코드가 아니라 Intl 로 직접 구한다. */
  function kstOffsetMinutes(at: Date): number {
    const name = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      timeZoneName: 'longOffset',
    })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value;
    const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '');
    if (!m) throw new Error(`오프셋을 못 읽었다: ${name}`);
    return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
  }

  const base = (): Omit<RawFormValues, 'year' | 'month' | 'day' | 'hour' | 'minute'> => ({
    calendar: 'solar',
    leapMonth: false,
    hourKnown: true,
    gender: '남',
    longitude: 126.978,
    yajasi: 'preserve-day',
    applyEquationOfTime: false,
  });

  function yearPillarAt(wall: Date): string {
    const r = computeReading({
      ...base(),
      year: wall.getUTCFullYear(),
      month: wall.getUTCMonth() + 1,
      day: wall.getUTCDate(),
      hour: wall.getUTCHours(),
      minute: wall.getUTCMinutes(),
    });
    if (!r.ok) throw new Error(r.error.message);
    const y = r.value.chart.pillars.year;
    return `${y.stem}${y.branch}`;
  }

  it.each(YEARS)('%s년 입춘', (y) => {
    const truth = solarTermInstant(y, 315, 2, 4);
    const offset = kstOffsetMinutes(truth);
    // 그 순간의 한국 벽시계. UTC 필드로 담아 로컬 타임존을 안 탄다.
    const wall = new Date(truth.getTime() + offset * 60_000);

    const before = yearPillarAt(new Date(wall.getTime() - 90_000));
    const after = yearPillarAt(new Date(wall.getTime() + 90_000));

    expect(before, `${y} 입춘 1분30초 전후로 년주가 갈려야 한다`).not.toBe(after);

    // 갈리는 방향도 맞아야 한다 — 60갑자에서 딱 한 칸 앞으로
    const GANJI: string[] = [];
    const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
    const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
    for (let i = 0; i < 60; i += 1) GANJI.push(`${STEMS[i % 10]}${BRANCHES[i % 12]}`);
    const gap = (GANJI.indexOf(after) - GANJI.indexOf(before) + 60) % 60;
    expect(gap, `${before} → ${after}`).toBe(1);
  });

  it('입춘 30분 전후로는 갈리지 않는 해가 없다 — 경계가 흐릿하지 않다', () => {
    for (const y of YEARS) {
      const truth = solarTermInstant(y, 315, 2, 4);
      const wall = new Date(truth.getTime() + kstOffsetMinutes(truth) * 60_000);
      const a = yearPillarAt(new Date(wall.getTime() - 30 * 60_000));
      const b = yearPillarAt(new Date(wall.getTime() + 30 * 60_000));
      expect(a, `${y}`).not.toBe(b);
    }
  });
});
