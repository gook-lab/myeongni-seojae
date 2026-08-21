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
import { ERROR_MESSAGES, type SajuError } from '../core/errors';
import type { RawFormValues, YajasiPolicy } from '../core/types';
import type { SajuReading } from '../engine';
import { computeWithLoad } from '../engine/load';
import { buildCalcSteps, stepIntervalMs, type CalcStep } from '../ui/calc-steps';
import {
  SHARE_HASH_KEY,
  buildShareUrl,
  chartKey,
  decodeShareToken,
  encodeShareToken,
  readShareToken,
} from '../core/share-link';

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
export type Route = 'intro' | 'home' | 'saju' | 'detail' | 'report' | 'daily' | 'gunghap' | 'year';

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
const NOTES_KEY = 'myeongri.notes.v1';
/**
 * 인트로를 이미 본 사람인가.
 *
 * 한 번 읽은 다짐을 매번 다시 읽힐 이유가 없다. 두 번째부터는 메뉴로
 * 바로 간다 — 첫 화면을 둔 것이 문턱이 되면 안 된다.
 */
const SEEN_INTRO_KEY = 'myeongri.seen-intro.v1';

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
  /**
   * 인생 대조표. `차트키:대운시작연도` → 사용자가 적은 글.
   * 이 기기의 localStorage 에만 있고 서버로 나가지 않는다.
   */
  notes: Record<string, string>;
  /** 링크를 복사한 직후 잠깐 뜨는 안내 */
  shareState: 'idle' | 'copied' | 'failed';
  /**
   * 계산 중 한 줄씩 드러나는 근거.
   * 지어낸 진행 표시가 아니라 방금 계산한 실제 값이다 (ui/calc-steps.ts).
   */
  calcSteps: CalcStep[];
  /** 지금까지 몇 줄이 드러났는가 */
  calcShown: number;
  /** 계산은 끝났지만 아직 근거를 드러내는 중인 결과. 건너뛰기가 쓴다. */
  pendingReading: SajuReading | null;

  go: (route: Route) => void;
  /** 인트로에서 메뉴로. 다음부터는 인트로를 건너뛴다. */
  enterFromIntro: () => void;
  setField: <K extends keyof RawFormValues>(key: K, value: RawFormValues[K]) => void;
  setYajasi: (policy: YajasiPolicy) => void;
  setTextScale: (scale: TextScale) => void;
  toggleCard: (index: number) => void;
  setTzdataOk: (ok: boolean) => void;

  submit: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  restoreSaved: () => void;

  /** 주소의 프래그먼트에 토큰이 있으면 그대로 복원한다. 없으면 아무것도 안 한다. */
  restoreFromLink: () => Promise<boolean>;
  copyShareLink: () => Promise<void>;
  skipCalc: () => void;
  setNote: (startYear: number, text: string) => void;
  clearNotes: () => void;
  noteFor: (startYear: number) => string;
}

