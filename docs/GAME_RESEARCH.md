# Geography game and web-platform research

Research performed 18 November 2026. The observations below come from the linked game pages and representative browser play where available. They describe visible mechanics, not user-study results or a claim that one product is universally more enjoyable. Recommendations are labeled separately.

## Geography games reviewed

| Game | Verified mechanics and interface observations | Design opportunity for Maproom |
| --- | --- | --- |
| [GeoGuessr](https://www.geoguessr.com/free) · [Explorer](https://www.geoguessr.com/explorer) | Street-level panorama play asks players to infer a place and place a map guess; round scoring rewards geographic proximity. Explorer separates curated map discovery from the core round loop. Street imagery supplies memorable environmental clues, but the experience depends on a large external image platform and its availability. | Learn from the satisfying reveal and distance feedback. Keep Maproom's new games fully playable from bundled map data, without a paid imagery/API dependency. |
| [Seterra](https://www.seterra.com/) | A large catalogue organizes map quizzes around countries, capitals and physical features such as rivers, lakes and mountains, with regional quizzes, mobile play and printable material. The recognizable blank-map interaction supports quick learning sessions. | Broaden subject matter while keeping each round's action obvious. Riverways adds physical geography to a library that had mostly political geography and city facts. |
| [Worldle](https://worldle.teuteuf.fr/) | The daily country puzzle presents a silhouette and allows six guesses. Distance, direction and proximity feedback make each miss informative; the page also exposes practice and extra play. | Preserve the useful guess budget and progressive information, but adapt clues to a line feature and avoid giving away a river too early. |
| [Travle](https://travle.earth/?travle-lang=en) | A route puzzle connects two countries through shared land neighbors. Hints reveal partial information such as country outlines or initials, and daily, weekly and practice play support different commitment levels. | Maproom's existing Border Route already covers this mechanic. New work should add a different learning action rather than another route variant. |
| [Globle](https://globle-game.com/) | Players name countries and receive color-coded closeness feedback toward the daily answer. The interface turns geographic proximity into an understandable signal without a full map quiz. | Use feedback that teaches something spatially meaningful. Riverways now compares the calculated centres of the guessed and target river traces and adds the target centre's country after two misses; Latitude Ladder reveals exact coordinates only after the player commits. |
| [TimeGuessr](https://timeguessr.com/play) | The played round showed a historical photograph, a year slider and a map pin; a five-round game combined time and location estimates. | Pairing two estimates can make a richer challenge, but high-quality historic imagery introduces rights, hosting and sourcing costs. It was not selected for this offline-first build. |
| [City Guesser](https://game.cityguesser.eu/) · [About](https://cityguesser.eu/) | A browser round uses location video and a map guess, with round/time options and proximity-based scoring; the inspected interface also exposed multiplayer setup. | The reveal and shared challenge are compelling. A city-video mode would need a maintained, licensed media catalogue, so it is a weak fit without reliable local assets. |

### GeoGrid reference review

An anonymous browser review of [GeoGrid](https://www.geogridgame.com/) on 18 November 2026 inspected one live World board and its category atlas. The board used a 3×3 set of country answers where each crossing combines a row and column category; the site also offered a USA board, country autocomplete, a ten-guess budget with an unlimited option, board sharing and live one-versus-one play. Its category atlas spanned flags, physical and political geography, borders, population, economics, names, sports and country facts. In the single cell followed through play, an incorrect Brazil guess used an attempt and a correct Colombia answer showed a 3.4% rarity result. This is a narrow interface observation, not a full audit of its game modes or scoring formula.

Maproom's existing Geography Grid shares the familiar row-by-column intersection structure, so this reference was used to assess clarity and replay variety rather than justify a new game. The refinement adds more documented criteria to Free Play, retains a generated nine-country distinct-answer solution and explains each entered answer against both clues. Its scarcity tiers use the number of valid candidates, not GeoGrid's observed answer-rarity display or a popularity estimate. Daily's established preset pool and puzzle identities remain unchanged. UN M49's official table places North Macedonia in Southern Europe, and the EU's official country list states 27 member states; those primary references inform the expanded criteria: [UN M49 overview](https://unstats.un.org/unsd/methodology/m49/overview/), [EU countries](https://european-union.europa.eu/principles-countries-history/eu-countries_en).

### Patterns that informed the new games

- **A single verb makes the round legible.** Guess, trace, route, compare, or order tells a player what to do before they read a long rules panel.
- **Feedback should advance the next decision.** Distance and direction can turn a miss into a better next guess. Latitude Ladder withholds coordinates until checking to protect the initial reasoning step, then provides a precise map reveal.
- **A bounded round gives practice shape.** Six guesses work well for a recognizable silhouette puzzle; five sortable cities provide a short spatial task with an objective score.
- **Replay should change the challenge.** A seeded shuffled river pool and a new city sample let Free Play continue without turning each game into an unbounded list of identical questions.
- **Variety matters more than reskinning.** Maproom already had country identification, silhouettes, neighbor routes, flags and country comparisons. Physical hydrology and ordering city coordinates add different knowledge and actions.
- **External media can be the product's largest technical cost.** Street-view and historic-video games create strong atmosphere, but introduce rights, availability and network constraints. The selected games use the existing map and city data instead.

## Web platform references

| Primary source | Verified guidance | Applied here |
| --- | --- | --- |
| [React `lazy`](https://react.dev/reference/react/lazy) and [Suspense](https://react.dev/reference/react/Suspense) | Lazy components load their code on first render; Suspense supplies a fallback while the component is pending. | Game components stay in an exhaustive lazy registry. The shared loading state is shown while a selected game chunk opens. |
| [Vite features](https://vite.dev/guide/features) | Vite transforms dynamic imports and creates production chunks for code-split modules. | The metadata catalog no longer imports every game module. An explicit `Record<GameId, …>` maps IDs to lazy components and keeps the loading boundary independently type-checked. |
| [MDN lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading) | Deferring noncritical resources can reduce initial work; lazy loading should be used where a resource is not needed immediately. | River lines and city gazetteer are fetched only by games that use them. Existing outlines and regional data retain their game/selection-specific loaders. |
| [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/) | Keyboard operability, visible focus, contrast and target-size guidance are relevant to interactive games. | Latitude Ladder reorders with labeled arrow buttons instead of drag-only controls; targets are at least 36–40 CSS pixels. The Riverways answer uses a labeled text field and suggestions. These changes are not a substitute for assistive-technology testing. |
| [Playwright test assertions](https://playwright.dev/docs/test-assertions) | Locator assertions retry while the UI settles, which is better suited to asynchronous browser states than fixed sleeps. | New E2E coverage uses accessible labels and retrying assertions around map load, guesses, results and setup. Existing browser tests remain the regression suite. |

## Project-specific recommendations and decisions

1. Keep shared infrastructure small: one metadata catalog, one exhaustive lazy component map, shared settings/result/session hooks, and game-specific puzzle modules.
2. Keep optional datasets on demand and validate their schema at the fetch boundary. This avoids making Riverways and Latitude Ladder increase every route's initial payload.
3. Keep answer selection deterministic for a given game seed and round, even in Free Play, so saved progress can restore the same challenge.
4. Keep new games outside `DAILY_GAME_IDS` until a complete deterministic daily identity, compatibility policy and suitable daily difficulty are deliberately designed.
5. Preserve the static client-only model. The selected games need neither accounts nor a backend, and their source data can be licensed and bundled locally.
6. Treat generalized boundaries and gazetteer thresholds as visible limits. A map that looks precise is not a legal boundary product; a cities500-derived file is not a complete world city register.

At finalization, the research-selected Riverways and Latitude Ladder concepts are implemented as Free Play games. Other entries in [GAME_CONCEPTS.md](GAME_CONCEPTS.md) remain proposals, not an approved build queue; the immediate next phase should use maintenance and player evidence before expanding the library.

## Research limits

This was a focused product and architecture review, not a formal usability, accessibility or performance study. Sites change their rules and free tiers over time. Some third-party interfaces depend on browser scripts or external media, so their inspected mode set may differ by region or session. The project-specific recommendations above are design judgments based on Maproom's current static architecture and bundled data.
