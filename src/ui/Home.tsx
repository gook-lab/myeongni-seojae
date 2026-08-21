/**
 * 명리서재 — 홈
 *
 * 원안 와이어플로우의 첫 화면이다.
 *   명리서재  [사주 보기] [오늘] [궁합] [신년]
 *
 * 사주 보기가 주인공이라 크게 놓고, 나머지 셋은 아래에 작게 둔다.
 * 부가 기능을 결과 페이지 하단에 쌓지 않고 여기서 갈라놓으면
 * 대운 타임라인 화면이 깨끗하게 유지된다.
 *
 * 원국이 없는 상태에서 부가 화면으로 가려 하면 store 의 go() 가
 * 입력 화면으로 돌린다. 여기서는 그 사실을 문구로 미리 알려준다.
 */

import { useSajuStore } from '../store/saju-store';
import type { Route } from '../store/saju-store';

interface Entry {
  route: Route;
  label: string;
  note: string;
}

const SUB_ENTRIES: Entry[] = [
  { route: 'daily', label: '오늘', note: '오늘의 일진과 그 결' },
  { route: 'gunghap', label: '궁합', note: '두 사람의 일간 관계' },
  { route: 'year', label: '신년', note: '올해 세운과 열두 달' },
];

export function Home() {
  const go = useSajuStore((s) => s.go);
  const hasReading = useSajuStore((s) => s.reading !== null);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-16 pt-16">
      <header className="mb-10 text-center">
        <p className="mb-2.5 text-xs tracking-[0.3em] text-ink-faint">명 리 서 재</p>
        <h1 className="text-2xl font-bold text-ink">인생을 10년 단위로</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          정확한 만세력으로 계산한 대운 타임라인.
          <br />
          지나온 시기가 맞는지 직접 맞춰보세요.
        </p>
      </header>

      {/* 주인공 */}
      <button
        type="button"
        onClick={() => go('saju')}
        className="w-full rounded-lg bg-jumuk px-5 py-5 text-left text-card"
      >
        <span className="block text-lg font-bold">
          {hasReading ? '내 사주 다시 보기' : '사주 보기'}
        </span>
        <span className="mt-1 block text-sm opacity-90">
          {hasReading ? '방금 본 명식으로 바로 들어갑니다' : '생년월일을 넣으면 인생 전체가 펼쳐집니다'}
        </span>
      </button>

      {/* 부가 흐름 */}
      <p className="mb-2.5 mt-8 px-1 text-xs text-ink-faint">
        {hasReading ? '내 명식으로 이어서 봅니다' : '사주를 먼저 본 뒤에 열립니다'}
      </p>
      <div className="space-y-2">
        {SUB_ENTRIES.map(({ route, label, note }) => (
          <button
            key={route}
            type="button"
            onClick={() => go(route)}
            className={
              'flex w-full items-center justify-between rounded-lg border px-4 py-3.5 text-left transition-colors ' +
              (hasReading
                ? 'border-line bg-card'
                : 'border-dashed border-line-dash bg-transparent')
            }
          >
            <span>
              <span className="block text-base text-ink">{label}</span>
              <span className="mt-0.5 block text-xs text-ink-faint">{note}</span>
            </span>
            <span aria-hidden className="text-ink-faint">
              {hasReading ? '›' : '잠김'}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-10 text-center text-xs leading-relaxed text-ink-faint">
        입력한 생년월일은 이 기기를 벗어나지 않습니다.
        <br />
        계산은 전부 브라우저 안에서 이루어집니다.
      </p>
    </div>
  );
}
