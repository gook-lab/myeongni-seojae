/**
 * 결과 링크 공유
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기서 정직할 것
 *
 * 서버가 없으므로 링크에 입력이 들어 있어야 복원된다. 그러니 링크를 받은
 * 사람은 생년월일시를 볼 수 있다. 이걸 숨기면 안 된다. 버튼 밑에 그대로
 * 적는다 — 이 앱은 "근거를 같이 낸다" 를 계속 지켜왔고, 프라이버시에서도
 * 똑같이 한다.
 *
 * 토큰이 불투명한 이유는 비밀로 하려는 게 아니라 **지나가다 읽히지 않게**
 * 하려는 것이다. 자세한 건 core/share-link.ts 에 적어뒀다.
 */
import { useSajuStore } from '../store/saju-store';

export function ShareLink() {
  const copy = useSajuStore((s) => s.copyShareLink);
  const state = useSajuStore((s) => s.shareState);

  const label =
    state === 'copied' ? '링크를 복사했습니다'
    : state === 'failed' ? '주소창에 올렸습니다 — 직접 복사해 주세요'
    : '결과 링크 복사';

  return (
    <div className="mx-auto max-w-md px-5 pb-14">
      <button
        type="button"
        onClick={() => void copy()}
        aria-live="polite"
        className="w-full rounded-md border border-line bg-hanji px-4 py-3 text-sm text-ink-soft"
      >
        {label}
      </button>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-faint">
        링크에 생년월일이 글자로 보이지는 않지만,
        <br />
        <b className="text-ink-soft">링크를 받으신 분은 이 사주를 그대로 보실 수 있습니다.</b>
        <br />
        적어두신 인생 기록은 링크에 담기지 않습니다.
      </p>
    </div>
  );
}
