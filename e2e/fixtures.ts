/**
 * E2E 공통 — 움직임을 끈 page
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 설정이 아니라 픽스처인가
 *
 * playwright.config.ts 의 `use: { reducedMotion: 'reduce' }` 가 1.62.1 에서
 * 적용되지 않는다. config 최상위에 넣어도, 프로젝트 use 에 넣어도
 * matchMedia('(prefers-reduced-motion: reduce)') 가 false 로 나온다.
 * 같은 실행 안에서 page.emulateMedia() 로 직접 걸면 true 가 된다.
 *
 * 안 먹는 설정을 남겨두면 "움직임을 끄고 돈다" 는 거짓말이 되므로
 * 실제로 먹는 방법으로 건다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 끄고 도는가
 *
 * Playwright 는 클릭 전에 애니메이션이 멎기를 기다린다. 등장 애니메이션을
 * 넣자 E2E 가 28초에서 58초로 늘었다. 플로우 테스트가 확인하는 건 사람이
 * 끝까지 갈 수 있는가지 애니메이션이 아니다.
 *
 * 덤이 더 크다 — 움직임을 줄인 설정에서도 모든 플로우가 되는지가 매 실행마다
 * 확인된다. 관객이 부모님 세대라 이건 취향이 아니라 접근성이다.
 *
 * 움직임 자체는 animation.spec.ts 가 본다. 그 파일만 이 픽스처를 안 쓴다.
 */
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    /*
     * 계산 근거를 한 줄씩 드러내는 연출을 끈다.
     *
     * 제출하는 테스트가 예순 개쯤 되어 전체가 50초에서 1분 24초로 늘었다.
     * 플로우 테스트가 확인하는 건 사람이 끝까지 갈 수 있는가지 표시 속도가
     * 아니다. 연출 자체는 animation.spec.ts 가 이 구멍 없이 확인한다.
     */
    await page.addInitScript(() => {
      (globalThis as { __CALC_PACING_MS__?: number }).__CALC_PACING_MS__ = 0;
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * 앱을 열고 메뉴까지 간다.
 *
 * 첫 화면이 인트로라 메뉴 앞에 한 장이 있다. 플로우 테스트가 확인하는 건
 * 인트로가 아니라 그 뒤이므로 여기서 지나간다. 인트로 자체는
 * intro.spec.ts 가 본다.
 *
 * 이미 본 사람은 인트로가 안 뜨므로 있을 때만 누른다.
 */
export async function openApp(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  const start = page.getByRole('button', { name: '시작하기' });
  if (await start.isVisible().catch(() => false)) await start.click();
}
