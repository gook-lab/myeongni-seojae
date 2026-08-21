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
        `${when} 들어오는 기운 중에 ${el(need)}${josa(need, '이', '가')} 있습니다. ` +
        `마침 당신에게 필요한 기운이라, 평소보다 일이 수월하게 풀립니다. ` +
        `미뤄둔 것을 꺼내기 좋은 ${when === '오늘' ? '날' : '해'}입니다.`
      );
    case '버겁다':
      return (
        `${when}은 눌러야 할 기운이 ${unwanted}갈래 들어옵니다. 나쁘다는 뜻이 아니라 ` +
        `평소보다 힘이 더 드는 ${when === '오늘' ? '날' : '해'}이라는 뜻입니다. ` +
        `새로 벌이기보다 하던 것을 지키는 편이 낫습니다.`
      );
    default:
      return (
        `${when}은 필요한 기운도 눌러야 할 기운도 특별히 몰리지 않습니다. ` +
        `${el(need)}${josa(need, '이', '가')} 필요한 자리인데 ${needed > 0 ? '조금 들어오긴 합니다' : '들어오지 않습니다'}. ` +
        `평소대로 가면 되는 ${when === '오늘' ? '날' : '해'}입니다.`
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
      return `${area} 쪽이 맞물립니다. 그 방면에서 이야기가 잘 붙습니다.`;
    case 'triple':
      return `${area} 쪽이 같은 무리로 묶입니다. 여럿이 함께 움직이게 되는 자리입니다.`;
    case 'clash':
      return `${area} 쪽이 흔들립니다. 변화가 생기는 자리이지 나빠진다는 뜻이 아닙니다 — 미뤄둔 결정이 밀려 나오기도 합니다.`;
    case 'punish':
      return `${area} 쪽이 결립니다. 사소한 일에 예민해지기 쉬우니 말을 서두르지 않는 편이 낫습니다.`;
    default:
      return '';
  }
}

export const VOID_DAY_TEXT =
  '오늘 지지가 당신의 공망(空亡)에 듭니다. 공망은 비어 있는 자리라, 벌인 일이 ' +
  '손에 잘 안 잡히거나 김이 빠지는 느낌으로 봅니다. **나쁜 날이 아니라 결실을 ' +
  '재촉하기에 맞지 않는 날**입니다 — 정리하고 쉬거나, 배우고 준비하기에는 오히려 좋습니다.';

export const TRANSIT_HIDDEN_INTRO =
  '지지 안에는 천간이 숨어 있습니다. 겉 글자 하나로만 읽으면 그 날의 결이 한 줄로 납작해집니다.';

export const HOURS_INTRO =
  '오늘 하루를 열두 시진으로 나눠 각각 어떤 결인지 적었습니다. 좋고 나쁨으로 줄 세우지 않습니다 — 무엇을 하기에 어울리는 시간인지만 봅니다.';

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
