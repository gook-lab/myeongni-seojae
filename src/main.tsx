import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initObservability } from './observability/sentry';
import './styles.css';

// DSN 이 없으면 아무것도 하지 않는다. 로컬·테스트에서 네트워크로 안 나간다.
void initObservability();

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>);
