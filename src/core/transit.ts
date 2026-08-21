/**
 * 명리서재 — 운이 원국을 지나갈 때
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 다시 쓰나
 *
 * 궁합이 얕았던 이유와 같다. 오늘의 일진과 올해의 세운은 **일간 하나와
 * 일지 하나**만 보고 있었다. 용신도 공망도 원국 네 지지도 다 계산해두고
 * 정작 운을 볼 때는 안 썼다.
 *
 * 운을 본다는 건 지나가는 간지가 **내 원국 위를 어떻게 지나가느냐**를 보는
 * 일이다. 원국을 안 보면 그건 그냥 그날의 간지일 뿐, 누구에게나 같은 말이
 * 된다. 오늘의 운세가 다 비슷비슷한 이유가 그것이다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기서 더 보는 것
 *
 *   용신 관점    오늘(올해)이 내게 **필요한** 기운인가, 눌러야 할 기운인가  ★
 *   원국 대조    네 지지 각각과 합·충·형을 이루는가 (기존은 일지만)
 *   공망         오늘 지지가 내 공망에 걸리는가
 *   지장간       겉 글자만이 아니라 지지 안에 숨은 천간까지
 *
 * 용신 관점이 제일 무겁다. "오늘은 정재의 날입니다" 는 누구에게나 같은
 * 말이지만 "오늘 들어오는 수(水)가 마침 당신에게 필요한 기운입니다" 는
 * 그 사람에게만 하는 말이다.
 */

import { BRANCH_KO, STEM_KO } from './constants';
import { branchRelationOf, type BranchRelation } from './fortune';
import { HIDDEN_STEMS, branchTenGods, tenGodBetween, type TenGodName } from './pillars';
import type { Branch, Element, FourPillars, Palace } from './types';

const ELEMENTS: readonly Element[] = ['목', '화', '토', '금', '수'];
const stemIdx = (ko: string) => STEM_KO.indexOf(ko as never);
const branchIdx = (ko: string) => BRANCH_KO.indexOf(ko as never);

/* ── 용신 관점 ──────────────────────────────────────────────────────── */

export interface TransitYongsin {
  /** 지나가는 간지가 데려오는 오행들 (천간 + 지지 + 지장간) */
  brings: Element[];
  /** 그중 내게 필요한 것 */
  needed: Element[];
  /** 그중 눌러야 할 것 */
  unwanted: Element[];
  verdict: '숨통이 트인다' | '무난하다' | '버겁다';
}

/**
 * 지나가는 간지가 내게 어떤 기운을 데려오는가.
 *
 * 겉 두 글자만 세지 않는다. 지지 안에 숨은 천간(지장간)까지 세야 그 날에
 * 실제로 도는 기운이 나온다 — 겉으로 토(土)인 진(辰) 안에는 을(乙)과
 * 계(癸)가 들어 있다.
 */
export function transitYongsin(
  stem: string,
  branch: string,
  need: Element,
  avoid: readonly Element[],
): TransitYongsin {
  const brings: Element[] = [];
  const si = stemIdx(stem);
  if (si >= 0) brings.push(ELEMENTS[Math.floor(si / 2)] as Element);
  for (const hidden of HIDDEN_STEMS[branchIdx(branch)] ?? []) {
    brings.push(ELEMENTS[Math.floor(hidden / 2)] as Element);
  }

  const needed = brings.filter((e) => e === need);
  const unwanted = brings.filter((e) => avoid.includes(e));
  const verdict: TransitYongsin['verdict'] =
    needed.length > unwanted.length ? '숨통이 트인다'
    : unwanted.length > needed.length + 1 ? '버겁다'
    : '무난하다';

  return { brings: [...new Set(brings)], needed, unwanted, verdict };
}

/* ── 원국 네 지지와의 대조 ──────────────────────────────────────────── */

export interface NatalContact {
  palace: Palace;
  natalGlyph: string;
  relation: BranchRelation;
}

