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
import { findSinsal, groupSinsal } from '../core/sinsal';
import { categoryToElement, yongsin } from '../core/yongsin';
// DOM 전역에 Element 가 있어 우리 오행 타입과 부딪힌다. 이름을 바꿔 가져온다.
import type { Element as OhaengElement } from '../core/types';
import {
  hiddenReading,
  hoursOfDay,
  isVoidDay,
  natalContacts,
  transitYongsin,
} from '../core/transit';
import {
  HOURS_INTRO,
  HOUR_TEN_GOD_HINT,
  NATAL_CONTACT_TEXT,
  TRANSIT_HIDDEN_INTRO,
  TRANSIT_YONGSIN_TEXT,
  VOID_DAY_TEXT,
} from '../text/transit-text';
import {
  branchPairs,
  combinedBalance,
  figuresOf,
  sinsalCross,
  stageCross,
  stemHarmonyOf,
  yongsinCross,
} from '../core/compat';
import {
  BRANCH_PAIR_TEXT,
  BRANCH_RELATION_LABEL,
  COMPARE_NOTE,
  POLARITY_COMPARE_TEXT,
  COMBINED_TEXT,
  CROSS_SINSAL_TEXT,
  STAGE_CROSS_TEXT,
  STEM_HARMONY_TEXT,
  YONGSIN_CROSS_TEXT,
} from '../text/gunghap-text';
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
  NO_SINSAL_TEXT, SINSAL_INTRO, SINSAL_METHOD_NOTE, SINSAL_TEXT,
} from '../text/sinsal-text';
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

  /** ★용신 관점★ 오늘 들어오는 기운이 내게 필요한 것인가 */
  yongsin: { verdict: string; brings: string[]; need: string; text: string };
  /** 원국 네 자리 중 오늘이 건드리는 곳 */
  contacts: Array<{ palace: string; pair: string; label: string; text: string }>;
  /** 오늘이 내 공망에 드는가 */
  voidDay: { yes: boolean; text: string };
  /** 오늘 지지에 숨은 천간이 내게 어떤 십성인가 */
  hidden: { glyph: string; tenGods: string[]; text: string };
  /** 열두 시진 */
  hours: Array<{ name: string; range: string; ganji: string; tenGod: string; hint: string; isNow: boolean }>;
  hoursNote: string;
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
  /** ★용신 관점★ 올해 들어오는 기운이 내게 필요한 것인가 */
  yongsin: { verdict: string; brings: string[]; need: string; text: string };
  /** 원국 네 자리 중 올해가 건드리는 곳 */
  contacts: Array<{ palace: string; pair: string; label: string; text: string }>;
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

export interface SinsalCard {
  name: string;
  hanja: string;
  short: string;
  body: string;
  /** 어느 자리에 있는가 */
  palaces: string[];
  glyphs: string[];
  /** 무엇을 기준으로 판정했는가 — 사용자가 대조할 수 있게 */
  bases: string[];
}

export interface SinsalReading {
  intro: string;
  methodNote: string;
  items: SinsalCard[];
  /** 하나도 없을 때의 안내 */
  emptyText: string | null;
}

export interface SajuReading {
  chart: SajuChart;
  /** 신살 — 겁주지 않고 기운의 결로 읽는다 */
  sinsal: SinsalReading;
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

  const chartResult = computeChart(input, solarTime.value, solarYmd.value);
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
  const detail = natalDetail(chart.pillars);
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

