import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { PageHeading } from '../components/Kit'

interface SourceManifest {
  sources: Array<{ name: string; source: string; version: string; retrievedAt: string; license: string; licenseUrl: string; attribution: string; transformations: string[]; includedPackages?: number }>
}
interface RegionRecord {
  iso3: string
  name: string
  count: number
  year: string
  license: string
  licenseSource: string
  source: string
  sourceUrl: string
  status: string
}
interface Coverage {
  generatedAt: string
  countryCatalogCount: number
  countryGeometryFeatureCount: number
  countryCodesWithGeometry: number
  admin1CountriesIncluded: number
  admin1UnitsIncluded: number
  cityCount: number
  limitations: string[]
}

export function InformationPage({ page }: { page: 'about' | 'data' | 'privacy' }) {
  if (page === 'about') return <AboutPage />
  if (page === 'privacy') return <PrivacyPage />
  return <DataPage />
}

function AboutPage() {
  return (
    <div className="page information-page">
      <PageHeading eyebrow="A note from the map room" title="About Maproom" description="A calm place for the geography games worth coming back to." />
      <article className="prose">
        <p className="lead">Maproom gathers maps, names, flags, routes and daily puzzles into one small atlas. It is made for a few curious minutes at a time.</p>
        <h2>Play, then look closer</h2>
        <p>Each game starts with one clear question. You can find a country on a map, recognise an outline, trace a land route, learn a flag, fill a geography grid or place a city. Free play stays open when the daily set is done.</p>
        <h2>Maps with provenance</h2>
        <p>Country boundaries and geographic facts come from open datasets. Administrative boundaries and city names include source-specific coverage and license notes. Open <a href="/data">Data sources</a> to see the files used by the current build.</p>
        <h2>Small by design</h2>
        <p>There are no accounts, leaderboards, ads or tracking. Your game history belongs to this browser, and you can export it from Settings.</p>
      </article>
    </div>
  )
}

function PrivacyPage() {
  return (
    <div className="page information-page">
      <PageHeading eyebrow="Plain and local" title="Privacy" description="Maproom does not need to know who you are to keep score." />
      <article className="prose">
        <p className="lead">There is no account, sign-in, analytics service or advertising tracker in Maproom.</p>
        <h2>What is stored</h2>
        <p>Your game results, favorites and settings are stored in this browser using IndexedDB. If IndexedDB is unavailable, the application attempts a smaller local browser-storage fallback. This information is not sent to a Maproom server.</p>
        <h2>What the browser downloads</h2>
        <p>The application and its map, country, city, flag and boundary files are served from Maproom’s own site. The web server may keep the ordinary connection logs needed to operate the site. Gameplay does not call a third-party API.</p>
        <h2>Your choices</h2>
        <p>Settings lets you export a JSON copy, import a prior copy or clear local progress. Removing site data in your browser can also erase it. A downloaded backup may contain your game history, so keep it somewhere you trust.</p>
      </article>
    </div>
  )
}

