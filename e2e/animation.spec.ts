/**
 * 움직임
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기서 지키는 것
 *
 * 1. 움직임이 실제로 있다. CSS 클래스만 붙고 아무것도 안 도는 상태를 막는다.
 * 2. **끝나면 제자리에 있다.** 등장 애니메이션이 opacity:0 에서 시작하므로,
 *    어떤 이유로 애니메이션이 안 끝나면 글자가 영영 안 보인다. 계산이
 *    틀리는 것보다 나쁜 종류의 실패다.
 * 3. 움직임을 원하지 않는 사람에게는 아무것도 움직이지 않는다. 관객이
 *    부모님 세대라 이건 취향이 아니라 접근성이다.
 *
 * 이 파일만 움직임을 켠 프로젝트(motion)에서 돈다. 나머지 플로우 테스트는
 * 전부 reducedMotion: 'reduce' 로 돈다 — Playwright 가 클릭 전에 애니메이션이
 * 멎기를 기다려서, 등장 애니메이션을 넣자 E2E 가 28초에서 58초로 늘었다.
 *
 * 움직임을 끈 쪽은 reduced-motion.spec.ts 가 본다.
 */
import { expect, test } from '@playwright/test';
import { openApp } from './fixtures';

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
  await openApp(page);
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await page.getByLabel('년', { exact: true }).selectOption('1957');
  await page.getByLabel('월', { exact: true }).selectOption('6');
  await page.getByLabel('일', { exact: true }).selectOption('15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();
  const timeline = page.getByRole('region', { name: '대운 인생 타임라인' });
  await expect(timeline).toBeVisible();
  return timeline;
}

test('애니메이션이 실제로 정의돼 있다', async ({ page }) => {
  await openApp(page);
  const names = await page.evaluate(() => {
    const out: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const r of Array.from(rules)) {
        if (r instanceof CSSKeyframesRule) out.push(r.name);
      }
    }
    return out;
  });
  expect(names).toContain('ink-in');
  expect(names).toContain('fold-open');
  expect(names).toContain('brush-down');
});

test('★칸이 순서대로 들어오되 끝나면 전부 제자리다★', async ({ page }) => {
  const timeline = await toTimeline(page);
  const items = timeline.locator('ol > li');
  await expect(items).toHaveCount(10);

  // 순차 등장이면 뒤쪽 칸의 지연이 더 길다
  const delays = await items.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).animationDelay),
  );
  expect(new Set(delays).size, `지연이 모두 같다: ${delays.join(',')}`).toBeGreaterThan(1);

  // 그리고 끝나면 하나도 빠짐없이 보여야 한다
  await settled(page);
  for (let i = 0; i < 10; i += 1) {
    await expect(items.nth(i)).toBeVisible();
    const opacity = await items.nth(i).evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity), `${i}번 칸이 투명하게 남았다`).toBe(1);
  }
});

test('칸을 펼치면 열리는 애니메이션이 돈다', async ({ page }) => {
  const timeline = await toTimeline(page);
  const first = timeline.locator('ol > li').first();
  await first.getByRole('button').first().click();

  const panel = first.locator('.fold-open');
  await expect(panel).toBeVisible();
  const anim = await panel.evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe('fold-open');

  // 열린 내용이 실제로 읽히는 높이를 갖는다
  const box = await panel.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(40);
});

test('세로선이 그어진다', async ({ page }) => {
  const timeline = await toTimeline(page);
  const ol = timeline.locator('ol').first();
  await expect(ol).toHaveClass(/brush-line/);
  const anim = await ol.evaluate((el) => getComputedStyle(el, '::before').animationName);
  expect(anim).toBe('brush-down');
});

test('힘 막대가 차오르고, 끝나면 제 길이다', async ({ page }) => {
  const timeline = await toTimeline(page);
  const bars = timeline.locator('.bar-fill');
  await expect(bars.first()).toBeVisible();
  // 애니메이션이 끝난 뒤 scaleX 가 1 이어야 원래 너비대로 보인다
  await page.waitForTimeout(1200);
  const transforms = await bars.evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).transform),
  );
  for (const t of transforms) {
    expect(t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)', `막대가 ${t} 로 남았다`).toBe(true);
  }
});

test('★계산 근거가 한 줄씩 드러난다 — 지어낸 값이 아니다★', async ({ page }) => {
  // 이 파일만 fixtures.ts 를 안 쓰므로 실제 표시 속도로 돈다.
  await openApp(page);
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await page.getByLabel('년', { exact: true }).selectOption('1957');
  await page.getByLabel('월', { exact: true }).selectOption('6');
  await page.getByLabel('일', { exact: true }).selectOption('15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();

  const calc = page.getByRole('region', { name: '사주를 계산하는 중' });
  await expect(calc).toBeVisible();

  /*
   * 1957년 6월은 표준시가 UTC+8:30 이면서 서머타임 구간이라 UTC+9:30 이다.
   * 이 두 겹이 실제로 반영된 값이 나와야 한다 — 지어낸 문구였다면
   * 이런 숫자가 나올 수 없다.
   */
  await expect(calc.getByText('UTC+9:30 · 서머타임')).toBeVisible();
  await expect(calc.getByText(/진태양시 보정/)).toBeVisible();
  await expect(calc.getByText('-62분 05초')).toBeVisible();
  await expect(calc.getByText(/여기 나온 값은 전부 방금 계산한 것입니다/)).toBeVisible();

  // 그리고 스스로 결과로 넘어간다
  await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible({
    timeout: 10_000,
  });
});

test('기다리기 싫으면 건너뛸 수 있다', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await page.getByLabel('년', { exact: true }).selectOption('1990');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();

  await page.getByRole('button', { name: '바로 결과 보기' }).click();
  await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();
});
