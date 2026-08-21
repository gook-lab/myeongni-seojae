/**
 * MCP 서버 표면 테스트
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기서 지키는 것
 *
 * 엔진 자체의 정확도는 golden.test.ts 가 만세력 대조로 지킨다. 이 파일이
 * 지키는 건 그 결과가 MCP 응답까지 손상 없이 나오는가, 그리고 이 서버의
 * 차별점인 "근거를 같이 낸다" 가 모든 응답에서 실제로 지켜지는가다.
 *
 * 근거 누락은 조용한 퇴행이다. 결과값은 그대로인데 calculationBasis 만
 * 빠지면 아무 테스트도 깨지지 않으면서 이 서버의 존재 이유가 사라진다.
 * 그래서 도구를 하나씩 세는 대신 목록을 돌면서 전수로 확인한다.
 *
 * stdio 는 띄우지 않는다. handleTool 이 전송 계층과 분리돼 있으므로
 * 프로세스 없이 직접 부른다.
 */
import { describe, expect, it } from 'vitest';
import { handleTool, TOOLS } from '../src/mcp/server';
import golden from './golden-cases.json';

interface GoldenCase {
  label: string;
  raw: { year: number; month: number; day: number; hour?: number; minute?: number };
  ours: { year: string; month: string; day: string; hour: string | null };
  solarTime: { standardOffsetMinutes: number; offsetMinutes: number; daylightSaving: boolean };
}
const CASES = (golden as { cases: GoldenCase[] }).cases;

/** 응답 본문을 꺼낸다. 도구는 항상 JSON 문자열 하나를 낸다. */
function call(name: string, args: unknown): { ok: boolean; body: Record<string, unknown> } {
  const r = handleTool(name, args);
  const first = r.content[0];
  if (!first || first.type !== 'text') throw new Error('text 응답이 아닙니다');
  return { ok: !r.isError, body: JSON.parse(first.text) as Record<string, unknown> };
}

const BIRTH = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: '남' };

describe('도구 목록', () => {
  it('여섯 도구가 모두 스키마를 갖고 있다', () => {
    expect(TOOLS).toHaveLength(6);
    for (const t of TOOLS) {
      expect(t.name).toMatch(/^[a-z_]+$/);
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.inputSchema.type).toBe('object');
    }
  });

  it('설명에 이 서버가 왜 다른지가 적혀 있다', () => {
    // 부르는 쪽이 도구 목록만 보고 고른다. 정확도 근거가 설명에 없으면
    // 다른 사주 도구와 구별할 방법이 없다.
    const all = TOOLS.map((t) => t.description).join(' ');
    expect(all).toMatch(/표준시|진태양시/);
    expect(all).toMatch(/근거/);
  });
});

describe('계산 근거 — 이 서버의 차별점', () => {
  // 사주를 계산하는 도구 전부. 목록에서 뽑으므로 도구가 늘면 자동으로 포함된다.
  const CALC_TOOLS = TOOLS.map((t) => t.name).filter(
    (n) => n !== 'check_timezone_data' && n !== 'check_compatibility',
  );

  it.each(CALC_TOOLS)('%s 응답에 calculationBasis 가 있다', (name) => {
    const { ok, body } = call(name, BIRTH);
    expect(ok).toBe(true);
    const b = body.calculationBasis as Record<string, unknown>;
    expect(b).toBeDefined();
    expect(typeof b.standardOffsetMinutes).toBe('number');
    expect(typeof b.trueSolarOffsetMinutes).toBe('number');
    expect(typeof b.daylightSaving).toBe('boolean');
    expect(b.note).toMatch(/1954~61/);
  });

  it('1957년생 근거에 UTC+8:30 이 그대로 드러난다', () => {
    // 다른 구현과 갈리는 구간. 근거가 없으면 어느 쪽이 맞는지 판단할 수 없다.
    const { body } = call('calculate_saju', {
      year: 1957, month: 2, day: 4, hour: 10, minute: 20, gender: '남',
    });
    const b = body.calculationBasis as Record<string, unknown>;
    expect(b.standardOffsetMinutes).toBe(510);
    expect(b.standardOffsetLabel).toBe('UTC+8:30');
    expect(b.trueSolarOffsetMinutes).toBeCloseTo(-2.09, 1);
  });

  it('서머타임 구간이 근거에 표시된다', () => {
    const { body } = call('calculate_saju', {
      year: 1988, month: 7, day: 15, hour: 14, minute: 0, gender: '여',
    });
    const b = body.calculationBasis as Record<string, unknown>;
    expect(b.daylightSaving).toBe(true);
    expect(b.standardOffsetMinutes).toBe(600);
  });
});

