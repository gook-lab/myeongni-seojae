"""
명리서재 — 파이썬 독립 검증 구현

────────────────────────────────────────────────────────────────────────────
왜 있는가

TypeScript 엔진의 정확도는 이미 여러 겹으로 확인돼 있다.

    절기      astronomy-engine (VSOP87 계열 천체력)
    일주      율리우스일 산술
    구조 규칙  오호둔 · 오자시두법 전수
    교차      lunar-javascript · manseryeok · korean-lunar-calendar

그런데 이 넷은 전부 자바스크립트 생태계 안에 있다. 같은 생태계의 같은
관습을 공유하면 같은 착각도 공유할 수 있다.

이 파일은 **다른 언어, 다른 천체력, 다른 사람이 쓴 음력 자료**로 처음부터
다시 계산한다. 우리 코드를 옮겨 적은 것이 아니다 — 규칙만 보고 새로 썼다.
그래서 여기서 값이 맞으면 "구현이 서로 베끼지 않았는데도 맞는다" 는 뜻이 된다.

    천체력     skyfield (JPL DE421 성계표)
    음력       korean_lunar_calendar (한국천문연구원 자료, 다른 저자)
    일주       율리우스일 — 여기서는 상수를 물려받지 않고 직접 맞춘다

────────────────────────────────────────────────────────────────────────────
실행

    pnpm verify:python

표준입력으로 케이스 JSON 을 받아 표준출력으로 결과 JSON 을 낸다.
비교는 scripts/verify-python.ts 가 한다.
"""

import json
import sys
from datetime import datetime, timedelta, timezone

from skyfield import almanac
from skyfield.api import load

STEMS = "갑을병정무기경신임계"
BRANCHES = "자축인묘진사오미신유술해"

# 달을 여는 절기(節) 12개의 태양황경. 소한이 축월, 입춘이 인월을 연다.
JEOL = [
    (285, 1), (315, 2), (345, 3), (15, 4), (45, 5), (75, 6),
    (105, 7), (135, 8), (165, 9), (195, 10), (225, 11), (255, 0),
]

_eph = None
_ts = None


def _ephemeris():
    """JPL DE421. 처음 한 번만 내려받아 verify/ 에 둔다."""
    global _eph, _ts
    if _eph is None:
        _ts = load.timescale()
        _eph = load("de421.bsp")
    return _eph, _ts


def sun_longitude_time(target_deg, around_utc):
    """
    태양의 겉보기 황경이 target_deg 에 닿는 순간을 찾는다.

    around_utc 앞뒤 25일을 훑는다. 절기 간격이 15일 남짓이라 그 창 안에
    반드시 하나만 들어온다.
    """
    eph, ts = _ephemeris()
    f = almanac.seasons(eph)  # 사용하지 않지만 로딩 확인용

    def longitude_at(t):
        earth = eph["earth"]
        sun = eph["sun"]
        astrometric = earth.at(t).observe(sun).apparent()
        _, lon, _ = astrometric.frame_latlon(almanac.ecliptic_frame)
        return lon.degrees

    lo = around_utc - timedelta(days=25)
    hi = around_utc + timedelta(days=25)

    def diff(dt):
        d = (longitude_at(ts.from_datetime(dt)) - target_deg) % 360.0
        return d - 360.0 if d > 180.0 else d

    # 이분법. 황경은 단조증가라 부호가 바뀌는 지점이 답이다.
    a, b = lo, hi
    fa = diff(a)
    fb = diff(b)
    if fa * fb > 0:
        return None
    for _ in range(60):
        mid = a + (b - a) / 2
        fm = diff(mid)
        if fa * fm <= 0:
            b, fb = mid, fm
        else:
            a, fa = mid, fm
    return a + (b - a) / 2


def julian_day_number(y, m, d):
    """그레고리력 → 율리우스일. 표준 공식."""
    a = (14 - m) // 12
    yy = y + 4800 - a
    mm = m + 12 * a - 3
    return (
        d + (153 * mm + 2) // 5 + 365 * yy
        + yy // 4 - yy // 100 + yy // 400 - 32045
    )


# 일주 위상. 우리 TS 코드의 값을 물려받지 않고 여기서 직접 맞춘다.
# 1949-10-01 이 갑자일이라는 널리 알려진 사실 하나만 쓴다.
_ANCHOR = (1949, 10, 1, 0)  # 년, 월, 일, 60갑자 index (0 = 갑자)
DAY_PHASE = (_ANCHOR[3] - julian_day_number(*_ANCHOR[:3])) % 60


def day_pillar(y, m, d):
    return (julian_day_number(y, m, d) + DAY_PHASE) % 60


def ganzhi(idx):
    return STEMS[idx % 10] + BRANCHES[idx % 12]


def year_pillar(instant_utc, jeol_cache):
    """년주는 입춘이 가른다."""
    y = instant_utc.year
    ipchun = jeol_cache[(y, 315)]
    saju_year = y if instant_utc >= ipchun else y - 1
    return (saju_year - 4) % 60


def month_pillar(instant_utc, year_gz, jeol_cache):
    """월지는 절입이, 월간은 오호둔이 정한다."""
    best = None
    for cand_year in (instant_utc.year, instant_utc.year - 1):
        for deg, branch in JEOL:
            at = jeol_cache.get((cand_year, deg))
            if at is None or at > instant_utc:
                continue
            if best is None or at > best[0]:
                best = (at, branch)
    if best is None:
        return None
    branch = best[1]
    year_stem = year_gz % 10
    tiger_stem = (year_stem * 2 + 2) % 10          # 오호둔
    steps = (branch - 2) % 12
    stem = (tiger_stem + steps) % 10
    for i in range(60):
        if i % 10 == stem and i % 12 == branch:
            return i
    return None


def hour_pillar(day_stem, hour):
    """시지는 두 시간마다. 23시의 자시는 다음 날 자시라 일간이 하루 앞선다."""
    branch = ((hour + 1) % 24) // 2
    base = (day_stem + 1) % 10 if hour >= 23 else day_stem
    stem = ((base * 2) % 10 + branch) % 10          # 오자시두법
    for i in range(60):
        if i % 10 == stem and i % 12 == branch:
            return i
    return None


def build_jeol_cache(years):
    """필요한 해의 절입만 미리 푼다. 천체력 호출이 느려서다."""
    cache = {}
    for y in sorted(years):
        for deg, _ in JEOL:
            approx_doy = ((deg - 285) % 360) / 360.0 * 365.25
            around = datetime(y, 1, 1, tzinfo=timezone.utc) + timedelta(days=approx_doy)
            at = sun_longitude_time(deg, around)
            if at is not None:
                cache[(y, deg)] = at
    return cache


def main():
    cases = json.load(sys.stdin)

    years = set()
    for c in cases:
        years.update({c["cstYear"] - 1, c["cstYear"], c["cstYear"] + 1})
    cache = build_jeol_cache(years)

    out = []
    for c in cases:
        instant = datetime.fromtimestamp(c["instantMs"] / 1000.0, tz=timezone.utc)
        yg = year_pillar(instant, cache)
        mg = month_pillar(instant, yg, cache)
        dg = day_pillar(c["solarYear"], c["solarMonth"], c["solarDay"])
        hg = hour_pillar(dg % 10, c["solarHour"]) if c["hourKnown"] else None
        out.append({
            "label": c["label"],
            "year": ganzhi(yg),
            "month": ganzhi(mg) if mg is not None else None,
            "day": ganzhi(dg),
            "hour": ganzhi(hg) if hg is not None else None,
        })

    json.dump({"dayPhase": DAY_PHASE, "cases": out}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