  // ── 신살 ──
  // 이름에 살(殺) 이 붙어 겁주는 데 쓰여 왔지만 실제로는 기운의 결이다.
  // 근거(어느 자리 기준으로 어느 글자를 봤는지)를 같이 낸다.
  const sinsalGroups = groupSinsal(findSinsal(chart.pillars));
  const sinsal: SinsalReading = {
    intro: SINSAL_INTRO,
    methodNote: SINSAL_METHOD_NOTE,
    items: sinsalGroups.map((g) => ({
      name: g.name,
      hanja: SINSAL_TEXT[g.name].hanja,
      short: SINSAL_TEXT[g.name].short,
      body: SINSAL_TEXT[g.name].body,
      palaces: g.palaces,
      glyphs: g.glyphs,
      bases: g.bases,
    })),
    emptyText: sinsalGroups.length === 0 ? NO_SINSAL_TEXT : null,
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
  /*
   * 운을 본다는 건 지나가는 간지가 내 원국 위를 어떻게 지나가느냐를 보는
   * 일이다. 원국을 안 보면 그 날 태어난 사람 모두에게 같은 말이 된다.
   * 용신·공망·네 지지를 이미 갖고 있으니 여기서 쓴다.
   */
  const needEl = yongsinReading.primaryElement as OhaengElement;
  const avoidEls: OhaengElement[] = yongsinReading.avoid.map(
    (c) => categoryToElement(dm.stemElement as never, c as never),
  );

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
        ...(() => {
          const p = dailyRes.value.pillar;
          const ty = transitYongsin(p.stem, p.branch, needEl, avoidEls);
          const cs = natalContacts(chart.pillars, p.branch);
          const isVoid = isVoidDay(detail.voidBranches, p.branch);
          const hid = hiddenReading(dm.stem, p.branch);
          return {
            yongsin: {
              verdict: ty.verdict,
              brings: ty.brings.map(String),
              need: String(needEl),
              text: TRANSIT_YONGSIN_TEXT(ty.verdict, '오늘', needEl, ty.needed.length, ty.unwanted.length),
            },
            contacts: cs.map((c) => ({
              palace: String(c.palace),
              pair: `${c.natalGlyph} · ${p.branch}`,
              label: BRANCH_RELATION_LABEL[c.relation],
              text: NATAL_CONTACT_TEXT(c.palace, c.relation),
            })),
            voidDay: { yes: isVoid, text: isVoid ? VOID_DAY_TEXT.replace(/\*\*/g, '') : '' },
            hidden: { glyph: hid.glyph, tenGods: hid.tenGods.map(String), text: TRANSIT_HIDDEN_INTRO },
            hours: hoursOfDay(dm.stem, p.stem, today.getHours()).map((h) => ({
              name: h.name,
              range: h.range,
              ganji: h.ganji,
              tenGod: String(h.tenGod),
              hint: HOUR_TEN_GOD_HINT[h.tenGod] ?? '',
              isNow: h.isNow,
            })),
            hoursNote: HOURS_INTRO,
          };
        })(),
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
        ...(() => {
          const p = yearRes.value.pillar;
          const ty = transitYongsin(p.stem, p.branch, needEl, avoidEls);
          const cs = natalContacts(chart.pillars, p.branch);
          return {
            yongsin: {
              verdict: ty.verdict,
              brings: ty.brings.map(String),
              need: String(needEl),
              text: TRANSIT_YONGSIN_TEXT(ty.verdict, '올해', needEl, ty.needed.length, ty.unwanted.length),
            },
            contacts: cs.map((c) => ({
              palace: String(c.palace),
              pair: `${c.natalGlyph} · ${p.branch}`,
              label: BRANCH_RELATION_LABEL[c.relation],
              text: NATAL_CONTACT_TEXT(c.palace, c.relation),
            })),
          };
        })(),
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
      sinsal,
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

  /** 두 일간이 합을 이루는가 (갑기합토 …) */
  stemHarmony: { label: string; text: string } | null;
  /** ★용신 교차★ 상대가 내게 필요한 오행을 갖고 있는가 */
  yongsin: Array<{
    who: '나' | '상대';
    need: string;
    partnerHas: number;
    partnerAvoid: number;
    verdict: string;
    text: string;
  }>;
  /** 년지·월지·일지를 각각 본 관계 */
  branchPairs: Array<{ palace: string; pair: string; label: string; text: string }>;
  /** 상대 곁에서 내가 어떤 상태가 되는가 (십이운성) */
  stages: Array<{ who: '나' | '상대'; stage: string; outwardness: number; text: string }>;
  /** 둘을 합치면 오행이 고루 차는가 */
  combined: { counts: Record<string, number>; filledTogether: string[]; stillMissing: string[]; text: string };
  /** 두 사람 사이에 걸리는 원진·귀문관 */
  sinsal: Array<{ name: string; palace: string; pair: string; text: string }>;
  /** 두 사람의 사주팔자 — 나란히 놓고 본다 */
  charts: { a: GunghapChart; b: GunghapChart };
  /**
   * 정량 비교 — 문장 대신 숫자를 그대로 낸다.
   *
   * "많다 적다" 는 사람마다 다르게 읽힌다. 나란히 세어 보여주면 읽는 분이
   * 직접 견줄 수 있다. 점수를 안 내는 대신 하는 일이 이것이다.
   */
  compare: {
    elements: Array<{ element: string; a: number; b: number; aHidden: number; bHidden: number }>;
    polarity: { a: { yang: number; yin: number }; b: { yang: number; yin: number }; text: string };
    glyphCount: { a: number; b: number };
    note: string;
  };
}

export interface GunghapChart {
  dayMaster: string;
  year: string;
  month: string;
  day: string;
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

