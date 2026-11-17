# Deployment

## Observed production state

The existing site is served from `/srv/maproom/current`, which resolves to `/srv/maproom/releases/1.1.0-cb626ad2bedd`. A read-only request to `https://maproom.continental-hub.com/` returned HTTP 200 on 2026-11-16 at 22:36 UTC.

The local refinement is package version 1.2.0. It is a candidate only. This work did not switch `/srv/maproom/current`, reload Caddy, or change the public application. The 1.1.0 release remains active.

## Build and review

Run the unprivileged checks from `/home/charlie/maproom`:

```sh
npm run typecheck
npm run lint
npm test
npm run e2e
```

`npm run e2e` builds the static application before running the single-worker browser suite. Captured review images are in `artifacts/qa/refinement-ii/`. `dist/` is the candidate build; it is not an activation or a production backup.

## Operator handoff

After reviewing the candidate and its browser captures, the operator can activate it using the existing Maproom handoff:

```sh
sudo /home/charlie/maproom/scripts/finalize-deployment.sh
```

The finalizer checks the built `dist/`, prepares an immutable version/hash release under `/srv/maproom/releases/`, and atomically changes the `current` symlink. It validates Caddy before any configuration change, keeps a timestamped Caddyfile backup if a configuration change is needed, and checks the local origin, a deep link and the public URL. If the existing marked Maproom Caddy block is already exact, it does not rewrite the main Caddyfile or reload Caddy. A failed local health check triggers rollback. After local health is confirmed, it prints the exact rollback command before checking the public URL; public Cloudflare or TLS failures are reported separately and leave the locally healthy release active.

The finalizer does not run npm or build steps as root. Do not use it to activate a candidate until the operator is ready to perform that release step.

## Rollback

Releases remain under `/srv/maproom/releases/` and are not pruned automatically. After activation, the finalizer prints the exact rollback command and previous target. Use that printed command to atomically restore the previous symlink, then verify the homepage and a game deep link. Keep the Maproom Caddy block installed during a static-release rollback.

## Activation boundary

Version 1.2.0 has been built and reviewed locally; it has not been activated. Production remains on 1.1.0. No unrelated production service was changed.
