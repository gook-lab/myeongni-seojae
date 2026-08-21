/**
 * 명리서재 — 신살 (神殺)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 이름에 속지 말 것
 *
 * 신살은 이름에 "살(殺)" 이 붙어 있어 나쁜 것으로 오해되기 쉽다.
 * 도화살은 바람기, 역마살은 떠돌이 팔자 같은 식으로 겁을 주는 데 쓰여 왔다.
 *
 * 실제로는 기운의 결이다. 도화는 사람을 끌어당기는 힘이고, 역마는 움직이는
 * 힘이다. 지금 세상에서 도화는 매력이고 역마는 글로벌 커리어다.
 * 그래서 이 파일의 문장은 좋고 나쁨으로 나누지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 근거를 같이 낸다
 *
 * "도화살이 있습니다" 만으로는 확인할 방법이 없다. 어느 기준 자리에서
 * 어느 글자를 보고 나온 것인지 함께 낸다.
 *
 *   도화 · 일지 午 기준 → 년지 卯
 *
 * 이러면 사용자가 다른 곳과 대조할 수 있다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 유파 주의
 *
 * 신살은 유파마다 종류도 다르고 판정 기준도 갈린다. 여기서는 널리 쓰이고
 * 규칙이 표로 확정되는 열두 가지만 넣는다. 기준 자리(년지냐 일지냐)가
 * 갈리는 것들은 둘 다 보고 어느 쪽에서 나왔는지 밝힌다.
 *
 * 삼재·대장군 같은 연도 의존 신살은 넣지 않는다. 해마다 바뀌어 원국의
 * 성질이 아니고, 공포 마케팅에 쓰이는 대표 항목이라 이 앱과 맞지 않는다.
 */

import type { Branch, FourPillars, Palace, Pillar, Stem } from './types';

export type SinsalName =
  | '도화' | '역마' | '화개'
  | '천을귀인' | '문창귀인' | '금여'
  | '양인' | '홍염'
  | '원진' | '귀문관'
  | '백호대살' | '괴강'
  | '천라지망';

export interface SinsalHit {
  name: SinsalName;
  /** 어느 자리에서 나왔는가 */
  palace: Palace;
  /** 그 자리의 글자 */
  glyph: string;
  /** 무엇을 기준으로 판정했는가 — 사용자가 대조할 수 있게 */
  basis: string;
}

const BRANCHES: readonly Branch[] = [
  '자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해',
];

/** 삼합 그룹. 도화·역마·화개는 전부 이 그룹으로 정해진다. */
const TRIPLE: ReadonlyArray<{ group: Branch[]; 도화: Branch; 역마: Branch; 화개: Branch }> = [
  { group: ['인', '오', '술'], 도화: '묘', 역마: '신', 화개: '술' },
  { group: ['신', '자', '진'], 도화: '유', 역마: '인', 화개: '진' },
  { group: ['사', '유', '축'], 도화: '오', 역마: '해', 화개: '축' },
  { group: ['해', '묘', '미'], 도화: '자', 역마: '사', 화개: '미' },
];

/** 천을귀인 — 일간이 만나면 도움을 받는 자리 */
const CHEONEUL: Record<Stem, Branch[]> = {
  갑: ['축', '미'], 무: ['축', '미'], 경: ['축', '미'],
  을: ['자', '신'], 기: ['자', '신'],
  병: ['해', '유'], 정: ['해', '유'],
  신: ['오', '인'],
  임: ['사', '묘'], 계: ['사', '묘'],
};

/** 문창귀인 — 글과 배움의 자리 */
const MUNCHANG: Record<Stem, Branch> = {
  갑: '사', 을: '오', 병: '신', 정: '유', 무: '신',
  기: '유', 경: '해', 신: '자', 임: '인', 계: '묘',
};

