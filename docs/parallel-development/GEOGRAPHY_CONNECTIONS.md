# Geography Connections workstream

## Goal

Overhaul Geography Connections as a complete, polished game: improve puzzle quality and difficulty, give the selection/solve/reveal loop clear interaction and animation, and retain Maproom's geography-first identity.

## Owned implementation area

- `src/games/connections/**`, including the existing `ConnectionsGame.tsx` and a namespaced game stylesheet.
- `src/puzzles/connections.ts` and Connections-only puzzle/content helpers.
- Connections-specific unit, content-validation and browser coverage.

The current stable game ID is already registered. Do not edit the catalog, ID union, component registry, generic puzzle engine, shared controls/results, other games, global CSS/tokens, persistence, or Daily flow. Reuse current game setup, result and session contracts. If a shared component needs a new API, document the proposal for integration.

## Work

- Define a distinctive round rhythm: select countries, submit or resolve, show group labels and explanations, communicate remaining errors and make replay deliberate.
- Use the NYT Connections-inspired four-groups-of-four interaction and reveal rhythm as a genre reference, while building Maproom-specific geography clues and visual language. Do not imitate another product's names, graphics or copy.
- Expand and validate clue/content sources. Prevent duplicate solutions, overly broad categories, contested naming assumptions, clue leakage and difficulty labels that do not match actual ambiguity.
- Make wrong, one-away, solved, remaining-mistake and completed states understandable without color or animation alone. Respect keyboard operation, reduced motion, focus retention and touch targets.
- Design a resilient small-screen grid and solved-group layout without depending on Mobile's app-shell stylesheet.

## Handoff and acceptance

Include the content pool and source notes, deterministic board generation, ambiguity/difficulty checks, tests for all feedback states, keyboard/touch browser coverage, and desktop/mobile screenshots in both themes. Keep all changes within Connections-owned paths unless a shared API proposal is approved.
