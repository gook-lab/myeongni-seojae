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
import { branchRelationBetween, dailyFortune, gunghap, yearFortune } from '../core/fortune';
import type { Gunghap } from '../core/fortune';
import type { SajuResult } from '../core/errors';
import { normalize, resolveSolarYmd } from '../core/input';
import { toSolarTime } from '../core/korea-time';
import { computeChart } from '../core/manse';
import { natalDetail } from '../core/natal';
import { yongsin } from '../core/yongsin';
import type {
  DaeunTimeline,
  RawFormValues,
  SajuChart,
  TenGodCategory,
} from '../core/types';
import { STAGE_HANJA } from '../core/twelve-stages';
import { DAEUN_TEXT, daeunPrefix } from '../text/daeun-text';
import { STAGE_TEXT } from '../text/stage-text';
import {
  EXCESSIVE_ELEMENT_TEXT, HIDDEN_INTRO, MISSING_ELEMENT_TEXT,
  PALACE_CATEGORY_TEXT, PALACE_MEANING, VOID_TEXT,
  balanceLead, missingLead,
} from '../text/natal-text';
import {
  ELEMENT_PRACTICAL, FACTOR_TEXT, METHOD_NOTE, VERDICT_TEXT,
  YONGSIN_ADVICE, strengthLead,
} from '../text/yongsin-text';
import {
  BRANCH_RELATION_TEXT, GUNGHAP_TEXT, MUTUAL_TEN_GOD_TEXT,
  DAEUN_YEAR_TEXT, DAILY_BRANCH_TEXT, complementText, dailyLead, yearLead,
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
  /** 십이운성 — 그 10년 동안 일간이 놓이는 자리 */
  stage: string;
  stageHanja: string;
  /** 밖으로 뻗는 힘 0~1. 좋고 나쁨이 아니다 */
  outwardness: number;
  stageText: string;
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
  /** 지지 십성 — 원본은 천간만 봤다 */
  branchTenGod: string | null;
  /** 오늘 일진 지지에서 내 일간이 놓이는 자리 */
  stage: string;
  stageText: string;
  /** 내 일지와의 합충 */
  branchNote: string;
}

export interface YearReading {
  year: number;
  ganji: string;
  tenGod: string;
  category: TenGodCategory;
  lead: string;
  text: string;
  /**
   * 올해 세운이 지금 대운과 어떤 관계인가.
   * 명리에서 실제로 크게 보는 대목인데 원본은 아예 안 봤다.
   */
  withDaeun: {
    daeunGanji: string;
    daeunTenGod: string;
    relation: string;
    text: string;
  } | null;
  months: Array<{
    label: string;
    ganji: string;
    tenGod: string;
    category: TenGodCategory;
    text: string;
    color: string;
  }>;
}

export interface PalaceCard {
  palace: string;
  span: string;
  domain: string;
  ganji: string;
  stemTenGod: string;
  /** 지장간 십성 — 지지에 숨은 힘 */
  hidden: string[];
  stage: string;
  isVoid: boolean;
  text: string;
  voidText: string | null;
}

export interface BalanceReading {
  counts: Record<string, number>;
  lead: string;
  /** 없는 오행에 대한 안내. 없으면 null */
  missing: { lead: string; notes: string[] } | null;
  /** 넘치는 오행에 대한 안내 */
  excessive: string[];
  hiddenIntro: string;
}

export interface StrengthFactorCard {
  label: string;
  ok: boolean;
  text: string;
}

export interface YongsinReading {
  /** 어떤 방법을 썼는지 반드시 밝힌다 */
  method: string;
  methodNote: string;
  verdict: string;
  verdictText: string;
  lead: string;
  /** 0~1 */
  score: number;
  factors: StrengthFactorCard[];
  /** 자리별 근거 — 판정만 던지지 않는다 */
  slots: Array<{
    slot: string;
    glyph: string;
    tenGod: string;
    category: string;
    supports: boolean;
    signed: number;
  }>;
  primary: string;
  primaryElement: string;
  advice: string;
  practical: { color: string; direction: string };
  helpful: string[];
  avoid: string[];
}

