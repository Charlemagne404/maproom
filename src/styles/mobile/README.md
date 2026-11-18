# Mobile presentation contract

`mobile.css` owns responsive presentation around the shared shell, Daily, Explore, Statistics, Settings, setup/results dialogs, and existing game controls. It does not attach map input listeners or set `touch-action` on map surfaces.

On phone widths, `.app-frame` exposes these values for map-stage layout work:

- `--mobile-header-height`: sticky header height including the top safe-area inset.
- `--mobile-safe-top`, `--mobile-safe-right`, `--mobile-safe-bottom`, and `--mobile-safe-left`: device safe-area insets with zero fallbacks.

Maps can use those values to bound its stage after the header and game context bar while retaining ownership of stage geometry, pan, zoom, pointer capture, and marker placement. This branch increases existing map-control hit areas in CSS only; Maps should review the extra control footprint with its stage layout.

`index.html` now declares `viewport-fit=cover`, so the existing safe-area insets can apply on notched iOS devices. Browser viewport checks cover phone, tablet and landscape dimensions; they do not replace physical-device testing. Historical game routes inherit the shell and shared form/dialog rules, with feature-specific stage layout in the Historical and Maps workstreams.
