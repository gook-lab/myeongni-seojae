/**
 * 명리서재 — 인생 리포트 (인쇄용)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 문서인가
 *
 * 관객이 부모님 세대다. 그 세대는 스크롤을 안 한다. 종이를 본다.
 * 설계 문서의 "A4 인생지도" 가 이것이다.
 *
 * 그리고 화면은 훑고 지나가지만 문서는 남는다. 인쇄해서 드리거나
 * PDF 로 저장해 보내면 그게 이 앱이 남기는 물건이 된다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 이 리포트가 다른 리포트와 다른 점
 *
 * 결론만 적지 않는다. 계산 근거를 같이 싣는다.
 *
 *   - 출생 당시 한국 표준시가 몇 시였는지, 진태양시 보정이 몇 분인지
 *   - 신강·신약을 어느 자리에서 몇 점으로 셌는지
 *   - 어떤 용신법을 썼는지
 *
 * "당신은 신강입니다" 만 적힌 문서는 다시 읽을 이유가 없지만,
 * 근거가 적힌 문서는 나중에 다른 곳과 대조해볼 수 있다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 프라이버시
 *
 * 인쇄는 브라우저가 로컬에서 한다. 서버로 나가는 것이 없다.
 * 다만 문서에는 생년월일이 들어간다 — 본인이 보관할 문서이므로 당연하고,
 * 그래서 화면 공유 카드(생년월일 없음)와 성격이 다르다.
 */

import { useSajuStore } from '../store/saju-store';

/** 인쇄 시 잘리지 않게 묶는 단위 */
function Block({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-block mb-7">
      <h2 className="mb-1 border-b border-line pb-1.5 text-base font-bold text-ink">
        {title}
      </h2>
      {note && <p className="mb-2.5 text-[11px] leading-relaxed text-ink-faint">{note}</p>}
      {children}
    </section>
  );
}

