/**
 * 명리서재 — 부가 탭 (오늘 · 신년 · 궁합)
 *
 * 대운 타임라인이 주인공이고 이건 조연이다. 그래서 결과 화면 맨 아래에
 * 있고 기본은 접혀 있다.
 *
 * 점수 배지가 없다. 원본은 세 곳 모두 Math.sin 난수로 숫자를 만들었다.
 * 타임라인이 정확한데 옆에서 가짜 숫자가 뜨면 전체 신뢰가 무너진다.
 * 숫자 대신 "왜 그런가"를 보여준다 — 오늘의 일진이 무엇이고 내 일간과
 * 어떤 관계인지.
 */

import { useState } from 'react';
import type { GunghapReading } from '../engine';
import { computeGunghap } from '../engine';
import { useSajuStore } from '../store/saju-store';
import type { RawFormValues } from '../core/types';

type TabKey = 'daily' | 'year' | 'gunghap';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'daily', label: '오늘' },
  { key: 'year', label: '올해' },
  { key: 'gunghap', label: '궁합' },
];

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const FIELD =
  'w-full rounded-md border border-line bg-card px-2.5 py-2 text-sm text-ink font-batang appearance-none';

export function Tabs() {
  const reading = useSajuStore((s) => s.reading);
  const [tab, setTab] = useState<TabKey>('daily');
  if (!reading) return null;

  return (
    <section aria-label="부가 운세" className="mx-auto w-full max-w-md px-5 pb-4 pt-12">
      <h2 className="mb-3.5 text-lg font-bold text-ink">더 보기</h2>

      <div role="tablist" aria-label="부가 운세 종류" className="mb-3 grid grid-cols-3 gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={
              'rounded-md border px-3 py-2.5 text-sm transition-colors ' +
              (tab === key
                ? 'border-jumuk bg-jumuk text-card'
                : 'border-line bg-card text-ink-soft')
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'daily' && <DailyPanel />}
        {tab === 'year' && <YearPanel />}
        {tab === 'gunghap' && <GunghapPanel />}
      </div>
    </section>
  );
}

function DailyPanel() {
  const daily = useSajuStore((s) => s.reading?.daily);
  if (!daily) {
    return <Empty>오늘의 운세를 계산하지 못했습니다.</Empty>;
  }
  return (
    <article className="rounded-lg border border-line bg-card px-4 py-4">
      <p className="text-xs text-ink-faint">{daily.date}</p>
      <p className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl text-ink">{daily.ganji}</span>
        <span className="text-sm text-jumuk">
          {daily.tenGod} · {daily.category}
        </span>
      </p>
      <p className="mt-3 text-xs leading-relaxed text-ink-faint">{daily.lead}</p>
      <p className="mt-2.5 text-sm leading-[1.85] text-ink">{daily.text}</p>
    </article>
  );
}

function YearPanel() {
  const year = useSajuStore((s) => s.reading?.year);
  if (!year) return <Empty>신년운세를 계산하지 못했습니다.</Empty>;

  return (
    <div className="space-y-2.5">
      <article className="rounded-lg border border-jumuk bg-card-warm px-4 py-4">
        <p className="flex items-baseline gap-2">
          <span className="text-2xl text-ink">{year.ganji}</span>
          <span className="text-sm text-jumuk">
            {year.tenGod} · {year.category}
          </span>
        </p>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">{year.lead}</p>
        <p className="mt-2.5 text-sm leading-[1.85] text-ink">{year.text}</p>
      </article>

      <p className="px-1 text-xs leading-relaxed text-ink-faint">
        절기를 기준으로 나눈 열두 달입니다. 양력 달과 며칠씩 어긋납니다.
      </p>

      <ol className="space-y-1.5">
        {year.months.map((m) => (
          <li
            key={m.label}
            className="flex items-center gap-3 rounded-md border border-line bg-card px-3 py-2.5"
          >
            <span className="w-10 shrink-0 text-sm tabular-nums text-ink-soft">{m.label}</span>
            <span className="shrink-0 text-base" style={{ color: m.color }}>
              {m.ganji}
            </span>
            <span className="shrink-0 text-xs text-jumuk">{m.tenGod}</span>
            <span className="truncate text-xs text-ink-faint">{m.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function GunghapPanel() {
  const myForm = useSajuStore((s) => s.form);
  const [other, setOther] = useState({ year: 1990, month: 1, day: 1, gender: '여' as '남' | '여' });
  const [result, setResult] = useState<GunghapReading | null>(null);
  const [error, setError] = useState<string | null>(null);

  const thisYear = new Date().getFullYear();

  const run = () => {
    const partner: RawFormValues = {
      calendar: 'solar',
      year: other.year,
      month: other.month,
      day: other.day,
      leapMonth: false,
      // 궁합은 일간·일지만 쓰므로 시각이 필요 없다
      hourKnown: false,
      gender: other.gender,
      longitude: myForm.longitude,
      yajasi: myForm.yajasi,
      applyEquationOfTime: myForm.applyEquationOfTime,
    };
    const r = computeGunghap(myForm, partner);
    if (r.ok) {
      setResult(r.value);
      setError(null);
    } else {
      setResult(null);
      setError(r.error.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-line bg-card px-4 py-4">
        <p className="mb-2.5 text-sm text-ink-soft">상대방 생년월일</p>
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label="상대 년"
            className={FIELD}
            value={String(other.year)}
            onChange={(e) => setOther((o) => ({ ...o, year: Number(e.target.value) }))}
          >
            {range(1900, thisYear).reverse().map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select
            aria-label="상대 월"
            className={FIELD}
            value={String(other.month)}
            onChange={(e) => setOther((o) => ({ ...o, month: Number(e.target.value) }))}
          >
            {range(1, 12).map((m) => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
          <select
            aria-label="상대 일"
            className={FIELD}
            value={String(other.day)}
            onChange={(e) => setOther((o) => ({ ...o, day: Number(e.target.value) }))}
          >
            {range(1, new Date(other.year, other.month, 0).getDate() || 31).map((d) => (
              <option key={d} value={d}>{d}일</option>
            ))}
          </select>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(['남', '여'] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={other.gender === g}
              onClick={() => setOther((o) => ({ ...o, gender: g }))}
              className={
                'rounded-md border px-3 py-2 text-sm transition-colors ' +
                (other.gender === g
                  ? 'border-jumuk bg-jumuk text-card'
                  : 'border-line bg-hanji text-ink-soft')
              }
            >
              {g}자
            </button>
          ))}
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
          궁합은 두 사람의 일간·일지만 보므로 태어난 시각이 필요 없습니다.
        </p>
        <button
          type="button"
          onClick={run}
          className="mt-3 w-full rounded-md bg-jumuk px-4 py-2.5 text-sm font-bold text-card"
        >
          궁합 보기
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-jumuk bg-card-warm px-3.5 py-3 text-sm text-jumuk-deep">
          {error}
        </div>
      )}

      {result && (
        <article className="rounded-lg border border-line bg-card px-4 py-4">
          <p className="text-xs text-ink-faint">일간 {result.pairLabel}</p>
          <h3 className="mt-1.5 text-base font-bold text-jumuk">{result.title}</h3>
          <p className="mt-2.5 text-sm leading-[1.85] text-ink">{result.body}</p>
          {result.branchNote && (
            <p className="mt-3 border-t border-dashed border-line-dash pt-3 text-xs leading-relaxed text-ink-soft">
              {result.branchNote}
            </p>
          )}
        </article>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line-dash px-4 py-6 text-center text-sm text-ink-faint">
      {children}
    </p>
  );
}
