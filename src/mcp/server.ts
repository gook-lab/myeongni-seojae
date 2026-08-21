/**
 * 명리서재 MCP 서버
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 MCP 로 여는가
 *
 * 이 프로젝트가 실제로 판 건 만세력 정확도 하나다. 화면은 한 사람이 자기
 * 사주를 보는 데 쓰이지만, 계산 자체는 다른 AI 가 도구로 부를 때 더 넓게
 * 쓰인다. 정확한 만세력이 필요한 쪽에 그대로 내주는 것이 이 서버다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 다른 사주 MCP 와 다른 점 — 근거를 같이 낸다
 *
 * 조사해본 다른 구현들은 결과만 준다. 여기서는 모든 응답에 계산 근거를
 * 함께 담는다.
 *
 *   standardOffsetMinutes  출생 당시 한국 표준시가 몇 분이었는지
 *   trueSolarOffsetMinutes 진태양시 보정이 몇 분이었는지
 *   daylightSaving         서머타임 구간이었는지
 *
 * 이게 있어야 부르는 쪽이 결과를 신뢰하거나 반박할 수 있다.
 * 특히 1954~61년생은 다른 구현과 결과가 갈리는데, 근거가 없으면 어느
 * 쪽이 맞는지 판단할 방법이 없다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 실행
 *   pnpm mcp          개발 (tsx)
 *   node dist-mcp/server.js   빌드 후
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { isTzdataUsable, tzdataDiagnostics } from '../core/korea-time.js';
import { REGIONS, SEOUL } from '../core/regions.js';
import type { RawFormValues, SajuChart } from '../core/types.js';
import { computeGunghap, computeReading } from '../engine/index.js';

const VERSION = '0.1.0';

/** 모든 도구가 공유하는 생년월일 입력 스키마 */
const BIRTH_PROPS = {
  year: { type: 'number', description: '출생 연도 (1900~2100)' },
  month: { type: 'number', description: '월 (1~12)' },
  day: { type: 'number', description: '일' },
  calendar: {
    type: 'string',
    enum: ['solar', 'lunar'],
    default: 'solar',
    description: '양력(solar) 또는 음력(lunar)',
  },
  leapMonth: {
    type: 'boolean',
    default: false,
    description: '음력 윤달 여부. calendar=lunar 일 때만 의미가 있다',
  },
  hour: {
    type: 'number',
    description:
      '출생 시각의 시(0~23). 모르면 생략한다. 대운 타임라인은 시각 없이도 정확하다',
  },
  minute: { type: 'number', default: 0, description: '분 (0~59)' },
  gender: {
    type: 'string',
    enum: ['남', '여'],
    description: '성별. 대운의 순행·역행을 정한다',
  },
  birthPlace: {
    type: 'string',
    default: '서울',
    description: `출생지. 진태양시 보정에 쓴다. 가능한 값: ${REGIONS.map((r) => r.name).join(', ')}`,
  },
} as const;

const BIRTH_REQUIRED = ['year', 'month', 'day', 'gender'];

interface BirthArgs {
  year: number;
  month: number;
  day: number;
  calendar?: 'solar' | 'lunar';
  leapMonth?: boolean;
  hour?: number;
  minute?: number;
  gender: '남' | '여';
  birthPlace?: string;
}

function toRaw(a: BirthArgs): RawFormValues {
  const region = REGIONS.find((r) => r.name === a.birthPlace) ?? SEOUL;
  return {
    calendar: a.calendar ?? 'solar',
    year: a.year,
    month: a.month,
    day: a.day,
    leapMonth: a.leapMonth ?? false,
    hourKnown: typeof a.hour === 'number',
    hour: a.hour ?? 12,
    minute: a.minute ?? 0,
    gender: a.gender,
    longitude: region.longitude,
    yajasi: 'preserve-day',
    applyEquationOfTime: false,
  };
}

/**
 * 계산 근거. 모든 응답에 붙는다.
 * 이게 있어야 부르는 쪽이 결과를 신뢰하거나 반박할 수 있다.
 */
