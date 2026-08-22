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
    await page.getByRole('button', { name: '어디로 가는지 · 지우는 법' }).click();
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

test.describe('용어 — 모르는 말이 나오면', () => {
  async function toDetail(page: import('@playwright/test').Page) {
    await firstVisit(page);
    await page.getByRole('button', { name: '시작하기' }).click();
    await page.getByRole('button', { name: /^사주 보기/ }).click();
    await page.getByLabel('년', { exact: true }).selectOption('1957');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    await page.getByRole('button', { name: '상세 풀이 보기' }).click();
  }

  test('★상세 풀이에서 바로 닿는다★', async ({ page }) => {
    // 편관·장생·공망이 쏟아지는 화면이 바로 여기다.
    await toDetail(page);
    await page.getByRole('button', { name: '모르는 말이 나오면' }).click();
    await expect(page.getByRole('heading', { name: '모르는 말이 나오면' })).toBeVisible();
  });

  test('★한자 풀이가 아니라 어디서 만나는 말인지부터 적는다★', async ({ page }) => {
    await toDetail(page);
    await page.getByRole('button', { name: '모르는 말이 나오면' }).click();
    await expect(page.getByText('인생 타임라인의 열 칸')).toBeVisible();
    await expect(page.getByText('표에서 굵은 테두리가 쳐진 글자')).toBeVisible();
  });

  test('십성 열 가지와 십이운성 열두 자리가 다 있다', async ({ page }) => {
    await toDetail(page);
    await page.getByRole('button', { name: '모르는 말이 나오면' }).click();
    for (const t of ['편관', '정인', '식신']) {
      await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
    }
    for (const t of ['장생', '제왕', '묘']) {
      await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
    }
  });

  test('유파 차이를 밝힌다', async ({ page }) => {
    await toDetail(page);
    await page.getByRole('button', { name: '모르는 말이 나오면' }).click();
    await expect(page.getByText(/유파마다 조금씩 다르게 씁니다/)).toBeVisible();
  });

  test('읽고 나면 왔던 자리로 돌아온다', async ({ page }) => {
    await toDetail(page);
    await page.getByRole('button', { name: '모르는 말이 나오면' }).click();
    await page.getByRole('button', { name: '‹ 돌아가기' }).click();
    await expect(page.getByRole('button', { name: '‹ 타임라인' })).toBeVisible();
  });

  test('★인쇄물에도 용어가 실린다 — 종이는 누를 데가 없다★', async ({ page }) => {
    await firstVisit(page);
    await page.getByRole('button', { name: '시작하기' }).click();
    await page.getByRole('button', { name: /^사주 보기/ }).click();
    await page.getByLabel('년', { exact: true }).selectOption('1957');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    await page.getByRole('button', { name: '리포트 · 인쇄하기' }).click();
    await expect(page.getByRole('heading', { name: '용어' })).toBeVisible();
    await expect(page.getByText(/이 문서의 뜻입니다/)).toBeVisible();
  });
});


test.describe('초기화 — 남는 것 없이', () => {
  async function toResult(page: import('@playwright/test').Page) {
    await firstVisit(page);
    await page.getByRole('button', { name: '시작하기' }).click();
    await page.getByRole('button', { name: /^사주 보기/ }).click();
    await page.getByLabel('년', { exact: true }).selectOption('1957');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();
  }

  test('★공유 링크로 들어와도 다시 보기를 누르면 주소가 남지 않는다★', async ({
    page,
    context,
  }) => {
    /*
     * 화면은 비워지는데 주소에는 앞 사람이 그대로 남아 있었다.
     * 새로고침 한 번에 되살아난다.
     */
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await toResult(page);
    await page.getByRole('button', { name: '결과 링크 복사' }).click();
    const url = await page.evaluate(() => navigator.clipboard.readText());

    const fresh = await context.newPage();
    await fresh.goto(url);
    await expect(fresh.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();

    await fresh.getByRole('button', { name: /^처음부터 다시/ }).click();
    expect(fresh.url()).not.toContain('#r=');

    await fresh.reload();
    await expect(fresh.getByRole('region', { name: '대운 인생 타임라인' })).toHaveCount(0);
    await fresh.close();
  });

  test('★전부 지우면 처음 온 사람이 된다★', async ({ page }) => {
    await toResult(page);
    // 대운 칸에 기록을 남기고
    const tl = page.getByRole('region', { name: '대운 인생 타임라인' });
    await tl.locator('ol > li').first().getByRole('button').first().click();
    await tl.locator('textarea').first().fill('여기 적어둔 것');

    await page.getByRole('button', { name: /^홈으로/ }).click();
    await page.getByRole('button', { name: '어디로 가는지 · 지우는 법' }).click();
    await page.getByRole('button', { name: '이 기기에서 전부 지우기' }).click();

    // 되돌릴 수 없으므로 한 번 묻는다
    await expect(page.getByText('정말 지울까요? 되돌릴 수 없습니다.')).toBeVisible();
    await page.getByRole('button', { name: '전부 지우기' }).click();

    // 첫 화면으로 돌아온다
    await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible();

    // 저장된 것이 하나도 없다
    const left = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('myeongri.')),
    );
    expect(left).toEqual([]);
  });

  test('그만두기를 누르면 아무것도 안 지운다', async ({ page }) => {
    await toResult(page);
    await page.getByRole('button', { name: /^홈으로/ }).click();
    await page.getByRole('button', { name: '어디로 가는지 · 지우는 법' }).click();
    await page.getByRole('button', { name: '이 기기에서 전부 지우기' }).click();
    await page.getByRole('button', { name: '그만두기' }).click();

    const left = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('myeongri.')),
    );
    expect(left.length).toBeGreaterThan(0);
  });

  test('브라우저 설정으로 떠넘기지 않는다', async ({ page }) => {
    await firstVisit(page);
    await page.getByRole('button', { name: '생년월일은 어디로 가나요' }).click();
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('브라우저에서 이 사이트의 데이터를 삭제');
    await expect(page.getByRole('button', { name: '이 기기에서 전부 지우기' })).toBeVisible();
  });
});
