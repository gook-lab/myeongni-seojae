/**
 * 계산 근거를 한 줄씩 — "지금 계산하는 중" 이 아니라 "이렇게 계산했다"
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 만들었나
 *
 * 결과가 너무 빨리 나와서 **하드코딩처럼 보인다**는 지적을 받았다. 실제로
 * 브라우저 안에서 다 계산하니 빠른 게 맞는데, 사람에게는 아무 일도 안
 * 일어난 것처럼 보인다.
 *
 * 흔한 해법은 가짜 진행 막대를 돌리는 것이다. 여기서는 안 그런다.
 * 이 앱이 다른 사주 앱과 갈리는 지점이 "근거를 같이 낸다" 인데, 기다리는
 * 시간에 그 근거를 보여주면 두 가지가 한꺼번에 된다 — 계산이 실제로
 * 일어났다는 증거가 되고, 사용자는 자기 사주가 어떤 값들 위에 서 있는지
 * 알게 된다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 정직하게
 *
 * 여기 나오는 숫자는 **전부 방금 계산한 실제 값이다.** 지어낸 단계도,
 * 가짜 퍼센트도 없다. 다만 한 줄씩 읽히도록 **표시 속도만** 늦춘다.
 * 문구도 "…하는 중" 이 아니라 값을 그대로 적는다 — 이미 끝난 계산을
 * 진행 중인 척하지 않기 위해서다.
 *
 * 엔진 청크를 받는 구간은 진짜 기다림이다. 느린 회선에서는 몇 초 걸린다.
 */
import type { SajuReading } from '../engine';

export interface CalcStep {
  /** 왼쪽 라벨 */
  label: string;
  /** 오른쪽에 붙는 실제 값 */
  value: string;
  /** 이 값이 왜 중요한지 — 마지막에 한 번만 보여준다 */
  note?: string;
}

/** 한 줄이 읽히는 데 필요한 시간. 다섯 줄이면 1.3초 남짓이다. */
const DEFAULT_INTERVAL_MS = 260;

/**
 * 표시 간격.
 *
 * E2E 는 이 시간을 치를 이유가 없다. 제출하는 테스트가 예순 개쯤 되어
 * 전체가 50초에서 1분 24초로 늘었다. 그래서 테스트 하네스가 0으로 줄일 수
 * 있게 구멍을 하나 낸다 (e2e/fixtures.ts 가 addInitScript 로 심는다).
 *
 * 실제 동작은 animation.spec.ts 가 이 구멍 없이 확인한다 — 빠르게 도는
 * 테스트만 남기고 진짜 동작을 아무도 안 보는 상태를 만들지 않기 위해서다.
 */
export function stepIntervalMs(): number {
  const hook = (globalThis as { __CALC_PACING_MS__?: unknown }).__CALC_PACING_MS__;
  return typeof hook === 'number' && hook >= 0 ? hook : DEFAULT_INTERVAL_MS;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 분 단위 오프셋을 UTC+9:00 꼴로 */
function offsetLabel(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  return `UTC${sign}${Math.floor(abs / 60)}:${pad(abs % 60)}`;
}

/** 소수 분을 -32분 05초 꼴로 */
function correctionLabel(minutes: number): string {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const m = Math.floor(abs);
  const s = Math.round((abs - m) * 60);
  return `${sign}${m}분 ${pad(s)}초`;
}

/**
 * 계산이 끝난 결과에서 근거 줄을 뽑는다.
 *
 * 순서는 실제 파이프라인 순서와 같다 — 입력을 읽고, 그 시절 표준시를 찾고,
 * 진태양시로 옮기고, 절기표에서 월을 가르고, 여덟 글자를 세운다.
 */
export function buildCalcSteps(reading: SajuReading): CalcStep[] {
  const { chart } = reading;
  const st = chart.solarTime;
  const input = chart.input;
  const steps: CalcStep[] = [];

  if (input.calendar === 'lunar') {
    steps.push({
      label: '음력을 양력으로',
      value: `${chart.solarDate.year}. ${chart.solarDate.month}. ${chart.solarDate.day}.`,
      note: '한국천문연구원 음양력 기준입니다. 중국 음력과 다릅니다.',
    });
  }

  steps.push({
    label: '태어나신 때의 한국 표준시',
    value: offsetLabel(st.standardOffsetMinutes) + (st.daylightSaving ? ' · 서머타임' : ''),
    ...(st.standardOffsetMinutes !== 540
      ? { note: '지금과 다릅니다. 이 시기를 놓치는 만세력이 많습니다.' }
      : {}),
  });

  steps.push({
    label: '진태양시 보정',
    value: correctionLabel(st.offsetMinutes),
    note: '출생지 경도로 해가 실제로 남중하는 시각을 맞춥니다.',
  });

  const m = chart.pillars.month;
  steps.push({
    label: '절기로 가른 달',
    value: `${m.stem}${m.branch}월`,
  });

  const d = chart.pillars.day;
  steps.push({
    label: '일주',
    value: `${d.stem}${d.branch}`,
  });

  return steps;
}
