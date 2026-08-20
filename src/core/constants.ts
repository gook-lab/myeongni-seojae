/**
 * 명리서재 — 한자 ↔ 한글 매핑
 *
 * lunar-javascript 는 간체 중국어를 반환한다 (七杀, 劫财, 马 …).
 * 경계에서 한 번만 한글로 바꾸고, 그 안쪽은 전부 한글 타입으로 다룬다.
 */

import type { Branch, Element, Stem, TenGod, TenGodCategory } from './types';

export const STEM_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const STEM_KO: readonly Stem[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

export const BRANCH_HANJA = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
] as const;
export const BRANCH_KO: readonly Branch[] = [
  '자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해',
];

/** 천간의 오행. 갑을=목, 병정=화, 무기=토, 경신=금, 임계=수 */
export const STEM_ELEMENT: readonly Element[] = [
  '목', '목', '화', '화', '토', '토', '금', '금', '수', '수',
];

/** 지지의 오행. 자=수, 축=토, 인묘=목, 진=토, 사오=화, 미=토, 신유=금, 술=토, 해=수 */
export const BRANCH_ELEMENT: readonly Element[] = [
  '수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수',
];

export const ELEMENT_HANJA: Record<Element, string> = {
  목: '木',
  화: '火',
  토: '土',
  금: '金',
  수: '水',
};

/** 오행 순서 — 목화토금수. 화면 표시 순서와 같다. */
export const ELEMENT_ORDER: readonly Element[] = ['목', '화', '토', '금', '수'];

export const ANIMAL_KO: readonly string[] = [
  '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지',
];

const ANIMAL_HANJA = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

export const ANIMAL_BY_HANJA: Record<string, string> = Object.fromEntries(
  ANIMAL_HANJA.map((h, i) => [h, ANIMAL_KO[i] as string]),
);

/**
 * 십성 매핑. 라이브러리는 간체를 쓰고 편관을 七杀 로 반환한다.
 * 偏官 표기도 함께 받아둔다 (다른 버전 대비).
 */
export const TEN_GOD_BY_HANJA: Record<string, TenGod> = {
  比肩: '비견',
  劫财: '겁재',
  劫財: '겁재',
  食神: '식신',
  伤官: '상관',
  傷官: '상관',
  偏财: '편재',
  偏財: '편재',
  正财: '정재',
  正財: '정재',
  七杀: '편관',
  七殺: '편관',
  偏官: '편관',
  正官: '정관',
  偏印: '편인',
  正印: '정인',
};

/** 십성 → 카테고리. 해석 텍스트 테이블의 키가 된다. */
export const TEN_GOD_CATEGORY: Record<TenGod, TenGodCategory> = {
  비견: '비겁',
  겁재: '비겁',
  식신: '식상',
  상관: '식상',
  편재: '재성',
  정재: '재성',
  편관: '관성',
  정관: '관성',
  편인: '인성',
  정인: '인성',
};

export const TEN_GOD_HANJA: Record<TenGod, string> = {
  비견: '比肩',
  겁재: '劫財',
  식신: '食神',
  상관: '傷官',
  편재: '偏財',
  정재: '正財',
  편관: '偏官',
  정관: '正官',
  편인: '偏印',
  정인: '正印',
};

export const stemIndex = (hanja: string): number => STEM_HANJA.indexOf(hanja as never);
export const branchIndex = (hanja: string): number => BRANCH_HANJA.indexOf(hanja as never);
