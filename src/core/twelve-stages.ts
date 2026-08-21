/**
 * 명리서재 — 십이운성 (十二運星)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 무엇인가
 *
 * 일간이 어떤 지지를 만났을 때 힘이 어떤 상태인가를 열두 단계로 본다.
 * 사람의 한살이에 비유한 이름이 붙어 있다.
 *
 *   장생 → 목욕 → 관대 → 건록 → 제왕 → 쇠 → 병 → 사 → 묘 → 절 → 태 → 양
 *   (태어남)        (전성기)              (기울고)      (다시 잉태)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 대운에 넣는가
 *
 * 대운 칸이 간지와 십성만 보여주면 "그 10년에 무슨 일이 있나"는 알려주지만
 * "그때 내가 힘이 있었나"는 말해주지 않는다. 같은 편관 대운이어도
 * 건록·제왕 자리면 밀어붙일 힘이 있고, 절·묘 자리면 버티는 시기가 된다.
 *
 * 십이운성은 대운 읽기의 표준 요소다. 그리고 유파와 무관하게 표가 하나다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 표의 근거
 *
 * 양간은 순행하고 음간은 역행한다. 각 천간의 장생지에서 시작한다.
 *
 *   甲 亥생   乙 午생   丙戊 寅생   丁己 酉생
 *   庚 巳생   辛 子생   壬 申생     癸 卯생
 *
 * 이 표가 맞는지는 lunar-javascript 가 원국 지지에 대해 주는 값과
 * 대조해서 검증한다 (test/twelve-stages.test.ts).
 */

import type { Branch, Stem, TwelveStage } from './types';

export type { TwelveStage };

export const STAGE_ORDER: readonly TwelveStage[] = [
  '장생', '목욕', '관대', '건록', '제왕', '쇠',
  '병', '사', '묘', '절', '태', '양',
];

const STEM_ORDER: readonly Stem[] = [
  '갑', '을', '병', '정', '무', '기', '경', '신', '임', '계',
];

const BRANCH_ORDER: readonly Branch[] = [
  '자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해',
];

/** 각 천간의 장생지 (지지 인덱스) */
const BIRTH_BRANCH: readonly number[] = [
  11, // 갑 → 해
  6,  // 을 → 오
  2,  // 병 → 인
  9,  // 정 → 유
  2,  // 무 → 인 (병과 같다)
  9,  // 기 → 유 (정과 같다)
  5,  // 경 → 사
  0,  // 신 → 자
  8,  // 임 → 신
  3,  // 계 → 묘
];

/** 양간(짝수 인덱스)은 순행, 음간은 역행 */
const isYang = (stemIndex: number) => stemIndex % 2 === 0;

/**
 * 일간이 특정 지지에서 어떤 십이운성 자리에 있는가.
 *
 * @param stem   일간
 * @param branch 지지 (원국의 지지든 대운·세운 지지든 같다)
 */
export function twelveStage(stem: Stem, branch: Branch): TwelveStage {
  const si = STEM_ORDER.indexOf(stem);
  const bi = BRANCH_ORDER.indexOf(branch);
  if (si < 0 || bi < 0) return '장생';

  const start = BIRTH_BRANCH[si] as number;
  const step = isYang(si) ? bi - start : start - bi;
  const idx = ((step % 12) + 12) % 12;
  return STAGE_ORDER[idx] as TwelveStage;
}

/** 라이브러리(간체 중국어) 표기 → 한글 */
export const STAGE_BY_HANJA: Record<string, TwelveStage> = {
  长生: '장생', 長生: '장생',
  沐浴: '목욕',
  冠带: '관대', 冠帶: '관대',
  临官: '건록', 臨官: '건록', 建禄: '건록', 建祿: '건록',
  帝旺: '제왕',
  衰: '쇠',
  病: '병',
  死: '사',
  墓: '묘',
  绝: '절', 絕: '절',
  胎: '태',
  养: '양', 養: '양',
};

/**
 * 힘의 세기. 대운 칸에 막대로 보여줄 때 쓴다.
 *
 * 십이운성을 "좋다/나쁘다"로 나누지 않는다. 절·묘가 나쁜 시기라는 뜻이
 * 아니라 밖으로 뻗는 힘이 약한 대신 안으로 여무는 시기라는 뜻이다.
 * 그래서 이름을 strength 가 아니라 outwardness 로 둔다.
 */
export const STAGE_OUTWARDNESS: Record<TwelveStage, number> = {
  장생: 0.6,
  목욕: 0.5,
  관대: 0.75,
  건록: 0.95,
  제왕: 1.0,
  쇠: 0.6,
  병: 0.4,
  사: 0.25,
  묘: 0.2,
  절: 0.15,
  태: 0.3,
  양: 0.45,
};

export const STAGE_HANJA: Record<TwelveStage, string> = {
  장생: '長生', 목욕: '沐浴', 관대: '冠帶', 건록: '建祿',
  제왕: '帝旺', 쇠: '衰', 병: '病', 사: '死',
  묘: '墓', 절: '絕', 태: '胎', 양: '養',
};