/** 금여 — 배우자 복과 안락의 자리 */
const GEUMYEO: Record<Stem, Branch> = {
  갑: '진', 을: '사', 병: '미', 정: '신', 무: '미',
  기: '신', 경: '술', 신: '해', 임: '축', 계: '인',
};

/** 양인 — 극단적으로 강한 자리. 양간에만 있다 */
const YANGIN: Partial<Record<Stem, Branch>> = {
  갑: '묘', 병: '오', 무: '오', 경: '유', 임: '자',
};

/** 홍염 — 끌어당기는 매력의 자리 */
const HONGYEOM: Record<Stem, Branch> = {
  갑: '오', 을: '오', 병: '인', 정: '미', 무: '진',
  기: '진', 경: '술', 신: '유', 임: '자', 계: '신',
};

/** 원진 — 서로 꺼리는 지지 쌍 */
const WONJIN: ReadonlyArray<readonly [Branch, Branch]> = [
  ['자', '미'], ['축', '오'], ['인', '유'], ['묘', '신'], ['진', '해'], ['사', '술'],
];

/** 귀문관 — 예민함이 도드라지는 지지 쌍 */
const GWIMUN: ReadonlyArray<readonly [Branch, Branch]> = [
  ['자', '유'], ['축', '오'], ['인', '미'], ['묘', '신'], ['진', '해'], ['사', '술'],
];

/** 백호대살 — 간지 조합으로 정해진다 */
const BAEKHO = ['갑진', '을미', '병술', '정축', '무진', '임술', '계축'];

/** 괴강 — 극단적으로 강한 간지 */
const GOEGANG = ['경진', '경술', '임진', '임술', '무술'];

/** 천라(술해) · 지망(진사) */
const CHEONRA: Branch[] = ['술', '해'];
const JIMANG: Branch[] = ['진', '사'];

interface Slot {
  palace: Palace;
  pillar: Pillar;
}

function slots(pillars: FourPillars): Slot[] {
  const out: Slot[] = [
    { palace: '년주', pillar: pillars.year },
    { palace: '월주', pillar: pillars.month },
    { palace: '일주', pillar: pillars.day },
  ];
  if (pillars.hour) out.push({ palace: '시주', pillar: pillars.hour });
  return out;
}

const tripleOf = (b: Branch) => TRIPLE.find((t) => t.group.includes(b));

/**
 * 원국에서 신살을 찾는다.
 *
 * 도화·역마·화개는 기준 자리가 유파마다 갈린다(년지파 / 일지파).
 * 여기서는 둘 다 보고 어느 쪽에서 나왔는지 basis 에 적는다.
 */
