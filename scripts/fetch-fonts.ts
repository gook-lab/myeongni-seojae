/**
 * 폰트를 우리 쪽으로 가져온다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜
 *
 * 처리방침 화면에 "아무 데도 보내지 않습니다" 라고 적어놓고, 정작 페이지를
 * 열 때마다 fonts.googleapis.com 과 fonts.gstatic.com 으로 요청이 나가고
 * 있었다. 생년월일이 실려 가는 건 아니지만 IP 와 접속 사실은 남는다.
 * 우리가 한 말과 하는 일이 달랐다.
 *
 * 고르는 길은 셋이었다.
 *   1. 문구를 고친다        — 쉽지만 이 앱의 이유를 깎는다
 *   2. 웹폰트를 버린다      — 기기마다 글꼴이 달라져 한지의 결이 사라진다
 *   3. 우리가 호스팅한다    ← 이걸 골랐다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 크기가 걱정되지 않는 이유
 *
 * 한글 폰트는 통으로 받으면 수 MB 지만, 구글은 유니코드 구간별로 잘게
 * 쪼개 놓았다(고운바탕은 굵기당 95조각). 그 unicode-range 규칙은 우리가
 * 호스팅해도 그대로 동작한다 — 브라우저는 **화면에 실제로 쓰인 글자가 든
 * 조각만** 받는다. 저장소에는 전부 두지만 방문자는 몇 개만 받는다.
 *
 * 실행:  pnpm fonts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap';

/**
 * 최신 브라우저인 척한다. 그래야 woff2 를 준다 —
 * 알 수 없는 UA 에는 훨씬 큰 ttf 를 내준다.
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const OUT_DIR = 'public/fonts';
const CSS_OUT = 'public/fonts/gowun-batang.css';

async function main(): Promise<void> {
  const res = await fetch(CSS_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`구글 폰트 CSS 를 못 받았습니다: ${res.status}`);
  let css = await res.text();

  const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)]+/g) ?? [])];
  if (urls.length === 0) throw new Error('CSS 에서 폰트 파일 주소를 못 찾았습니다');

  mkdirSync(OUT_DIR, { recursive: true });
  let total = 0;

  for (const [i, url] of urls.entries()) {
    const name = url.split('/').pop() as string;
    const bin = await (await fetch(url, { headers: { 'User-Agent': UA } })).arrayBuffer();
    writeFileSync(join(OUT_DIR, name), Buffer.from(bin));
    total += bin.byteLength;
    css = css.split(url).join(`/fonts/${name}`);
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${urls.length}`);
  }

  writeFileSync(
    CSS_OUT,
    `/* 자동 생성 — scripts/fetch-fonts.ts. 다시 받으려면 pnpm fonts */\n${css}`,
  );

  console.log(`조각 ${urls.length}개 · 합계 ${(total / 1024 / 1024).toFixed(1)}MB`);
  console.log(`CSS: ${CSS_OUT}`);
  console.log('브라우저는 이 중 화면에 쓰인 글자가 든 조각만 받습니다.');
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
