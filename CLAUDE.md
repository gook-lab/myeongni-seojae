# 명리서재 (myeongni-seojae)

## 문서 규약

사람이 읽는 문서(`README*.md`, `docs/**/*.md`)는 guk-lab 공통 규약을 따른다.
정본은 `~/sonix/toy/guk-lab-docs` — 복사하지 않고 가리킨다.

- 톤: `guk-lab-docs/STYLE.md` — 본문 습니다체, 헤드 요약·표 셀은 명사형,
  헤딩은 기술 명사구, 수치에는 측정 시점 병기.
- 다이어그램: `guk-lab-docs/harness/skills/doc-diagrams/SKILL.md` —
  `docs/diagrams/<name>.mmd` 가 정본, 색은 의미(core/view/store/external/tool),
  점선은 런타임 밖 경로에만.
- 브랜치·PR: `guk-lab-docs/playbooks/branching.md` — main 직접 커밋 금지,
  develop 에 쌓고 PR 로 합친다.
- `README.md` 를 고치면 `README.en.md` 도 같은 커밋에서 고친다.

## 검증

커밋 전에 통과시킨다.

```bash
pnpm typecheck
pnpm vitest run
pnpm lint
```
