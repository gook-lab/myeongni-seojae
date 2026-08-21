/**
 * 명리서재 E2E — 사용자 플로우
 *
 * 단위 테스트는 계산이 맞는지 본다. 여기서는 사람이 끝까지 갈 수 있는지 본다.
 *
 * 기준선: 설계 rev.2 성공 기준 7 —
 * "부모님께 링크를 보내드렸을 때, 도움 없이 결과 화면까지 도달하신다."
 * 그래서 대표 시나리오가 1957년생 · 음력 · 시간 미상이다.
 */

import { expect, test } from '@playwright/test';

/** 생년월일을 셀렉트로 채운다 */
async function fillBirth(
  page: import('@playwright/test').Page,
  year: string,
  month: string,
  day: string,
) {
  await page.getByLabel('년', { exact: true }).selectOption(year);
  await page.getByLabel('월', { exact: true }).selectOption(month);
  await page.getByLabel('일', { exact: true }).selectOption(day);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // 원안 와이어플로우대로 홈 → 사주 보기로 들어간다
  await page.getByRole('button', { name: /^사주 보기/ }).click();
});

test('첫 화면에서 시간 미상이 이미 골라져 있다', async ({ page }) => {
  // 모르는 게 예외가 아니라 기본값인 관객이다
  await expect(page.getByRole('button', { name: '모릅니다' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText('대운 타임라인은 그대로')).toBeVisible();
});

test('양력 + 시간 미상으로 타임라인까지 간다', async ({ page }) => {
  await fillBirth(page, '1957', '6', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();

  const timeline = page.getByRole('region', { name: '대운 인생 타임라인' });
  await expect(timeline).toBeVisible();

  // 대운 10칸이 전부 나온다
  await expect(timeline.locator('ol > li')).toHaveCount(10);

  // 시각을 몰라도 정확하다는 안내
  await expect(page.getByText('그대로 정확합니다')).toBeVisible();
});

test('음력 + 윤달로도 타임라인까지 간다', async ({ page }) => {
  await page.getByRole('button', { name: '음력' }).click();
  await expect(page.getByLabel('윤달로 태어났습니다')).toBeVisible();
  await page.getByLabel('윤달로 태어났습니다').check();

  await fillBirth(page, '2023', '2', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();

  await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();
});

test('없는 윤달을 고르면 조용히 틀리지 않고 안내한다', async ({ page }) => {
  await page.getByRole('button', { name: '음력' }).click();
  await page.getByLabel('윤달로 태어났습니다').check();
  // 2026년에는 윤달이 없다
  await fillBirth(page, '2026', '2', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();

  await expect(page.getByRole('alert')).toContainText('윤달이 없습니다');
  // 결과 화면으로 넘어가지 않는다
  await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toHaveCount(0);
});

test('현재 대운이 강조되고 기본으로 펼쳐진다', async ({ page }) => {
  await fillBirth(page, '1957', '6', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();

  const timeline = page.getByRole('region', { name: '대운 인생 타임라인' });
  await expect(timeline.getByText('지금', { exact: true })).toHaveCount(1);

  // 펼쳐진 칸이 정확히 하나
  await expect(timeline.locator('button[aria-expanded="true"]')).toHaveCount(1);
  await expect(timeline.getByText('지금 지나고 있는 10년입니다.')).toBeVisible();
});

test('지나온 대운을 펼치면 대조를 권한다', async ({ page }) => {
  await fillBirth(page, '1957', '6', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();

  const timeline = page.getByRole('region', { name: '대운 인생 타임라인' });
  // 첫 칸은 반드시 과거다 (1957년생 기준)
  await timeline.locator('ol > li').first().getByRole('button').first().click();

  await expect(timeline.getByText('이미 지나온 10년입니다. 그때가 어땠는지 맞춰보세요.')).toBeVisible();
});

test('시간 미상이어도 사주팔자표가 나오고 시주만 비어 있다', async ({ page }) => {
  await fillBirth(page, '1957', '6', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();

  const table = page.getByRole('region', { name: '사주팔자' });
  await expect(table).toBeVisible();
  await expect(table.getByText('시각미상')).toBeVisible();
  await expect(page.getByText('여섯 글자 기준')).toBeVisible();
});

test('★1954~61 구간★ 표준시 이력이 결과에 반영된다', async ({ page }) => {
  // 1957 입춘 = UTC 01:55. 당시 표준시 UTC+8:30 이므로 시계로 10:25.
  // KST 10:20 출생 → 입춘 이전 → 丙申(전년)
  // KST 10:30 출생 → 입춘 이후 → 丁酉(당년)
  // KST=UTC+9 로 가정하는 구현은 둘 다 丙申 으로 낸다.
  const yearPillar = async (hour: string, minute: string) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^사주 보기/ }).click();
    await page.getByRole('button', { name: '압니다' }).click();
    await fillBirth(page, '1957', '2', '4');
    await page.getByLabel('시', { exact: true }).selectOption(hour);
    await page.getByLabel('분', { exact: true }).selectOption(minute);
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    const table = page.getByRole('region', { name: '사주팔자' });
    await expect(table).toBeVisible();
    return table.locator('div > div').last().innerText();
  };

  expect(await yearPillar('10', '20')).toContain('丙');
  expect(await yearPillar('10', '30')).toContain('丁');
});

test('큰 글씨 모드가 가로 스크롤을 만들지 않는다', async ({ page }) => {
  await fillBirth(page, '1957', '6', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();
  await page.getByRole('button', { name: '아주 크게' }).click();

  await expect(page.locator('html')).toHaveAttribute('data-scale', 'xlarge');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('공유 버튼이 펼친 카드에 나온다', async ({ page }) => {
  await fillBirth(page, '1957', '6', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();

  const timeline = page.getByRole('region', { name: '대운 인생 타임라인' });
  await expect(timeline.getByRole('button', { name: '이 10년 공유하기' })).toHaveCount(1);
});

test('다른 사람 사주 보기로 입력 화면에 돌아온다', async ({ page }) => {
  await fillBirth(page, '1957', '6', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();
  await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();

  await page.getByRole('button', { name: '다른 사람 사주 보기' }).click();
  await expect(page.getByRole('button', { name: '사주 풀어보기' })).toBeVisible();
});

test('세부 설정은 접혀 있고 열면 기본값이 보인다', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /세부 설정/ });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();

  await expect(page.getByLabel('태어난 지역')).toHaveValue('126.978');
  await expect(page.getByRole('button', { name: '일주 유지' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel(/균시차 보정/)).not.toBeChecked();
});

test('★프라이버시★ URL 에 생년월일이 남지 않는다', async ({ page }) => {
  await fillBirth(page, '1957', '6', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();
  await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();

  const url = page.url();
  expect(url).not.toContain('1957');
  expect(url).not.toContain('#');
});

test('콘솔 에러 없이 전체 플로우가 끝난다', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.getByRole('button', { name: /^사주 보기/ }).click();
  await fillBirth(page, '1957', '6', '15');
  await page.getByRole('button', { name: '사주 풀어보기' }).click();
  await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();
  await page.getByRole('button', { name: '아주 크게' }).click();

  expect(errors).toEqual([]);
});

test.describe('원안 구조 — 홈 네비 + 별도 화면', () => {
  test('홈이 첫 화면이고 부가 기능은 사주 전에는 잠겨 있다', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /^사주 보기/ })).toBeVisible();
    await expect(page.getByText('사주를 먼저 본 뒤에 열립니다')).toBeVisible();
    await expect(page.getByText('잠김').first()).toBeVisible();
  });

  test('사주 없이 궁합을 누르면 입력 화면으로 보낸다', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /궁합/ }).click();
    await expect(page.getByRole('button', { name: '사주 풀어보기' })).toBeVisible();
  });

  test('사주를 보고 나면 홈에서 부가 화면이 열린다', async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    await page.getByRole('button', { name: /홈으로/ }).click();

    await expect(page.getByText('내 명식으로 이어서 봅니다')).toBeVisible();
    await expect(page.getByText('잠김')).toHaveCount(0);
  });

  test('궁합이 독립 화면으로 열리고 시각 없이 동작한다', async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    await page.getByRole('button', { name: /홈으로/ }).click();
    await page.getByRole('button', { name: /궁합/ }).click();

    const screen = page.getByRole('region', { name: '궁합' });
    await expect(screen).toBeVisible();
    // 타임라인은 이 화면에 없다 — 쌓지 않았다는 뜻
    await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toHaveCount(0);

    await screen.getByLabel('상대 년').selectOption('1960');
    await screen.getByLabel('상대 월').selectOption('3');
    await screen.getByLabel('상대 일').selectOption('12');
    await screen.getByRole('button', { name: '궁합 보기' }).click();
    await expect(screen.locator('article')).toContainText('일간');
  });

  test('오늘·신년도 독립 화면이다', async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    await page.getByRole('button', { name: /홈으로/ }).click();

    await page.getByRole('button', { name: /^오늘/ }).click();
    await expect(page.getByRole('region', { name: '오늘의 운세' })).toBeVisible();
    await page.getByRole('button', { name: '‹ 홈' }).click();

    await page.getByRole('button', { name: /^신년/ }).click();
    const year = page.getByRole('region', { name: /년 운세/ });
    await expect(year).toBeVisible();
    await expect(year.locator('ol > li')).toHaveCount(12);
  });

  test('★어느 부가 화면에도 점수 배지가 없다★', async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();

    for (const label of ['오늘', '신년']) {
      await page.getByRole('button', { name: /홈으로|‹ 홈/ }).first().click();
      await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
      const text = await page.locator('body').innerText();
      expect(text, `${label} 화면`).not.toMatch(/\d+\s*점/);
    }
  });

  test('결과 화면에 부가 기능이 쌓여 있지 않다', async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();

    // 섹션은 셋뿐이다
    await expect(page.locator('h2')).toHaveCount(3);
    await expect(page.getByRole('region', { name: '부가 운세' })).toHaveCount(0);
  });
});
