# MCP 서버

> 계산을 다른 AI 에게 연다.

[← 명리서재](../README.md)

## MCP 서버 — 계산을 다른 AI에게 연다

이 프로젝트가 실제로 판 건 만세력 정확도 하나다. 화면은 한 사람이 자기
사주를 볼 때 쓰이지만, 계산 자체는 다른 AI가 도구로 부를 때 더 넓게 쓰인다.
그래서 엔진을 MCP 서버로 그대로 연다.

```bash
pnpm build:mcp        # dist-mcp/server.js 하나로 번들
pnpm mcp              # 개발 중에는 tsx 로 직접
```

등록:

```json
{
  "mcpServers": {
    "myeongri-seojae": {
      "command": "node",
      "args": ["/절대경로/dist-mcp/server.js"]
    }
  }
}
```

| 도구 | 하는 일 |
|---|---|
| `calculate_saju` | 사주팔자 + 일간·오행·십성 |
| `get_daeun_timeline` | 대운 10칸. 십성·십이운성 포함 |
| `analyze_natal` | 신강신약·용신·궁위·오행균형·신살 |
| `check_compatibility` | 두 사람 궁합 (점수 없음) |
| `get_fortune` | 오늘 일진 · 올해 세운 |
| `check_timezone_data` | 이 런타임의 tzdata 가 한국 표준시 이력을 아는가 |

### 다른 사주 MCP와 다른 점 — 근거를 같이 낸다

조사해본 다른 구현들은 결과만 준다. 여기서는 모든 응답에 계산 근거가 붙는다.

```json
"calculationBasis": {
  "standardOffsetMinutes": 510,
  "standardOffsetLabel": "UTC+8:30",
  "trueSolarOffsetMinutes": -2.09,
  "daylightSaving": false,
  "hourUnknown": false,
  "note": "한국은 표준자오선이 네 번 바뀌었고 …"
}
```

음력으로 물어보면 어느 양력 날짜로 옮겼는지도 함께 낸다.

```json
"lunarInput": { "year": 2017, "month": 5, "leapMonth": true, "day": 10 },
"resolvedSolarDate": "2017-07-03",
"lunarBasis": "한국천문연구원 음양력 기준(KST). 중국 음력(UTC+8)과는 …"
```

부르는 쪽이 이 값으로 결과를 신뢰하거나 반박할 수 있다. 1954~61년생은
구현마다 결과가 갈리는데, 근거가 없으면 어느 쪽이 맞는지 판단할 방법이 없다.
음력도 마찬가지다 — 2017년 윤5월은 중국 음력에 아예 없는 달이다.

`calculationBasis` 누락은 조용한 퇴행이다 — 결과값은 그대로인데 근거만
빠지면 이 서버의 존재 이유가 사라지면서 아무 테스트도 깨지지 않는다.
그래서 `test/mcp.test.ts` 는 도구 목록을 돌면서 전수로 확인한다.

### 기존 구현 조사 — hjsh200219/fortuneteller

같은 일을 하는 MCP가 이미 있다. 읽어보니 시간 처리를 **제대로 하려고 한**
드문 구현이었다. tzdata 를 실제로 참조해 당시 표준시를 구한다. 그런데 그
다음이 어긋난다.

- 진태양시 보정을 **135° 기준**으로 계산한 뒤, 그 결과를 다시 **당시
  표준시** 로 읽는다. 135°는 UTC+9 의 자오선이므로, 표준시가 UTC+9가
  아니었던 구간에서는 보정이 이중으로 들어간다. 1954~61년(UTC+8:30)과
  서머타임 구간에서 `당시표준시 − 9h` 만큼 어긋난다
- `calculateYearPillar` 가 `date.getFullYear()` 를 쓴다. 이건 실행 머신의
  로컬 타임존을 따르므로, 서버가 어디서 도는지에 따라 연주가 달라진다

여기서는 보정량을 상수로 두지 않고 **(당시 표준시 오프셋 − 경도/15h)** 로
매번 계산하고, 절기표가 UTC+8 기준이라는 사실에 맞춰 년주·월주는 UTC+8
필드로, 일주·시주는 진태양시 필드로 따로 뽑는다. 두 타임라인의 차이는
서울 기준 27분 55초다.

> 앞선 조사에서 이 구현이 −30분 고정 보정을 쓴다고 적었는데 그건 틀렸다.
> `TRUE_SOLAR_TIME_ADJUSTMENT = -30` 은 legacy 로 표시돼 있고 사주 계산에
> 쓰이지 않는다. 실제 문제는 위의 두 가지다.
