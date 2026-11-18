# Maproom 2.0 parallel development

This directory defines the boundaries for six independent workstreams. Each worktree starts from the same clean baseline commit and has its own branch. Work only in the assigned worktree and branch; do not merge into `main` or another workstream branch. The coordinator will integrate the completed branches after review.

## Start one session per worktree

| Session | Worktree | Branch | Brief |
| --- | --- | --- | --- |
| Historical Geography | `/home/charlie/maproom-worktrees/historical` | `codex/maproom-2.0-historical-20261118` | [Historical Geography](HISTORICAL_GEOGRAPHY.md) |
| Daily System | `/home/charlie/maproom-worktrees/daily` | `codex/maproom-2.0-daily-20261118` | [Daily System](DAILY_SYSTEM.md) |
| Geography Connections | `/home/charlie/maproom-worktrees/connections` | `codex/maproom-2.0-connections-20261118` | [Geography Connections](GEOGRAPHY_CONNECTIONS.md) |
| Maps & Gameplay UX | `/home/charlie/maproom-worktrees/maps` | `codex/maproom-2.0-maps-20261118` | [Maps & Gameplay UX](MAPS_GAMEPLAY_UX.md) |
| Mobile Experience | `/home/charlie/maproom-worktrees/mobile` | `codex/maproom-2.0-mobile-20261118` | [Mobile Experience](MOBILE_EXPERIENCE.md) |
| Website Fundamentals | `/home/charlie/maproom-worktrees/web` | `codex/maproom-2.0-web-20261118` | [Website Fundamentals](WEBSITE_FUNDAMENTALS.md) |

The branches are siblings. A worktree will not contain another session's later changes unless the coordinator deliberately integrates them. Run `git status --short --branch` before editing and confirm the path and branch match this table.

## Repository conventions

- This is a Vite, React and strict TypeScript single-page app. `package.json` and `package-lock.json` establish npm as the package manager.
- Use Node 22 and npm 10 or a compatible newer patch release. The preparation host had Node `v22.23.4` and npm `10.9.9`.
- Install separately inside each worktree with `npm ci`. Do not share or symlink `node_modules` between worktrees. Dependency installation was intentionally not run during setup.
- Start local development with `npm run dev`. Available checks are `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and `npm run e2e` (`e2e` builds before Playwright).
- Inspect desktop and mobile layouts, keyboard behavior, and both light and dark themes for UI changes. Automated checks do not replace visual browser review.
- Keep optional geography and game data lazy. A dataset needed offline must be fetched and cached before a player goes offline unless the integration plan explicitly adds it to precaching.
- Record data source, represented date, transformation, coverage, limitations, license and attribution. Do not treat generalized map data as legal boundaries or a complete gazetteer.

## Shared-file rule

The ownership table in [WORKSTREAMS.md](WORKSTREAMS.md) is the source of truth. Stay within your owned paths. Shared registries, persistence, map interaction, design tokens and global styles have explicit owners or are reserved for integration. If the work requires a reserved file, document the proposed interface and ask the coordinator to include that change in the integration phase; do not independently edit the shared implementation.

Prefer a new scoped component, module, or stylesheet in the owned area. Keep CSS selectors namespaced and preserve established class hooks where another stream consumes them. Agree on interfaces before depending on a component from another stream.

## Common development standards

- Preserve Maproom's existing visual identity and favor small, maintainable changes over broad rewrites.
- Preserve existing behavior unless a change is part of the brief and its impact is documented. Avoid unnecessary packages.
- Keep optional data and game code lazy, and preserve offline behavior with clear first-fetch and cache expectations.
- Write meaningful automated tests. For UI changes, run visual browser QA and inspect desktop and mobile screenshots in light and dark themes; tests alone do not establish visual quality.
- Run the applicable typecheck, lint and unit/browser checks for the change, and report exactly which commands passed or remain to run.
- Document dataset sources, represented dates, transformations, coverage, limitations, licensing and attribution.
- Commit on the assigned branch and push that branch to GitHub. Do not merge a workstream into `main`.

## Branch workflow

Commit coherent changes on the assigned branch and push it with `git push -u origin <assigned-branch>`. Do not force-push, push to `main`, or merge another workstream. In the handoff, list commits, changed paths, checks, browser screenshots, data and licensing evidence, and any interface requests. Integration order and gates are in [INTEGRATION_PLAN.md](INTEGRATION_PLAN.md).
