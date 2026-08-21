/**
 * 명리서재 — 세부 설정 (Open Question 2·3·4)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 접어두는가
 *
 * 출생지·야자시·균시차는 만세력 유파가 갈리는 지점이라 정답이 하나가
 * 아니다. 그렇다고 숨기면 "왜 다른 앱과 다르지?"에 답할 방법이 없다.
 *
 * 그래서 기본값을 정해 접어두고, 열면 무엇을 왜 바꾸는지 설명한다.
 * 관객이 부모님 세대라 선택지를 앞에 들이미는 것 자체가 비용이다.
 * 대부분은 열지 않고 지나가는 것이 맞다.
 *
 * 기본값과 근거:
 *   출생지  서울 — 시 경계 ±8분 안에 태어난 사람만 갈린다
 *   야자시  preserve-day — 시주만 다음날 자시로, 일주는 당일 유지
 *   균시차  끄기 — 넣으면 주류 만세력과 결과가 달라지는 경우가 생긴다
 */

import { useState } from 'react';
import { REGIONS, SEOUL, minutesFromSeoul } from '../core/regions';
import { useSajuStore } from '../store/saju-store';

const FIELD =
  'w-full rounded-md border border-line bg-card px-3 py-2.5 text-ink font-batang appearance-none';

export function AdvancedOptions() {
  const [open, setOpen] = useState(false);
  const form = useSajuStore((s) => s.form);
  const setField = useSajuStore((s) => s.setField);

  const longitude = form.longitude ?? SEOUL.longitude;
  const delta = minutesFromSeoul(longitude);
  const isDefault =
    Math.abs(delta) < 0.001 &&
    (form.yajasi ?? 'preserve-day') === 'preserve-day' &&
    form.applyEquationOfTime !== true;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md border border-dashed border-line-dash bg-card px-3 py-2.5 text-sm text-ink-soft"
      >
        <span>
          세부 설정
          {!isDefault && <span className="ml-2 text-jumuk">· 변경됨</span>}
        </span>
        <span aria-hidden className="text-ink-faint">{open ? '접기' : '펼치기'}</span>
      </button>

      {open && (
        <div className="mt-2.5 space-y-5 rounded-md border border-line bg-card px-4 py-4">
          <p className="text-xs leading-relaxed text-ink-faint">
            만세력 유파가 갈리는 항목들입니다. 기본값 그대로 두셔도 됩니다.
          </p>

          {/* 출생지 — OQ2 */}
          <div>
            <label htmlFor="region" className="mb-1.5 block text-sm text-ink-soft">
              태어난 지역
            </label>
            <select
              id="region"
              className={FIELD}
              value={String(longitude)}
              onChange={(e) => setField('longitude', Number(e.target.value))}
            >
              {REGIONS.map((r) => (
                <option key={r.name} value={r.longitude}>{r.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
              {Math.abs(delta) < 0.5
                ? '해 뜨는 시각이 서울과 거의 같습니다.'
                : delta > 0
                  ? `서울보다 해가 ${Math.abs(delta).toFixed(0)}분 일찍 뜹니다. 시(時) 경계 근처 출생이면 시주가 달라질 수 있습니다.`
                  : `서울보다 해가 ${Math.abs(delta).toFixed(0)}분 늦게 뜹니다. 시(時) 경계 근처 출생이면 시주가 달라질 수 있습니다.`}
            </p>
          </div>

          {/* 야자시 — OQ4 */}
          <div>
            <span className="mb-1.5 block text-sm text-ink-soft">
              밤 11시 이후 출생 (야자시)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['preserve-day', '일주 유지'],
                ['advance-day', '일주 넘김'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={(form.yajasi ?? 'preserve-day') === value}
                  onClick={() => setField('yajasi', value)}
                  className={
                    'rounded-md border px-3 py-2.5 text-sm transition-colors ' +
                    ((form.yajasi ?? 'preserve-day') === value
                      ? 'border-jumuk bg-jumuk text-card'
                      : 'border-line bg-hanji text-ink-soft')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
              밤 11시부터는 다음날 자시(子時)로 봅니다. 이때 일주까지 다음날로
              넘길지는 유파에 따라 갈립니다. 밤 11시 이후 출생이 아니면 영향이 없습니다.
            </p>
          </div>

          {/* 균시차 — OQ3 */}
          <div>
            <label className="flex items-start gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={form.applyEquationOfTime === true}
                onChange={(e) => setField('applyEquationOfTime', e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-jumuk"
              />
              <span>
                균시차 보정
                <span className="mt-1 block text-xs leading-relaxed text-ink-faint">
                  지구 궤도가 타원이라 해가 남중하는 시각이 계절마다 최대 ±16분
                  달라집니다. 더 정밀하지만, 이 보정을 넣지 않는 만세력이 많아
                  결과가 갈릴 수 있습니다.
                </span>
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
