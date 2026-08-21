/**
 * 한국 음력 — 중국 음력과 갈리는 지점
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 이 파일이 있는가
 *
 * 음력 달은 삭(朔)이 드는 **날**에 시작한다. "순간" 이 아니라 "날" 이다.
 * 그래서 삭이 자정 근처에 들면 어느 시간대로 읽느냐에 따라 시작이 하루
 * 갈린다. 중국은 UTC+8, 한국(한국천문연구원)은 KST 다.
 *
 * 사용자가 넣는 음력은 가족관계등록부에 적힌 **한국 음력**이다. 중국 음력
 * 표로 옮기면 하루가 어긋나고, 하루가 어긋나면 일주가 통째로 바뀐다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 어느 라이브러리도 믿지 않는다
 *
 * "korean-lunar-calendar 가 한국 것이겠지" 로 넘어가면 검증이 아니다.
 * 여기서는 규칙을 직접 구현한다 — 천체력으로 삭과 中氣의 순간을 구하고,
 * 각 시간대의 **날짜**로 달을 매긴 뒤, 라이브러리가 어느 쪽과 맞는지 센다.
 *
 * astronomy-engine 은 devDependency 다. 이 검증에만 쓴다.
 */
import * as Astro from 'astronomy-engine';
import { Lunar } from 'lunar-javascript';
import { describe, expect, it } from 'vitest';
import { leapMonthOf, lunarToSolar } from '../src/core/input';
import {
  koreanLeapMonthOf,
  koreanLunarToSolar,
  solarToKoreanLunar,
} from '../src/core/korean-lunar';

const DAY = 86_400_000;

/** 그 시간대에서의 날짜를 YYYYMMDD 정수로. 로컬 타임존을 안 탄다. */
function dateNum(ms: number, offsetMinutes: number): number {
  const d = new Date(ms + offsetMinutes * 60_000);
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/** 검증 구간. 2012·2017 의 아슬아슬한 경계를 반드시 포함시킨다. */
const FROM = 1985;
const TO = 2035;

/** 삭(신월)의 순간들 */
const NEW_MOONS: number[] = (() => {
  const out: number[] = [];
  let t = new Astro.AstroTime(new Date(Date.UTC(FROM - 1, 9, 1)));
  const end = Date.UTC(TO + 1, 2, 1);
  for (;;) {
    const nm = Astro.SearchMoonPhase(0, t, 40);
    if (!nm || nm.date.getTime() > end) break;
    out.push(nm.date.getTime());
    t = new Astro.AstroTime(new Date(nm.date.getTime() + 2 * DAY));
  }
  return out;
})();

/**
 * 中氣 — 황경 270°(동지)부터 30° 간격 12개. 달의 번호를 정하는 것이 이것이다.
 * 절기(節氣, 입춘·경칩…)가 아니라 중기(中氣, 동지·대한·우수…)임에 주의.
 */
const MID_TERMS: Array<{ ms: number; monthNo: number }> = (() => {
  const out: Array<{ ms: number; monthNo: number }> = [];
  for (let y = FROM - 1; y <= TO + 1; y += 1) {
    for (let k = 0; k < 12; k += 1) {
      const lon = (270 + k * 30) % 360;
      const monthNo = ((10 + k) % 12) + 1; // 270°=11월, 300°=12월, 330°=1월 …
      const approx = Date.UTC(y, 11, 22) + (((lon - 270 + 360) % 360) / 360) * 365.25 * DAY;
      const f = Astro.SearchSunLongitude(lon, new Astro.AstroTime(new Date(approx - 12 * DAY)), 26);
      if (f) out.push({ ms: f.date.getTime(), monthNo });
    }
  }
  out.sort((a, b) => a.ms - b.ms);
  return out;
})();

interface MonthLabel {
  no: number;
  leap: boolean;
}

/**
 * 규칙 그대로 달력을 짓는다.
 *
 *   · 달은 삭이 드는 날에 시작한다
 *   · 中氣가 든 날로 달의 번호를 정한다
 *   · 동지가 든 달이 11월이다
 *   · 동지에서 동지까지 13달이면 中氣 없는 첫 달이 윤달이다
 *
 * offsetMinutes 만 바꾸면 중국 달력(+8h)과 한국 달력(+9h)이 나온다.
 * 시간대가 결과를 바꾼다는 것이 이 파일의 요점이다.
 */
function buildCalendar(offsetMinutes: number): Map<number, MonthLabel> {
  const months = NEW_MOONS.slice(0, -1).map((ms, i) => {
    const start = dateNum(ms, offsetMinutes);
    const next = dateNum(NEW_MOONS[i + 1] as number, offsetMinutes);
    return {
      start,
      mids: MID_TERMS.filter((g) => {
        const gd = dateNum(g.ms, offsetMinutes);
        return gd >= start && gd < next;
      }),
    };
  });

  const out = new Map<number, MonthLabel>();
  const winters = months.map((m, i) => (m.mids.some((g) => g.monthNo === 11) ? i : -1))
    .filter((i) => i >= 0);
  for (let w = 0; w < winters.length - 1; w += 1) {
    const a = winters[w] as number;
    const b = winters[w + 1] as number;
    const span = b - a;
    let no = 11;
    let leapUsed = false;
    for (let k = a; k < b; k += 1) {
      const m = months[k];
      if (!m) continue;
      if (span === 13 && !leapUsed && m.mids.length === 0 && k > a) {
        // 윤달은 앞 달의 번호를 물려받는다
        out.set(m.start, { no: ((no + 10) % 12) + 1, leap: true });
        leapUsed = true;
        continue;
      }
      out.set(m.start, { no, leap: false });
      no = (no % 12) + 1;
    }
  }
  return out;
}

const CAL_CN = buildCalendar(8 * 60); // 중국
const CAL_KR = buildCalendar(9 * 60); // 한국

const ymdNum = (y: number, m: number, d: number): number => y * 10000 + m * 100 + d;

/** 라이브러리가 말한 "그 달 1일" 이 규칙상 정말 그 달 1일인가 */
function agreementRate(
  toSolar: (y: number, m: number) => number | null,
  cal: Map<number, MonthLabel>,
): { rate: number; n: number } {
  let n = 0;
  let hit = 0;
  for (let y = FROM; y <= TO; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      const s = toSolar(y, m);
      if (s === null) continue;
      n += 1;
      const label = cal.get(s);
      if (label && label.no === m && !label.leap) hit += 1;
    }
  }
  return { rate: hit / n, n };
}

