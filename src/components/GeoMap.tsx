import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react'
import { geoCentroid, geoEqualEarth, geoMercator, geoPath, type GeoPermissibleObjects, type GeoProjection } from 'd3-geo'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import type { Coordinates, GeoFeature } from '../geography/types'

const WIDTH = 960
const HEIGHT = 480
const EDGE: [[number, number], [number, number]] = [[16, 14], [WIDTH - 16, HEIGHT - 14]]

interface KeyboardTarget {
  index: number
  x: number
  y: number
}

interface PinchGesture {
  distance: number
  zoom: number
  pan: { x: number; y: number }
  midpoint: { x: number; y: number }
}

interface GeoMapProps {
  features: GeoFeature[]
  activeCodes?: string[]
  selectableCodes?: string[]
  startCode?: string | null
  destinationCode?: string | null
  correctCode?: string | null
  wrongCode?: string | null
  smallHitTargetCodes?: string[]
  onSelectCode?: (iso3: string) => void
  onPointSelect?: (point: Coordinates) => void
  markers?: Array<{ point: Coordinates; kind: 'guess' | 'answer'; label: string }>
  routePoints?: Coordinates[]
  lineFeatures?: GeoFeature[]
  projection?: 'equal-earth' | 'mercator'
  rotationDegrees?: number
  ariaLabel?: string
  className?: string
  compact?: boolean
  showHoverLabels?: boolean
  hideFeatureNames?: boolean
  focusCodes?: string[]
  focusPadding?: number
  localFit?: boolean
  fitCenter?: Coordinates | null
}

