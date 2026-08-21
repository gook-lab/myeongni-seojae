/**
 * ★배포 게이트★ 프라이버시 테스트
 *
 * 전제 5 — "생년월일이 서버로 나가지 않는다" 를 CI 가 지킨다.
 * Sentry 설정은 언제든 실수로 풀릴 수 있다. 그때 잡는 게 이 파일이다.
 *
 * 네 갈래를 전부 막았는지 확인한다:
 *   1. location.href   2. Session Replay   3. breadcrumbs   4. error context
 */

import { describe, expect, it } from 'vitest';
import { buildShareUrl, decodeShareToken, encodeShareToken } from '../src/core/share-link';
import type { RawFormValues } from '../src/core/types';
import {
  REDACTED,
  beforeBreadcrumb,
  beforeSend,
  buildSentryOptions,
  scrubDates,
  scrubDeep,
  scrubUrl,
  type MinimalEvent,
} from '../src/observability/sentry';

const BIRTHDATES = [
  '1957-06-15',
  '1957/06/15',
  '1957.06.15',
  '19570615',
  '1957년 6월 15일',
  '1957년 6월 15일',
  '2026-03-10',
  '1990-05-05',
];

describe('scrubDates — 생년월일 형태를 지운다', () => {
  it.each(BIRTHDATES)('%s 를 마스킹한다', (d) => {
    const out = scrubDates(`사용자 생일은 ${d} 입니다`);
    expect(out).not.toContain(d);
    expect(out).toContain(REDACTED);
  });

  it('날짜가 아닌 숫자는 건드리지 않는다', () => {
    expect(scrubDates('요청 12건 처리, 응답 200')).toBe('요청 12건 처리, 응답 200');
  });

  it('한 문장에 여러 날짜가 있어도 전부 지운다', () => {
    const out = scrubDates('1957-06-15 와 1990-05-05');
    expect(out).not.toMatch(/19\d{2}-\d{2}-\d{2}/);
  });
});

describe('경로 1 — location.href', () => {
  it('URL 해시를 통째로 버린다', () => {
    const out = scrubUrl('https://saju.app/result#1957-06-15-M-0930');
    expect(out).not.toContain('1957');
    expect(out).not.toContain('#');
  });

  it('민감한 쿼리 파라미터를 마스킹한다', () => {
    const out = scrubUrl('https://saju.app/r?birth=19570615&gender=M&hour=9');
    expect(out).not.toContain('19570615');
    // URLSearchParams 가 값을 퍼센트 인코딩한다. 디코딩해서 확인한다.
    expect(decodeURIComponent(out)).toContain(REDACTED);
  });

  it('무해한 파라미터는 남긴다', () => {
    expect(scrubUrl('https://saju.app/r?tab=timeline')).toContain('tab=timeline');
  });

  it('URL 로 파싱되지 않아도 날짜는 지운다', () => {
    expect(scrubUrl('not-a-url 1957-06-15')).not.toContain('1957-06-15');
  });
});

describe('★공유 링크가 Sentry 로 새어나가지 않는다★', () => {
  // 원래 설계는 URL 해시를 아예 안 쓰기로 했었다. Sentry 가 location.href 를
  // 담기 때문이다. 지금은 해시에 공유 토큰을 싣는다 — 그래서 이 검사가
  // 그때보다 더 중요해졌다.
  const FORM: RawFormValues = {
    calendar: 'solar', year: 1957, month: 6, day: 15,
    leapMonth: false, hourKnown: true, hour: 9, minute: 30,
    gender: '남', longitude: 126.978, yajasi: 'preserve-day', applyEquationOfTime: false,
  };

  it('토큰이 통째로 지워진다', () => {
    const url = buildShareUrl('https://saju.app/', FORM);
    const token = encodeShareToken(FORM);
    expect(url).toContain(token);
    const out = scrubUrl(url);
    expect(out, '프래그먼트가 남았다').not.toContain(token);
    expect(out).not.toContain('#');
  });

  it('토큰만으로 생년월일을 되읽을 수 있다는 사실 자체가 이유다', () => {
    // 토큰은 암호가 아니다. 그러니 로그에 남으면 생년월일이 남는 것과 같다.
    const token = encodeShareToken(FORM);
    const back = decodeShareToken(token);
    expect(back.ok).toBe(true);
    expect(back.form?.year).toBe(1957);
  });

  it('브레드크럼의 URL 에서도 지워진다', () => {
    const url = buildShareUrl('https://saju.app/', FORM);
    const crumb = beforeBreadcrumb({ category: 'navigation', data: { to: url, from: url } });
    expect(JSON.stringify(crumb)).not.toContain(encodeShareToken(FORM));
  });
});

