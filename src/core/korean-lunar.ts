/**
 * 명리서재 — 한국 음력
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 한국 음력과 중국 음력은 같지 않다
 *
 * 음력 달은 삭(朔, 신월)이 드는 **날**에 시작한다. "순간" 이 아니라 "날" 이다.
 * 그래서 삭이 자정 근처에 들면 어느 시간대로 읽느냐에 따라 달의 시작이
 * 하루 갈린다. 중국 음력은 UTC+8, 한국 음력(한국천문연구원)은 KST 로 읽는다.
 *
 * 1900~2050 사이 삭 1,868회 중 **67회(3.6%)** 가 두 기준에서 다른 날짜다.
 * 그 달에 태어난 사람은 음력 생일을 양력으로 옮길 때 하루가 어긋난다.
 * 하루가 어긋나면 **일주가 통째로 바뀐다.**
 *
 * 더 큰 것도 있다. 윤달은 中氣가 없는 달인데, 中氣 역시 "날" 로 판정한다.
 * 2017년 대서(大暑)는 UTC+8 로 7월 22일 23:15, KST 로 7월 23일 00:15 이다.
 * 이 한 시간 때문에 中氣가 앞 달에 속하느냐 뒤 달에 속하느냐가 갈리고,
 * 결과적으로 **윤달이 통째로 한 달 옮겨간다** — 중국은 윤6월, 한국은 윤5월.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 어느 라이브러리가 어느 쪽인가
 *
 * 어느 쪽도 믿지 않고 규칙을 직접 구현해 판정했다. 천체력(astronomy-engine)
 * 으로 삭과 中氣의 순간을 구한 뒤, 각 시간대의 날짜로 달을 매겨 대조했다
 * (test/korean-lunar.test.ts).
 *
 *   평달 1일 1,811건 대조
 *   lunar-javascript      UTC+8 규칙 99.78%  ·  KST 규칙 96.13%
 *   korean-lunar-calendar UTC+8 규칙 96.74%  ·  KST 규칙 99.50%
 *
 * lunar-javascript 는 중국 음력, korean-lunar-calendar 는 한국 음력이다.
 * korean-lunar-calendar 가 어긋나는 건 전부 1911년 이전 — 한국이 표준시를
 * 정하기 전 구간이다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 그래서 이 파일의 역할
 *
 * 사용자가 입력하는 음력은 가족관계등록부에 적힌 **한국 음력**이다.
 * 음↔양 변환만 이쪽으로 넘긴다. 절기와 간지는 UTC+8 표가 맞다는 걸
 * 이미 검증했으므로(test/solar-terms.test.ts) 그대로 lunar-javascript 를 쓴다.
 *
 *   음↔양 변환   한국 기준 (이 파일)
 *   절기 · 간지   UTC+8 표 (core/manse.ts)
 *
 * 이 갈라놓기가 이 프로젝트의 두 타임라인 구조와 같은 결이다.
 */

import KoreanLunarCalendar from 'korean-lunar-calendar';

/**
 * 한국천문연구원 음양력 자료의 상한. 이 라이브러리가 담고 있는 범위다.
 * 넘어가면 중국 음력으로 물러난다 — 그 사실을 조용히 넘기지 않고 알린다.
 */
export const KOREAN_LUNAR_MAX_YEAR = 2050;
export const KOREAN_LUNAR_MIN_YEAR = 1900;

export interface Ymd {
  year: number;
  month: number;
  day: number;
}

export function supportsKoreanLunar(year: number): boolean {
  return year >= KOREAN_LUNAR_MIN_YEAR && year <= KOREAN_LUNAR_MAX_YEAR;
}

/**
 * 인스턴스를 매번 새로 만든다.
 *
 * 이 라이브러리는 setLunarDate/setSolarDate 로 내부 상태를 바꾸고 getter 로
 * 읽는 방식이다. 인스턴스를 공유하면 호출 순서에 따라 앞 계산 결과를
 * 읽어버릴 수 있다. 사주 한 번 뽑는 데 몇 번 부르지도 않으므로 아낄 이유가 없다.
 */
function calendar(): KoreanLunarCalendar {
  return new KoreanLunarCalendar();
}

/** 한국 음력 → 양력. 그런 날짜가 없으면 null. */
export function koreanLunarToSolar(
  year: number,
  month: number,
  day: number,
  leapMonth: boolean,
): Ymd | null {
  if (!supportsKoreanLunar(year)) return null;
  const c = calendar();
  if (!c.setLunarDate(year, month, day, leapMonth)) return null;
  const s = c.getSolarCalendar();
  if (!s || !s.year) return null;
  return { year: s.year, month: s.month, day: s.day };
}

/** 양력 → 한국 음력. 표시용이다. */
export function solarToKoreanLunar(
  year: number,
  month: number,
  day: number,
): (Ymd & { leapMonth: boolean }) | null {
  if (!supportsKoreanLunar(year)) return null;
  const c = calendar();
  if (!c.setSolarDate(year, month, day)) return null;
  const l = c.getLunarCalendar();
  if (!l || !l.year) return null;
  return { year: l.year, month: l.month, day: l.day, leapMonth: l.intercalation === true };
}

/**
 * 그 해 한국 음력의 윤달. 없으면 0, 지원 범위 밖이면 null.
 *
 * 중국 음력과 다를 수 있다 — 2017년은 한국 윤5월, 중국 윤6월이다.
 * 윤달 체크박스를 이 값으로 판정해야 사용자가 가족관계등록부에 적힌 대로
 * 넣었을 때 통과한다.
 */
export function koreanLeapMonthOf(year: number): number | null {
  if (!supportsKoreanLunar(year)) return null;
  for (let m = 1; m <= 12; m += 1) {
    const c = calendar();
    // 윤달 1일이 존재하면 그 달이 그 해의 윤달이다
    if (c.setLunarDate(year, m, 1, true)) return m;
  }
  return 0;
}
