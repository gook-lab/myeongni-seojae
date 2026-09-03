/**
 * 계산 화면
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 빈 화면 대신 근거를 보여준다
 *
 * 결과가 너무 빨리 나와서 하드코딩처럼 보인다는 지적을 받았다. 흔한 해법인
 * 가짜 진행 막대 대신, 기다리는 동안 **방금 계산한 실제 값**을 한 줄씩
 * 드러낸다. 지어낸 숫자는 하나도 없다 (ui/calc-steps.ts).
 *
 * 이러면 두 가지가 한꺼번에 된다 — 계산이 실제로 일어났다는 증거가 되고,
 * 사용자는 자기 사주가 어떤 값들 위에 서 있는지 알게 된다. 이 앱이 다른
 * 사주 앱과 갈리는 지점이 그것이다.
 *
 * 엔진 청크를 받는 구간은 진짜 기다림이라 아직 줄이 하나도 없다. 그때는
 * 무엇을 하는 중인지만 적는다.
 */
import { useSajuStore } from '../store/saju-store';

export function Calculating() {
  const steps = useSajuStore((s) => s.calcSteps);
  const shown = useSajuStore((s) => s.calcShown);
  const skip = useSajuStore((s) => s.skipCalc);
  const canSkip = useSajuStore((s) => s.pendingReading !== null);
  const waiting = steps.length === 0;

  return (
    <section
      aria-label="사주를 계산하는 중"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto w-full max-w-md px-5 pt-16 pb-24"
    >
      <p className="text-center text-sm text-ink-faint">
        <span className="ink-breathe">
          {waiting ? '계산 데이터를 불러오는 중입니다' : '계산 근거를 확인하고 있습니다'}
        </span>
      </p>

      {/* 붓 한 획 — 진행 막대가 아니다. 퍼센트를 흉내내지 않는다. */}
      <div aria-hidden className="mx-auto mt-5 h-px w-24 overflow-hidden bg-line-soft">
        <div className="h-full w-full bg-jumuk/60 stroke-sweep" />
      </div>

      <dl className="mt-9 space-y-0">
        {steps.slice(0, shown).map((step) => (
          <div
            key={step.label}
            className="card-enter border-b border-dashed border-line-dash py-3 last:border-b-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-xs text-ink-faint">{step.label}</dt>
              <dd className="text-right text-sm font-bold tabular-nums text-ink">{step.value}</dd>
            </div>
            {step.note && (
              <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">{step.note}</p>
            )}
          </div>
        ))}
      </dl>

      {!waiting && (
        <>
          <p className="mt-8 text-center text-[11px] leading-relaxed text-ink-faint">
            표시된 값은 이번 입력을 기준으로 계산했습니다.
            <br />
            같은 내용은 결과 리포트에서도 확인할 수 있습니다.
          </p>
          {canSkip && (
            /* 기다리기 싫은 사람을 붙잡아두지 않는다. 계산은 이미 끝났다. */
            <button
              type="button"
              onClick={skip}
              className="mx-auto mt-6 block rounded-md border border-line bg-card px-4 py-2.5 text-sm text-ink-soft"
            >
              바로 결과 보기
            </button>
          )}
        </>
      )}
    </section>
  );
}
