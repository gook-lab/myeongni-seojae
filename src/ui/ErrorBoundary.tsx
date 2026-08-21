/**
 * 명리서재 — 최후 방어선
 *
 * ErrorBoundary 는 검증 계층이 아니다. 값이 이상한 건 core 가 SajuResult 로
 * 걸러내고, 여기는 그걸 다 통과한 예상 밖의 예외만 받는다.
 * 목적은 하나 — 어떤 경로로도 하얀 화면이 나오지 않게 하는 것.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // 여기서 error.message 에 생년월일이 실려 있을 수 있다.
    // Sentry 로 나가는 길목은 observability/sentry.ts 의 beforeSend 가 막는다.
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="text-lg font-bold text-ink">잠시 문제가 생겼습니다</p>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
          입력하신 내용은 이 기기에 그대로 있습니다.
          <br />
          아래 버튼으로 다시 시작해 주세요.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-md bg-jumuk px-6 py-3 font-bold text-card"
        >
          다시 시작
        </button>
      </div>
    );
  }
}
