/**
 * 명리서재 — 만세력 계산 (lunar-javascript 래핑)
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 라이브러리를 두 번 호출하는가
 *
 * lunar-javascript 의 절기표는 UTC+8 기준으로 계산돼 있다.
 *   검증: 1957 입춘 = 1957-02-04 09:54:37  (= UTC 01:54:37 + 8h)
 *
 * 년주·월주는 "출생 순간이 절기 순간보다 앞이냐 뒤냐"로 정해진다.
 * 두 순간의 비교이므로 같은 타임라인에 올려놓기만 하면 되고, 경도
 * 보정분은 양변에서 상쇄된다. 따라서 라이브러리에는 출생시각을 UTC+8 로
 * 읽어서 주면 절기 비교가 정확해진다.        →  cstFields
 *
 * 반면 시주는 "해가 하늘 어디에 있었나"이므로 진태양시여야 하고,
 * 일주도 진태양시 기준 날짜여야 한다.          →  solarFields
 *
 * 두 필드는 27분 55초 차이가 난다. 절기 경계 ±28분에 태어난 사람에게
 * 실제로 다른 결과를 준다. 그래서 한 번 호출로 뭉개지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 야자시
 *
 * 라이브러리 기본(sect 2)은 23:00~24:00 출생 시 시주만 다음날 자시로
 * 넘기고 일주는 당일로 유지한다. sect 1 은 일주까지 넘긴다.
 *   2026-03-10 23:30 → sect 2: 癸未 甲子 / sect 1: 甲申 甲子
 * 유파 차이이므로 정책으로 노출한다.
 */

import { Solar } from 'lunar-javascript';
import {
  ANIMAL_BY_HANJA,
  BRANCH_ELEMENT,
  BRANCH_KO,
  ELEMENT_ORDER,
  STEM_ELEMENT,
  STEM_KO,
  TEN_GOD_BY_HANJA,
  branchIndex,
  stemIndex,
} from './constants';
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

const toTenGod = (hanja: string): TenGod | null => TEN_GOD_BY_HANJA[hanja] ?? null;

/** 지지 십성은 배열(지장간별)로 오기도 한다. 대표값(정기)만 쓴다. */
const firstTenGod = (v: string | string[]): TenGod | null => {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw ? toTenGod(raw) : null;
};

const eightCharAt = (f: CalendarFields, sect: 1 | 2) => {
  const solar = Solar.fromYmdHms(f.year, f.month, f.day, f.hour, f.minute, f.second);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(sect);
  return { lunar, ec };
};

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
  const sect: 1 | 2 = input.yajasi === 'advance-day' ? 1 : 2;

  try {
    // ── 년주·월주: UTC+8 타임라인 (라이브러리 절기표와 같은 기준) ──
    const cst = eightCharAt(solarTime.cstFields, sect);
    const yearPillar = pillarFromGanZhi(cst.ec.getYear());
    const monthPillar = pillarFromGanZhi(cst.ec.getMonth());

    // ── 일주·시주: 진태양시 타임라인 ──
    const sol = eightCharAt(solarTime.solarFields, sect);
    const dayPillar = pillarFromGanZhi(sol.ec.getDay());
    const hourPillar = input.hour.known ? pillarFromGanZhi(sol.ec.getTime()) : null;

    if (!yearPillar || !monthPillar || !dayPillar) {
      return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE, {
        year: cst.ec.getYear(),
        month: cst.ec.getMonth(),
        day: sol.ec.getDay(),
      });
    }

    const pillars: FourPillars = {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    };

    // ── 십성 ──
    // 십성은 일간 기준 상대값이라 어느 호출에서 읽어도 같아야 하지만,
    // 년/월은 cst, 시는 sol 에서 읽어 각 기둥과 짝을 맞춘다.
    const tenGods: SajuChart['tenGods'] = {
      year: {
        stem: toTenGod(cst.ec.getYearShiShenGan()) ?? '비견',
        branch: firstTenGod(cst.ec.getYearShiShenZhi()) ?? '비견',
      },
      month: {
        stem: toTenGod(cst.ec.getMonthShiShenGan()) ?? '비견',
        branch: firstTenGod(cst.ec.getMonthShiShenZhi()) ?? '비견',
      },
      day: {
        stem: '일간',
        branch: firstTenGod(sol.ec.getDayShiShenZhi()) ?? '비견',
      },
      hour: input.hour.known
        ? {
            stem: toTenGod(sol.ec.getTimeShiShenGan()) ?? '비견',
            branch: firstTenGod(sol.ec.getTimeShiShenZhi()) ?? '비견',
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
      dayMaster: dayPillar,
      elementCounts,
      tenGods,
      animal: ANIMAL_BY_HANJA[cst.lunar.getYearShengXiao()] ?? '',
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
