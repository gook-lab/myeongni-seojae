/**
 * ★배포 게이트★ 번들 분할 검사 (T9 / NFR N1)
 *
 * 관객이 부모님 세대(구형 안드로이드 + 느린 회선)라 입력 화면이 가벼운 것이
 * 요구사항이다. 계산 라이브러리와 해석 텍스트는 "사주 풀어보기"를 누른
 * 뒤에만 필요하다.
 *
 * 무심코 정적 import 를 하나 추가하면 이 분할이 조용히 깨진다.
 * 번들이 커진 건 아무도 눈치채지 못한 채 배포된다. 그래서 CI 가 본다.
 *
 * dist/ 가 없으면 건너뛴다 (단위 테스트만 돌릴 때). CI 는 build 후 실행한다.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIST = 'dist';
const ASSETS = join(DIST, 'assets');
const hasBuild = existsSync(ASSETS) && existsSync(join(DIST, 'index.html'));

/** lunar-javascript 안에만 있는 문자열들 */
const ENGINE_MARKERS = ['立春', '雨水', '彭祖'];
/** 해석 텍스트 안에만 있는 문장 조각 */
const TEXT_MARKERS = ['곧게 뻗는 큰 나무', '이슬비와 샘물'];

const describeIfBuilt = hasBuild ? describe : describe.skip;

describeIfBuilt('번들 분할', () => {
  const html = hasBuild ? readFileSync(join(DIST, 'index.html'), 'utf8') : '';
  const entryName = html.match(/assets\/([A-Za-z0-9._-]+\.js)/)?.[1] ?? '';
  const entry = hasBuild ? readFileSync(join(ASSETS, entryName), 'utf8') : '';
  const chunkNames = hasBuild ? readdirSync(ASSETS).filter((f) => f.endsWith('.js')) : [];

  it('index.html 이 진입 청크를 하나만 직접 부른다', () => {
    expect(entryName).toBeTruthy();
    expect(html.match(/assets\/[A-Za-z0-9._-]+\.js/g) ?? []).toHaveLength(1);
  });

  it('진입 청크에 lunar-javascript 가 없다', () => {
    for (const marker of ENGINE_MARKERS) {
      expect(entry.includes(marker), `진입 청크에 "${marker}" 가 있다`).toBe(false);
    }
  });

  it('진입 청크에 해석 텍스트가 없다', () => {
    for (const marker of TEXT_MARKERS) {
      expect(entry.includes(marker), `진입 청크에 "${marker}" 가 있다`).toBe(false);
    }
  });

  it('엔진은 별도 청크로 분리돼 있다', () => {
    const engineChunks = chunkNames.filter((name) => {
      const body = readFileSync(join(ASSETS, name), 'utf8');
      return ENGINE_MARKERS.every((m) => body.includes(m));
    });
    expect(engineChunks.length).toBeGreaterThanOrEqual(1);
    expect(engineChunks).not.toContain(entryName);
  });

  it('진입 청크가 250KB 를 넘지 않는다', () => {
    const kb = Buffer.byteLength(entry) / 1024;
    expect(kb, `진입 청크 ${kb.toFixed(0)}KB`).toBeLessThan(250);
  });

  it('한국 음력 자료는 엔진 청크에만 있다', () => {
    // korean-lunar-calendar 는 음↔양 변환 자료라 18KB 쯤 된다. 입력 화면을
    // 여는 사람에게 미리 들려 보낼 이유가 없다 — 사주를 눌러야 필요해진다.
    expect(entry.includes('getLunarIntercalationMonth')).toBe(false);
    const withKlc = chunkNames.filter((name) =>
      readFileSync(join(ASSETS, name), 'utf8').includes('getLunarIntercalationMonth'),
    );
    expect(withKlc.length, '한국 음력 자료가 아예 없다').toBeGreaterThanOrEqual(1);
    expect(withKlc).not.toContain(entryName);
  });

  it('astronomy-engine 은 어느 청크에도 없다', () => {
    // 검증 전용 devDependency 다. 절기를 천체력으로 직접 푸는 코드라
    // 무겁고, 브라우저에서는 쓸 일이 없다. 실수로 src/ 에서 import 하면
    // 여기서 걸린다.
    for (const name of chunkNames) {
      const body = readFileSync(join(ASSETS, name), 'utf8');
      expect(
        body.includes('SearchSunLongitude') || body.includes('astronomy-engine'),
        `${name} 에 astronomy-engine 이 들어갔다`,
      ).toBe(false);
    }
  });

  it('Sentry 는 진입 청크에 들어가지 않는다', () => {
    // DSN 이 없으면 아예 받지 않아야 한다
    expect(entry.includes('sentry.io')).toBe(false);
  });
});

describe('번들 게이트 안내', () => {
  it(hasBuild ? '빌드 산출물로 검사했다' : 'dist/ 가 없어 건너뛴다 (pnpm build 후 재실행)', () => {
    expect(typeof hasBuild).toBe('boolean');
  });
});
