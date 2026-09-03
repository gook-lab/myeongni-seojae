/**
 * 문서용 스크린샷 생성기
 *
 * README 와 포트폴리오에 들어가는 화면을 여기서 찍는다. 손으로 찍으면
 * 화면이 바뀔 때마다 문서가 조용히 낡으므로, 테스트와 같은 도구로 만든다.
 *
 *   pnpm shots
 *
 * 기본 실행에는 포함되지 않는다(playwright.config.ts 의 testIgnore).
 * 화면을 손본 뒤 한 번 돌려 docs/screenshots/ 를 갱신한다.
 *
 * 찍고 나서 폭 720px 로 줄인다. 모바일 뷰포트가 4.5배 밀도라 원본이
 * 1440px 인데, 문서에 넣을 그림이 장당 수백 KB 일 이유가 없다.
 */
import { spawnSync } from 'node:child_process';
import { expect, test } from './fixtures';

const OUT = 'docs/screenshots';

async function fresh(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function toResult(page: import('@playwright/test').Page) {
  await fresh(page);
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await page.getByLabel('년', { exact: true }).selectOption('1957');
  await page.getByLabel('월', { exact: true }).selectOption('6');
  await page.getByLabel('일', { exact: true }).selectOption('15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();
  await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();
}

async function shot(
  page: import('@playwright/test').Page,
  name: string,
  full = false,
): Promise<void> {
  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: full });
  shrink(path);
}

/** macOS sips 로 폭을 줄인다. 없으면 원본 그대로 둔다. */
function shrink(path: string): void {
  const r = spawnSync('sips', ['-Z', '720', path, '--out', path], { stdio: 'ignore' });
  if (r.error) console.warn(`sips 를 못 찾아 원본 크기로 둡니다: ${path}`);
}

test('01 인트로', async ({ page }) => {
  await fresh(page);
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible();
  await page.waitForTimeout(900);
  await shot(page, '01-intro');
});

test('02 홈', async ({ page }) => {
  await fresh(page);
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.waitForTimeout(500);
  await shot(page, '02-home');
});

test('03 입력', async ({ page }) => {
  await fresh(page);
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await page.waitForTimeout(500);
  await shot(page, '03-input');
});

test('04 계산 중', async ({ page }) => {
  await fresh(page);
  await page.addInitScript(() => {
    (globalThis as { __CALC_PACING_MS__?: number }).__CALC_PACING_MS__ = 4000;
  });
  await page.reload();
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await page.getByLabel('년', { exact: true }).selectOption('1957');
  await page.getByLabel('월', { exact: true }).selectOption('6');
  await page.getByLabel('일', { exact: true }).selectOption('15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();
  await expect(page.getByText('UTC+9:30 · 서머타임')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(4200);
  await shot(page, '04-calculating');
});

test('05 결과 타임라인', async ({ page }) => {
  await toResult(page);
  await page.waitForTimeout(1400);
  await shot(page, '05-result');
  await shot(page, '05-result-full', true);
});

test('06 대운 펼침', async ({ page }) => {
  await toResult(page);
  const tl = page.getByRole('region', { name: '대운 인생 타임라인' });
  await tl.locator('ol > li').first().getByRole('button').first().click();
  await page.waitForTimeout(700);
  await shot(page, '06-card-open');
});

test('07 상세 풀이', async ({ page }) => {
  await toResult(page);
  await page.getByRole('button', { name: '상세 풀이 보기' }).click();
  await page.waitForTimeout(700);
  await shot(page, '07-detail');
});

test('08 리포트', async ({ page }) => {
  await toResult(page);
  await page.getByRole('button', { name: '리포트 · 인쇄하기' }).click();
  await page.waitForTimeout(700);
  await shot(page, '08-report');
  await shot(page, '08-report-full', true);
});

test('09 오늘', async ({ page }) => {
  await toResult(page);
  await page.getByRole('button', { name: /^홈으로/ }).click();
  await page.getByRole('button', { name: '오늘' }).click();
  await expect(page.getByText('오늘 들어오는 기운', { exact: true })).toBeVisible();
  await page.waitForTimeout(700);
  await shot(page, '09-daily', true);
});

test('10 궁합', async ({ page }) => {
  await toResult(page);
  await page.getByRole('button', { name: /^홈으로/ }).click();
  await page.getByRole('button', { name: '궁합' }).click();
  // 입력만 찍으면 궁합이 무엇을 보는지가 안 보인다. 결과까지 간다.
  await page.getByRole('button', { name: '궁합 보기' }).click();
  await expect(page.getByText('두 분의 명식')).toBeVisible();
  await page.waitForTimeout(900);
  await shot(page, '10-gunghap', true);
});

test('11 신년', async ({ page }) => {
  await toResult(page);
  await page.getByRole('button', { name: /^홈으로/ }).click();
  await page.getByRole('button', { name: '신년' }).click();
  await expect(page.getByText('올해 들어오는 기운', { exact: true })).toBeVisible();
  await page.waitForTimeout(700);
  await shot(page, '11-year', true);
});

test('13 처리방침', async ({ page }) => {
  await fresh(page);
  await page.getByRole('button', { name: '개인정보 처리 및 삭제 안내' }).click();
  await expect(page.getByRole('heading', { name: '생년월일은 어디로 가나요' })).toBeVisible();
  await page.waitForTimeout(600);
  await shot(page, '13-privacy', true);
});

test('12 404', async ({ page }) => {
  await page.goto('/404.html');
  await page.waitForTimeout(800);
  await shot(page, '12-404');
});
