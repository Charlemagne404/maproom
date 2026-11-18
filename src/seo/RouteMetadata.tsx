import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getStructuredData, resolvePageMetadata } from './routeMetadata'

export function RouteMetadata() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    const page = resolvePageMetadata(pathname, search)
    const canonical = document.querySelector<HTMLLinkElement>('#canonical-url')
    const siteOrigin = canonical ? new URL(canonical.href, window.location.origin).origin : window.location.origin
    const canonicalUrl = new URL(page.canonicalPath, siteOrigin).href
    const imageUrl = new URL('/social/maproom-preview.png', siteOrigin).href

    document.title = page.title
    setMeta('#meta-description', page.description)
    setMeta('#meta-robots', page.robotsContent)
    setMeta('#og-title', page.title)
    setMeta('#og-description', page.description)
    setMeta('#og-url', canonicalUrl)
    setMeta('#og-image', imageUrl)
    setMeta('#twitter-title', page.title)
    setMeta('#twitter-description', page.description)
    setMeta('meta[name="twitter:image"]', imageUrl)
    if (canonical) canonical.href = canonicalUrl

    const structuredData = document.querySelector<HTMLScriptElement>('#structured-data')
    if (structuredData) structuredData.textContent = JSON.stringify(getStructuredData(page, canonicalUrl))
  }, [pathname, search])

  return null
}

function setMeta(selector: string, content: string): void {
  const element = document.querySelector<HTMLMetaElement>(selector)
  if (element) element.content = content
}
