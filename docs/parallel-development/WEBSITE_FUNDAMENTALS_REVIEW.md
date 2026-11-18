# Website Fundamentals review

Date: 18 November 2026
Worktree: `/home/charlie/maproom-worktrees/web`
Branch: `codex/maproom-2.0-web-20261118`

## Architecture and indexability

Maproom is a Vite and React single-page app with React Router. The application shell renders the route after JavaScript starts. The deployment script identifies `https://maproom.continental-hub.com` as the site origin and configures Caddy with `try_files {path} /index.html`.

This branch adds a small build step that emits route-specific HTML snapshots beside the app assets. Each snapshot has its own title, description, canonical URL, robots directive, Open Graph and Twitter card tags, JSON-LD, and a short semantic HTML fallback. The metadata is generated from the existing game catalog; stable game IDs and paths are unchanged. The sitemap contains only the 17 canonical public content routes.

There is a host integration gate: a local Caddy reproduction of the current `try_files {path} /index.html` rule returned the root `index.html` for `/explore` and `/games/cities`, so the new nested snapshots are not selected by that rule. The build outputs are ready, but they will not reach no-JavaScript crawlers or social-preview bots through the current rule. The integration/deployment owner should try `{path}/index.html` before the SPA fallback and verify direct requests and cache headers. This branch leaves the deployment script and host configuration untouched, as required by the workstream brief. The actual production host was not queried during this review.

| Route group | Sitemap | Robots behavior | Canonical policy |
| --- | --- | --- | --- |
| `/` | Included | `index,follow` | Production root URL |
| `/explore` | Included | `index,follow` | Clean route without filters |
| `/games/{id}` for the 12 catalog games | Included | `index,follow` | Stable game route; query variants canonicalize to the path |
| `/about`, `/data`, `/privacy` | Included | `index,follow` | Clean route |
| `/statistics`, `/settings`, `/404` | Excluded | `noindex,follow` | Clean route |
| Filtered Explore and parameterized game routes | Excluded | Runtime `noindex,follow` | Clean route without query parameters |
| Unknown client routes | Excluded | Runtime `noindex,follow` | Not-found state |

The sitemap has no category, format, favorite, search, or daily-date URLs. Those states do not create extra landing pages. Explore contains links to every catalog game, and game snapshots link back to Explore and Daily.

The SPA fallback still serves HTTP 200 for unknown paths. The client displays a noindex not-found page, but bots can classify the status as a soft 404. A true HTTP 404 needs an additional host rule or a static-host error-page contract; that change is outside this workstream.

## SEO and social previews

- Added per-route titles and natural descriptions covering country quizzes, geography games, capitals, flags, maps, borders, rivers, and city distance. The homepage title begins with “Maproom” to retain the deployment preflight contract.
- Added browser-managed title, description, canonical, robots, Open Graph, Twitter, and JSON-LD metadata for client-side route changes.
- Added pre-rendered snapshots for the eight fixed routes and all twelve catalog games. The build checks every game has SEO copy.
- Added `robots.txt` and a build-generated sitemap. The sitemap origin is read from `scripts/finalize-deployment.sh`, rather than guessed or inferred from localhost.
- Added `WebSite`, `WebPage`, and `WebApplication` structured data without ratings, reviews, or other unsupported claims.
- Added a locally authored 1200×630 SVG and PNG social preview. It uses no remote images, tracking pixels, or third-party font/image requests. The vector is the source artwork; the PNG is its locally rendered share asset.
- Updated Explore’s H1 to **Geography games** and added one concise description for visitors and search engines. About now links to Data and Explore through client-side links.

The production Caddy route-selection gate above means search engines that render JavaScript can see updated metadata, while unfurled share cards and crawlers that do not run JavaScript need the route snapshots to be served first. Search Console, Bing Webmaster, social-card validators, and actual crawl/index results were not available in this worktree.

## Performance

The existing app already lazy-loads `GamePage`, each game component, TopoJSON, region geometry, and optional data. This branch keeps those boundaries and does not add runtime packages. The precache generator still reports 188 built assets; generated HTML snapshots are not added to its asset list.

| Production asset | Baseline build | Updated build | Change |
| --- | ---: | ---: | ---: |
| Main JavaScript, gzip | 86.85 KB | 89.44 KB | +2.59 KB |
| Main CSS, gzip | 124.21 KB | 124.49 KB | +0.28 KB |

On a fresh local headless Chromium load of the homepage, the unthrottled sample recorded LCP 364 ms, CLS 0.0118, and 386,310 transferred resource bytes from Vite preview. These are local lab values, not field Core Web Vitals. INP and hosted/mobile-network performance were not measured. The Lighthouse CLI was not installed.

The social preview PNG is 258 KB, loaded by preview crawlers rather than the page’s initial render. Fonts and game artwork remain self-hosted.

## Accessibility

