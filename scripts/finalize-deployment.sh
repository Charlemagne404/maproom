#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

readonly PROJECT_DIR='/home/charlie/maproom'
readonly BUILD_SOURCE="$PROJECT_DIR/dist"
readonly DEPLOY_ROOT='/srv/maproom'
readonly RELEASES_DIR="$DEPLOY_ROOT/releases"
readonly CURRENT_LINK="$DEPLOY_ROOT/current"
readonly DOMAIN='maproom.continental-hub.com'
readonly CADDYFILE='/etc/caddy/Caddyfile'
readonly BEGIN_MARKER='# BEGIN CODEX MAPROOM MANAGED SITE'
readonly END_MARKER='# END CODEX MAPROOM MANAGED SITE'

TEMP_RELEASE=''
TEMP_LINK=''
TEMP_CONFIG=''
TEMP_CANDIDATE=''
TEMP_CONFIG_INSTALL=''
EXPECTED_BLOCK=''
LOCAL_BODY=''
PUBLIC_BODY=''
NEW_RELEASE=''
BACKUP_FILE=''
PREVIOUS_TARGET=''
RELEASE_CREATED=0
LINK_SWITCHED=0
CADDY_CHANGED=0
DEPLOYMENT_COMMITTED=0
DEPLOY_ROOT_CREATED=0
RELEASES_DIR_CREATED=0