function basis(chart: SajuChart) {
  const st = chart.solarTime;
  return {
    standardOffsetMinutes: st.standardOffsetMinutes,
    standardOffsetLabel: `UTC+${Math.floor(st.standardOffsetMinutes / 60)}${
      st.standardOffsetMinutes % 60 ? `:${st.standardOffsetMinutes % 60}` : ''
    }`,
    trueSolarOffsetMinutes: Math.round(st.offsetMinutes * 100) / 100,
    daylightSaving: st.daylightSaving,
    longitude: chart.input.longitude,
    hourUnknown: chart.hourUnknown,
    // 음력으로 물어본 경우 어느 양력 날짜로 옮겼는지. 한국 음력과 중국
    // 음력은 달의 3.6% 에서 하루 갈리므로 이게 없으면 결과가 다를 때
    // 어디서 갈렸는지 알 방법이 없다.
    ...(chart.input.calendar === 'lunar'
      ? {
          lunarInput: {
            year: chart.input.year,
            month: chart.input.month,
            leapMonth: chart.input.leapMonth,
            day: chart.input.day,
          },
          resolvedSolarDate: `${chart.solarDate.year}-${String(chart.solarDate.month).padStart(2, '0')}-${String(chart.solarDate.day).padStart(2, '0')}`,
          lunarBasis:
            '한국천문연구원 음양력 기준(KST). 중국 음력(UTC+8)과는 달의 3.6% 에서 ' +
            '하루 갈리고, 2017년처럼 윤달이 통째로 한 달 달라지는 해도 있다.',
        }
      : {}),
    note:
      '한국은 표준자오선이 네 번 바뀌었고 서머타임도 세 시기 있었다. ' +
      '진태양시 보정량은 상수가 아니라 시대별로 달라진다. ' +
      '1954~61년생은 다른 구현과 결과가 갈릴 수 있으니 이 값으로 대조할 것. ' +
      '음력 입력은 한국천문연구원 기준으로 옮긴다 — 중국 음력과 다르다.',
  };
}

const gz = (p: { stemHanja: string; branchHanja: string; stem: string; branch: string } | null) =>
  p ? { hanja: `${p.stemHanja}${p.branchHanja}`, korean: `${p.stem}${p.branch}` } : null;

const TOOLS = [
  {
    name: 'calculate_saju',
    description:
      '생년월일시로 사주팔자를 계산한다. 한국 표준시 이력(1908~현재)과 진태양시 보정을 반영하므로 ' +
      '1954~61년생과 서머타임 구간(1948~60, 1987~88) 출생자도 정확하다. ' +
      '음력 입력은 가족관계등록부와 같은 한국천문연구원 음양력으로 옮긴다 — ' +
      '중국 음력을 쓰는 구현과는 달의 3.6% 에서 하루 갈린다. ' +
      '응답에 계산 근거(당시 표준시, 보정량)가 함께 담긴다.',
    inputSchema: { type: 'object', properties: BIRTH_PROPS, required: BIRTH_REQUIRED },
  },
  {
    name: 'get_daeun_timeline',
    description:
      '대운 타임라인(10년 단위 인생 흐름)을 준다. 대운은 시주를 참조하지 않으므로 ' +
      '태어난 시각을 몰라도 결과가 정확하다. 각 대운의 십성과 십이운성이 함께 나온다.',
    inputSchema: { type: 'object', properties: BIRTH_PROPS, required: BIRTH_REQUIRED },
  },
  {
    name: 'analyze_natal',
    description:
      '원국 심화 분석. 신강·신약과 용신(억부용신법), 궁위별 십성, 오행 균형, 지장간, 공망, 신살을 준다. ' +
      '용신은 판정만이 아니라 자리별 계산 근거를 함께 낸다.',
    inputSchema: { type: 'object', properties: BIRTH_PROPS, required: BIRTH_REQUIRED },
  },
  {
    name: 'check_compatibility',
    description:
      '두 사람의 궁합. 일간 오행 관계, 일지 육합·삼합·충·형, 오행 보완(내게 없는 기운을 상대가 갖고 있는가), ' +
      '상호 십성을 본다. 점수를 내지 않는다.',
    inputSchema: {
      type: 'object',
      properties: {
        personA: { type: 'object', properties: BIRTH_PROPS, required: BIRTH_REQUIRED },
        personB: { type: 'object', properties: BIRTH_PROPS, required: BIRTH_REQUIRED },
      },
      required: ['personA', 'personB'],
    },
  },
  {
    name: 'get_fortune',
    description: '오늘의 일진과 올해 세운. 세운이 지금 대운과 어떤 관계인지도 함께 본다.',
    inputSchema: { type: 'object', properties: BIRTH_PROPS, required: BIRTH_REQUIRED },
  },
  {
    name: 'check_timezone_data',
    description:
      '이 런타임의 tzdata 가 한국 표준시 이력을 아는지 진단한다. ' +
      '결손이면 1954~61 구간이 조용히 틀리므로 계산 전에 확인할 수 있다.',
    inputSchema: { type: 'object', properties: {} },
  },
] as const;