/**
 * 지나가는 지지가 원국의 어느 자리를 건드리는가.
 *
 * 일지만 보면 "왜 오늘 유독 집안일이 얽히나" 가 안 보인다. 자리마다
 * 건드리는 데가 다르다 — 년지는 집안, 월지는 일과 환경, 일지는 나 자신과
 * 배우자, 시지는 자식과 말년이다.
 */
export function natalContacts(pillars: FourPillars, branch: string): NatalContact[] {
  const rows: Array<[Palace, string]> = [
    ['년주', pillars.year.branch],
    ['월주', pillars.month.branch],
    ['일주', pillars.day.branch],
  ];
  if (pillars.hour) rows.push(['시주', pillars.hour.branch]);

  return rows
    .map(([palace, natalGlyph]) => ({
      palace,
      natalGlyph,
      relation: branchRelationOf(branchIdx(natalGlyph), branchIdx(branch)),
    }))
    .filter((c) => c.relation !== 'none');
}

/* ── 공망 ───────────────────────────────────────────────────────────── */

/**
 * 오늘이 내 공망에 걸리는가.
 *
 * 공망은 비어 있는 자리다. 그 날에 벌인 일이 손에 안 잡히거나 김이 빠지는
 * 느낌으로 본다. 나쁜 날이라는 뜻이 아니라 **결실을 재촉하기에 맞지 않는
 * 날**이라는 뜻이다 — 정리하고 쉬기에는 오히려 좋다.
 */
export const isVoidDay = (voidBranches: readonly Branch[], branch: string): boolean =>
  voidBranches.includes(branch as Branch);

/* ── 지장간 십성 ────────────────────────────────────────────────────── */

export interface HiddenReading {
  glyph: string;
  tenGods: TenGodName[];
}

/**
 * 지지에 숨은 천간이 내 일간에게 어떤 십성인가.
 *
 * 겉의 정기(正氣)만 보면 그 날의 결이 한 줄로 납작해진다. 셋이 들어 있는
 * 지지는 셋 다 본다.
 */
export const hiddenReading = (dayStem: string, branch: string): HiddenReading => ({
  glyph: branch,
  tenGods: branchTenGods(stemIdx(dayStem), branchIdx(branch)),
});

/* ── 오늘의 열두 시진 ───────────────────────────────────────────────── */

export interface HourSlot {
  /** 자시 · 축시 … */
  name: string;
  /** "23~01시" */
  range: string;
  ganji: string;
  tenGod: TenGodName;
  /** 지금 이 시각인가 */
  isNow: boolean;
}

const BRANCH_HOURS = [
  '23~01', '01~03', '03~05', '05~07', '07~09', '09~11',
  '11~13', '13~15', '15~17', '17~19', '19~21', '21~23',
];

/**
 * 오늘 하루를 열두 시진으로 나눠 각각의 간지와 십성을 낸다.
 *
 * "오늘 어느 시간이 좋은가" 는 사람들이 실제로 궁금해하는 것인데, 하루를
 * 한 덩어리로만 말하면 답할 수가 없다. 시주는 일간에서 규칙으로 나오므로
 * (오자시두법) 열두 칸을 전부 낼 수 있다.
 *
 * 좋고 나쁨으로 줄 세우지 않는다. 어떤 결의 시간인지만 적는다.
 */
export function hoursOfDay(
  myDayStem: string,
  todayDayStem: string,
  nowHour: number,
): HourSlot[] {
  const rat = (stemIdx(todayDayStem) * 2) % 10; // 오자시두법
  const me = stemIdx(myDayStem);
  return BRANCH_HOURS.map((range, b) => {
    const stem = (rat + b) % 10;
    return {
      name: `${BRANCH_KO[b]}시`,
      range: `${range}시`,
      ganji: `${STEM_KO[stem]}${BRANCH_KO[b]}`,
      tenGod: tenGodBetween(me, stem),
      isNow: b === Math.floor(((nowHour + 1) % 24) / 2),
    };
  });
}
