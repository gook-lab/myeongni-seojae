/**
 * 명리서재 — 골든 케이스 생성기 (T1)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 교차 대조 전략
 *
 * 두 개의 독립 구현을 비교한다.
 *   A. lunar-javascript (6tail)  — 우리 엔진의 기반
 *   B. manseryeok v2              — 완전히 별개 구현
 *
 * 절기 시각부터 이미 서로를 검증한다:
 *   1957 입춘  A: 1957-02-04T01:54:37Z   B: 1957-02-04T01:55:00Z   차이 23초
 *
 * 실측으로 확인된 두 구현의 차이는 딱 두 가지이고, 둘 다 버그가 아니라
 * 알려진 규약 차이다:
 *
 *   1) 진태양시 보정 — 우리는 적용, manseryeok 은 미적용
 *      (manseryeok 시주 = 시계시각 그대로. 768케이스 중 736건이 그렇게 설명됨)
 *   2) 야자시 유파   — 23시대 시두 기준이 다름 (나머지 32건 전부 여기)
 *
 * 따라서 골든의 판정 기준은 이렇게 갈린다:
 *   년주·월주·일주 → manseryeok 과 100% 일치해야 한다. 불일치는 회귀다.
 *   시주           → 규약이 다르므로 우리 값을 스냅샷으로 고정하고,
 *                    manseryeok 값과 그 차이의 이유를 함께 기록한다.
 *
 * 이 파일을 고쳐 케이스를 늘릴 수 있다. 실행:
 *   pnpm golden:gen
 */

import { writeFileSync } from 'node:fs';
import { Lunar } from 'lunar-javascript';
import * as M from 'manseryeok';
import { koreanLunarToSolar } from '../src/core/korean-lunar';
import { computeReading } from '../src/engine/index';
import type { RawFormValues } from '../src/core/types';

/**
 * 두 구현이 갈리는 이유. 전부 알려진 규약·범위 차이여야 한다.
 *
 * standard-time-history — manseryeok 은 KST=UTC+9 로 고정 가정한다.
 *   1954~61(UTC+8:30) 과 서머타임 구간에서 절기 비교가 어긋나 년주·월주가 갈린다.
 *   실증: 1957-02-04 KST 10:30 출생.
 *     실제 표준시 +8:30 → 입춘(UTC 01:55)은 KST 10:25 → 출생은 입춘 이후 → 丁酉
 *     manseryeok(+9 가정) → UTC 01:30 → 입춘 이전으로 오판 → 丙申
 *   이 자리에서는 우리가 맞고 manseryeok 이 틀리다.
 *
 * true-solar-time — 경도 보정 유무. manseryeok 은 시주에 보정을 적용하지 않는다.
 *   시주가 갈리고, 자정 근처에서는 일주까지 갈린다
 *   (KST 00:10 = 진태양시 전날 23:37).
 *
 * yajasi — 23시대 시두 기준 유파 차이.
 */
type Divergence =
  | { pillar: 'year' | 'month' | 'day' | 'hour'; reason: 'standard-time-history'; ours: string; theirs: string }
  | { pillar: 'year' | 'month' | 'day' | 'hour'; reason: 'true-solar-time'; ours: string; theirs: string }
  | { pillar: 'year' | 'month' | 'day' | 'hour'; reason: 'yajasi'; ours: string; theirs: string }
  | { pillar: 'year' | 'month' | 'day' | 'hour'; reason: 'unexplained'; ours: string; theirs: string };

interface CaseSpec {
  label: string;
  group: string;
  raw: Partial<RawFormValues>;
}

interface GoldenCase extends CaseSpec {
  ours: { year: string; month: string; day: string; hour: string | null };
  manseryeok: { year: string; month: string; day: string; hour: string } | null;
  /** 각 기둥이 manseryeok 과 일치하는가 */
  agrees: { year: boolean; month: boolean; day: boolean; hour: boolean } | null;
  /** 불일치가 있으면 그 이유. 'unexplained' 가 하나라도 나오면 회귀다. */
  divergences: Divergence[];
  /**
   * 음력 케이스에서 실제로 어느 양력 날짜로 옮겨졌는가.
   * 한국 음력과 중국 음력이 갈리면 여기서 바로 보인다 — 회귀가 나면
   * 골든 diff 에 하루 차이로 드러난다.
   */
  lunar?: {
    korean: string;
    chinese: string;
    differs: boolean;
  };
  solarTime: {
    standardOffsetMinutes: number;
    offsetMinutes: number;
    daylightSaving: boolean;
  };
  daeun: { startAge: number; direction: string; first: string; ganjis: string[] };
}

