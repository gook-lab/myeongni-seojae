/**
 * 공유 토큰
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기서 지키는 것
 *
 * 1. 왕복이 완전해야 한다. 접었다 편 결과가 원본과 다르면 링크를 받은
 *    사람은 조용히 다른 사주를 본다. 계산이 틀리는 것보다 나쁘다.
 * 2. 손상된 링크는 반드시 실패해야 한다. 채팅 앱이 URL 뒤를 자르는 일은
 *    실제로 일어난다. 잘린 채로 그럴듯한 사주가 나오면 안 된다.
 * 3. 토큰이 생년월일을 평문으로 담지 않아야 한다. 암호가 아니라 어깨너머로
 *    읽히지 않는 것이 목적이다 — 그 목적은 실제로 달성돼야 한다.
 * 4. 짧아야 한다. 긴 URL 은 잘린다.
 */
import { describe, expect, it } from 'vitest';
import {
  buildShareUrl,
  chartKey,
  decodeShareToken,
  encodeShareToken,
  readShareToken,
} from '../src/core/share-link';
import { REGIONS } from '../src/core/regions';
import type { RawFormValues } from '../src/core/types';

const FORM: RawFormValues = {
  calendar: 'solar',
  year: 1990,
  month: 5,
  day: 15,
  leapMonth: false,
  hourKnown: true,
  hour: 14,
  minute: 30,
  gender: '남',
  longitude: 126.978,
  yajasi: 'preserve-day',
  applyEquationOfTime: false,
};

const roundTrip = (f: RawFormValues): RawFormValues => {
  const r = decodeShareToken(encodeShareToken(f));
  expect(r.ok, `복원 실패: ${r.error}`).toBe(true);
  return r.form as RawFormValues;
};

describe('왕복', () => {
  it('기본 입력', () => {
    const back = roundTrip(FORM);
    expect(back.year).toBe(1990);
    expect(back.month).toBe(5);
    expect(back.day).toBe(15);
    expect(back.hour).toBe(14);
    expect(back.minute).toBe(30);
    expect(back.gender).toBe('남');
    expect(back.calendar).toBe('solar');
    expect(back.longitude).toBeCloseTo(126.978, 3);
  });

  it('문자열로 들어온 값도 숫자로 복원된다', () => {
    // 폼은 "1990" 처럼 문자열을 준다
    const back = roundTrip({ ...FORM, year: '1957', month: '2', day: '4', hour: '10', minute: '20' });
    expect(back.year).toBe(1957);
    expect(back.month).toBe(2);
    expect(back.day).toBe(4);
    expect(back.hour).toBe(10);
    expect(back.minute).toBe(20);
  });

  it('모든 지역이 정확히 복원된다', () => {
    for (const r of REGIONS) {
      const back = roundTrip({ ...FORM, longitude: r.longitude });
      expect(back.longitude, r.name).toBeCloseTo(r.longitude, 4);
    }
  });

  it('음력 · 윤달 · 여성 · 야자시 · 균시차 조합', () => {
    const back = roundTrip({
      ...FORM,
      calendar: 'lunar',
      leapMonth: true,
      gender: '여',
      yajasi: 'advance-day',
      applyEquationOfTime: true,
    });
    expect(back.calendar).toBe('lunar');
    expect(back.leapMonth).toBe(true);
    expect(back.gender).toBe('여');
    expect(back.yajasi).toBe('advance-day');
    expect(back.applyEquationOfTime).toBe(true);
  });

  it('시간 미상이 보존된다', () => {
    const back = roundTrip({ ...FORM, hourKnown: false });
    expect(back.hourKnown).toBe(false);
  });

  it('경계값 — 1900년 1월 1일 0시 0분 / 2100년 12월 31일 23시 59분', () => {
    const a = roundTrip({ ...FORM, year: 1900, month: 1, day: 1, hour: 0, minute: 0 });
    expect([a.year, a.month, a.day, a.hour, a.minute]).toEqual([1900, 1, 1, 0, 0]);
    const b = roundTrip({ ...FORM, year: 2100, month: 12, day: 31, hour: 23, minute: 59 });
    expect([b.year, b.month, b.day, b.hour, b.minute]).toEqual([2100, 12, 31, 23, 59]);
  });

  it('한 해 전체를 하루도 빠짐없이 왕복한다', () => {
    // 비트 폭이 하나라도 모자라면 특정 날짜에서만 조용히 깨진다.
    for (let m = 1; m <= 12; m += 1) {
      for (let d = 1; d <= 31; d += 1) {
        const back = roundTrip({ ...FORM, year: 1988, month: m, day: d });
        expect([back.month, back.day], `${m}/${d}`).toEqual([m, d]);
      }
    }
  });

  it('모든 시각을 왕복한다', () => {
    for (let h = 0; h < 24; h += 1) {
      for (const mi of [0, 1, 29, 30, 58, 59]) {
        const back = roundTrip({ ...FORM, hour: h, minute: mi });
        expect([back.hour, back.minute], `${h}:${mi}`).toEqual([h, mi]);
      }
    }
  });
});

