/**
 * 파이썬 독립 구현과 대조한다
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 네 번째 시선이 필요한가
 *
 * 지금까지의 대조 상대는 lunar-javascript · manseryeok ·
 * korean-lunar-calendar · astronomy-engine 이다. 정확도는 여러 겹으로
 * 확인됐지만 **넷 다 자바스크립트 생태계 안에 있다.** 같은 생태계의 같은
 * 관습을 공유하면 같은 착각도 공유할 수 있다.
 *
 * verify/reference.py 는 다른 언어에서, 다른 천체력(JPL DE421)으로,
 * 다른 저자의 음력 자료로 처음부터 다시 계산한다. 우리 코드를 옮겨
 * 적은 것이 아니라 규칙만 보고 새로 쓴 것이다.
 *
 * 일주 위상 상수도 물려주지 않는다. 파이썬 쪽은 "1949-10-01 이 갑자일"
 * 이라는 사실 하나에서 스스로 구한다. 그 값이 우리 49 와 같게 나오는지가
 * 곧 검증이다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 실행
 *
 *   pnpm verify:python           기본 표본
 *   pnpm verify:python 400       표본 수 지정
 *
 * CI 에는 넣지 않는다 — 천체력 파일(17MB)과 파이썬 환경이 필요해서
 * 배포 게이트에 매달 일이 아니다. 손으로 돌리는 확인이다.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { computeChart } from '../src/core/manse';
import { normalize, resolveSolarYmd } from '../src/core/input';
import { toSolarTime } from '../src/core/korea-time';
import type { RawFormValues } from '../src/core/types';

const PY = 'verify/.venv/bin/python';
const SCRIPT = 'verify/reference.py';

if (!existsSync(PY)) {
  console.error(
    '파이썬 환경이 없습니다. 한 번만 만들어 두세요:\n' +
      '  python3 -m venv verify/.venv\n' +
      '  verify/.venv/bin/pip install skyfield korean_lunar_calendar\n',
  );
  process.exit(2);
}

const COUNT = Number(process.argv[2] ?? 120);

/** 표본. 절기 경계·표준시 이력·서머타임·야자시가 골고루 걸리게 흩는다. */
function sample(i: number): RawFormValues {
  const year = 1912 + ((i * 37) % 138); // 1912~2049
  const month = 1 + ((i * 7) % 12);
  const day = 1 + ((i * 11) % 28);
  const hour = (i * 5) % 24;
  return {
    calendar: 'solar',
    year, month, day,
    leapMonth: false,
    hourKnown: true,
    hour,
    minute: (i * 13) % 60,
    gender: i % 2 === 0 ? '남' : '여',
    longitude: 126.978,
    yajasi: 'preserve-day',
    applyEquationOfTime: false,
  };
}

interface PyCase {
  label: string;
  instantMs: number;
  cstYear: number;
  solarYear: number;
  solarMonth: number;
  solarDay: number;
  solarHour: number;
  hourKnown: boolean;
}

const ours: Array<{ label: string; year: string; month: string; day: string; hour: string | null }> = [];
const forPython: PyCase[] = [];

for (let i = 0; i < COUNT; i += 1) {
  const raw = sample(i);
  const n = normalize(raw);
  if (!n.ok) continue;
  const s = resolveSolarYmd(n.value);
  if (!s.ok) continue;
  const t = toSolarTime(n.value, { solarYmd: s.value });
  if (!t.ok) continue;
  const c = computeChart(n.value, t.value, s.value);
  if (!c.ok) continue;

  const cst = t.value.cstFields;
  const sol = t.value.solarFields;
  const label = `${raw.year}-${raw.month}-${raw.day} ${raw.hour}시`;
  const p = c.value.pillars;

  ours.push({
    label,
    year: `${p.year.stem}${p.year.branch}`,
    month: `${p.month.stem}${p.month.branch}`,
    day: `${p.day.stem}${p.day.branch}`,
    hour: p.hour ? `${p.hour.stem}${p.hour.branch}` : null,
  });
  forPython.push({
    label,
    // 년·월주는 순간으로 견준다. UTC+8 벽시계를 순간으로 되돌린다.
    instantMs: Date.UTC(cst.year, cst.month - 1, cst.day, cst.hour, cst.minute, cst.second)
      - 8 * 3_600_000,
    cstYear: cst.year,
    // 일·시주는 진태양시 날짜와 시각으로 정해진다.
    solarYear: sol.year, solarMonth: sol.month, solarDay: sol.day, solarHour: sol.hour,
    hourKnown: true,
  });
}

console.log(`표본 ${ours.length}건 · 파이썬 쪽 계산을 기다립니다 (천체력이라 조금 걸립니다)…`);

const run = spawnSync(PY, [SCRIPT], {
  input: JSON.stringify(forPython),
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
if (run.status !== 0) {
  console.error(run.stderr || '파이썬 실행 실패');
  process.exit(1);
}

const py = JSON.parse(run.stdout) as {
  dayPhase: number;
  cases: Array<{ label: string; year: string; month: string; day: string; hour: string | null }>;
};

console.log(`\n일주 위상 상수 — 우리 49 · 파이썬 ${py.dayPhase} ${py.dayPhase === 49 ? '✓' : '✗'}`);
console.log('  파이썬은 이 값을 물려받지 않고 "1949-10-01 이 갑자일" 하나에서 스스로 구합니다.\n');

const bad: string[] = [];
const counts = { year: 0, month: 0, day: 0, hour: 0 };
for (let i = 0; i < ours.length; i += 1) {
  const a = ours[i];
  const b = py.cases[i];
  if (!a || !b) continue;
  for (const k of ['year', 'month', 'day', 'hour'] as const) {
    if (a[k] !== b[k]) {
      counts[k] += 1;
      if (bad.length < 10) bad.push(`${a.label} ${k}주 — 우리 ${a[k]} / 파이썬 ${b[k]}`);
    }
  }
}

console.log(`대조 ${ours.length}건`);
console.log(`  년주 ${counts.year} · 월주 ${counts.month} · 일주 ${counts.day} · 시주 ${counts.hour}`);
for (const line of bad) console.log(`    ${line}`);

const total = counts.year + counts.month + counts.day + counts.hour;
console.log(total === 0 ? '\n전부 일치합니다.' : `\n★불일치 ${total}건 — 조사가 필요합니다★`);
process.exit(total === 0 && py.dayPhase === 49 ? 0 : 1);