export function findSinsal(pillars: FourPillars): SinsalHit[] {
  const hits: SinsalHit[] = [];
  const all = slots(pillars);
  const dayStem = pillars.day.stem;

  const add = (name: SinsalName, palace: Palace, glyph: string, basis: string) => {
    // 같은 신살이 같은 자리에서 두 번 잡히면(년지·일지 기준 둘 다) 근거만 합친다
    const dup = hits.find((h) => h.name === name && h.palace === palace);
    if (dup) {
      if (!dup.basis.includes(basis)) dup.basis = `${dup.basis} · ${basis}`;
      return;
    }
    hits.push({ name, palace, glyph, basis });
  };

  // ── 삼합 기준 (도화 · 역마 · 화개) ──
  for (const ref of [
    { label: '년지', branch: pillars.year.branch },
    { label: '일지', branch: pillars.day.branch },
  ]) {
    const t = tripleOf(ref.branch);
    if (!t) continue;
    for (const s of all) {
      const b = s.pillar.branch;
      const refLabel = `${ref.label} ${ref.branch} 기준`;
      if (b === t.도화) add('도화', s.palace, s.pillar.branchHanja, refLabel);
      if (b === t.역마) add('역마', s.palace, s.pillar.branchHanja, refLabel);
      if (b === t.화개) add('화개', s.palace, s.pillar.branchHanja, refLabel);
    }
  }

  // ── 일간 기준 ──
  for (const s of all) {
    const b = s.pillar.branch;
    const basis = `일간 ${pillars.day.stemHanja} 기준`;
    if (CHEONEUL[dayStem]?.includes(b)) add('천을귀인', s.palace, s.pillar.branchHanja, basis);
    if (MUNCHANG[dayStem] === b) add('문창귀인', s.palace, s.pillar.branchHanja, basis);
    if (GEUMYEO[dayStem] === b) add('금여', s.palace, s.pillar.branchHanja, basis);
    if (YANGIN[dayStem] === b) add('양인', s.palace, s.pillar.branchHanja, basis);
    if (HONGYEOM[dayStem] === b) add('홍염', s.palace, s.pillar.branchHanja, basis);
  }

  // ── 지지 쌍 기준 (원진 · 귀문관) ──
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const a = all[i] as Slot;
      const c = all[j] as Slot;
      const pair = (list: ReadonlyArray<readonly [Branch, Branch]>) =>
        list.some(
          ([x, y]) =>
            (a.pillar.branch === x && c.pillar.branch === y) ||
            (a.pillar.branch === y && c.pillar.branch === x),
        );
      const label = `${a.palace} ${a.pillar.branchHanja} ↔ ${c.palace} ${c.pillar.branchHanja}`;
      if (pair(WONJIN)) {
        add('원진', a.palace, a.pillar.branchHanja, label);
        add('원진', c.palace, c.pillar.branchHanja, label);
      }
      if (pair(GWIMUN)) {
        add('귀문관', a.palace, a.pillar.branchHanja, label);
        add('귀문관', c.palace, c.pillar.branchHanja, label);
      }
    }
  }

  // ── 간지 조합 기준 ──
  for (const s of all) {
    const gz = `${s.pillar.stem}${s.pillar.branch}`;
    const hanja = `${s.pillar.stemHanja}${s.pillar.branchHanja}`;
    if (BAEKHO.includes(gz)) add('백호대살', s.palace, hanja, `${s.palace} 간지 ${hanja}`);
    if (GOEGANG.includes(gz)) add('괴강', s.palace, hanja, `${s.palace} 간지 ${hanja}`);
  }

  // ── 천라지망 ──
  const hasCheonra = all.filter((s) => CHEONRA.includes(s.pillar.branch));
  const hasJimang = all.filter((s) => JIMANG.includes(s.pillar.branch));
  if (hasCheonra.length >= 2) {
    for (const s of hasCheonra) {
      add('천라지망', s.palace, s.pillar.branchHanja, '천라(戌亥)');
    }
  }
  if (hasJimang.length >= 2) {
    for (const s of hasJimang) {
      add('천라지망', s.palace, s.pillar.branchHanja, '지망(辰巳)');
    }
  }

  return hits;
}

/** 신살별로 묶는다. 화면은 이 형태를 쓴다. */
export interface SinsalGroup {
  name: SinsalName;
  palaces: Palace[];
  glyphs: string[];
  bases: string[];
}

export function groupSinsal(hits: SinsalHit[]): SinsalGroup[] {
  const map = new Map<SinsalName, SinsalGroup>();
  for (const h of hits) {
    const g = map.get(h.name) ?? { name: h.name, palaces: [], glyphs: [], bases: [] };
    g.palaces.push(h.palace);
    g.glyphs.push(h.glyph);
    if (!g.bases.includes(h.basis)) g.bases.push(h.basis);
    map.set(h.name, g);
  }
  return [...map.values()];
}

export const ALL_SINSAL: readonly SinsalName[] = [
  '도화', '역마', '화개',
  '천을귀인', '문창귀인', '금여',
  '양인', '홍염',
  '원진', '귀문관',
  '백호대살', '괴강',
  '천라지망',
];

export { BRANCHES as SINSAL_BRANCHES };
