/**
 * 명리서재 — 입력 화면
 *
 * 설계 원칙 두 가지가 화면에 그대로 드러난다.
 *
 * 1) 시간 미상이 기본 선택이다. 관객이 부모님 세대라 태어난 시각을 모르는
 *    게 정상이다. "모른다"를 고르는 것이 실패가 아니라는 걸 문구로 말한다.
 *    대운 타임라인은 시각 없이도 100% 나오므로 손해가 거의 없다.
 *
 * 2) 버튼은 로딩·실패·재시도 상태를 스스로 보여준다. 동적 import 가
 *    실패했을 때 무반응으로 보이면 안 된다 (F2).
 */

import { useMemo } from 'react';
import { DEFAULT_FORM, useSajuStore } from '../store/saju-store';
import { AdvancedOptions } from './AdvancedOptions';

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const LABEL = 'block text-sm text-ink-soft mb-1.5';
const FIELD =
  'w-full rounded-md border border-line bg-card px-3 py-2.5 ' +
  'text-ink font-batang appearance-none';

export function InputForm() {
  const form = useSajuStore((s) => s.form);
  const phase = useSajuStore((s) => s.phase);
  const error = useSajuStore((s) => s.error);
  const setField = useSajuStore((s) => s.setField);
  const submit = useSajuStore((s) => s.submit);
  const go = useSajuStore((s) => s.go);

  const thisYear = new Date().getFullYear();
  const years = useMemo(() => range(1900, Math.min(2100, thisYear)).reverse(), [thisYear]);
  const daysInMonth = useMemo(() => {
    if (form.calendar === 'lunar') return range(1, 30);
    const y = Number(form.year);
    const m = Number(form.month);
    return range(1, new Date(y, m, 0).getDate() || 31);
  }, [form.calendar, form.year, form.month]);

  const busy = phase === 'loading';
  const failed = phase === 'error';
  const loadFailed = error?.code === 'ENGINE_LOAD_FAILED';

  return (
    <form
      className="mx-auto w-full max-w-md px-5 pb-16 pt-10"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <button type="button" onClick={() => go('home')} className="mb-5 text-sm text-ink-soft">
        ‹ 홈
      </button>

      <header className="mb-9 text-center">
        <p className="mb-2 text-xs tracking-[0.3em] text-ink-faint">명리서재</p>
        <h1 className="text-2xl font-bold text-ink">인생을 10년 단위로</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
          생년월일을 넣으면 대운 타임라인이 펼쳐집니다.
          <br />
          지나온 시기가 맞는지 직접 맞춰보세요.
        </p>
      </header>

      {/* 양력 / 음력 */}
      <fieldset className="mb-5">
        <legend className={LABEL}>달력</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['solar', 'lunar'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={form.calendar === kind}
              onClick={() => setField('calendar', kind)}
              className={
                'rounded-md border px-3 py-2.5 transition-colors ' +
                (form.calendar === kind
                  ? 'border-jumuk bg-jumuk text-card'
                  : 'border-line bg-card text-ink-soft')
              }
            >
              {kind === 'solar' ? '양력' : '음력'}
            </button>
          ))}
        </div>
        {form.calendar === 'lunar' && (
          <label className="mt-2.5 flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={form.leapMonth === true}
              onChange={(e) => setField('leapMonth', e.target.checked)}
              className="size-4 accent-jumuk"
            />
            윤달로 태어났습니다
          </label>
        )}
      </fieldset>

      {/* 생년월일 */}
      <fieldset className="mb-5">
        <legend className={LABEL}>생년월일</legend>
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label="년"
            className={FIELD}
            value={String(form.year)}
            onChange={(e) => setField('year', Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select
            aria-label="월"
            className={FIELD}
            value={String(form.month)}
            onChange={(e) => setField('month', Number(e.target.value))}
          >
            {range(1, 12).map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
          <select
            aria-label="일"
            className={FIELD}
            value={String(form.day)}
            onChange={(e) => setField('day', Number(e.target.value))}
          >
            {daysInMonth.map((d) => (
              <option key={d} value={d}>{d}일</option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* 태어난 시각 — 미상이 기본 */}
      <fieldset className="mb-5">
        <legend className={LABEL}>태어난 시각</legend>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={!form.hourKnown}
            onClick={() => setField('hourKnown', false)}
            className={
              'rounded-md border px-3 py-2.5 transition-colors ' +
              (!form.hourKnown
                ? 'border-jumuk bg-jumuk text-card'
                : 'border-line bg-card text-ink-soft')
            }
          >
            모릅니다
          </button>
          <button
            type="button"
            aria-pressed={form.hourKnown}
            onClick={() => setField('hourKnown', true)}
            className={
              'rounded-md border px-3 py-2.5 transition-colors ' +
              (form.hourKnown
                ? 'border-jumuk bg-jumuk text-card'
                : 'border-line bg-card text-ink-soft')
            }
          >
            압니다
          </button>
        </div>

        {form.hourKnown ? (
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <select
              aria-label="시"
              className={FIELD}
              value={String(form.hour)}
              onChange={(e) => setField('hour', Number(e.target.value))}
            >
              {range(0, 23).map((h) => (
                <option key={h} value={h}>{h}시</option>
              ))}
            </select>
            <select
              aria-label="분"
              className={FIELD}
              value={String(form.minute)}
              onChange={(e) => setField('minute', Number(e.target.value))}
            >
              {range(0, 59).map((m) => (
                <option key={m} value={m}>{m}분</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-2.5 rounded-md border border-dashed border-line-dash bg-card px-3 py-2.5 text-sm leading-relaxed text-ink-soft">
            시각을 몰라도 <strong className="text-jumuk">대운 타임라인은 그대로</strong>{' '}
            나옵니다. 시주(時柱)와 성격 해석만 조금 덜 정확해집니다.
          </p>
        )}
      </fieldset>

      {/* 성별 — 대운의 순행·역행을 정한다 */}
      <fieldset className="mb-5">
        <legend className={LABEL}>
          성별 <span className="text-ink-faint">· 대운의 방향을 정합니다</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(['남', '여'] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={form.gender === g}
              onClick={() => setField('gender', g)}
              className={
                'rounded-md border px-3 py-2.5 transition-colors ' +
                (form.gender === g
                  ? 'border-jumuk bg-jumuk text-card'
                  : 'border-line bg-card text-ink-soft')
              }
            >
              {g}자
            </button>
          ))}
        </div>
      </fieldset>

      {/* 에러 — 조용한 실패를 만들지 않는다 */}
      {failed && error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-jumuk bg-card-warm px-3.5 py-3 text-sm leading-relaxed text-jumuk-deep"
        >
          {error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className={
          'w-full rounded-md px-4 py-3.5 text-base font-bold transition-opacity ' +
          'bg-jumuk text-card disabled:opacity-60'
        }
      >
        {busy ? '펼치는 중…' : loadFailed ? '다시 시도' : '사주 풀어보기'}
      </button>

      {/*
        세부 설정은 제출 버튼 "아래"에 둔다.
        위에 두면 부모님이 "이걸 설정해야 하나" 하고 멈춘다.
        아래에 있으면 필요한 사람만 내려와서 연다.
      */}
      <div className="mt-6">
        <AdvancedOptions />
      </div>

      <p className="mt-2 text-center text-xs leading-relaxed text-ink-faint">
        입력한 생년월일은 이 기기를 벗어나지 않습니다.
        <br />
        계산은 전부 브라우저 안에서 이루어집니다.
      </p>

      {form.year === DEFAULT_FORM.year && (
        <p className="mt-6 text-center text-xs text-ink-faint">
          부모님 생년월일로 해보시면 반응이 다릅니다.
        </p>
      )}
    </form>
  );
}
