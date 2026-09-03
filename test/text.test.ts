/**
 * text 계층 테스트
 *
 * 문장은 취향의 영역이라 내용을 단정하지 않는다. 대신 구조를 지킨다:
 * 키가 빠지지 않을 것, 빈 문자열이 없을 것, 길이가 화면에 맞을 것.
 * 그리고 seeded() 난수가 되살아나지 않을 것 (전제 4).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEN_GOD_CATEGORY } from '../src/core/constants';
import type { TenGod, TenGodCategory } from '../src/core/types';
import { DAEUN_TEXT, daeunPrefix } from '../src/text/daeun-text';
import {
  DAY_MASTER_TEXT,
  ELEMENT_COLOR,
  GLOSS,
  INTERPRET,
  moneyText,
} from '../src/text/interpret';

const CATEGORIES: TenGodCategory[] = ['비겁', '식상', '재성', '관성', '인성'];
const TEN_GODS = Object.keys(TEN_GOD_CATEGORY) as TenGod[];

describe('INTERPRET — 카테고리별 단일 테이블 (C2)', () => {
  it('카테고리 5종을 모두 갖는다', () => {
    expect(Object.keys(INTERPRET).sort()).toEqual([...CATEGORIES].sort());
  });

  it.each(CATEGORIES)('%s 는 여섯 필드를 모두 채운다', (cat) => {
    const t = INTERPRET[cat];
    for (const field of ['daily', 'monthly', 'personality', 'career', 'love', 'daeun'] as const) {
      expect(t[field], `${cat}.${field}`).toBeTruthy();
      expect(t[field].trim().length, `${cat}.${field}`).toBeGreaterThan(10);
    }
  });

  it('daeun 문단은 카드에서 읽을 수 있는 분량이다', () => {
    for (const cat of CATEGORIES) {
      const len = INTERPRET[cat].daeun.length;
      expect(len, `${cat} 길이 ${len}`).toBeGreaterThan(70);
      expect(len, `${cat} 길이 ${len}`).toBeLessThan(400);
    }
  });

  it('계산 결과를 단정적인 사건으로 표현하지 않는다', () => {
    const all = Object.values(INTERPRET).flatMap((text) => Object.values(text)).join(' ');
    expect(all).not.toMatch(/반드시|확실히|틀림없이|평생의 대표작/);
    expect(all).toContain('해석합니다');
  });
});

describe('DAY_MASTER_TEXT', () => {
  it('천간 10종을 모두 갖는다', () => {
    expect(Object.keys(DAY_MASTER_TEXT)).toHaveLength(10);
  });

  it('원본 문장이 보존됐다', () => {
    expect(DAY_MASTER_TEXT.갑).toContain('곧게 뻗는 큰 나무의 기운입니다');
    expect(DAY_MASTER_TEXT.계).toContain('이슬비와 샘물의 기운입니다');
  });
});

describe('GLOSS', () => {
  it('십성 10종 + 일간을 모두 갖는다', () => {
    expect(Object.keys(GLOSS)).toHaveLength(11);
    expect(GLOSS.일간).toContain('사주의 주인공');
    for (const g of TEN_GODS) expect(GLOSS[g]).toBeTruthy();
  });
});

describe('DAEUN_TEXT (T11)', () => {
  it('십성 10종을 모두 갖는다', () => {
    expect(Object.keys(DAEUN_TEXT).sort()).toEqual([...TEN_GODS].sort());
  });

  it.each(TEN_GODS)('%s 문단이 한 화면 분량이다', (god) => {
    const text = DAEUN_TEXT[god];
    expect(text.trim().length).toBeGreaterThan(100);
    expect(text.trim().length).toBeLessThan(400);
  });

  it('열 문단이 모두 서로 다르다', () => {
    expect(new Set(Object.values(DAEUN_TEXT)).size).toBe(10);
  });

  it('단정적 예언 표현을 쓰지 않는다', () => {
    const forbidden = ['반드시', '틀림없이', '확실히 죽', '분명히 망'];
    for (const [god, text] of Object.entries(DAEUN_TEXT)) {
      for (const word of forbidden) {
        expect(text, `${god}: "${word}"`).not.toContain(word);
      }
    }
  });

  it('같은 카테고리 안에서도 십성별로 결이 다르다', () => {
    // 편관과 정관은 같은 관성이지만 10년을 사는 감각이 다르다
    expect(DAEUN_TEXT.편관).not.toBe(DAEUN_TEXT.정관);
    expect(DAEUN_TEXT.편재).not.toBe(DAEUN_TEXT.정재);
    expect(DAEUN_TEXT.편인).not.toBe(DAEUN_TEXT.정인);
    expect(DAEUN_TEXT.비견).not.toBe(DAEUN_TEXT.겁재);
    expect(DAEUN_TEXT.식신).not.toBe(DAEUN_TEXT.상관);
  });
});

describe('daeunPrefix', () => {
  it.each([
    [2000, 2009, 2026, '이미 지나온'],
    [2020, 2029, 2026, '지금 지나고'],
    [2030, 2039, 2026, '앞으로 이어질'],
  ])('%i~%i (오늘 %i) → %s', (start, end, today, expected) => {
    expect(daeunPrefix(start, end, today)).toContain(expected);
  });
});

describe('moneyText', () => {
  it.each([
    [0, '재성이 드러나지 않아'],
    [1, '알맞게 자리해'],
    [2, '알맞게 자리해'],
    [3, '재성이 강해'],
  ])('재성 %i개 → %s', (count, fragment) => {
    expect(moneyText(count)).toContain(fragment);
  });
});

describe('ELEMENT_COLOR — Hanji 시안 팔레트', () => {
  it('오행 5종에 색이 있다', () => {
    expect(Object.keys(ELEMENT_COLOR)).toHaveLength(5);
    for (const c of Object.values(ELEMENT_COLOR)) {
      expect(c).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});

describe('★전제 4★ 난수 점수가 되살아나지 않는다', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name: string) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : [];
    });

  it('src/ 어디에도 Math.sin / Math.random 이 없다', () => {
    const offenders = walk('src').filter((f) => {
      const body = readFileSync(f, 'utf8');
      // korea-time 의 균시차 근사식은 천문 계산이라 예외로 둔다
      if (f.includes('korea-time')) return /Math\.random/.test(body);
      return /Math\.(sin|random)\s*\(/.test(body);
    });
    expect(offenders).toEqual([]);
  });

  it('점수(score) 필드가 도메인 타입에 없다', () => {
    const types = readFileSync('src/core/types.ts', 'utf8');
    expect(types).not.toMatch(/\bscore\s*[:?]/);
  });
});
