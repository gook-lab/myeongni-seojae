/**
 * 명리서재 — 계산 엔진 진입점 (동적 import 대상, T9)
 *
 * 이 모듈이 lunar-javascript 와 해석 텍스트를 전부 끌고 온다. 그래서
 * 입력 화면 번들에 들어가면 안 된다. 사용자가 "사주 풀어보기"를 누르는
 * 순간에만 로드된다.
 *
 * 관객이 부모님 세대(구형 안드로이드 + 느린 회선)이므로 첫 화면이 가벼운
 * 것이 NFR N1 이다. 입력 폼을 보는 데 계산 코드가 필요할 이유가 없다.
 */

import { buildTimeline } from '../core/daeun';
import { dailyFortune, gunghap, yearFortune } from '../core/fortune';
import type { DailyFortune, Gunghap, YearFortune } from '../core/fortune';
import type { SajuResult } from '../core/errors';
import { normalize, resolveSolarYmd } from '../core/input';
import { toSolarTime } from '../core/korea-time';
import { computeChart } from '../core/manse';
import type {
  DaeunTimeline,
  RawFormValues,
  SajuChart,
  TenGodCategory,
} from '../core/types';
import { DAEUN_TEXT, daeunPrefix } from '../text/daeun-text';
import {
  BRANCH_CLASH_TEXT, BRANCH_HARMONY_TEXT, GUNGHAP_TEXT, dailyLead, yearLead,
} from '../text/fortune-text';
import { DAY_MASTER_TEXT, GLOSS, INTERPRET, moneyText } from '../text/interpret';

export interface DaeunCard {
  index: number;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  ganji: string;
  ganjiKo: string;
  tenGod: string;
  category: TenGodCategory;
  isCurrent: boolean;
  /** 시점 안내 — 지나온 / 지금 / 앞으로 */
  prefix: string;
  /** 십성 수준의 결 (10종) */
  text: string;
  /** 카테고리 수준의 넓은 주제 (5종) */
  theme: string;
  stemColor: string;
  branchColor: string;
}

export interface DailyReading {
  ganji: string;
  tenGod: string;
  category: TenGodCategory;
  date: string;
  lead: string;
  text: string;
}

export interface YearReading {
  year: number;
  ganji: string;
  tenGod: string;
  category: TenGodCategory;
  lead: string;
  text: string;
  months: Array<{
    label: string;
    ganji: string;
    tenGod: string;
    category: TenGodCategory;
    text: string;
    color: string;
  }>;
}

export interface SajuReading {
  chart: SajuChart;
  daily: DailyReading | null;
  year: YearReading | null;
  timeline: DaeunTimeline;
  cards: DaeunCard[];
  dayMasterText: string;
  /** 시주 없이 계산됐는가 — UI 가 정확도 안내를 띄운다 */
  hourUnknown: boolean;
  topics: {
    dominant: TenGodCategory;
    personality: string;
    career: string;
    love: string;
    money: string;
  };
  gloss: typeof GLOSS;
}

import { ELEMENT_COLOR } from '../text/interpret';
import { TEN_GOD_CATEGORY } from '../core/constants';

export interface ComputeOptions {
  /** 오늘. 테스트·SSR 에서 고정할 수 있게 주입 가능. */
  today?: Date;
}

/**
 * 폼 값 하나로 화면에 필요한 것을 전부 만든다.
 * 어느 단계에서 실패하든 SajuResult 로 돌아온다. 예외는 던지지 않는다.
 */
