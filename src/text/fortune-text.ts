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

/** 일지 관계 — 배우자 자리끼리의 결 */
export const BRANCH_RELATION_TEXT: Record<string, string> = {
  harmony:
    '일지(日支)가 육합(六合)을 이룹니다. 배우자 자리끼리 맞물려 생활 리듬이 잘 맞고, 함께 있는 시간이 편안합니다.',
  triple:
    '일지가 삼합(三合)의 한 축을 이룹니다. 같은 방향을 보는 관계라 목표가 생기면 힘이 모입니다.',
  clash:
    '일지가 충(沖)입니다. 생활 리듬이 어긋나기 쉬워 서로의 속도를 맞추는 노력이 필요합니다. 다만 충은 변화를 만드는 힘이기도 해서, 서로를 움직이게 하는 관계가 되기도 합니다.',
  punish:
    '일지가 형(刑)에 걸립니다. 가까울수록 예민해지는 자리라 사소한 말이 오래 남기 쉽습니다. 거리를 두는 게 아니라 말을 고르는 쪽이 낫습니다.',
  none:
    '일지끼리 특별한 합도 충도 없습니다. 서로의 생활에 크게 간섭하지 않는 담백한 관계입니다.',
};

/**
 * 한국어 조사 선택. 앞 글자의 받침 유무로 갈린다.
 *
 * "목을(를)" 같은 표기는 읽는 사람을 멈칫하게 만든다. 오행 다섯 글자만
 * 다루므로 하드코딩할 수도 있지만, 문장이 늘어나면 또 필요해진다.
 */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.at(-1);
  if (!last) return withoutBatchim;
  const code = last.charCodeAt(0);
  // 한글 음절 영역이 아니면 받침 없는 쪽으로 (숫자·영문 등)
  if (code < 0xac00 || code > 0xd7a3) return withoutBatchim;
  return (code - 0xac00) % 28 === 0 ? withoutBatchim : withBatchim;
}

/**
 * 오행 보완 — 궁합에서 실제로 크게 보는 대목.
 *
 * @param side  이 문장의 주어 ("나" / "상대")
 * @param other 상대편 호칭. 주어가 "상대"면 여기는 "나"가 된다
 */
export function complementText(
  side: string,
  other: string,
  filled: string[],
  stillMissing: string[],
): string {
  const subject = `${side}${josa(side, '은', '는')}`;
  if (filled.length === 0 && stillMissing.length === 0) {
    return `${subject} 다섯 기운을 고루 갖추고 있어 따로 채울 것이 없습니다.`;
  }
  if (filled.length === 0) {
    const list = stillMissing.join('·');
    return `${side}에게 없는 ${list}${josa(list, '을', '를')} ${other}도 갖고 있지 않습니다. 둘 다 그 방면은 밖에서 구해야 합니다.`;
  }
  const base = `${side}에게 없던 ${filled.join('·')}의 기운을 ${other}가 갖고 있습니다. 함께 있을 때 그 방면이 채워집니다.`;
  if (stillMissing.length === 0) return base;
  const rest = stillMissing.join('·');
  return `${base} 다만 ${rest}${josa(rest, '은', '는')} 둘 다 없습니다.`;
}

/**
 * 상호 십성 — 상대 일간이 나에게 어떤 역할로 오는가.
 * 같은 "궁합"이어도 상대가 정관인지 편관인지에 따라 사는 느낌이 다르다.
 */
export const MUTUAL_TEN_GOD_TEXT: Record<string, string> = {
  비견: '나와 같은 기운으로 옵니다. 친구처럼 나란히 서는 관계입니다.',
  겁재: '나와 같은 오행의 다른 얼굴로 옵니다. 서로 자극이 되지만 같은 것을 두고 겨루기도 합니다.',
  식신: '내가 편하게 표현하게 만드는 자리로 옵니다. 함께 있으면 말이 술술 나옵니다.',
  상관: '내 안의 하고 싶은 말을 끌어내는 자리로 옵니다. 창의적이지만 내가 날카로워지기도 합니다.',
  편재: '내가 활동하게 만드는 자리로 옵니다. 함께 벌이는 일이 많아집니다.',
  정재: '내가 살림을 챙기게 만드는 자리로 옵니다. 현실적인 계획이 자연스럽게 세워집니다.',
  편관: '나를 긴장시키는 자리로 옵니다. 단련되지만 눌리는 느낌이 들 때도 있습니다.',
  정관: '나를 반듯하게 만드는 자리로 옵니다. 책임감이 생기고 관계가 안정적으로 굴러갑니다.',
  편인: '나를 생각하게 만드는 자리로 옵니다. 깊어지지만 혼자 골몰하기도 합니다.',
  정인: '나를 돌봐주는 자리로 옵니다. 기대고 배우게 되는 관계입니다.',
};

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

/**
 * 대운과 세운의 관계.
 *
 * 대운이 그 10년의 판이라면 세운은 그 위에 얹히는 한 해다.
 * 둘이 합을 이루면 판이 굳고, 충하면 판 자체가 흔들린다.
 * 명리에서 실제로 크게 보는 대목인데 원본은 아예 안 봤다.
 */
export const DAEUN_YEAR_TEXT: Record<string, string> = {
  harmony:
    '올해 세운이 지금 대운과 합(合)을 이룹니다. 10년의 흐름과 올해가 같은 방향이라 하던 일이 순하게 굴러갑니다.',
  triple:
    '올해 세운이 지금 대운과 삼합(三合)의 축을 이룹니다. 판이 한 방향으로 모여 힘이 실리는 해입니다.',
  clash:
    '올해 세운이 지금 대운과 충(沖)입니다. 10년 동안 놓여 있던 판이 흔들리는 해라 이동·이직·정리가 잦습니다. 나쁜 것이 아니라 바뀌는 것입니다.',
  punish:
    '올해 세운이 지금 대운과 형(刑)에 걸립니다. 안에서 삐걱대기 쉬운 해라 사람 사이의 마찰과 문서 문제를 조심할 자리입니다.',
  none:
    '올해 세운과 지금 대운 사이에 특별한 합충이 없습니다. 10년의 흐름이 그대로 이어지는 해입니다.',
};