const BASE: RawFormValues = {
  calendar: 'solar',
  year: 1990,
  month: 5,
  day: 5,
  leapMonth: false,
  hourKnown: true,
  hour: 9,
  minute: 30,
  gender: '남',
  yajasi: 'preserve-day',
  applyEquationOfTime: false,
};

/** 고정된 "오늘". 스냅샷이 날짜에 흔들리면 안 된다. */
const TODAY = new Date(Date.UTC(2026, 7, 21));

const CASES: CaseSpec[] = [
  // ── 절기 경계일 (10) ────────────────────────────────────────────
  // 1957 입춘 = UTC 01:54:37 = KST(+8:30) 10:24:37
  { label: '1957 입춘 직전 (KST 10:20)', group: '절기경계', raw: { year: 1957, month: 2, day: 4, hour: 10, minute: 20 } },
  { label: '1957 입춘 직후 (KST 10:30)', group: '절기경계', raw: { year: 1957, month: 2, day: 4, hour: 10, minute: 30 } },
  { label: '2026 입춘 직전', group: '절기경계', raw: { year: 2026, month: 2, day: 4, hour: 12, minute: 0 } },
  { label: '2026 입춘 직후', group: '절기경계', raw: { year: 2026, month: 2, day: 4, hour: 14, minute: 0 } },
  { label: '1990 입하 직전', group: '절기경계', raw: { year: 1990, month: 5, day: 5, hour: 20, minute: 0 } },
  { label: '1990 입하 직후', group: '절기경계', raw: { year: 1990, month: 5, day: 6, hour: 12, minute: 0 } },
  { label: '2000 경칩 경계', group: '절기경계', raw: { year: 2000, month: 3, day: 5, hour: 12, minute: 0 } },
  { label: '1975 대설 경계', group: '절기경계', raw: { year: 1975, month: 12, day: 7, hour: 12, minute: 0 } },
  { label: '1965 소한 경계 (연초)', group: '절기경계', raw: { year: 1965, month: 1, day: 5, hour: 12, minute: 0 } },
  { label: '1983 망종 경계', group: '절기경계', raw: { year: 1983, month: 6, day: 6, hour: 12, minute: 0 } },

  // ── 1954~61 UTC+8:30 겨울 (10) ──────────────────────────────────
  { label: '1954-04-01 (개정 직후)', group: '1954-61', raw: { year: 1954, month: 4, day: 1, hour: 9, minute: 30 } },
  { label: '1955-01-15', group: '1954-61', raw: { year: 1955, month: 1, day: 15, hour: 6, minute: 0 } },
  { label: '1956-11-03', group: '1954-61', raw: { year: 1956, month: 11, day: 3, hour: 15, minute: 45 } },
  { label: '1957-12-15', group: '1954-61', raw: { year: 1957, month: 12, day: 15, hour: 9, minute: 30 } },
  { label: '1958-02-20', group: '1954-61', raw: { year: 1958, month: 2, day: 20, hour: 22, minute: 10 } },
  { label: '1959-03-08', group: '1954-61', raw: { year: 1959, month: 3, day: 8, hour: 4, minute: 20 } },
  { label: '1960-01-30', group: '1954-61', raw: { year: 1960, month: 1, day: 30, hour: 11, minute: 0 } },
  { label: '1960-12-25', group: '1954-61', raw: { year: 1960, month: 12, day: 25, hour: 18, minute: 30 } },
  { label: '1961-03-15', group: '1954-61', raw: { year: 1961, month: 3, day: 15, hour: 7, minute: 15 } },
  { label: '1961-08-09 (개정 직전)', group: '1954-61', raw: { year: 1961, month: 8, day: 9, hour: 12, minute: 0 } },

  // ── 1955~60 서머타임 (5) ────────────────────────────────────────
  { label: '1955-07-15 서머타임', group: '서머타임', raw: { year: 1955, month: 7, day: 15, hour: 9, minute: 30 } },
  { label: '1957-06-15 서머타임', group: '서머타임', raw: { year: 1957, month: 6, day: 15, hour: 9, minute: 30 } },
  { label: '1958-08-01 서머타임', group: '서머타임', raw: { year: 1958, month: 8, day: 1, hour: 14, minute: 0 } },
  { label: '1959-07-04 서머타임', group: '서머타임', raw: { year: 1959, month: 7, day: 4, hour: 5, minute: 45 } },
  { label: '1960-06-20 서머타임', group: '서머타임', raw: { year: 1960, month: 6, day: 20, hour: 20, minute: 30 } },

  // ── 1987~88 서머타임 (5) ────────────────────────────────────────
  { label: '1987-07-15 서머타임', group: '서머타임', raw: { year: 1987, month: 7, day: 15, hour: 9, minute: 30 } },
  { label: '1987-09-01 서머타임', group: '서머타임', raw: { year: 1987, month: 9, day: 1, hour: 16, minute: 0 } },
  { label: '1988-08-15 서머타임', group: '서머타임', raw: { year: 1988, month: 8, day: 15, hour: 9, minute: 30 } },
  { label: '1988-06-01 서머타임', group: '서머타임', raw: { year: 1988, month: 6, day: 1, hour: 2, minute: 30 } },
  { label: '1988-02-15 (겨울, 대조군)', group: '서머타임', raw: { year: 1988, month: 2, day: 15, hour: 9, minute: 30 } },

  // ── 윤달 (5) ────────────────────────────────────────────────────
  { label: '음력 2023 윤2/15', group: '윤달', raw: { calendar: 'lunar', year: 2023, month: 2, day: 15, leapMonth: true, hourKnown: false } },
  { label: '음력 2023 평2/15', group: '윤달', raw: { calendar: 'lunar', year: 2023, month: 2, day: 15, leapMonth: false, hourKnown: false } },
  { label: '음력 1957 윤8/10', group: '윤달', raw: { calendar: 'lunar', year: 1957, month: 8, day: 10, leapMonth: true, hourKnown: false } },
  { label: '음력 1987 윤6/20', group: '윤달', raw: { calendar: 'lunar', year: 1987, month: 6, day: 20, leapMonth: true, hourKnown: false } },
  { label: '음력 1990 5/5 평달', group: '윤달', raw: { calendar: 'lunar', year: 1990, month: 5, day: 5, hourKnown: true, hour: 9, minute: 30 } },

  // ── 한국 음력 ≠ 중국 음력 ──
  // 삭이 자정 근처에 들면 UTC+8 과 KST 에서 달의 시작이 하루 갈린다.
  // 中氣도 같은 이유로 갈려 윤달이 통째로 한 달 옮겨가는 해가 있다.
  // 사용자가 넣는 음력은 가족관계등록부의 한국 음력이므로 그쪽을 따른다.
  // 근거는 core/korean-lunar.ts · test/korean-lunar.test.ts
  { label: '음력 2017 윤5/10 (중국은 윤6월)', group: '한국음력', raw: { calendar: 'lunar', year: 2017, month: 5, day: 10, leapMonth: true, hourKnown: false } },
  { label: '음력 2012 윤3/10 (중국은 윤4월)', group: '한국음력', raw: { calendar: 'lunar', year: 2012, month: 3, day: 10, leapMonth: true, hourKnown: false } },
  { label: '음력 1914 윤5/1 (삭이 자정을 넘김)', group: '한국음력', raw: { calendar: 'lunar', year: 1914, month: 5, day: 1, leapMonth: true, hourKnown: false } },
  { label: '음력 1919 윤7/1', group: '한국음력', raw: { calendar: 'lunar', year: 1919, month: 7, day: 1, leapMonth: true, hourKnown: false } },

  // ── 야자시 (5) ──────────────────────────────────────────────────
  // KST 23:33 = 진태양시 23:00 → 여기부터 자시
  { label: '2026-03-10 KST 23:30 (진태양시 22:57)', group: '야자시', raw: { year: 2026, month: 3, day: 10, hour: 23, minute: 30 } },
  { label: '2026-03-10 KST 23:40 (진태양시 23:07)', group: '야자시', raw: { year: 2026, month: 3, day: 10, hour: 23, minute: 40 } },
  { label: '2026-03-10 KST 23:40 조자시', group: '야자시', raw: { year: 2026, month: 3, day: 10, hour: 23, minute: 40, yajasi: 'advance-day' } },
  { label: '1957-12-15 KST 23:10 (보정 -2분)', group: '야자시', raw: { year: 1957, month: 12, day: 15, hour: 23, minute: 10 } },
  { label: '1990-01-01 KST 00:10', group: '야자시', raw: { year: 1990, month: 1, day: 1, hour: 0, minute: 10 } },

  // ── 평범 (10) ───────────────────────────────────────────────────
  { label: '1990-05-05 09:30 남', group: '평범', raw: { year: 1990, month: 5, day: 5, hour: 9, minute: 30 } },
  { label: '1990-05-05 09:30 여', group: '평범', raw: { year: 1990, month: 5, day: 5, hour: 9, minute: 30, gender: '여' } },
  { label: '1985-11-22 14:00 여', group: '평범', raw: { year: 1985, month: 11, day: 22, hour: 14, minute: 0, gender: '여' } },
  { label: '1972-03-18 07:45 남', group: '평범', raw: { year: 1972, month: 3, day: 18, hour: 7, minute: 45 } },
  { label: '2001-09-11 21:00 여', group: '평범', raw: { year: 2001, month: 9, day: 11, hour: 21, minute: 0, gender: '여' } },
  { label: '2015-06-30 12:00 남', group: '평범', raw: { year: 2015, month: 6, day: 30, hour: 12, minute: 0 } },
  { label: '1948-08-15 12:00 남', group: '평범', raw: { year: 1948, month: 8, day: 15, hour: 12, minute: 0 } },
  { label: '1930-05-05 09:30 남 (일제)', group: '평범', raw: { year: 1930, month: 5, day: 5, hour: 9, minute: 30 } },
  { label: '1910-06-15 09:30 남 (대한제국)', group: '평범', raw: { year: 1910, month: 6, day: 15, hour: 9, minute: 30 } },
  { label: '1990-05-05 시간 미상', group: '평범', raw: { year: 1990, month: 5, day: 5, hourKnown: false } },
];

