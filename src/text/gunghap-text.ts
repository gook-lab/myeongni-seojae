/**
 * 명리서재 — 궁합 심화 문장
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 점수를 대신할 말을 찾는다
 *
 * "78점" 은 아무것도 설명하지 않는다. 대신 이렇게 말한다 —
 * "내게 필요한 수(水)를 상대가 셋 갖고 있습니다."
 *
 * 그리고 나쁜 자리를 나쁘다고만 쓰지 않는다. 충(沖)이 있으면 흔들리는
 * 관계인 건 맞지만 그게 곧 헤어질 사이라는 뜻은 아니다. 오래 붙어 있는
 * 사이에서 오히려 자주 보인다. 무엇이 일어나는지를 적고 판단은 남긴다.
 */
import type { Element, Palace, TwelveStage } from '../core/types';
import type { BranchRelation } from '../core/fortune';
import { asSubject, josa } from './fortune-text';
import { ELEMENT_HANJA } from '../core/constants';

/** 오행을 "수(水)" 꼴로. 괄호 안은 한자여야 뜻이 붙는다. */
const el = (e: Element): string => `${e}(${ELEMENT_HANJA[e]})`;

export const BRANCH_RELATION_LABEL: Record<BranchRelation, string> = {
  harmony: '육합',
  triple: '삼합',
  clash: '충',
  punish: '형',
  none: '무난',
};

/** 자리마다 뜻이 다르다 — 일지만 보면 안 보이는 것이 있다 */
const PALACE_MEANING: Record<string, string> = {
  년주: '집안과 뿌리',
  월주: '자라온 환경과 성향',
  일주: '배우자 자리',
};

export function BRANCH_PAIR_TEXT(palace: Palace, rel: BranchRelation): string {
  const where = PALACE_MEANING[palace] ?? '';
  switch (rel) {
    case 'harmony':
      return `${where}가 육합 관계를 이룹니다. 서로의 성향이 자연스럽게 이어지는 관계로 해석합니다.`;
    case 'triple':
      return `${where}가 삼합 관계에 포함됩니다. 공통된 방향이나 관심사가 드러나는 관계로 해석합니다.`;
    case 'clash':
      return `${where}가 충 관계를 이룹니다. 차이가 분명하게 드러나거나 변화가 잦을 수 있는 관계로 해석합니다.`;
    case 'punish':
      return `${where}가 형 관계를 이룹니다. 비슷한 상황에서도 긴장이나 예민함이 커질 수 있는 관계로 해석합니다.`;
    default:
      return `${where}에서는 별도의 합·충·형 관계가 확인되지 않습니다.`;
  }
}

export function STEM_HARMONY_TEXT(becomes: string): string {
  return (
    `두 사람의 일간이 천간합을 이루며, 합화하면 ${becomes}의 기운으로 해석합니다. ` +
    `이는 관계의 좋고 나쁨을 뜻하기보다 두 일간이 서로 작용하는 방식을 보여주는 기준입니다.`
  );
}

export function YONGSIN_CROSS_TEXT(
  verdict: '채워준다' | '보통' | '부딪힌다',
  other: string,
  need: Element,
): string {
  switch (verdict) {
    case '채워준다':
      return (
        `${el(need)}의 기운이 필요한 명식이며 ${asSubject(other)} 해당 기운을 상대적으로 많이 갖고 있습니다. ` +
        `오행 구성에서는 서로 보완되는 관계로 해석합니다.`
      );
    case '부딪힌다':
      return (
        `${el(need)}의 기운이 필요한 명식이지만 ${other}에게는 덜어낼 기운이 상대적으로 많습니다. ` +
        `오행 구성에서는 한쪽의 부담이 커질 수 있는 관계로 해석합니다.`
      );
    default:
      return (
        `${el(need)}의 기운이 필요한 명식이며 ${other}에게 해당 기운이 두드러지지는 않습니다. ` +
        `오행 구성에서는 보완이나 부담이 어느 한쪽으로 크게 치우치지 않습니다.`
      );
  }
}

export function STAGE_CROSS_TEXT(other: string, stage: TwelveStage): string {
  const OUT: Partial<Record<TwelveStage, string>> = {
    장생: '새로운 활동을 시작하는 성향이 드러날 수 있습니다.',
    목욕: '변화와 시행착오를 함께 경험하는 관계로 해석합니다.',
    관대: '표현과 사회적 활동이 늘어나는 관계로 해석합니다.',
    건록: '독립성과 실행력이 안정적으로 드러나는 관계로 해석합니다.',
    제왕: '추진력이 강해지는 만큼 역할을 조율할 필요가 있다고 봅니다.',
    쇠: '활동을 넓히기보다 경험을 정리하는 관계로 해석합니다.',
    병: '서로의 속도와 회복을 살피는 관계로 해석합니다.',
    사: '외부 활동보다 생각과 대화에 무게가 실리는 관계로 해석합니다.',
    묘: '진행하던 일과 감정을 정리하는 관계로 해석합니다.',
    절: '기존 방식을 마무리하고 변화를 준비하는 관계로 해석합니다.',
    태: '아직 정해지지 않은 방향을 함께 탐색하는 관계로 해석합니다.',
    양: '관계를 서서히 형성하고 기반을 다지는 단계로 해석합니다.',
  };
  return `${other}와의 관계에서 나의 십이운성은 **${stage}**입니다. ${OUT[stage] ?? ''}`;
}

