# Operations

## Routine update

1. Update the application in `/home/charlie/maproom` as the normal user.
2. If geography changes, run `npm run data:sync`, review `docs/DATA_COVERAGE.md`, and inspect `public/data/data-manifest.json` and `region-index.json` for current retrieval dates, hashes and license evidence.
3. Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and `npm run e2e`.
4. Run `sudo /home/charlie/maproom/scripts/finalize-deployment.sh` to publish a new immutable release and verify it.

Do not edit `/etc/caddy/Caddyfile` manually for routine releases. The finalization script owns only its marked Maproom site block and writes a backup before changing the main file.

## Health checks

- Public page: `curl -fsSI https://maproom.continental-hub.com/`
- Deep link: `curl -fsSI 'https://maproom.continental-hub.com/games/countries?mode=daily'`
- Local origin (run on the host): `curl -fsS --resolve maproom.continental-hub.com:443:127.0.0.1 https://maproom.continental-hub.com/`
- Service: `systemctl is-active caddy`
- Active build: `readlink -f /srv/maproom/current`
- Current release files: `find -L /srv/maproom/current -maxdepth 2 -type f -printf '%P\n' | head`

The app has no server-side health endpoint; the root document, client assets and static geography are its health surface. The browser's developer console and its service-worker/cache panel help distinguish a missing static asset from an origin or certificate issue.

## Troubleshooting

- **Caddy validation fails:** the script leaves the live config untouched. Read its error; review the timestamped backup and managed block. Correct only the Maproom block and rerun.
- **Caddy reload fails:** the script restores the previous active link and prior Caddyfile and attempts to reload that configuration. Check `systemctl status caddy` and `journalctl -u caddy -n 80 --no-pager`.
- **Origin serves HTML but public URL returns 525:** the release is active locally. Check Caddy's certificate issuance log, Cloudflare SSL/TLS origin mode, port reachability and the wildcard record's origin target. The finalizer will report this condition without discarding the working local release.
- **A game data file fails offline:** open that game once while online so the service worker can cache its lazy dataset. Compiled game code is precached on install; region TopoJSON packages are intentionally loaded one country at a time.
- **Progress is missing:** results are browser-local. Check that the same browser profile and origin are in use; import a previously exported JSON backup if available.
- **A city or name is not accepted:** inspect its source alternate names in the normalized city/country record and regenerate from upstream before changing the mapping. The game deliberately restricts ambiguous city-name answers to the city’s country.

## Dataset updates and retention

Dataset refreshes follow the current upstream snapshots. The builder stores its raw downloads in `.data/raw/` for review but `.data/` is local-only and must not be published. Review license changes before redistributing. Release directories and Caddyfile backups are deliberately retained; remove an old release only after confirming it is not the active target and no rollback is needed.

## Browser storage

IndexedDB uses database `maproom-progress`, schema version 1, with `settings` and `history` stores. Browser storage fallback uses the `maproom-progress-v1` localStorage key. The in-app Settings page supports JSON export/import and a confirmed reset. Clearing browser/site data bypasses the app's export safeguard and can remove progress.
