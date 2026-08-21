/**
 * 용어 화면
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 만들었나
 *
 * 이 앱은 편관·정인·장생·공망을 설명 없이 쓴다. 사주를 아는 사람에게는
 * 당연한 말이지만 관객은 부모님 세대다. 모르는 말은 물어볼 데가 없어서
 * 그냥 넘기게 되고, 그러면 화면에 적힌 것의 절반이 그림이 된다.
 *
 * 십성 설명은 원래부터 만들어져 있었는데 어느 화면에서도 쓰이지 않고
 * 있었다 — 계산해놓고 안 쓰던 것이 또 있었다.
 *
 * 한자 풀이로 시작하지 않는다. 그 말이 **화면 어디에 나오는지**부터 적는다.
 */
import { GLOSSARY, GLOSSARY_NOTE } from '../text/glossary';
import { useSajuStore } from '../store/saju-store';

export function Glossary() {
  const go = useSajuStore((s) => s.go);
  const back = useSajuStore((s) => s.returnTo);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-16 pt-6">
      <button
        type="button"
        onClick={() => go(back)}
        className="mb-8 rounded-md border border-line bg-card px-3.5 py-2 text-sm text-ink-soft"
      >
        ‹ 돌아가기
      </button>

      <header className="mb-8">
        <h1 className="text-xl font-bold text-ink">모르는 말이 나오면</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          화면에 나오는 말을 여기 모아뒀습니다.
          <br />
          어디에서 만나는 말인지도 함께 적었습니다.
        </p>
      </header>

      <div className="space-y-10">
        {GLOSSARY.map((section) => (
          <section key={section.title}>
            <h2 className="text-base font-bold text-jumuk">{section.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">{section.lede}</p>
            <dl className="mt-4 space-y-4">
              {section.entries.map((e) => (
                <div key={e.term} className="border-t border-dashed border-line-dash pt-3">
                  <dt className="flex items-baseline justify-between gap-3">
                    <span className="text-base font-bold text-ink">{e.term}</span>
                    <span className="shrink-0 text-[11px] text-ink-faint">{e.where}</span>
                  </dt>
                  <dd className="mt-1 text-sm leading-[1.85] text-ink-soft">{e.body}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <p className="mt-10 text-center text-xs leading-relaxed text-ink-faint">{GLOSSARY_NOTE}</p>
    </div>
  );
}
