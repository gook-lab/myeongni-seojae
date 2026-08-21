/**
 * MCP 서버 빌드 설정
 *
 * tsc 로 직접 뽑지 않고 번들러를 쓴다. 소스 전체가 확장자 없는 상대 경로
 * import 로 되어 있는데(Vite 규약), Node 의 ESM 해석기는 확장자를 요구한다.
 * 스무 개 파일에 .js 를 뿌려 빌드 방식 두 개를 동시에 만족시키기보다,
 * 이미 쓰고 있는 번들러에게 해석을 맡긴다.
 *
 * ssr: true — node_modules 의존성은 번들에 넣지 않는다.
 * 타입 검사는 루트 `pnpm typecheck` 가 src/mcp 까지 이미 포함한다.
 */
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: true,
    target: 'node18',
    outDir: 'dist-mcp',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: 'src/mcp/index.ts',
      output: {
        format: 'es',
        entryFileNames: 'server.js',
      },
    },
  },
});
