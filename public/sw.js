const CACHE_PREFIX = 'maproom-'
const CACHE_VERSION = '__MAPROOM_CACHE_VERSION__'
const CACHE_NAME = `${CACHE_PREFIX}shell-${CACHE_VERSION}`
const APP_FILES = [
  '/',
  '/index.html',
  '/precache-manifest.json',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/maproom.svg',
  '/data/countries.json',
  '/data/coverage.json',
  '/data/data-manifest.json',
  '/data/population-age-profiles.json',
  '/data/region-index.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    await cache.addAll(APP_FILES)
    const manifestResponse = await fetch('/precache-manifest.json', { cache: 'no-cache' })
    if (!manifestResponse.ok) throw new Error('The offline asset manifest could not be loaded.')
    const manifest = await manifestResponse.json()
    if (!Array.isArray(manifest.assets) || manifest.assets.some((asset) => typeof asset !== 'string' || !asset.startsWith('/assets/'))) {
      throw new Error('The offline asset manifest is invalid.')
    }
    await cache.addAll(manifest.assets)
  })())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put('/index.html', response.clone())
      }
      return response
    }).catch(async () => (await caches.match('/index.html')) || (await caches.match('/offline.html'))))
    return
  }

  event.respondWith(caches.match(request, { ignoreVary: true }).then(async (cached) => {
    if (cached) return cached
    try {
      const response = await fetch(request)
      if (response.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/data/') || url.pathname.startsWith('/icons/'))) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, response.clone())
      }
      return response
    } catch {
      return new Response('', { status: 504, statusText: 'Offline' })
    }
  }))
})
