# Plate Boundary Lab source and mechanic review

**Reviewed:** 19 November 2026 · **Status:** a licensed boundary conversion is available; exploratory event counts do not yet support fair pattern questions, and event-data reuse is not cleared for a bundled prototype.

## Candidate loop

A possible round would show a small map window with earthquake epicenters and volcanoes but hide the modeled plate boundary. The player chooses a broad boundary behavior; the reveal overlays a sourced boundary segment and explains the model's class. This asks for pattern inference from physical-geography evidence, which is distinct from country outlines or ordinary map-label recall.

The loop is only a hypothesis. Earthquakes do not all occur at boundaries, catalog density varies by time and network, and volcanoes do not trace every boundary. A sparse or misleading window could teach a false rule. A simpler “name the highlighted boundary type” question would be easier to source, but may not justify a separate game.

## Plate-boundary geometry and terms

Peter Bird's [PB2002 model paper](https://doi.org/10.1029/2001GC000252) describes 6,048 points grouped into 229 map segments and 5,819 digitization steps. It distinguishes seven boundary-step classes: continental/oceanic convergence, continental/oceanic transform, continental rift, oceanic spreading ridge and subduction. Its step records also carry adjacent plate IDs, segment direction, velocities and geophysical fields; this is a scientific model, not a complete inventory of every fault.

The [fraxen/tectonicplates conversion](https://github.com/fraxen/tectonicplates) includes boundary lines, plate polygons, original source files and GeoJSON. Its README says the conversion was retrieved in June 2014 and licenses the collection under ODC-BY 1.0. Any Maproom bundle would need to preserve attribution to Peter Bird and the conversion contributors, pin a repository revision, and checksum the selected assets. The public [ArcGIS mirror](https://services5.arcgis.com/HDRa0B57OVrv2E1q/ArcGIS/rest/services/Plate_Boundaries/FeatureServer) is not versioned and exposes no copyright text, so it is not a suitable pinned source by itself.

## Earthquake and volcano observations

The USGS [FDSN Event Web Service](https://earthquake.usgs.gov/fdsnws/event/1/) supports time, magnitude and geographic queries with GeoJSON output. The [ComCat overview](https://earthquake.usgs.gov/data/comcat/) describes a catalog of event parameters and products contributed by seismic networks around the world. USGS-authored information is generally public domain, but this alone does not establish blanket rights for every network-contributed catalog product. Before bundling any event sample, verify what fields and contributions may be redistributed, pin the time window and query, and retain enough provenance to reproduce the snapshot. Never query the service during gameplay.

### Bounded event-pattern audit

On 19 November 2026, four exploratory queries used the official [FDSN Event Web Service](https://earthquake.usgs.gov/fdsnws/event/1/) with `contributor=us`, `starttime=2010-01-01`, `endtime=2020-01-01`, `minmagnitude=4.5`, and GeoJSON output. The [API documentation](https://earthquake.usgs.gov/fdsnws/event/1/) defines contributor filtering; the [USGS contributor registry](https://earthquake.usgs.gov/data/comcat/contributor/us/) identifies `US` as its National Earthquake Information Center. These broad bounds are screening windows around example settings, not distance-filtered PB2002 segment geometries, and should not be treated as validated question frames.

| Example window (longitude, latitude) | Events | Depth below 70 km | 70–299 km | 300 km or deeper |
| --- | ---: | ---: | ---: | ---: |
| Japan trench `(141, 36, 145, 39)` | 3,285 | 3,247 | 38 | 0 |
| San Andreas `(−123.5, 35, −117.5, 39)` | 48 | 48 | 0 | 0 |
| Mid-Atlantic ridge `(−35, −5, −25, 5)` | 192 | 192 | 0 | 0 |
| East Pacific Rise `(−110, −5, −105, 5)` | 38 | 38 | 0 | 0 |

Counts vary substantially between the selected rectangles. At this magnitude and period, the San Andreas, Mid-Atlantic and East Pacific Rise windows are all in the shallow bin; depth alone would not distinguish these broad examples, while the Japan window is dominated by shallow events too. This does not validate the proposed earthquake/volcano pattern-inference loop or establish that any selected rectangle is a fair question frame. A narrower, boundary-aligned event selection might change the counts and would need a separately justified, reproducible rule.

The `contributor=us` filter narrows the query to the USGS contributor listed by ComCat; it reduces provenance ambiguity but does not itself state the reuse rights for every field or observation in the returned event records. [USGS copyright guidance](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits) says USGS-authored or produced data are public domain, while warning that some content hosted by USGS has other rights. Check source-level provenance and applicable rights before bundling. These aggregate counts were calculated in memory; no event records were saved or added to Maproom.

## Scientific and gameplay gates

- Treat PB2002 classes as the sourced answer key; do not infer an unsourced “plate boundary type” from the shape alone.
- Audit event coverage by date, magnitude, depth, contributor and sample region. Do not equate an empty map with an inactive boundary or describe this puzzle as a hazard assessment.
- Separate the three broad behaviors (convergent, divergent and transform) only when the source classes support the grouping. Explain the modeled segment after each answer.
- Build a compact candidate set and inspect every map frame for dateline, sparse-event and misleading-volcano cases before deciding whether pattern inference is fair.
- Keep any prototype in Free Play. Player comprehension and event-frame fairness need observation before Daily consideration.

## Decision

The plate geometry has a clear, attributed reuse path, and the proposed inference action could add a distinct physical-geography skill. The exploratory sample shows uneven event counts and little depth separation among the selected transform and spreading frames; event provenance and licensing also remain unresolved. Keep Plate Boundary Lab gated and pursue a more defensible data/action pairing before building a game. No event records were retained, and no game code or bundled data changed.
