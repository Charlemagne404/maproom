import { expect, test, type Page } from '@playwright/test'

const freePlayRoutes = [
  '/games/countries?mode=freeplay',
  '/games/outlines?mode=freeplay',
  '/games/routes?mode=freeplay',
  '/games/flags?mode=freeplay&format=flag-to-country',
  '/games/grid?mode=freeplay',
  '/games/cities?mode=freeplay&format=country-to-capital',
  '/games/connections?mode=freeplay',
  '/games/higher-lower?mode=freeplay',
  '/games/neighbours?mode=freeplay',
  '/games/distance?mode=freeplay',
  '/games/rivers?mode=freeplay',
  '/games/latitude-ladder?mode=freeplay&format=west-east',
]

async function visibleTextContrastFailures(page: Page) {
  return page.evaluate(() => {
    type ContrastFailure = { text: string; ratio: number; threshold: number; foreground: string; background: string; selector: string }

    const parseColor = (value: string): [number, number, number, number] | null => {
      const match = value.match(/rgba?\(([^)]+)\)/)
      if (!match) return null
      const channels = match[1].split(',').map((channel) => Number.parseFloat(channel.trim()))
      return [channels[0], channels[1], channels[2], channels[3] ?? 1]
    }
    const composite = (foreground: number[], background: number[]) => {
      const alpha = foreground[3]
      return [
        foreground[0] * alpha + background[0] * (1 - alpha),
        foreground[1] * alpha + background[1] * (1 - alpha),
        foreground[2] * alpha + background[2] * (1 - alpha),
        1,
      ]
    }
    const luminance = (color: number[]) => color.slice(0, 3).map((channel) => {
      const normalized = channel / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
    const contrastRatio = (first: number[], second: number[]) => {
      const a = luminance(first)
      const b = luminance(second)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }
    const failures: ContrastFailure[] = []
    const add = (element: HTMLElement, text: string, foregroundValue: string, opacity: number, fontSize: string, fontWeight: string) => {
      const bounds = element.getBoundingClientRect()
      if (bounds.width < 1 || bounds.height < 1) return
      if (element.closest('button:disabled, input:disabled, select:disabled, textarea:disabled, [aria-disabled="true"]')) return
      const style = getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden') return

      let background: number[] = [255, 255, 255, 1]
      const backgrounds: number[][] = []
      let hasImageBackground = false
      let effectiveOpacity = opacity
      let ancestor: HTMLElement | null = element
      while (ancestor && ancestor !== document.documentElement) {
        const ancestorStyle = getComputedStyle(ancestor)
        if (ancestorStyle.display === 'none' || ancestorStyle.visibility === 'hidden' || Number(ancestorStyle.opacity) <= 0.01) return
        if (ancestorStyle.backgroundImage !== 'none') hasImageBackground = true
        effectiveOpacity *= Number(ancestorStyle.opacity)
        const color = parseColor(ancestorStyle.backgroundColor)
        if (color) backgrounds.push(color)
        ancestor = ancestor.parentElement
      }
      if (hasImageBackground) return
      for (let index = backgrounds.length - 1; index >= 0; index -= 1) background = composite(backgrounds[index], background)

      const foreground = parseColor(foregroundValue)
      if (!foreground) return
      const painted = composite([foreground[0], foreground[1], foreground[2], foreground[3] * effectiveOpacity], background)
      const size = Number.parseFloat(fontSize)
      const numericWeight = Number.parseInt(fontWeight, 10)
      const isBold = fontWeight === 'bold' || numericWeight >= 700
      const largeText = size >= 24 || (size >= 18.66 && isBold)
      const threshold = largeText ? 3 : 4.5
      const ratio = contrastRatio(painted, background)
      if (ratio < threshold) {
        failures.push({
          text: text.slice(0, 60),
          ratio: Number(ratio.toFixed(2)),
          threshold,
          foreground: foregroundValue,
          background: background.slice(0, 3).map(Math.round).join(','),
          selector: `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? `.${element.className.trim().replace(/\s+/g, '.')}` : ''}`,
        })
      }
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      const text = node.textContent?.replace(/\s+/g, ' ').trim()
      const element = node.parentElement
      // The brand dot is part of the wordmark; logotype text is exempt from the text contrast criterion.
      if (!text || !element || element.closest('svg, [aria-hidden="true"], .sr-only, .brand-period')) continue
      const style = getComputedStyle(element)
      add(element, text, style.color, 1, style.fontSize, style.fontWeight)
    }

    for (const input of document.querySelectorAll<HTMLInputElement>('input[placeholder]')) {
      if (input.value) continue
      const placeholder = getComputedStyle(input, '::placeholder')
      add(input, `placeholder: ${input.placeholder}`, placeholder.color, Number(placeholder.opacity), placeholder.fontSize, placeholder.fontWeight)
    }

    return [...new Map(failures.map((failure) => [
      `${failure.text}|${failure.foreground}|${failure.background}|${failure.selector}`,
      failure,
    ])).values()]
  })
}

test('visible text meets contrast thresholds across light and dark game routes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })

  for (const theme of ['light', 'dark']) {
    await page.goto('/settings')
    await page.getByLabel('Appearance', { exact: true }).selectOption(theme)

    for (const route of ['/', '/explore', '/settings', '/data']) {
      await page.goto(route)
      await expect(page.locator('h1').first()).toBeVisible()
      const failures = await visibleTextContrastFailures(page)
      expect(failures, `${theme} theme on ${route}`).toEqual([])
    }

    for (const route of freePlayRoutes) {
      await page.goto(route)
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      let failures = await visibleTextContrastFailures(page)
      expect(failures, `${theme} setup on ${route}`).toEqual([])

      const start = dialog.getByRole('button', { name: 'Start free play' })
      await expect(start).toHaveAttribute('aria-disabled', 'false')
      await start.click()
      await expect(dialog).toBeHidden()
      await expect(page.locator('.game-body')).toBeVisible()
      failures = await visibleTextContrastFailures(page)
      expect(failures, `${theme} game on ${route}`).toEqual([])
    }
  }
})
