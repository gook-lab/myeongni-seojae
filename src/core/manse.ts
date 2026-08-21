/**
 * 명리서재 — 만세력 계산
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 여기는 조립만 한다
 *
 * 네 기둥을 세우는 규칙 자체는 core/pillars.ts 에 있다. 절기표도 우리가
 * 만든 것이다(core/data/solar-terms.ts). 이 파일은 그 규칙에 두 타임라인을
 * 물려주고 결과를 화면이 쓰는 모양으로 옮긴다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 두 타임라인
 *
 * 년주·월주는 "출생 순간이 절기 순간보다 앞이냐 뒤냐"로 정해진다.
 * 순간과 순간의 비교이므로 벽시계가 아니라 **UTC 순간**으로 견준다.
 * cstFields(UTC+8 벽시계)를 순간으로 되돌려 쓴다.
 *
 * 시주는 "해가 하늘 어디에 있었나"이므로 진태양시여야 하고, 일주도
 * 진태양시 기준 날짜여야 한다.                →  solarFields
 *
 * 두 필드는 서울 기준 27분 55초 차이가 난다. 절기 경계 ±28분에 태어난
 * 사람에게 실제로 다른 결과를 준다. 그래서 한 번에 뭉개지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 야자시
 *
 * 자시는 23시에 시작해 다음 날 01시에 끝난다. 그래서 23시대 출생의 자시는
 * 다음 날에 속한 자시이고, 시주 천간은 다음 날 일간에서 나온다.
 * 일주까지 다음 날로 넘길지는 유파가 갈려 정책으로 노출한다.
 *   2026-03-10 23:30 → 야자시: 癸未 甲子 / 조자시: 甲申 甲子
 */

import {
  BRANCH_ELEMENT,
  BRANCH_KO,
  ELEMENT_ORDER,
  STEM_ELEMENT,
  STEM_KO,
  branchIndex,
  stemIndex,
} from './constants';
import {
  ANIMALS,
  BRANCH_HANJA,
  STEM_HANJA,
  branchTenGods,
  dayPillar,
  fromSexagenary,
  hourPillar,
  monthPillar,
  sexagenaryIndex,
  tenGodBetween,
  yearPillar,
  type GanZhi,
} from './pillars';
import { err, ok, type SajuResult } from './errors';
import { ERROR_MESSAGES } from './errors';
import type {
  BirthInput,
  CalendarFields,
  Element,
  FourPillars,
  Pillar,
  SajuChart,
  SolarTimeResult,
  TenGod,
} from './types';

/** 간지 두 글자(한자)를 Pillar 로. */
export function pillarFromGanZhi(ganZhi: string): Pillar | null {
  if (!ganZhi || ganZhi.length < 2) return null;
  const sHanja = ganZhi[0] as string;
  const bHanja = ganZhi[1] as string;
  const si = stemIndex(sHanja);
  const bi = branchIndex(bHanja);
  if (si < 0 || bi < 0) return null;
  return {
    stem: STEM_KO[si] as Pillar['stem'],
    branch: BRANCH_KO[bi] as Pillar['branch'],
    stemHanja: sHanja,
    branchHanja: bHanja,
    stemElement: STEM_ELEMENT[si] as Element,
    branchElement: BRANCH_ELEMENT[bi] as Element,
  };
}

/** GanZhi(숫자 쌍) → 화면이 쓰는 Pillar */
function pillarOf(gz: GanZhi): Pillar {
  return {
    stem: STEM_KO[gz.stem] as Pillar['stem'],
    branch: BRANCH_KO[gz.branch] as Pillar['branch'],
    stemHanja: STEM_HANJA[gz.stem] as string,
    branchHanja: BRANCH_HANJA[gz.branch] as string,
    stemElement: STEM_ELEMENT[gz.stem] as Element,
    branchElement: BRANCH_ELEMENT[gz.branch] as Element,
  };
}

