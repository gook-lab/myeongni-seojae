/**
 * 움직임을 원하지 않는 사람
 *
 * 관객이 부모님 세대다. prefers-reduced-motion 은 취향이 아니라 접근성이고,
 * 어지럼증이 있는 사람에게는 실제로 불편을 준다.
 *
 * 이 파일은 mobile·desktop 프로젝트에서 돈다. 두 프로젝트 모두
 * reducedMotion: 'reduce' 라서(playwright.config.ts) 별도 설정이 필요 없다.
 * 덤으로 모든 플로우 테스트가 매번 이 경로를 밟는다.
 */
import { expect, test } from './fixtures';

/**
 * 애니메이션이 다 멎을 때까지 기다린다.
 *
 * 엔진 청크가 382KB 에서 100KB 로 줄면서 화면이 빨라지자, 등장 애니메이션이
 * 도는 도중에 최종 상태를 읽는 경쟁이 드러났다. 앱이 빨라져서 생긴 실패이니
 * 기다리는 쪽을 고친다.
 */
async function settled(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => document.getAnimations().every((a) => a.playState !== 'running'),
    undefined,
    { timeout: 5000 },
  );
}

async function toTimeline(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await page.getByLabel('년', { exact: true }).selectOption('1957');
  await page.getByLabel('월', { exact: true }).selectOption('6');
  await page.getByLabel('일', { exact: true }).selectOption('15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();
  const timeline = page.getByRole('region', { name: '대운 인생 타임라인' });
  await expect(timeline).toBeVisible();
  return timeline;
}

test.describe('움직임을 줄인 설정', () => {
  test('★지연이 0 이다 — 칸이 늦게 나타나지 않는다★', async ({ page }) => {
    // duration 만 지우고 delay 를 남기면 칸이 한참 안 보인다.
    // 순차 등장을 넣으면서 실제로 걸릴 뻔한 자리다.
    const timeline = await toTimeline(page);
    const delays = await timeline.locator('ol > li').evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).animationDelay),
    );
    for (const d of delays) expect(d).toBe('0s');
  });

  test('계산 중 표시가 살아 있고 붓 획은 이동하지 않는다', async ({ page }) => {
    await page.goto('/');
    const v = await page.evaluate(() => {
      const breathe = document.createElement('span');
      breathe.className = 'ink-breathe';
      const sweep = document.createElement('span');
      sweep.className = 'stroke-sweep';
      document.body.append(breathe, sweep);
      const r = {
        breatheName: getComputedStyle(breathe).animationName,
        breatheCount: getComputedStyle(breathe).animationIterationCount,
        sweepName: getComputedStyle(sweep).animationName,
      };
      breathe.remove();
      sweep.remove();
      return r;
    });
    // 상태 표시는 계속 쉰다
    expect(v.breatheName).toBe('ink-breathe');
    expect(v.breatheCount).toBe('infinite');
    // 붓 획은 가로로 지나가는 이동이라 밝기 변화로 바뀐다
    expect(v.sweepName).toBe('ink-breathe');
  });

  test('이동이 들어간 등장은 페이드로 바뀐다', async ({ page }) => {
    await page.goto('/');
    const names = await page.evaluate(() => {
      const mk = (cls: string) => {
        const el = document.createElement('div');
        el.className = cls;
        document.body.append(el);
        const n = getComputedStyle(el).animationName;
        el.remove();
        return n;
      };
      return { screen: mk('screen-enter'), card: mk('card-enter'), bar: mk('bar-fill') };
    });
    expect(names.screen).toBe('ink-in-soft');
    expect(names.card).toBe('ink-in-soft');
    expect(names.bar).toBe('none');
  });

  test('모든 칸이 즉시 보인다', async ({ page }) => {
    const timeline = await toTimeline(page);
    await settled(page);
    const items = timeline.locator('ol > li');
    for (let i = 0; i < 10; i += 1) {
      const opacity = await items.nth(i).evaluate((el) => getComputedStyle(el).opacity);
      expect(Number(opacity)).toBe(1);
    }
  });
});
