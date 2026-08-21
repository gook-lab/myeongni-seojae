/**
 * 첫 화면 — 인트로
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기서 지키는 것
 *
 * 1. 이 앱이 무엇을 **하지 않는지**를 먼저 말한다. 겁주지 않고, 점수
 *    매기지 않고, 생년월일을 가져가지 않는다 — 이 프로젝트의 시작점이다.
 * 2. **문턱이 되면 안 된다.** 성공 기준이 "부모님께 링크를 보내드렸을 때
 *    도움 없이 결과 화면까지 도달하신다" 이므로, 링크로 열면 인트로를
 *    거치지 않아야 하고 한 번 본 사람은 다시 안 봐야 한다.
 * 3. 오늘의 일진은 장식이 아니라 **방금 계산한 값**이어야 한다.
 *
 * 이 파일은 인트로를 지나가지 않으므로 fixtures 의 openApp 을 쓰지 않는다.
 */
import { expect, test } from './fixtures';

/** 저장소를 비워 "처음 온 사람" 으로 만든다 */
async function firstVisit(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test('처음 오면 인트로가 뜬다', async ({ page }) => {
  await firstVisit(page);
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible();
  // 메뉴는 아직 없다
  await expect(page.getByRole('button', { name: /^사주 보기/ })).toHaveCount(0);
});

test('★무엇을 하지 않는지 먼저 말한다★', async ({ page }) => {
  await firstVisit(page);
  await expect(page.getByText('겁주지 않습니다')).toBeVisible();
  await expect(page.getByText('점수를 매기지 않습니다')).toBeVisible();
  await expect(page.getByText('생년월일을 가져가지 않습니다')).toBeVisible();
});

test('★오늘의 일진이 진짜로 계산된 값이다★', async ({ page }) => {
  await firstVisit(page);

  // 화면이 말하는 일진
  const shown = await page.getByRole('button', { name: /오늘은 .*일입니다/ })
    .getAttribute('aria-label');
  const match = /오늘은 (..)일입니다/.exec(shown ?? '');
  expect(match, `aria-label 을 못 읽었다: ${shown}`).not.toBeNull();

  // 율리우스일로 직접 구한 값과 같아야 한다.
  // 하드코딩이면 이 검사를 통과할 수 없다.
  const expected = await page.evaluate(() => {
    const S = '갑을병정무기경신임계';
    const B = '자축인묘진사오미신유술해';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
    const [y, m, d] = parts.split('-').map(Number) as [number, number, number];
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    const jdn =
      d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
      Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    const i = (jdn + 49) % 60;
    return S[i % 10] + B[i % 12];
  });
  expect(match?.[1]).toBe(expected);
});

test('도장을 누르면 다시 찍힌다', async ({ page }) => {
  await firstVisit(page);
  const seal = page.getByRole('button', { name: /오늘은 .*일입니다/ });
  await seal.click();
  // 눌러도 화면이 넘어가지 않는다 — 시작하기만 넘긴다
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible();
});

test('시작하기를 누르면 메뉴가 나온다', async ({ page }) => {
  await firstVisit(page);
  await page.getByRole('button', { name: '시작하기' }).click();
  await expect(page.getByRole('button', { name: /^사주 보기/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '오늘' })).toBeVisible();
});

test('★한 번 본 사람은 다시 안 본다 — 문턱이 되면 안 된다★', async ({ page }) => {
  await firstVisit(page);
  await page.getByRole('button', { name: '시작하기' }).click();
  await expect(page.getByRole('button', { name: /^사주 보기/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /^사주 보기/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '시작하기' })).toHaveCount(0);
});

test('★공유 링크로 열면 인트로를 거치지 않는다★', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await firstVisit(page);
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await page.getByLabel('년', { exact: true }).selectOption('1957');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();
  await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();
  await page.getByRole('button', { name: '결과 링크 복사' }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());

  // 인트로를 한 번도 안 본 새 탭에서 링크를 연다
  const fresh = await context.newPage();
  await fresh.goto('about:blank');
  await fresh.goto(url);
  await fresh.evaluate(() => localStorage.removeItem('myeongri.seen-intro.v1'));
  await fresh.goto(url);
  await expect(fresh.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();
  await expect(fresh.getByRole('button', { name: '시작하기' })).toHaveCount(0);
  await fresh.close();
});