export function COMBINED_TEXT(filled: readonly Element[], missing: readonly Element[]): string {
  const parts: string[] = [];
  if (filled.length > 0) {
    parts.push(
        `한쪽 명식에 드러나지 않은 ${filled.map(el).join(' · ')}${josa(filled[filled.length - 1] ?? '', '이', '가')} 두 명식을 합하면 포함됩니다.`,
    );
  }
  if (missing.length > 0) {
    parts.push(
        `${missing.map(el).join(' · ')}${josa(missing[missing.length - 1] ?? '', '은', '는')} 두 명식을 합해도 겉으로 드러나지 않습니다. ` +
        `공통으로 비중이 낮은 오행으로 확인됩니다.`,
    );
  }
  if (parts.length === 0) {
    parts.push('두 명식을 합하면 다섯 오행이 모두 포함됩니다.');
  }
  return parts.join(' ');
}

export const CROSS_SINSAL_TEXT: Record<'원진' | '귀문관', string> = {
  원진:
    '두 지지가 원진 관계를 이룹니다. 이유를 설명하기 어려운 불편함이나 감정의 엇갈림이 나타날 수 있는 관계로 해석합니다.',
  귀문관:
    '두 지지가 귀문관 관계를 이룹니다. 서로의 감정과 분위기에 예민하게 반응할 수 있는 관계로 해석합니다.',
};

export const GUNGHAP_CLOSING =
  '궁합을 하나의 점수로 환산하지 않습니다. 두 명식의 오행과 간지 관계를 항목별로 비교해 해석 근거를 보여드립니다.';

export const GUNGHAP_HOUR_NOTE =
  '태어난 시각을 몰라도 일간·일지·년지·월지는 비교할 수 있습니다. 시각을 입력하면 시주를 포함한 오행 구성도 함께 비교합니다.';

/**
 * 음양의 기울기를 견준다.
 *
 * 서로 반대로 기울면 채워지고, 같은 쪽으로 기울면 닮은 만큼 같은 데서
 * 막힌다. 좋고 나쁨이 아니라 어느 쪽으로 기울었는지를 본다.
 */
export function POLARITY_COMPARE_TEXT(aRatio: number, bRatio: number): string {
  const label = (r: number) =>
    r >= 0.65 ? '양으로 크게 기움'
    : r >= 0.55 ? '양으로 기움'
    : r <= 0.35 ? '음으로 크게 기움'
    : r <= 0.45 ? '음으로 기움'
    : '고른 편';
  const a = label(aRatio);
  const b = label(bRatio);

  const sameSide =
    (aRatio > 0.55 && bRatio > 0.55) || (aRatio < 0.45 && bRatio < 0.45);
  const opposite =
    (aRatio > 0.55 && bRatio < 0.45) || (aRatio < 0.45 && bRatio > 0.55);

  if (opposite) {
    return (
      `나는 ${a}, 상대는 ${b}입니다. 서로 반대쪽으로 기울어 있어 함께 있을 때 ` +
      `서로 다른 성향이 보완될 수 있는 관계로 해석합니다.`
    );
  }
  if (sameSide) {
    const which = aRatio > 0.5 ? '양' : '음';
    return (
      `둘 다 ${which}으로 기울어 있습니다(나 ${a}, 상대 ${b}). 비슷한 성향을 공유하지만, ` +
      `${which === '양' ? '의견을 빠르게 밀어붙이는 과정에서 충돌이 생길' : '의사 표현이나 결정이 늦어질'} 수 있다고 해석합니다.`
    );
  }
  return `나는 ${a}, 상대는 ${b}입니다. 음양의 기울기는 어느 한쪽으로 크게 치우치지 않습니다.`;
}

export function COMPARE_NOTE(aCount: number, bCount: number): string {
  const base =
    '겉으로 드러난 글자와 지지 안의 천간(지장간)을 나누어 표시했습니다. ' +
    '겉에 없는 오행이 지장간에 포함될 수 있으므로 두 결과를 함께 확인해야 합니다.';
  if (aCount === bCount) return base;
  const who = aCount < bCount ? '나' : '상대';
  return `${base} ${who} 쪽은 태어난 시각을 입력하지 않아 여섯 자를 기준으로 계산했습니다.`;
}
