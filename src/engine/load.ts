/**
 * 명리서재 — 엔진 지연 로딩 (T9 + T10 / F2)
 *
 * 동적 import 는 네트워크가 끊기면 조용히 rejected promise 를 남긴다.
 * catch 를 안 붙이면 버튼을 눌러도 아무 일이 안 일어나고 에러도 안 보인다.
 * 사용자 입장에선 버튼이 고장난 것처럼 보인다 — 어떤 에러 화면보다 나쁜 결과다.
 *
 * 지하철·시골·엘리베이터에서 흔히 나온다. 부모님이 버튼을 여러 번 누르시다가
 * 앱이 고장난 걸로 알고 닫으시면 성공 기준 7번이 거기서 깨진다.
 *
 * 이 파일은 그래서 항상 결과 타입으로 돌려준다. 실패는 재시도 가능한 상태다.
 */

import { ERROR_MESSAGES, err, ok, type SajuResult } from '../core/errors';
import type { ComputeOptions, SajuReading } from './index';
import type { RawFormValues } from '../core/types';

type EngineModule = typeof import('./index');

let cached: EngineModule | null = null;
let inflight: Promise<EngineModule> | null = null;

/**
 * 엔진 청크를 가져온다. 이미 받았으면 즉시 반환하고,
 * 받는 중이면 같은 promise 를 공유한다 (버튼 연타 방어).
 */
export async function loadEngine(): Promise<SajuResult<EngineModule>> {
  if (cached) return ok(cached);
  try {
    inflight ??= import('./index');
    const mod = await inflight;
    cached = mod;
    return ok(mod);
  } catch (e) {
    // 실패한 promise 를 캐시에 남기면 재시도가 영원히 같은 실패를 반환한다
    inflight = null;
    return err('ENGINE_LOAD_FAILED', ERROR_MESSAGES.ENGINE_LOAD_FAILED, {
      cause: e instanceof Error ? e.message : String(e),
    });
  }
}

/** 로드 + 계산을 한 번에. UI 는 이것만 부르면 된다. */
export async function computeWithLoad(
  raw: RawFormValues,
  opts: ComputeOptions = {},
): Promise<SajuResult<SajuReading>> {
  const engine = await loadEngine();
  if (!engine.ok) return engine;
  return engine.value.computeReading(raw, opts);
}

/** 테스트 전용 — 캐시 초기화 */
export function __resetEngineCache(): void {
  cached = null;
  inflight = null;
}
