/**
 * 명리서재 — Sentry PII 차단 (T5 / A3)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 이 파일이 필요한가
 *
 * 전제 5: "생년월일이 서버로 나가지 않는다."
 * Sentry 는 그 약속을 네 갈래로 깰 수 있다.
 *
 *   1. location.href      결과 URL 에 생년월일이 있으면 이벤트마다 실려간다
 *   2. Session Replay     입력 폼 DOM 을 그대로 녹화한다
 *   3. breadcrumbs        input 이벤트·클릭 타깃에 값이 남는다
 *   4. error context      컴포넌트 props 에 birthDate 가 있으면 딸려간다
 *
 * 하나라도 열려 있으면 약속이 깨진 것이다. 그래서 네 개를 다 막고,
 * 막혔는지를 테스트로 고정한다 (test/privacy.test.ts).
 *
 * 설정은 언제든 실수로 풀릴 수 있다. 그때 CI 가 잡는 게 이 구조의 요점이다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 부수 결정
 *
 * URL 에 생년월일을 넣지 않기로 했으므로 결과 다시보기는 localStorage 만
 * 쓴다. 링크 공유는 별도 설계가 필요하다 (design rev.2 Open Question 6).
 */

/** 생년월일로 보일 수 있는 패턴. 넉넉하게 잡는다. */
const DATE_PATTERNS: readonly RegExp[] = [
  // 1957-06-15, 1957/06/15, 1957.06.15
  /\b(18|19|20)\d{2}[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/g,
  // 19570615
  /\b(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/g,
  // 1957년 6월 15일
  /\b(18|19|20)\d{2}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일/g,
];

/** 생년월일을 담을 수 있는 쿼리·필드 이름 */
const SENSITIVE_KEYS: readonly string[] = [
  'birth', 'birthday', 'birthdate', 'bd', 'dob',
  'year', 'month', 'day', 'hour', 'minute',
  'ymd', 'saju', 'lunar', 'solar', 'chart', 'name',
];

export const REDACTED = '[redacted]';

/** 문자열에서 날짜로 보이는 것을 지운다. */
export function scrubDates(input: string): string {
  let out = input;
  for (const re of DATE_PATTERNS) out = out.replace(re, REDACTED);
  return out;
}

/**
 * URL 에서 민감 파라미터와 해시를 통째로 지운다.
 * 해시는 서버로 전송되지 않지만 Sentry SDK 는 클라이언트에서 읽어 이벤트에 담는다.
 */
export function scrubUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    // 해시는 통째로 버린다. 여기에 상태를 담지 않기로 했으므로 잃을 게 없다.
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        url.searchParams.set(key, REDACTED);
      }
    }
    return scrubDates(url.toString());
  } catch {
    return scrubDates(rawUrl);
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** 객체 트리를 훑으며 민감 키를 지우고 문자열의 날짜를 마스킹한다. */
export function scrubDeep<T>(value: T, depth = 0): T {
  if (depth > 8) return REDACTED as unknown as T;
  if (typeof value === 'string') return scrubDates(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => scrubDeep(v, depth + 1)) as unknown as T;
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
        out[k] = REDACTED;
      } else {
        out[k] = scrubDeep(v, depth + 1);
      }
    }
    return out as unknown as T;
  }
  return value;
}

// Sentry 타입에 의존하지 않는 최소 구조. 테스트가 SDK 없이 돈다.
export interface MinimalEvent {
  /** query_string 은 SDK 버전에 따라 문자열/배열/객체로 온다. 어느 쪽이든 통째로 지운다. */
  request?: { url?: string; headers?: Record<string, string>; query_string?: unknown };
  breadcrumbs?: MinimalBreadcrumb[];
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  user?: Record<string, unknown>;
  message?: string;
}

export interface MinimalBreadcrumb {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * 모든 이벤트가 통과하는 관문.
 * 여기서 놓치면 생년월일이 외부 서버에 쌓인다.
 */
export function beforeSend<T extends MinimalEvent>(event: T): T {
  const e = { ...event } as T;

  if (e.request) {
    e.request = { ...e.request };
    if (e.request.url) e.request.url = scrubUrl(e.request.url);
    if (e.request.query_string) e.request.query_string = REDACTED;
    // Referer 에도 이전 화면 URL 이 담긴다
    if (e.request.headers) {
      e.request.headers = scrubDeep({ ...e.request.headers });
    }
  }

  if (e.message) e.message = scrubDates(e.message);
  if (e.extra) e.extra = scrubDeep(e.extra);
  if (e.contexts) e.contexts = scrubDeep(e.contexts);
  if (e.tags) e.tags = scrubDeep(e.tags);
  // 사용자 식별 정보는 아예 만들지 않는다
  if (e.user) delete e.user;
  if (e.breadcrumbs) {
    e.breadcrumbs = e.breadcrumbs
      .map((b) => beforeBreadcrumb(b))
      .filter((b): b is MinimalBreadcrumb => b !== null);
  }
  return e;
}

/**
 * breadcrumb 필터.
 * 사용자 입력(input/ui.input)은 통째로 버린다 — 사주 앱에서 그건 전부 생년월일이다.
 */
export function beforeBreadcrumb<T extends MinimalBreadcrumb>(crumb: T): T | null {
  if (crumb.category === 'ui.input') return null;
  const out = { ...crumb } as T;
  if (out.message) out.message = scrubDates(out.message);
  if (out.data) out.data = scrubDeep(out.data);
  return out;
}

export interface SentryOptions {
  dsn: string;
  /** Session Replay 는 입력 폼을 그대로 녹화한다. 항상 0. */
  replaysSessionSampleRate: 0;
  replaysOnErrorSampleRate: 0;
  sendDefaultPii: false;
  /** 사용자 IP·쿠키를 자동으로 붙이지 않는다 */
  autoSessionTracking: boolean;
  environment: string;
  beforeSend: typeof beforeSend;
  beforeBreadcrumb: typeof beforeBreadcrumb;
  /** Replay 통합은 아예 넣지 않는다 */
  integrations: [];
}

export function buildSentryOptions(dsn: string, environment = 'production'): SentryOptions {
  return {
    dsn,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    autoSessionTracking: false,
    environment,
    beforeSend,
    beforeBreadcrumb,
    integrations: [],
  };
}

/**
 * 부팅 시 1회. DSN 이 없으면 아무것도 하지 않는다.
 * 로컬 개발과 테스트에서 네트워크로 나가는 일이 없다.
 */
export async function initObservability(): Promise<void> {
  const dsn = import.meta.env?.VITE_SENTRY_DSN;
  if (!dsn) return;
  const Sentry = await import('@sentry/react');
  const options = buildSentryOptions(dsn, import.meta.env.MODE ?? 'production');
  // SDK 의 ErrorEvent 는 MinimalEvent 보다 넓다 (query_string 이 배열일 수 있는 등).
  // 우리 훅은 넓은 쪽을 안전하게 다루도록 쓰여 있으므로 이 경계에서만 좁힌다.
  Sentry.init(options as unknown as Parameters<typeof Sentry.init>[0]);
}
