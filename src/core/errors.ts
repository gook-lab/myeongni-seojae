/**
 * 명리서재 — 에러 계약
 *
 * 규칙: core/* 는 예외를 던지지 않고 SajuResult 를 반환한다.
 * ErrorBoundary 는 검증 계층이 아니라 최후 방어선이다.
 */

export type SajuErrorCode =
  /** 라이브러리 지원 범위 밖 연도 */
  | 'OUT_OF_RANGE_YEAR'
  /** 존재하지 않는 날짜 (2월 30일 등) */
  | 'INVALID_DATE'
  /** 시/분이 범위 밖 */
  | 'INVALID_TIME'
  /** 해당 음력 연월에 윤달이 없음 */
  | 'NO_SUCH_LEAP_MONTH'
  /** 런타임 tzdata 결손 — 한국 표준시 이력을 모름 */
  | 'TZDATA_UNSUPPORTED'
  /** 계산 엔진 동적 import 실패 */
  | 'ENGINE_LOAD_FAILED';

export interface SajuError {
  code: SajuErrorCode;
  /** 사용자에게 그대로 보여줄 수 있는 한국어 문장 */
  message: string;
  detail?: unknown;
}

export type SajuResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: SajuError };

export const ok = <T>(value: T): SajuResult<T> => ({ ok: true, value });

export const err = <T = never>(
  code: SajuErrorCode,
  message: string,
  detail?: unknown,
): SajuResult<T> => ({ ok: false, error: { code, message, detail } });

/** 지원 범위. lunar-javascript 의 절기 계산이 신뢰할 수 있는 구간. */
export const SUPPORTED_YEAR_MIN = 1900;
export const SUPPORTED_YEAR_MAX = 2100;

export const ERROR_MESSAGES: Record<SajuErrorCode, string> = {
  OUT_OF_RANGE_YEAR: `${SUPPORTED_YEAR_MIN}년부터 ${SUPPORTED_YEAR_MAX}년 사이의 생년월일만 계산할 수 있습니다.`,
  INVALID_DATE: '달력에 없는 날짜입니다. 생년월일을 다시 확인해 주세요.',
  INVALID_TIME: '시각이 올바르지 않습니다. 0시부터 23시 사이로 입력해 주세요.',
  NO_SUCH_LEAP_MONTH: '그 해 그 달에는 윤달이 없습니다. 평달로 다시 선택해 주세요.',
  TZDATA_UNSUPPORTED:
    '이 기기의 시간대 정보가 오래되어 1954~1961년 구간을 정확히 계산할 수 없습니다. 브라우저를 업데이트하시면 정확도가 올라갑니다.',
  ENGINE_LOAD_FAILED: '계산에 필요한 자료를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
};
