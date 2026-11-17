import { useMemo, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { geoEqualEarth, geoMercator, geoPath, type GeoPermissibleObjects, type GeoProjection } from 'd3-geo'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import type { Coordinates, GeoFeature } from '../geography/types'

const WIDTH = 960
const HEIGHT = 480
const EDGE: [[number, number], [number, number]] = [[16, 14], [WIDTH - 16, HEIGHT - 14]]

interface GeoMapProps {
  features: GeoFeature[]
  activeCodes?: string[]
  correctCode?: string | null
  wrongCode?: string | null
  onSelectCode?: (iso3: string) => void
  onPointSelect?: (point: Coordinates) => void
  markers?: Array<{ point: Coordinates; kind: 'guess' | 'answer'; label: string }>
  routePoints?: Coordinates[]
  projection?: 'equal-earth' | 'mercator'
  rotationDegrees?: number
  ariaLabel?: string
  className?: string
  compact?: boolean
  showHoverLabels?: boolean
}

export function GeoMap({
  features,
  activeCodes = [],
  correctCode = null,
  wrongCode = null,
  onSelectCode,
  onPointSelect,
  markers = [],
  routePoints = [],
  projection: projectionName = 'equal-earth',
  rotationDegrees = 0,
  ariaLabel = 'Interactive world map',
  className = '',
  compact = false,
  showHoverLabels = true,
}: GeoMapProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const active = useMemo(() => new Set(activeCodes), [activeCodes])
  const collection = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: features as unknown as GeoJSON.Feature[],
  }), [features])
  const projection = useMemo<GeoProjection>(() => {
    const base = projectionName === 'mercator' ? geoMercator() : geoEqualEarth()
    return base.fitExtent(EDGE, collection)
  }, [collection, projectionName])
  const rotationTransform = useMemo(() => {
    const radians = rotationDegrees * Math.PI / 180
    const contentWidth = WIDTH - 32
    const contentHeight = HEIGHT - 28
    const boundsWidth = Math.abs(Math.cos(radians)) * contentWidth + Math.abs(Math.sin(radians)) * contentHeight
    const boundsHeight = Math.abs(Math.sin(radians)) * contentWidth + Math.abs(Math.cos(radians)) * contentHeight
    const fit = Math.min(1, contentWidth / boundsWidth, contentHeight / boundsHeight)
    return `translate(${WIDTH / 2} ${HEIGHT / 2}) rotate(${rotationDegrees}) scale(${fit}) translate(${-WIDTH / 2} ${-HEIGHT / 2})`
  }, [rotationDegrees])
  const path = useMemo(() => geoPath(projection), [projection])
  const markerPoints = useMemo(() => markers.map((marker) => ({ ...marker, screen: projection([marker.point.lon, marker.point.lat]) })), [markers, projection])
  const routePath = useMemo(() => {
    const points = routePoints.map((point) => projection([point.lon, point.lat])).filter((point): point is [number, number] => Boolean(point && point.every(Number.isFinite)))
    return points.length > 1 ? points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ') : ''
  }, [projection, routePoints])

  function mapCoordinates(event: MouseEvent<SVGSVGElement>): Coordinates | null {
    if (!onPointSelect || !svg.current) return null
    const rect = svg.current.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width * WIDTH
    const py = (event.clientY - rect.top) / rect.height * HEIGHT
    const x = (px - pan.x - WIDTH / 2) / zoom + WIDTH / 2
    const y = (py - pan.y - HEIGHT / 2) / zoom + HEIGHT / 2
    const point = projection.invert?.([x, y])
    if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[1]) > 90) return null
    return { lon: point[0], lat: point[1] }
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: false }
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const current = drag.current
    if (current && (event.buttons & 1) === 1) {
      const dx = event.clientX - current.x
      const dy = event.clientY - current.y
      if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true
      if (current.moved) setPan({ x: current.panX + dx * WIDTH / (svg.current?.clientWidth || WIDTH), y: current.panY + dy * HEIGHT / (svg.current?.clientHeight || HEIGHT) })
    }
  }

  function handlePointerUp() {
    window.setTimeout(() => { drag.current = null }, 0)
  }

  function handleMapClick(event: MouseEvent<SVGSVGElement>) {
    if (drag.current?.moved) {
      event.preventDefault()
      event.stopPropagation()
      drag.current = null
      return
    }
    const point = mapCoordinates(event)
    if (point) onPointSelect?.(point)
  }

  return (
    <div className={`map-shell ${compact ? 'map-shell-compact' : ''} ${className}`}>
      <svg
        ref={svg}
        className="geo-map"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label={ariaLabel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleMapClick}
        onPointerLeave={() => setHovered(null)}
      >
        <rect width={WIDTH} height={HEIGHT} className="map-water" />
        <g transform={`translate(${pan.x} ${pan.y}) translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${zoom}) translate(${-WIDTH / 2} ${-HEIGHT / 2}) ${rotationTransform}`}>
          {features.map((feature, index) => {
            const code = mapKey(feature)
            const isActive = active.has(code)
            const isCorrect = code === correctCode
            const isWrong = code === wrongCode
            const canSelect = Boolean(feature.properties.iso3 || feature.properties.id || feature.properties.isoCode)
            return (
              <path
                key={`${code}-${String(feature.id ?? 'feature')}-${index}`}
                d={path(feature as unknown as GeoPermissibleObjects) ?? undefined}
                className={`map-country${isActive ? ' is-active' : ''}${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}${hovered === code ? ' is-hovered' : ''}`}
                aria-label={`${feature.properties.name}${isActive ? ', in the current route' : ''}`}
                aria-pressed={onSelectCode && canSelect ? isActive : undefined}
                role={onSelectCode && canSelect ? 'button' : undefined}
                tabIndex={onSelectCode && canSelect ? 0 : -1}
                vectorEffect="non-scaling-stroke"
                onPointerEnter={() => code && setHovered(code)}
                onPointerLeave={() => setHovered(null)}
                onClick={(event) => {
                  if (drag.current?.moved) {
                    event.preventDefault()
                    event.stopPropagation()
                    drag.current = null
                    return
                  }
                  if (!onSelectCode || !code || !canSelect) return
                  event.stopPropagation()
                  onSelectCode(code)
                }}
                onKeyDown={(event) => {
                  if (onSelectCode && code && canSelect && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    onSelectCode(code)
                  }
                }}
              />
            )
          })}
          {routePath && <path className="map-route-line" d={routePath} aria-hidden="true" />}
          {markerPoints.map((marker, index) => marker.screen && (
            <g key={`${marker.kind}-${index}`} className={`map-marker map-marker-${marker.kind}`} transform={`translate(${marker.screen[0]} ${marker.screen[1]})`}>
              <circle r={marker.kind === 'answer' ? 8 : 7} />
              <circle r="2.2" className="map-marker-core" />
              <title>{marker.label}</title>
            </g>
          ))}
        </g>
      </svg>
      {!compact && (
        <div className="map-tools" aria-label="Map controls">
          <button type="button" className="map-tool" onClick={() => setZoom((value) => Math.min(4, value + 0.4))} aria-label="Zoom in"><Plus size={16} /></button>
          <button type="button" className="map-tool" onClick={() => setZoom((value) => Math.max(1, value - 0.4))} aria-label="Zoom out"><Minus size={16} /></button>
          <button type="button" className="map-tool" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }} aria-label="Reset map view"><LocateFixed size={16} /></button>
        </div>
      )}
      {showHoverLabels && hovered && <div className="map-caption" aria-live="polite">{features.find((feature) => mapKey(feature) === hovered)?.properties.name}</div>}
    </div>
  )
}

function mapKey(feature: GeoFeature): string {
  return feature.properties.iso3
    ?? String(feature.properties.id ?? feature.properties.isoCode ?? feature.id ?? '')
}