describe('경로 2 — Session Replay 는 완전히 꺼져 있다', () => {
  const opts = buildSentryOptions('https://key@example.ingest.sentry.io/1');

  it('두 샘플레이트가 0 이다', () => {
    expect(opts.replaysSessionSampleRate).toBe(0);
    expect(opts.replaysOnErrorSampleRate).toBe(0);
  });

  it('Replay 통합을 아예 넣지 않는다', () => {
    expect(opts.integrations).toEqual([]);
  });

  it('sendDefaultPii 가 false 다', () => {
    expect(opts.sendDefaultPii).toBe(false);
  });

  it('세션 추적을 켜지 않는다', () => {
    expect(opts.autoSessionTracking).toBe(false);
  });
});

describe('경로 3 — breadcrumbs', () => {
  it('사용자 입력 breadcrumb 를 통째로 버린다', () => {
    expect(beforeBreadcrumb({ category: 'ui.input', message: '1957-06-15' })).toBeNull();
  });

  it('다른 breadcrumb 의 날짜는 마스킹한다', () => {
    const out = beforeBreadcrumb({ category: 'ui.click', message: '제출 1957-06-15' });
    expect(out).not.toBeNull();
    expect(out!.message).not.toContain('1957-06-15');
  });

  it('breadcrumb data 안의 민감 키를 지운다', () => {
    const out = beforeBreadcrumb({
      category: 'fetch',
      data: { birthYear: 1957, url: 'https://x/r#1957-06-15', tab: 'timeline' },
    });
    expect(out!.data!.birthYear).toBe(REDACTED);
    expect(out!.data!.tab).toBe('timeline');
  });
});

describe('경로 4 — error context / extra / tags', () => {
  it('extra 안의 생년월일 필드를 지운다', () => {
    const event: MinimalEvent = {
      extra: {
        birthDate: '1957-06-15',
        input: { year: 1957, month: 6, day: 15, gender: '남' },
        harmless: 'timeline',
      },
    };
    const out = beforeSend(event);
    expect(JSON.stringify(out)).not.toContain('1957');
    expect(out.extra!.harmless).toBe('timeline');
  });

  it('user 객체를 통째로 제거한다', () => {
    const out = beforeSend({ user: { id: 'abc', ip_address: '1.2.3.4' } });
    expect(out.user).toBeUndefined();
  });

  it('request.url 과 query_string 을 처리한다', () => {
    const out = beforeSend({
      request: {
        url: 'https://saju.app/r#1957-06-15',
        query_string: 'birth=19570615',
        headers: { Referer: 'https://saju.app/r#1957-06-15' },
      },
    });
    expect(JSON.stringify(out)).not.toContain('1957');
    expect(out.request!.query_string).toBe(REDACTED);
  });

  it('중첩이 깊어도 새어나가지 않는다', () => {
    const deep = { a: { b: { c: { d: { e: { birthday: '1957-06-15' } } } } } };
    expect(JSON.stringify(scrubDeep(deep))).not.toContain('1957');
  });

  it('순환 없이 깊이 제한이 걸린다', () => {
    let nested: Record<string, unknown> = { v: '1957-06-15' };
    for (let i = 0; i < 20; i += 1) nested = { n: nested };
    expect(() => scrubDeep(nested)).not.toThrow();
  });
});

describe('★종합★ 실제 이벤트 모양에서 생년월일이 하나도 안 남는다', () => {
  it('전형적인 오류 이벤트를 통과시켜도 1957 이 없다', () => {
    const event: MinimalEvent = {
      message: '계산 실패: 1957-06-15 입력',
      request: {
        url: 'https://saju.app/result?birth=19570615#1957.06.15',
        query_string: 'birth=19570615',
        headers: { Referer: 'https://saju.app/?dob=1957-06-15' },
      },
      breadcrumbs: [
        { category: 'ui.input', message: '1957' },
        { category: 'navigation', message: '이동 1957-06-15', data: { dob: '19570615' } },
      ],
      extra: { chart: { year: '1957년 6월 15일' } },
      contexts: { saju: { birthdate: '1957-06-15' } },
      tags: { birthYear: '1957' },
      user: { id: 'u1' },
    };

    const out = beforeSend(event);
    const serialized = JSON.stringify(out);

    expect(serialized).not.toContain('1957');
    expect(serialized).not.toContain('19570615');
    expect(out.user).toBeUndefined();
    // ui.input breadcrumb 는 아예 사라진다
    expect(out.breadcrumbs).toHaveLength(1);
  });
});
