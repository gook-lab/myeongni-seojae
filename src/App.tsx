/**
 * 명리서재 — 앱 셸
 *
 * 정보구조를 뒤집었다. 결과 화면의 첫 번째가 사주팔자표가 아니라
 * 대운 인생 타임라인이다. 사주팔자표·성격·재물은 그 아래로 내려간다.
 *
 * 부가 기능(오늘의 운세·궁합·신년운세)에는 점수 배지가 없다.
 * 명리에는 정설화된 점수법이 없어서 예전 구현은 Math.sin 난수로
 * 숫자를 만들고 있었다. 타임라인이 정확한데 옆에서 가짜 숫자가 뜨면
 * 전체 신뢰가 무너진다. 숫자를 버리고 문장만 남겼다.
 */

import { Suspense, lazy, useState } from 'react';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { Home } from './ui/Home';
import { InputForm } from './ui/InputForm';
import { Calculating } from './ui/Calculating';
import { Intro } from './ui/Intro';
import { Privacy } from './ui/Privacy';
import { ShareLink } from './ui/ShareLink';
import { Timeline } from './ui/Timeline';
import { TzWarning } from './ui/TzWarning';
import { useSajuStore, type TextScale } from './store/saju-store';

const SCALES: Array<{ key: TextScale; label: string }> = [
  { key: 'normal', label: '가' },
  { key: 'large', label: '가' },
  { key: 'xlarge', label: '가' },
];

