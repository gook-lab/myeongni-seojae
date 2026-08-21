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
  await expect(page.getByText('생년월일을 보내지 않습니다')).toBeVisible();
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

test.describe('개인정보 처리방침', () => {
  test('★인트로에서 열고, 읽고 나면 인트로로 돌아온다★', async ({ page }) => {
    // 홈으로 떨어뜨리면 아직 「시작하기」를 누르지도 않았는데 지나쳐버린다.
    await firstVisit(page);
    await page.getByRole('button', { name: '생년월일은 어디로 가나요' }).click();
    await expect(page.getByRole('heading', { name: '생년월일은 어디로 가나요' })).toBeVisible();
    await page.getByRole('button', { name: '‹ 돌아가기' }).click();
    await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible();
  });

  test('홈에서도 열리고 홈으로 돌아온다', async ({ page }) => {
    await firstVisit(page);
    await page.getByRole('button', { name: '시작하기' }).click();
    await page.getByRole('button', { name: '어디로 가는지 자세히 보기' }).click();
    await expect(page.getByRole('heading', { name: '생년월일은 어디로 가나요' })).toBeVisible();
    await page.getByRole('button', { name: '‹ 돌아가기' }).click();
    await expect(page.getByRole('button', { name: /^사주 보기/ })).toBeVisible();
  });

  test('★불리한 사실을 빼지 않는다★', async ({ page }) => {
    // 좋은 말만 적어두면 방침이 아니라 광고다.
    await firstVisit(page);
    await page.getByRole('button', { name: '생년월일은 어디로 가나요' }).click();
    await expect(
      page.getByText('링크를 받으신 분은 그 사주를 그대로 볼 수 있습니다'),
    ).toBeVisible();
    await expect(page.getByText(/오류가 났을 때만 오류 내용을 보냅니다/)).toBeVisible();
    await expect(page.getByText(/생년월일은 지우고 보냅니다/)).toBeVisible();
  });

  test('법률 문서 말투를 쓰지 않는다', async ({ page }) => {
    await firstVisit(page);
    await page.getByRole('button', { name: '생년월일은 어디로 가나요' }).click();
    const text = await page.locator('body').innerText();
    for (const jargon of ['제3자', '수탁', '위탁', '동의를 거부할 권리', '이용목적']) {
      expect(text, `"${jargon}" 이 들어 있다`).not.toContain(jargon);
    }
  });
});

test('★한 줄도 바깥으로 나가지 않는다★', async ({ page }) => {
  /*
   * 처리방침에 "아무 데도 보내지 않습니다" 라고 적어뒀다. 그 말이 참인지
   * 실제 네트워크로 확인한다 — 폰트 한 줄이면 조용히 되돌아가는 종류다.
   */
  const outside: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (!['127.0.0.1', 'localhost'].includes(host)) outside.push(r.url());
  });

  await firstVisit(page);
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await page.getByLabel('년', { exact: true }).selectOption('1957');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();
  await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();

  expect(outside, `바깥으로 나간 요청: ${outside.join(', ')}`).toEqual([]);
});

test('그래도 글꼴은 제대로 나온다', async ({ page }) => {
  await firstVisit(page);
  const font = await page.evaluate(() => {
    const el = document.querySelector('h1') ?? document.body;
    return getComputedStyle(el).fontFamily;
  });
  expect(font).toContain('Gowun Batang');

  // 조각이 실제로 내려오는가
  const loaded = await page.evaluate(async () => {
    await (document as unknown as { fonts: FontFaceSet }).fonts.ready;
    return (document as unknown as { fonts: FontFaceSet }).fonts.size > 0;
  });
  expect(loaded).toBe(true);
});
