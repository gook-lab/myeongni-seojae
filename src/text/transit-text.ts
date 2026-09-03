/**
 * 명리서재 — 운(運) 문장
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 누구에게나 같은 말을 하지 않는다
 *
 * "오늘은 정재의 날입니다" 는 그 날 태어난 사람 모두에게 같은 말이다.
 * 오늘의 운세가 다 비슷비슷한 이유가 그것이다.
 *
 * "오늘 들어오는 수(水)가 마침 당신에게 필요한 기운입니다" 는 그 사람에게만
 * 하는 말이다. 원국을 봐야 나오는 문장이고, 우리는 이미 원국을 갖고 있다.
 *
 * 그리고 좋고 나쁨으로 줄 세우지 않는다. 공망일을 "나쁜 날" 이라 하지 않고
 * "결실을 재촉하기에 맞지 않는 날" 이라 적는다.
 */
import { ELEMENT_HANJA } from '../core/constants';
import type { Element, Palace } from '../core/types';
import type { BranchRelation } from '../core/fortune';
import { josa } from './fortune-text';

/**
 * 오행을 "수(水)" 꼴로.
 *
 * 한때 `${need}(${need})` 로 적혀 있어 "수(수)" 가 나왔다. 괄호 안은
 * 한자여야 뜻이 붙는다.
 */
const el = (e: Element): string => `${e}(${ELEMENT_HANJA[e]})`;

export function TRANSIT_YONGSIN_TEXT(
  verdict: '숨통이 트인다' | '무난하다' | '버겁다',
  when: '오늘' | '올해',
  need: Element,
  needed: number,
  unwanted: number,
): string {
  switch (verdict) {
    case '숨통이 트인다':
      return (
        `${when} 들어오는 기운에 ${el(need)}${josa(need, '이', '가')} 포함됩니다. ` +
        `계산상 필요한 기운에 해당하며, 명리에서는 평소보다 보완되는 흐름으로 해석합니다.`
      );
    case '버겁다':
      return (
        `${when}은 덜어낼 기운이 ${unwanted}갈래 들어옵니다. ` +
        `명리에서는 평소보다 부담이 커질 수 있는 흐름으로 해석합니다.`
      );
    default:
      return (
        `${when}은 필요한 기운과 덜어낼 기운이 어느 한쪽으로 크게 몰리지 않습니다. ` +
        `${el(need)}${josa(need, '이', '가')} ${needed > 0 ? '일부 포함됩니다' : '포함되지 않습니다'}.`
      );
  }
}

/** 자리마다 건드리는 데가 다르다 */
const PALACE_AREA: Record<string, string> = {
  년주: '집안과 오래된 인연',
  월주: '일과 지금의 환경',
  일주: '나 자신과 가장 가까운 사람',
  시주: '자식과 앞날',
};

export function NATAL_CONTACT_TEXT(palace: Palace, rel: BranchRelation): string {
  const area = PALACE_AREA[palace] ?? '';
  switch (rel) {
    case 'harmony':
      return `${area} 자리와 합 관계를 이룹니다. 해당 영역의 관계나 일이 이어지는 흐름으로 해석합니다.`;
    case 'triple':
      return `${area} 자리가 삼합 관계에 포함됩니다. 여러 관계가 함께 움직이는 흐름으로 해석합니다.`;
    case 'clash':
      return `${area} 자리와 충 관계를 이룹니다. 해당 영역에서 변화가 드러날 수 있는 흐름으로 해석합니다.`;
    case 'punish':
      return `${area} 자리와 형 관계를 이룹니다. 해당 영역에서 긴장이나 예민함이 커질 수 있는 흐름으로 해석합니다.`;
    default:
      return '';
  }
}

export const VOID_DAY_TEXT =
  '오늘의 지지는 계산된 공망(空亡)에 해당합니다. 명리에서는 진행 중인 일의 성과가 바로 드러나지 않거나, 정리와 준비에 무게가 실리는 흐름으로 해석합니다.';

export const TRANSIT_HIDDEN_INTRO =
  '지지 안에는 여러 천간이 포함되어 있습니다. 겉으로 드러난 글자와 지장간을 함께 확인해 그날의 오행과 십성을 해석합니다.';

export const HOURS_INTRO =
  '오늘 하루를 열두 시진으로 나누고, 각 시간에 들어오는 십성과 오행을 표시합니다. 시간별 특징은 활동을 계획할 때 참고할 수 있습니다.';

/** 십성 갈래별로 그 시간에 어울리는 일 */
export const HOUR_TEN_GOD_HINT: Record<string, string> = {
  비견: '혼자 힘으로 밀어붙이기',
  겁재: '경쟁이 붙는 자리',
  식신: '만들고 먹고 즐기기',
  상관: '말하고 표현하기',
  편재: '벌이고 굴리기',
  정재: '셈하고 챙기기',
  편관: '밀어붙이고 결단하기',
  정관: '격식과 공적인 일',
  편인: '혼자 파고들기',
  정인: '배우고 정리하기',
};
