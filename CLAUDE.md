# CLAUDE.md

Chrome/Firefox MV3 extension: monitors filelist.io for tracked TV series via JSON API, fires browser notifications for new results.

## Gotchas

- Service workers have no DOM (no `DOMParser`, no `document`).
- `Math.max(...largeArray)` blows service-worker call stack — use loop.

## Conventions

- All `chrome.storage.local` access through `src/storage.ts` (typed wrapper w/ defaults). `seenTorrents` = `Record<string, Record<string, number>>` (series → torrent ID → timestamp).
- Release version from git tags, not files. `package.json` + `src/manifest.json` on disk = dev placeholders; `release.yml` derives next patch from latest tag, injects at build (no commit back).

## Polling design

- filelist.io API rate limit = 150 req/hour; series cap = 150.
- Service worker polls incrementally on 1-min alarm, spreading work across 60-min cycle: `batchSize = ceil(N/60)`. `pollCursor` + `nextCycleAt` in storage track progress so service-worker restart resumes mid-cycle.
- Popup "Poll Now" sends `poll-now` → full immediate poll of all series.
- Series with no new results for 30 days auto-removed.

## Project facts

- pnpm (not npm/yarn).
- CWS listing: `chromewebstore.google.com/detail/filelist-monitor/fkklofnmhjhifmnkhgjplkkkpjoajdhj` (ext ID `fkklofnmhjhifmnkhgjplkkkpjoajdhj`).
- CWS publish secrets: `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_EXTENSION_ID`, `CHROME_REFRESH_TOKEN`.
- AMO publish secrets: `AMO_JWT_ISSUER`, `AMO_JWT_SECRET`.
- `release.yml` sets `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` — needed until `softprops/action-gh-release` ships v3.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
