/**
 * 색 대비 — 취향이 아니라 판독성
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 테스트로 두나
 *
 * 관객이 부모님 세대다. 흐린 글씨는 "차분한 톤" 이 아니라 안 보이는 글씨다.
 *
 * 그런데 색은 디자인 시안에서 그대로 가져오게 되고, 가져온 값이 기준을
 * 넘는지는 아무도 안 재본다. 실제로 셋이 미달이었다 — 그중 ink-faint 는
 * 11~12px 작은 글씨 전용이라 낮은 대비와 작은 크기가 겹쳐 있었다.
 *
 * 그래서 **styles.css 를 직접 읽어** 계산한다. 토큰을 손보는 순간 걸린다.
 * 사람이 눈으로 못 잡는 종류의 실패라 테스트가 본체다.
 *
 * 기준 — WCAG 2.1 AA
 *   본문      4.5:1
 *   큰 글씨   3:1  (18.66px 굵게 또는 24px 이상)
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync('src/styles.css', 'utf8');

/** @theme 블록에서 --color-* 토큰을 읽는다 */
function tokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of CSS.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    out[m[1] as string] = (m[2] as string).toLowerCase();
  }
  return out;
}

const T = tokens();

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** 글자가 얹히는 바탕 셋 */
const BACKGROUNDS = ['hanji', 'card', 'card-warm'] as const;

/** 본문으로 쓰이는 글자색 — 4.5:1 을 넘어야 한다 */
const TEXT_TOKENS = ['ink', 'ink-soft', 'ink-faint', 'jumuk', 'jumuk-deep'] as const;

/** 오행 색. 간지 글자와 설명에 쓰이므로 본문과 같은 기준으로 본다 */
const ELEMENT_TOKENS = ['mok', 'hwa', 'to', 'geum', 'su'] as const;

describe('토큰이 실제로 읽히는지 계산한다', () => {
  it('필요한 토큰이 전부 있다', () => {
    for (const t of [...BACKGROUNDS, ...TEXT_TOKENS, ...ELEMENT_TOKENS]) {
      expect(T[t], `--color-${t} 가 없다`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('계산이 맞다 — 검정/흰색이 21:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('★글자색이 WCAG AA 를 넘는다★', () => {
  const cases: Array<[string, string]> = [];
  for (const fg of [...TEXT_TOKENS, ...ELEMENT_TOKENS]) {
    for (const bg of BACKGROUNDS) cases.push([fg, bg]);
  }

  it.each(cases)('%s on %s', (fg, bg) => {
    const r = contrast(T[fg] as string, T[bg] as string);
    expect(r, `${T[fg]} on ${T[bg]} = ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });
});

describe('한지의 결은 잃지 않았다', () => {
  it('바탕이 순백이 아니다', () => {
    // 대비를 올리려고 배경을 하얗게 만들면 이 앱이 아니게 된다.
    expect(T['hanji']).not.toBe('#ffffff');
    expect(T['card']).not.toBe('#ffffff');
  });

  it('본문이 순흑이 아니다', () => {
    expect(T['ink']).not.toBe('#000000');
  });

  it('약한 글씨는 여전히 본문보다 흐리다', () => {
    // AA 를 맞춘다고 ink-faint 를 ink 만큼 진하게 하면 위계가 사라진다.
    const faint = contrast(T['ink-faint'] as string, T['hanji'] as string);
    const body = contrast(T['ink'] as string, T['hanji'] as string);
    expect(faint).toBeLessThan(body);
    expect(faint).toBeGreaterThanOrEqual(4.5);
  });

  it('주묵이 강조로 읽힐 만큼 도드라진다', () => {
    // 주묵은 강조색이다. 본문과 구분이 안 되면 강조가 아니다.
    expect(T['jumuk']).not.toBe(T['ink']);
    expect(contrast(T['jumuk'] as string, T['hanji'] as string)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('테두리는 글자가 아니다', () => {
  it('선 색은 본문 기준을 적용하지 않는다', () => {
    /*
     * line·line-dash 는 글자가 아니라 칸을 나누는 선이다. WCAG 도 순수
     * 장식 요소에는 대비 기준을 적용하지 않는다. 다만 이 선들이 정보를
     * 나르지 않는다는 것은 기록해둔다 — 잠김 상태를 점선으로만 표시하던
     * 때가 있었고, 그건 색에만 기대는 표시였다.
     */
    expect(T['line']).toBeTruthy();
    expect(T['line-dash']).toBeTruthy();
  });
});
