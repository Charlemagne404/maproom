# Maproom Historical Release Candidate

Validated 20 November 2026. This is a release-preparation handover, not deployment approval.

## Release identity

- Candidate branch: `codex/maproom-historical-release-20261120`
- Worktree: `/home/charlie/maproom-worktrees/historical-release`
- Validated implementation commit: `50c7fcdb2a828570591ddfcd433d62c54ed31d06`
- Verified base: `codex/maproom-historical-expansion-20261119` at `a316ebe4f674b066be2a51ac3e4b135730d02926`
- The reported source commits `206d5bd` and `bb0235e` are ancestors of that base. The local and fetched source refs matched at validation.
- Canonical `/home/charlie/maproom` and the source worktree remained clean. No deployment, merge, default-branch change, or live-system change was made.

This report is committed immediately after the validated implementation commit as release documentation. The final branch tip is the report commit; the implementation SHA above identifies the exact code, tests, generated historical assets and supporting documentation that passed validation.

## Baseline

Before edits, the isolated worktree was created from the verified source tip and its dependencies installed with `npm ci` (zero reported vulnerabilities). Typecheck, lint, unit tests and the production build passed. The artifact validator reported 26 route snapshots, 23 sitemap URLs, 210 precached assets, 198 regional packages, 20 legacy CShapes maps, 41 expanded atlas maps and 20 historical flags.

The source branch had only 19 selected browser checks reported. The independent full Playwright baseline contained 99 checks: 96 passed and 3 failed. One failure exposed a real race where a delayed session write could restore old map settings after reset. The other two were test setup assumptions: one expected a date-dependent Daily lineup to contain Countries, and one expected a map stage while the Daily Cities question was a capital task. The race was fixed; those two tests now select deterministic conditions. No failing checks were skipped or weakened.

## Historical content review

### Cliopatria atlas and gameplay

- Reviewed all 41 generated map views and their manifests against pinned Cliopatria v0.2.1 at commit `5f433377139a6eeaeacbdc894b70f8805b72c8b5`. The archive SHA-256 is `e10a4e429fca708788ff9e7572a95fce801fae55852d217cffabc1c59cd4eed4`; the extracted GeoJSON SHA-256 is `fc6f0d1e4cc42f45da83522b3696db6f2cc85ec0d12259a85c89b31347b8fc0a`.
- The 41 views span 3300 BCE–1900 CE, 26 polity identities and 20 curated map frames, including regional windows and a global view. The source's inclusive intervals and overlapping polity records are retained. The 20 older CShapes maps and their source-specific attribution remain intact.
- Reviewed generated SVG contact sheets, per-map clues, frame extents, source intervals, context notes, source links, attribution and scoring. The builder now clips each projection to its intended SVG frame. A coordinate audit of all 41 outputs checked 27,023 path vertices; none fell outside the map frame.
- Date scoring now lowers the maximum precision credit as source intervals widen. An interval of at least 200 years is capped at 500/1,000; intervals of ten years or less can still earn 1,000. BCE/CE parsing has no year zero, and the displayed era boundaries are consistent: 500 BCE begins the Classical era and 500 CE begins the Medieval era.
- Fixed saved-session reset/write ordering so stale asynchronous writes cannot restore a previous round. Atlas restore now requires the saved format, era, difficulty and map to match the active settings.
- Historical States & Empires now builds four distinct, same-era polity choices, preferring the same frame or nearby source dates when available. Its clues state the period and location; precise dates appear after the answer. Instructions and reveals explain that the selected source view does not represent a polity's full extent. Player-facing copy now distinguishes regional and global views.
- The dataset remains selective and is not expanded. Cliopatria's intervals can be broad, source polygons have no per-polygon confidence values, and blank areas do not mean that no other society existed.

### Historical Flags

- Audited all 20 entries across 19 entities for identity, period, primary-source evidence, artwork provenance, answer fairness, distractors, explanations, image quality, license and attribution.
- Kept all entries. Twelve are marked documented and eight illustrative reconstructions; the label and artwork note now appear before guessing as well as in the reveal. The prompt asks which polity a period design is associated with, which also fits standards and reconstructed designs.
- Fixed the Ottoman 1844 artwork: the crescent was effectively invisible in the generated SVG, leaving the star alone. The vector redraw now renders a clear white crescent and star on red. Asset checksum validation and a regression assertion cover the artwork.
- Every flag links to its source. The vectors remain Maproom redrawings under CC BY 4.0; reconstructed designs are not presented as archival originals.

