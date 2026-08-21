/**
 * 명리서재 — 원국 심화 (궁위 · 오행 균형 · 지장간 · 공망)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 *
 * 원본 해석은 십성 카테고리를 세어 가장 많은 것 하나(dominant)로 성격과
 * 직업을 결정했다. 여덟 자를 계산해놓고 카운트 하나로 뭉갠 것이다.
 *
 * 같은 "관성이 많다"도 그것이 어느 자리에 있느냐에 따라 뜻이 다르다.
 * 년주의 관성은 집안·초년의 규율이고, 시주의 관성은 자식·말년의 책임이다.
 * 그 자리를 궁위(宮位)라고 부른다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기서 다루는 네 가지 (전부 유파와 무관하게 계산이 하나다)
 *
 *   궁위      십성이 년/월/일/시 어느 자리에 있는가
 *   오행 균형  없는 오행 · 넘치는 오행
 *   지장간    지지 속에 숨은 천간. 라이브러리가 배열로 주는데 [0]만 쓰고 있었다
 *   공망      비어 있는 자리. 그 궁위의 일이 헛돌기 쉽다고 본다
 *
 * 용신·격국은 넣지 않는다. 신강신약 판정법이 유파마다 갈려 교차 검증할
 * 정답지가 없다.
 */

import {
  branchTenGods,
  tenGodBetween,
  voidBranches as voidBranchesOf,
} from './pillars';
import { BRANCH_KO, STEM_KO } from './constants';
import { twelveStage } from './twelve-stages';
import type {
  Branch,
  Element,
  FourPillars,
  Palace,
  Pillar,
  TenGod,
  TwelveStage,
} from './types';

export type { Palace };

export const PALACE_ORDER: readonly Palace[] = ['년주', '월주', '일주', '시주'];

export interface PalaceReading {
  palace: Palace;
  pillar: Pillar;
  /** 일주의 천간은 일간 자신이라 십성이 없다 */
  stemTenGod: TenGod | null;
  /** 지지 정기의 십성 */
  branchTenGod: TenGod | null;
  /** 지장간 전부의 십성 (정기·중기·여기 순). 지지에 숨은 힘이다 */
  hiddenTenGods: TenGod[];
  /** 일간이 이 지지에서 놓이는 자리 */
  stage: TwelveStage;
  /** 공망 — 비어 있는 자리인가 */
  isVoid: boolean;
}

export interface ElementBalance {
  counts: Record<Element, number>;
  /** 하나도 없는 오행 */
  missing: Element[];
  /** 넷 이상으로 몰린 오행 */
  excessive: Element[];
  strongest: Element;
  /** 가장 적은 오행 (없는 것이 있으면 그중 하나) */
  weakest: Element;
  /** 여덟 자(또는 여섯 자) 중 몇 자가 계산에 들어갔는가 */
  total: number;
}

export interface NatalDetail {
  palaces: PalaceReading[];
  balance: ElementBalance;
  /** 공망에 걸린 지지 (한글) */
  voidBranches: Branch[];
}

const ELEMENT_ORDER: readonly Element[] = ['목', '화', '토', '금', '수'];

const stemIdx = (ko: string): number => STEM_KO.indexOf(ko as never);
const branchIdx = (ko: string): number => BRANCH_KO.indexOf(ko as never);

export function elementBalance(pillars: FourPillars): ElementBalance {
  const counts = Object.fromEntries(ELEMENT_ORDER.map((e) => [e, 0])) as Record<
    Element,
    number
  >;
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(
    (p): p is Pillar => p !== null,
  );
  for (const p of list) {
    counts[p.stemElement] += 1;
    counts[p.branchElement] += 1;
  }

  const missing = ELEMENT_ORDER.filter((e) => counts[e] === 0);
  const excessive = ELEMENT_ORDER.filter((e) => counts[e] >= 4);

  let strongest: Element = '목';
  let weakest: Element = '목';
  for (const e of ELEMENT_ORDER) {
    if (counts[e] > counts[strongest]) strongest = e;
    if (counts[e] < counts[weakest]) weakest = e;
  }

  return {
    counts,
    missing,
    excessive,
    strongest,
    weakest,
    total: list.length * 2,
  };
}

/**
 * 원국 심화 정보를 뽑는다.
 *
 * 지장간별 십성과 공망은 이제 우리 규칙으로 낸다(core/pillars.ts).
 * 지장간은 정기만 보지 않고 전부 읽는다 — 겉에 없는 오행이 지지 안에
 * 숨어 있는 경우가 흔해서, 정기만 보면 그 힘을 통째로 놓친다.
 */
export function natalDetail(pillars: FourPillars): NatalDetail {
  const dayStem = pillars.day.stem;
  const dayStemIndex = stemIdx(dayStem);

  // 공망은 일주 순중(旬中)으로 정한다.
  const voidBranches = voidBranchesOf({
    stem: dayStemIndex,
    branch: branchIdx(pillars.day.branch),
  }).map((b) => BRANCH_KO[b] as Branch);

  const isVoid = (b: Branch) => voidBranches.includes(b);

  const rows: Array<{ palace: Palace; pillar: Pillar | null; hasStemTenGod: boolean }> = [
    { palace: '년주', pillar: pillars.year, hasStemTenGod: true },
    { palace: '월주', pillar: pillars.month, hasStemTenGod: true },
    // 일간은 자기 자신이라 십성이 없다
    { palace: '일주', pillar: pillars.day, hasStemTenGod: false },
    { palace: '시주', pillar: pillars.hour, hasStemTenGod: true },
  ];

  const palaces: PalaceReading[] = [];
  for (const r of rows) {
    if (!r.pillar) continue;
    const hidden = branchTenGods(dayStemIndex, branchIdx(r.pillar.branch)) as TenGod[];
    palaces.push({
      palace: r.palace,
      pillar: r.pillar,
      stemTenGod: r.hasStemTenGod
        ? (tenGodBetween(dayStemIndex, stemIdx(r.pillar.stem)) as TenGod)
        : null,
      branchTenGod: hidden[0] ?? null,
      hiddenTenGods: hidden,
      stage: twelveStage(dayStem, r.pillar.branch),
      isVoid: isVoid(r.pillar.branch),
    });
  }

  return { palaces, balance: elementBalance(pillars), voidBranches };
}
