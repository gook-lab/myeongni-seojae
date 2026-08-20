import { normalize, resolveSolarYmd } from '../src/core/input';
import { toSolarTime } from '../src/core/korea-time';
import { computeChart } from '../src/core/manse';
import { buildTimeline } from '../src/core/daeun';
import type { RawFormValues } from '../src/core/types';

const run = (raw: Partial<RawFormValues>, label: string) => {
  const n = normalize({ calendar:'solar', gender:'남', hourKnown:true, hour:9, minute:30, year:1990, month:5, day:5, ...raw } as RawFormValues);
  if (!n.ok) return console.log(label, 'ERR', n.error.code);
  const s = resolveSolarYmd(n.value); if (!s.ok) return console.log(label,'ERR',s.error.code);
  const t = toSolarTime(n.value, { solarYmd: s.value }); if (!t.ok) return console.log(label,'ERR',t.error.code);
  const c = computeChart(n.value, t.value); if (!c.ok) return console.log(label,'ERR',c.error.code);
  const d = buildTimeline(n.value, t.value, c.value.dayMaster, { today: new Date(Date.UTC(2026,7,21)) });
  if (!d.ok) return console.log(label,'ERR',d.error.code, JSON.stringify(d.error.detail));
  const tl = d.value;
  console.log(`\n${label}  일간 ${c.value.dayMaster.stemHanja}${c.value.dayMaster.stem}  대운수 ${tl.startAge}세  ${tl.direction === 'forward' ? '순행' : '역행'}`);
  console.log('  ' + tl.entries.map(e =>
    `${e.isCurrent ? '▶' : ' '}${String(e.startAge).padStart(2)}세 ${e.pillar.stemHanja}${e.pillar.branchHanja} ${e.tenGod}(${e.category})`
  ).join('\n  '));
  if (tl.monthsToNextTransition !== null) console.log(`  다음 전환까지 ${tl.monthsToNextTransition}개월`);
};

run({ year:1957, month:6, day:15, gender:'남' }, '1957-06-15 남');
run({ year:1957, month:6, day:15, gender:'여' }, '1957-06-15 여');
run({ year:1990, month:5, day:5, gender:'남', hourKnown:false }, '1990-05-05 남 (시간 미상)');
run({ year:1990, month:5, day:5, gender:'남', hourKnown:true, hour:9, minute:30 }, '1990-05-05 남 (09:30)');