/** UTC+8 벽시계 필드를 그 순간(UTC ms)으로 되돌린다. */
const instantOfCst = (f: CalendarFields): number =>
  Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second) - 8 * 3_600_000;

/**
 * 사주 원국 계산.
 *
 * @param input      검증된 입력
 * @param solarTime  korea-time.toSolarTime() 결과 — 두 타임라인을 담고 있다
 */
export function computeChart(
  input: BirthInput,
  solarTime: SolarTimeResult,
  solarDate: { year: number; month: number; day: number },
): SajuResult<SajuChart> {
  try {
    // ── 년주·월주: 절기가 가른다. 순간으로 견준다 ──
    const instant = instantOfCst(solarTime.cstFields);
    const yearGz = yearPillar(instant);
    const monthGz = monthPillar(instant);
    if (!yearGz || !monthGz) {
      return err('OUT_OF_RANGE_YEAR', ERROR_MESSAGES.OUT_OF_RANGE_YEAR, {
        reason: '절기표 범위 밖',
        year: solarTime.cstFields.year,
      });
    }

    // ── 일주·시주: 진태양시 타임라인 ──
    const sf = solarTime.solarFields;
    const solDay = dayPillar(sf.year, sf.month, sf.day);

    /*
     * 조자시(advance-day)는 23시대 출생의 일주까지 다음 날로 넘긴다.
     * 야자시(preserve-day, 기본)는 일주를 당일로 두고 시주만 넘긴다.
     * 시주 쪽 처리는 hourPillar 가 규칙으로 갖고 있다.
     */
    const lateZi = input.hour.known && sf.hour >= 23;
    const dayGz =
      lateZi && input.yajasi === 'advance-day'
        ? fromSexagenary(sexagenaryIndex(solDay) + 1)
        : solDay;

    const hourGz = input.hour.known ? hourPillar(solDay.stem, sf.hour) : null;

    const pillars: FourPillars = {
      year: pillarOf(yearGz),
      month: pillarOf(monthGz),
      day: pillarOf(dayGz),
      hour: hourGz ? pillarOf(hourGz) : null,
    };

    // ── 십성 ── 일간이 다른 글자를 어떻게 보는가. 규칙으로 낸다.
    const dm = dayGz.stem;
    const tenGods: SajuChart['tenGods'] = {
      year: {
        stem: tenGodBetween(dm, yearGz.stem) as TenGod,
        branch: branchTenGods(dm, yearGz.branch)[0] as TenGod,
      },
      month: {
        stem: tenGodBetween(dm, monthGz.stem) as TenGod,
        branch: branchTenGods(dm, monthGz.branch)[0] as TenGod,
      },
      day: {
        stem: '일간',
        branch: branchTenGods(dm, dayGz.branch)[0] as TenGod,
      },
      hour: hourGz
        ? {
            stem: tenGodBetween(dm, hourGz.stem) as TenGod,
            branch: branchTenGods(dm, hourGz.branch)[0] as TenGod,
          }
        : null,
    };

    // ── 오행 분포 ──
    // 시주가 없으면 8글자가 아니라 6글자 기준이 된다. UI 가 이 사실을 표시한다.
    const elementCounts = countElements(pillars);

    return ok({
      input,
      solarDate,
      solarTime,
      pillars,
      dayMaster: pillars.day,
      elementCounts,
      tenGods,
      // 띠는 년지 그대로다 — 자는 쥐, 축은 소.
      animal: ANIMALS[yearGz.branch] as string,
      hourUnknown: !input.hour.known,
    });
  } catch (e) {
    return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE, {
      cause: e instanceof Error ? e.message : String(e),
    });
  }
}

export function countElements(pillars: FourPillars): Record<Element, number> {
  const counts = Object.fromEntries(ELEMENT_ORDER.map((el) => [el, 0])) as Record<
    Element,
    number
  >;
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(
    (p): p is Pillar => p !== null,
  );
  for (const p of list) {
    counts[p.stemElement] += 1;
    counts[p.branchElement] += 1;
  }
  return counts;
}
