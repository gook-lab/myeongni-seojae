/**
 * 일주 · 구조 규칙 검증
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 일주는 표가 필요 없다
 *
 * 년주·월주는 절기표에 기대지만 일주는 아니다. 끊기지 않는 60갑자 순환일
 * 뿐이라 **율리우스일(JDN)로 직접** 검증할 수 있다. 그레고리력 날짜에서
 * JDN 을 구하고, 상수 하나를 더해 60 으로 나눈 나머지가 그 날의 간지와
 * 맞는지 본다.
 *
 * 상수 하나가 200년치 모든 날을 설명하면 그 표에는 빠진 날도, 겹친 날도,
 * 윤년·세기 경계에서 어긋난 날도 없다는 뜻이다. 라이브러리를 믿는 게 아니라
 * 산술로 확인하는 것이다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 구조 규칙도 전수로 본다
 *
 * 오호둔(년간 → 인월 천간)과 오자시두법(일간 → 자시 천간)은 표로 확정된
 * 규칙이다. 골든 50건은 이 조합들을 드문드문만 훑는다. 규칙이라면 전수로
 * 확인할 수 있고, 그래야 특정 조합에서만 어긋나는 걸 잡는다.
 */
import { Lunar, Solar } from 'lunar-javascript';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { describe, expect, it } from 'vitest';

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GANJI: string[] = Array.from(
  { length: 60 },
  (_, i) => `${STEMS[i % 10]}${BRANCHES[i % 12]}`,
);

/** 그레고리력 → 율리우스일. 천문학 표준 공식이다. */
function julianDayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045
  );
}

const FROM = 1900;
const TO = 2100;

const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** 기준점 하나로 위상 상수를 구한다. 이 상수가 전 구간을 설명해야 한다. */
const PHASE = (() => {
  const idx = GANJI.indexOf(Solar.fromYmd(1957, 6, 15).getLunar().getDayInGanZhi());
  return ((idx - julianDayNumber(1957, 6, 15)) % 60 + 60) % 60;
})();

describe('일주 — 율리우스일로 직접 검증한다', () => {
  it('기준점에서 위상 상수가 나온다', () => {
    expect(PHASE).toBeGreaterThanOrEqual(0);
    expect(PHASE).toBeLessThan(60);
  });

  it(`★${FROM}~${TO} 전 구간이 상수 하나로 설명된다★`, () => {
    // 빠진 날·겹친 날·윤년 경계 오류가 하나라도 있으면 여기서 무너진다.
    const bad: string[] = [];
    let n = 0;
    for (let y = FROM; y <= TO; y += 1) {
      for (let m = 1; m <= 12; m += 1) {
        const dim = daysInMonth(y, m);
        for (let d = 1; d <= dim; d += 1) {
          n += 1;
          const expected = GANJI[(julianDayNumber(y, m, d) + PHASE) % 60];
          const actual = Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi();
          if (expected !== actual && bad.length < 5) {
            bad.push(`${y}-${m}-${d} JDN=${expected} lib=${actual}`);
          }
        }
      }
    }
    expect(n).toBeGreaterThan(70_000);
    expect(bad).toEqual([]);
    // 7만 건을 도는 테스트다. 다른 파일과 나란히 돌면 기본 5초를 넘긴다.
  }, 60_000);

  it('세기 경계와 윤년에서도 하루도 건너뛰지 않는다', () => {
    // 1900 은 윤년이 아니고 2000 은 윤년이다. 여기서 흔히 틀린다.
    for (const [y, m, d] of [
      [1900, 2, 28], [1900, 3, 1], [2000, 2, 29], [2000, 3, 1], [2100, 2, 28],
    ] as const) {
      const expected = GANJI[(julianDayNumber(y, m, d) + PHASE) % 60];
      expect(Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi(), `${y}-${m}-${d}`).toBe(expected);
    }
  });

  it('연속한 날은 반드시 연속한 간지다', () => {
    let prev: number | null = null;
    for (let d = 1; d <= 400; d += 1) {
      const s = Solar.fromYmd(1999, 12, 1).next(d);
      const idx = GANJI.indexOf(s.getLunar().getDayInGanZhi());
      if (prev !== null) expect((prev + 1) % 60).toBe(idx);
      prev = idx;
    }
  });

  it('독립 구현(korean-lunar-calendar)도 같은 일진을 낸다', () => {
    const klc = new KoreanLunarCalendar();
    let n = 0;
    for (let y = 1900; y <= 2050; y += 2) {
      for (const [m, d] of [[1, 1], [3, 15], [6, 30], [9, 9], [12, 31]] as const) {
        if (!klc.setSolarDate(y, m, d)) continue;
        n += 1;
        expect(klc.getChineseGapja().day.replace('日', ''), `${y}-${m}-${d}`).toBe(
          Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi(),
        );
      }
    }
    expect(n).toBeGreaterThan(300);
  }, 30_000);
});

