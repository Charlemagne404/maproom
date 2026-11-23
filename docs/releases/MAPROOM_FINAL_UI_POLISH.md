# Maproom Final UI Polish

> **Historical UI handover, superseded by the maintenance pass.** This report preserves the 23 November 2026 UI-polish state and screenshots. Current code, branch status, and validation are recorded in the [current final handover](../FINAL_HANDOVER.md).

**Date:** 2026-11-23  
**Branch:** `codex/maproom-final-ui-polish-20261123`  
**Verified deployed source:** `70f0458420628e09697fe31168a6b3ed748d6965` (`/srv/maproom/current` pointed to release `1.2.0-70f045842062` when this work began.)

## Audit priorities

The first rendered review found four areas with the most visible friction: the Daily resume action did not read as a clear next step; Explore’s wide editorial card spans made the library uneven; Find the Country’s mobile map controls sat too close to small island targets and left unused map-stage space; and Watershed Match put its large map and all answer controls into a long vertical stack. Capitals & Cities practice modes also used the screen unevenly. Other registered games, results, setup dialogs, support pages, and both themes were reviewed before implementation.

## Changes

- **Shared interface:** tightened the spacing and corner-radius scale, stabilized the nav underline, made utility icons respond without a shared square hover fill, aligned focus and control treatments, and retained reduced-motion behavior.
- **Daily and Explore:** gave the continue session a clearer card/action hierarchy; kept Play Anytime full-bleed as a continuation of Daily; regularized Explore into an even three-column desktop grid while retaining unified categories and equal prominence for historical games; improved chip and search feedback.
- **Gameplay:** tightened Capitals & Cities non-map practice spacing; increased the desktop play area for Distance & Direction; made Find the Country’s mobile map stage more viewport-efficient and moved map controls into a horizontal, touch-sized dock clear of the island tap region; gave Watershed Match a desktop map-and-answer split and replaced its text round count with an accessible visual progress marker.
- **Mobile and access:** checked narrow 320px layouts through tablet portrait/landscape and desktop, in light and dark themes; preserved 44px map controls and visible focus; used the shared progressbar semantics for Watershed Match. No scoring, answer rules, Daily rotation, game IDs, progress formats, datasets, or historical facts changed.

## Screenshots

The overview sheets show all 23 playable formats in both themes at desktop and phone widths, all setup formats, the site pages, and representative tablet layouts. Selected full-size screens are included for closer review.

- [All game screens — desktop, light](assets/final-ui-polish/contact-desktop-light.jpg) · [desktop, dark](assets/final-ui-polish/contact-desktop-dark.jpg)
- [All game screens — mobile, light](assets/final-ui-polish/contact-mobile-light.jpg) · [mobile, dark](assets/final-ui-polish/contact-mobile-dark.jpg)
- [Setup dialogs](assets/final-ui-polish/contact-setups-desktop-light.jpg)
- [Home, Explore, Statistics, Settings, About, Data, Privacy, and 404 — desktop](assets/final-ui-polish/site-pages-desktop.jpg) · [mobile](assets/final-ui-polish/site-pages-mobile.jpg)
- [Tablet portrait](assets/final-ui-polish/tablet-portrait.jpg) · [tablet landscape](assets/final-ui-polish/tablet-landscape.jpg)
- [Daily with a saved session](assets/final-ui-polish/home-resume-light-desktop.png)
- [Explore, light](assets/final-ui-polish/explore-light-desktop.png) · [Explore, dark](assets/final-ui-polish/explore-dark-desktop.png)
- [Find the Country, mobile light](assets/final-ui-polish/find-country-mobile-light.png) · [mobile dark](assets/final-ui-polish/find-country-mobile-dark.png)
- [Capitals & Cities, mobile light (390×844)](assets/final-ui-polish/capitals-mobile-390x844-light.png) · [Watershed Match, mobile light (390×844)](assets/final-ui-polish/watershed-mobile-390x844-light.png) · [Settings, mobile dark](assets/final-ui-polish/settings-mobile-dark.png)

The complete Chromium viewport capture set was also reviewed locally at `artifacts/qa/final-ui-polish/`: 23 formats at seven requested viewport sizes, both themes, plus dialogs, supporting pages, Daily with saved progress, and tablet portrait/landscape samples.

## Validation

- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — 157 tests passed across 30 files.
- `npm run build` — passed, including the production artifact checks.
- Artifact validation — passed: route snapshots, sitemap, precache list and hashes, regional packages, legacy and atlas maps, and historical flag assets.
- Full Playwright suite — **101/101 passed**, run with one worker against an isolated preview port. Coverage includes gameplay and replay, maps and gestures, mobile/dark interactions, saved progress, offline behavior, and SEO routes.
- Responsive browser sweep — 23 formats × seven viewport sizes × two themes; no horizontal overflow or page errors. This is Chromium viewport emulation, not a physical-device or assistive-technology lab run.
- `git diff --check` — passed.

## Remaining notes

Watershed Match remains the existing regional sample experience; its geographic coverage and puzzle data were not expanded in this pass. The sweep found no new visual or interaction blocker. The change is prepared on the polish branch only; it was not deployed or merged.
