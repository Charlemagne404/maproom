# Mobile Experience workstream

## Goal

Make the application shell and non-map experience work well on phones: responsive navigation, homepage/Explore/Daily layouts, non-map games, safe areas, sensible touch targets and reliable narrow-screen behavior.

## Owned implementation area

- New, namespaced styles under `src/styles/mobile/**`.
- The single stylesheet import in `src/main.tsx` that activates those styles.
- Mobile-only Playwright coverage and screenshots, kept in mobile-specific paths.

Mobile owns responsive CSS and mobile QA, not the markup. Website Fundamentals owns shell, navigation and Explore markup; Daily owns Daily markup; each game stream owns its game markup and local styling. Keep selectors scoped to existing hooks. If a hook is missing, request it from that markup owner before relying on DOM structure.

## Work

- Cover the responsive application shell, homepage, Explore, Daily and non-map games, including navigation open/close, safe-area insets, viewport height, overflow, wrapping and keyboard/focus behavior.
- Check useful touch target sizes, spacing around bottom controls, input zoom behavior and layouts at narrow widths. Avoid fixed-height assumptions that break on browser chrome or device safe areas.
- Own responsive treatment for the shared free-play setup overlay through CSS, while keeping its shared implementation unchanged.
- Do not add map pan, zoom, pinch, wheel or SVG selection listeners. Coordinate the surrounding shell and viewport with Maps & Gameplay UX; map-specific responsive layout and gesture QA belongs to Maps.
- Preserve light/dark themes, reduced motion and existing navigation semantics. Do not add global tokens; use current theme variables and scope all new rules.

## Handoff and acceptance

Include viewport/device emulation details, mobile screenshots for shell, homepage, Explore, Daily and representative non-map games in both themes, keyboard/reduced-motion checks, overflow and touch-target findings, and the agreed hooks/viewport variables. List any map viewport constraints validated jointly with Maps.