cleanup_and_rollback() {
  local status=${1:-0}
  trap - EXIT

  if (( status != 0 && DEPLOYMENT_COMMITTED == 0 && (RELEASE_CREATED == 1 || LINK_SWITCHED == 1 || CADDY_CHANGED == 1 || DEPLOY_ROOT_CREATED == 1 || RELEASES_DIR_CREATED == 1) )); then
    printf '\nMaproom finalization failed; restoring changes made by this run.\n' >&2

    if (( LINK_SWITCHED == 1 )); then
      if [[ -n "$PREVIOUS_TARGET" ]]; then
        local restore_link="$DEPLOY_ROOT/.current.restore.$$"
        if ln -s -- "$PREVIOUS_TARGET" "$restore_link" && mv -Tf -- "$restore_link" "$CURRENT_LINK"; then
          printf 'Restored active release: %s\n' "$PREVIOUS_TARGET" >&2
        else
          printf 'Could not restore active link automatically. Previous target: %s\n' "$PREVIOUS_TARGET" >&2
        fi
      elif [[ -L "$CURRENT_LINK" ]] && [[ "$(readlink -- "$CURRENT_LINK" 2>/dev/null || true)" == "$NEW_RELEASE" ]]; then
        rm -f -- "$CURRENT_LINK" || true
        printf 'Removed the active link created by this run.\n' >&2
      fi
    fi

    if (( CADDY_CHANGED == 1 )) && [[ -n "$BACKUP_FILE" && -f "$BACKUP_FILE" ]]; then
      local restore_config="/etc/caddy/.Caddyfile.maproom.restore.$$"
      if install -o root -g root -m 0644 -- "$BACKUP_FILE" "$restore_config" && mv -f -- "$restore_config" "$CADDYFILE"; then
        if systemctl reload caddy; then
          printf 'Restored Caddy configuration from %s\n' "$BACKUP_FILE" >&2
        else
          printf 'Restored %s, but Caddy reload failed. Check systemctl status caddy.\n' "$CADDYFILE" >&2
        fi
      else
        printf 'Could not restore Caddy configuration automatically. Backup: %s\n' "$BACKUP_FILE" >&2
      fi
    fi

    if (( RELEASE_CREATED == 1 )); then
      if [[ -d "$NEW_RELEASE" && ! -L "$NEW_RELEASE" && "$(realpath -- "$CURRENT_LINK" 2>/dev/null || true)" != "$NEW_RELEASE" ]]; then
        case "$NEW_RELEASE" in
          "$RELEASES_DIR"/*) rm -r -- "$NEW_RELEASE" && printf 'Removed the inactive release created by this run.\n' >&2 ;;
          *) printf 'Refusing to remove a release outside the Maproom releases directory: %s\n' "$NEW_RELEASE" >&2 ;;
        esac
      else
        printf 'The newly created release is still active or has changed; retained for safety: %s\n' "$NEW_RELEASE" >&2
      fi
    fi

    if (( RELEASES_DIR_CREATED == 1 )) && [[ -d "$RELEASES_DIR" ]]; then
      rmdir -- "$RELEASES_DIR" 2>/dev/null || true
    fi
    if (( DEPLOY_ROOT_CREATED == 1 )) && [[ -d "$DEPLOY_ROOT" ]]; then
      rmdir -- "$DEPLOY_ROOT" 2>/dev/null || true
    fi
  fi

  for path in "$TEMP_LINK" "$TEMP_CONFIG" "$TEMP_CANDIDATE" "$TEMP_CONFIG_INSTALL" "$EXPECTED_BLOCK" "$LOCAL_BODY" "$PUBLIC_BODY"; do
    if [[ -n "$path" && -f "$path" ]]; then rm -f -- "$path"; fi
  done
  if [[ -n "$TEMP_RELEASE" && -d "$TEMP_RELEASE" && ! -L "$TEMP_RELEASE" ]]; then
    case "$TEMP_RELEASE" in
      "$RELEASES_DIR"/.maproom-*.tmp.*) rm -r -- "$TEMP_RELEASE" ;;
      *) printf 'Refusing to remove unexpected staging path: %s\n' "$TEMP_RELEASE" >&2 ;;
    esac
  fi
  exit "$status"
}
trap 'status=$?; cleanup_and_rollback "$status"' EXIT

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

print_rollback_handoff() {
  if [[ -n "$PREVIOUS_TARGET" ]]; then
    local rollback_command="tmp=$DEPLOY_ROOT/.current.rollback.\$\$; ln -s -- \"$PREVIOUS_TARGET\" \"\$tmp\" && mv -Tf -- \"\$tmp\" \"$CURRENT_LINK\""
    printf 'Rollback target: %s\n  sudo bash -c %q\n' "$PREVIOUS_TARGET" "$rollback_command"
  else
    printf 'First deployment. To remove the active link: sudo rm -f -- %q\n' "$CURRENT_LINK"
    if (( CADDY_CHANGED == 1 )); then
      printf 'To restore the previous Caddyfile: sudo cp -a -- %q %q && sudo systemctl reload caddy\n' "$BACKUP_FILE" "$CADDYFILE"
    fi
  fi
}

if (( EUID != 0 )); then
  fail 'Run this script with sudo. It only publishes the prepared build and updates the Maproom Caddy site block.'
fi

for command in caddy systemctl curl install cp cat mv ln readlink realpath find sort sha256sum sed grep awk mktemp date getent stat diff cmp sleep xargs cut rm rmdir chmod chown mkdir head; do
  command -v "$command" >/dev/null 2>&1 || fail "Required system utility is missing: $command"
done

[[ -d "$PROJECT_DIR" ]] || fail "Project directory is missing: $PROJECT_DIR"
[[ -d "$BUILD_SOURCE" && ! -L "$BUILD_SOURCE" ]] || fail "Build directory is missing or is a symlink: $BUILD_SOURCE"
[[ "$(realpath -- "$BUILD_SOURCE")" == "$BUILD_SOURCE" ]] || fail 'The build directory resolved outside the expected project path.'
[[ -s "$BUILD_SOURCE/index.html" ]] || fail 'dist/index.html is missing or empty.'
grep -Fiq '<title>maproom' "$BUILD_SOURCE/index.html" || fail 'dist/index.html does not identify the Maproom application.'
grep -Fq 'id="root"' "$BUILD_SOURCE/index.html" || fail 'dist/index.html has no application mount point.'
[[ -d "$BUILD_SOURCE/assets" ]] || fail 'dist/assets is missing.'
find "$BUILD_SOURCE/assets" -maxdepth 1 -type f -name '*.js' -print -quit | grep -q . || fail 'No compiled JavaScript bundle was found.'
find "$BUILD_SOURCE/assets" -maxdepth 1 -type f -name '*.css' -print -quit | grep -q . || fail 'No compiled stylesheet was found.'
for relative in manifest.webmanifest sw.js offline.html precache-manifest.json robots.txt sitemap.xml social/maproom-preview.png icons/maproom.svg data/countries.json data/countries.topo.json data/countries-outline.topo.json data/cities.json data/cities-major.json data/rivers.json data/population-age-profiles.json data/watershed-match.json data/data-manifest.json data/coverage.json data/region-index.json data/historical/manifest.json; do
  [[ -s "$BUILD_SOURCE/$relative" ]] || fail "Required production file is missing or empty: dist/$relative"
done
for relative in explore about data privacy statistics settings 404 games/countries games/outlines games/routes games/flags games/grid games/cities games/connections games/higher-lower games/neighbours games/distance games/rivers games/latitude-ladder games/historical-geography games/projection-match games/population-pyramid games/watershed-match; do
  [[ -s "$BUILD_SOURCE/$relative/index.html" ]] || fail "Required route snapshot is missing or empty: dist/$relative/index.html"
done
for map_number in {1..20}; do
  printf -v map_index '%02d' "$map_number"
  [[ -s "$BUILD_SOURCE/data/historical/maps/historical-map-$map_index.svg" ]] || fail "Required historical map is missing or empty: dist/data/historical/maps/historical-map-$map_index.svg"
done
[[ -d "$BUILD_SOURCE/data/regions" ]] || fail 'dist/data/regions is missing.'
find "$BUILD_SOURCE/data/regions" -maxdepth 1 -type f -name '*.topo.json' -print -quit | grep -q . || fail 'No first-level boundary packages were found.'

APP_VERSION="$(sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([0-9]+\.[0-9]+\.[0-9]+)".*/\1/p' "$PROJECT_DIR/package.json" | head -n 1)"
[[ "$APP_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail 'Could not read a stable x.y.z release version from package.json.'
BUILD_HASH="$(cd "$BUILD_SOURCE" && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -c 1-12)"
[[ "$BUILD_HASH" =~ ^[a-f0-9]{12}$ ]] || fail 'Could not calculate the build content hash.'
RELEASE_ID="$APP_VERSION-$BUILD_HASH"
NEW_RELEASE="$RELEASES_DIR/$RELEASE_ID"

if ! getent group caddy >/dev/null 2>&1; then fail 'The existing caddy group was not found.'; fi
[[ -f "$CADDYFILE" && ! -L "$CADDYFILE" ]] || fail "Expected a regular Caddyfile at $CADDYFILE."
systemctl is-active --quiet caddy || fail 'The existing Caddy service is not active; no configuration was changed.'

if [[ -e "$DEPLOY_ROOT" || -L "$DEPLOY_ROOT" ]]; then
  [[ -d "$DEPLOY_ROOT" && ! -L "$DEPLOY_ROOT" ]] || fail "$DEPLOY_ROOT exists but is not a real directory."
  [[ "$(stat -c '%U' "$DEPLOY_ROOT")" == root ]] || fail "$DEPLOY_ROOT is not owned by root; refusing to take over the path."
fi
if [[ -e "$RELEASES_DIR" || -L "$RELEASES_DIR" ]]; then
  [[ -d "$RELEASES_DIR" && ! -L "$RELEASES_DIR" ]] || fail "$RELEASES_DIR exists but is not a real directory."
fi
if [[ -L "$CURRENT_LINK" ]]; then
  PREVIOUS_TARGET="$(realpath -- "$CURRENT_LINK" 2>/dev/null || true)"
  [[ "$PREVIOUS_TARGET" == "$RELEASES_DIR"/* && -d "$PREVIOUS_TARGET" ]] || fail 'The existing current link does not point to a Maproom release; refusing to replace it.'
elif [[ -e "$CURRENT_LINK" ]]; then
  fail "$CURRENT_LINK exists and is not a symlink; refusing to replace it."
fi

if [[ ! -e "$DEPLOY_ROOT" && ! -L "$DEPLOY_ROOT" ]]; then DEPLOY_ROOT_CREATED=1; fi
if [[ ! -e "$RELEASES_DIR" && ! -L "$RELEASES_DIR" ]]; then RELEASES_DIR_CREATED=1; fi
mkdir -p -- "$RELEASES_DIR"
chown root:caddy "$DEPLOY_ROOT" "$RELEASES_DIR"
chmod 0755 "$DEPLOY_ROOT" "$RELEASES_DIR"

if [[ -e "$NEW_RELEASE" || -L "$NEW_RELEASE" ]]; then
  [[ -d "$NEW_RELEASE" && ! -L "$NEW_RELEASE" ]] || fail "The release path already exists and is not a directory: $NEW_RELEASE"
  if ! diff -qr -- "$BUILD_SOURCE" "$NEW_RELEASE" >/dev/null; then
    fail "A different build already occupies $NEW_RELEASE. Increment package.json version before publishing a replacement."
  fi
  chown -R root:caddy "$NEW_RELEASE"
  find "$NEW_RELEASE" -type d -exec chmod 0755 {} +
  find "$NEW_RELEASE" -type f -exec chmod 0644 {} +
  printf 'Found the same versioned release: %s\n' "$NEW_RELEASE"
else
  TEMP_RELEASE="$RELEASES_DIR/.maproom-$RELEASE_ID.tmp.$$"
  [[ ! -e "$TEMP_RELEASE" && ! -L "$TEMP_RELEASE" ]] || fail "Temporary release path already exists: $TEMP_RELEASE"
  mkdir -m 0755 -- "$TEMP_RELEASE"
  cp -a -- "$BUILD_SOURCE/." "$TEMP_RELEASE/"
  chown -R root:caddy "$TEMP_RELEASE"
  find "$TEMP_RELEASE" -type d -exec chmod 0755 {} +
  find "$TEMP_RELEASE" -type f -exec chmod 0644 {} +
  mv -- "$TEMP_RELEASE" "$NEW_RELEASE"
  TEMP_RELEASE=''
  RELEASE_CREATED=1
  printf 'Prepared release: %s\n' "$NEW_RELEASE"
fi

EXPECTED_BLOCK="$(mktemp /etc/caddy/.maproom-expected.XXXXXX)"
cat > "$EXPECTED_BLOCK" <<'CADDY_BLOCK'
# BEGIN CODEX MAPROOM MANAGED SITE
maproom.continental-hub.com {
	encode zstd gzip
	root * /srv/maproom/current

	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "camera=(), microphone=(), geolocation=()"
		Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'sha256-c+MNE94ONtentQwhmPE0Lf/pVhHThnlI8ODppCushMw='; connect-src 'self'; worker-src 'self'; manifest-src 'self'; font-src 'self'"
		-Server
	}

	@immutable path /assets/*
	header @immutable Cache-Control "public, max-age=31536000, immutable"
	@revalidate path / /index.html /explore /explore/index.html /about /about/index.html /data /data/index.html /privacy /privacy/index.html /statistics /statistics/index.html /settings /settings/index.html /404 /404/index.html /games/* /sw.js /manifest.webmanifest /precache-manifest.json /data/*
	header @revalidate Cache-Control "no-cache"

	@spa path / /explore /about /data /privacy /statistics /settings /404 /games/countries /games/outlines /games/routes /games/flags /games/grid /games/cities /games/connections /games/higher-lower /games/neighbours /games/distance /games/rivers /games/latitude-ladder /games/historical-geography /games/projection-match /games/population-pyramid /games/watershed-match
	handle @spa {
		try_files {path}/index.html {path} /index.html
		file_server
	}
	handle {
		file_server
	}

	handle_errors 404 {
		rewrite /404/index.html
		file_server
	}
}
# END CODEX MAPROOM MANAGED SITE
CADDY_BLOCK

marker_begin_count="$(grep -Fc -- "$BEGIN_MARKER" "$CADDYFILE" || true)"
marker_end_count="$(grep -Fc -- "$END_MARKER" "$CADDYFILE" || true)"
if [[ "$marker_begin_count" == 1 && "$marker_end_count" == 1 ]]; then
  TEMP_CONFIG="$(mktemp /etc/caddy/.maproom-extracted.XXXXXX)"
  awk -v begin="$BEGIN_MARKER" -v end="$END_MARKER" '$0 == begin { capture=1 } capture { print } $0 == end { capture=0 }' "$CADDYFILE" > "$TEMP_CONFIG"
  if ! cmp -s -- "$EXPECTED_BLOCK" "$TEMP_CONFIG"; then
    fail 'A Maproom managed block already exists but differs from this script. Review it manually; no site block was overwritten.'
  fi
  printf 'The expected Maproom Caddy block is already installed.\n'
elif [[ "$marker_begin_count" != 0 || "$marker_end_count" != 0 ]]; then
  fail 'The Caddyfile contains an unmatched or duplicated Maproom marker; refusing to edit it.'
elif grep -Fq -- "$DOMAIN" "$CADDYFILE"; then
  fail "The hostname $DOMAIN already appears in Caddy without this script's markers; review that existing configuration first."
else
  TEMP_CANDIDATE="$(mktemp /etc/caddy/.Caddyfile.maproom-candidate.XXXXXX)"
  cat -- "$CADDYFILE" > "$TEMP_CANDIDATE"
  printf '\n' >> "$TEMP_CANDIDATE"
  cat -- "$EXPECTED_BLOCK" >> "$TEMP_CANDIDATE"
  caddy validate --config "$TEMP_CANDIDATE" --adapter caddyfile
  BACKUP_FILE="${CADDYFILE}.backup.maproom.$(date -u +%Y%m%dT%H%M%SZ)-$$"
  [[ ! -e "$BACKUP_FILE" ]] || fail "Refusing to overwrite an existing backup: $BACKUP_FILE"
  cp -a -- "$CADDYFILE" "$BACKUP_FILE"
  TEMP_CONFIG_INSTALL="$(mktemp /etc/caddy/.Caddyfile.maproom-install.XXXXXX)"
  install -o root -g root -m 0644 -- "$TEMP_CANDIDATE" "$TEMP_CONFIG_INSTALL"
  mv -f -- "$TEMP_CONFIG_INSTALL" "$CADDYFILE"
  TEMP_CONFIG_INSTALL=''
  TEMP_CONFIG="$TEMP_CANDIDATE"
  TEMP_CANDIDATE=''
  CADDY_CHANGED=1
  printf 'Installed a validated Maproom site block. Backup: %s\n' "$BACKUP_FILE"
fi

TEMP_LINK="$DEPLOY_ROOT/.current.maproom.$$"
[[ ! -e "$TEMP_LINK" && ! -L "$TEMP_LINK" ]] || fail "Temporary link already exists: $TEMP_LINK"
ln -s -- "$NEW_RELEASE" "$TEMP_LINK"
mv -Tf -- "$TEMP_LINK" "$CURRENT_LINK"
TEMP_LINK=''
LINK_SWITCHED=1

if (( CADDY_CHANGED == 1 )); then
  systemctl reload caddy || fail 'Caddy did not reload the validated configuration.'
fi
systemctl is-active --quiet caddy || fail 'Caddy is not active after deployment.'

LOCAL_BODY="$(mktemp /tmp/maproom-local-check.XXXXXX)"
PUBLIC_BODY="$(mktemp /tmp/maproom-public-check.XXXXXX)"

local_http_code="$(curl --silent --show-error --max-time 12 --resolve "$DOMAIN:80:127.0.0.1" --output /dev/null --write-out '%{http_code}' "http://$DOMAIN/" 2>/dev/null || true)"
printf 'Local HTTP response: %s\n' "${local_http_code:-unavailable}"

local_tls_verified=0
local_https_code=''
for attempt in 1 2 3 4 5 6; do
  if local_https_code="$(curl --fail --silent --show-error --max-time 10 --resolve "$DOMAIN:443:127.0.0.1" --output "$LOCAL_BODY" --write-out '%{http_code}' "https://$DOMAIN/" 2>/dev/null)"; then
    if [[ "$local_https_code" == 200 ]] && grep -Fiq '<title>maproom' "$LOCAL_BODY"; then
      local_tls_verified=1
      break
    fi
  fi
  sleep 5
done

local_tls_unverified=0
if (( local_tls_verified == 0 )); then
  local_https_code="$(curl --insecure --fail --silent --show-error --max-time 12 --resolve "$DOMAIN:443:127.0.0.1" --output "$LOCAL_BODY" --write-out '%{http_code}' "https://$DOMAIN/" 2>/dev/null || true)"
  if [[ "$local_https_code" == 200 ]] && grep -Fiq '<title>maproom' "$LOCAL_BODY"; then local_tls_unverified=1; fi
fi

local_deep_link_ok=0
if (( local_tls_verified == 1 )); then
  if curl --fail --silent --show-error --max-time 12 --resolve "$DOMAIN:443:127.0.0.1" --output "$LOCAL_BODY" "https://$DOMAIN/games/countries?mode=daily" 2>/dev/null \
    && grep -Fiq '<title>maproom' "$LOCAL_BODY"; then local_deep_link_ok=1; fi
elif (( local_tls_unverified == 1 )); then
  if curl --insecure --fail --silent --show-error --max-time 12 --resolve "$DOMAIN:443:127.0.0.1" --output "$LOCAL_BODY" "https://$DOMAIN/games/countries?mode=daily" 2>/dev/null \
    && grep -Fiq '<title>maproom' "$LOCAL_BODY"; then local_deep_link_ok=1; fi
fi

if (( local_tls_verified == 1 )); then
  printf 'Local HTTPS certificate and app shell: verified.\n'
elif (( local_tls_unverified == 1 )); then
  printf 'Local HTTPS app shell: served, but origin certificate is not trusted yet.\n'
else
  fail 'The local HTTPS origin did not serve the Maproom app shell; deployment changes will be rolled back.'
fi
(( local_deep_link_ok == 1 )) || fail 'The local deep-link check failed; deployment changes will be rolled back.'
printf 'Local deep route: verified.\n'

DEPLOYMENT_COMMITTED=1
print_rollback_handoff

public_ok=0
if curl --fail --silent --show-error --max-time 20 --output "$PUBLIC_BODY" "https://$DOMAIN/" 2>/dev/null \
  && grep -Fiq '<title>maproom' "$PUBLIC_BODY"; then
  public_ok=1
fi

if (( public_ok == 1 )); then
  if curl --fail --silent --show-error --max-time 20 --output "$PUBLIC_BODY" "https://$DOMAIN/games/countries?mode=daily" 2>/dev/null \
    && grep -Fiq '<title>maproom' "$PUBLIC_BODY"; then
    printf 'Public HTTPS and deep route: verified at https://%s/.\n' "$DOMAIN"
  else
    printf 'WARNING: the public homepage works, but the public deep-link check failed. The local release remains active.\n' >&2
    exit 2
  fi
elif (( local_tls_verified == 1 )); then
  printf 'WARNING: local HTTPS is verified, but the public URL did not return the Maproom app. Check the Cloudflare origin path and retry. The local release remains active.\n' >&2
  exit 2
else
  printf 'WARNING: the local Caddy origin serves Maproom, but trusted HTTPS and the public URL are not yet verified. Check Caddy certificate issuance and Cloudflare origin TLS, then rerun this script. The local release remains active.\n' >&2
  exit 2
fi

printf '\nMaproom release is active: %s\n' "$NEW_RELEASE"
printf 'Active link: %s -> %s\n' "$CURRENT_LINK" "$NEW_RELEASE"
if (( CADDY_CHANGED == 1 )); then printf 'Caddy backup: %s\n' "$BACKUP_FILE"; fi

rm -f -- "$LOCAL_BODY" "$PUBLIC_BODY"
