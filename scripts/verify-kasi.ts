/**
 * 한국천문연구원(KASI) 공식 절기 대조
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 이 스크립트의 위치
 *
 * 절기 검증의 본체는 test/solar-terms.test.ts 다. 거기서 천체력으로 황경을
 * 직접 풀어 1900~2050 전 구간을 대조하고, CI 에서 매번 돈다.
 *
 * 이건 그 위에 얹는 확인이다. 천체력 계산과 KASI 공식 발표가 또 갈리는
 * 경우는 사실상 없지만, "공식 기관 값과 맞춰봤다" 는 것과 "천문 알고리즘
 * 구현 둘이 서로 맞다" 는 것은 다른 문장이다. 한국에서 통용되는 절기 시각의
 * 최종 권위는 KASI 이므로 한 번은 직접 물어보는 편이 낫다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 실행
 *
 *   공공데이터포털(data.go.kr)에서 "천문연구원 특일 정보" 활용신청 후
 *
 *   KASI_SERVICE_KEY='발급받은키' pnpm verify:kasi 1957 1960 1988
 *
 * 연도를 안 주면 골든 케이스에 들어 있는 연도를 쓴다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 주의 — 아직 실키로 돌려보지 않았다
 *
 * 키 발급이 사람 손을 타는 절차라 응답 형태를 문서로만 보고 맞췄다.
 * 처음 돌릴 때 형태가 다르면 --raw 로 원본을 찍어보고 파서를 고칠 것.
 * 이 파일은 CI 에 넣지 않는다 — 외부 서비스가 죽으면 배포가 막힌다.
 */
import { Solar } from 'lunar-javascript';

const KEY = process.env.KASI_SERVICE_KEY;
const RAW = process.argv.includes('--raw');
const YEARS = process.argv.slice(2).filter((a) => /^\d{4}$/.test(a)).map(Number);

const BASE =
  'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo';

/** KASI 가 쓰는 절기 한글명 → 라이브러리 표의 중국어명 */
const NAME: Record<string, string> = {
  소한: '小寒', 대한: '大寒', 입춘: '立春', 우수: '雨水',
  경칩: '惊蛰', 춘분: '春分', 청명: '清明', 곡우: '谷雨',
  입하: '立夏', 소만: '小满', 망종: '芒种', 하지: '夏至',
  소서: '小暑', 대서: '大暑', 입추: '立秋', 처서: '处暑',
  백로: '白露', 추분: '秋分', 한로: '寒露', 상강: '霜降',
  입동: '立冬', 소설: '小雪', 대설: '大雪', 동지: '冬至',
};
const ALIAS: Record<string, string> = {
  DA_XUE: '大雪', DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒',
  LI_CHUN: '立春', YU_SHUI: '雨水', JING_ZHE: '惊蛰',
};

interface KasiItem {
  /** 절기명 */
  dateName?: string;
  /** YYYYMMDD */
  locdate?: number | string;
  /** HHMM (한국 표준시) */
  kst?: number | string;
  /** 태양 황경 */
  sunLongitude?: number | string;
}

async function fetchYear(year: number): Promise<KasiItem[]> {
  const items: KasiItem[] = [];
  for (let m = 1; m <= 12; m += 1) {
    const url =
      `${BASE}?serviceKey=${encodeURIComponent(KEY as string)}` +
      `&solYear=${year}&solMonth=${String(m).padStart(2, '0')}&numOfRows=50&_type=json`;
    const res = await fetch(url);
    const text = await res.text();
    if (RAW) console.log(`--- ${year}-${m} ---\n${text.slice(0, 800)}`);
    if (!text.trimStart().startsWith('{')) {
      throw new Error(`JSON 이 아닌 응답 (키 문제일 가능성): ${text.slice(0, 200)}`);
    }
    const body = JSON.parse(text) as {
      response?: { body?: { items?: { item?: KasiItem | KasiItem[] } } };
    };
    const item = body.response?.body?.items?.item;
    if (!item) continue;
    items.push(...(Array.isArray(item) ? item : [item]));
  }
  return items;
}

/** 라이브러리 절기표. 값은 UTC+8 벽시계이므로 KST 로 옮겨 비교한다. */
function libraryKst(year: number): Map<string, string> {
  const table = Solar.fromYmdHms(year, 6, 1, 12, 0, 0).getLunar().getJieQiTable();
  const out = new Map<string, string>();
  for (const [key, v] of Object.entries(table)) {
    if (v.getYear() !== year) continue;
    const kst = new Date(
      Date.UTC(v.getYear(), v.getMonth() - 1, v.getDay(), v.getHour(), v.getMinute(), v.getSecond()) +
        3_600_000, // UTC+8 벽시계 → KST 벽시계
    );
    out.set(
      ALIAS[key] ?? key,
      `${kst.getUTCFullYear()}${String(kst.getUTCMonth() + 1).padStart(2, '0')}${String(
        kst.getUTCDate(),
      ).padStart(2, '0')} ${String(kst.getUTCHours()).padStart(2, '0')}:${String(
        kst.getUTCMinutes(),
      ).padStart(2, '0')}`,
    );
  }
  return out;
}

async function main(): Promise<void> {
  if (!KEY) {
    console.error(
      'KASI_SERVICE_KEY 가 없습니다.\n' +
        '  공공데이터포털에서 "천문연구원 특일 정보" 를 신청한 뒤\n' +
        "  KASI_SERVICE_KEY='키' pnpm verify:kasi 1957\n",
    );
    process.exit(2);
  }

  const years = YEARS.length > 0 ? YEARS : [1957, 1960, 1988, 2024];
  let checked = 0;
  let mismatched = 0;

  for (const y of years) {
    const kasi = await fetchYear(y);
    const lib = libraryKst(y);
    for (const it of kasi) {
      const cn = NAME[String(it.dateName ?? '').trim()];
      if (!cn) continue; // 절기가 아닌 특일(공휴일 등)
      const ours = lib.get(cn);
      if (!ours) {
        console.log(`  ? ${y} ${it.dateName} — 라이브러리 표에 없음`);
        continue;
      }
      const d = String(it.locdate ?? '');
      const t = String(it.kst ?? '').padStart(4, '0');
      const theirs = `${d} ${t.slice(0, 2)}:${t.slice(2, 4)}`;
      checked += 1;
      if (theirs !== ours) {
        mismatched += 1;
        console.log(`  ✗ ${y} ${it.dateName}  KASI ${theirs}  vs  우리 ${ours}`);
      }
    }
    console.log(`${y}: ${kasi.length}건 응답`);
  }

  console.log(`\n대조 ${checked}건 · 불일치 ${mismatched}건`);
  // KASI 는 분 단위로 발표한다. 초 반올림 때문에 1분 차가 날 수 있으므로
  // 불일치가 나오면 사람이 직접 보고 판단할 것 — 자동으로 실패시키지 않는다.
  process.exit(0);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
