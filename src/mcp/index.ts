#!/usr/bin/env node
/**
 * 명리서재 MCP 서버 진입점.
 *
 * Claude Desktop / Claude Code 등록 예:
 *   {
 *     "mcpServers": {
 *       "myeongri-seojae": {
 *         "command": "node",
 *         "args": ["/절대경로/dist-mcp/server.js"]
 *       }
 *     }
 *   }
 */
import { main } from './server.js';

main().catch((e: unknown) => {
  process.stderr.write(`[명리서재] 시작 실패: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