function DataPage() {
  const [manifest, setManifest] = useState<SourceManifest | null>(null)
  const [regions, setRegions] = useState<RegionRecord[]>([])
  const [coverage, setCoverage] = useState<Coverage | null>(null)
  const [query, setQuery] = useState('')
  const [failure, setFailure] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/data/data-manifest.json').then((response) => { if (!response.ok) throw new Error(); return response.json() as Promise<SourceManifest> }),
      fetch('/data/region-index.json').then((response) => { if (!response.ok) throw new Error(); return response.json() as Promise<RegionRecord[]> }),
      fetch('/data/coverage.json').then((response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Coverage> }),
    ]).then(([sourceData, regionData, coverageData]) => {
      setManifest(sourceData)
      setRegions(regionData.filter((item) => item.status === 'included').sort((a, b) => a.name.localeCompare(b.name)))
      setCoverage(coverageData)
    }).catch(() => setFailure(true))
  }, [])

  const filteredRegions = useMemo(() => regions.filter((region) => `${region.name} ${region.iso3}`.toLowerCase().includes(query.trim().toLowerCase())), [regions, query])

  return (
    <div className="page information-page data-page">
      <PageHeading eyebrow="Open data, local files" title="Data sources" description="Maproom’s essential geographic datasets are packaged with the site. Boundaries are loaded by country when you open them." />
      {coverage && <section className="coverage-summary">
        <CoverageNumber value={coverage.countryCatalogCount.toLocaleString()} label="country & territory records" />
        <CoverageNumber value={coverage.countryCodesWithGeometry.toLocaleString()} label="mapped country codes" />
        <CoverageNumber value={coverage.admin1CountriesIncluded.toLocaleString()} label={`countries with ADM1 · ${coverage.admin1UnitsIncluded.toLocaleString()} divisions`} />
        <CoverageNumber value={coverage.cityCount.toLocaleString()} label="cities and towns" />
      </section>}
      {failure ? <div className="inline-notice notice-warning"><strong>Credits are temporarily unavailable.</strong><div>The packaged source manifest could not be read. Try refreshing this page.</div></div> : (
        <>
          <section className="source-list">
            <div className="section-heading"><div><span className="eyebrow">Sources & licenses</span><h2>What the map is made of</h2></div></div>
            {manifest?.sources.map((source) => <article className="source-card" key={source.name}>
              <div className="source-card-heading"><div><h3>{source.name}</h3><span>{source.license}</span></div><a href={source.source} target="_blank" rel="noreferrer" aria-label={`Open ${source.name} source`}><ExternalLink size={16} /></a></div>
              <p>{source.attribution}</p>
              <div className="source-meta"><span>Retrieved {source.retrievedAt.slice(0, 10)}</span><span>{source.version}</span></div>
              <a className="source-license-link" href={source.licenseUrl} target="_blank" rel="noreferrer">License and source details <ExternalLink size={13} /></a>
              {source.name.startsWith('geoBoundaries') && <p className="source-detail">The license and source are recorded for each included country below. Some boundary providers require additional attribution or share-alike terms.</p>}
            </article>)}
            {!manifest && !failure && <div className="loading-state">Reading source manifest…</div>}
          </section>
          <section className="region-coverage">
            <div className="section-heading"><div><span className="eyebrow">Administrative boundaries</span><h2>First-level divisions by country</h2></div><span className="muted-note">{regions.length} country packages</span></div>
            <p className="coverage-intro">Each package has its own release date, primary source and license. Maproom keeps the provider’s simplified geometry and lists its attribution below.</p>
            <label className="search-field coverage-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Search country boundary coverage</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a country" /></label>
            <div className="coverage-table" role="table" aria-label="Administrative boundary coverage">
              <div className="coverage-table-head" role="row"><span role="columnheader">Country</span><span role="columnheader">Divisions</span><span role="columnheader">Source license</span><span role="columnheader">Year</span></div>
              {filteredRegions.map((region) => <details className="coverage-row" key={region.iso3}>
                <summary role="row"><span role="cell"><strong>{region.name}</strong><small>{region.iso3}</small></span><span role="cell">{region.count}</span><span role="cell">{region.license}</span><span role="cell">{region.year || 'Not stated'}</span></summary>
                <div className="coverage-row-details">
                  <span>Boundary provider: {region.source || 'Not stated'}</span>
                  {region.sourceUrl && <a href={region.sourceUrl} target="_blank" rel="noreferrer">Primary source <ExternalLink size={12} /></a>}
                  {region.licenseSource && <a href={region.licenseSource} target="_blank" rel="noreferrer">License evidence <ExternalLink size={12} /></a>}
                </div>
              </details>)}
              {regions.length === 0 && <div className="loading-state">Loading country coverage…</div>}
              {regions.length > 0 && filteredRegions.length === 0 && <p className="coverage-limit">No country matches that search.</p>}
            </div>
          </section>
          {coverage && <section className="limitations-list"><div className="section-heading"><div><span className="eyebrow">Read with care</span><h2>Coverage notes</h2></div></div><ul>{coverage.limitations.map((item) => <li key={item}>{item}</li>)}</ul></section>}
        </>
      )}
    </div>
  )
}

function CoverageNumber({ value, label }: { value: string; label: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>
}