const ljFirstDay = (y: number, m: number): number | null => {
  try {
    const s = Lunar.fromYmd(y, m, 1).getSolar();
    return ymdNum(s.getYear(), s.getMonth(), s.getDay());
  } catch {
    return null;
  }
};
const krFirstDay = (y: number, m: number): number | null => {
  const s = koreanLunarToSolar(y, m, 1, false);
  return s ? ymdNum(s.year, s.month, s.day) : null;
};

describe('규칙으로 판정한다 — 어느 라이브러리도 믿지 않고', () => {
  it(`${FROM}~${TO} 삭과 中氣를 천체력으로 다 구했다`, () => {
    expect(NEW_MOONS.length).toBeGreaterThan((TO - FROM) * 12);
    expect(MID_TERMS.length).toBeGreaterThan((TO - FROM) * 12);
    expect(CAL_CN.size).toBeGreaterThan((TO - FROM) * 12);
    expect(CAL_KR.size).toBeGreaterThan((TO - FROM) * 12);
  });

  it('★lunar-javascript 는 중국 음력이다★', () => {
    const cn = agreementRate(ljFirstDay, CAL_CN);
    const kr = agreementRate(ljFirstDay, CAL_KR);
    expect(cn.n).toBeGreaterThan(500);
    expect(cn.rate, `UTC+8 규칙 일치율 ${(cn.rate * 100).toFixed(2)}%`).toBeGreaterThan(0.99);
    // 한국 규칙과는 눈에 띄게 덜 맞는다 — 그게 문제의 크기다
    expect(kr.rate).toBeLessThan(cn.rate);
  });

  it('★korean-lunar-calendar 는 한국 음력이다★', () => {
    const cn = agreementRate(krFirstDay, CAL_CN);
    const kr = agreementRate(krFirstDay, CAL_KR);
    expect(kr.rate, `KST 규칙 일치율 ${(kr.rate * 100).toFixed(2)}%`).toBeGreaterThan(0.99);
    expect(cn.rate).toBeLessThan(kr.rate);
  });

  it('★두 달력이 실제로 갈린다 — 없는 문제를 고친 게 아니다★', () => {
    let split = 0;
    for (const [start, kr] of CAL_KR) {
      const cn = CAL_CN.get(start);
      if (!cn || cn.no !== kr.no || cn.leap !== kr.leap) split += 1;
    }
    expect(split, '두 기준이 한 번도 안 갈리면 이 파일은 의미가 없다').toBeGreaterThan(0);
  });
});