### Explore and mobile layout

- Verified the unified Explore catalogue presents all 18 games. Browser coverage checks category filters, multi-category games, search and empty results, favorites, recent-play ordering, format cards, direct routes, back navigation and responsive layout. Historical games have the same card presentation as the rest of the catalogue.
- Fresh screenshots exposed two layout defects: historical cards did not span the filtered Explore grid consistently, and at 320px the atlas map stage expanded to 333px inside a 288px frame. Both are fixed. The narrow-screen regression check verifies the atlas and States & Empires stage widths fit their frames without page overflow.
- Reviewed homepage, Explore, map guessing, ordering, flags, states, answers/results and settings in light/dark themes at 320×568, 390×844, 768×1024 and 1440×960. Headless browser checks cover keyboard focus, touch-sized controls, zoom/pan, dialog fit, reduced motion and scroll behavior. The 320px atlas stage now measures 286px inside its 288px frame.

## Daily, persistence and offline compatibility

- All 18 games remain registered and directly reachable. Daily still presents six games from its eight eligible games; the three historical games remain outside Daily.
- The complete suite verifies Daily session restore across all six Daily families, completed history retention, streak/settings navigation and local progress export/import. The historical session changes preserve legacy CShapes saves.
- The production service-worker test confirms all 20 legacy maps, 41 atlas maps and 20 historical flags are precached and load from a fresh offline context. Existing nonhistorical games and their offline behavior also pass.

## Tests and artifact validation

Final checks on the validated implementation commit:

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | 30/30 files, 157/157 tests passed |
| `npm run build` | Passed; generated route snapshots, sitemap and offline manifest |
| `node scripts/validate-production-artifacts.mjs` | Passed: 26 route snapshots, 23 sitemap URLs, 210 precached assets, 198 regional packages, 20 legacy maps, 41 expanded atlas maps, 20 historical flags, data and CSP hashes |
| `npx playwright test --config=playwright.release.config.ts --workers=1` | 101/101 passed, 0 failed, 14.6 minutes |
| `git diff --check` | Passed |

The full browser run used a single worker against a fresh production preview. The temporary port-specific Playwright config and test-generated screenshots were removed after verification.

## Licensing and deployment compatibility

- Cliopatria atlas data and Maproom flag redraws carry CC BY 4.0 attribution. The existing CShapes-derived set remains CC BY-NC-SA 4.0; its noncommercial and ShareAlike terms still apply.
- Build validation covers all 18 stable game routes, generated SEO route snapshots, sitemap, service-worker precache, historical manifests and asset checksums, viewport metadata and CSP hash. The repository-owned Caddy template and finalizer's required route and asset list were inspected for compatibility.
- `scripts/finalize-deployment.sh` was not run. It publishes a prepared build and may alter the live Caddy block; this mission explicitly did not deploy. Live Caddy, service, DNS, Cloudflare and public runtime status were not modified or claimed as verified. The established finalizer expects its project at `/home/charlie/maproom`; an operator must stage this reviewed branch there and rerun the checks before a separate authorized activation.

## Remaining limitations

- Historical coverage follows the pinned scholarly source and its selected records. It is not a complete atlas, exact event-date record, legal boundary dataset or comprehensive history of societies. Broad source intervals remain broad, and the score cap cannot remove scholarly uncertainty.
- Several regional outlines and the global territorial view can be sparse at default mobile zoom. Players can zoom up to 300%; the selected frame is disclosed and the game does not claim to show an empire's complete extent.
- Eight flag artworks are illustrative reconstructions. Their labels, notes and source citations are shown in play; they should not be treated as contemporary archival specimens.
- Browser validation used headless Chromium and emulated viewport sizes. It does not establish physical-device, GPU, assistive-technology or human-player validation.
- No production activation or public runtime verification is included in this candidate.
