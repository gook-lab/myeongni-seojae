import { expect, test } from './fixtures';

test('첫 방문 전송량', async ({ page }) => {
  let bytes = 0; const seen: string[] = [];
  page.on('response', async (r) => {
    try {
      const b = await r.body();
      bytes += b.length;
      if (b.length > 20000) seen.push(`${(b.length/1024).toFixed(0)}KB ${r.url().split('/').pop()}`);
    } catch { /* ignore */ }
  });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible();
  console.log(`인트로까지 전송: ${(bytes/1024).toFixed(0)}KB`);
  console.log('  큰 것들:', seen.join(' · '));

  const before = bytes;
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await expect(page.getByRole('button', { name: '사주 풀어보기' })).toBeVisible();
  console.log(`입력 화면까지 누적: ${(bytes/1024).toFixed(0)}KB (+${((bytes-before)/1024).toFixed(0)}KB)`);
});

test('키보드만으로 결과까지', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: '시작하기' })).toBeVisible();

  const reachable: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24),
        outline: cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px',
      };
    });
    if (!info) break;
    reachable.push(`${info.tag}:${info.label}${info.outline ? '' : ' ★포커스링없음★'}`);
  }
  console.log('탭 순서:', reachable.join(' → '));
  expect(reachable.length).toBeGreaterThan(1);
});

test('이미지 없는 아이콘 · 라벨 없는 컨트롤', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: '시작하기' }).click();
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('button, select, input, textarea'))) {
      const name = (el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.textContent ?? '').trim();
      const labelled = el.id && document.querySelector(`label[for="${el.id}"]`);
      if (!name && !labelled) out.push(el.outerHTML.slice(0, 80));
    }
    return out;
  });
  console.log('라벨 없는 컨트롤:', bad.length === 0 ? '없음' : bad.join(' | '));
  expect(bad).toEqual([]);
});
