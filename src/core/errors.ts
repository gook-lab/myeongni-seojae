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
  | 'ENGINE_LOAD_FAILED'
  /** 공유 링크의 토큰이 손상됨 — 메신저가 URL 뒤를 자른 경우가 대부분이다 */
  | 'BROKEN_LINK';

/** 음력 자료 범위 밖. 양력 범위와 달라서 따로 안내한다. */

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

export const ERROR_MESSAGES: Record<SajuErrorCode, string> & { LUNAR_OUT_OF_RANGE: string } = {
  get LUNAR_OUT_OF_RANGE() { return LUNAR_OUT_OF_RANGE_MESSAGE; },
  OUT_OF_RANGE_YEAR: `${SUPPORTED_YEAR_MIN}년부터 ${SUPPORTED_YEAR_MAX}년 사이의 생년월일만 계산할 수 있습니다.`,
  INVALID_DATE: '달력에 없는 날짜입니다. 생년월일을 다시 확인해 주세요.',
  INVALID_TIME: '시각이 올바르지 않습니다. 0시부터 23시 사이로 입력해 주세요.',
  NO_SUCH_LEAP_MONTH: '그 해 그 달에는 윤달이 없습니다. 평달로 다시 선택해 주세요.',
  TZDATA_UNSUPPORTED:
    '이 기기의 시간대 정보가 오래되어 1954~1961년 구간을 정확히 계산할 수 없습니다. 브라우저를 업데이트하시면 정확도가 올라갑니다.',
  ENGINE_LOAD_FAILED: '계산에 필요한 자료를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
  // 고칠 대상이 입력이 아니라 링크다. 그래서 안내도 다르다.
  BROKEN_LINK:
    '링크가 손상됐습니다. 메신저에서 주소 뒤가 잘렸을 수 있어요. 링크를 다시 받거나 아래에 직접 입력해 주세요.',
};

/**
 * 음력 자료의 상한 안내.
 *
 * 한국천문연구원 음양력 자료가 2050년까지다. 중국 음력으로 물러나면
 * 달의 3.6%에서 하루 어긋난 값을 아무 말 없이 내주게 되므로 거절한다.
 */
export const LUNAR_OUT_OF_RANGE_MESSAGE =
  '음력은 2050년까지만 계산할 수 있습니다. 한국천문연구원 음양력 자료의 범위입니다. 양력으로 입력해 주세요.';
