/**
 * 개인정보 처리방침
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 따로 뺐나
 *
 * 같은 안내가 홈·입력·인트로 세 곳에 그대로 반복되고 있었다. 게다가
 * "계산은 전부 브라우저 안에서 이루어집니다" 처럼 만든 사람의 말이었다.
 * 읽는 분이 궁금한 건 그게 아니라 "내 생년월일이 어디로 가느냐" 다.
 *
 * 화면 안 문구는 한 줄로 줄이고, 자세한 것은 여기 모았다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 법률 문서처럼 쓰지 않는다
 *
 * 관객이 부모님 세대다. "제3자 제공" 같은 말을 쓰면 안 읽는다. 묻는
 * 순서대로, 짧은 문장으로 적는다. 다만 **불리한 것도 빼지 않는다** —
 * 공유 링크를 받은 사람이 사주를 볼 수 있다는 사실이 그렇다.
 */
import { useSajuStore } from '../store/saju-store';

interface Item {
  q: string;
  a: React.ReactNode;
}

const ITEMS: Item[] = [
  {
    q: '무엇을 적게 하나요',
    a: (
      <>
        생년월일과 태어난 시각, 성별, 태어난 지역입니다. 이름은 적지 않으셔도
        되고, 적으시면 공유 카드에만 쓰입니다.
      </>
    ),
  },
  {
    q: '어디로 보내나요',
    a: (
      <>
        <b className="text-jumuk">아무 데도 보내지 않습니다.</b> 이 사이트에는
        회원가입도, 서버에 쌓이는 기록도 없습니다. 사주 계산은 지금 보고 계신
        이 기기 안에서 끝납니다. 글꼴까지 이 사이트에서 직접 내드리기 때문에
        다른 회사로 나가는 요청도 없습니다.
      </>
    ),
  },
  {
    q: '그럼 어디에 남나요',
    a: (
      <>
        이 기기에만 남습니다. 다음에 오셨을 때 다시 적지 않으시도록 마지막에
        넣으신 생년월일과, 대운 칸에 적어두신 기록을 이 기기에 저장합니다.
        브라우저의 사이트 데이터를 지우시면 함께 사라집니다.
      </>
    ),
  },
  {
    q: '결과 링크를 보내면 어떻게 되나요',
    a: (
      <>
        링크 안에 생년월일이 글자로 보이지는 않지만,{' '}
        <b className="text-jumuk">링크를 받으신 분은 그 사주를 그대로 볼 수 있습니다.</b>{' '}
        서버가 없어서 링크가 내용을 직접 들고 가야 하기 때문입니다. 아무에게나
        보내지 마시고, 적어두신 인생 기록은 링크에 담기지 않습니다.
      </>
    ),
  },
  {
    q: '오류가 나면요',
    a: (
      <>
        어디서 멈췄는지 알아야 고칠 수 있어서, 오류가 났을 때만 오류 내용을
        보냅니다. 그때도 <b className="text-jumuk">생년월일은 지우고 보냅니다</b> —
        지워지는지를 테스트가 매번 확인합니다. 무엇을 누르셨는지 기록하거나
        화면을 녹화하는 기능은 아예 꺼두었습니다.
      </>
    ),
  },
  {
    q: '지우고 싶어요',
    a: (
      <>
        타임라인 아래 「적어둔 인생 기록 지우기」로 적으신 글을 지우실 수
        있습니다. 전부 지우시려면 브라우저에서 이 사이트의 데이터를 삭제하시면
        됩니다.
      </>
    ),
  },
];

export function Privacy() {
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
        <h1 className="text-xl font-bold text-ink">생년월일은 어디로 가나요</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          한 줄로 답하면 <b className="text-jumuk">아무 데도 가지 않습니다.</b>
          <br />
          자세한 것은 아래에 적어두었습니다.
        </p>
      </header>

      <dl className="space-y-6">
        {ITEMS.map((it) => (
          <div key={it.q} className="border-t border-dashed border-line-dash pt-4">
            <dt className="text-base font-bold text-ink">{it.q}</dt>
            <dd className="mt-1.5 text-sm leading-[1.85] text-ink-soft">{it.a}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-10 text-center text-xs leading-relaxed text-ink-faint">
        이 사이트는 사주를 재미로 보는 곳입니다.
        <br />
        의학·법률·투자 판단에 쓰실 내용이 아닙니다.
      </p>
    </div>
  );
}
