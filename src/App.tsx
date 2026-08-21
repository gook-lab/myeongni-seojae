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

import { ErrorBoundary } from './ui/ErrorBoundary';
import { InputForm } from './ui/InputForm';
import { Timeline } from './ui/Timeline';
import { Tabs } from './ui/Tabs';
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
      <Topics />
      <Tabs />
      <div className="mx-auto max-w-md px-5 pb-16">
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-md border border-line bg-card px-4 py-3 text-ink-soft"
        >
          다른 사람 사주 보기
        </button>
      </div>
    </>
  );
}

export function App() {
  const phase = useSajuStore((s) => s.phase);

  return (
    <ErrorBoundary>
      <TzWarning />
      <div className="flex justify-end px-5 pt-4">
        <TextScaleToggle />
      </div>
      {phase === 'ready' ? <Result /> : <InputForm />}
    </ErrorBoundary>
  );
}