function TextScaleToggle() {
  const scale = useSajuStore((s) => s.textScale);
  const setTextScale = useSajuStore((s) => s.setTextScale);
  return (
    <div className="flex items-center gap-1" role="group" aria-label="글씨 크기">
      {SCALES.map(({ key, label }, i) => (
        <button
          key={key}
          type="button"
          aria-pressed={scale === key}
          aria-label={['보통', '크게', '아주 크게'][i]}
          onClick={() => setTextScale(key)}
          className={
            'flex size-9 items-center justify-center rounded-md border transition-colors ' +
            (scale === key
              ? 'border-jumuk bg-jumuk text-card'
              : 'border-line bg-card text-ink-soft')
          }
          style={{ fontSize: `${0.75 + i * 0.2}rem` }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PillarTable() {
  const reading = useSajuStore((s) => s.reading);
  if (!reading) return null;
  const { chart } = reading;
  const cols = [
    { title: '시주', p: chart.pillars.hour },
    { title: '일주', p: chart.pillars.day },
    { title: '월주', p: chart.pillars.month },
    { title: '년주', p: chart.pillars.year },
  ];
  return (
    <section aria-label="사주팔자" className="mx-auto w-full max-w-md px-5 pt-12">
      <h2 className="mb-3.5 text-lg font-bold text-ink">사주팔자</h2>
      <div className="grid grid-cols-4 gap-2">
        {cols.map(({ title, p }, i) => (
          <div
            key={title}
            className={
              'rounded-lg border px-2 py-3 text-center ' +
              (i === 1
                ? 'border-2 border-jumuk bg-card-warm'
                : p
                  ? 'border-line bg-card'
                  : 'border-dashed border-line-dash')
            }
          >
            <p className="mb-2 text-[11px] text-ink-faint">{title}</p>
            {p ? (
              <>
                <p className="text-2xl leading-tight">{p.stemHanja}</p>
                <p className="text-2xl leading-tight">{p.branchHanja}</p>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  {p.stem}{p.branch}
                </p>
              </>
            ) : (
              <p className="py-4 text-xs text-ink-faint">시각<br />미상</p>
            )}
          </div>
        ))}
      </div>
      {chart.hourUnknown && (
        <p className="mt-2.5 text-xs leading-relaxed text-ink-faint">
          시각을 모르므로 오행 분포는 여섯 글자 기준입니다. 시각을 알면 더 정확해집니다.
        </p>
      )}
    </section>
  );
}

/**
 * 신강·신약과 용신 (억부용신법).
 *
 * 판정만 던지지 않는다. "당신은 신강입니다"는 아무 도움이 안 되고,
 * "월지가 인성이라 +3, 일지가 관성이라 −2" 는 사용자가 따져볼 수 있다.
 * 그래서 자리별 근거를 전부 펼친다.
 *
 * 그리고 어떤 방법을 썼는지 반드시 밝힌다. 다른 방법을 쓰면 다른 답이
 * 나오는데 정답인 척하는 것이 이 앱에서 가장 하면 안 되는 일이다.
 */
function Yongsin() {
  const reading = useSajuStore((s) => s.reading);
  if (!reading) return null;
  const y = reading.yongsin;
  const pct = Math.round(y.score * 100);

  return (
    <section aria-label="신강 신약과 용신" className="mx-auto w-full max-w-md px-5 pt-12">
      <h2 className="mb-1.5 text-lg font-bold text-ink">일간의 힘과 용신</h2>
      <p className="mb-3.5 text-xs leading-relaxed text-ink-faint">{y.methodNote}</p>

      {/* 판정 + 저울 */}
      <article className="rounded-lg border border-jumuk bg-card-warm px-4 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-bold text-jumuk">{y.verdict}</span>
          <span className="text-xs tabular-nums text-ink-faint">돕는 비율 {pct}%</span>
        </div>

        {/* 돕는 쪽 vs 빼는 쪽 저울 */}
        <div
          aria-hidden
          className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-line-soft"
        >
          <div className="h-full bg-jumuk" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
          <span>돕는 기운</span>
          <span>빼는 기운</span>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-faint">{y.lead}</p>
        <p className="mt-2.5 text-sm leading-[1.85] text-ink">{y.verdictText}</p>
      </article>

      {/* 득령 · 득지 · 득세 */}
      <div className="mt-2.5 space-y-2">
        {y.factors.map((f) => (
          <div
            key={f.label}
            className="flex gap-3 rounded-lg border border-line bg-card px-4 py-3"
          >
            <span
              className={
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ' +
                (f.ok ? 'bg-jumuk text-card' : 'border border-line-dash text-ink-faint')
              }
            >
              {f.ok ? 'O' : 'X'}
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">{f.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{f.text}</span>
            </span>
          </div>
        ))}
      </div>

      {/* 자리별 근거 — 판정만 던지지 않는다 */}
      <details className="mt-2.5 rounded-lg border border-dashed border-line-dash px-4 py-3">
        <summary className="cursor-pointer text-sm text-ink-soft">
          자리별로 어떻게 셌는지 보기
        </summary>
        <ul className="mt-3 space-y-1.5">
          {y.slots.map((sl) => (
            <li key={sl.slot} className="flex items-center gap-2.5 text-xs">
              <span className="w-8 shrink-0 text-ink-faint">{sl.slot}</span>
              <span className="w-5 shrink-0 text-base text-ink">{sl.glyph}</span>
              <span className="w-12 shrink-0 text-ink-soft">{sl.tenGod}</span>
              <span className="flex-1 text-ink-faint">{sl.category}</span>
              <span
                className={
                  'w-8 shrink-0 text-right tabular-nums ' +
                  (sl.supports ? 'text-jumuk' : 'text-ink-faint')
                }
              >
                {sl.signed > 0 ? `+${sl.signed}` : sl.signed}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
          월지가 가장 무겁습니다(3). 태어난 계절의 기운이라 셋 중 비중이 가장 큽니다.
          일지 2, 년지·시지 1.5, 천간 1.
        </p>
      </details>

      {/* 용신 */}
      <article className="mt-2.5 rounded-lg border border-line bg-card px-4 py-4">
        <p className="text-xs text-jumuk">용신 — 가장 필요한 기운</p>
        <p className="mt-1.5 flex items-baseline gap-2">
          <span className="text-xl font-bold text-ink">{y.primary}</span>
          <span className="text-sm text-ink-soft">{y.primaryElement}</span>
        </p>
        <p className="mt-2.5 text-sm leading-[1.85] text-ink">{y.advice}</p>
        <p className="mt-3 border-t border-dashed border-line-dash pt-3 text-xs text-ink-soft">
          도움 {y.helpful.join(' · ')}
          {y.avoid.length > 0 && <> · 피할 {y.avoid.join(' · ')}</>}
        </p>
        <p className="mt-2 text-xs text-ink-faint">
          색 {y.practical.color} · 방위 {y.practical.direction}
        </p>
      </article>
    </section>
  );
}

/**
 * 신살 — 겁주지 않고 기운의 결로 읽는다.
 *
 * 신살은 이름에 살(殺) 이 붙어 오래 겁주는 데 쓰여 왔다. 도화살은 바람기,
 * 역마살은 떠돌이 팔자 하는 식이다. 여기서는 좋고 나쁨으로 나누지 않고,
 * 그 기운이 잘 쓰일 때와 걸림돌이 될 때를 같이 적는다.
 *
 * 그리고 근거를 붙인다. "도화살이 있습니다" 만으로는 확인할 방법이 없지만
 * "년지 酉 기준 → 월지 午" 는 다른 곳과 대조할 수 있다.
 */
function Sinsal() {
  const reading = useSajuStore((s) => s.reading);
  const [open, setOpen] = useState<string | null>(null);
  if (!reading) return null;
  const s = reading.sinsal;

  return (
    <section aria-label="신살" className="mx-auto w-full max-w-md px-5 pt-12">
      <h2 className="mb-1.5 text-lg font-bold text-ink">신살</h2>
      <p className="mb-3.5 text-xs leading-relaxed text-ink-faint">{s.intro}</p>

      {s.emptyText ? (
        <p className="rounded-lg border border-dashed border-line-dash px-4 py-4 text-sm leading-[1.85] text-ink-soft">
          {s.emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {s.items.map((it) => {
            const isOpen = open === it.name;
            return (
              <div key={it.name}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : it.name)}
                  className={
                    'w-full border px-4 py-3 text-left transition-colors ' +
                    (isOpen ? 'rounded-t-lg border-b-0 ' : 'rounded-lg ') +
                    'border-line bg-card'
                  }
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span>
                      <span className="text-sm font-bold text-ink">{it.name}</span>
                      <span className="ml-1.5 text-[11px] text-ink-faint">{it.hanja}</span>
                    </span>
                    <span className="shrink-0 text-xs text-jumuk">
                      {[...new Set(it.palaces)].join(' · ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{it.short}</p>
                </button>

                {isOpen && (
                  <div className="mt-[-1px] rounded-b-lg border border-t-0 border-line bg-card px-4 pb-3.5 pt-3.5">
                    <p className="text-sm leading-[1.85] text-ink">{it.body}</p>
                    {/* 근거 — 다른 곳과 대조할 수 있게 */}
                    <p className="mt-3 border-t border-dashed border-line-dash pt-2.5 text-[11px] leading-relaxed text-ink-faint">
                      판정 근거 · {it.bases.join(' / ')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-2.5 px-1 text-[11px] leading-relaxed text-ink-faint">{s.methodNote}</p>
    </section>
  );
}

/**
 * 궁위 — 십성이 인생의 어느 자리에 있는가.
 * 원본은 십성 카운트 하나로 뭉갰다. 같은 관성도 년주면 집안의 규율이고
 * 시주면 자식·말년의 책임이다.
 */
function Palaces() {
  const reading = useSajuStore((s) => s.reading);
  if (!reading) return null;
  return (
    <section aria-label="궁위" className="mx-auto w-full max-w-md px-5 pt-12">
      <h2 className="mb-1.5 text-lg font-bold text-ink">인생의 네 자리</h2>
      <p className="mb-3.5 text-xs leading-relaxed text-ink-faint">
        사주 네 기둥은 각각 인생의 한 시기를 맡습니다. 같은 기운도 어느 자리에
        있느냐에 따라 뜻이 달라집니다.
      </p>
      <div className="space-y-2.5">
        {reading.palaces.map((p) => (
          <article
            key={p.palace}
            className={
              'rounded-lg border px-4 py-3.5 ' +
              (p.isVoid ? 'border-dashed border-line-dash bg-transparent' : 'border-line bg-card')
            }
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-ink">
                {p.palace}
                <span className="ml-2 text-xs font-normal text-ink-faint">{p.span}</span>
              </span>
              <span className="text-lg text-ink">{p.ganji}</span>
            </div>
            <p className="mt-1 text-xs text-ink-faint">
              {p.domain} · {p.stemTenGod} · {p.stage}
              {p.isVoid && <span className="ml-1.5 text-jumuk">· 공망</span>}
            </p>
            <p className="mt-2.5 text-sm leading-[1.85] text-ink">{p.text}</p>
            {p.hidden.length > 0 && (
              <p className="mt-2 text-xs text-ink-faint">
                지장간 {p.hidden.join(' · ')}
              </p>
            )}
            {p.voidText && (
              <p className="mt-2 text-xs leading-relaxed text-jumuk">{p.voidText}</p>
            )}
          </article>
        ))}
      </div>
      <p className="mt-2.5 px-1 text-xs leading-relaxed text-ink-faint">
        {reading.balance.hiddenIntro}
      </p>
    </section>
  );
}

/** 오행 균형 — 없는 것과 넘치는 것 */
function Balance() {
  const reading = useSajuStore((s) => s.reading);
  if (!reading) return null;
  const b = reading.balance;
  const max = Math.max(1, ...Object.values(b.counts));
  const COLORS: Record<string, string> = {
    목: '#3E6B4F', 화: '#A63A2B', 토: '#8C6B2F', 금: '#75787E', 수: '#35506B',
  };
  return (
    <section aria-label="오행 균형" className="mx-auto w-full max-w-md px-5 pt-12">
      <h2 className="mb-1.5 text-lg font-bold text-ink">오행 균형</h2>
      <p className="mb-3.5 text-xs leading-relaxed text-ink-faint">{b.lead}</p>

      <div className="space-y-2 rounded-lg border border-line bg-card px-4 py-4">
        {(['목', '화', '토', '금', '수'] as const).map((e) => (
          <div key={e} className="flex items-center gap-2.5">
            <span className="w-5 shrink-0 text-sm" style={{ color: COLORS[e] }}>{e}</span>
            <span className="w-4 shrink-0 text-xs tabular-nums text-ink-faint">
              {b.counts[e]}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-line-soft">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(((b.counts[e] ?? 0) / max) * 100)}%`,
                  backgroundColor: COLORS[e],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {b.missing && (
        <div className="mt-2.5 rounded-lg border border-jumuk bg-card-warm px-4 py-3.5">
          <p className="mb-1.5 text-sm font-bold text-jumuk">{b.missing.lead}</p>
          {b.missing.notes.map((n) => (
            <p key={n} className="text-sm leading-[1.85] text-ink">{n}</p>
          ))}
        </div>
      )}

      {b.excessive.map((t) => (
        <p key={t} className="mt-2.5 rounded-lg border border-line bg-card px-4 py-3.5 text-sm leading-[1.85] text-ink">
          {t}
        </p>
      ))}
    </section>
  );
}

function Topics() {
  const reading = useSajuStore((s) => s.reading);
  if (!reading) return null;
  const { topics, dayMasterText, chart } = reading;
  const items = [
    { label: `일간 ${chart.dayMaster.stemHanja}${chart.dayMaster.stem}`, text: dayMasterText },
    { label: '성격', text: topics.personality },
    { label: '재물', text: topics.money },
    { label: '애정', text: topics.love },
    { label: '직업', text: topics.career },
  ];
  return (
    <section aria-label="풀이" className="mx-auto w-full max-w-md px-5 pb-20 pt-12">
      <h2 className="mb-3.5 text-lg font-bold text-ink">풀이</h2>
      <div className="space-y-2.5">
        {items.map(({ label, text }) => (
          <article
            key={label}
            className="rounded-lg border border-line bg-card px-4 py-3.5"
          >
            <h3 className="mb-1.5 text-sm font-bold text-jumuk">{label}</h3>
            <p className="text-sm leading-[1.85] text-ink">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Result() {
  const reading = useSajuStore((s) => s.reading);
  const reset = useSajuStore((s) => s.reset);
  const go = useSajuStore((s) => s.go);
  if (!reading) return null;
  const { timeline, cards, hourUnknown } = reading;
  const displayName = reading.chart.input.name?.trim();

  return (
    <>
      <div className="pt-8">
        <Timeline
          cards={cards}
          {...(displayName ? { name: displayName } : {})}
          startAge={timeline.startAge}
          direction={timeline.direction}
          monthsToNextTransition={timeline.monthsToNextTransition}
          hourUnknown={hourUnknown}
        />
      </div>
      <PillarTable />
      <div className="mx-auto max-w-md space-y-2 px-5 pb-16 pt-10">
        <button
          type="button"
          onClick={() => go('detail')}
          className="w-full rounded-md bg-jumuk px-4 py-3.5 font-bold text-card"
        >
          상세 풀이 보기
        </button>
        <button
          type="button"
          onClick={() => go('report')}
          className="w-full rounded-md border border-jumuk bg-card px-4 py-3 text-jumuk"
        >
          리포트 · 인쇄하기
        </button>
        <button
          type="button"
          onClick={() => go('home')}
          className="w-full rounded-md border border-line bg-card px-4 py-3 text-ink-soft"
        >
          홈으로 — 오늘 · 궁합 · 신년 보기
        </button>
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-md border border-dashed border-line-dash px-4 py-3 text-ink-faint"
        >
          다른 사람 사주 보기
        </button>
      </div>
      <ShareLink />
    </>
  );
}

/**
 * 상세 풀이 — 원안 와이어플로우의 별도 화면이다.
 *   사주팔자 결과 → [상세 풀이 보기] → 상세 풀이
 *
 * 궁위·오행 균형·풀이를 결과 화면에 쌓았더니 5.2화면이 됐다.
 * 원안대로 갈라놓으면 타임라인 화면이 짧게 유지된다.
 */
function DetailScreen() {
  const go = useSajuStore((s) => s.go);
  return (
    <div className="pt-8">
      <div className="mx-auto max-w-md px-5">
        <button type="button" onClick={() => go('saju')} className="text-sm text-ink-soft">
          ‹ 타임라인
        </button>
      </div>
      <Yongsin />
      <Sinsal />
      <Palaces />
      <Balance />
      <Topics />
      <div className="mx-auto max-w-md px-5 pb-16 pt-10">
        <button
          type="button"
          onClick={() => go('home')}
          className="w-full rounded-md border border-line bg-card px-4 py-3 text-ink-soft"
        >
          홈으로 — 오늘 · 궁합 · 신년 보기
        </button>
      </div>
    </div>
  );
}

/**
 * 홈·입력 이후에만 닿는 화면들은 나눠 받는다.
 *
 * 리포트와 오늘·궁합·신년은 사주를 한 번 뽑은 다음에야 열린다. 그때는
 * 이미 엔진 청크를 받느라 한 번 기다린 뒤이므로, 처음 화면을 여는 사람에게
 * 이 코드를 미리 들려 보낼 이유가 없다. 진입 청크 예산(250KB)은 이걸
 * 지키라고 있는 것이다.
 */
const Report = lazy(() => import('./ui/Report').then((m) => ({ default: m.Report })));
const DailyScreen = lazy(() => import('./ui/screens').then((m) => ({ default: m.DailyScreen })));
const GunghapScreen = lazy(() =>
  import('./ui/screens').then((m) => ({ default: m.GunghapScreen })),
);
const YearScreen = lazy(() => import('./ui/screens').then((m) => ({ default: m.YearScreen })));

/** 나눠 받는 동안 보이는 것. 화면이 깜빡이지 않게 자리만 잡아둔다. */
function ScreenFallback() {
  return (
    <div className="px-5 py-16 text-center text-sm text-ink-faint" role="status" aria-live="polite">
      <span className="ink-breathe">불러오는 중…</span>
    </div>
  );
}

export function App() {
  const route = useSajuStore((s) => s.route);
  const phase = useSajuStore((s) => s.phase);

  return (
    <ErrorBoundary>
      <TzWarning />
      {/*
        글씨 크기 조절은 인트로에서는 감춘다. 이 앱이 무엇인지도 모르는
        첫 화면에 설정 버튼이 먼저 보이면 그게 첫인상이 된다.
        들어오고 나면 어느 화면에서든 바꿀 수 있다.
      */}
      {route !== 'intro' && (
        <div className="flex justify-end px-5 pt-4">
          <TextScaleToggle />
        </div>
      )}
      {/*
        화면이 바뀔 때마다 key 가 갈려 등장 애니메이션이 다시 돈다.
        phase 까지 키에 넣는 이유는 입력 → 결과가 같은 route 안에서
        일어나기 때문이다. 그 순간이 이 앱에서 제일 중요한 전환이다.
      */}
      <div key={`${route}:${phase}`} className="screen-enter">
        {route === 'intro' && <Intro />}
        {route === 'home' && <Home />}
        {route === 'privacy' && <Privacy />}
        {route === 'saju' &&
          (phase === 'ready' ? <Result />
          : phase === 'loading' ? <Calculating />
          : <InputForm />)}
        {route === 'detail' && <DetailScreen />}
        <Suspense fallback={<ScreenFallback />}>
          {route === 'report' && <Report />}
          {route === 'daily' && <DailyScreen />}
          {route === 'gunghap' && <GunghapScreen />}
          {route === 'year' && <YearScreen />}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