const server = new Server(
  { name: 'myeongri-seojae', version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, () => ({ tools: TOOLS }));

const json = (v: unknown): CallToolResult => ({
  content: [{ type: 'text' as const, text: JSON.stringify(v, null, 2) }],
});

const fail = (message: string, detail?: unknown): CallToolResult => ({
  content: [{ type: 'text' as const, text: JSON.stringify({ error: message, detail }, null, 2) }],
  isError: true,
});

/**
 * 도구 한 번의 처리. stdio 와 분리해 둔다 — 테스트가 프로세스를 띄우지 않고
 * 이 함수를 직접 부를 수 있어야 한다.
 */
export function handleTool(name: string, rawArgs: unknown): CallToolResult {
  const args = (rawArgs ?? {}) as Record<string, unknown>;

  if (name === 'check_timezone_data') {
    return json({
      usable: isTzdataUsable(),
      probes: tzdataDiagnostics(),
      note:
        'usable 이 false 면 이 런타임의 tzdata 가 한국 표준시 이력을 모른다. ' +
        '1954~61 구간이 예외 없이 조용히 틀리므로 결과를 신뢰하면 안 된다.',
    });
  }

  if (name === 'check_compatibility') {
    const a = args.personA as BirthArgs | undefined;
    const b = args.personB as BirthArgs | undefined;
    if (!a || !b) return fail('personA 와 personB 가 모두 필요합니다');
    const r = computeGunghap(toRaw(a), toRaw(b));
    if (!r.ok) return fail(r.error.message, { code: r.error.code });
    return json({ method: '일간 오행 · 일지 관계 · 오행 보완 · 상호 십성', ...r.value });
  }

  const birth = args as unknown as BirthArgs;
  const result = computeReading(toRaw(birth));
  if (!result.ok) return fail(result.error.message, { code: result.error.code });
  const v = result.value;
  const c = v.chart;

  switch (name) {
    case 'calculate_saju':
      return json({
        pillars: {
          year: gz(c.pillars.year),
          month: gz(c.pillars.month),
          day: gz(c.pillars.day),
          hour: gz(c.pillars.hour),
        },
        dayMaster: {
          ...gz(c.dayMaster),
          element: c.dayMaster.stemElement,
          text: v.dayMasterText,
        },
        animal: c.animal,
        elementCounts: c.elementCounts,
        tenGods: c.tenGods,
        calculationBasis: basis(c),
      });

    case 'get_daeun_timeline':
      return json({
        startAge: v.timeline.startAge,
        direction: v.timeline.direction,
        monthsToNextTransition: v.timeline.monthsToNextTransition,
        entries: v.cards.map((x) => ({
          startAge: x.startAge,
          endAge: x.endAge,
          startYear: x.startYear,
          endYear: x.endYear,
          ganji: x.ganji,
          tenGod: x.tenGod,
          category: x.category,
          twelveStage: x.stage,
          outwardness: x.outwardness,
          isCurrent: x.isCurrent,
          text: x.text,
        })),
        note:
          '대운은 시주를 참조하지 않는다. 태어난 시각을 몰라도 이 타임라인은 정확하다. ' +
          'outwardness 는 십이운성을 0~1 로 옮긴 값이며 점수가 아니다 — ' +
          '낮다고 나쁜 시기가 아니라 밖으로 뻗는 힘이 약한 대신 안으로 여무는 시기다.',
        calculationBasis: basis(c),
      });

    case 'analyze_natal':
      return json({
        strength: {
          verdict: v.yongsin.verdict,
          score: Math.round(v.yongsin.score * 1000) / 1000,
          method: v.yongsin.method,
          methodNote: v.yongsin.methodNote,
          factors: v.yongsin.factors,
          slots: v.yongsin.slots,
        },
        yongsin: {
          primary: v.yongsin.primary,
          element: v.yongsin.primaryElement,
          helpful: v.yongsin.helpful,
          avoid: v.yongsin.avoid,
          advice: v.yongsin.advice,
        },
        palaces: v.palaces,
        elementBalance: v.balance,
        sinsal: v.sinsal.items,
        topics: v.topics,
        calculationBasis: basis(c),
      });

    case 'get_fortune':
      return json({
        daily: v.daily,
        year: v.year,
        calculationBasis: basis(c),
      });

    default:
      return fail(`알 수 없는 도구입니다: ${name}`);
  }
}

server.setRequestHandler(CallToolRequestSchema, (req) =>
  handleTool(req.params.name, req.params.arguments),
);

export async function main(): Promise<void> {
  // 시작할 때 tzdata 를 먼저 확인한다. 결손이면 조용히 틀리는 것보다
  // 시작 시점에 알리는 편이 낫다.
  if (!isTzdataUsable()) {
    process.stderr.write(
      '[명리서재] 경고: 이 런타임의 tzdata 가 한국 표준시 이력을 모릅니다. ' +
        '1954~61년 구간 계산이 부정확합니다.\n',
    );
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`[명리서재] MCP 서버 v${VERSION} 시작\n`);
}

export { server, TOOLS };
