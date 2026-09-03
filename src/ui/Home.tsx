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
 * 오늘·궁합·신년은 내 명식이 있어야 계산할 수 있다. 첫 방문에는 세 버튼을
 * 비활성화하고, 무엇을 먼저 해야 하는지 바로 위에서 설명한다.
 */

import { useState } from 'react';
import { useSajuStore } from '../store/saju-store';
import type { Route } from '../store/saju-store';

interface Entry {
  route: Route;
  label: string;
  note: string;
}

const SUB_ENTRIES: Entry[] = [
  { route: 'daily', label: '오늘', note: '오늘의 일진과 내 사주의 관계' },
  { route: 'gunghap', label: '궁합', note: '두 사람의 일간 관계' },
  { route: 'year', label: '신년', note: '올해 세운과 열두 달' },
];

export function Home() {
  const go = useSajuStore((s) => s.go);
  const clearSavedReading = useSajuStore((s) => s.clearSavedReading);
  const hasReading = useSajuStore((s) => s.reading !== null);
  const [askingToClear, setAskingToClear] = useState(false);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-16 pt-16">
      <header className="mb-10 text-center">
        <p className="mb-2.5 text-xs tracking-[0.3em] text-ink-faint">명 리 서 재</p>
        <h1 className="text-2xl font-bold text-ink">대운으로 보는 인생의 흐름</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          생년월일을 바탕으로 10년 단위 대운을 계산합니다.
          <br />
          지나온 시기와 비교하며 흐름을 살펴보세요.
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
          {hasReading ? '최근에 계산한 명식으로 이동합니다' : '생년월일을 입력하고 대운 흐름을 확인합니다'}
        </span>
      </button>

      {/* 부가 흐름 */}
      <p className="mb-2.5 mt-8 px-1 text-xs text-ink-faint">
        {hasReading ? '최근에 계산한 명식을 기준으로 봅니다' : '사주를 먼저 보면 아래 메뉴가 열립니다'}
      </p>
      <div className="space-y-2">
        {SUB_ENTRIES.map(({ route, label, note }) => (
          <button
            key={route}
            type="button"
            onClick={() => go(route)}
            disabled={!hasReading}
            aria-label={hasReading ? label : `${label} — 사주를 먼저 봐야 열립니다`}
            className={
              'flex w-full items-center justify-between rounded-lg border px-4 py-3.5 text-left transition-colors ' +
              (hasReading
                ? 'border-line bg-card'
                : 'cursor-not-allowed border-dashed border-line-dash bg-transparent opacity-50')
            }
          >
            <span>
              <span className="block text-base text-ink">{label}</span>
              <span className="mt-0.5 block text-xs text-ink-faint">{note}</span>
            </span>
            <span
              aria-hidden
              className={hasReading ? 'text-ink-faint' : 'text-xs text-ink-faint'}
            >
              {hasReading ? '›' : '사주를 먼저 봐주세요'}
            </span>
          </button>
        ))}
      </div>

      {hasReading && (
        <div className="mt-6 border-t border-dashed border-line-dash pt-4">
          {askingToClear ? (
            <div className="rounded-md border border-jumuk bg-card-warm px-3.5 py-3">
              <p className="text-sm leading-relaxed text-jumuk">
                저장한 사주와 대운 기록을 지울까요? 되돌릴 수 없습니다.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={clearSavedReading}
                  className="flex-1 rounded-md bg-jumuk px-3 py-2.5 text-sm font-bold text-card"
                >
                  저장한 정보 지우기
                </button>
                <button
                  type="button"
                  onClick={() => setAskingToClear(false)}
                  className="flex-1 rounded-md border border-line bg-card px-3 py-2.5 text-sm text-ink-soft"
                >
                  그만두기
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAskingToClear(true)}
              className="w-full rounded-md border border-line bg-card px-4 py-2.5 text-sm text-ink-soft"
            >
              저장한 사주 지우기
            </button>
          )}
        </div>
      )}

      <p className="mt-10 text-center text-xs leading-relaxed text-ink-faint">
        적어주신 생년월일은 이 기기 밖으로 나가지 않습니다.
        <br />
        <button
          type="button"
          onClick={() => go('privacy')}
          className="mt-1 underline underline-offset-2"
        >
          개인정보 처리 및 삭제 안내
        </button>
      </p>
    </div>
  );
}
