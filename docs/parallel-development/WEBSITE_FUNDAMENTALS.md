# Website Fundamentals workstream

## Goal

Improve the public website's crawlability, metadata, social previews, performance, accessibility, security posture, homepage/navigation clarity and game discoverability without changing Maproom's client-only architecture or product identity.

## Owned implementation area

- `index.html`, `public/robots.txt`, `public/sitemap.xml` or a scoped sitemap generator, and new `src/seo/**` helpers.
- Markup/content in `src/App.tsx`, `src/components/Shell.tsx`, `src/pages/ExplorePage.tsx`, `InformationPage.tsx`, and `NotFoundPage.tsx`.
- Website-focused audit notes and SEO/accessibility/security/performance browser checks.

Keep these areas untouched: `src/main.tsx` (Mobile owns its responsive stylesheet import), `src/pages/DailyPage.tsx`, individual games, `GeoMap.tsx`, shared game controls, shared design tokens/global styles, persistence and service-worker internals. Preserve semantic class/data hooks used by Mobile CSS and agree before renaming one.

## Work

- Review title/description, canonical URL behavior, robots directives, sitemap coverage, route fallback and duplicate/query URL policy for this static React Router app. Do not list parameterized game states as separate indexable pages without a clear canonical strategy.
- Add complete Open Graph and social preview metadata with locally owned/licensed assets. Avoid remote tracking scripts and unnecessary external requests.
- Inspect bundle/data loading, cache behavior and Core Web Vitals opportunities; keep game code and datasets lazy. Host-level headers or deployment changes should be documented as requirements, not applied to production.
- Audit accessibility and security with browser evidence, keyboard/contrast checks and realistic limitations. Preserve privacy and offline behavior.
- Improve homepage/navigation copy and hierarchy, and review game naming/search wording for discoverability. Share proposed game-title changes with the owning game stream before editing its game copy.
- Work with Mobile on markup hooks: this stream owns semantic structure and content; Mobile owns responsive rules and narrow-screen QA.

## Handoff and acceptance

Provide a crawl/indexing inventory, route/canonical table, metadata and preview checks, accessibility/security/performance findings with evidence, locally served preview images and licensing notes, desktop screenshots in both themes, and a list of stable markup hooks consumed by Mobile. Separate verified results from recommendations and host-dependent assumptions.