export function Report() {
  const reading = useSajuStore((s) => s.reading);
  const go = useSajuStore((s) => s.go);
  const form = useSajuStore((s) => s.form);
  if (!reading) return null;

  const { chart, timeline, cards, yongsin: y, palaces, balance, topics, dayMasterText } = reading;
  const st = chart.solarTime;
  const name = form.name?.trim();

  const cal = chart.input.calendar === 'lunar' ? '음력' : '양력';
  const leap = chart.input.leapMonth ? ' 윤달' : '';
  const hourLabel = chart.input.hour.known
    ? `${String(chart.input.hour.hour).padStart(2, '0')}:${String(chart.input.hour.minute).padStart(2, '0')}`
    : '시간 미상';

  const fmtOffset = (min: number) => {
    const total = Math.round(Math.abs(min) * 60);
    return `${min < 0 ? '−' : '+'}${Math.floor(total / 60)}분 ${String(total % 60).padStart(2, '0')}초`;
  };
  const fmtStd = (min: number) =>
    `UTC+${Math.floor(min / 60)}${min % 60 ? `:${min % 60}` : ''}`;

  return (
    <div className="report mx-auto w-full max-w-3xl px-5 py-8">
      {/* 화면에서만 보이는 조작부 */}
      <div className="report-controls mb-8 flex gap-2">
        <button
          type="button"
          onClick={() => go('saju')}
          className="rounded-md border border-line bg-card px-4 py-2.5 text-sm text-ink-soft"
        >
          ‹ 타임라인
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 rounded-md bg-jumuk px-4 py-2.5 text-sm font-bold text-card"
        >
          인쇄 · PDF로 저장
        </button>
      </div>
      <p className="report-controls mb-8 text-xs leading-relaxed text-ink-faint">
        인쇄 창에서 &ldquo;대상&rdquo;을 <b>PDF로 저장</b>으로 바꾸면 파일로 남습니다.
        인쇄는 이 기기 안에서만 이루어지고 서버로 나가는 것이 없습니다.
      </p>

      {/* 표지 */}
      <header className="report-block mb-8 border-b-2 border-jumuk pb-5">
        <p className="mb-1.5 text-[11px] tracking-[0.3em] text-ink-faint">명 리 서 재</p>
        <h1 className="text-2xl font-bold text-ink">
          {name ? `${name} 님의 ` : ''}인생 리포트
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {cal} {chart.input.year}년 {chart.input.month}월 {chart.input.day}일{leap} · {hourLabel}
          {' · '}
          {chart.input.gender}자 · {chart.animal}띠
        </p>
      </header>

      {/* 1. 명식 + 계산 근거 */}
      <Block
        title="사주팔자"
        note="네 기둥은 각각 인생의 한 시기를 맡습니다. 굵은 테두리가 일주(나 자신)입니다."
      >
        <table className="w-full table-fixed border-collapse text-center">
          <thead>
            <tr>
              {['시주', '일주', '월주', '년주'].map((t) => (
                <th key={t} className="pb-1.5 text-[11px] font-normal text-ink-faint">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {[chart.pillars.hour, chart.pillars.day, chart.pillars.month, chart.pillars.year].map(
                (p, i) => (
                  <td
                    key={i}
                    className={
                      'border p-2.5 align-top ' +
                      (i === 1 ? 'border-2 border-jumuk bg-card-warm' : 'border-line')
                    }
                  >
                    {p ? (
                      <>
                        <div className="text-xl leading-tight text-ink">{p.stemHanja}</div>
                        <div className="text-xl leading-tight text-ink">{p.branchHanja}</div>
                        <div className="mt-1 text-[10px] text-ink-faint">
                          {p.stem}{p.branch}
                        </div>
                      </>
                    ) : (
                      <div className="py-3 text-[10px] text-ink-faint">시각<br />미상</div>
                    )}
                  </td>
                ),
              )}
            </tr>
          </tbody>
        </table>

        {/* ★계산 근거★ 다른 리포트에 없는 부분 */}
        <div className="mt-3 rounded border border-dashed border-line-dash px-3 py-2.5">
          <p className="mb-1.5 text-[11px] font-bold text-jumuk">계산 근거</p>
          <ul className="space-y-0.5 text-[11px] leading-relaxed text-ink-soft">
            <li>
              출생 당시 한국 표준시 <b>{fmtStd(st.standardOffsetMinutes)}</b>
              {st.daylightSaving && ' (서머타임 적용 중)'}
            </li>
            <li>
              진태양시 보정 <b>{fmtOffset(st.offsetMinutes)}</b> — 출생지{' '}
              {chart.input.longitude.toFixed(3)}°E 기준
            </li>
            <li>야자시 {chart.input.yajasi === 'advance-day' ? '일주 넘김' : '일주 유지'} · 균시차 {chart.input.applyEquationOfTime ? '적용' : '미적용'}</li>
            {chart.hourUnknown && (
              <li className="text-jumuk">
                태어난 시각 없이 계산했습니다. 대운 타임라인은 시각과 무관하므로 그대로
                정확하고, 시주와 오행 분포만 여섯 자 기준입니다.
              </li>
            )}
          </ul>
        </div>
      </Block>

      {/* 2. 인생 타임라인 — 주인공 */}
      <Block
        title="인생 타임라인"
        note={`${timeline.startAge}세부터 10년 단위로 ${timeline.direction === 'forward' ? '순행' : '역행'}합니다. 막대는 십이운성으로 본 그 10년의 힘이며 좋고 나쁨이 아닙니다.`}
      >
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {cards.map((c) => (
              <tr key={c.index} className={c.isCurrent ? 'bg-card-warm' : ''}>
                <td className="border border-line px-2 py-1.5 whitespace-nowrap tabular-nums">
                  {c.startAge}~{c.endAge}세
                </td>
                <td className="border border-line px-2 py-1.5 whitespace-nowrap tabular-nums text-ink-faint">
                  {c.startYear}~{c.endYear}
                </td>
                <td className="border border-line px-2 py-1.5 whitespace-nowrap text-base">
                  <span style={{ color: c.stemColor }}>{c.ganji[0]}</span>
                  <span style={{ color: c.branchColor }}>{c.ganji[1]}</span>
                </td>
                <td className="border border-line px-2 py-1.5 whitespace-nowrap">
                  {c.tenGod} · {c.stage}
                </td>
                <td className="border border-line px-2 py-1.5" style={{ width: '30%' }}>
                  <div className="h-1.5 w-full rounded-full bg-line-soft">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round(c.outwardness * 100)}%`,
                        backgroundColor: c.isCurrent ? '#A63A2B' : '#C9B98F',
                      }}
                    />
                  </div>
                </td>
                <td className="border border-line px-2 py-1.5 text-center text-jumuk">
                  {c.isCurrent ? '지금' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 현재 대운은 문단까지 싣는다 */}
        {cards.filter((c) => c.isCurrent).map((c) => (
          <div key={c.index} className="mt-3 rounded border border-jumuk bg-card-warm px-3 py-2.5">
            <p className="mb-1 text-[11px] font-bold text-jumuk">
              지금 지나고 있는 10년 — {c.startAge}~{c.endAge}세 {c.ganji} {c.tenGod}
            </p>
            <p className="text-xs leading-relaxed text-ink">{c.text}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
              {c.stage} — {c.stageText}
            </p>
          </div>
        ))}
      </Block>

      {/* 3. 일간의 힘과 용신 — 근거 포함 */}
      <Block title="일간의 힘과 용신" note={y.methodNote}>
        <p className="mb-2 text-sm">
          <b className="text-jumuk">{y.verdict}</b>
          <span className="ml-2 text-[11px] text-ink-faint">{y.lead}</span>
        </p>
        <p className="mb-3 text-xs leading-relaxed text-ink">{y.verdictText}</p>

        <table className="mb-3 w-full border-collapse text-[11px]">
          <tbody>
            {y.slots.map((sl) => (
              <tr key={sl.slot}>
                <td className="border border-line px-2 py-1 text-ink-faint">{sl.slot}</td>
                <td className="border border-line px-2 py-1 text-sm">{sl.glyph}</td>
                <td className="border border-line px-2 py-1">{sl.tenGod}</td>
                <td className="border border-line px-2 py-1 text-ink-faint">{sl.category}</td>
                <td
                  className={
                    'border border-line px-2 py-1 text-right tabular-nums ' +
                    (sl.supports ? 'text-jumuk' : 'text-ink-faint')
                  }
                >
                  {sl.signed > 0 ? `+${sl.signed}` : sl.signed}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <ul className="mb-3 space-y-0.5 text-[11px] text-ink-soft">
          {y.factors.map((f) => (
            <li key={f.label}>
              <b className={f.ok ? 'text-jumuk' : 'text-ink-faint'}>
                {f.ok ? '○' : '×'} {f.label}
              </b>{' '}
              {f.text}
            </li>
          ))}
        </ul>

        <div className="rounded border border-line bg-card px-3 py-2.5">
          <p className="text-[11px] text-jumuk">용신 — 가장 필요한 기운</p>
          <p className="mt-0.5 text-sm">
            <b className="text-ink">{y.primary}</b>
            <span className="ml-1.5 text-ink-soft">{y.primaryElement}</span>
            <span className="ml-2 text-[11px] text-ink-faint">
              색 {y.practical.color} · 방위 {y.practical.direction}
            </span>
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink">{y.advice}</p>
        </div>
      </Block>

      {/* 4. 궁위 */}
      <Block title="인생의 네 자리" note="같은 기운도 어느 자리에 있느냐에 따라 뜻이 달라집니다.">
        <div className="space-y-2">
          {palaces.map((p) => (
            <div key={p.palace} className="border border-line px-3 py-2">
              <p className="text-xs">
                <b className="text-ink">{p.palace}</b>
                <span className="ml-1.5 text-ink-faint">{p.span} · {p.domain}</span>
                <span className="float-right text-sm text-ink">{p.ganji}</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink">{p.text}</p>
              <p className="mt-1 text-[10px] text-ink-faint">
                {p.stemTenGod} · {p.stage}
                {p.hidden.length > 0 && ` · 지장간 ${p.hidden.join('·')}`}
                {p.isVoid && ' · 공망'}
              </p>
            </div>
          ))}
        </div>
      </Block>

      {/* 5. 오행 균형 */}
      <Block title="오행 균형" note={balance.lead}>
        <table className="mb-2 w-full border-collapse text-center text-xs">
          <tbody>
            <tr>
              {(['목', '화', '토', '금', '수'] as const).map((e) => (
                <td key={e} className="border border-line px-2 py-1.5">
                  <div className="text-ink-faint">{e}</div>
                  <div className="text-base tabular-nums text-ink">{balance.counts[e]}</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        {balance.missing && (
          <div className="border border-jumuk bg-card-warm px-3 py-2">
            <p className="text-xs font-bold text-jumuk">{balance.missing.lead}</p>
            {balance.missing.notes.map((n) => (
              <p key={n} className="mt-0.5 text-xs leading-relaxed text-ink">{n}</p>
            ))}
          </div>
        )}
        {balance.excessive.map((t) => (
          <p key={t} className="mt-2 border border-line px-3 py-2 text-xs leading-relaxed text-ink">
            {t}
          </p>
        ))}
      </Block>

      {/* 6. 풀이 */}
      <Block title="풀이">
        <div className="space-y-2">
          {[
            { k: `일간 ${chart.dayMaster.stemHanja}${chart.dayMaster.stem}`, v: dayMasterText },
            { k: '성격', v: topics.personality },
            { k: '재물', v: topics.money },
            { k: '애정', v: topics.love },
            { k: '직업', v: topics.career },
          ].map(({ k, v }) => (
            <div key={k} className="border border-line px-3 py-2">
              <p className="text-[11px] font-bold text-jumuk">{k}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink">{v}</p>
            </div>
          ))}
        </div>
      </Block>

      <footer className="report-block border-t border-line pt-3 text-[10px] leading-relaxed text-ink-faint">
        <p>
          명리서재 · 억부용신법 기준 · 만세력은 IANA tzdata 의 한국 표준시 이력과
          진태양시 보정을 반영해 계산했습니다.
        </p>
        <p className="mt-0.5">
          단정적 예언이 아니라 흐름을 읽는 참고 자료입니다. 의료·법률·투자 판단에
          쓰지 마세요.
        </p>
      </footer>
    </div>
  );
}