export interface SajuReading {
  chart: SajuChart;
  /** 신강·신약과 용신 (억부용신법) */
  yongsin: YongsinReading;
  /** 궁위 — 십성이 인생의 어느 자리에 있는가 */
  palaces: PalaceCard[];
  balance: BalanceReading;
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
    stage: e.stage,
    stageHanja: STAGE_HANJA[e.stage],
    outwardness: e.outwardness,
    stageText: STAGE_TEXT[e.stage],
    isCurrent: e.isCurrent,
    prefix: daeunPrefix(e.startYear, e.endYear, currentYear),
    text: DAEUN_TEXT[e.tenGod],
    theme: INTERPRET[e.category].daeun,
    stemColor: ELEMENT_COLOR[e.pillar.stemElement],
    branchColor: ELEMENT_COLOR[e.pillar.branchElement],
  }));

  const topics = summarizeTopics(chart);

  // ── 원국 심화 ──
  // 원본은 십성 카운트 하나(dominant)로 성격·직업을 정했다.
  // 여덟 자를 계산해놓고 뭉갠 것이라 자리(궁위)와 지장간을 되살린다.
  const detail = natalDetail(chart.pillars, solarTime.value, input.yajasi === 'advance-day' ? 1 : 2);
  const palaces: PalaceCard[] = detail.palaces.map((p) => {
    const meaning = PALACE_MEANING[p.palace];
    const cat = p.branchTenGod
      ? TEN_GOD_CATEGORY[p.branchTenGod]
      : p.stemTenGod
        ? TEN_GOD_CATEGORY[p.stemTenGod]
        : '비겁';
    return {
      palace: p.palace,
      span: meaning.span,
      domain: meaning.domain,
      ganji: `${p.pillar.stemHanja}${p.pillar.branchHanja}`,
      stemTenGod: p.stemTenGod ?? '일간',
      hidden: p.hiddenTenGods,
      stage: p.stage,
      isVoid: p.isVoid,
      text: PALACE_CATEGORY_TEXT[p.palace][cat],
      voidText: p.isVoid ? VOID_TEXT[p.palace] : null,
    };
  });

  // ── 신강·신약과 용신 (억부용신법) ──
  const y = yongsin(chart.pillars);
  const st = y.strength;
  const yongsinReading: YongsinReading = {
    method: y.method,
    methodNote: METHOD_NOTE,
    verdict: st.verdict,
    verdictText: VERDICT_TEXT[st.verdict],
    lead: strengthLead(st.score, st.supportWeight, st.drainWeight, st.slots.length),
    score: st.score,
    factors: [
      { label: FACTOR_TEXT.득령.label, ok: st.deukryeong, text: st.deukryeong ? FACTOR_TEXT.득령.yes : FACTOR_TEXT.득령.no },
      { label: FACTOR_TEXT.득지.label, ok: st.deukji, text: st.deukji ? FACTOR_TEXT.득지.yes : FACTOR_TEXT.득지.no },
      { label: FACTOR_TEXT.득세.label, ok: st.deukse, text: st.deukse ? FACTOR_TEXT.득세.yes : FACTOR_TEXT.득세.no },
    ],
    slots: st.slots.map((sl) => ({
      slot: sl.slot,
      glyph: sl.glyph,
      tenGod: sl.tenGod,
      category: sl.category,
      supports: sl.supports,
      signed: sl.signed,
    })),
    primary: y.primary,
    primaryElement: y.primaryElement,
    advice: YONGSIN_ADVICE[y.primary],
    practical: ELEMENT_PRACTICAL[y.primaryElement],
    helpful: y.helpful,
    avoid: y.avoid,
  };

  const bal = detail.balance;
  const balance: BalanceReading = {
    counts: bal.counts,
    lead: balanceLead(bal.total, bal.strongest, bal.counts[bal.strongest]),
    missing:
      bal.missing.length > 0
        ? {
            lead: missingLead(bal.missing),
            notes: bal.missing.map((e) => MISSING_ELEMENT_TEXT[e]),
          }
        : null,
    excessive: bal.excessive.map((e) => EXCESSIVE_ELEMENT_TEXT[e]),
    hiddenIntro: HIDDEN_INTRO,
  };

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
        branchTenGod: dailyRes.value.branchTenGod,
        stage: dailyRes.value.stage,
        stageText: STAGE_TEXT[dailyRes.value.stage],
        branchNote: DAILY_BRANCH_TEXT[dailyRes.value.withMyBranch] ?? '',
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
        withDaeun: (() => {
          const cur = timeline.entries.find((e) => e.isCurrent);
          if (!cur) return null;
          const rel = branchRelationBetween(cur.pillar.branch, yearRes.value.pillar.branch);
          return {
            daeunGanji: `${cur.pillar.stemHanja}${cur.pillar.branchHanja}`,
            daeunTenGod: cur.tenGod,
            relation: rel,
            text: DAEUN_YEAR_TEXT[rel] ?? '',
          };
        })(),
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
      yongsin: yongsinReading,
      palaces,
      balance,
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
  pairLabel: string;
  /** 일지 관계 — 육합 / 삼합 / 충 / 형 / 없음 */
  branchNote: string;
  /** 오행 보완 — 서로 없는 기운을 채워주는가 */
  complement: { a: string; b: string };
  /** 상호 십성 — 상대가 나에게 어떤 역할로 오는가 */
  mutual: { aSeesB: string; bSeesA: string; aText: string; bText: string };
}