  // ── 여기부터가 심화 ── 이미 계산해둔 것을 궁합에도 쓴다
  const ya = ra.value.yongsin;
  const yb = rb.value.yongsin;
  const harmony = stemHarmonyOf(da.stem, db.stem);
  const pairs = branchPairs(ca.pillars, cb.pillars);
  /*
   * 용신 판정은 십성 갈래(비겁·식상…)로 나오는데 궁합에서는 오행으로
   * 세야 한다. 같은 표로 옮긴다 — 일간 오행을 기준으로 한 칸씩이다.
   */
  const avoidElements = (r: typeof ya, dayElement: string) =>
    r.avoid.map((c) => categoryToElement(dayElement as never, c as never));
  const crossA = yongsinCross(
    ya.primaryElement as never,
    avoidElements(ya, ca.dayMaster.stemElement),
    cb.elementCounts,
  );
  const crossB = yongsinCross(
    yb.primaryElement as never,
    avoidElements(yb, cb.dayMaster.stemElement),
    ca.elementCounts,
  );
  const stageA = stageCross(da.stem, cb.pillars.day.branch);
  const stageB = stageCross(db.stem, ca.pillars.day.branch);
  const combined = combinedBalance(ca.elementCounts, cb.elementCounts);
  const crossSinsal = sinsalCross(ca.pillars, cb.pillars);
  const gz = (p: { stem: string; branch: string }) => `${p.stem}${p.branch}`;

