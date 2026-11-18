# Daily System workstream

## Goal

Replace the fixed six-game Daily presentation with a deterministic rotation that presents exactly six distinct eligible games per canonical day. Make daily selection fair over time, reproducible for all users under the agreed date rule, compatible with existing saved results and ready for future game registrations.

## Owned implementation area

- `src/daily/**` for the pure selection schedule, eligibility interface, deterministic puzzle identity/version helpers and a Daily-specific persistence adapter.
- `src/pages/DailyPage.tsx` for Daily-specific composition and progress presentation.
- Daily-specific tests under `tests/daily-system/**`, `src/daily/**`, and `e2e/daily-system.spec.ts`.

Treat `src/games/catalog.ts`, `src/geography/types.ts`, `src/games/components.tsx`, `src/puzzles/engine.ts`, `src/app/**`, `src/persistence/**`, `src/statistics/**`, `public/sw.js` and global styles as shared. Do not modify them in this branch. Request one integration change if the schedule needs shared catalog fields, app state, an IndexedDB schema migration, export/import, reset or precaching.

## Work

- Choose and document the canonical date/timezone rule; align daily IDs and display with the existing `usePuzzleDate` behavior and avoid different users receiving different selections from local randomness.
- Make selection a pure function of a stable date and schedule version. Choose six unique games; measure counts over a documented rolling period and prevent streaks of one game, unfair omission, or avoidable same-day order bias.
- Preserve existing deterministic game seeds and versioned `gameId:date:version` puzzle identities. Changing the selected games must not erase completed history. Expire only incompatible unfinished sessions under a clear version policy.
- Keep selector eligibility separate from game registration. A game may exist in the catalog and Explore without being Daily eligible. Expose an extension point that can accept a future eligible game without hard-coded historical logic.
- Persist any new streak/schedule state through a versioned adapter with offline behavior. Specify how it joins current result history, IndexedDB/localStorage fallback, export/import and reset; integration of shared storage changes is reserved for the coordinator.
- Keep statistics consistent with the new six-game day and explain skipped, completed and resumed puzzles accessibly.

## Historical eligibility contract

Coordinate the stable historical ID with Historical Geography. Historical is excluded by default. The selector should accept an explicit eligibility/configuration input so the coordinator can opt it in later after content, difficulty, deterministic puzzle generation and fairness are approved. It must still return exactly six distinct games when historical is not eligible.

## Handoff and acceptance

Provide schedule examples for a full balancing window, a pure deterministic test proving stable selection for the same date/version, distribution/fairness analysis across many dates, migration and session-compatibility notes, offline and persistence behavior, unit/browser coverage, and screenshots in desktop/mobile and light/dark modes. List all changes requested to app-level state or the catalog for final integration.