/**
 * 궁합 — 두 사람의 명식으로 관계의 결을 본다.
 *
 * 원본은 12자를 계산해놓고 4자(일간·일지)만 썼다. 여기서는 전부 쓴다:
 * 일간 관계 · 일지 관계(육합/삼합/충/형) · 오행 보완 · 상호 십성.
 *
 * 점수를 내지 않는다. "78점"은 아무것도 설명하지 않지만
 * "내게 없던 수(水)를 상대가 둘 갖고 있다"는 읽힌다.
 */
export function computeGunghap(
  a: RawFormValues,
  b: RawFormValues,
  opts: ComputeOptions = {},
): SajuResult<GunghapReading> {
  const ra = computeReading(a, opts);
  if (!ra.ok) return ra;
  const rb = computeReading(b, opts);
  if (!rb.ok) return rb;

  const ca = ra.value.chart;
  const cb = rb.value.chart;
  const g: Gunghap = gunghap(
    { dayMaster: ca.dayMaster, elementCounts: ca.elementCounts },
    { dayMaster: cb.dayMaster, elementCounts: cb.elementCounts },
  );
  const t = GUNGHAP_TEXT[g.kind];
  const da = ca.dayMaster;
  const db = cb.dayMaster;

  return {
    ok: true,
    value: {
      title: t.title,
      body: t.body,
      pairLabel: `${da.stemHanja}${da.stem}${da.stemElement} · ${db.stemHanja}${db.stem}${db.stemElement}`,
      branchNote: BRANCH_RELATION_TEXT[g.branchRelation] ?? BRANCH_RELATION_TEXT.none ?? '',
      complement: {
        a: complementText('나', '상대', g.aReceives.filled, g.aReceives.stillMissing),
        b: complementText('상대', '나', g.bReceives.filled, g.bReceives.stillMissing),
      },
      mutual: {
        aSeesB: g.aSeesB,
        bSeesA: g.bSeesA,
        aText: MUTUAL_TEN_GOD_TEXT[g.aSeesB] ?? '',
        bText: MUTUAL_TEN_GOD_TEXT[g.bSeesA] ?? '',
      },
    },
  };
}

export type { SajuChart, DaeunTimeline, RawFormValues } from '../core/types';
