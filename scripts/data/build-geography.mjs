import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync as readLocalFileSync } from 'node:fs';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { topology } from 'topojson-server';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeDetailedFallback, normalizeNaturalEarthGeometry, territoryParentIso3 } from './country-geometry.mjs';
import { supplementalTerritories } from './supplemental-territories.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rawDir = path.join(root, '.data', 'raw');
const dataDir = path.join(root, 'public', 'data');
const regionsDir = path.join(dataDir, 'regions');
const retrievedAt = new Date().toISOString();
const regionLimit = process.env.MAPROOM_REGION_LIMIT
  ? Number(process.env.MAPROOM_REGION_LIMIT)
  : Infinity;
const geometryQuantization = 1_000_000;

const sources = {
  naturalEarth: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
  naturalEarthDetail: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson',
  naturalEarthRivers: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_rivers_lake_centerlines.geojson',
  countryCatalog: 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json',
  countryLicense: 'https://raw.githubusercontent.com/mledoze/countries/master/LICENSE',
  geonamesCities: 'https://download.geonames.org/export/dump/cities500.zip',
  worldBankPopulation: 'https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2023&per_page=20000',
  geoBoundaries: 'https://www.geoboundaries.org/api/current/gbOpen/ALL/ADM1/',
  geoNamesTerms: 'https://www.geonames.org/export/',
};

await Promise.all([
  mkdir(rawDir, { recursive: true }),
  mkdir(dataDir, { recursive: true }),
  mkdir(regionsDir, { recursive: true }),
  mkdir(path.join(root, 'docs'), { recursive: true }),
]);
for (const name of await readdir(regionsDir)) {
  if (name.endsWith('.json')) await unlink(path.join(regionsDir, name));
}

