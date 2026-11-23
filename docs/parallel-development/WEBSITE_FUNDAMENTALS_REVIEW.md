# Website Fundamentals review

> **Historical review snapshot.** Route and game counts below describe the 19 November integration, not the current 18-game catalogue. See the [current final handover](../FINAL_HANDOVER.md).

Date: 18 November 2026
Worktree: `/home/charlie/maproom-worktrees/web`
Branch: `codex/maproom-2.0-web-20261118`

## Architecture and indexability

Maproom is a Vite and React single-page app with React Router. The application shell renders the route after JavaScript starts. The deployment script identifies `https://maproom.continental-hub.com` as the site origin. During integration, its repository-owned Caddy block was updated and tested against the generated route files.

The build step emits route-specific HTML snapshots beside the app assets. Each snapshot has its own title, description, canonical URL, robots directive, Open Graph and Twitter card tags, JSON-LD, and a short semantic HTML fallback. The metadata is generated from the game catalog; stable game IDs, paths and persistence IDs are unchanged. The integrated sitemap contains the 18 canonical indexable routes.

The original workstream reproduced the old `try_files {path} /index.html` issue: `/explore` and `/games/cities` received the root snapshot. Integration changed the repository's finalizer template to try `{path}/index.html`, then `{path}`, then `/index.html` for the known app routes, while serving other files directly. An isolated Caddy 2.11.4 instance served the correct `/explore`, `/games/cities` and `/games/historical-geography` snapshots; `/missing-route` returned the generated Maproom 404 body with HTTP 404. Route HTML and the service worker receive `Cache-Control: no-cache`, and hashed assets receive immutable caching. The deployed host configuration was not inspected, changed or reloaded, so an operator must publish the reviewed block through the normal release process.

| Route group | Sitemap | Robots behavior | Canonical policy |
| --- | --- | --- | --- |
| `/` | Included | `index,follow` | Production root URL |
| `/explore` | Included | `index,follow` | Clean route without filters |
| `/games/{id}` for the 13 catalog games | Included | `index,follow` | Stable game route; query variants canonicalize to the path |
| `/about`, `/data`, `/privacy` | Included | `index,follow` | Clean route |
| `/statistics`, `/settings`, `/404` | Excluded | `noindex,follow` | Clean route |
| Filtered Explore and parameterized game routes | Excluded | Runtime `noindex,follow` | Clean route without query parameters |
| Unknown routes | Excluded | Custom not-found HTML, HTTP 404 | The Caddy error route serves the `/404` snapshot with the 404 status |

The sitemap has no category, format, favorite, search, or daily-date URLs. Those states do not create extra landing pages. Explore contains links to every catalog game, and game snapshots link back to Explore and Daily.

The Caddy template's final `handle_errors 404` serves the generated `/404/index.html` snapshot and preserves HTTP 404. The local response check confirmed the status and page content. Production behavior remains unverified until an operator applies the repository template.

## SEO and social previews

- Added per-route titles and natural descriptions covering country quizzes, geography games, capitals, flags, maps, borders, rivers, and city distance. The homepage title begins with “Maproom” to retain the deployment preflight contract.
- Added browser-managed title, description, canonical, robots, Open Graph, Twitter, and JSON-LD metadata for client-side route changes.
- Added pre-rendered snapshots for eight fixed routes and all thirteen catalog games. The canonical build checks all 21 snapshots and 18 sitemap URLs.
- Added `robots.txt` and a build-generated sitemap. The sitemap origin is read from `scripts/finalize-deployment.sh`, rather than guessed or inferred from localhost.
- Added `WebSite`, `WebPage`, and `WebApplication` structured data without ratings, reviews, or other unsupported claims.
- Added a locally authored 1200×630 SVG and PNG social preview. It uses no remote images, tracking pixels, or third-party font/image requests. The vector is the source artwork; the PNG is its locally rendered share asset.
- Updated Explore’s H1 to **Geography games** and added one concise description for visitors and search engines. About now links to Data and Explore through client-side links.