- Explore’s search field is a search input with a stable accessible name, and its category controls are exposed as a named group.
- Navigation keeps its existing classes and landmarks. The active underline stays under the active route; hover no longer creates a second underline or fades one in and out. The active position is stable, with a visible keyboard focus outline.
- Utility icons have distinct hover and keyboard-focus reactions: theme rotates, streak lifts and warms, favorite fills softly, and settings turns. Their backgrounds stay transparent.
- The full repository unit suite passed 88/88. The browser suite includes keyboard navigation, contrast, non-text contrast, dialog focus, reduced-motion, map, mobile, and offline flows. Automated checks do not establish complete screen-reader, voice-control, physical-device, or WCAG conformance.
- Desktop screenshots were inspected in both themes: `artifacts/qa/website-fundamentals/desktop-home-light.png`, `desktop-home-dark.png`, `desktop-explore-light.png`, and `desktop-explore-dark.png`.

## Security and reliability

- `npm ci` reported zero dependency vulnerabilities. No dependencies were added.
- A source scan found no `dangerouslySetInnerHTML`, direct `innerHTML` assignment, `eval`, or `new Function` in the application. Static snapshot text is HTML-escaped; JSON-LD is serialized as JSON.
- Game state remains in local browser storage. The website adds no analytics, tracking, account system, or external API.
- The deployment script configures HSTS, `nosniff`, frame denial, a referrer policy, a permissions policy, and a same-origin CSP. It currently has `script-src 'self'` while `index.html` contains a small inline theme bootstrap. Under that policy the inline bootstrap is blocked; the app applies the preference after React loads, so this is a theme-flash and CSP-console issue rather than a game-data exposure. The host owner should either allow the exact script hash or move the bootstrap to a same-origin asset and include that asset in offline caching. No header change was made here.
- If Caddy begins serving nested route snapshots, its no-cache matcher should cover those HTML paths as well as `/index.html`; otherwise browsers may retain a stale route snapshot between releases.

## Homepage and navigation review

The homepage screenshot confirms **Play anytime** already reaches both viewport edges and visually separates free play from Daily challenges. No Daily markup or responsive CSS was changed.

The Daily page is owned by the Daily workstream. Its existing greeting pool has eight short, date-seeded variations and does not use time-of-day categories. The requested continuation redesign and a larger curated greeting pool should be handled with that owner. Suggested handoff: increase the date-seeded pool, keep the Play anytime strip full-bleed, and make the continuation card identify the saved game and mode with one primary Resume action and only useful progress detail. The current heading is generic, so the requested clarity work remains open for integration.

## Game naming review

These recommendations are editorial. No visible catalog titles were changed because game title ownership is shared with the game workstreams. Keep IDs, routes, persistence keys, and historical result labels unchanged.

| Current name | Recommendation | Confidence and reason |
| --- | --- | --- |
| Find the country | Keep | High. Directly tells the player what to do. |
| Country outlines | Consider **Country Outline Quiz** | Medium. Names both the subject and quiz format; keep the card art and description concise. |
| Border route | Keep as **Border Route** | High. Clear mechanic and a memorable two-word name. |
| Flag study | **Flag Match** | High. “Study” undersells the matching interaction and is less intuitive. |
| Geography grid | Keep as **Geography Grid** | High. Accurate, short, and easy to scan. |
| Capitals & cities | Keep as **Capitals & Cities** | High. Clear subject coverage. |
| Geography Connections | Keep | High. Distinctive and consistent with the puzzle format. |
| Higher or Lower | Consider **Higher or Lower: Countries** | Medium. Preserves the familiar game mechanic while making the geography subject explicit. |
| Neighbour Challenge | Keep | Medium. Clear in British English; retain the current spelling consistently. |
| Distance & Direction | Consider **City Distance & Direction** | Medium. Signals that the game compares cities, not generic map distances. |
| Riverways | Keep | High. Memorable and clearly tied to river routes. |
| Latitude Ladder | Keep | High. Memorable while describing the ordering mechanic. |

Any chosen title changes should be reviewed with the relevant game owner before they are made in the shared catalog.

## Validation

- `npm ci` — passed; zero vulnerabilities reported.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — 16 files, 88 tests passed.
- `npm run build` — passed; generated 20 route snapshots, 17 sitemap URLs, and the existing 188-asset offline manifest.
- Full `npm run e2e` first run — 56 passed, 4 failed. Failures were an old hover-underline assertion, an old Explore H1 assertion, and two metadata tests that incorrectly asked Vite’s SPA fallback for nested HTML files. The assertions were updated and rerun as focused checks.
- Focused Playwright after corrections — 7 passed: all 5 Website SEO tests, the homepage/navigation accessibility scenario, and the service-worker offline route scenario.
- Full `npm run e2e` final run — 60 passed in 9.6 minutes.
- After the final homepage-title compatibility adjustment, Website SEO Playwright — 5 passed; the generated title also passed the existing deployment preflight check (`<title>Maproom`).
- Local Caddy reproduction — confirmed current `try_files {path} /index.html` falls back to the root HTML for generated nested routes. The required host routing change is documented above, not applied.

The complete Playwright suite should be rerun after branch integration, especially after the Mobile markup/CSS pairing and any Caddy route change.

## Git and integration state

Implementation is on the assigned branch only. No other worktree, production file, service, or deployment configuration was changed. The full browser suite passed locally. Branch commit and push are the remaining handoff steps.

Website/Mobile seam preserved: existing `.site-header`, `.primary-nav`, `.nav-link`, `.header-tools`, `.main-content`, `.page`, `.explore-page`, `.page-heading`, `.filter-row`, and `.explore-grid` hooks remain; the shell adds only `.site-header-polished` for its scoped hover rules.
