/**
 * 절기표 생성기
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 우리 표를 만드나
 *
 * 지금까지 네 기둥은 lunar-javascript 가 계산했다. 해석(대운·용신·신살)은
 * 우리 알고리즘인데 정작 뼈대는 남의 것이었다.
 *
 * 그 라이브러리가 쓰는 규칙은 전부 독립 검증해뒀다 —
 * 절기는 천체력으로(test/solar-terms.test.ts), 일주는 율리우스일로,
 * 월주·시주 천간은 오호둔·오자시두법으로(test/day-pillar.test.ts).
 * 직접 계산할 재료가 다 있다는 뜻이다.
 *
 * 남은 것 하나가 절기 시각이다. 브라우저에서 천체력을 돌리기엔 무거우므로
 * 여기서 미리 뽑아 표로 만든다. 만드는 코드가 검증에 쓴 코드와 같다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 인코딩
 *
 * 1900~2100년 × 24절기 = 4,824개. 평문 JSON 이면 32KB 다.
 * 해마다 1월 1일 00:00 UTC 로부터의 **초**를 구하고, 앞 값과의 차를
 * 36진수로 적는다. 절기 간격이 15일 남짓이라 차가 작아진다.
 *
 * 초를 버리면 안 된다. 처음엔 분으로 반올림했다가 1977년 입추(23:30:25)가
 * 23:30:00 이 되어, 23시 30분에 태어난 사람이 경계 위에 얹히면서 월주가
 * 한 칸 어긋났다. 한 글자 더 쓰고 그 사고를 없앤다.
 *
 * 실행:  pnpm gen:terms
 */
import { writeFileSync } from 'node:fs';
import * as Astro from 'astronomy-engine';

const DAY = 86_400_000;
const FROM = 1900;
const TO = 2100;

/**
 * 태양황경 24개를 소한(285°)부터 30°씩. 이 순서가 곧 표의 순서다.
 * 홀수 자리(0,2,4…)가 달을 여는 절기(節), 짝수 자리가 중기(中氣)다.
 */
const LONGITUDES = [
  285, 300, 315, 330, 345, 0, 15, 30, 45, 60, 75, 90,
  105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270,
];

function termsOfYear(year: number): number[] {
  const out: number[] = [];
  for (const lon of LONGITUDES) {
    const approx = Date.UTC(year, 0, 1) + (((lon - 285 + 360) % 360) / 360) * 365.25 * DAY;
    const found = Astro.SearchSunLongitude(lon, new Astro.AstroTime(new Date(approx - 20 * DAY)), 42);
    if (!found) throw new Error(`${year}년 황경 ${lon}° 탐색 실패`);
    out.push(Math.round((found.date.getTime() - Date.UTC(year, 0, 1)) / 1000));
  }
  return out;
}

const rows: string[] = [];
for (let y = FROM; y <= TO; y += 1) {
  const mins = termsOfYear(y);
  let prev = 0;
  rows.push(
    mins
      .map((v) => {
        const d = v - prev;
        prev = v;
        return d.toString(36);
      })
      .join(','),
  );
}

const encoded = rows.join(';');

const file = `/**
 * 절기표 — 자동 생성. 손으로 고치지 말 것.
 *
 * scripts/gen-solar-terms.ts 가 astronomy-engine(VSOP87 기반 천체력)으로
 * 태양의 겉보기 황경이 15°의 배수에 닿는 순간을 직접 풀어 만든다.
 * 다시 만들려면  pnpm gen:terms
 *
 * 값은 그 해 1월 1일 00:00 **UTC** 로부터의 초이며, 앞 값과의 차를
 * 36진수로 적었다. 벽시계가 아니라 순간이므로 시간대에 흔들리지 않는다.
 *
 * ${FROM}~${TO}년 × 24절기 = ${rows.length * 24}개.
 */

export const TERMS_FROM_YEAR = ${FROM};
export const TERMS_TO_YEAR = ${TO};

/** 소한부터 30°씩. 홀수 번째(0,2,4…)가 달을 여는 절기(節)다. */
export const TERM_NAMES = [
  '소한', '대한', '입춘', '우수', '경칩', '춘분',
  '청명', '곡우', '입하', '소만', '망종', '하지',
  '소서', '대서', '입추', '처서', '백로', '추분',
  '한로', '상강', '입동', '소설', '대설', '동지',
] as const;

export const TERM_LONGITUDES = [
  ${LONGITUDES.join(', ')},
] as const;

const ENCODED =
  '${encoded}';

const cache = new Map<number, number[]>();

/**
 * 그 해 24절기의 UTC 순간(ms). 범위 밖이면 null.
 *
 * 한 해를 처음 물으면 그때 풀고 기억해둔다 — 사주 한 벌에 두세 해면 되므로
 * 전체를 미리 펼칠 이유가 없다.
 */
export function solarTermsOf(year: number): number[] | null {
  if (year < TERMS_FROM_YEAR || year > TERMS_TO_YEAR) return null;
  const hit = cache.get(year);
  if (hit) return hit;

  const row = ENCODED.split(';')[year - TERMS_FROM_YEAR];
  if (!row) return null;

  const base = Date.UTC(year, 0, 1);
  let acc = 0;
  const out = row.split(',').map((part) => {
    acc += Number.parseInt(part, 36);
    return base + acc * 1000;
  });
  cache.set(year, out);
  return out;
}
`;

writeFileSync('src/core/data/solar-terms.ts', file);
console.log(`절기표 생성: ${rows.length}년 × 24 = ${rows.length * 24}개`);
console.log(`인코딩 크기: ${(encoded.length / 1024).toFixed(1)}KB`);