The updated Caddy template serves those snapshots before the SPA fallback, so non-JavaScript crawlers and share-preview fetchers can receive route-specific metadata once the reviewed block is applied on the production host. Search Console, Bing Webmaster, social-card validators, and actual crawl/index results were not available in this worktree.

## Performance

The app lazy-loads `GamePage`, each of the thirteen game components, TopoJSON, region geometry and optional data. Integration preserves those boundaries and adds no runtime packages. The integrated build emits distinct chunks for all thirteen games and a precache list of 197 compiled assets; generated HTML snapshots and the historical map collection remain outside that JavaScript/CSS asset list.

The integrated production preview reported a 301.03 KB main JavaScript chunk (91.76 KB gzip) and 650.13 KB main stylesheet (126.72 KB gzip). The Historical Geography JavaScript chunk is 11.91 KB (4.29 KB gzip) and its game stylesheet is 5.98 KB (1.74 KB gzip). Its SVG maps are loaded individually on demand and cached after first successful fetch. These are local build sizes, not hosted transfer or Core Web Vitals measurements.

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
- The deployment template keeps HSTS, `nosniff`, frame denial, a referrer policy, a permissions policy, and a same-origin CSP. Its `script-src` includes the SHA-256 hash of the exact inline theme bootstrap; it does not add script `unsafe-inline`. The canonical artifact validator recalculates that hash from built HTML and checks the template.
- Caddy's no-cache matcher includes route snapshots and `/sw.js`; fingerprinted `/assets/*` receive one-year immutable caching. The isolated Caddy response check verified both policies.

## Homepage and navigation review

The Daily page now has 28 date-seeded greetings. The continuation panel names the saved game, mode, and progress and offers a single primary Resume link. **Play anytime** remains full-bleed beneath the Daily content. Navigation underline and utility-icon hover/focus treatments stay in their scoped stylesheet. Final integrated desktop and mobile screenshots are recorded in the integration QA gallery.

## Game naming review

Four recommended visible titles were adopted during integration without changing IDs, routes, persistence keys, or saved historical result labels.

| Name before integration | Integrated display name | Reason |
| --- | --- | --- |
| Find the country | Keep | High. Directly tells the player what to do. |
| Country outlines | **Country Outline Quiz** | Medium. Names both the subject and quiz format; keep the card art and description concise. |
| Border route | Keep as **Border Route** | High. Clear mechanic and a memorable two-word name. |
| Flag study | **Flag Match** | High. “Study” undersells the matching interaction and is less intuitive. |
| Geography grid | Keep as **Geography Grid** | High. Accurate, short, and easy to scan. |
| Capitals & cities | Keep as **Capitals & Cities** | High. Clear subject coverage. |
| Geography Connections | Keep | High. Distinctive and consistent with the puzzle format. |
| Higher or Lower | **Higher or Lower: Countries** | Medium. Preserves the familiar game mechanic while making the geography subject explicit. |
| Neighbour Challenge | Keep | Medium. Clear in British English; retain the current spelling consistently. |
| Distance & Direction | **City Distance & Direction** | Medium. Signals that the game compares cities, not generic map distances. |
| Riverways | Keep | High. Memorable and clearly tied to river routes. |
| Latitude Ladder | Keep | High. Memorable while describing the ordering mechanic. |

The titles are display/SEO copy only; routes and puzzle identities remain stable.

## Workstream-local validation before integration

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

The workstream-local run above predates integration. Final integrated browser, visual, and route results are recorded in [INTEGRATION_REPORT.md](INTEGRATION_REPORT.md).

## Git and integration state

The original workstream stayed on its assigned branch. Its handoff and test history are preserved here; the coordinator integration and release boundary are recorded in [INTEGRATION_REPORT.md](INTEGRATION_REPORT.md).

Website/Mobile seam preserved: existing `.site-header`, `.primary-nav`, `.nav-link`, `.header-tools`, `.main-content`, `.page`, `.explore-page`, `.page-heading`, `.filter-row`, and `.explore-grid` hooks remain; the shell adds only `.site-header-polished` for its scoped hover rules.
