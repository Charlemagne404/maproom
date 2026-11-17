# Deployment

## Observed production state

The existing site is served from `/srv/maproom/current`. A read-only check on 2026-11-17 found it resolving to `/srv/maproom/releases/1.2.0-dac85cc7b547`; `/srv/maproom/releases/1.1.0-cb626ad2bedd` also remains present for rollback. No service or release files were changed during this refinement.

The local refinement is package version 1.2.0 and is a candidate only. This work did not switch `/srv/maproom/current`, reload Caddy, or change the public application. Production remains on the already active `1.2.0-dac85cc7b547` release.

## Build and review

Run the unprivileged checks from `/home/charlie/maproom`:

```sh
npm run typecheck
npm run lint
npm test
npm run e2e
```

`npm run e2e` builds the static application before running the single-worker browser suite. Captured review images are in `artifacts/qa/product-consistency/`. `dist/` is the candidate build; it is not an activation or a production backup.

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

The 1.2.0 product consistency candidate has been built and reviewed locally; it has not been activated. Production remains on the pre-existing `1.2.0-dac85cc7b547` release, with 1.1.0 retained for rollback. No unrelated production service was changed.
