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

  // 화면마다 처음부터 다시 들어간다. 결과 화면 버튼이 늘어나도 안 흔들린다.
  for (const label of ['오늘', '신년']) {
    test(`★${label} 화면에 점수 배지가 없다★`, async ({ page }) => {
      await fillBirth(page, '1957', '6', '15');
      await page.getByRole('button', { name: '사주 풀어보기' }).click();
      await page.getByRole('button', { name: /^홈으로/ }).click();
      await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();

      const text = await page.locator('body').innerText();
      expect(text, `${label} 화면`).not.toMatch(/\d+\s*점/);
    });
  }

  test('결과 화면에 부가 기능이 쌓여 있지 않다', async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();

    // 결과 화면에는 타임라인과 사주팔자만. 상세 풀이는 별도 화면이다.
    await expect(page.getByRole('region', { name: '대운 인생 타임라인' })).toBeVisible();
    await expect(page.getByRole('region', { name: '사주팔자' })).toBeVisible();
    await expect(page.getByRole('region', { name: '궁위' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: '오행 균형' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: '부가 운세' })).toHaveCount(0);
  });
});

test.describe('십이운성 — 그 10년의 힘', () => {
  test('대운 칸마다 십이운성과 힘 막대가 나온다', async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();

    const timeline = page.getByRole('region', { name: '대운 인생 타임라인' });
    const cards = timeline.locator('ol > li');
    await expect(cards).toHaveCount(10);

    // 십이운성 열두 이름 중 하나가 각 칸에 있다
    const stages = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];
    for (let i = 0; i < 10; i += 1) {
      const text = await cards.nth(i).innerText();
      expect(stages.some((s) => text.includes(s)), `${i}번 칸: ${text}`).toBe(true);
    }
  });

  test('힘 막대 길이가 칸마다 다르다 (한 값으로 뭉개지 않는다)', async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();

    const widths = await page.evaluate(() =>
      [...document.querySelectorAll('ol li div[style*="width"]')].map(
        (el) => (el as HTMLElement).style.width,
      ),
    );
    expect(widths.length).toBe(10);
    expect(new Set(widths).size).toBeGreaterThanOrEqual(6);
  });

  test('펼치면 십이운성 설명이 나온다', async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();

    const timeline = page.getByRole('region', { name: '대운 인생 타임라인' });
    const open = timeline.locator('button[aria-expanded="true"]');
    await expect(open).toHaveCount(1);
    // 펼친 칸 아래에 십이운성 한자 표기가 있다
    await expect(timeline.getByText(/[長沐冠建帝衰病死墓絕胎養]/).first()).toBeVisible();
  });

  test('신년 화면이 지금 대운과의 관계를 보여준다', async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    await page.getByRole('button', { name: /홈으로/ }).click();
    await page.getByRole('button', { name: /^신년/ }).click();

    const year = page.getByRole('region', { name: /년 운세/ });
    await expect(year.getByText('지금 대운과의 관계')).toBeVisible();
    await expect(year.getByText(/대운 .{2} .+ · 세운 .{2}/)).toBeVisible();
  });
});

test.describe('원국 심화 — 궁위 · 오행 균형', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: '압니다' }).click();
    await fillBirth(page, '1990', '5', '5');
    await page.getByLabel('시', { exact: true }).selectOption('9');
    await page.getByLabel('분', { exact: true }).selectOption('30');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    await page.getByRole('button', { name: '상세 풀이 보기' }).click();
  });

  test('네 자리가 각각 다른 해석을 낸다', async ({ page }) => {
    const p = page.getByRole('region', { name: '궁위' });
    await expect(p).toBeVisible();
    const cards = p.locator('article');
    await expect(cards).toHaveCount(4);

    for (const label of ['년주', '월주', '일주', '시주']) {
      await expect(cards.filter({ hasText: label })).toHaveCount(1);
    }
    // 자리별 시기 안내가 있다
    await expect(p.getByText('초년 (0~20세 무렵)')).toBeVisible();
    await expect(p.getByText('말년 (60세 이후)')).toBeVisible();
  });

  test('★지장간이 표시된다 — 원본은 안 썼다★', async ({ page }) => {
    const p = page.getByRole('region', { name: '궁위' });
    await expect(p.getByText(/지장간 .+ · .+/).first()).toBeVisible();
  });

  test('오행 균형이 막대와 결손 안내를 낸다', async ({ page }) => {
    const b = page.getByRole('region', { name: '오행 균형' });
    await expect(b).toBeVisible();
    await expect(b.getByText(/여덟 자 중 8자를 셌습니다/)).toBeVisible();
    // 1990-05-05 09:30 은 목·수가 없다
    await expect(b.getByText(/목·수가 하나도 없습니다/)).toBeVisible();

    // 다섯 오행 막대가 다 있다
    const bars = b.locator('div[style*="width"]');
    await expect(bars).toHaveCount(5);
  });

  test('조사가 "이(가)" 같은 표기로 남지 않는다', async ({ page }) => {
    const text = await page.getByRole('region', { name: '오행 균형' }).innerText();
    expect(text).not.toMatch(/이\(가\)|은\(는\)|을\(를\)/);
  });

  test('오늘 화면이 지지 십성과 합충까지 보여준다', async ({ page }) => {
    await page.getByRole('button', { name: /홈으로/ }).click();
    await page.getByRole('button', { name: /^오늘/ }).click();

    const s = page.getByRole('region', { name: '오늘의 운세' });
    await expect(s.getByText(/지지 (비견|겁재|식신|상관|편재|정재|편관|정관|편인|정인)/)).toBeVisible();
    await expect(s.getByText(/오늘 일진(이|과) 내 일지/)).toBeVisible();
  });
});