export function computeReading(
  raw: RawFormValues,
  opts: ComputeOptions = {},
): SajuResult<SajuReading> {
  const today = opts.today ?? new Date();

  const normalized = normalize(raw);
  if (!normalized.ok) return normalized;
  const input = normalized.value;

  const solarYmd = resolveSolarYmd(input);
  if (!solarYmd.ok) return solarYmd;

  const solarTime = toSolarTime(input, { solarYmd: solarYmd.value });
  if (!solarTime.ok) return solarTime;

  const chartResult = computeChart(input, solarTime.value);
  if (!chartResult.ok) return chartResult;
  const chart = chartResult.value;

  const timelineResult = buildTimeline(input, solarTime.value, chart.dayMaster, { today });
  if (!timelineResult.ok) return timelineResult;
  const timeline = timelineResult.value;

  const currentYear = today.getFullYear();
  const cards: DaeunCard[] = timeline.entries.map((e) => ({
    index: e.index,
    startAge: e.startAge,
    endAge: e.endAge,
    startYear: e.startYear,
    endYear: e.endYear,
    ganji: `${e.pillar.stemHanja}${e.pillar.branchHanja}`,
    ganjiKo: `${e.pillar.stem}${e.pillar.branch}`,
    tenGod: e.tenGod,
    category: e.category,
    isCurrent: e.isCurrent,
    prefix: daeunPrefix(e.startYear, e.endYear, currentYear),
    text: DAEUN_TEXT[e.tenGod],
    theme: INTERPRET[e.category].daeun,
    stemColor: ELEMENT_COLOR[e.pillar.stemElement],
    branchColor: ELEMENT_COLOR[e.pillar.branchElement],
  }));

  const topics = summarizeTopics(chart);

  // ── 부가 운세. 점수 없이 문장만. ──
  const dm = chart.dayMaster;
  const dmLabel = `${dm.stemHanja}${dm.stem}`;
  const dailyRes = dailyFortune(dm, today);
  const daily: DailyReading | null = dailyRes.ok
    ? {
        ganji: dailyRes.value.ganji,
        tenGod: dailyRes.value.tenGod,
        category: dailyRes.value.category,
        date: `${dailyRes.value.date.year}년 ${dailyRes.value.date.month}월 ${dailyRes.value.date.day}일`,
        lead: dailyLead(dmLabel, dailyRes.value.ganji, dailyRes.value.tenGod),
        text: INTERPRET[dailyRes.value.category].daily,
      }
    : null;

  const yearRes = yearFortune(dm, today.getFullYear(), today);
  const year: YearReading | null = yearRes.ok
    ? {
        year: yearRes.value.year,
        ganji: yearRes.value.ganji,
        tenGod: yearRes.value.tenGod,
        category: yearRes.value.category,
        lead: yearLead(yearRes.value.year, yearRes.value.ganji, yearRes.value.tenGod),
        text: INTERPRET[yearRes.value.category].monthly.replace('달', '해'),
        months: yearRes.value.months.map((m) => ({
          label: m.label,
          ganji: m.ganji,
          tenGod: m.tenGod,
          category: m.category,
          text: INTERPRET[m.category].monthly,
          color: ELEMENT_COLOR[m.pillar.stemElement],
        })),
      }
    : null;

  return {
    ok: true,
    value: {
      chart,
      daily,
      year,
      timeline,
      cards,
      dayMasterText: DAY_MASTER_TEXT[chart.dayMaster.stem],
      hourUnknown: chart.hourUnknown,
      topics,
      gloss: GLOSS,
    },
  };
}

/**
 * 십성 카테고리 분포로 성격·직업·애정·재물을 고른다.
 * 원본 topics() 를 옮기되 난수 없이, 데이터에서만 뽑는다.
 */
function summarizeTopics(chart: SajuChart): SajuReading['topics'] {
  const counts: Record<TenGodCategory, number> = {
    비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0,
  };

  const bump = (god: string) => {
    const cat = TEN_GOD_CATEGORY[god as keyof typeof TEN_GOD_CATEGORY];
    if (cat) counts[cat] += 1;
  };

  const { year, month, day, hour } = chart.tenGods;
  bump(year.stem); bump(year.branch);
  bump(month.stem); bump(month.branch);
  bump(day.branch); // 일간은 자기 자신이라 세지 않는다
  if (hour) { bump(hour.stem); bump(hour.branch); }

  let dominant: TenGodCategory = '비겁';
  let max = -1;
  for (const [cat, n] of Object.entries(counts) as [TenGodCategory, number][]) {
    if (n > max) { max = n; dominant = cat; }
  }

  const spouseCategory = TEN_GOD_CATEGORY[
    chart.tenGods.day.branch as keyof typeof TEN_GOD_CATEGORY
  ] ?? '비겁';

  return {
    dominant,
    personality: INTERPRET[dominant].personality,
    career: INTERPRET[dominant].career,
    love: INTERPRET[spouseCategory].love,
    money: moneyText(counts.재성),
  };
}

/**
 * 궁합 — 두 사람의 원국을 받아 관계의 결을 본다.
 * 점수를 내지 않는다. "78점"은 아무것도 설명하지 않지만
 * "상생이라 함께 있을수록 힘이 된다"는 읽힌다.
 */
export interface GunghapReading {
  title: string;
  body: string;
  branchNote: string | null;
  pairLabel: string;
}

export function computeGunghap(
  a: RawFormValues,
  b: RawFormValues,
  opts: ComputeOptions = {},
): SajuResult<GunghapReading> {
  const ra = computeReading(a, opts);
  if (!ra.ok) return ra;
  const rb = computeReading(b, opts);
  if (!rb.ok) return rb;

  const g: Gunghap = gunghap(ra.value.chart.dayMaster, rb.value.chart.dayMaster);
  const t = GUNGHAP_TEXT[g.kind];
  const da = ra.value.chart.dayMaster;
  const db = rb.value.chart.dayMaster;

  return {
    ok: true,
    value: {
      title: t.title,
      body: t.body,
      branchNote: g.branchHarmony
        ? BRANCH_HARMONY_TEXT
        : g.branchClash
          ? BRANCH_CLASH_TEXT
          : null,
      pairLabel: `${da.stemHanja}${da.stem}${da.stemElement} · ${db.stemHanja}${db.stem}${db.stemElement}`,
    },
  };
}

export type { DailyFortune, YearFortune };
export type { SajuChart, DaeunTimeline, RawFormValues } from '../core/types';
