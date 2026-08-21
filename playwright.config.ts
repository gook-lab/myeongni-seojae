import { defineConfig, devices } from '@playwright/test';

/**
 * 명리서재 E2E
 *
 * 확인하는 것은 하나다: 부모님이 도움 없이 결과 화면까지 도달하시는가.
 * (설계 rev.2 성공 기준 7)
 *
 * 그래서 기본 프로젝트가 데스크톱이 아니라 구형 안드로이드다.
 * 타임존도 Asia/Seoul 로 고정한다 — 한국 표준시 이력이 계산의 핵심이라
 * 러너 타임존에 흔들리면 안 된다.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5180',
    timezoneId: 'Asia/Seoul',
    locale: 'ko-KR',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: { ...devices['Galaxy S9+'] },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // vite 는 기본적으로 localhost(::1)에만 바인딩한다. 127.0.0.1 로 못박아야
    // CI 러너의 IPv4/IPv6 해석 차이에 흔들리지 않는다.
    command: 'pnpm vite --host 127.0.0.1 --port 5180 --strictPort',
    url: 'http://127.0.0.1:5180',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