describe('만세력 결과가 MCP 응답까지 그대로 나온다', () => {
  // golden-cases.json 은 manseryeok 대조를 거친 표다. 여기서는 그 값이
  // 응답 매핑 과정에서 뒤바뀌거나 누락되지 않는지만 본다.
  const SAMPLE = CASES.filter((c) => typeof c.raw.hour === 'number').slice(0, 12);

  it.each(SAMPLE.map((c) => [c.label, c] as const))('%s', (_label, c) => {
    const { ok, body } = call('calculate_saju', {
      year: c.raw.year, month: c.raw.month, day: c.raw.day,
      hour: c.raw.hour, minute: c.raw.minute ?? 0, gender: '남',
    });
    expect(ok).toBe(true);
    const p = body.pillars as Record<string, { korean: string } | null>;
    expect(p.year?.korean).toBe(c.ours.year);
    expect(p.month?.korean).toBe(c.ours.month);
    expect(p.day?.korean).toBe(c.ours.day);
    expect(p.hour?.korean).toBe(c.ours.hour);
    const b = body.calculationBasis as Record<string, unknown>;
    expect(b.standardOffsetMinutes).toBe(c.solarTime.standardOffsetMinutes);
    expect(b.daylightSaving).toBe(c.solarTime.daylightSaving);
  });
});

describe('시각을 몰라도 쓸 수 있다', () => {
  const noHour = { year: 1990, month: 5, day: 15, gender: '남' };

  it('시주가 null 로 나오고 근거가 그 사실을 밝힌다', () => {
    const { ok, body } = call('calculate_saju', noHour);
    expect(ok).toBe(true);
    expect((body.pillars as Record<string, unknown>).hour).toBeNull();
    expect((body.calculationBasis as Record<string, unknown>).hourUnknown).toBe(true);
  });

  it('대운은 시각을 몰라도 시각을 아는 경우와 완전히 같다', () => {
    // 대운이 시주를 참조하지 않는다는 계약. 도구 설명에도 그렇게 적었으므로
    // 응답으로도 지켜져야 한다.
    const without = call('get_daeun_timeline', noHour).body;
    const with14 = call('get_daeun_timeline', { ...noHour, hour: 14, minute: 30 }).body;
    expect(without.startAge).toEqual(with14.startAge);
    expect(without.direction).toEqual(with14.direction);
    expect(JSON.stringify(without.entries)).toBe(JSON.stringify(with14.entries));
  });
});

describe('원국 분석', () => {
  it('용신 판정과 자리별 계산 근거를 같이 낸다', () => {
    const { ok, body } = call('analyze_natal', BIRTH);
    expect(ok).toBe(true);
    const s = body.strength as Record<string, unknown>;
    expect(['신강', '신약', '중화']).toContain(s.verdict);
    expect(s.method).toMatch(/억부/);
    // 판정만 있고 근거가 없으면 대조할 수 없다
    const slots = s.slots as unknown[];
    expect(slots.length).toBeGreaterThanOrEqual(6);
    const y = body.yongsin as Record<string, unknown>;
    expect(y.element).toBeTruthy();
    expect(Array.isArray(y.helpful)).toBe(true);
  });

  it('신살에 판정 근거가 붙어 있다', () => {
    const { body } = call('analyze_natal', BIRTH);
    const items = body.sinsal as Array<Record<string, unknown>>;
    for (const it of items) {
      expect(it.name).toBeTruthy();
      // basis 든 bases 든, 무엇을 보고 나왔는지가 반드시 있어야 한다
      const hasBasis = Boolean(it.basis) || (Array.isArray(it.bases) && it.bases.length > 0);
      expect(hasBasis).toBe(true);
    }
  });
});

describe('궁합', () => {
  it('점수를 내지 않는다', () => {
    const { ok, body } = call('check_compatibility', {
      personA: BIRTH,
      personB: { year: 1992, month: 8, day: 3, hour: 9, minute: 0, gender: '여' },
    });
    expect(ok).toBe(true);
    // 점수 배지는 이 앱이 의도적으로 버린 것이다. MCP 로도 새어나가면 안 된다.
    expect(JSON.stringify(body)).not.toMatch(/"score"|"점수"/);
    expect(body.method).toMatch(/일간|일지/);
  });

  it('한 쪽만 주면 실패한다', () => {
    const { ok, body } = call('check_compatibility', { personA: BIRTH });
    expect(ok).toBe(false);
    expect(body.error).toMatch(/personB/);
  });
});

describe('tzdata 진단', () => {
  it('이 런타임이 한국 표준시 이력을 안다', () => {
    const { ok, body } = call('check_timezone_data', {});
    expect(ok).toBe(true);
    expect(body.usable).toBe(true);
    expect(Array.isArray(body.probes)).toBe(true);
  });
});

describe('실패는 조용하지 않다', () => {
  it('없는 도구', () => {
    const { ok, body } = call('no_such_tool', BIRTH);
    expect(ok).toBe(false);
    expect(body.error).toMatch(/알 수 없는 도구/);
  });

  it('잘못된 입력은 코드와 함께 거절된다', () => {
    const { ok, body } = call('calculate_saju', { ...BIRTH, month: 13 });
    expect(ok).toBe(false);
    expect((body.detail as Record<string, unknown>).code).toBeTruthy();
  });

  it('범위 밖 연도', () => {
    const { ok } = call('calculate_saju', { ...BIRTH, year: 1600 });
    expect(ok).toBe(false);
  });
});
