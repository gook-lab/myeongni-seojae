/**
 * 명리서재 — 앱 상태 (Zustand)
 *
 * 서버 상태가 하나도 없다. 계산은 전량 클라이언트에서 일어나고 생년월일은
 * 어디로도 나가지 않는다. 그래서 React Query 를 쓰지 않는다 — 쿼리할
 * 서버가 없는데 서버 상태 캐시를 두는 건 안 쓰는 의존성일 뿐이다.
 *
 * 이 스토어가 소유하는 것:
 *   입력 폼 값 / 계산 결과 / 로딩·에러 상태 / 큰 글씨 / 야자시 정책
 */

import { create } from 'zustand';
import type { SajuError } from '../core/errors';
import type { RawFormValues, YajasiPolicy } from '../core/types';
import type { SajuReading } from '../engine';
import { computeWithLoad } from '../engine/load';

export type TextScale = 'normal' | 'large' | 'xlarge';
export type Phase = 'idle' | 'loading' | 'ready' | 'error';

/**
 * 화면 갈래. 원안 와이어플로우의 홈 네비게이션 구조 그대로다.
 *
 *   home  [사주 보기] [오늘] [궁합] [신년]
 *           ↓          ↓      ↓      ↓
 *         saju       daily  gunghap year
 *           ↓
 *         detail  (상세 풀이 — 궁위 · 오행 균형 · 풀이)
 *
 * 부가 기능을 결과 페이지 하단에 쌓지 않는다. 한 번 그렇게 만들었다가
 * 결과 화면이 3.8화면 길이가 됐고, 대운 타임라인이 주인공 자리를 잃었다.
 * 별도 화면으로 두면 기능을 잃지 않으면서 타임라인이 깨끗하게 유지된다.
 */
export type Route = 'home' | 'saju' | 'detail' | 'report' | 'daily' | 'gunghap' | 'year';

const currentYear = new Date().getFullYear();

export const DEFAULT_FORM: RawFormValues = {
  calendar: 'solar',
  year: currentYear - 30,
  month: 1,
  day: 1,
  leapMonth: false,
  // 시간 미상이 기본값이다. 관객(부모님 세대)에게는 그게 정상이지 예외가 아니다.
  hourKnown: false,
  hour: 12,
  minute: 0,
  gender: '남',
  yajasi: 'preserve-day',
  applyEquationOfTime: false,
  name: '',
};

const STORAGE_KEY = 'myeongri.reading.v1';

interface SajuState {
  route: Route;
  form: RawFormValues;
  phase: Phase;
  reading: SajuReading | null;
  error: SajuError | null;
  textScale: TextScale;
  /** 펼쳐진 대운 칸의 index. null 이면 전부 접힘 */
  openCard: number | null;
  tzdataOk: boolean;

  go: (route: Route) => void;
  setField: <K extends keyof RawFormValues>(key: K, value: RawFormValues[K]) => void;
  setYajasi: (policy: YajasiPolicy) => void;
  setTextScale: (scale: TextScale) => void;
  toggleCard: (index: number) => void;
  setTzdataOk: (ok: boolean) => void;

  submit: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  restoreSaved: () => void;
}

export const useSajuStore = create<SajuState>((set, get) => ({
  route: 'home',
  form: { ...DEFAULT_FORM },
  phase: 'idle',
  reading: null,
  error: null,
  textScale: 'normal',
  openCard: null,
  tzdataOk: true,

  go: (route) => {
    // 부가 화면은 원국이 있어야 의미가 있다. 없으면 입력부터 받는다.
    const needsChart =
      route === 'detail' || route === 'report' ||
      route === 'daily' || route === 'gunghap' || route === 'year';
    if (needsChart && !get().reading) {
      set({ route: 'saju', phase: 'idle' });
      return;
    }
    set({ route });
    window.scrollTo(0, 0);
  },

  setField: (key, value) =>
    set((s) => ({ form: { ...s.form, [key]: value }, error: null })),

  setYajasi: (policy) => set((s) => ({ form: { ...s.form, yajasi: policy } })),

  setTextScale: (scale) => {
    document.documentElement.dataset.scale = scale === 'normal' ? '' : scale;
    set({ textScale: scale });
  },

  toggleCard: (index) => set((s) => ({ openCard: s.openCard === index ? null : index })),

  setTzdataOk: (ok) => set({ tzdataOk: ok }),

  submit: async () => {
    set({ phase: 'loading', error: null });
    const result = await computeWithLoad(get().form);
    if (!result.ok) {
      set({ phase: 'error', error: result.error, reading: null });
      return;
    }
    // 현재 대운을 기본으로 펼친다 — 사람들이 제일 먼저 보고 싶은 칸이다
    const current = result.value.cards.find((c) => c.isCurrent);
    set({
      route: 'saju',
      phase: 'ready',
      reading: result.value,
      error: null,
      openCard: current ? current.index : null,
    });
    persistForm(get().form);
  },

  retry: async () => {
    await get().submit();
  },

  reset: () =>
    set({ route: 'saju', phase: 'idle', reading: null, error: null, openCard: null }),

  restoreSaved: () => {
    const saved = readSavedForm();
    if (saved) set({ form: saved });
  },
}));

/**
 * 다시보기는 localStorage 만 쓴다.
 * URL 해시에 생년월일을 넣지 않기로 했다 — Sentry 가 location.href 를
 * 이벤트에 담기 때문이다 (design rev.2 A3 / Open Question 6).
 */
function persistForm(form: RawFormValues): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  } catch {
    // 사파리 프라이빗 모드 등에서 실패할 수 있다. 저장 실패는 치명적이지 않다.
  }
}

function readSavedForm(): RawFormValues | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RawFormValues>;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return { ...DEFAULT_FORM, ...parsed };
  } catch {
    return null;
  }
}