async function fetchBuffer(url, target, label) {
  const response = await fetch(url, { headers: { 'user-agent': 'Maproom-geodata-builder/1.0' } });
  if (!response.ok) throw new Error(`${label}: ${response.status} ${response.statusText} (${url})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(target, bytes);
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex'), url };
}

async function fetchJson(url, target, label) {
  const response = await fetch(url, { headers: { 'user-agent': 'Maproom-geodata-builder/1.0' } });
  if (!response.ok) throw new Error(`${label}: ${response.status} ${response.statusText} (${url})`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(target, bytes);
  return {
    value: JSON.parse(bytes.toString('utf8')),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    url,
  };
}

const [naturalEarth, naturalEarthDetail, naturalEarthRivers, countryCatalog, worldBankPopulation, geoBoundaryIndex, cityArchive] = await Promise.all([
  fetchJson(sources.naturalEarth, path.join(rawDir, 'natural-earth-admin0-50m.geojson'), 'Natural Earth country boundaries'),
  fetchJson(sources.naturalEarthDetail, path.join(rawDir, 'natural-earth-admin0-10m.geojson'), 'Natural Earth detailed country boundaries'),
  fetchJson(sources.naturalEarthRivers, path.join(rawDir, 'natural-earth-rivers-50m.geojson'), 'Natural Earth named rivers'),
  fetchJson(sources.countryCatalog, path.join(rawDir, 'mledoze-countries.json'), 'Country metadata'),
  fetchJson(sources.worldBankPopulation, path.join(rawDir, 'world-bank-population-2023.json'), 'World Bank 2023 population'),
  fetchJson(sources.geoBoundaries, path.join(rawDir, 'geoboundaries-adm1-index.json'), 'geoBoundaries ADM1 index'),
  fetchBuffer(sources.geonamesCities, path.join(rawDir, 'geonames-cities500.zip'), 'GeoNames cities500'),
]);
const catalogCountries = [...countryCatalog.value, ...supplementalTerritories];

if (!Array.isArray(worldBankPopulation.value) || !Array.isArray(worldBankPopulation.value[1])) {
  throw new Error('World Bank population API returned an unexpected response.');
}
const populationByIso3 = new Map(worldBankPopulation.value[1]
  .filter((item) => item?.countryiso3code && item.date === '2023' && Number.isFinite(item.value))
  .map((item) => [item.countryiso3code, item]));

const normalizedOutlines = normalizeNaturalEarthGeometry({ ...naturalEarthDetail.value, scale: '1:10m' }, catalogCountries);
const normalizedWorld = normalizeNaturalEarthGeometry({ ...naturalEarth.value, scale: '1:50m' }, catalogCountries);
const detailedFeatures = normalizedOutlines.features;
const normalizedFeatures = mergeDetailedFallback(normalizedWorld.features, detailedFeatures);
const worldTopology = topology({
  countries: { type: 'FeatureCollection', features: normalizedFeatures },
}, geometryQuantization);
const outlineTopology = topology({
  countries: { type: 'FeatureCollection', features: detailedFeatures },
}, geometryQuantization);
const riverFeatures = naturalEarthRivers.value.features
  .filter((feature) => feature.properties?.featurecla === 'River'
    && Number(feature.properties.scalerank) <= 4
    && typeof feature.properties.name === 'string'
    && feature.geometry)
  .map((feature, index) => ({
    type: 'Feature',
    id: `natural-earth-river-${index + 1}`,
    properties: {
      id: `natural-earth-river-${index + 1}`,
      name: feature.properties.name,
      nameAlt: feature.properties.name_alt ?? null,
      nameEnglish: feature.properties.name_en ?? null,
      scaleRank: Number(feature.properties.scalerank),
    },
    geometry: feature.geometry,
  }));
if (riverFeatures.length < 100) throw new Error(`Natural Earth returned only ${riverFeatures.length} usable named river lines.`);
const geometryCodes = new Set(normalizedFeatures.map((feature) => feature.properties.iso3).filter(Boolean));
const countriesByIso3 = new Map(catalogCountries.map((country) => [country.cca3, country]));

const countryOutput = catalogCountries
  .filter((country) => country.cca3 && (country.cca2 || country.maproomFlagCode) && country.name?.common)
  .map((country) => {
    const aliases = unique([
      country.name.common,
      country.name.official,
      ...(country.altSpellings ?? []),
      ...Object.values(country.nativeName ?? {}).flatMap((native) => [native?.common, native?.official]),
    ]);
    return {
      iso3: country.cca3,
      parentIso3: territoryParentIso3(country.cca3),
      iso2: country.cca2,
      name: country.name.common,
      officialName: country.name.official ?? country.name.common,
      aliases,
      continent: continentFor(country),
      subregion: country.subregion ?? null,
      capital: country.capital?.[0] ?? null,
      capitals: country.capital ?? [],
      capitalCoordinates: country.capitalInfo?.latlng?.length === 2
        ? { lat: country.capitalInfo.latlng[0], lon: country.capitalInfo.latlng[1] }
        : null,
      coordinates: country.latlng?.length === 2
        ? { lat: country.latlng[0], lon: country.latlng[1] }
        : null,
      population: finiteOrNull(populationByIso3.get(country.cca3)?.value) ?? finiteOrNull(country.population),
      populationYear: populationByIso3.has(country.cca3) ? '2023' : null,
      areaKm2: finiteOrNull(country.area),
      landlocked: Boolean(country.landlocked),
      borders: unique((country.borders ?? []).filter((code) => code !== country.cca3 && countriesByIso3.has(code))).sort(),
      independent: country.independent === true,
      flagCode: country.maproomFlagCode ?? country.cca2.toLowerCase(),
      flagEligible: country.maproomFlagEligible ?? true,
      hasGeometry: geometryCodes.has(country.cca3),
      regionCount: 0,
      regionSource: null,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const catalogByIso3 = new Map(countryOutput.map((country) => [country.iso3, country]));
for (const country of countryOutput) {
  country.borders = country.borders.filter((neighbor) => catalogByIso3.get(neighbor)?.borders.includes(country.iso3));
}

const cityZipPath = path.join(rawDir, 'geonames-cities500.zip');
let cityText;
try {
  cityText = execFileSync('unzip', ['-p', cityZipPath, 'cities500.txt'], { maxBuffer: 200 * 1024 * 1024 }).toString('utf8');
} catch (error) {
  throw new Error(`Could not read GeoNames cities500.zip. Install the system unzip utility, then rerun. ${error.message}`);
}

const iso2ToIso3 = new Map(countryOutput.filter((country) => country.iso2).map((country) => [country.iso2, country.iso3]));
const cities = [];
for (const line of cityText.split('\n')) {
  if (!line) continue;
  const columns = line.split('\t');
  if (columns.length < 19 || columns[6] !== 'P') continue;
  const featureCode = columns[7];
  const population = Number(columns[14]) || 0;
  if (population < 50000 && !['PPLC', 'PPLA', 'PPLA2'].includes(featureCode)) continue;
  const countryIso2 = columns[8];
  const countryIso3 = iso2ToIso3.get(countryIso2);
  if (!countryIso3) continue;
  const aliases = unique([columns[2], ...(columns[3] ?? '').split(',')])
    .filter((name) => normalize(name) !== normalize(columns[1]))
    .slice(0, 8);
  const lat = Number(columns[4]);
  const lon = Number(columns[5]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
  cities.push({
    id: columns[0],
    name: columns[1],
    aliases,
    lat,
    lon,
    countryIso2,
    countryIso3,
    admin1Code: columns[10] || null,
    population,
    featureCode,
    capital: featureCode === 'PPLC',
  });
}
cities.sort((a, b) => a.name.localeCompare(b.name));
// These games never use places below 50,000 population. Keep a derived,
// order-preserving pool so they avoid downloading the full city lookup file.
const majorCities = cities.filter((city) => city.population >= 50000);

const regionEntriesByIso = new Map();
for (const entry of geoBoundaryIndex.value.filter((item) => item.boundaryType === 'ADM1' && item.boundaryISO && item.simplifiedGeometryGeoJSON)) {
  const previous = regionEntriesByIso.get(entry.boundaryISO);
  const currentUnits = Number(entry.admUnitCount) || 0;
  const previousUnits = Number(previous?.admUnitCount) || 0;
  const currentDate = Date.parse(entry.sourceDataUpdateDate ?? '') || Date.parse(entry.buildDate ?? '') || 0;
  const previousDate = Date.parse(previous?.sourceDataUpdateDate ?? '') || Date.parse(previous?.buildDate ?? '') || 0;
  if (!previous || currentUnits > previousUnits || (currentUnits === previousUnits && currentDate > previousDate)) {
    regionEntriesByIso.set(entry.boundaryISO, entry);
  }
}
const regionEntries = [...regionEntriesByIso.values()].slice(0, regionLimit);
let complete = 0;
const regionResults = [];
await runPool(regionEntries, 8, async (entry) => {
  try {
    const result = await fetch(entry.simplifiedGeometryGeoJSON, {
      headers: { 'user-agent': 'Maproom-geodata-builder/1.0' },
    });
    if (!result.ok) throw new Error(`${result.status} ${result.statusText}`);
    const geojson = await result.json();
    if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
      throw new Error('Expected a GeoJSON FeatureCollection');
    }
    const regions = geojson.features
      .map((feature, index) => {
        const props = feature.properties ?? {};
        const name = props.shapeName ?? props.name ?? props.NAME_1 ?? props.NAME ?? null;
        if (typeof name !== 'string' || !name.trim()) return null;
        return {
          type: 'Feature',
          id: props.shapeID ?? props.shapeISO ?? `${entry.boundaryISO}-${index}`,
          properties: {
            id: props.shapeID ?? props.shapeISO ?? `${entry.boundaryISO}-${index}`,
            name: name.trim(),
            isoCode: props.shapeISO ?? null,
            countryIso3: entry.boundaryISO,
            adminLevel: 1,
          },
          geometry: feature.geometry,
        };
      })
      .filter(Boolean);
    if (!regions.length) throw new Error('No named ADM1 features');
    const country = countryOutput.find((item) => item.iso3 === entry.boundaryISO);
    if (country) {
      country.regionCount = regions.length;
      country.regionSource = {
        provider: 'geoBoundaries',
        boundaryId: entry.boundaryID,
        year: entry.boundaryYearRepresented,
        license: entry.boundaryLicense,
        source: entry.boundarySource,
        sourceUrl: entry.boundarySourceURL,
        licenseUrl: entry.licenseSource,
        attribution: 'geoBoundaries',
        url: entry.simplifiedGeometryGeoJSON,
        releaseRef: releaseRef(entry.simplifiedGeometryGeoJSON),
      };
    }
    const topo = topology({
      regions: { type: 'FeatureCollection', features: regions },
    }, 100000);
    topo.countryIso3 = entry.boundaryISO;
    topo.boundaryId = entry.boundaryID;
    topo.year = entry.boundaryYearRepresented;
    const regionOutput = JSON.stringify(topo);
    const regionBytes = Buffer.from(regionOutput);
    await writeFile(path.join(regionsDir, `${entry.boundaryISO}.topo.json`), regionBytes);
    regionResults.push({
      iso3: entry.boundaryISO,
      name: entry.boundaryName,
      count: regions.length,
      boundaryId: entry.boundaryID,
      year: entry.boundaryYearRepresented,
      license: entry.boundaryLicense,
      licenseSource: entry.licenseSource,
      source: entry.boundarySource,
      sourceUrl: entry.boundarySourceURL,
      url: entry.simplifiedGeometryGeoJSON,
      releaseRef: releaseRef(entry.simplifiedGeometryGeoJSON),
      artifactSha256: createHash('sha256').update(regionBytes).digest('hex'),
      artifactBytes: regionBytes.length,
      status: 'included',
    });
  } catch (error) {
    regionResults.push({ iso3: entry.boundaryISO, name: entry.boundaryName, status: 'unavailable', reason: error.message });
  }
  complete += 1;
  if (complete % 20 === 0 || complete === regionEntries.length) {
    process.stdout.write(`ADM1 packages: ${complete}/${regionEntries.length}\r`);
  }
});
process.stdout.write('\n');

const countryLicense = await fetchBuffer(sources.countryLicense, path.join(dataDir, 'COUNTRY-CATALOG-ODbL-1.0.txt'), 'Country catalog license');

const nationalCapitals = new Map(cities.filter((city) => city.featureCode === 'PPLC').map((city) => [city.countryIso3, city]));
for (const country of countryOutput) {
  const capitalCity = nationalCapitals.get(country.iso3);
  if (!country.capitalCoordinates && capitalCity) {
    country.capitalCoordinates = { lat: capitalCity.lat, lon: capitalCity.lon };
    country.capitalCoordinatesSource = 'GeoNames PPLC';
  }
}

const coverage = {
  generatedAt: retrievedAt,
  countryCatalogCount: countryOutput.length,
  countryGeometryFeatureCount: normalizedFeatures.length,
  outlineGeometryFeatureCount: detailedFeatures.length,
  countryCodesWithGeometry: geometryCodes.size,
  countriesWithoutGeometry: countryOutput.filter((country) => !geometryCodes.has(country.iso3)).map((country) => country.iso3),
  admin1CountriesIndexed: regionEntries.length,
  admin1CountriesIncluded: regionResults.filter((entry) => entry.status === 'included').length,
  admin1UnitsIncluded: regionResults.filter((entry) => entry.status === 'included').reduce((sum, entry) => sum + entry.count, 0),
  cityCount: cities.length,
  majorCityCount: majorCities.length,
  riverFeatureCount: riverFeatures.length,
  countriesWithoutAdmin1: countryOutput.filter((country) => !country.regionCount).length,
  limitations: [
    'World maps use Natural Earth 1:50m generalized geometry and Country Outlines use detailed 1:10m geometry; tiny islands and disputed boundaries follow Natural Earth conventions.',
    'Explicit parent-territory links split detached overseas components into separate Extended entries while preserving domestic archipelagos. Disputed records without a resolved parent remain separate.',
    'ADM1 availability is per country and may vary by date, source, geographic scope, and license. Countries without a downloaded package are not offered in the subdivision map.',
    'GeoNames cities500 includes populated places of 50,000 or more plus national and first-level seats with lower population; cities below that threshold are omitted.',
    'National-capital names and coordinates are incomplete for some territories; capital-location questions use records with a known coordinate.',
    'Population uses World Bank 2023 annual estimates where an ISO3 match exists; area values come from the country catalog. Neither figure is a live statistical feed.',
    'River questions use named, generalized Natural Earth 1:50m centerlines with scale rank 4 or better; they are not complete hydrography or navigational data.',
  ],
};

await Promise.all([
  writeFile(path.join(dataDir, 'countries.topo.json'), JSON.stringify(worldTopology)),
  writeFile(path.join(dataDir, 'countries-outline.topo.json'), JSON.stringify(outlineTopology)),
  writeFile(path.join(dataDir, 'countries.json'), JSON.stringify({ schemaVersion: 1, countries: countryOutput })),
  writeFile(path.join(dataDir, 'cities.json'), JSON.stringify({ schemaVersion: 1, cities })),
  writeFile(path.join(dataDir, 'cities-major.json'), JSON.stringify({ schemaVersion: 1, cities: majorCities })),
  writeFile(path.join(dataDir, 'rivers.json'), JSON.stringify({ schemaVersion: 1, features: riverFeatures })),
  writeFile(path.join(dataDir, 'coverage.json'), JSON.stringify(coverage, null, 2)),
  writeFile(path.join(dataDir, 'region-index.json'), JSON.stringify(regionResults, null, 2)),
]);
await Promise.all([
  unlink(path.join(dataDir, 'countries.geojson')).catch((error) => { if (error.code !== 'ENOENT') throw error; }),
  unlink(path.join(dataDir, 'countries-outline.geojson')).catch((error) => { if (error.code !== 'ENOENT') throw error; }),
]);

const manifest = {
  schemaVersion: 1,
  generatedAt: retrievedAt,
  sources: [
    {
      name: 'Natural Earth 1:50m Admin 0 Countries',
      source: sources.naturalEarth,
      version: 'GitHub natural-earth-vector master snapshot',
      retrievedAt,
      sha256: naturalEarth.sha256,
      license: 'Public domain',
      licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
      attribution: 'Made with Natural Earth.',
      transformations: ['Kept world-scale generalized geometries', 'Normalized country identifiers and display properties', 'Separated named territory components from their parent countries', 'Quantized and converted shared borders to TopoJSON at a 1e6 coordinate grid'],
    },
    {
      name: 'Natural Earth 1:10m Admin 0 Countries',
      source: sources.naturalEarthDetail,
      version: 'GitHub natural-earth-vector master snapshot',
      retrievedAt,
      sha256: naturalEarthDetail.sha256,
      license: 'Public domain',
      licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
      attribution: 'Made with Natural Earth.',
      transformations: ['Preserved detailed Polygon and MultiPolygon rings for country silhouettes', 'Separated named territory components from their parent countries', 'Quantized and converted shared borders to TopoJSON at a 1e6 coordinate grid'],
    },
    {
      name: 'Natural Earth 1:50m Rivers and Lake Centerlines',
      source: sources.naturalEarthRivers,
      version: 'Natural Earth 5.0.0; pinned natural-earth-vector snapshot ca96624a56bd078437bca8184e78163e5039ad19',
      retrievedAt,
      sha256: naturalEarthRivers.sha256,
      license: 'Public domain',
      licenseUrl: 'https://www.naturalearthdata.com/about/terms-of-use/',
      attribution: 'Made with Natural Earth.',
      transformations: ['Kept named River features with scale rank 4 or better', 'Removed unused source properties', 'Loaded only when Riverways is opened'],
    },
    {
      name: 'World country metadata',
      source: sources.countryCatalog,
      version: 'GitHub mledoze/countries master snapshot',
      retrievedAt,
      sha256: countryCatalog.sha256,
      license: 'ODC Open Database License 1.0 (ODbL)',
      licenseUrl: 'https://opendatacommons.org/licenses/odbl/1-0/',
      licenseSha256: countryLicense.sha256,
      attribution: 'mledoze/countries contributors; see the included ODbL notice.',
      transformations: ['Selected country identity, aliases, regions, capital, area, neighbors, landlocked status and ISO flag code', 'Kept only reciprocal neighbor references so route puzzles require a shared land border', 'Normalized continent names from region and subregion fields', 'Joined GeoNames national-capital coordinates by ISO3 where available', 'Normalized country records to a compact JSON catalog'],
    },
    {
      name: 'World Bank World Development Indicators population',
      source: sources.worldBankPopulation,
      version: `SP.POP.TOTL for 2023; API last updated ${worldBankPopulation.value[0]?.lastupdated ?? 'not stated'}`,
      retrievedAt,
      sha256: worldBankPopulation.sha256,
      license: 'Creative Commons Attribution 4.0 International (CC BY 4.0) with World Bank dataset terms',
      licenseUrl: 'https://datacatalog.worldbank.org/public-licenses',
      attribution: 'World Bank, World Development Indicators, Population total (SP.POP.TOTL).',
      transformations: ['Joined 2023 values by ISO3 code', 'Stored the observation year alongside each country population where available'],
    },
    {
      name: 'GeoNames cities500',
      source: sources.geonamesCities,
      version: `GeoNames dump retrieved ${retrievedAt.slice(0, 10)}`,
      retrievedAt,
      sha256: cityArchive.sha256,
      license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
      licenseUrl: sources.geoNamesTerms,
      attribution: 'GeoNames (www.geonames.org)',
      transformations: ['Kept populated-place features with population at least 50,000 plus national and first-level seats', 'Retained coordinates, country and first-level codes, population, and up to eight alternate names', 'Derived an order-preserving population-50,000 subset for Distance & Direction and Latitude Ladder'],
    },
    {
      name: 'geoBoundaries gbOpen ADM1',
      source: sources.geoBoundaries,
      version: 'Per-country release references and source licenses recorded in region-index.json',
      retrievedAt,
      license: 'Per-country license; see region-index.json and each country package',
      licenseUrl: 'https://www.geoboundaries.org/api.html',
      attribution: 'geoBoundaries and the primary source named for each boundary',
      transformations: ['Used the provider-simplified ADM1 GeoJSON', 'Quantized and converted each country package to TopoJSON at a 1e5 coordinate grid', 'Split the global index into one lazily loaded file per country', 'Normalized feature identifiers and names'],
      includedPackages: regionResults.filter((entry) => entry.status === 'included').length,
    },
    {
      name: 'Flag Icons SVG collection',
      source: 'https://github.com/lipis/flag-icons',
      version: 'Pinned by package-lock.json',
      retrievedAt,
      license: 'MIT',
      licenseUrl: 'https://github.com/lipis/flag-icons/blob/main/LICENSE',
      attribution: 'flag-icons by Panayiotis Lipiridis',
      transformations: ['Bundled local SVG flags with the application stylesheet'],
    },
  ],
  artifacts: {
    countriesTopologySha256: sha256File(path.join(dataDir, 'countries.topo.json')),
    countriesOutlineTopologySha256: sha256File(path.join(dataDir, 'countries-outline.topo.json')),
    countriesCatalogSha256: sha256File(path.join(dataDir, 'countries.json')),
    citiesSha256: sha256File(path.join(dataDir, 'cities.json')),
    majorCitiesSha256: sha256File(path.join(dataDir, 'cities-major.json')),
    riversSha256: sha256File(path.join(dataDir, 'rivers.json')),
    coverageSha256: sha256File(path.join(dataDir, 'coverage.json')),
    regionIndexSha256: sha256File(path.join(dataDir, 'region-index.json')),
    regionPackages: regionResults.filter((entry) => entry.status === 'included').map((entry) => ({ iso3: entry.iso3, url: entry.url, releaseRef: entry.releaseRef, license: entry.license, sha256: entry.artifactSha256, bytes: entry.artifactBytes })),
  },
};
await writeFile(path.join(dataDir, 'data-manifest.json'), JSON.stringify(manifest, null, 2));

await writeCoverageReport(coverage, regionResults, countryOutput);
console.log(JSON.stringify(coverage, null, 2));

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function unique(values) {
  const result = new Map();
  for (const value of values) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const key = normalize(value);
    if (!result.has(key)) result.set(key, value.trim());
  }
  return [...result.values()];
}

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function continentFor(country) {
  if (country.continents?.[0]) return country.continents[0];
  if (country.region !== 'Americas') return country.region ?? null;
  if (country.subregion === 'South America') return 'South America';
  if (['North America', 'Central America', 'Caribbean'].includes(country.subregion)) return 'North America';
  return 'Americas';
}

function sha256File(file) {
  return createHash('sha256').update(readLocalFileSync(file)).digest('hex');
}

function releaseRef(url) {
  return url.match(/raw\/([a-f0-9]{7,40})\//)?.[1] ?? null;
}

async function runPool(items, concurrency, work) {
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await work(items[index]);
    }
  }));
}

async function writeCoverageReport(dataCoverage, regions, countries) {
  const supported = regions.filter((entry) => entry.status === 'included').sort((a, b) => a.name.localeCompare(b.name));
  const failed = regions.filter((entry) => entry.status !== 'included');
  const lines = [
    '# Geographic coverage report',
    '',
    `Generated ${dataCoverage.generatedAt}.`,
    '',
    `- ${dataCoverage.countryCatalogCount} country, territory and other geographic identity records; 195 belong to the Standard catalogue.`,
    `- ${dataCoverage.countryCodesWithGeometry} ISO-coded country geometries across ${dataCoverage.countryGeometryFeatureCount} map features.`,
    `- ${supported.length} ADM1 country packages with ${dataCoverage.admin1UnitsIncluded.toLocaleString('en')} divisions.`,
    `- ${dataCoverage.cityCount.toLocaleString('en')} populated places in the city challenge dataset.`,
    `- ${dataCoverage.majorCityCount.toLocaleString('en')} places with population at least 50,000 in the compact comparison dataset.`,
    `- ${dataCoverage.riverFeatureCount} named Natural Earth river centerlines eligible for Riverways.`,
    '',
    '## ADM1 package coverage',
    '',
    '| ISO3 | Country | Divisions | License | Release |',
    '| --- | --- | ---: | --- | --- |',
    ...supported.map((entry) => `| ${entry.iso3} | ${entry.name} | ${entry.count} | ${entry.license} | ${entry.releaseRef ?? 'provider current'} |`),
    '',
  ];
  if (failed.length) {
    lines.push('## Packages not included', '', '| ISO3 | Country | Status | Detail |', '| --- | --- | --- | --- |');
    lines.push(...failed.map((entry) => `| ${entry.iso3} | ${entry.name} | ${entry.status} | ${(entry.reason ?? 'No downloadable simplified ADM1 package').replaceAll('|', '\\|')} |`));
    lines.push('');
  }
  lines.push('## Limitations', '', ...dataCoverage.limitations.map((item) => `- ${item}`), '');
  const countriesWithoutMap = countries.filter((country) => !country.hasGeometry).map((country) => country.name);
  if (countriesWithoutMap.length) lines.push(`Country catalog records without a Natural Earth feature: ${countriesWithoutMap.join(', ')}.`, '');
  await writeFile(path.join(root, 'docs', 'DATA_COVERAGE.md'), lines.join('\n'));
}
