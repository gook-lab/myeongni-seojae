# Myeongri Saje (명리서재)

[한국어](README.md) | **English**

**A saju site that unfolds your life in 10-year cycles.**
No fear-mongering, no scoring, no personal data collection.

<sub>React 19 · TypeScript · Vite · Tailwind v4 · Zustand · Vitest · Playwright · MCP</sub>

---

Most saju apps focus on "today's fortune: 87 points." But what actually gives people chills isn't today's score—it's when **their own past finally makes sense**. You spread your life out in 10-year chunks and say "here's your age 25–34: pyeongwan daeun (wealth cycle)," and people start mapping their own life story onto that timeline.

And this is the **only feature where accuracy actually matters**. Daily fortunes? Off by a day and nobody notices. But mess up daeun (10-year cycle) timing by a year, and the whole timeline gets shoved sideways.

## Screens

| Intro | Calculation Basis | Life Timeline |
|:--:|:--:|:--:|
| <img src="docs/screenshots/01-intro.png" width="240"> | <img src="docs/screenshots/04-calculating.png" width="240"> | <img src="docs/screenshots/05-result.png" width="240"> |
| Says what we *don't* do first.<br>Center lantern shows today's iljin (day cycle), freshly calculated | Instead of a fake progress bar,<br>**actual calculated values** line by line | Results start with the daeun timeline,<br>not a saju chart |

| Compatibility | Deep Dive | Life Report |
|:--:|:--:|:--:|
| <img src="docs/screenshots/10-gunghap.png" width="240"> | <img src="docs/screenshots/07-detail.png" width="240"> | <img src="docs/screenshots/08-report.png" width="240"> |
| No score.<br>**Shows which ohaeng (five elements) you actually need**, not which are "missing" | Gungwi (house), ohaeng balance, yongsin (favorable element)—<br>kept separate on the detail screen, not piled on results | Calculation basis included<br>as an A4 printable document |

| Daeun Expanded | Where's the DOB Going? | Dead Link |
|:--:|:--:|:--:|
| <img src="docs/screenshots/06-card-open.png" width="240"> | <img src="docs/screenshots/13-privacy.png" width="240"> | <img src="docs/screenshots/12-404.png" width="240"> |
| **You type in the past 10 years yourself.**<br>We don't tell you it matches—you decide | Plain language, not legal prose.<br>**We don't hide bad news** | Tells you when a link broke |

## Tech Stack

| | |
|---|---|
| **Language · Build** | TypeScript 5.9 (`strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`) · Vite 6 |
| **UI** | React 19 · Tailwind CSS v4 (`@theme` tokens) · Animations are **CSS only** (0 bytes from libraries) |
| **State** | Zustand 5 — even routing stays in state (to keep DOB out of the URL) |
| **Domain Engine** | Built from scratch (`core/pillars.ts`) + self-generated solar term table (23.6KB) |
| **Lunar Calendar** | `korean-lunar-calendar` — Korean Astronomical Research Institute data |
| **Observability** | `@sentry/react` — PII redaction gate must pass before anything ships |
| **Testing** | Vitest 3 (**558**) · Playwright 1.62 (**246**, mobile · desktop · motion 3 suites) |
| **Verification Tools** | astronomy-engine (celestial mechanics) · lunar-javascript · manseryeok · **Python + skyfield/JPL DE421** |
| **Integration** | Model Context Protocol SDK — engine exposed as 6 MCP tools |
| **CI** | GitHub Actions — tzdata self-check → types → build → tests → E2E → golden re-diff |

### Actual Implementation Scope

- **Timezones and calendars** — IANA tzdata, true solar time (진태양시), two separate timelines
- **Celestial mechanics** — Solar apparent longitude, new moon (삭), mid-solar-terms to determine leap months
- **Data encoding** — 4,824 solar terms folded into delta + base-36 = 23.6KB
- **Bundle budget** — entry chunk pegged at 250KB, CI enforces it
- **Privacy engineering** — blocked four leakage paths for DOB, tests verify they stay blocked
- **Accessibility** — explanation screens for users who don't know saju terms, WCAG AA color contrast **computed directly from tokens and tested**, `prefers-reduced-motion`, large text mode, 44px touch targets
- **Validation design** — how do you verify a calculation when there's no answer key (e.g., yongsin, sinssal)?

## Summary

| | |
|---|---|
| Solar terms vs. celestial mechanics | 3,624 samples · max deviation **55.8 seconds** |
| Day cycle verified via Julian day | **73,414 days** · one constant explains them all |
| Structural rules (Five Tiger Tally, Five Rat Tally) | 11,172 cases · mismatches **0** |
| Cross-check with independent Python impl. | Derived the phase constant **from scratch** · pillar mismatches 0 |
| Entry chunk / engine chunk | 250KB budget / **100KB** (after removing calculation lib) |
| Real bug found during development | **We were using Chinese lunar calendar** (off by one day in 3.6% of cases) |
| Where words and actions split | Privacy statement says "nowhere," but **we were loading Google Fonts** |

## Read More

| Document | About |
|---|---|
| [Accuracy](docs/accuracy.md) | Korean standard time history · solar terms · day cycle · Korean lunar calendar · Python verification |
| [Architecture](docs/architecture.md) | Design decisions · bundle strategy · **all deploy gates** · hand-rolled checks |
| [Interpretation](docs/interpretation.md) | Yongsin · sinssal · **compatibility** · **today/new year** · reports · lookup tables · **glossary** |
| [Screens & Motion](docs/ux.md) | Intro · layout · animation · share links · **color contrast** · **self-hosted fonts** |
| [MCP Server](docs/mcp.md) | How to expose the engine as tools to other AIs |

## Quick Start

```bash
pnpm install
pnpm dev                # dev server
pnpm gate               # types + MCP build + unit tests
pnpm test:e2e           # Playwright
pnpm build:mcp          # MCP server → dist-mcp/server.js
pnpm verify:python 150  # cross-check vs. Python impl. (needs environment)
pnpm shots              # refresh screenshots for docs
pnpm docs:sync          # sync test counts in README
pnpm fonts              # re-download web fonts locally
pnpm gen:terms          # regenerate solar term table
```

## Not Implemented

- **KASI official check** — Solar terms verified directly against celestial mechanics (see "solar terms" above). Comparing to Korea Astronomy & Space Science Institute's public API is still in the backlog as `pnpm verify:kasi`, but public data portal key provisioning is manual, so we haven't run it live yet. We matched the response format from docs, so the first run needs `--raw` to verify.
- **Automate Python checks** — `pnpm verify:python` is run by hand. A 17MB ephemeris file per month in CI isn't practical, so it stays as a manual step after large changes.
- **Pre-1911 lunar calendar** — Korean lunar data in that range disagrees with KST rules in eight places. Since Korea didn't have standard time before the empire formalized it, we'd need to settle the baseline first. We still calculate 1900–1911 births, but the precision of lunar inputs is lower in that era than after.

---

## License

**Source-available — not open source.** We've published the code for reading, but we haven't granted usage rights. If you want to use it in another project, fork, redistribute, or commercialize it, you need written permission first. See [LICENSE](LICENSE) for the full terms, and [LICENSE.ko.md](LICENSE.ko.md) for Korean guidance.