describe('손상된 링크는 반드시 실패한다', () => {
  const token = encodeShareToken(FORM);

  it('한 글자 자르면 실패', () => {
    expect(decodeShareToken(token.slice(0, -1)).ok).toBe(false);
  });

  it('★한 글자만 바뀌어도 실패한다 — 전 위치 전수★', () => {
    // 조용히 다른 사람의 사주가 나오는 것이 최악이다.
    const ALPHABET = 'ABCXYZabcxyz019-_';
    let accepted = 0;
    let tried = 0;
    for (let i = 0; i < token.length; i += 1) {
      for (const ch of ALPHABET) {
        if (token[i] === ch) continue;
        tried += 1;
        const bad = token.slice(0, i) + ch + token.slice(i + 1);
        if (decodeShareToken(bad).ok) accepted += 1;
      }
    }
    expect(tried).toBeGreaterThan(100);
    // 체크섬 16비트 + 표준형 검사. 원리상 65,536분의 1 은 통과할 수 있지만
    // 이 표본에서는 하나도 통과하지 않아야 한다.
    expect(accepted, `${accepted}/${tried} 통과`).toBe(0);
  });

  it('빈 문자열 · 쓰레기 · base64 아닌 문자', () => {
    for (const bad of ['', '!!!!', '한글토큰', '=====', 'a']) {
      expect(decodeShareToken(bad).ok, bad).toBe(false);
    }
  });

  it('실패 이유를 알려준다', () => {
    expect(decodeShareToken('a').error).toBe('malformed');
    expect(decodeShareToken(token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')).error).toBe(
      'checksum',
    );
  });
});

describe('지나가다 읽히지 않는다', () => {
  it('★토큰에 생년월일이 평문으로 없다★', () => {
    const t = encodeShareToken({ ...FORM, year: 1990, month: 5, day: 15 });
    expect(t).not.toContain('1990');
    expect(t).not.toContain('199');
    expect(t).not.toMatch(/19\d\d/);
  });

  it('★쿼리가 아니라 프래그먼트에 실린다★', () => {
    // 쿼리는 서버 로그와 Referer 에 남는다. 프래그먼트는 안 남는다.
    const url = buildShareUrl('https://example.com/', FORM);
    expect(url).toContain('#r=');
    expect(new URL(url).search).toBe('');
    expect(new URL(url).searchParams.toString()).toBe('');
  });

  it('이름은 담지 않는다', () => {
    // 누구 것인지가 붙는 순간 성질이 달라진다.
    const t = encodeShareToken({ ...FORM, name: '홍길동' });
    const back = decodeShareToken(t).form as RawFormValues;
    expect(back.name).toBeUndefined();
    expect(t).not.toContain('홍');
  });

  it('토큰이 짧다 — 채팅에서 잘리지 않게', () => {
    expect(encodeShareToken(FORM).length).toBeLessThanOrEqual(12);
    expect(buildShareUrl('https://example.com/', FORM).length).toBeLessThan(50);
  });
});

describe('프래그먼트 읽기', () => {
  it('#r=토큰 을 꺼낸다', () => {
    const t = encodeShareToken(FORM);
    expect(readShareToken(`#r=${t}`)).toBe(t);
    expect(readShareToken(`r=${t}`)).toBe(t);
    expect(readShareToken(`#a=1&r=${t}`)).toBe(t);
  });

  it('없으면 null', () => {
    expect(readShareToken('')).toBeNull();
    expect(readShareToken('#')).toBeNull();
    expect(readShareToken('#other=1')).toBeNull();
  });
});

describe('차트 키 — 인생 대조표가 쓴다', () => {
  it('같은 사주면 같은 키', () => {
    expect(chartKey(FORM)).toBe(chartKey({ ...FORM }));
  });

  it('입력이 하나라도 다르면 다른 키', () => {
    const base = chartKey(FORM);
    expect(chartKey({ ...FORM, day: 16 })).not.toBe(base);
    expect(chartKey({ ...FORM, minute: 31 })).not.toBe(base);
    expect(chartKey({ ...FORM, gender: '여' })).not.toBe(base);
  });

  it('키에 생년월일이 평문으로 없다', () => {
    expect(chartKey(FORM)).not.toMatch(/19\d\d/);
  });
});
