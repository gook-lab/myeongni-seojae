/**
 * 명리서재 — 부가 운세 문장
 *
 * 점수가 없으므로 문장이 전부다. 그래서 "왜 그런가"를 같이 말한다 —
 * 오늘의 일진이 무엇이고 내 일간과 어떤 관계인지.
 * 근거를 보여주는 쪽이 숫자보다 오래 남는다.
 */

import type { GunghapKind } from '../core/fortune';

/** 궁합 — 일간 오행 관계 */
export const GUNGHAP_TEXT: Record<GunghapKind, { title: string; body: string }> = {
  same: {
    title: '같은 기운이 나란히',
    body: '두 사람의 일간이 같은 오행입니다. 서로를 깊이 이해하고 말이 빨리 통합니다. 다만 닮은 만큼 같은 자리를 원하게 되어, 양보의 자리가 없으면 부딪힙니다. 역할을 나눠두면 오래 갑니다.',
  },
  generating: {
    title: '한쪽이 다른 쪽을 살리는',
    body: '한 사람의 기운이 다른 사람을 자연스럽게 살리는 상생(相生)입니다. 함께 있을수록 서로에게 힘이 되고, 힘든 시기에 특히 그렇습니다. 주는 쪽이 지치지 않게 받는 쪽이 표현해주면 균형이 유지됩니다.',
  },
  controlling: {
    title: '서로를 단련시키는',
    body: '서로를 밀어붙이는 상극(相剋)입니다. 긴장이 있는 만큼 각자 성장도 크지만, 말의 온도를 조심해야 합니다. 상대를 고치려 들면 멀어지고, 다름을 인정하면 오히려 가장 단단해지는 조합입니다.',
  },
};

export const BRANCH_HARMONY_TEXT =
  '일지(日支)가 합(合)을 이룹니다. 생활 리듬이 맞아 함께 있는 시간이 편안합니다.';

export const BRANCH_CLASH_TEXT =
  '일지(日支)가 충(沖)입니다. 생활 리듬이 어긋나기 쉬워 서로의 속도를 맞추는 노력이 필요합니다.';

/** 오늘의 운세 머리말 — 왜 오늘이 그런 날인지 */
export function dailyLead(dayMasterLabel: string, ganji: string, tenGod: string): string {
  return `오늘은 ${ganji}일입니다. 당신의 일간 ${dayMasterLabel}에게 ${tenGod}으로 작용하는 날입니다.`;
}

/** 신년운세 머리말 */
export function yearLead(year: number, ganji: string, tenGod: string): string {
  return `${year}년은 ${ganji}년입니다. 당신의 일간 기준으로 ${tenGod}의 기운이 흐르는 해입니다.`;
}

/** 월운 머리말 */
export const MONTH_INTRO =
  '절기를 기준으로 나눈 열두 달입니다. 양력 달과 며칠씩 어긋납니다.';
