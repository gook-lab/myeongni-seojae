import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initObservability } from './observability/sentry';
import { useSajuStore } from './store/saju-store';
import './styles.css';

// DSN 이 없으면 아무것도 하지 않는다. 로컬·테스트에서 네트워크로 안 나간다.
void initObservability();

/**
 * 부팅 복원 순서
 *
 * 1. 주소에 공유 토큰이 있으면 그걸로 바로 사주를 뽑는다. 링크를 받아서
 *    열었다는 뜻이므로 입력 화면을 한 번 더 보여줄 이유가 없다.
 * 2. 없으면 이 기기에 저장해둔 마지막 입력을 폼에만 채운다. 자동으로
 *    계산하지는 않는다 — 남의 기기에서 열었을 때 남의 사주가 튀어나오면
 *    곤란하다.
 */
void useSajuStore
  .getState()
  .restoreFromLink()
  .then((restored) => {
    if (!restored) useSajuStore.getState().restoreSaved();
  });

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>);
