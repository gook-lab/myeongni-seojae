/**
 * 명리서재 — 부가 화면 (오늘 · 궁합 · 신년)
 *
 * 원안 와이어플로우의 "부가 흐름"이다. 홈에서 각각 진입하는 별도 화면이지,
 * 결과 페이지 하단에 쌓인 탭이 아니다.
 *
 * 한 번 탭으로 쌓아봤다가 결과 화면이 3.8화면 길이가 됐고 대운 타임라인이
 * 주인공 자리를 잃었다. 원안 구조로 되돌리니 기능을 하나도 잃지 않으면서
 * 타임라인 화면이 깨끗해졌다.
 *
 * 점수 배지가 없다. 원본은 세 곳 모두 Math.sin 난수로 숫자를 만들었다.
 * 숫자 대신 "왜 그런가"를 보여준다 — 오늘의 일진이 무엇이고 내 일간과
 * 어떤 관계인지. 근거를 보여주는 쪽이 숫자보다 오래 남는다.
 */

import { useState } from 'react';
// 값 import 는 금지. engine 을 정적으로 끌어오면 lunar-javascript 가
// 진입 청크에 딸려와 코드 분할이 무너진다 (test/bundle.test.ts 가 지킨다).
import type { GunghapReading } from '../engine';
import { computeGunghapWithLoad } from '../engine/load';
import { useSajuStore } from '../store/saju-store';
import type { RawFormValues } from '../core/types';

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

const FIELD =
  'w-full rounded-md border border-line bg-card px-2.5 py-2 text-sm text-ink font-batang appearance-none';

/** 부가 화면 공통 껍데기 — 제목과 뒤로 가기 */
function Screen({ title, subtitle, children }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const go = useSajuStore((s) => s.go);
  return (
    <section aria-label={title} className="mx-auto w-full max-w-md px-5 pb-16 pt-8">
      <button
        type="button"
        onClick={() => go('home')}
        className="mb-5 text-sm text-ink-soft"
      >
        ‹ 홈
      </button>
      <header className="mb-5">
        <h1 className="text-xl font-bold text-ink">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

export function DailyScreen() {
  return (
    <Screen title="오늘의 운세" subtitle="오늘의 일진이 내 일간에게 어떻게 작용하는지 봅니다.">
      <DailyPanel />
    </Screen>
  );
}

export function YearScreen() {
  const year = useSajuStore((s) => s.reading?.year);
  return (
    <Screen
      title={`${year?.year ?? ''}년 운세`}
      subtitle="세운과 절기 기준 열두 달의 흐름입니다."
    >
      <YearPanel />
    </Screen>
  );
}

export function GunghapScreen() {
  return (
    <Screen title="궁합" subtitle="두 사람의 일간 오행 관계와 일지 합·충을 봅니다.">
      <GunghapPanel />
    </Screen>
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

  const [busy, setBusy] = useState(false);

  const run = async () => {
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
    setBusy(true);
    const r = await computeGunghapWithLoad(myForm, partner);
    setBusy(false);
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
          onClick={() => void run()}
          disabled={busy}
          className="mt-3 w-full rounded-md bg-jumuk px-4 py-2.5 text-sm font-bold text-card disabled:opacity-60"
        >
          {busy ? '보는 중…' : '궁합 보기'}
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
