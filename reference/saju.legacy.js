// 사주 계산 엔진 (양력 기준, 절기 근사)
window.SAJU = (() => {
  const STEM_K = ['갑','을','병','정','무','기','경','신','임','계'];
  const STEM_H = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const STEM_E = [0,0,1,1,2,2,3,3,4,4]; // 목화토금수 index
  const BR_K = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
  const BR_H = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const BR_E = [4,2,0,0,2,1,1,2,3,3,2,4];
  const ANIMAL = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'];
  const ELEM_K = ['목','화','토','금','수'];
  const ELEM_H = ['木','火','土','金','水'];
  const gen = e => (e + 1) % 5;   // 상생
  const ctrl = e => (e + 2) % 5;  // 상극

  function jdn(y, m, d) {
    const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  // 절기 경계 (근사): [월, 일, 인월기준 월서수]
  const TERMS = [[2,4,0],[3,6,1],[4,5,2],[5,6,3],[6,6,4],[7,7,5],[8,8,6],[9,8,7],[10,8,8],[11,7,9],[12,7,10],[1,6,11]];
  function monthOrdinal(m, d) {
    let ord = 11; // 1월 1~5일: 자월(전년 대설 이후) → ordinal 10 처리 아래에서
    if (m === 1 && d < 6) return 10;
    for (const [tm, td, o] of TERMS) {
      if (m > tm || (m === tm && d >= td)) ord = o;
    }
    // TERMS 순회는 달력순이 아니므로 정확히: 다시 계산
    const list = [[1,6,11],[2,4,0],[3,6,1],[4,5,2],[5,6,3],[6,6,4],[7,7,5],[8,8,6],[9,8,7],[10,8,8],[11,7,9],[12,7,10]];
    ord = 10; // 기본: 1/1~1/5 → 자월
    for (const [tm, td, o] of list) {
      if (m > tm || (m === tm && d >= td)) ord = o;
    }
    return ord;
  }
  function pillar(si, bi) {
    return { si, bi, sk: STEM_K[si], sh: STEM_H[si], bk: BR_K[bi], bh: BR_H[bi],
      se: STEM_E[si], be: BR_E[bi], seK: ELEM_K[STEM_E[si]], beK: ELEM_K[BR_E[bi]] };
  }
  function fourPillars(y, m, d, hourBranch) {
    const beforeIpchun = (m < 2) || (m === 2 && d < 4);
    const sy = beforeIpchun ? y - 1 : y;
    const yp = pillar((sy - 4) % 10 < 0 ? ((sy - 4) % 10 + 10) : (sy - 4) % 10, ((sy - 4) % 12 + 12) % 12);
    const ord = monthOrdinal(m, d);
    const mp = pillar(((yp.si % 5) * 2 + 2 + ord) % 10, (2 + ord) % 12);
    const dIdx = ((jdn(y, m, d) + 49) % 60 + 60) % 60;
    const dp = pillar(dIdx % 10, dIdx % 12);
    let hp = null;
    if (hourBranch != null && hourBranch >= 0) hp = pillar(((dp.si % 5) * 2 + hourBranch) % 10, hourBranch);
    return { year: yp, month: mp, day: dp, hour: hp, animal: ANIMAL[yp.bi] };
  }
  // 십성: 일간 기준
  function tenGod(ds, os, oYin) {
    const de = STEM_E[ds], dy = ds % 2, sameP = dy === oYin;
    const oe = typeof os === 'number' ? os : STEM_E[os];
    if (oe === de) return sameP ? '비견' : '겁재';
    if (oe === gen(de)) return sameP ? '식신' : '상관';
    if (oe === ctrl(de)) return sameP ? '편재' : '정재';
    if (ctrl(oe) === de) return sameP ? '편관' : '정관';
    return sameP ? '편인' : '정인';
  }
  const CAT = { 비견:'비겁', 겁재:'비겁', 식신:'식상', 상관:'식상', 편재:'재성', 정재:'재성', 편관:'관성', 정관:'관성', 편인:'인성', 정인:'인성' };
  const DM_TEXT = {
    갑:'곧게 뻗는 큰 나무의 기운입니다. 주관이 뚜렷하고 추진력이 있으며, 한번 정한 방향은 쉽게 꺾지 않습니다.',
    을:'부드럽게 휘어지는 화초와 덩굴의 기운입니다. 유연하고 적응력이 좋아 어떤 환경에서도 자기 자리를 찾아냅니다.',
    병:'하늘의 태양처럼 밝고 큰 불의 기운입니다. 표현이 시원하고 사람을 끌어모으며, 숨기는 것이 없는 성정입니다.',
    정:'어둠을 밝히는 등불의 기운입니다. 섬세하고 따뜻하며, 가까운 사람을 오래 챙기는 정이 깊은 성정입니다.',
    무:'넓고 단단한 산의 기운입니다. 믿음직하고 중심이 잘 흔들리지 않아 주변에서 기대는 사람이 많습니다.',
    기:'곡식을 기르는 밭의 기운입니다. 포용력이 있고 실속을 챙기며, 겉보다 속이 단단한 성정입니다.',
    경:'제련되지 않은 강철과 바위의 기운입니다. 결단이 빠르고 의리가 있으며, 맺고 끊음이 분명합니다.',
    신:'다듬어진 보석의 기운입니다. 예리하고 섬세하며, 완성도에 대한 기준이 높은 성정입니다.',
    임:'큰 강과 바다의 기운입니다. 생각의 폭이 넓고 지혜로우며, 흐름을 읽는 감각이 뛰어납니다.',
    계:'이슬비와 샘물의 기운입니다. 감수성이 풍부하고 통찰이 깊으며, 조용히 스며들어 사람을 움직입니다.'
  };
  const DAILY = {
    비겁:'주체성이 강해지는 날입니다. 내 페이스대로 밀고 나가되, 고집으로 비치지 않게 주변 의견도 한 번 들어보세요.',
    식상:'표현과 아이디어가 살아나는 날입니다. 미뤄둔 말이나 기획을 꺼내기 좋고, 창작과 발표에 유리한 흐름입니다.',
    재성:'재물과 실속의 기운이 들어오는 날입니다. 거래와 협상에 유리하지만, 욕심이 커지기 쉬우니 선은 지키세요.',
    관성:'책임과 평가가 따르는 날입니다. 규칙과 절차를 지키면 인정받고, 무리한 돌파는 탈이 나기 쉽습니다.',
    인성:'배움과 문서의 기운이 강한 날입니다. 공부·계약·문서 검토에 좋고, 어른이나 스승의 조언이 힘이 됩니다.'
  };
  const MONTHLY = {
    비겁:'경쟁과 독립의 기운. 내 것을 지키는 달입니다.',
    식상:'표현과 시작의 기운. 일을 벌이기 좋은 달입니다.',
    재성:'재물의 기운. 성과와 수입을 챙기는 달입니다.',
    관성:'책임의 기운. 평가와 승부가 걸리는 달입니다.',
    인성:'배움의 기운. 준비와 재정비에 알맞은 달입니다.'
  };
  const LUCKY_COLOR = ['청록색','붉은색','황토색','흰색','검은색'];
  const LUCKY_DIR = ['동쪽','남쪽','중앙','서쪽','북쪽'];
  function seeded(n) { let x = Math.sin(n) * 10000; return x - Math.floor(x); }

  function calc(y, m, d, hourBranch, gender) {
    const p = fourPillars(y, m, d, hourBranch);
    const chars = [p.year, p.month, p.day, p.hour].filter(Boolean);
    const counts = [0, 0, 0, 0, 0];
    chars.forEach(c => { counts[c.se]++; counts[c.be]++; });
    const ds = p.day.si;
    const tg = pp => pp ? { s: pp === p.day ? '일간' : tenGod(ds, pp.si, pp.si % 2), b: tenGod(ds, pp.be, pp.bi % 2) } : null;
    return {
      y, m, d, hourBranch, gender, pillars: p, animal: p.animal, counts,
      dayMaster: { k: p.day.sk, h: p.day.sh, elemK: ELEM_K[p.day.se], elemH: ELEM_H[p.day.se], elemIdx: p.day.se, text: DM_TEXT[p.day.sk] },
      tenGods: { year: tg(p.year), month: tg(p.month), day: tg(p.day), hour: tg(p.hour) }
    };
  }
  function todayPillar() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    const idx = ((jdn(y, m, d) + 49) % 60 + 60) % 60;
    return { date: now, y, m, d, p: pillar(idx % 10, idx % 12), jd: jdn(y, m, d) };
  }
  function daily(saju) {
    const t = todayPillar();
    const cat = CAT[tenGod(saju.pillars.day.si, t.p.si, t.p.si % 2)];
    const base = { 식상: 78, 재성: 82, 인성: 76, 비겁: 72, 관성: 68 }[cat];
    const score = Math.min(98, Math.max(45, Math.round(base + (seeded(t.jd * 31 + saju.pillars.day.si) - 0.5) * 24)));
    const luckyE = (saju.pillars.day.se + 4) % 5; // 일간을 생하는 오행
    return { t, cat, text: DAILY[cat], score,
      lucky: { color: LUCKY_COLOR[luckyE], dir: LUCKY_DIR[luckyE], num: (luckyE * 2 + 1) + ', ' + (luckyE * 2 + 6) } };
  }
  function gunghap(a, b) {
    const ae = a.pillars.day.se, be = b.pillars.day.se;
    let score, main;
    if (ae === be) { score = 76; main = '같은 기운이 나란히 서 있는 관계입니다. 서로를 깊이 이해하지만, 양보의 자리가 없으면 부딪히기도 합니다.'; }
    else if (gen(ae) === be || gen(be) === ae) { score = 86; main = '한쪽이 다른 쪽을 자연스럽게 살리는 상생(相生)의 기운입니다. 함께 있을수록 서로에게 힘이 되는 관계입니다.'; }
    else { score = 58; main = '서로를 단련시키는 상극(相剋)의 기운입니다. 긴장이 있는 만큼 성장도 크지만, 말의 온도를 조심해야 합니다.'; }
    const ab = a.pillars.day.bi, bb = b.pillars.day.bi;
    const HAP = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
    let sub = '';
    if (HAP.some(([x, y2]) => (ab === x && bb === y2) || (ab === y2 && bb === x))) { score += 8; sub = '일지가 합(合)을 이루어 정서적 결속이 단단합니다.'; }
    else if (Math.abs(ab - bb) === 6) { score -= 8; sub = '일지가 충(沖)이라 생활 리듬의 조율이 필요합니다.'; }
    score += Math.round((seeded(a.pillars.day.si * 7 + b.pillars.day.si * 13) - 0.5) * 8);
    return { score: Math.min(99, Math.max(40, score)), main, sub };
  }
  function yearReport(saju, year) {
    const ys = ((year - 4) % 10 + 10) % 10, yb = ((year - 4) % 12 + 12) % 12;
    const yp = pillar(ys, yb);
    const ds = saju.pillars.day.si;
    const overallCat = CAT[tenGod(ds, ys, ys % 2)];
    const months = [];
    for (let o = 0; o < 12; o++) {
      const mp = pillar(((ys % 5) * 2 + 2 + o) % 10, (2 + o) % 12);
      const cat = CAT[tenGod(ds, mp.si, mp.si % 2)];
      const base = { 식상: 78, 재성: 82, 인성: 74, 비겁: 70, 관성: 66 }[cat];
      const score = Math.min(95, Math.max(50, Math.round(base + (seeded(year * 100 + o + ds) - 0.5) * 16)));
      const label = o < 11 ? (o + 2) + '월' : '1월';
      months.push({ n: o, label, pk: mp.sk + mp.bk, ph: mp.sh + mp.bh, cat, text: MONTHLY[cat], score, se: mp.se });
    }
    return { year, yp, overallCat, overallText: MONTHLY[overallCat].replace('달', '해'), months };
  }
  const BOUND = [[1,6],[2,4],[3,6],[4,5],[5,6],[6,6],[7,7],[8,8],[9,8],[10,8],[11,7],[12,7]];
  function daeun(saju) {
    const { y, m, d } = saju, ys = saju.pillars.year.si, male = saju.gender === '남';
    const forward = (ys % 2 === 0) === male; // 양간 남 · 음간 여 = 순행
    const bj = jdn(y, m, d); let diff;
    if (forward) {
      let nb = null;
      for (const [bm, bd] of BOUND) if (bm > m || (bm === m && bd > d)) { nb = jdn(y, bm, bd); break; }
      if (nb == null) nb = jdn(y + 1, 1, 6);
      diff = nb - bj;
    } else {
      let pb = null;
      for (const [bm, bd] of BOUND) if (bm < m || (bm === m && bd <= d)) pb = jdn(y, bm, bd);
      if (pb == null) pb = jdn(y - 1, 12, 7);
      diff = bj - pb;
    }
    let start = Math.round(diff / 3); if (start < 1) start = 1; if (start > 10) start = 10;
    const mp = saju.pillars.month; let k60 = 0;
    for (let k = 0; k < 60; k++) if (k % 10 === mp.si && k % 12 === mp.bi) { k60 = k; break; }
    const ds = saju.pillars.day.si, nowAge = new Date().getFullYear() - y, list = [];
    for (let i = 1; i <= 8; i++) {
      const k = ((k60 + (forward ? i : -i)) % 60 + 60) % 60, p = pillar(k % 10, k % 12), age = start + (i - 1) * 10;
      list.push({ age, sh: p.sh, bh: p.bh, sk: p.sk, bk: p.bk, se: p.se, be: p.be, tg: tenGod(ds, p.si, p.si % 2), cur: nowAge >= age && nowAge < age + 10 });
    }
    return { start, forward, list };
  }
  const GLOSS = {
    일간: '사주의 주인공, 나 자신을 나타내는 글자입니다.',
    비견: '나와 같은 기운. 자립심·주관·동료를 뜻합니다.',
    겁재: '나와 같은 오행의 다른 얼굴. 경쟁심과 승부욕을 뜻합니다.',
    식신: '내가 만들어내는 기운. 표현력·재능·의식주의 복을 뜻합니다.',
    상관: '틀을 깨는 표현의 기운. 언변·창의성·비판 정신을 뜻합니다.',
    편재: '움직이는 재물. 사업 수완과 활동적인 금전운을 뜻합니다.',
    정재: '안정된 재물. 성실하게 쌓는 금전과 꼼꼼함을 뜻합니다.',
    편관: '나를 단련시키는 기운. 결단력·카리스마·시련 극복을 뜻합니다.',
    정관: '바른 질서의 기운. 명예·책임감·조직운을 뜻합니다.',
    편인: '독특한 배움의 기운. 직관·전문 지식·개성을 뜻합니다.',
    정인: '나를 돕는 배움의 기운. 학문·문서·귀인의 도움을 뜻합니다.'
  };
  const DOM_LINE = {
    비겁: '사주 전체로는 비겁의 기운이 가장 강해, 어디서든 내 목소리를 내는 힘이 있습니다.',
    식상: '사주 전체로는 식상의 기운이 가장 강해, 표현하고 베푸는 데서 활력을 얻습니다.',
    재성: '사주 전체로는 재성의 기운이 가장 강해, 현실 감각과 실행력이 돋보입니다.',
    관성: '사주 전체로는 관성의 기운이 가장 강해, 책임감 있고 절제된 인상을 줍니다.',
    인성: '사주 전체로는 인성의 기운이 가장 강해, 차분히 배우고 받아들이는 힘이 큽니다.'
  };
  const CAREER = {
    식상: '표현하고 만들어내는 식상이 발달해 기획·창작·교육·서비스처럼 결과물이 보이는 일이 어울립니다.',
    관성: '질서와 책임의 관성이 발달해 조직 안에서 인정받는 유형입니다. 공직·대기업·관리 직무가 어울립니다.',
    인성: '배움의 인성이 발달해 연구·전문직·문서를 다루는 일이 어울립니다. 자격과 지식이 곧 무기입니다.',
    비겁: '주체성의 비겁이 발달해 지시받기보다 스스로 이끄는 일이 어울립니다. 독립·창업·프리랜서 유형입니다.',
    재성: '재성이 발달해 돈의 흐름을 다루는 일이 어울립니다. 영업·금융·사업 감각이 뛰어납니다.'
  };
  const LOVE = {
    비겁: '배우자 자리에 나와 같은 기운이 있어 친구 같은 연애를 합니다. 존중이 유지되면 오래 갑니다.',
    식상: '배우자 자리에 표현의 기운이 있어 다정하고 애정 표현이 풍부합니다. 새로움을 함께 찾으면 권태가 없습니다.',
    재성: '배우자 자리에 재성이 있어 현실적이고 안정적인 관계를 추구합니다. 함께 미래를 설계할 때 애정이 깊어집니다.',
    관성: '배우자 자리에 관성이 있어 든든함을 주고받는 관계를 만듭니다. 책임감 있는 만남이 어울립니다.',
    인성: '배우자 자리에 인성이 있어 서로를 보듬는 관계를 만듭니다. 대화와 배려가 애정의 핵심입니다.'
  };
  function topics(saju) {
    const cnt = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
    const tgs = saju.tenGods;
    [tgs.year, tgs.month, tgs.day, tgs.hour].forEach(t => {
      if (!t) return;
      if (t.s !== '일간') cnt[CAT[t.s]]++;
      cnt[CAT[t.b]]++;
    });
    let dom = '비겁', mx = -1;
    for (const k in cnt) if (cnt[k] > mx) { mx = cnt[k]; dom = k; }
    const jae = cnt['재성'];
    const money = jae === 0
      ? '사주에 재성이 드러나지 않아, 돈을 좇기보다 실력을 쌓을 때 재물이 따라오는 유형입니다. 꾸준한 저축과 장기 투자가 어울립니다.'
      : jae <= 2
      ? '재성이 알맞게 자리해 성실하게 벌어 안정적으로 모으는 유형입니다. 관리만 잘하면 큰 굴곡 없이 재물이 쌓입니다.'
      : '재성이 강해 돈의 흐름을 읽는 감각이 좋습니다. 다만 들어오는 만큼 나가기 쉬워, 지키는 전략이 관건입니다.';
    return { dom, cnt, personality: DOM_LINE[dom], money, love: LOVE[CAT[tgs.day.b]], career: CAREER[dom] };
  }
  return { calc, daily, gunghap, yearReport, todayPillar, daeun, topics, GLOSS, STEM_K, BR_K, ELEM_K, ELEM_H };
})();
