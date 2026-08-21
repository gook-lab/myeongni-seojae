/**
 * lunar-javascript 앰비언트 타입 선언
 *
 * 이 라이브러리는 타입을 제공하지 않는다. 우리가 실제로 쓰는 표면만
 * 좁게 선언해서 경계를 타입으로 고정한다. 여기 없는 메서드를 쓰려면
 * 먼저 이 파일에 추가해야 한다 — 그게 의도된 마찰이다.
 *
 * 주의: Solar.fromDate(Date) 는 **머신 로컬 타임존**으로 해석한다.
 * 우리는 항상 fromYmdHms 로 명시적 필드를 넘긴다. 그래서 fromDate 는
 * 일부러 선언하지 않는다.
 */
declare module 'lunar-javascript' {
  export interface SolarLike {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
    toYmd(): string;
    toYmdHms(): string;
    getLunar(): LunarLike;
    next(days: number): SolarLike;
  }

  export interface EightCharLike {
    /** 야자시 유파. 1 = 일주도 다음날로, 2 = 시주만 (기본) */
    setSect(sect: 1 | 2): void;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
    getYearGan(): string;
    getMonthGan(): string;
    getDayGan(): string;
    getTimeGan(): string;
    getYearShiShenGan(): string;
    getMonthShiShenGan(): string;
    getDayShiShenGan(): string;
    getTimeShiShenGan(): string;
    /** 지장간별 배열로 온다. 첫 원소가 정기. */
    getYearShiShenZhi(): string[];
    getMonthShiShenZhi(): string[];
    getDayShiShenZhi(): string[];
    getTimeShiShenZhi(): string[];
    getYearWuXing(): string;
    getMonthWuXing(): string;
    getDayWuXing(): string;
    getTimeWuXing(): string;
    getYearNaYin(): string;
    /** 십이운성(地勢). 원국 지지에만 제공된다 — 대운용은 core/twelve-stages.ts */
    getYearDiShi(): string;
    getMonthDiShi(): string;
    getDayDiShi(): string;
    getTimeDiShi(): string;
    /** @param gender 1 = 남, 0 = 여 */
    getYun(gender: 0 | 1, sect?: 1 | 2): YunLike;
  }

  export interface DaYunLike {
    getStartYear(): number;
    getEndYear(): number;
    getStartAge(): number;
    getEndAge(): number;
    getGanZhi(): string;
    getIndex(): number;
  }

  export interface YunLike {
    getStartYear(): number;
    getStartMonth(): number;
    getStartDay(): number;
    isForward(): boolean;
    getDaYun(n?: number): DaYunLike[];
  }

  export interface LunarLike {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getYearShengXiao(): string;
    getDayInGanZhi(): string;
    getEightChar(): EightCharLike;
    getJieQiTable(): Record<string, SolarLike>;
    getSolar(): SolarLike;
    toString(): string;
  }

  export interface LunarYearLike {
    /** 윤달. 없으면 0. */
    getLeapMonth(): number;
  }

  export const Solar: {
    fromYmd(year: number, month: number, day: number): SolarLike;
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): SolarLike;
  };

  export const Lunar: {
    /** 윤달은 month 를 음수로. 없는 윤달·없는 날짜는 throw 한다. */
    fromYmd(year: number, month: number, day: number): LunarLike;
    fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number,
    ): LunarLike;
  };

  export const LunarYear: {
    fromYear(year: number): LunarYearLike;
  };
}