function manseryeokPillars(y: number, m: number, d: number, h: number, mi: number) {
  const r = (M as unknown as {
    calculateFourPillars: (i: {
      year: number; month: number; day: number; hour: number; minute: number;
    }) => Record<string, { heavenlyStem: string; earthlyBranch: string }>;
  }).calculateFourPillars({ year: y, month: m, day: d, hour: h, minute: mi });
  const f = (k: string) => {
    const p = r[k];
    return p ? `${p.heavenlyStem}${p.earthlyBranch}` : '';
  };
  return { year: f('year'), month: f('month'), day: f('day'), hour: f('hour') };
}

/** 진태양시 보정이 날짜 경계를 넘겼는가 (KST 00:10 → 전날 23:37 같은 경우) */
function solarCrossedDay(
  raw: RawFormValues,
  st: { offsetMinutes: number },
): boolean {
  if (!raw.hourKnown) return false;
  const minutesIntoDay = Number(raw.hour) * 60 + Number(raw.minute);
  return minutesIntoDay + st.offsetMinutes < 0;
}

function build(): GoldenCase[] {
  const out: GoldenCase[] = [];

  for (const spec of CASES) {
    const raw = { ...BASE, ...spec.raw } as RawFormValues;
    const result = computeReading(raw, { today: TODAY });
    if (!result.ok) {
      throw new Error(`${spec.label}: 계산 실패 ${result.error.code} — ${result.error.message}`);
    }
    const { chart, timeline } = result.value;
    const p = chart.pillars;
    const g = (x: { stem: string; branch: string } | null) => (x ? `${x.stem}${x.branch}` : null);

    const ours = {
      year: g(p.year) as string,
      month: g(p.month) as string,
      day: g(p.day) as string,
      hour: g(p.hour),
    };

    // manseryeok 은 양력 + 시각을 받는다. 음력 케이스는 변환된 양력으로 대조한다.
    const st = chart.solarTime;
    const clockY = raw.calendar === 'solar' ? Number(raw.year) : null;
    let mrk: GoldenCase['manseryeok'] = null;
    if (clockY !== null && raw.hourKnown) {
      mrk = manseryeokPillars(
        Number(raw.year), Number(raw.month), Number(raw.day),
        Number(raw.hour), Number(raw.minute),
      );
    }

    const agrees = mrk
      ? {
          year: ours.year === mrk.year,
          month: ours.month === mrk.month,
          day: ours.day === mrk.day,
          hour: ours.hour === mrk.hour,
        }
      : null;

    const divergences: Divergence[] = [];
    if (mrk && agrees) {
      // manseryeok 이 KST=UTC+9 로 가정하므로, 표준시가 +9 가 아니었던 구간에서는
      // 절기 비교가 어긋난다. 년주·월주가 갈리는 유일한 정당한 이유다.
      const stdDiffers = st.standardOffsetMinutes !== 540;
      const nearMidnight = ours.hour !== null && solarCrossedDay(raw, st);
      const explicitYajasi = raw.yajasi === 'advance-day';
      const atNightHour = Number(raw.hour) === 23;

      const push = (pillar: Divergence['pillar'], reason: Divergence['reason']) =>
        divergences.push({
          pillar, reason,
          ours: (ours as Record<string, string | null>)[pillar] ?? '--',
          theirs: (mrk as unknown as Record<string, string>)[pillar] ?? '--',
        });

      if (!agrees.year) push('year', stdDiffers ? 'standard-time-history' : 'unexplained');
      if (!agrees.month) push('month', stdDiffers ? 'standard-time-history' : 'unexplained');
      if (!agrees.day) {
        push('day',
          explicitYajasi || atNightHour ? 'yajasi'
          : nearMidnight ? 'true-solar-time'
          : stdDiffers ? 'standard-time-history'
          : 'unexplained');
      }
      if (!agrees.hour) {
        push('hour', atNightHour ? 'yajasi' : 'true-solar-time');
      }
    }

    out.push({
      label: spec.label,
      group: spec.group,
      raw: spec.raw,
      ours,
      manseryeok: mrk,
      agrees,
      divergences,
      ...(raw.calendar === 'lunar' ? { lunar: lunarComparison(raw) } : {}),
      solarTime: {
        standardOffsetMinutes: st.standardOffsetMinutes,
        offsetMinutes: Math.round(st.offsetMinutes * 100) / 100,
        daylightSaving: st.daylightSaving,
      },
      daeun: {
        startAge: timeline.startAge,
        direction: timeline.direction,
        first: `${timeline.entries[0]?.pillar.stem}${timeline.entries[0]?.pillar.branch}`,
        ganjis: timeline.entries.map((e) => `${e.pillar.stemHanja}${e.pillar.branchHanja}`),
      },
    });
  }
  return out;
}