export function GeoMap({
  features,
  activeCodes = [],
  selectableCodes,
  startCode = null,
  destinationCode = null,
  correctCode = null,
  wrongCode = null,
  smallHitTargetCodes = [],
  onSelectCode,
  onPointSelect,
  markers = [],
  routePoints = [],
  lineFeatures = [],
  projection: projectionName = 'equal-earth',
  rotationDegrees = 0,
  ariaLabel = 'Interactive world map',
  className = '',
  compact = false,
  showHoverLabels = true,
  hideFeatureNames = false,
  focusCodes,
  focusPadding = 56,
  localFit = false,
  fitCenter = null,
}: GeoMapProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [mapWidth, setMapWidth] = useState(WIDTH)
  const [view, setView] = useState({ focusKey: '', zoom: 1, pan: { x: 0, y: 0 } })
  const [keyboardFocus, setKeyboardFocus] = useState<{ focusKey: string; index: number } | null>(null)
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null)
  const pointerLocations = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<PinchGesture | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const countryPaths = useRef<Array<SVGPathElement | null>>([])
  useLayoutEffect(() => {
    const element = svg.current
    if (!element) return
    const measure = () => setMapWidth(element.getBoundingClientRect().width || WIDTH)
    const frame = window.requestAnimationFrame(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])
  const keyboardHelpId = useId()
  const active = useMemo(() => new Set(activeCodes), [activeCodes])
  const selectable = useMemo(() => selectableCodes ? new Set(selectableCodes) : null, [selectableCodes])
  const smallHitTargets = useMemo(() => new Set(smallHitTargetCodes), [smallHitTargetCodes])
  const collection = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: features as unknown as GeoJSON.Feature[],
  }), [features])
  const focusKey = focusCodes?.join('|') ?? ''
  const zoom = view.focusKey === focusKey ? view.zoom : 1
  const pan = view.focusKey === focusKey ? view.pan : { x: 0, y: 0 }
  const focusSet = useMemo(() => new Set(focusKey ? focusKey.split('|') : []), [focusKey])
  const focusCollection = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!focusSet.size) return collection
    const focused = collection.features.filter((feature) => {
      const properties = feature.properties as Record<string, unknown>
      return focusSet.has(String(properties.iso3 ?? properties.id ?? properties.isoCode ?? ''))
    })
    return focused.length ? { type: 'FeatureCollection', features: focused } : collection
  }, [collection, focusSet])
  const projection = useMemo<GeoProjection>(() => {
    const base = projectionName === 'mercator' ? geoMercator() : geoEqualEarth()
    if (localFit) {
      const center = fitCenter ? [fitCenter.lon, fitCenter.lat] as [number, number] : geoCentroid(focusCollection)
      if (center.every(Number.isFinite)) base.rotate([-center[0], -center[1]])
    }
    const padding = Math.max(24, Math.min(160, focusPadding))
    return base.fitExtent(focusSet.size ? [[padding, padding], [WIDTH - padding, HEIGHT - padding]] : EDGE, focusCollection)
  }, [focusCollection, focusPadding, focusSet.size, fitCenter, localFit, projectionName])
  const keyboardTargets = useMemo<Array<KeyboardTarget | null>>(() => {
    const radians = rotationDegrees * Math.PI / 180
    const cosine = Math.cos(radians)
    const sine = Math.sin(radians)
    return features.map((feature, index) => {
      const code = mapKey(feature)
      if (!isSelectableFeature(feature) || (selectable && !selectable.has(code))) return null
      const center = geoCentroid(feature as unknown as GeoPermissibleObjects)
      const point = projection(center)
      if (!point || !point.every(Number.isFinite)) return null
      const dx = point[0] - WIDTH / 2
      const dy = point[1] - HEIGHT / 2
      return {
        index,
        x: WIDTH / 2 + cosine * dx - sine * dy,
        y: HEIGHT / 2 + sine * dx + cosine * dy,
      }
    })
  }, [features, projection, rotationDegrees, selectable])
  const selectableIndexes = useMemo(() => features.flatMap((feature, index) => isSelectableFeature(feature) && (!selectable || selectable.has(mapKey(feature))) ? [index] : []), [features, selectable])
  const preferredFocusIndex = useMemo(() => {
    for (const code of focusKey ? focusKey.split('|') : []) {
      const index = features.findIndex((feature) => mapKey(feature) === code)
      if (selectableIndexes.includes(index)) return index
    }
    return -1
  }, [features, focusKey, selectableIndexes])
  const firstFocusableIndex = preferredFocusIndex >= 0 ? preferredFocusIndex : selectableIndexes[0] ?? -1
  const focusableIndex = keyboardFocus?.focusKey === focusKey && selectableIndexes.includes(keyboardFocus.index)
    ? keyboardFocus.index
    : firstFocusableIndex
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

  function localPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = svg.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return { x: WIDTH / 2, y: HEIGHT / 2 }
    return { x: (clientX - rect.left) / rect.width * WIDTH, y: (clientY - rect.top) / rect.height * HEIGHT }
  }

  function clampPan(nextZoom: number, nextPan: { x: number; y: number }) {
    const maxX = WIDTH * (nextZoom - 1) / 2 + 64
    const maxY = HEIGHT * (nextZoom - 1) / 2 + 64
    return { x: Math.max(-maxX, Math.min(maxX, nextPan.x)), y: Math.max(-maxY, Math.min(maxY, nextPan.y)) }
  }

  function setZoomAt(point: { x: number; y: number }, requestedZoom: number) {
    const nextZoom = Math.max(1, Math.min(4, requestedZoom))
    const nextPan = {
      x: point.x - WIDTH / 2 - ((point.x - WIDTH / 2 - pan.x) / zoom) * nextZoom,
      y: point.y - HEIGHT / 2 - ((point.y - HEIGHT / 2 - pan.y) / zoom) * nextZoom,
    }
    setView({ focusKey, zoom: nextZoom, pan: clampPan(nextZoom, nextPan) })
  }

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
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      pointerLocations.current.set(event.pointerId, localPoint(event.clientX, event.clientY))
      if (pointerLocations.current.size >= 2) {
        const [first, second] = [...pointerLocations.current.values()]
        if (first && second) {
          const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
          pinch.current = {
            distance: Math.hypot(second.x - first.x, second.y - first.y),
            zoom,
            pan,
            midpoint,
          }
          drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: true }
        }
        return
      }
    }
    if (event.button !== 0) return
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: false }
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (pointerLocations.current.has(event.pointerId)) {
      pointerLocations.current.set(event.pointerId, localPoint(event.clientX, event.clientY))
      if (pinch.current && pointerLocations.current.size >= 2) {
        const [first, second] = [...pointerLocations.current.values()]
        if (!first || !second) return
        const gesture = pinch.current
        const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y))
        const nextZoom = Math.max(1, Math.min(4, gesture.zoom * distance / Math.max(1, gesture.distance)))
        const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
        const anchorX = (gesture.midpoint.x - WIDTH / 2 - gesture.pan.x) / gesture.zoom
        const anchorY = (gesture.midpoint.y - HEIGHT / 2 - gesture.pan.y) / gesture.zoom
        const nextPan = {
          x: midpoint.x - WIDTH / 2 - anchorX * nextZoom,
          y: midpoint.y - HEIGHT / 2 - anchorY * nextZoom,
        }
        setView({ focusKey, zoom: nextZoom, pan: clampPan(nextZoom, nextPan) })
        if (drag.current) drag.current.moved = true
        return
      }
    }
    const current = drag.current
    if (current && (event.buttons & 1) === 1) {
      const dx = event.clientX - current.x
      const dy = event.clientY - current.y
      if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true
      if (current.moved) setView({ focusKey, zoom, pan: clampPan(zoom, { x: current.panX + dx * WIDTH / (svg.current?.clientWidth || WIDTH), y: current.panY + dy * HEIGHT / (svg.current?.clientHeight || HEIGHT) }) })
    }
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    pointerLocations.current.delete(event.pointerId)
    if (pointerLocations.current.size < 2) pinch.current = null
    window.setTimeout(() => { drag.current = null }, 0)
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault()
    const point = localPoint(event.clientX, event.clientY)
    setZoomAt(point, zoom * Math.exp(-event.deltaY * 0.0015))
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

  function moveCountryFocus(event: KeyboardEvent<SVGPathElement>, currentIndex: number) {
    let nextIndex: number | null = null
    if (event.key === 'Home') nextIndex = selectableIndexes[0] ?? null
    else if (event.key === 'End') nextIndex = selectableIndexes.at(-1) ?? null
    else {
      const current = keyboardTargets[currentIndex]
      if (!current) return
      nextIndex = nearestDirectionalTarget(current, keyboardTargets, event.key)
    }
    if (nextIndex === null || nextIndex === currentIndex) return
    event.preventDefault()
    setKeyboardFocus({ focusKey, index: nextIndex })
    requestAnimationFrame(() => countryPaths.current[nextIndex!]?.focus())
  }

  return (
    <div className={`map-shell ${compact ? 'map-shell-compact' : ''} ${className}`}>
      <svg
        ref={svg}
        className="geo-map"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="group"
        aria-label={ariaLabel}
        aria-describedby={onSelectCode ? keyboardHelpId : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleMapClick}
        onWheel={handleWheel}
        onPointerLeave={() => setHovered(null)}
      >
        <rect width={WIDTH} height={HEIGHT} className="map-water" />
        <g transform={`translate(${pan.x} ${pan.y}) translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${zoom}) translate(${-WIDTH / 2} ${-HEIGHT / 2}) ${rotationTransform}`}>
          {onSelectCode && smallHitTargets.size > 0 && <g className="map-country-hit-targets" aria-hidden="true">
            {features.map((feature) => {
              const code = mapKey(feature)
              if (!smallHitTargets.has(code) || !isSelectableFeature(feature) || (selectable && !selectable.has(code)) || path.area(feature as unknown as GeoPermissibleObjects) > 58) return null
              const point = projection(geoCentroid(feature as unknown as GeoPermissibleObjects))
              const radius = Math.max(9, Math.min(56, 20 * WIDTH / Math.max(1, mapWidth) / zoom))
              return point && point.every(Number.isFinite)
                ? <circle key={`hit-${code}`} className="map-country-hit-target" cx={point[0]} cy={point[1]} r={radius} onClick={(event) => {
                  event.stopPropagation()
                  if (!drag.current?.moved) onSelectCode(code)
                }} />
                : null
            })}
          </g>}
          {features.map((feature, index) => {
            const code = mapKey(feature)
            const isActive = active.has(code)
            const isStart = code === startCode
            const isDestination = code === destinationCode
            const isCorrect = code === correctCode
            const isWrong = code === wrongCode
            const canSelect = isSelectableFeature(feature) && (!selectable || selectable.has(code))
            const hiddenStaticPath = hideFeatureNames && !onSelectCode
            const pathClass = `map-country${isActive ? ' is-active' : ''}${canSelect ? ' is-selectable' : ' is-unavailable'}${isStart ? ' is-map-start' : ''}${isDestination ? ' is-map-destination' : ''}${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}${hovered === code ? ' is-hovered' : ''}`
            return (
              <path
                ref={onSelectCode && canSelect ? (element) => { countryPaths.current[index] = element } : undefined}
                key={`${code}-${String(feature.id ?? 'feature')}-${index}`}
                d={path(feature as unknown as GeoPermissibleObjects) ?? undefined}
                className={pathClass}
                aria-hidden={hiddenStaticPath || undefined}
                aria-label={hiddenStaticPath ? undefined : hideFeatureNames ? `Unlabelled map region ${index + 1}${isActive ? ', selected' : ''}` : `${feature.properties.name}${isActive ? ', in the current route' : ''}`}
                aria-pressed={onSelectCode && canSelect ? isActive : undefined}
                role={onSelectCode && canSelect ? 'button' : undefined}
                tabIndex={onSelectCode && canSelect ? index === focusableIndex ? 0 : -1 : -1}
                vectorEffect="non-scaling-stroke"
                onFocus={() => { if (onSelectCode && canSelect) setKeyboardFocus({ focusKey, index }) }}
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
                  if (!onSelectCode || !code || !canSelect) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectCode(code)
                  } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                    moveCountryFocus(event, index)
                  }
                }}
              />
            )
          })}
          {lineFeatures.map((feature, index) => (
            <path
              key={`line-${String(feature.id ?? index)}`}
              d={path(feature as unknown as GeoPermissibleObjects) ?? undefined}
              className="map-line-feature"
              aria-hidden="true"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {routePath && <path className="map-route-line" d={routePath} aria-hidden="true" />}
          {markerPoints.map((marker, index) => marker.screen && (
            <g key={`${marker.kind}-${index}`} className={`map-marker map-marker-${marker.kind}`} transform={`translate(${marker.screen[0]} ${marker.screen[1]})`}>
              <circle r={marker.kind === 'answer' ? 8 : 7} />
              <circle r="2.2" className="map-marker-core" />
              {!hideFeatureNames && <title>{marker.label}</title>}
            </g>
          ))}
        </g>
      </svg>
      {onSelectCode && <span className="sr-only" id={keyboardHelpId}>Use the arrow keys to move between countries, then press Enter or Space to select. Home and End move to the first and last country.</span>}
      {!compact && (
        <div className="map-tools" aria-label="Map controls">
          <button type="button" className="map-tool" onClick={() => setZoomAt({ x: WIDTH / 2, y: HEIGHT / 2 }, zoom + 0.4)} aria-label="Zoom in"><Plus size={16} /></button>
          <button type="button" className="map-tool" onClick={() => setZoomAt({ x: WIDTH / 2, y: HEIGHT / 2 }, zoom - 0.4)} aria-label="Zoom out"><Minus size={16} /></button>
          <button type="button" className="map-tool" onClick={() => setView({ focusKey, zoom: 1, pan: { x: 0, y: 0 } })} aria-label="Reset map view"><LocateFixed size={16} /></button>
        </div>
      )}
      {showHoverLabels && hovered && <div className="map-caption" aria-live="polite">{features.find((feature) => mapKey(feature) === hovered)?.properties.name}</div>}
    </div>
  )
}

function isSelectableFeature(feature: GeoFeature): boolean {
  return Boolean(feature.properties.iso3 || feature.properties.id || feature.properties.isoCode)
}

function nearestDirectionalTarget(current: KeyboardTarget, targets: Array<KeyboardTarget | null>, key: string): number | null {
  let best: KeyboardTarget | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const target of targets) {
    if (!target || target.index === current.index) continue
    const dx = target.x - current.x
    const dy = target.y - current.y
    const horizontal = key === 'ArrowRight' || key === 'ArrowLeft'
    const primary = horizontal ? dx : dy
    const secondary = horizontal ? Math.abs(dy) : Math.abs(dx)
    if ((key === 'ArrowRight' || key === 'ArrowDown') ? primary <= 0 : primary >= 0) continue
    const score = Math.abs(primary) + secondary * 1.5
    if (score < bestScore) {
      best = target
      bestScore = score
    }
  }
  return best?.index ?? null
}

function mapKey(feature: GeoFeature): string {
  return feature.properties.iso3
    ?? String(feature.properties.id ?? feature.properties.isoCode ?? feature.id ?? '')
}
