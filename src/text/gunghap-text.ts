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
import { asSubject } from './fortune-text';

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
      return `${where}가 서로 맞물립니다. 둘이 있으면 자연스럽게 한 방향을 보게 되는 자리입니다.`;
    case 'triple':
      return `${where}가 같은 무리로 묶입니다. 말하지 않아도 통하는 구석이 생깁니다.`;
    case 'clash':
      return `${where}가 부딪힙니다. 흔들린다는 뜻이지 헤어진다는 뜻이 아닙니다 — 변화가 잦은 자리이고, 그 변화를 같이 겪으면 오히려 단단해집니다.`;
    case 'punish':
      return `${where}에 결리는 데가 있습니다. 사소한 일에 서로 예민해지기 쉬우니, 말을 아끼기보다 일찍 꺼내는 편이 낫습니다.`;
    default:
      return `${where}는 특별히 얽히지 않습니다. 서로의 영역을 그대로 두는 편입니다.`;
  }
}

export function STEM_HARMONY_TEXT(becomes: string): string {
  return (
    `두 분의 일간이 합을 이룹니다. 합은 좋다 나쁘다가 아니라 **묶인다**는 뜻입니다 — ` +
    `서로 끌리고, 한번 엮이면 잘 떨어지지 않는 자리입니다. ` +
    `합해서 ${becomes}의 기운이 되므로 둘이 함께 있을 때 그쪽 성질이 강해집니다.`
  );
}

export function YONGSIN_CROSS_TEXT(
  verdict: '채워준다' | '보통' | '부딪힌다',
  other: string,
  need: string,
): string {
  switch (verdict) {
    case '채워준다':
      return (
        `${need}의 기운이 필요한 자리인데 ${asSubject(other)} 그걸 넉넉히 갖고 있습니다. ` +
        `궁합에서 흔히 "없는 오행을 채워준다" 고 하는데, 없는 것보다 **필요한 것**을 ` +
        `갖고 오는 편이 훨씬 큽니다. 곁에 있으면 숨통이 트이는 관계입니다.`
      );
    case '부딪힌다':
      return (
        `${need}의 기운이 필요한데 ${other}${other === '나' ? '는' : '는'} 오히려 눌러야 할 기운을 많이 갖고 있습니다. ` +
        `맞지 않는다는 말이 아니라, 함께 있으면 지치기 쉬우니 각자의 시간이 ` +
        `필요한 사이라는 뜻입니다.`
      );
    default:
      return (
        `${need}의 기운이 필요한 자리인데 ${other}에게 그 기운이 특별히 많지도 적지도 ` +
        `않습니다. 오행으로는 서로 크게 도와주지도 방해하지도 않습니다.`
      );
  }
}

export function STAGE_CROSS_TEXT(other: string, stage: TwelveStage): string {
  const OUT: Partial<Record<TwelveStage, string>> = {
    장생: '새로 시작하는 힘이 붙습니다. 그 사람 곁에서 뭔가를 벌이게 됩니다.',
    목욕: '들뜨기 쉽습니다. 즐겁지만 자리가 잡히기까지 시간이 걸립니다.',
    관대: '앞으로 나서게 됩니다. 인정받고 싶은 마음이 커지는 자리입니다.',
    건록: '제 힘이 온전히 나옵니다. 일이 되는 관계입니다.',
    제왕: '가장 세게 나옵니다. 둘 다 세면 부딪히니 역할을 나누는 편이 낫습니다.',
    쇠: '한풀 꺾인 자리입니다. 대신 무리하지 않게 됩니다.',
    병: '기대는 마음이 커집니다. 돌봄을 주고받는 사이가 됩니다.',
    사: '조용해집니다. 활발한 관계는 아니지만 깊어질 수 있습니다.',
    묘: '안으로 접힙니다. 밖으로 뻗기보다 정리하게 되는 자리입니다.',
    절: '기존의 것이 끊깁니다. 그래서 새것이 들어올 자리가 생깁니다.',
    태: '아직 형체가 없는 자리입니다. 무엇이 될지 함께 만들어가게 됩니다.',
    양: '자라나는 자리입니다. 서두르지 않으면 오래 갑니다.',
  };
  return `${other} 곁에서 나는 **${stage}**의 자리입니다. ${OUT[stage] ?? ''}`;
}

export function COMBINED_TEXT(filled: readonly Element[], missing: readonly Element[]): string {
  const parts: string[] = [];
  if (filled.length > 0) {
    parts.push(
      `혼자일 땐 비어 있던 ${filled.join('·')}이(가) 둘이 되면 채워집니다. ` +
        `함께 있을 때 넓어지는 대목입니다.`,
    );
  }
  if (missing.length > 0) {
    parts.push(
      `${missing.join('·')}은(는) 둘을 합쳐도 없습니다. 두 분 다 약한 방면이라 ` +
        `서로에게 기대기보다 밖에서 채워야 하는 자리입니다.`,
    );
  }
  if (parts.length === 0) {
    parts.push('둘을 합치면 다섯 기운이 모두 있습니다. 함께 있을 때 빠지는 데가 없습니다.');
  }
  return parts.join(' ');
}

export const CROSS_SINSAL_TEXT: Record<'원진' | '귀문관', string> = {
  원진:
    '까닭을 대기 어려운 껄끄러움이 생기는 자리입니다. 특별히 잘못한 것도 없는데 ' +
    '마음이 안 맞는 순간이 옵니다. 인연이 아니라는 뜻이 아니라 — 오래 붙어 있는 ' +
    '사이에서 오히려 자주 보입니다. 그런 마찰이 있다는 걸 알고 있으면 덜 휘둘립니다.',
  귀문관:
    '서로의 기분을 지나치게 잘 읽는 자리입니다. 말하지 않아도 아는 대신, ' +
    '상대의 예민함까지 그대로 옮아옵니다. 각자 회복하는 시간을 두면 훨씬 편해집니다.',
};

export const GUNGHAP_INTRO =
  '점수를 내지 않습니다. 두 분의 여섯 자를 자리별로 나란히 놓고, 어디가 맞물리고 어디가 부딪히는지를 그대로 적습니다.';

export const GUNGHAP_HOUR_NOTE =
  '태어난 시각은 쓰지 않습니다. 궁합에서 보는 자리(일간·일지·년지·월지)가 시각과 무관해서, 시각을 모르셔도 결과가 흔들리지 않습니다.';