/** 같은 음력 날짜를 한국 음력과 중국 음력으로 각각 옮겨본다. */
function lunarComparison(raw: Partial<RawFormValues>): NonNullable<GoldenCase['lunar']> {
  const y = Number(raw.year);
  const m = Number(raw.month);
  const d = Number(raw.day);
  const leap = raw.leapMonth === true;
  const fmt = (a: { year: number; month: number; day: number }) =>
    `${a.year}-${String(a.month).padStart(2, '0')}-${String(a.day).padStart(2, '0')}`;

  const kr = koreanLunarToSolar(y, m, d, leap);
  let cn: string;
  try {
    const s = Lunar.fromYmd(y, leap ? -m : m, d).getSolar();
    cn = fmt({ year: s.getYear(), month: s.getMonth(), day: s.getDay() });
  } catch {
    cn = '--';
  }
  const korean = kr ? fmt(kr) : '--';
  return { korean, chinese: cn, differs: korean !== cn };
}

const cases = build();

// ── 요약 리포트 ────────────────────────────────────────────────────
const compared = cases.filter((c) => c.manseryeok !== null);
const allDiv = cases.flatMap((c) => c.divergences.map((d) => ({ ...d, label: c.label })));
const byReason = allDiv.reduce<Record<string, number>>((a, d) => {
  a[d.reason] = (a[d.reason] ?? 0) + 1;
  return a;
}, {});
const unexplained = allDiv.filter((d) => d.reason === 'unexplained');
const fullAgree = compared.filter((c) => c.divergences.length === 0).length;

