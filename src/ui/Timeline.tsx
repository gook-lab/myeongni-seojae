/**
 * 명리서재 — 대운 인생 타임라인  ★주인공 화면★
 *
 * 결과 화면의 첫 번째가 사주팔자표가 아니라 이 화면이다. 정보구조를
 * 뒤집은 것이고, 그게 이 프로젝트가 다른 사주 앱과 갈리는 지점이다.
 *
 * 세로 스크롤로 인생이 흐른다. 왼쪽에 세로선을 긋고 각 10년을 칸으로
 * 얹는다. 지나온 시기는 흐리게, 지금은 주묵으로, 앞으로는 점선으로.
 * 사람들은 지나온 칸부터 열어 자기 기억과 맞춰본다 — 그게 이 화면의
 * 사용법이고, "이미 지나온 10년입니다. 그때가 어땠는지 맞춰보세요"
 * 라는 문구가 그걸 대놓고 권한다.
 */

import type { DaeunCard } from '../engine';
import { useSajuStore } from '../store/saju-store';

interface Props {
  cards: DaeunCard[];
  startAge: number;
  direction: 'forward' | 'backward';
  monthsToNextTransition: number | null;
  hourUnknown: boolean;
}

export function Timeline({
  cards,
  startAge,
  direction,
  monthsToNextTransition,
  hourUnknown,
}: Props) {
  const openCard = useSajuStore((s) => s.openCard);
  const toggleCard = useSajuStore((s) => s.toggleCard);
  const currentYear = new Date().getFullYear();

  return (
    <section aria-label="대운 인생 타임라인" className="mx-auto w-full max-w-md px-5">
      <header className="mb-6">
        <h2 className="text-xl font-bold text-ink">인생 타임라인</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          {startAge}세부터 10년 단위로 {direction === 'forward' ? '순행' : '역행'}합니다.
          {monthsToNextTransition !== null && monthsToNextTransition <= 24 && (
            <>
              {' '}
              <strong className="text-jumuk">
                {monthsToNextTransition}개월 뒤 판이 바뀝니다.
              </strong>
            </>
          )}
        </p>
        {hourUnknown && (
          <p className="mt-2.5 rounded-md border border-dashed border-line-dash px-3 py-2 text-xs leading-relaxed text-ink-faint">
            태어난 시각 없이 계산했습니다. 이 타임라인은 시각과 무관하므로
            <strong className="text-ink-soft"> 그대로 정확합니다.</strong>
          </p>
        )}
      </header>

      <ol className="relative border-l border-line pl-0">
        {cards.map((card) => {
          const isOpen = openCard === card.index;
          const isPast = card.endYear < currentYear;
          return (
            <li key={card.index} className="relative pb-3 pl-6">
              {/* 세로선 위의 점 */}
              <span
                aria-hidden
                className={
                  'absolute -left-[5px] top-5 size-2.5 rounded-full border-2 ' +
                  (card.isCurrent
                    ? 'border-jumuk bg-jumuk'
                    : isPast
                      ? 'border-line-dash bg-line-dash'
                      : 'border-line bg-hanji')
                }
              />

              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleCard(card.index)}
                className={
                  'w-full rounded-lg border px-4 py-3.5 text-left transition-colors ' +
                  (card.isCurrent
                    ? 'border-jumuk bg-card-warm'
                    : 'border-line bg-card ' +
                      (isPast ? 'opacity-80' : ''))
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-baseline gap-2">
                    <span className="text-lg font-bold tabular-nums text-ink">
                      {card.startAge}
                      <span className="text-sm font-normal text-ink-faint">
                        ~{card.endAge}세
                      </span>
                    </span>
                    {card.isCurrent && (
                      <span className="rounded-sm bg-jumuk px-1.5 py-0.5 text-[10px] font-bold text-card">
                        지금
                      </span>
                    )}
                  </span>

                  {/* 간지 — 오행 색으로 */}
                  <span className="flex items-center gap-0.5 text-xl leading-none">
                    <span style={{ color: card.stemColor }}>{card.ganji[0]}</span>
                    <span style={{ color: card.branchColor }}>{card.ganji[1]}</span>
                  </span>
                </div>

                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink-soft">
                    {card.tenGod}
                    <span className="text-ink-faint"> · {card.category}</span>
                  </span>
                  <span className="text-xs tabular-nums text-ink-faint">
                    {card.startYear}~{card.endYear}
                  </span>
                </div>

                {isOpen && (
                  <div className="mt-3.5 border-t border-dashed border-line-dash pt-3.5">
                    <p className="mb-2 text-xs text-jumuk">{card.prefix}</p>
                    <p className="text-sm leading-[1.85] text-ink">{card.text}</p>
                    <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                      {card.theme}
                    </p>
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-faint">
        각 칸을 눌러 펼쳐보세요.
        <br />
        지나온 10년이 맞는지부터 확인하시면 나머지가 읽힙니다.
      </p>
    </section>
  );
}
