import type { Page } from '@playwright/test'
import { feature } from 'topojson-client'
import type { Topology } from 'topojson-specification'
import type { GeoFeature } from '../src/geography/types'

export function decodeCountryTopology(value: unknown): GeoFeature[] {
  const data = value as Topology
  const object = data.objects?.countries
  if (data.type !== 'Topology' || !object || object.type !== 'GeometryCollection') {
    throw new Error('Country topology has an unsupported shape.')
  }
  return feature(data, object).features as unknown as GeoFeature[]
}

export async function loadTopologyFeatures(page: Page, path: string): Promise<GeoFeature[]> {
  const response = await page.request.get(new URL(path, page.url()).toString())
  if (!response.ok()) throw new Error('Could not load ' + path + ' (' + response.status() + ').')
  return decodeCountryTopology(await response.json())
}
