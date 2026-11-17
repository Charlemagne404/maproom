// Parent relationships are explicit so dependant entries can be played as
// their own geographic identities. Coordinates are Natural Earth component
// anchors used only when the source bundles a territory into its parent.
export const territoryRelations = {
  ALA: { parentIso3: 'FIN', radiusKm: 42 },
  ASM: { parentIso3: 'USA', radiusKm: 120 },
  AIA: { parentIso3: 'GBR', radiusKm: 60 },
  ABW: { parentIso3: 'NLD', radiusKm: 70 },
  BMU: { parentIso3: 'GBR', radiusKm: 80 },
  BVT: { parentIso3: 'NOR', radiusKm: 160 },
  IOT: { parentIso3: 'GBR', radiusKm: 220 },
  VGB: { parentIso3: 'GBR', radiusKm: 90 },
  BES: {
    parentIso3: 'NLD',
    radiusKm: 55,
    anchors: [
      { lat: 12.15, lon: -68.27 }, // Bonaire
      { lat: 17.63, lon: -63.24 }, // Saba
      { lat: 17.49, lon: -62.97 }, // Sint Eustatius
    ],
  },
  CYM: { parentIso3: 'GBR', radiusKm: 140 },
  CXR: { parentIso3: 'AUS', radiusKm: 90 },
  CCK: { parentIso3: 'AUS', radiusKm: 90 },
  CLP: { parentIso3: 'FRA', radiusKm: 120 },
  CSI: { parentIso3: 'AUS', radiusKm: 120 },
  ATC: { parentIso3: 'AUS', radiusKm: 120 },
  COK: { parentIso3: 'NZL', radiusKm: 160 },
  CUW: { parentIso3: 'NLD', radiusKm: 70 },
  ESB: { parentIso3: 'GBR', radiusKm: 40 },
  FLK: { parentIso3: 'GBR', radiusKm: 180 },
  FRO: { parentIso3: 'DNK', radiusKm: 150 },
  GUF: { parentIso3: 'FRA', radiusKm: 420 },
  PYF: { parentIso3: 'FRA', radiusKm: 260 },
  ATF: { parentIso3: 'FRA', radiusKm: 300 },
  GIB: { parentIso3: 'GBR', radiusKm: 50 },
  GRL: { parentIso3: 'DNK', radiusKm: 220 },
  GLP: { parentIso3: 'FRA', radiusKm: 150 },
  GUM: { parentIso3: 'USA', radiusKm: 140 },
  GGY: { parentIso3: 'GBR', radiusKm: 60 },
  HMD: { parentIso3: 'AUS', radiusKm: 180 },
  HKG: { parentIso3: 'CHN', radiusKm: 100 },
  IMN: { parentIso3: 'GBR', radiusKm: 100 },
  JEY: { parentIso3: 'GBR', radiusKm: 60 },
  MAC: { parentIso3: 'CHN', radiusKm: 60 },
  MTQ: { parentIso3: 'FRA', radiusKm: 120 },
  MYT: { parentIso3: 'FRA', radiusKm: 120 },
  REU: { parentIso3: 'FRA', radiusKm: 120 },
  MSR: { parentIso3: 'GBR', radiusKm: 100 },
  NCL: { parentIso3: 'FRA', radiusKm: 240 },
  NIU: { parentIso3: 'NZL', radiusKm: 120 },
  NFK: { parentIso3: 'AUS', radiusKm: 120 },
  MNP: { parentIso3: 'USA', radiusKm: 180 },
  PCN: { parentIso3: 'GBR', radiusKm: 180 },
  PRI: { parentIso3: 'USA', radiusKm: 180 },
  BLM: { parentIso3: 'FRA', radiusKm: 60 },
  SHN: { parentIso3: 'GBR', radiusKm: 220 },
  MAF: { parentIso3: 'FRA', radiusKm: 70 },
  SPM: { parentIso3: 'FRA', radiusKm: 100 },
  SXM: { parentIso3: 'NLD', radiusKm: 70 },
  SGS: { parentIso3: 'GBR', radiusKm: 220 },
  SJM: {
    parentIso3: 'NOR',
    radiusKm: 600,
    anchors: [
      { lat: 78.2, lon: 15.6 }, // Svalbard
      { lat: 70.98, lon: -8.55 }, // Jan Mayen
    ],
  },
  TKL: { parentIso3: 'NZL', radiusKm: 140 },
  TCA: { parentIso3: 'GBR', radiusKm: 180 },
  UMI: {
    parentIso3: 'USA',
    radiusKm: 220,
    anchors: [
      { lat: 19.3, lon: 166.63 }, // Wake Island
      { lat: 28.2, lon: -177.35 }, // Midway Atoll
      { lat: 0.8, lon: -176.6 }, // Baker and Howland Islands
      { lat: 5.9, lon: -162.1 }, // Jarvis Island
      { lat: 16.75, lon: -169.52 }, // Johnston Atoll
      { lat: 2.0, lon: -157.4 }, // Palmyra Atoll
    ],
  },
  VIR: { parentIso3: 'USA', radiusKm: 110 },
  WLF: { parentIso3: 'FRA', radiusKm: 100 },
  WSB: { parentIso3: 'GBR', radiusKm: 40 },
}

// These catalog records have disputed or non-territorial status. They remain
// separate records, but no sovereignty relationship is inferred here.
export const excludedParentRelations = new Set(['ATA', 'UNK', 'PSE', 'TWN', 'ESH'])
