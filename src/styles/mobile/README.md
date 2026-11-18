# Mobile presentation contract

`mobile.css` owns responsive presentation around the shared shell, Daily, Explore, Statistics, Settings, setup/results dialogs, and existing game controls. It does not attach map input listeners or set `touch-action` on map surfaces.

On phone widths, `.app-frame` exposes these values for map-stage layout work:

- `--mobile-header-height`: sticky header height including the top safe-area inset.
- `--mobile-safe-top`, `--mobile-safe-right`, `--mobile-safe-bottom`, and `--mobile-safe-left`: device safe-area insets with zero fallbacks.

Maps can use those values to bound its stage after the header and game context bar while retaining ownership of stage geometry, pan, zoom, pointer capture, and marker placement. This branch increases existing map-control hit areas in CSS only; Maps should review the extra control footprint with its stage layout.

The current `index.html` viewport declaration does not include `viewport-fit=cover`, and that file belongs to Website Fundamentals. Safe-area CSS is in place, but nonzero iOS insets need that metadata update during integration. Historical game routes inherit the shell and shared form/dialog rules; their feature-specific stage layout remains with the Historical and Maps owners.