  return {
    ok: true,
    value: {
      stemHarmony: harmony.present && harmony.label
        ? { label: harmony.label, text: STEM_HARMONY_TEXT(harmony.becomes as string) }
        : null,
      yongsin: [
        {
          who: '나' as const,
          ...crossA,
          need: String(crossA.need),
          text: YONGSIN_CROSS_TEXT(crossA.verdict, '상대', crossA.need),
        },
        {
          who: '상대' as const,
          ...crossB,
          need: String(crossB.need),
          text: YONGSIN_CROSS_TEXT(crossB.verdict, '나', crossB.need),
        },
      ],
      branchPairs: pairs.map((p) => ({
        palace: p.palace,
        pair: `${p.aGlyph} · ${p.bGlyph}`,
        label: BRANCH_RELATION_LABEL[p.relation],
        text: BRANCH_PAIR_TEXT(p.palace, p.relation),
      })),
      stages: [
        { who: '나' as const, stage: stageA.stage, outwardness: stageA.outwardness, text: STAGE_CROSS_TEXT('상대', stageA.stage) },
        { who: '상대' as const, stage: stageB.stage, outwardness: stageB.outwardness, text: STAGE_CROSS_TEXT('나', stageB.stage) },
      ],
      combined: { ...combined, text: COMBINED_TEXT(combined.filledTogether, combined.stillMissing) },
      sinsal: crossSinsal.map((x) => ({
        name: x.name,
        palace: x.palace,
        pair: `${x.aGlyph} · ${x.bGlyph}`,
        text: CROSS_SINSAL_TEXT[x.name],
      })),
      charts: {
        a: { dayMaster: gz(da), year: gz(ca.pillars.year), month: gz(ca.pillars.month), day: gz(ca.pillars.day) },
        b: { dayMaster: gz(db), year: gz(cb.pillars.year), month: gz(cb.pillars.month), day: gz(cb.pillars.day) },
      },
      compare: (() => {
        const fa = figuresOf(ca.pillars);
        const fb = figuresOf(cb.pillars);
        const ORDER = ['목', '화', '토', '금', '수'] as const;
        return {
          elements: ORDER.map((e) => ({
            element: e,
            a: fa.surface[e] ?? 0,
            b: fb.surface[e] ?? 0,
            aHidden: fa.withHidden[e] ?? 0,
            bHidden: fb.withHidden[e] ?? 0,
          })),
          polarity: {
            a: { yang: fa.polarity.yang, yin: fa.polarity.yin },
            b: { yang: fb.polarity.yang, yin: fb.polarity.yin },
            text: POLARITY_COMPARE_TEXT(fa.polarity.yangRatio, fb.polarity.yangRatio),
          },
          glyphCount: { a: fa.glyphCount, b: fb.glyphCount },
          note: COMPARE_NOTE(fa.glyphCount, fb.glyphCount),
        };
      })(),
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

/**
 * 특정 해의 세운만 다시 뽑는다.
 *
 * 신년운세가 올해로 고정돼 있었다. 그런데 사람들이 신년에 궁금해하는 건
 * 보통 **다음 해**다 — 12월에 "올해 어땠나" 를 보러 오지 않는다.
 * 전체를 다시 계산하면 오늘·대운까지 그 해 기준으로 밀려버리므로
 * 세운만 따로 낸다.
 */
export function computeYearOnly(
  raw: RawFormValues,
  year: number,
  opts: ComputeOptions = {},
): SajuResult<YearReading> {
  const base = computeReading(raw, opts);
  if (!base.ok) return base;
  const chart = base.value.chart;
  const today = opts.today ?? new Date();

  const res = yearFortune(chart.dayMaster, year, today);
  if (!res.ok) return res;

  const ya = base.value.yongsin;
  const needEl = ya.primaryElement as OhaengElement;
  const avoidEls: OhaengElement[] = ya.avoid.map(
    (c) => categoryToElement(chart.dayMaster.stemElement as never, c as never),
  );
  const p = res.value.pillar;
  const ty = transitYongsin(p.stem, p.branch, needEl, avoidEls);
  const cs = natalContacts(chart.pillars, p.branch);

  return {
    ok: true,
    value: {
      year: res.value.year,
      ganji: res.value.ganji,
      tenGod: res.value.tenGod,
      category: res.value.category,
      lead: yearLead(res.value.year, res.value.ganji, res.value.tenGod),
      text: INTERPRET[res.value.category].monthly.replace('달', '해'),
      yongsin: {
        verdict: ty.verdict,
        brings: ty.brings.map(String),
        need: String(needEl),
        text: TRANSIT_YONGSIN_TEXT(ty.verdict, '올해', needEl, ty.needed.length, ty.unwanted.length),
      },
      contacts: cs.map((c) => ({
        palace: String(c.palace),
        pair: `${c.natalGlyph} · ${p.branch}`,
        label: BRANCH_RELATION_LABEL[c.relation],
        text: NATAL_CONTACT_TEXT(c.palace, c.relation),
      })),
      withDaeun: (() => {
        const cur = base.value.timeline.entries.find((e) => e.isCurrent);
        if (!cur) return null;
        const rel = branchRelationBetween(cur.pillar.branch, p.branch);
        return {
          daeunGanji: `${cur.pillar.stemHanja}${cur.pillar.branchHanja}`,
          daeunTenGod: cur.tenGod,
          relation: rel,
          text: DAEUN_YEAR_TEXT[rel] ?? '',
        };
      })(),
      months: res.value.months.map((m) => ({
        label: m.label,
        ganji: m.ganji,
        tenGod: m.tenGod,
        category: m.category,
        text: INTERPRET[m.category].monthly,
        color: ELEMENT_COLOR[m.pillar.stemElement],
      })),
    },
  };
}

export type { SajuChart, DaeunTimeline, RawFormValues } from '../core/types';
