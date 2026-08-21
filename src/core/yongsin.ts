/**
 * 명리서재 — 신강·신약과 용신 (억부용신법)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 이 앱은 억부용신법(抑扶用神法)을 따른다
 *
 * 명리에는 용신을 잡는 방법이 여럿이다. 억부·조후·병약·통관·전왕.
 * 그중 실무에서 가장 널리 쓰이는 것이 억부다. 일간이 강하면 눌러주고(抑)
 * 약하면 도와주는(扶) 기운을 용신으로 삼는다.
 *
 * 다른 방법을 쓰면 다른 답이 나온다. 그래서 화면에도 "억부용신법 기준"을
 * 명시한다. 숨기고 정답인 척하는 것이 이 앱에서 가장 하면 안 되는 일이다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 판정 방식 — 근거를 전부 펼친다
 *
 * 일간의 힘은 세 가지로 본다.
 *
 *   득령(得令)  월지가 일간을 돕는가.   계절의 기운이라 비중이 가장 크다
 *   득지(得地)  일지가 일간을 돕는가.   내가 딛고 선 자리다
 *   득세(得勢)  나머지 자리가 돕는가.   년주·시주와 천간들
 *
 * 돕는 것 = 비겁(같은 오행) + 인성(나를 생하는 오행)
 * 빼는 것 = 식상(내가 생하는) + 재성(내가 극하는) + 관성(나를 극하는)
 *
 * 자리마다 무게가 다르다. 아래 WEIGHTS 에 숫자로 적어두고 화면에도
 * 그대로 보여준다. "0.62 라서 신강" 이 아니라 "월지가 인성이라 3점,
 * 일지가 재성이라 -2점" 을 보여주는 쪽이 사용자가 따져볼 수 있다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 검증
 *
 * 외부 정답지가 없다. 대신 성질로 검증한다.
 *   - 비겁·인성만으로 채운 명식은 반드시 신강이 나온다
 *   - 식상·재성·관성만으로 채운 명식은 반드시 신약이 나온다
 *   - 돕는 자리를 하나 늘리면 점수가 반드시 올라간다 (단조성)
 * test/yongsin.test.ts 가 이 셋을 지킨다.
 */

import { TEN_GOD_CATEGORY } from './constants';
import { tenGodOf } from './daeun';
import type {
  Element,
  FourPillars,
  Palace,
  Pillar,
  TenGod,
  TenGodCategory,
} from './types';

/** 일간을 돕는 십성 카테고리 */
const SUPPORTING: readonly TenGodCategory[] = ['비겁', '인성'];

/** 자리별 무게. 월지가 계절의 기운이라 가장 크다. */
export const WEIGHTS = {
  월지: 3,
  일지: 2,
  년지: 1.5,
  시지: 1.5,
  월간: 1,
  년간: 1,
  시간: 1,
} as const;

export type SlotName = keyof typeof WEIGHTS;

export interface StrengthSlot {
  slot: SlotName;
  /** 어느 기둥에서 왔는가 */
  palace: Palace;
  /** 그 자리의 글자 (한자) */
  glyph: string;
  tenGod: TenGod;
  category: TenGodCategory;
  /** 일간을 돕는가 */
  supports: boolean;
  weight: number;
  /** 돕는 자리면 +weight, 빼는 자리면 −weight */
  signed: number;
}

export type StrengthVerdict = '신강' | '중화' | '신약';

export interface DayMasterStrength {
  verdict: StrengthVerdict;
  /** 0~1. 돕는 무게 / 전체 무게. 0.5 가 정확히 반반이다 */
  score: number;
  supportWeight: number;
  drainWeight: number;
  totalWeight: number;
  slots: StrengthSlot[];
  /** 세 가지 판정 근거 */
  deukryeong: boolean; // 득령 — 월지가 돕는가
  deukji: boolean;     // 득지 — 일지가 돕는가
  deukse: boolean;     // 득세 — 나머지가 절반 넘게 돕는가
}

export interface Yongsin {
  method: '억부용신법';
  strength: DayMasterStrength;
  /** 도움이 되는 기운들 */
  helpful: TenGodCategory[];
  /** 피하는 편이 나은 기운들 */
  avoid: TenGodCategory[];
  /**
   * 그중에서도 가장 필요한 하나.
   * 도움이 되는 기운 중 사주에 가장 적은 것을 고른다 —
   * 이미 넉넉한 것보다 모자란 것이 실제로 아쉽기 때문이다.
   */
  primary: TenGodCategory;
  /** 용신에 해당하는 오행 */
  primaryElement: Element;
}

const STEM_ORDER = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

/** 지지의 정기 천간. 지지를 십성으로 환산할 때 쓴다. */
const BRANCH_MAIN_STEM: Record<string, string> = {
  자: '계', 축: '기', 인: '갑', 묘: '을', 진: '무', 사: '병',
  오: '정', 미: '기', 신: '경', 유: '신', 술: '무', 해: '임',
};

/**
 * 십성 카테고리 → 오행.
 * 오행 순서 목화토금수 에서 일간 오행 기준 몇 칸 떨어져 있는가.
 *
 *   비겁  +0  같은 오행
 *   식상  +1  내가 생하는 것      (목생화)
 *   재성  +2  내가 극하는 것      (목극토)
 *   관성  +3  나를 극하는 것      (금극목 — 금은 목에서 +3)
 *   인성  +4  나를 생하는 것      (수생목 — 수는 목에서 +4)
 */
