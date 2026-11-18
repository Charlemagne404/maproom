# Integration plan

All six worktrees are siblings at one baseline. Keep their commits and reviews independent until implementation is complete. Integration happens on a coordinator-owned branch based on the same baseline; do not merge workstream branches into `main` during development.

## 1. Hold the shared interfaces

Before implementation reaches across its owned area, record the interface in its brief or handoff. Resolve these seams first:

1. Historical game ID, URL, result/session version, normalized historical feature type, data manifest entry, lazy-loading boundary and Explore collection component.
2. Daily selector input/output, canonical date/timezone rule, deterministic schedule seed, exactly-six rule, balancing window, versioned puzzle identity and persistence adapter API.
3. Map viewport contract: container sizing, safe-area/available-height variables, touch-action, pointer capture, wheel zoom, pinch/pan precedence, reduced-motion behavior and accessible keyboard controls.
4. Website markup hooks consumed by Mobile CSS, including navigation and Explore/Daily layout landmarks.

Shared registries and persistence stay behind the ownership rules in [WORKSTREAMS.md](WORKSTREAMS.md). The coordinator makes the small cross-cutting wiring changes once, after receiving concrete components and interfaces.

## 2. Review and integrate scoped work

For each branch, review its diff and source/license notes, confirm its worktree is clean, run applicable unit/type/lint/build/browser checks, and inspect desktop/mobile captures in light and dark themes. Ask the owning session to correct issues on its branch before integration. Do not combine unrelated fixes into another stream's commit.

Suggested order:

1. **Geography Connections** and **Maps & Gameplay UX** can integrate independently because their game folders and algorithms are separate. Integrate Connections with its game-specific tests; integrate map foundation and map-game changes together.
2. **Website Fundamentals** establishes approved semantic markup and class/data hooks. Integrate its markup with **Mobile Experience** CSS in the same review window; resolve selector and safe-area differences before completing either integration.
3. **Historical Geography** supplies data, loader, game and collection component. The coordinator performs one registration change across stable ID/type, `src/games/catalog.ts`, `src/games/components.tsx`, shared artwork and Explore composition. Verify the historical data attribution and offline fetch/cache behavior before accepting it.
4. **Daily System** integrates after the final game IDs and catalog are known. Connect its daily adapter to app state/persistence once, preserve import/export/reset compatibility, then explicitly review streak behavior and game balancing. Historical remains excluded unless both game readiness and Daily eligibility are approved.
5. Run the complete release regression set on the resulting integration branch, including all streams' tests and visual review. Resolve issues there or on the owning branch as appropriate. Only after the user chooses a release path should any production branch or deployment be considered.

The order may change to fit actual dependencies, but the paired Website/Mobile and Maps/Mobile interface reviews are required.

## 3. Shared behavior contracts

### Daily and historical games

- Choose the canonical calendar date rule explicitly and preserve compatibility with existing `usePuzzleDate` behavior. Every user's selection for that canonical date must derive from the same schedule inputs, not local randomness, history, or request order.
- Give every daily puzzle a stable `gameId:date:version` identity and deterministic seed. Version answer-changing rules; completed history must survive incompatible unfinished session resets.
- Select six distinct games only from the explicit eligible pool. Balance counts over a documented rolling window; don't let a game enter because it was merely added to Explore.
- Design the selector so a future game can implement the eligibility contract without special-case logic in the rotation. Historical's eligibility is opt-in and must not reduce the six-game count if it is not ready.
- Keep daily state in a versioned adapter until the coordinator adds it to shared persistence/export/import/reset paths. Preserve offline operation and avoid network-dependent puzzle selection.

### Maps and mobile

- There is one owner for `GeoMap` pointer, wheel and gesture handling: Maps & Gameplay UX.
- Define how wheel zoom is distinguished from page scroll, how pinch zoom competes with page gestures, and what happens when `prefers-reduced-motion` is set. Ensure map controls and visible keyboard focus remain operable.
- Mobile supplies shell/safe-area constraints and tests; it does not attach a second gesture system to the map or override map-game hit targets.
- Review representative map games together on narrow touch viewports and desktop mouse/trackpad before integration is complete.

### Website and mobile

- Website owns semantic headings, links, labels, navigation state and markup hooks; Mobile owns responsive rules and touch-target/layout QA.
- Keep class/data hooks stable or agree a replacement before landing markup changes. Do not let CSS conceal an inaccessible or missing control.
- Treat route metadata, canonical URLs and sitemap entries consistently with the static SPA and hosting fallback; don't add a server requirement or analytics dependency.

## 4. Integration handoff checklist

Each stream hands off its branch name and commits, changed-file list, decisions and remaining assumptions, validation commands/results, screenshots or recordings, data-source/license evidence, offline behavior, and exact shared-interface changes requested. The coordinator verifies that no worktree or other branch was overwritten, preserves branch history, integrates only reviewed commits, and reports any deferred dependency. No branch is force-pushed and no workstream merges directly into `main`.