describe('자정을 넘나드는 한 시간이 윤달을 한 달 옮긴다', () => {
  it('2017년 대서는 UTC+8 로 7월 22일, KST 로 7월 23일이다', () => {
    const daeseo = Astro.SearchSunLongitude(120, new Astro.AstroTime(new Date(Date.UTC(2017, 6, 10))), 20);
    expect(daeseo).not.toBeNull();
    const ms = (daeseo as Astro.AstroTime).date.getTime();
    expect(dateNum(ms, 8 * 60)).toBe(20170722);
    expect(dateNum(ms, 9 * 60)).toBe(20170723);
  });

  it('★그래서 2017년 윤달이 한국은 5월, 중국은 6월이다★', () => {
    expect(koreanLeapMonthOf(2017)).toBe(5);
    // 우리 입력 경로도 한국 기준을 따라야 한다
    expect(leapMonthOf(2017)).toBe(5);

    // 규칙으로 지은 달력에서도 같은 답이 나오는가
    const krLeap = [...CAL_KR.entries()].find(
      ([start, l]) => l.leap && start > 20170101 && start < 20180101,
    );
    const cnLeap = [...CAL_CN.entries()].find(
      ([start, l]) => l.leap && start > 20170101 && start < 20180101,
    );
    expect(krLeap?.[1].no).toBe(5);
    expect(cnLeap?.[1].no).toBe(6);
  });

  it('2012년도 갈린다 — 한국 윤3월', () => {
    expect(koreanLeapMonthOf(2012)).toBe(3);
    expect(leapMonthOf(2012)).toBe(3);
  });
});

describe('★우리 입력 경로가 한국 음력을 쓴다★', () => {
  it('갈리는 달에서 중국 음력과 다른 양력 날짜가 나온다', () => {
    // 1914 윤5월: 삭이 UTC+8 6/23 23:33, KST 6/24 00:33 이었다
    const ours = lunarToSolar(1914, 5, 1, true);
    expect(ours.ok).toBe(true);
    const cn = Lunar.fromYmd(1914, -5, 1).getSolar();
    expect(ours.ok && ours.value).toEqual({ year: 1914, month: 6, day: 24 });
    expect(cn.getDay()).toBe(23);
  });

  it('음력 입력이 대체로 하루 앞선 중국 값과 갈린다 — 3% 남짓', () => {
    let n = 0;
    let differ = 0;
    for (let y = 1930; y <= 2040; y += 1) {
      for (let m = 1; m <= 12; m += 1) {
        for (const d of [1, 15, 28]) {
          const ours = lunarToSolar(y, m, d, false);
          if (!ours.ok) continue;
          let cn;
          try { cn = Lunar.fromYmd(y, m, d).getSolar(); } catch { continue; }
          n += 1;
          if (
            ours.value.year !== cn.getYear() ||
            ours.value.month !== cn.getMonth() ||
            ours.value.day !== cn.getDay()
          ) differ += 1;
        }
      }
    }
    expect(n).toBeGreaterThan(3000);
    // 없으면 고친 게 없다는 뜻이고, 너무 많으면 뭔가 잘못된 것이다
    expect(differ / n, `${differ}/${n} 갈림`).toBeGreaterThan(0.01);
    expect(differ / n).toBeLessThan(0.08);
  });

  it('한국 음력에 없는 날짜는 중국 음력으로 몰래 넘어가지 않는다', () => {
    // 없는 윤달
    const r = lunarToSolar(2016, 5, 1, true);
    expect(r.ok).toBe(false);
  });

  it('왕복한다 — 음력으로 넣은 것이 그대로 되돌아온다', () => {
    for (let y = 1920; y <= 2040; y += 7) {
      for (const [m, d] of [[1, 1], [5, 15], [8, 29], [12, 20]] as const) {
        const s = koreanLunarToSolar(y, m, d, false);
        if (!s) continue;
        const back = solarToKoreanLunar(s.year, s.month, s.day);
        expect(back, `${y}/${m}/${d}`).toEqual({ year: y, month: m, day: d, leapMonth: false });
      }
    }
  });
});

describe('지원 범위를 숨기지 않는다', () => {
  it('2050년까지는 한국 자료가 있다', () => {
    expect(koreanLunarToSolar(2050, 5, 15, false)).not.toBeNull();
    expect(koreanLeapMonthOf(2050)).not.toBeNull();
  });

  it('2051년부터는 한국 자료가 없다 — null 로 알린다', () => {
    expect(koreanLunarToSolar(2051, 5, 15, false)).toBeNull();
    expect(koreanLeapMonthOf(2051)).toBeNull();
  });

  it('★범위 밖은 조용히 물러나지 않고 거절한다★', () => {
    /*
     * 예전에는 2051년부터 중국 음력으로 물러났다. 그건 달의 3.6%에서 하루
     * 어긋난 값을 아무 말 없이 내주는 것이라 조용한 오답이 된다.
     * 못 하는 것은 못 한다고 말한다.
     */
    const r = lunarToSolar(2051, 5, 15, false);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error.message).toMatch(/2050년까지/);
  });
});