console.log(`골든 케이스 ${cases.length}건 생성`);
console.log(`  manseryeok 대조 가능: ${compared.length}건`);
console.log(`  네 기둥 완전 일치:    ${fullAgree}/${compared.length}`);
console.log('  차이 분류:');
for (const [reason, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
  const mark = reason === 'unexplained' ? '  ★설명 안 됨★' : '';
  console.log(`    ${reason.padEnd(24)} ${String(n).padStart(3)}건${mark}`);
}

const stdHistory = allDiv.filter((d) => d.reason === 'standard-time-history');
if (stdHistory.length) {
  console.log('\n  표준시 이력 미반영으로 manseryeok 이 틀리는 자리 (우리가 맞다):');
  for (const d of stdHistory) {
    console.log(`    ${d.label} — ${d.pillar}: 우리 ${d.ours} / manseryeok ${d.theirs}`);
  }
}

if (unexplained.length) {
  console.log('\n★★ 설명되지 않는 불일치 — 조사 필요 ★★');
  for (const d of unexplained) {
    console.log(`  ${d.label} — ${d.pillar}: 우리 ${d.ours} / manseryeok ${d.theirs}`);
  }
  process.exitCode = 1;
}

const path = 'test/golden-cases.json';
writeFileSync(
  path,
  `${JSON.stringify(
    {
      generatedBy: 'scripts/gen-golden.ts',
      today: TODAY.toISOString(),
      sources: {
        primary: 'lunar-javascript (6tail)',
        crossCheck: 'manseryeok v2',
        note: '년·월·일주는 두 구현이 100% 일치해야 한다. 시주는 진태양시 보정·야자시 유파 차이로 갈린다.',
      },
      cases,
    },
    null,
    2,
  )}\n`,
);
console.log(`\n저장: ${path}`);