export const useSajuStore = create<SajuState>((set, get) => ({
  route: hasSeenIntro() ? 'home' : 'intro',
  form: { ...DEFAULT_FORM },
  phase: 'idle',
  reading: null,
  error: null,
  textScale: 'normal',
  openCard: null,
  tzdataOk: true,
  notes: readNotes(),
  shareState: 'idle',
  calcSteps: [],
  calcShown: 0,
  pendingReading: null,

  enterFromIntro: () => {
    try {
      localStorage.setItem(SEEN_INTRO_KEY, '1');
    } catch {
      // 사파리 프라이빗 모드 등. 못 적어도 동작에는 지장이 없다.
    }
    set({ route: 'home' });
    window.scrollTo(0, 0);
  },

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
    set({ phase: 'loading', error: null, calcSteps: [], calcShown: 0 });

    // 여기가 진짜 기다림이다. 엔진 청크를 받는 구간으로, 느린 회선에서는
    // 몇 초 걸린다. 빠른 회선에서는 0에 가깝다.
    const result = await computeWithLoad(get().form);
    if (!result.ok) {
      set({ phase: 'error', error: result.error, reading: null, calcSteps: [] });
      return;
    }

    /*
     * 계산은 이미 끝났다. 이제 그 근거를 한 줄씩 드러낸다.
     *
     * 가짜 진행 막대가 아니다 — 숫자는 전부 방금 계산한 실제 값이고,
     * 늦추는 것은 표시 속도뿐이다. 결과가 너무 빨리 나와서 하드코딩처럼
     * 보인다는 지적을 받아 넣었다. 기다리는 시간에 이 앱이 무엇을 하는지
     * 보여주는 편이, 빈 화면을 보여주는 것보다 정직하다.
     */
    const steps = buildCalcSteps(result.value);
    const gap = stepIntervalMs();
    set({ pendingReading: result.value });
    set({ calcSteps: steps, calcShown: 0 });
    for (let i = 1; i <= steps.length; i += 1) {
      if (gap > 0) await new Promise((r) => { window.setTimeout(r, gap); });
      // 도중에 사용자가 건너뛰었거나 다른 데로 갔으면 멈춘다
      if (get().phase !== 'loading') return;
      set({ calcShown: i });
    }
    if (gap > 0) await new Promise((r) => { window.setTimeout(r, gap); });
    if (get().phase !== 'loading') return;

    // 현재 대운을 기본으로 펼친다 — 사람들이 제일 먼저 보고 싶은 칸이다
    const current = result.value.cards.find((c) => c.isCurrent);
    set({
      route: 'saju',
      phase: 'ready',
      reading: result.value,
      error: null,
      openCard: current ? current.index : null,
      pendingReading: null,
    });
    persistForm(get().form);
  },

  retry: async () => {
    await get().submit();
  },

  reset: () =>
    set({
      route: 'saju', phase: 'idle', reading: null, error: null,
      openCard: null, calcSteps: [], calcShown: 0,
    }),

  restoreSaved: () => {
    const saved = readSavedForm();
    if (saved) set({ form: saved });
  },

  restoreFromLink: async () => {
    const token = readShareToken(window.location.hash);
    if (!token) return false;
    const decoded = decodeShareToken(token);
    // 손상된 링크는 조용히 넘어가지 않는다. 잘린 링크로 엉뚱한 사주를
    // 보여주느니 입력 화면을 보여주는 편이 낫다.
    if (!decoded.ok || !decoded.form) {
      clearHash();
      // phase 를 error 로 둬야 입력 화면이 실제로 안내를 띄운다.
      // 조용한 실패를 만들지 않는다 — 잘린 링크로 엉뚱한 사주가 나오는 것보다
      // 무슨 일이 일어났는지 말해주는 편이 낫다.
      set({ route: 'saju', phase: 'error', error: LINK_BROKEN });
      return false;
    }
    set({ form: decoded.form, route: 'saju' });
    await get().submit();
    return true;
  },

  /** 계산 화면에서 바로 결과로 건너뛴다. 이미 계산은 끝나 있다. */
  skipCalc: () => {
    const r = get().pendingReading;
    if (!r) return;
    const current = r.cards.find((c) => c.isCurrent);
    set({
      route: 'saju', phase: 'ready', reading: r, error: null,
      openCard: current ? current.index : null,
      calcShown: get().calcSteps.length,
    });
  },

  copyShareLink: async () => {
    const url = buildShareUrl(window.location.href.split('#')[0] as string, get().form);
    try {
      await navigator.clipboard.writeText(url);
      set({ shareState: 'copied' });
    } catch {
      // 클립보드 권한이 없거나 http 인 경우. 주소창에라도 올려둔다.
      window.location.hash = `${SHARE_HASH_KEY}=${encodeShareToken(get().form)}`;
      set({ shareState: 'failed' });
    }
    window.setTimeout(() => set({ shareState: 'idle' }), 4000);
  },

  setNote: (startYear, text) => {
    const key = noteKey(get().form, startYear);
    set((s) => {
      const next = { ...s.notes };
      if (text.trim()) next[key] = text;
      else delete next[key];
      persistNotes(next);
      return { notes: next };
    });
  },

  clearNotes: () => {
    // 이 사주의 것만 지운다. 다른 사람 사주를 봐준 기록까지 날리지 않는다.
    const prefix = `${chartKey(get().form)}:`;
    set((s) => {
      const next = Object.fromEntries(
        Object.entries(s.notes).filter(([k]) => !k.startsWith(prefix)),
      );
      persistNotes(next);
      return { notes: next };
    });
  },

  noteFor: (startYear) => get().notes[noteKey(get().form, startYear)] ?? '',
}));

const LINK_BROKEN: SajuError = {
  code: 'BROKEN_LINK',
  message: ERROR_MESSAGES.BROKEN_LINK,
};

function clearHash(): void {
  try {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    window.location.hash = '';
  }
}

const noteKey = (form: RawFormValues, startYear: number): string =>
  `${chartKey(form)}:${startYear}`;

/**
 * 인생 대조표는 이 기기에만 남는다.
 *
 * 키에 생년월일이 평문으로 들어가지 않도록 차트키(불투명 토큰)를 쓴다.
 * 남의 기기에서 내 사주를 본 뒤에도 흔적이 남지만, 지우기 버튼이 있다.
 */
function persistNotes(notes: Record<string, string>): void {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    // 저장 실패는 치명적이지 않다
  }
}

function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(SEEN_INTRO_KEY) === '1';
  } catch {
    // 저장소를 못 읽으면 보여준다. 안 보여주는 쪽이 더 나쁜 실패다.
    return false;
  }
}

function readNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * 다시보기는 localStorage 를 쓴다.
 *
 * 원래 설계(rev.2 A3 / Open Question 6)에서는 URL 해시를 아예 쓰지 않기로
 * 했다. Sentry 가 location.href 를 이벤트에 담기 때문이었다. 그 걱정은
 * scrubUrl 이 프래그먼트를 통째로 버리는 것으로 해결됐고(privacy.test.ts 가
 * 지킨다), 그래서 공유 링크는 프래그먼트에 불투명 토큰을 싣는다
 * (core/share-link.ts). 생년월일이 평문으로 들어가는 일은 여전히 없다.
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
