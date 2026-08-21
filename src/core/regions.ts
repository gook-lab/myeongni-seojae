/**
 * 명리서재 — 출생지 경도 (설계 rev.2 Open Question 2)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 필요한가
 *
 * 진태양시는 "그 자리에서 해가 어디 있었나"이므로 경도가 필요하다.
 * 서울과 강릉은 경도차가 약 1.9° = 7.6분, 서울과 신의주는 더 크다.
 *
 * 실용적으로는 시 경계(2시간) ±8분 안에 태어난 사람만 갈린다. 즉
 * 대부분은 서울 고정으로도 같은 답이 나온다. 그래서 기본값은 서울이고
 * 바꾸고 싶은 사람만 바꾼다 — 부모님 세대에게 선택지를 하나 더 들이미는
 * 것 자체가 비용이기 때문이다.
 *
 * 경도는 각 시·도청 소재지 기준이다. 같은 도 안에서도 수십 km 차이가
 * 나지만 그건 1분 미만이라 무시한다.
 */

export interface Region {
  /** 화면에 보일 이름 */
  name: string;
  /** 동경 (양수) */
  longitude: number;
}

export const SEOUL: Region = { name: '서울', longitude: 126.978 };

/**
 * 광역시·도 소재지. 남한 위주이되, 부모님·조부모님 세대를 위해
 * 이북 주요 도시도 넣는다 — 1900~1940년대생에게는 실제로 필요하다.
 */
export const REGIONS: readonly Region[] = [
  SEOUL,
  { name: '인천', longitude: 126.705 },
  { name: '수원 · 경기', longitude: 127.010 },
  { name: '춘천 · 강원', longitude: 127.729 },
  { name: '강릉', longitude: 128.896 },
  { name: '대전 · 충남', longitude: 127.385 },
  { name: '청주 · 충북', longitude: 127.489 },
  { name: '전주 · 전북', longitude: 127.148 },
  { name: '광주 · 전남', longitude: 126.851 },
  { name: '대구 · 경북', longitude: 128.601 },
  { name: '부산', longitude: 129.075 },
  { name: '울산', longitude: 129.311 },
  { name: '창원 · 경남', longitude: 128.682 },
  { name: '포항', longitude: 129.365 },
  { name: '제주', longitude: 126.531 },
  { name: '개성', longitude: 126.554 },
  { name: '평양', longitude: 125.738 },
  { name: '함흥', longitude: 127.536 },
  { name: '신의주', longitude: 124.398 },
];

export function findRegion(longitude: number): Region | undefined {
  return REGIONS.find((r) => Math.abs(r.longitude - longitude) < 0.0005);
}

/**
 * 서울 대비 몇 분 차이 나는지. UI 가 "서울보다 8분 이릅니다" 로 보여준다.
 * 동쪽일수록 해가 먼저 뜨므로 진태양시가 앞선다.
 */
export function minutesFromSeoul(longitude: number): number {
  return ((longitude - SEOUL.longitude) / 15) * 60;
}
