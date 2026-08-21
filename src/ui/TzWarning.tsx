/**
 * 명리서재 — tzdata 결손 경고 (F1)
 *
 * 한국 표준시 이력을 tzdata 에 위임한 대가로 "런타임이 제대로 된 tzdata 를
 * 갖고 있는가"가 새 가정이 됐다. 골든 테스트는 CI(Node) 에서만 돈다.
 * 사용자 브라우저는 검증되지 않는다.
 *
 * 결손 시 예외가 아니라 조용히 UTC+9 로 계산된다 — 유일하게 침묵하며
 * 틀리는 경로다. 정확도를 간판으로 건 앱은 모른다고 말할 수 있어야 한다.
 */

import { useEffect } from 'react';
import { isTzdataUsable, tzdataDiagnostics } from '../core/korea-time';
import { useSajuStore } from '../store/saju-store';

export function TzWarning() {
  const tzdataOk = useSajuStore((s) => s.tzdataOk);
  const setTzdataOk = useSajuStore((s) => s.setTzdataOk);

  useEffect(() => {
    const ok = isTzdataUsable();
    setTzdataOk(ok);
    if (!ok && import.meta.env.DEV) {
      console.warn('[tzdata] 진단 실패', tzdataDiagnostics());
    }
  }, [setTzdataOk]);

  if (tzdataOk) return null;

  return (
    <div
      role="status"
      className="border-b border-jumuk bg-card-warm px-5 py-3 text-center text-xs leading-relaxed text-jumuk-deep"
    >
      이 기기의 시간대 정보가 오래되어 <strong>1954~1961년 출생</strong>의 시주가
      정확하지 않을 수 있습니다. 브라우저를 업데이트하시면 해결됩니다.
    </div>
  );
}