describe('구조 규칙 — 전수로 확인한다', () => {
  /** 오호둔(五虎遁) — 년간이 인월(寅月)의 천간을 정한다 */
  const TIGER_STEM: Record<string, string> = {
    甲: '丙', 己: '丙', 乙: '戊', 庚: '戊', 丙: '庚',
    辛: '庚', 丁: '壬', 壬: '壬', 戊: '甲', 癸: '甲',
  };

  /** 오자시두법(五鼠遁) — 일간이 자시(子時)의 천간을 정한다 */
  const RAT_STEM: Record<string, string> = {
    甲: '甲', 己: '甲', 乙: '丙', 庚: '丙', 丙: '戊',
    辛: '戊', 丁: '庚', 壬: '庚', 戊: '壬', 癸: '壬',
  };

  it('★오호둔 — 월주 천간이 년간에서 규칙대로 나온다★', () => {
    const bad: string[] = [];
    let n = 0;
    for (let y = 1920; y <= 2040; y += 1) {
      for (let m = 1; m <= 12; m += 1) {
        const ec = Solar.fromYmdHms(y, m, 15, 12, 0, 0).getLunar().getEightChar();
        const yearGz = ec.getYear();
        const monthGz = ec.getMonth();
        // 월지에서 인월까지 거슬러 올라가 인월 천간을 역산한다
        const steps = ((BRANCHES.indexOf(monthGz[1] as string) - 2) % 12 + 12) % 12;
        const tiger = STEMS[((STEMS.indexOf(monthGz[0] as string) - steps) % 10 + 10) % 10];
        n += 1;
        if (tiger !== TIGER_STEM[yearGz[0] as string] && bad.length < 5) {
          bad.push(`${y}-${m} 년간 ${yearGz[0]} → ${tiger} (기대 ${TIGER_STEM[yearGz[0] as string]})`);
        }
      }
    }
    expect(n).toBeGreaterThan(1400);
    expect(bad).toEqual([]);
  }, 30_000);

  it('★오자시두법 — 시주 천간이 일간에서 규칙대로 나온다★', () => {
    const bad: string[] = [];
    let n = 0;
    for (let y = 1950; y <= 2030; y += 1) {
      for (const m of [3, 9]) {
        for (let d = 1; d <= 28; d += 3) {
          for (const h of [1, 5, 9, 13, 17, 21]) {
            const ec = Solar.fromYmdHms(y, m, d, h, 30, 0).getLunar().getEightChar();
            const dayGz = ec.getDay();
            const hourGz = ec.getTime();
            const rat = STEMS[
              ((STEMS.indexOf(hourGz[0] as string) - BRANCHES.indexOf(hourGz[1] as string)) % 10 + 10) % 10
            ];
            n += 1;
            if (rat !== RAT_STEM[dayGz[0] as string] && bad.length < 5) {
              bad.push(`${y}-${m}-${d} ${h}시 일간 ${dayGz[0]} → ${rat}`);
            }
          }
        }
      }
    }
    expect(n).toBeGreaterThan(9000);
    expect(bad).toEqual([]);
  }, 30_000);

  it('60갑자가 60일마다 정확히 한 바퀴 돈다', () => {
    const start = Solar.fromYmd(2000, 1, 1);
    const a = start.getLunar().getDayInGanZhi();
    expect(start.next(60).getLunar().getDayInGanZhi()).toBe(a);
    expect(start.next(59).getLunar().getDayInGanZhi()).not.toBe(a);
  });

  it('음력 날짜도 같은 일진을 가리킨다', () => {
    // 양력으로 물어보든 음력으로 물어보든 같은 날이면 같은 일주여야 한다
    for (let y = 1950; y <= 2040; y += 7) {
      const l = Lunar.fromYmd(y, 5, 15);
      const s = l.getSolar();
      expect(Solar.fromYmd(s.getYear(), s.getMonth(), s.getDay()).getLunar().getDayInGanZhi())
        .toBe(l.getDayInGanZhi());
    }
  });
});