test.describe('용신 — 판정만 던지지 않는다', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole('button', { name: '압니다' }).click();
    await fillBirth(page, '1990', '5', '5');
    await page.getByLabel('시', { exact: true }).selectOption('9');
    await page.getByLabel('분', { exact: true }).selectOption('30');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    await page.getByRole('button', { name: '상세 풀이 보기' }).click();
  });

  test('★어떤 방법을 썼는지 밝힌다★', async ({ page }) => {
    const s = page.getByRole('region', { name: '신강 신약과 용신' });
    await expect(s).toBeVisible();
    await expect(s.getByText(/억부용신법/)).toBeVisible();
    await expect(s.getByText(/다른 방법을 쓰면 답이 달라질 수 있습니다/)).toBeVisible();
  });

  test('판정과 함께 득령·득지·득세를 보여준다', async ({ page }) => {
    const s = page.getByRole('region', { name: '신강 신약과 용신' });
    await expect(s.getByText(/신강|중화|신약/).first()).toBeVisible();
    for (const f of ['득령 (得令)', '득지 (得地)', '득세 (得勢)']) {
      await expect(s.getByText(f)).toBeVisible();
    }
  });

  test('★자리별 계산을 펼쳐볼 수 있다★', async ({ page }) => {
    const s = page.getByRole('region', { name: '신강 신약과 용신' });
    const details = s.locator('details');
    await expect(details).toHaveCount(1);
    await details.locator('summary').click();

    // 일곱 자리가 전부 나온다 (일간 자신 제외)
    await expect(details.locator('li')).toHaveCount(7);
    // 부호가 붙은 숫자가 보인다
    await expect(details.getByText(/^[+−-]?\d/).first()).toBeVisible();
    // 무게 근거도 적혀 있다
    await expect(details.getByText(/월지가 가장 무겁습니다/)).toBeVisible();
  });

  test('용신과 도움·피할 기운이 나온다', async ({ page }) => {
    const s = page.getByRole('region', { name: '신강 신약과 용신' });
    await expect(s.getByText('용신 — 가장 필요한 기운')).toBeVisible();
    await expect(s.getByText(/도움 .+/)).toBeVisible();
    await expect(s.getByText(/색 .+ · 방위 .+/)).toBeVisible();
  });

  test('용신 섹션에도 점수가 없다', async ({ page }) => {
    const text = await page.getByRole('region', { name: '신강 신약과 용신' }).innerText();
    expect(text).not.toMatch(/\d+\s*점(?!수)/);
  });
});

test.describe('리포트 — 종이에 남는 물건', () => {
  test.beforeEach(async ({ page }) => {
    await fillBirth(page, '1957', '6', '15');
    await page.getByRole('button', { name: '사주 풀어보기' }).click();
    await page.getByRole('button', { name: /리포트/ }).click();
  });

  test('여섯 섹션이 한 문서에 담긴다', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /인생 리포트/ })).toBeVisible();
    for (const t of ['사주팔자', '인생 타임라인', '일간의 힘과 용신', '인생의 네 자리', '오행 균형', '풀이']) {
      await expect(page.getByRole('heading', { name: t, exact: true })).toBeVisible();
    }
  });

  test('★계산 근거가 문서에 실린다★', async ({ page }) => {
    await expect(page.getByText('계산 근거')).toBeVisible();
    // 1957-06-15 은 서머타임 구간이라 UTC+9:30
    await expect(page.getByText(/한국 표준시 UTC\+9:30/)).toBeVisible();
    await expect(page.getByText(/서머타임 적용 중/)).toBeVisible();
    await expect(page.getByText(/진태양시 보정 −62분 05초/)).toBeVisible();
  });

  test('시간 미상이면 그 사실과 영향을 적는다', async ({ page }) => {
    await expect(page.getByText(/태어난 시각 없이 계산했습니다/)).toBeVisible();
    await expect(page.getByText(/대운 타임라인은 시각과 무관하므로 그대로 정확/)).toBeVisible();
  });

  test('대운 10칸이 표로 들어간다', async ({ page }) => {
    const rows = page.locator('table').nth(1).locator('tbody tr');
    await expect(rows).toHaveCount(10);
    await expect(page.getByText('지금', { exact: true })).toHaveCount(1);
  });

  test('용신 자리별 계산이 접히지 않고 전부 실린다', async ({ page }) => {
    // 화면에서는 details 로 접었지만 문서에는 펼쳐서 넣는다.
    // "억부용신법" 은 본문과 푸터 두 곳에 있으므로 첫 번째로 좁힌다.
    await expect(page.getByText(/억부용신법/).first()).toBeVisible();
    const slotRows = page.locator('table').nth(2).locator('tbody tr');
    await expect(slotRows).toHaveCount(5); // 시간 미상이라 다섯 자리
  });

  test('면책 문구가 있다', async ({ page }) => {
    await expect(page.getByText(/단정적 예언이 아니라 흐름을 읽는 참고 자료/)).toBeVisible();
    await expect(page.getByText(/의료·법률·투자 판단에/)).toBeVisible();
  });

  test('인쇄 시 조작부가 숨는다', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: /인쇄 · PDF로 저장/ })).toBeHidden();
    await expect(page.getByRole('heading', { name: /인생 리포트/ })).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
  });
});