function categoryToElement(dayElement: Element, cat: TenGodCategory): Element {
  const ORDER: readonly Element[] = ['목', '화', '토', '금', '수'];
  const OFFSET: Record<TenGodCategory, number> = {
    비겁: 0, 식상: 1, 재성: 2, 관성: 3, 인성: 4,
  };
  return ORDER[(ORDER.indexOf(dayElement) + OFFSET[cat]) % 5] as Element;
}

function tenGodFor(dayStem: string, glyphStem: string): TenGod {
  return tenGodOf(STEM_ORDER.indexOf(dayStem), STEM_ORDER.indexOf(glyphStem));
}

/**
 * 일간의 강약을 잰다.
 *
 * 시주가 없으면(시간 미상) 시간·시지 자리를 빼고 남은 무게로만 계산한다.
 * 비율이므로 결과는 여전히 0~1 이고, 화면이 "여섯 자 기준"임을 알린다.
 */
export function dayMasterStrength(pillars: FourPillars): DayMasterStrength {
  const dayStem = pillars.day.stem;
  const slots: StrengthSlot[] = [];

  const push = (
    slot: SlotName,
    palace: Palace,
    pillar: Pillar | null,
    kind: 'stem' | 'branch',
  ) => {
    if (!pillar) return;
    // 일간 자신은 세지 않는다 — 자기가 자기를 돕는다고 할 수 없다
    const stemKo = kind === 'stem' ? pillar.stem : BRANCH_MAIN_STEM[pillar.branch];
    if (!stemKo) return;
    const tenGod = tenGodFor(dayStem, stemKo);
    const category = TEN_GOD_CATEGORY[tenGod];
    const supports = SUPPORTING.includes(category);
    const weight = WEIGHTS[slot];
    slots.push({
      slot,
      palace,
      glyph: kind === 'stem' ? pillar.stemHanja : pillar.branchHanja,
      tenGod,
      category,
      supports,
      weight,
      signed: supports ? weight : -weight,
    });
  };

  push('월지', '월주', pillars.month, 'branch');
  push('일지', '일주', pillars.day, 'branch');
  push('년지', '년주', pillars.year, 'branch');
  push('시지', '시주', pillars.hour, 'branch');
  push('월간', '월주', pillars.month, 'stem');
  push('년간', '년주', pillars.year, 'stem');
  push('시간', '시주', pillars.hour, 'stem');

  const supportWeight = slots.filter((s) => s.supports).reduce((a, s) => a + s.weight, 0);
  const drainWeight = slots.filter((s) => !s.supports).reduce((a, s) => a + s.weight, 0);
  const totalWeight = supportWeight + drainWeight;
  const score = totalWeight === 0 ? 0.5 : supportWeight / totalWeight;

  const monthBranch = slots.find((s) => s.slot === '월지');
  const dayBranch = slots.find((s) => s.slot === '일지');
  const rest = slots.filter((s) => s.slot !== '월지' && s.slot !== '일지');
  const restSupport = rest.filter((s) => s.supports).reduce((a, s) => a + s.weight, 0);
  const restTotal = rest.reduce((a, s) => a + s.weight, 0);

  // 0.55 / 0.45 를 경계로 둔다. 그 사이는 중화로 보고 한쪽으로 몰지 않는다.
  const verdict: StrengthVerdict =
    score > 0.55 ? '신강' : score < 0.45 ? '신약' : '중화';

  return {
    verdict,
    score,
    supportWeight,
    drainWeight,
    totalWeight,
    slots,
    deukryeong: monthBranch?.supports ?? false,
    deukji: dayBranch?.supports ?? false,
    deukse: restTotal > 0 && restSupport / restTotal > 0.5,
  };
}

/**
 * 용신을 잡는다 (억부).
 *
 * 신강하면 빼는 기운, 신약하면 돕는 기운이 도움이 된다.
 * 중화면 흐름을 순하게 하는 식상을 우선으로 본다.
 */
export function yongsin(pillars: FourPillars): Yongsin {
  const strength = dayMasterStrength(pillars);

  const helpful: TenGodCategory[] =
    strength.verdict === '신강'
      ? ['식상', '재성', '관성']
      : strength.verdict === '신약'
        ? ['비겁', '인성']
        : ['식상', '재성'];

  const avoid: TenGodCategory[] =
    strength.verdict === '신강'
      ? ['비겁', '인성']
      : strength.verdict === '신약'
        ? ['식상', '재성', '관성']
        : [];

  // 도움이 되는 기운 중 사주에 가장 적은 것을 고른다.
  // 이미 넉넉한 것보다 모자란 것이 실제로 아쉽다.
  const counts: Record<TenGodCategory, number> = {
    비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0,
  };
  for (const s of strength.slots) counts[s.category] += 1;

  let primary = helpful[0] as TenGodCategory;
  for (const c of helpful) {
    if (counts[c] < counts[primary]) primary = c;
  }

  return {
    method: '억부용신법',
    strength,
    helpful,
    avoid,
    primary,
    primaryElement: categoryToElement(pillars.day.stemElement, primary),
  };
}
