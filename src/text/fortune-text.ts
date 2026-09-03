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
    title: '같은 오행의 일간',
    body: '두 사람의 일간이 같은 오행입니다. 명리에서는 비슷한 성향을 이해하기 쉽지만, 같은 방식을 고집하면 부딪힐 수 있는 관계로 해석합니다.',
  },
  generating: {
    title: '서로 이어지는 상생 관계',
    body: '한 사람의 오행이 다른 사람의 오행을 생하는 상생(相生) 관계입니다. 명리에서는 한쪽의 기운이 다른 쪽을 보완하는 관계로 해석합니다.',
  },
  controlling: {
    title: '서로 제어하는 상극 관계',
    body: '한 사람의 오행이 다른 사람의 오행을 제어하는 상극(相剋) 관계입니다. 명리에서는 긴장이나 견제가 생기기 쉽지만, 역할을 조절하면 균형을 만들 수 있는 관계로 해석합니다.',
  },
};

/** 일지 관계 — 배우자 자리끼리의 결 */
export const BRANCH_RELATION_TEXT: Record<string, string> = {
  harmony:
    '두 사람의 일지(日支)가 육합(六合)을 이룹니다. 명리에서는 생활 방식과 관계의 흐름이 자연스럽게 이어지는 조합으로 해석합니다.',
  triple:
    '일지가 삼합(三合)의 한 축을 이룹니다. 같은 방향을 보는 관계라 목표가 생기면 힘이 모입니다.',
  clash:
    '두 사람의 일지가 충(沖)을 이룹니다. 명리에서는 생활 방식의 차이가 드러나기 쉽고, 서로에게 변화를 만드는 관계로 해석합니다.',
  punish:
    '두 사람의 일지가 형(刑)을 이룹니다. 명리에서는 가까운 관계에서 긴장이나 예민함이 드러나기 쉬운 조합으로 해석합니다.',
  none:
    '두 사람의 일지 사이에 특별한 합·충·형 관계가 없습니다. 이 항목만으로 관계의 방향을 뚜렷하게 판단하기 어렵습니다.',
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
 * 주격조사를 붙인다.
 *
 * "나" 와 "너" 는 이/가 앞에서 모양이 바뀐다 — 나+가는 "나가" 가 아니라
 * "내가" 다. 규칙으로는 안 나오고 예외로 적어야 한다. 실제로 궁합 문장에
 * "상대에게 없던 화의 기운을 나가 갖고 있습니다" 가 나왔다.
 */
export function asSubject(word: string): string {
  if (word === '나') return '내가';
  if (word === '너') return '네가';
  return `${word}${josa(word, '이', '가')}`;
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
  const base = `${side}에게 없던 ${filled.join('·')}의 기운을 ${asSubject(other)} 갖고 있습니다. 함께 있을 때 그 방면이 채워집니다.`;
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
  return `오늘은 ${ganji}일입니다. 일간 ${dayMasterLabel}을 기준으로 ${tenGod}에 해당합니다.`;
}

/** 신년운세 머리말 */
export function yearLead(year: number, ganji: string, tenGod: string): string {
  return `${year}년은 ${ganji}년입니다. 일간을 기준으로 ${tenGod}에 해당하는 해입니다.`;
}

/** 월운 머리말 */
export const MONTH_INTRO =
  '절기를 기준으로 나눈 열두 달이며, 양력의 월 구분과 며칠 차이가 날 수 있습니다.';

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

/** 오늘 일진 지지와 내 일지의 관계 — 몸으로 느껴지는 날인가 */
export const DAILY_BRANCH_TEXT: Record<string, string> = {
  harmony: '오늘 일진이 내 일지와 합(合)입니다. 사람과 일이 맞물려 돌아가는 날이라 약속과 만남에 좋습니다.',
  triple: '오늘 일진이 내 일지와 삼합(三合)의 축을 이룹니다. 같은 방향으로 힘이 모이는 날입니다.',
  clash: '오늘 일진이 내 일지와 충(沖)입니다. 예정이 틀어지거나 움직일 일이 생기기 쉽습니다. 여유를 두고 잡으세요.',
  punish: '오늘 일진이 내 일지와 형(刑)에 걸립니다. 말이 날카로워지기 쉬운 날이라 한 박자 늦춰 대답하는 편이 낫습니다.',
  none: '오늘 일진과 내 일지 사이에 특별한 합충이 없습니다. 평소 흐름대로 가는 날입니다.',
};
