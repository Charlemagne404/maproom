import { createHash } from 'node:crypto'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')
const assetsDir = path.join(root, 'dist', 'assets')
const output = path.join(root, 'dist', 'precache-manifest.json')

async function filesIn(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name)
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesIn(absolute, relative))
    else if ((await stat(absolute)).isFile()) files.push(relative)
  }
  return files
}

const assetFiles = (await filesIn(assetsDir)).sort()
const assets = assetFiles.map((file) => `/assets/${file}`)
if (assets.length === 0) throw new Error('No compiled assets were found for the offline shell.')

const fingerprint = createHash('sha256')
for (const file of (await filesIn(distDir)).filter((file) => file !== 'precache-manifest.json').sort()) {
  fingerprint.update(file).update('\0').update(await readFile(path.join(distDir, file))).update('\0')
}
const buildId = fingerprint.digest('hex').slice(0, 16)
const workerPath = path.join(distDir, 'sw.js')
const workerTemplate = await readFile(workerPath, 'utf8')
const marker = '__MAPROOM_CACHE_VERSION__'
if (!workerTemplate.includes(marker)) throw new Error('The service-worker cache-version marker is missing.')
await writeFile(workerPath, workerTemplate.replace(marker, buildId))
await writeFile(output, `${JSON.stringify({ buildId, assets }, null, 2)}\n`)
console.log(`Wrote the offline manifest for ${assets.length} assets (build ${buildId}).`)
