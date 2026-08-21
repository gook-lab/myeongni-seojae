/**
 * 십이운성 테스트
 *
 * 표를 직접 만들었으므로 반드시 외부 검증이 필요하다.
 * lunar-javascript 가 원국 지지에 대해 주는 값과 대조한다.
 * 표가 한 칸이라도 틀리면 여기서 걸린다.
 */

import { Solar } from 'lunar-javascript';
import { describe, expect, it } from 'vitest';
import {
  STAGE_BY_HANJA,
  STAGE_ORDER,
  STAGE_OUTWARDNESS,
  twelveStage,
} from '../src/core/twelve-stages';
import { BRANCH_KO, STEM_KO } from '../src/core/constants';
import type { Branch, Stem } from '../src/core/types';

describe('십이운성 표 — 라이브러리와 교차 검증', () => {
  /**
   * 여러 해에 걸쳐 날짜를 훑으며 원국 네 지지의 십이운성을 대조한다.
   * 일간 10종 × 지지 12종 = 120 조합을 최대한 덮는다.
   */
  it('★120 조합이 라이브러리 값과 일치한다★', () => {
    const seen = new Set<string>();
    const mismatches: string[] = [];

    for (let y = 1960; y <= 2030; y += 1) {
      for (const [m, d] of [[1, 5], [3, 12], [5, 20], [7, 8], [9, 25], [11, 15]] as const) {
        const ec = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar();
        const stemHanja = ec.getDayGan();
        const si = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(stemHanja);
        if (si < 0) continue;
        const stem = STEM_KO[si] as Stem;

        const pairs: Array<[string, string]> = [
          [ec.getYear()[1] as string, ec.getYearDiShi()],
          [ec.getMonth()[1] as string, ec.getMonthDiShi()],
          [ec.getDay()[1] as string, ec.getDayDiShi()],
          [ec.getTime()[1] as string, ec.getTimeDiShi()],
        ];

        for (const [branchHanja, theirs] of pairs) {
          const bi = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
            .indexOf(branchHanja);
          if (bi < 0) continue;
          const branch = BRANCH_KO[bi] as Branch;
          const key = `${stem}${branch}`;
          seen.add(key);

          const ours = twelveStage(stem, branch);
          const expected = STAGE_BY_HANJA[theirs];
          if (expected && ours !== expected) {
            mismatches.push(`${stem}일간 × ${branch}지 → 우리 ${ours} / 라이브러리 ${expected}(${theirs})`);
          }
        }
      }
    }

    expect(mismatches, mismatches.slice(0, 5).join('\n')).toEqual([]);
    // 충분히 많은 조합을 실제로 대조했는지 확인 (표가 안 돌면 의미 없다)
    expect(seen.size).toBeGreaterThanOrEqual(100);
  });
});

describe('십이운성 표 자체 성질', () => {
  const STEMS = STEM_KO as readonly Stem[];
  const BRANCHES = BRANCH_KO as readonly Branch[];

  it('모든 일간에서 열두 지지가 열두 단계를 한 번씩 만든다', () => {
    for (const stem of STEMS) {
      const stages = BRANCHES.map((b) => twelveStage(stem, b));
      expect(new Set(stages).size, `${stem}일간`).toBe(12);
    }
  });

  it('양간은 순행, 음간은 역행한다', () => {
    // 甲(양) 亥에서 장생 → 子 목욕 (순행)
    expect(twelveStage('갑', '해')).toBe('장생');
    expect(twelveStage('갑', '자')).toBe('목욕');
    // 乙(음) 午에서 장생 → 巳 목욕 (역행)
    expect(twelveStage('을', '오')).toBe('장생');
    expect(twelveStage('을', '사')).toBe('목욕');
  });

  it('알려진 값들이 맞는다', () => {
    // 甲: 亥생 子욕 丑대 寅록 卯왕 辰쇠 巳병 午사 未묘 申절 酉태 戌양
    const gap: Array<[Branch, string]> = [
      ['해', '장생'], ['자', '목욕'], ['축', '관대'], ['인', '건록'],
      ['묘', '제왕'], ['진', '쇠'], ['사', '병'], ['오', '사'],
      ['미', '묘'], ['신', '절'], ['유', '태'], ['술', '양'],
    ];
    for (const [branch, stage] of gap) {
      expect(twelveStage('갑', branch), `갑 × ${branch}`).toBe(stage);
    }
  });

  it('무·기는 병·정과 같은 자리를 쓴다', () => {
    for (const b of BRANCHES) {
      expect(twelveStage('무', b), `무 × ${b}`).toBe(twelveStage('병', b));
      expect(twelveStage('기', b), `기 × ${b}`).toBe(twelveStage('정', b));
    }
  });

  it('건록은 일간과 같은 오행의 지지에 온다', () => {
    // 甲 → 寅(목), 丙 → 巳(화), 庚 → 申(금), 壬 → 亥(수)
    expect(twelveStage('갑', '인')).toBe('건록');
    expect(twelveStage('병', '사')).toBe('건록');
    expect(twelveStage('경', '신')).toBe('건록');
    expect(twelveStage('임', '해')).toBe('건록');
  });
});

describe('outwardness — 좋고 나쁨이 아니라 밖으로 뻗는 힘', () => {
  it('열두 단계에 값이 다 있다', () => {
    for (const s of STAGE_ORDER) {
      expect(STAGE_OUTWARDNESS[s], s).toBeGreaterThan(0);
      expect(STAGE_OUTWARDNESS[s], s).toBeLessThanOrEqual(1);
    }
  });

  it('제왕이 가장 높고 절이 가장 낮다', () => {
    const sorted = [...STAGE_ORDER].sort(
      (a, b) => STAGE_OUTWARDNESS[b] - STAGE_OUTWARDNESS[a],
    );
    expect(sorted[0]).toBe('제왕');
    expect(sorted.at(-1)).toBe('절');
  });

  it('점수가 아니다 — 합이 100 이거나 하지 않는다', () => {
    const sum = STAGE_ORDER.reduce((a, s) => a + STAGE_OUTWARDNESS[s], 0);
    expect(sum).not.toBe(100);
    expect(sum).toBeLessThan(12);
  });
});
