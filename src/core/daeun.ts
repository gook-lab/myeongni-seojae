/**
 * 명리서재 — 대운 타임라인  ★주인공 기능★
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 이게 주인공인가
 *
 * 대부분의 사주 앱은 "오늘의 운세 87점"에 집중한다. 그런데 사람들이 진짜
 * 소름 돋는 순간은 오늘 점수가 아니라 자기 과거가 설명될 때다. 인생을
 * 10년 단위로 펼쳐놓고 "여기가 당신의 25~34세, 편관 대운"이라고 짚어주면
 * 사람들은 자기 인생을 그 표에 대조한다.
 *
 * 그리고 이건 알고리즘이 정확해야만 성립하는 유일한 기능이다. 오늘 운세는
 * 하루 틀려도 아무도 모르지만, 대운수가 1년 어긋나면 타임라인이 통째로
 * 밀린다. 정확도가 곧 재미가 되는 지점.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 계약: 이 모듈은 시주를 참조하지 않는다
 *
 * 대운은 년간의 음양과 성별로 순행/역행을 정하고, 월주에서 출발해
 * 절입까지의 일수로 대운수를 구한다. 시주는 어디에도 안 들어간다.
 *
 * 관객으로 잡은 부모님 세대는 태어난 시각을 모르는 경우가 흔하다.
 * 그런데 주인공 화면은 그 결손에 영향을 받지 않는다. 우연히 얻은
 * 이점이지만 계약으로 못박아 둔다 — 테스트가 이걸 지킨다.
 */

import { Solar } from 'lunar-javascript';
import { TEN_GOD_BY_HANJA, TEN_GOD_CATEGORY } from './constants';
import { ERROR_MESSAGES, err, ok, type SajuResult } from './errors';
import { pillarFromGanZhi } from './manse';
import type {
  BirthInput,
  DaeunEntry,
  DaeunTimeline,
  Pillar,
  SolarTimeResult,
  TenGod,
} from './types';

/** 대운 몇 개를 뽑을지. 8~10 개면 한 사람의 인생 전체를 덮는다. */
export const DAEUN_COUNT = 10;

/**
 * 일간 기준으로 어떤 천간이 몇 번째 십성인지.
 *
 * 라이브러리가 대운 간지만 주고 십성은 안 주므로 직접 구한다.
 * 오행 상생상극 + 음양 동이(同異) 로 결정된다.
 */
export function tenGodOf(dayStemIndex: number, otherStemIndex: number): TenGod {
  const el = (i: number) => Math.floor(i / 2); // 0목 1화 2토 3금 4수
  const yin = (i: number) => i % 2; // 0 양 1 음
  const de = el(dayStemIndex);
  const oe = el(otherStemIndex);
  const samePolarity = yin(dayStemIndex) === yin(otherStemIndex);

  const generates = (a: number) => (a + 1) % 5; // 상생: 내가 낳는 것
  const controls = (a: number) => (a + 2) % 5; // 상극: 내가 이기는 것

  if (oe === de) return samePolarity ? '비견' : '겁재';
  if (oe === generates(de)) return samePolarity ? '식신' : '상관';
  if (oe === controls(de)) return samePolarity ? '편재' : '정재';
  if (controls(oe) === de) return samePolarity ? '편관' : '정관';
  return samePolarity ? '편인' : '정인';
}

const STEM_HANJA_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

export interface BuildTimelineOptions {
  /** 오늘. 테스트에서 고정하기 위해 주입한다. */
  today?: Date;
}

/**
 * 대운 타임라인 생성.
 *
 * @param input      검증된 입력 (성별·야자시 정책을 읽는다)
 * @param solarTime  두 타임라인. 대운은 절기 기반이므로 cstFields 를 쓴다
 * @param dayMaster  일간 (십성 계산 기준)
 */
export function buildTimeline(
  input: BirthInput,
  solarTime: SolarTimeResult,
  dayMaster: Pillar,
  opts: BuildTimelineOptions = {},
): SajuResult<DaeunTimeline> {
  const today = opts.today ?? new Date();

  try {
    // 대운은 절기(절입)까지의 일수로 정해진다. 절기표와 같은 타임라인을 쓴다.
    const f = solarTime.cstFields;
    const ec = Solar.fromYmdHms(f.year, f.month, f.day, f.hour, f.minute, f.second)
      .getLunar()
      .getEightChar();
    ec.setSect(input.yajasi === 'advance-day' ? 1 : 2);

    const yun = ec.getYun(input.gender === '남' ? 1 : 0);
    const raw = yun.getDaYun(DAEUN_COUNT + 1);

    const dayStemIndex = STEM_HANJA_ORDER.indexOf(dayMaster.stemHanja);
    if (dayStemIndex < 0) {
      return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE, {
        reason: 'unknown day stem',
        stem: dayMaster.stemHanja,
      });
    }

    const birthYear = f.year;
    const currentYear = today.getUTCFullYear();

    const entries: DaeunEntry[] = [];
    for (const d of raw) {
      const ganZhi = d.getGanZhi();
      // 첫 원소는 대운 이전 구간이라 간지가 비어 있다. 건너뛴다.
      if (!ganZhi) continue;
      const pillar = pillarFromGanZhi(ganZhi);
      if (!pillar) continue;

      const stemIdx = STEM_HANJA_ORDER.indexOf(pillar.stemHanja);
      const tenGod = tenGodOf(dayStemIndex, stemIdx);
      const startYear = d.getStartYear();
      const endYear = d.getEndYear();

      entries.push({
        index: entries.length,
        startAge: d.getStartAge(),
        endAge: d.getEndAge(),
        startYear,
        endYear,
        pillar,
        tenGod,
        category: TEN_GOD_CATEGORY[tenGod],
        isCurrent: currentYear >= startYear && currentYear <= endYear,
      });
      if (entries.length >= DAEUN_COUNT) break;
    }

    if (entries.length === 0) {
      return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE, { reason: 'empty daeun' });
    }

    const first = entries[0] as DaeunEntry;
    const current = entries.find((e) => e.isCurrent) ?? null;
    const monthsToNextTransition = current
      ? monthsBetween(today, new Date(Date.UTC(current.endYear + 1, 0, 1)))
      : null;

    return ok({
      startAge: first.startAge,
      direction: yun.isForward() ? 'forward' : 'backward',
      entries,
      monthsToNextTransition,
    });
  } catch (e) {
    return err('INVALID_DATE', ERROR_MESSAGES.INVALID_DATE, {
      cause: e instanceof Error ? e.message : String(e),
      birthYear: solarTime.cstFields.year,
    });
  }
}

function monthsBetween(from: Date, to: Date): number {
  const months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());
  return Math.max(0, months);
}

/** 십성 한자를 한글로. 라이브러리가 십성을 줄 때 쓴다. */
export const tenGodFromHanja = (hanja: string): TenGod | null =>
  TEN_GOD_BY_HANJA[hanja] ?? null;
