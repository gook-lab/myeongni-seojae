/**
 * 명리서재 — 첫 화면
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 메뉴 앞에 한 장을 두는가
 *
 * 원래는 접속하자마자 메뉴였다. 그런데 첫 방문자가 보는 것이 **잠긴 버튼
 * 세 개**였다 — 오늘·궁합·신년은 사주를 봐야 열리니까. 무엇을 하는
 * 곳인지 모르는 사람에게 잠긴 문 셋을 먼저 보여준 셈이다.
 *
 * 여기서는 하나만 묻는다. 대신 이 앱이 **무엇을 하지 않는지**를 먼저
 * 말한다. 겁주지 않고, 점수 매기지 않고, 생년월일을 가져가지 않는다 —
 * 그게 이 프로젝트의 시작점이고, 지금까지 어느 화면에도 적혀 있지 않았다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 문턱을 만들지 않는다
 *
 * 성공 기준은 "부모님께 링크를 보내드렸을 때 도움 없이 결과 화면까지
 * 도달하신다" 이다. 한 장을 더 두면 탭이 하나 늘어난다. 그래서 두 길을
 * 열어둔다.
 *
 *   공유 링크로 열면    이 화면을 아예 거치지 않는다 (바로 결과)
 *   한 번 본 사람은     다음부터 메뉴로 바로 간다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 오늘의 일진은 진짜다
 *
 * 장식이 아니라 방금 계산한 값이다. 율리우스일 하나로 구하므로 절기표를
 * 받지 않아도 되고(core/day-cycle.ts), 그래서 첫 화면이 가벼운 채로
 * "이건 실제로 계산한다" 를 보여줄 수 있다.
 */
import { useState } from 'react';
import { todayInKorea } from '../core/day-cycle';
import { useSajuStore } from '../store/saju-store';

const PROMISES = [
  { head: '불안을 키우는 표현을 줄였습니다', body: '신살도 좋고 나쁨으로 단정하지 않고 양쪽 가능성을 함께 설명합니다' },
  { head: '점수 대신 해석 근거를 보여드립니다', body: '하나의 숫자로 평가하지 않고 계산에 사용한 기준을 함께 표시합니다' },
  { head: '생년월일은 이 기기에서만 사용합니다', body: '입력한 정보는 서버로 전송하지 않고 브라우저에서 계산합니다' },
];

export function Intro() {
  const enter = useSajuStore((s) => s.enterFromIntro);
  const go = useSajuStore((s) => s.go);
  const today = todayInKorea();
  // 도장을 누르면 다시 찍힌다. 필요해서가 아니라, 눌러보고 싶어지라고.
  const [stamp, setStamp] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col px-5 pb-16 pt-14">
      <header className="text-center">
        <p className="card-enter text-xs tracking-[0.35em] text-ink-faint" style={{ '--i': 0 } as never}>
          명 리 서 재
        </p>

        {/* 오늘의 일진 — 낙관처럼 찍힌다 */}
        <button
          type="button"
          onClick={() => setStamp((n) => n + 1)}
          aria-label={`오늘은 ${today.korean}일입니다. 눌러서 다시 찍기`}
          className="card-enter mx-auto mt-7 grid size-20 place-items-center rounded-md border-2 border-jumuk text-jumuk"
          style={{ '--i': 1 } as never}
        >
          <span key={stamp} className="seal-press text-2xl leading-none tracking-tight">
            {today.hanja}
          </span>
        </button>
        <p className="card-enter mt-3 text-sm text-ink-soft" style={{ '--i': 2 } as never}>
          오늘의 일진은 <b className="text-jumuk">{today.korean}</b>입니다
        </p>
      </header>

      <div aria-hidden className="brush-rule mx-auto my-9 h-px w-24 bg-line-dash" />

      <ul className="space-y-5">
        {PROMISES.map((p, i) => (
          <li key={p.head} className="card-enter text-center" style={{ '--i': 3 + i } as never}>
            <p className="text-base text-ink">{p.head}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-faint">{p.body}</p>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={enter}
        className="card-enter mt-12 w-full rounded-lg bg-jumuk px-5 py-4 text-base font-bold text-card"
        style={{ '--i': 6 } as never}
      >
        시작하기
      </button>

      <p className="card-enter mt-4 text-center text-[11px] leading-relaxed text-ink-faint" style={{ '--i': 7 } as never}>
        과거 한국 표준시와 서머타임 변경 이력을 반영해
        <br />
        출생 당시의 시각을 계산합니다.
        <br />
        <button
          type="button"
          onClick={() => go('privacy')}
          className="mt-2 underline underline-offset-2"
        >
          개인정보 처리 및 삭제 안내
        </button>
      </p>
    </div>
  );
}
