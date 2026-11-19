import { Fragment, useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { geoCentroid, geoEqualEarth, geoMercator, geoPath, type GeoPermissibleObjects, type GeoProjection } from 'd3-geo'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import type { Coordinates, GeoFeature } from '../geography/types'
import './GeoMap.css'

const WIDTH = 960
const HEIGHT = 480
const EDGE: [[number, number], [number, number]] = [[16, 14], [WIDTH - 16, HEIGHT - 14]]
const ZERO_PAN = { x: 0, y: 0 }

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

interface PointerLocation {
  x: number
  y: number
  clientX: number
  clientY: number
}

interface GeoMapProps {
  features: GeoFeature[]
  activeCodes?: string[]
  selectableCodes?: string[]
  startCode?: string | null
  destinationCode?: string | null
  correctCode?: string | null
  wrongCode?: string | null
  wrongCodes?: string[]
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

function clampMapPan(nextZoom: number, nextPan: { x: number; y: number }) {
  const maxX = WIDTH * (nextZoom - 1) / 2 + 64
  const maxY = HEIGHT * (nextZoom - 1) / 2 + 64
  return { x: Math.max(-maxX, Math.min(maxX, nextPan.x)), y: Math.max(-maxY, Math.min(maxY, nextPan.y)) }
}

function mapLocalPoint(element: SVGSVGElement | null, clientX: number, clientY: number): { x: number; y: number } {
  const matrix = element?.getScreenCTM()
  if (matrix) {
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
    if (Number.isFinite(point.x) && Number.isFinite(point.y)) return { x: point.x, y: point.y }
  }
  const rect = element?.getBoundingClientRect()
  if (!rect || rect.width === 0 || rect.height === 0) return { x: WIDTH / 2, y: HEIGHT / 2 }
  return { x: (clientX - rect.left) / rect.width * WIDTH, y: (clientY - rect.top) / rect.height * HEIGHT }
}

function mapLocalVector(element: SVGSVGElement | null, clientDX: number, clientDY: number): { x: number; y: number } {
  const matrix = element?.getScreenCTM()?.inverse()
  if (matrix) return { x: clientDX * matrix.a + clientDY * matrix.c, y: clientDX * matrix.b + clientDY * matrix.d }
  return {
    x: clientDX * WIDTH / (element?.clientWidth || WIDTH),
    y: clientDY * HEIGHT / (element?.clientHeight || HEIGHT),
  }
}

export function GeoMap({
  features,
  activeCodes = [],
  selectableCodes,
  startCode = null,
  destinationCode = null,
  correctCode = null,
  wrongCode = null,
  wrongCodes = [],
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
  const [mapScale, setMapScale] = useState(1)
  const [view, setView] = useState({ focusKey: '', zoom: 1, pan: { x: 0, y: 0 } })
  const [keyboardFocus, setKeyboardFocus] = useState<{ focusKey: string; index: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const drag = useRef<{ x: number; y: number; panX: number; panY: number; moved: boolean } | null>(null)
  const pointerLocations = useRef(new Map<number, PointerLocation>())
  const pinch = useRef<PinchGesture | null>(null)
  const svg = useRef<SVGSVGElement>(null)
  const nativeWheelHandler = useRef<(event: WheelEvent) => void>(() => {})
  const countryPaths = useRef<Array<SVGPathElement | null>>([])
  useLayoutEffect(() => {
    const element = svg.current
    if (!element) return
    const measure = () => {
      const scale = element.getScreenCTM()?.a
      const width = element.getBoundingClientRect().width || WIDTH
      setMapScale(scale && Number.isFinite(scale) ? scale : width / WIDTH)
    }
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
  const incorrect = useMemo(() => new Set(wrongCodes), [wrongCodes])
  const selectable = useMemo(() => selectableCodes ? new Set(selectableCodes) : null, [selectableCodes])
  const smallHitTargets = useMemo(() => new Set(smallHitTargetCodes), [smallHitTargetCodes])
  const collection = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: features as unknown as GeoJSON.Feature[],
  }), [features])
  const focusKey = focusCodes?.join('|') ?? ''
  const zoom = view.focusKey === focusKey ? view.zoom : 1
  const pan = view.focusKey === focusKey ? view.pan : ZERO_PAN
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

  const setZoomAt = useCallback((point: { x: number; y: number }, requestedZoom: number) => {
    const nextZoom = Math.max(1, Math.min(4, requestedZoom))
    const nextPan = {
      x: point.x - WIDTH / 2 - ((point.x - WIDTH / 2 - pan.x) / zoom) * nextZoom,
      y: point.y - HEIGHT / 2 - ((point.y - HEIGHT / 2 - pan.y) / zoom) * nextZoom,
    }
    setView({ focusKey, zoom: nextZoom, pan: clampMapPan(nextZoom, nextPan) })
  }, [focusKey, pan, zoom])

  useLayoutEffect(() => {
    nativeWheelHandler.current = (event) => {
      if (!event.cancelable) return
      event.preventDefault()
      const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? HEIGHT : 1
      const delta = Math.max(-240, Math.min(240, dominantDelta * unit))
      if (delta === 0) return
      const sensitivity = event.ctrlKey ? 0.004 : 0.00165
      setZoomAt(mapLocalPoint(svg.current, event.clientX, event.clientY), zoom * Math.exp(-delta * sensitivity))
    }
  }, [setZoomAt, zoom])

  useLayoutEffect(() => {
    const element = svg.current
    if (!element) return
    const handleNativeWheel = (event: WheelEvent) => nativeWheelHandler.current(event)
    element.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleNativeWheel)
  }, [])

  function mapCoordinates(event: MouseEvent<SVGSVGElement>): Coordinates | null {
    if (!onPointSelect || !svg.current) return null
    const local = mapLocalPoint(svg.current, event.clientX, event.clientY)
    const px = local.x
    const py = local.y
    const x = (px - pan.x - WIDTH / 2) / zoom + WIDTH / 2
    const y = (py - pan.y - HEIGHT / 2) / zoom + HEIGHT / 2
    const point = projection.invert?.([x, y])
    if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[1]) > 90) return null
    return { lon: point[0], lat: point[1] }
  }

  function selectSmallCountryAtPoint(event: MouseEvent<SVGCircleElement>) {
    event.stopPropagation()
    if (drag.current?.moved || !svg.current) return
    let nearestCode = event.currentTarget.dataset.countryCode ?? ''
    let nearestDistance = Number.POSITIVE_INFINITY
    for (const circle of svg.current.querySelectorAll<SVGCircleElement>('.map-country-hit-target')) {
      const code = circle.dataset.countryCode
      const matrix = circle.getScreenCTM()
      if (!code || !matrix) continue
      const center = new DOMPoint(circle.cx.baseVal.value, circle.cy.baseVal.value).matrixTransform(matrix)
      const distance = Math.hypot(event.clientX - center.x, event.clientY - center.y)
      const radius = circle.r.baseVal.value * Math.hypot(matrix.a, matrix.b)
      if (distance <= radius && distance < nearestDistance) {
        nearestCode = code
        nearestDistance = distance
      }
    }
    if (nearestCode) onSelectCode?.(nearestCode)
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    if (event.isTrusted) {
      const target = event.target instanceof SVGElement ? event.target : event.currentTarget
      try { target.setPointerCapture(event.pointerId) } catch { /* The browser may already have released this pointer. */ }
    }
    if (event.pointerType === 'touch' || event.pointerType === 'pen') {
      const point = mapLocalPoint(svg.current, event.clientX, event.clientY)
      pointerLocations.current.set(event.pointerId, { ...point, clientX: event.clientX, clientY: event.clientY })
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
          drag.current = null
          setIsPanning(true)
        }
        return
      }
    }
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y, moved: false }
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (pointerLocations.current.has(event.pointerId)) {
      const point = mapLocalPoint(svg.current, event.clientX, event.clientY)
      pointerLocations.current.set(event.pointerId, { ...point, clientX: event.clientX, clientY: event.clientY })
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
        setView({ focusKey, zoom: nextZoom, pan: clampMapPan(nextZoom, nextPan) })
        setIsPanning(true)
        return
      }
    }
    const current = drag.current
    if (current && (pointerLocations.current.has(event.pointerId) || (event.buttons & 1) === 1)) {
      const dx = event.clientX - current.x
      const dy = event.clientY - current.y
      if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true
      if (current.moved) {
        setIsPanning(true)
        const delta = mapLocalVector(svg.current, dx, dy)
        setView({ focusKey, zoom, pan: clampMapPan(zoom, { x: current.panX + delta.x, y: current.panY + delta.y }) })
      }
    }
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    pointerLocations.current.delete(event.pointerId)
    if (pinch.current && pointerLocations.current.size < 2) pinch.current = null
    if (pointerLocations.current.size === 1) {
      const remaining = [...pointerLocations.current.values()][0]
      if (remaining) drag.current = { x: remaining.clientX, y: remaining.clientY, panX: pan.x, panY: pan.y, moved: true }
      setIsPanning(true)
      return
    }
    if (pointerLocations.current.size === 0) setIsPanning(false)
    window.setTimeout(() => { if (pointerLocations.current.size === 0) drag.current = null }, 0)
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
        onDragStart={(event) => event.preventDefault()}
        onPointerLeave={() => setHovered(null)}
      >
        <rect width={WIDTH} height={HEIGHT} className="map-water" />
        <g className="map-transform-layer" data-panning={isPanning || undefined} transform={`translate(${pan.x} ${pan.y}) translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${zoom}) translate(${-WIDTH / 2} ${-HEIGHT / 2}) ${rotationTransform}`}>
          {features.map((feature, index) => {
            const code = mapKey(feature)
            const isActive = active.has(code)
            const isStart = code === startCode
            const isDestination = code === destinationCode
            const isCorrect = code === correctCode
            const isWrong = code === wrongCode || incorrect.has(code)
            const canSelect = isSelectableFeature(feature) && (!selectable || selectable.has(code))
            const hiddenStaticPath = hideFeatureNames && !onSelectCode
            const pathClass = `map-country${isActive ? ' is-active' : ''}${canSelect ? ' is-selectable' : ' is-unavailable'}${isStart ? ' is-map-start' : ''}${isDestination ? ' is-map-destination' : ''}${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}${hovered === code ? ' is-hovered' : ''}`
            return (
              <path
                ref={onSelectCode && canSelect ? (element) => { countryPaths.current[index] = element } : undefined}
                key={`${code}-${String(feature.id ?? 'feature')}-${index}`}
                data-country-code={code || undefined}
                d={path(feature as unknown as GeoPermissibleObjects) ?? undefined}
                className={pathClass}
                aria-hidden={hiddenStaticPath || undefined}
                aria-label={hiddenStaticPath ? undefined : hideFeatureNames ? `Unlabelled map region ${index + 1}${isWrong ? ', incorrect guess' : isActive ? ', selected' : ''}` : `${feature.properties.name}${isWrong ? ', incorrect guess' : isActive ? ', in the current route' : ''}`}
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
          {onSelectCode && smallHitTargets.size > 0 && <g className="map-country-hit-targets" aria-hidden="true">
            {features.map((feature) => {
              const code = mapKey(feature)
              if (!smallHitTargets.has(code) || !isSelectableFeature(feature) || (selectable && !selectable.has(code)) || path.area(feature as unknown as GeoPermissibleObjects) > 58) return null
              const point = projection(geoCentroid(feature as unknown as GeoPermissibleObjects))
              const radius = Math.max(9, Math.min(56, 18 / Math.max(.01, mapScale) / zoom))
              return point && point.every(Number.isFinite)
                ? <circle key={`hit-${code}`} className="map-country-hit-target" data-country-code={code} cx={point[0]} cy={point[1]} r={radius} onClick={selectSmallCountryAtPoint} />
                : null
            })}
          </g>}
          {lineFeatures.map((feature, index) => (
            <Fragment key={`line-${String(feature.id ?? index)}`}>
              <path
                d={path(feature as unknown as GeoPermissibleObjects) ?? undefined}
                className="map-line-casing"
                aria-hidden="true"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={path(feature as unknown as GeoPermissibleObjects) ?? undefined}
                className="map-line-feature"
                aria-hidden="true"
                vectorEffect="non-scaling-stroke"
              />
            </Fragment>
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
        <div className="map-tools" role="group" aria-label="Map controls">
          <button type="button" className="map-tool" onClick={() => setZoomAt({ x: WIDTH / 2, y: HEIGHT / 2 }, zoom + 0.4)} aria-label="Zoom in" disabled={zoom >= 4}><Plus size={16} /></button>
          <button type="button" className="map-tool" onClick={() => setZoomAt({ x: WIDTH / 2, y: HEIGHT / 2 }, zoom - 0.4)} aria-label="Zoom out" disabled={zoom <= 1}><Minus size={16} /></button>
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
