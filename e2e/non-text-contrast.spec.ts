import { expect, test, type Page } from '@playwright/test'

async function controlBoundaryFailures(page: Page) {
  return page.evaluate(() => {
    type Failure = { name: string; ratio: number; border: string; adjacent: string }
    const parse = (value: string): [number, number, number, number] | null => {
      const match = value.match(/rgba?\(([^)]+)\)/)
      if (!match) return null
      const channels = match[1].split(',').map((channel) => Number.parseFloat(channel.trim()))
      return [channels[0], channels[1], channels[2], channels[3] ?? 1]
    }
    const composite = (foreground: number[], background: number[]) => [
      foreground[0] * foreground[3] + background[0] * (1 - foreground[3]),
      foreground[1] * foreground[3] + background[1] * (1 - foreground[3]),
      foreground[2] * foreground[3] + background[2] * (1 - foreground[3]),
      1,
    ]
    const luminance = (color: number[]) => color.slice(0, 3).map((channel) => {
      const normalized = channel / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
    const contrastRatio = (first: number[], second: number[]) => {
      const a = luminance(first)
      const b = luminance(second)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }
    const backgroundBehind = (element: HTMLElement) => {
      const backgrounds: number[][] = []
      let ancestor = element.parentElement
      while (ancestor) {
        const color = parse(getComputedStyle(ancestor).backgroundColor)
        if (color) backgrounds.push(color)
        if (ancestor === document.documentElement) break
        ancestor = ancestor.parentElement
      }
      let background: number[] = [255, 255, 255, 1]
      for (let index = backgrounds.length - 1; index >= 0; index -= 1) background = composite(backgrounds[index], background)
      return background
    }
    const failures: Failure[] = []
    const candidates = document.querySelectorAll<HTMLElement>([
      '.search-field', '.autocomplete-field', '.coordinate-fields input', 'select',
    ].join(','))
    for (const element of candidates) {
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const borderWidth = Number.parseFloat(style.borderTopWidth)
      const borderColor = parse(style.borderTopColor)
      if (bounds.width < 1 || bounds.height < 1 || borderWidth < 1 || !borderColor) continue
      const adjacent = backgroundBehind(element)
      const visibleBorder = composite(borderColor, adjacent)
      const ratio = contrastRatio(visibleBorder, adjacent)
      if (ratio < 3) {
        failures.push({
          name: element.getAttribute('aria-label')
            ?? element.querySelector('input')?.getAttribute('placeholder')
            ?? element.getAttribute('placeholder')
            ?? element.textContent?.trim().slice(0, 45)
            ?? element.tagName.toLowerCase(),
          ratio: Number(ratio.toFixed(2)),
          border: style.borderTopColor,
          adjacent: adjacent.slice(0, 3).map(Math.round).join(','),
        })
      }
    }

    const toggle = document.querySelector<HTMLInputElement>('.toggle-input')
    if (toggle) {
      const track = parse(getComputedStyle(toggle).backgroundColor)
      const thumb = getComputedStyle(toggle, '::before')
      const thumbFill = parse(thumb.backgroundColor)
      const thumbBorder = parse(thumb.borderTopColor)
      if (track && thumbFill && thumbBorder) {
        const thumbFillRatio = contrastRatio(thumbFill, track)
        const thumbBorderRatio = contrastRatio(thumbBorder, track)
        if (Math.max(thumbFillRatio, thumbBorderRatio) < 3) {
          failures.push({ name: 'Show map labels switch thumb', ratio: Number(Math.max(thumbFillRatio, thumbBorderRatio).toFixed(2)), border: thumb.borderTopColor, adjacent: track.slice(0, 3).map(Math.round).join(',') })
        }
      }
    }

    for (const trackElement of document.querySelectorAll<HTMLElement>('.game-setting-toggle i')) {
      const track = parse(getComputedStyle(trackElement).backgroundColor)
      const adjacent = backgroundBehind(trackElement)
      const thumb = getComputedStyle(trackElement, '::after')
      const thumbFill = parse(thumb.backgroundColor)
      if (track && thumbFill) {
        const trackRatio = contrastRatio(track, adjacent)
        const thumbRatio = contrastRatio(thumbFill, track)
        if (trackRatio < 3) failures.push({ name: 'Game setting switch track', ratio: Number(trackRatio.toFixed(2)), border: getComputedStyle(trackElement).backgroundColor, adjacent: adjacent.slice(0, 3).map(Math.round).join(',') })
        if (thumbRatio < 3) failures.push({ name: 'Game setting switch thumb', ratio: Number(thumbRatio.toFixed(2)), border: thumb.backgroundColor, adjacent: track.slice(0, 3).map(Math.round).join(',') })
      }
    }

    return failures
  })
}

async function mapFocusContrast(page: Page) {
  return page.evaluate(() => {
    const parse = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/)
      return match ? match[1].split(',').map((channel) => Number.parseFloat(channel.trim())) : null
    }
    const luminance = (color: number[]) => color.slice(0, 3).map((channel) => {
      const normalized = channel / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
    const focus = document.querySelector<SVGPathElement>('.map-country[tabindex="0"]')
    const nearby = document.querySelector<SVGPathElement>('.map-country:not(:focus-visible):not(:hover):not(.is-hovered):not(.is-active):not(.is-wrong):not(.is-correct)')
    if (!focus || !nearby || !focus.matches(':focus-visible')) return null
    const focusedColor = parse(getComputedStyle(focus).fill)
    const nearbyColor = parse(getComputedStyle(nearby).fill)
    if (!focusedColor || !nearbyColor) return null
    const a = luminance(focusedColor)
    const b = luminance(nearbyColor)
    return {
      ratio: Number(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2)),
      focusedFill: getComputedStyle(focus).fill,
      surroundingFill: getComputedStyle(nearby).fill,
      focusedCountry: focus.getAttribute('aria-label'),
    }
  })
}

test('form boundaries and keyboard map focus meet non-text contrast across themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const theme of ['light', 'dark']) {
    await page.goto('/settings')
    await page.getByLabel('Appearance', { exact: true }).selectOption(theme)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect.poll(() => page.locator('html').evaluate((element) => getComputedStyle(element).getPropertyValue('--accent-ink').trim()))
      .toBe(theme === 'dark' ? '#f5a575' : '#9f3f19')
    const settingsFailures = await controlBoundaryFailures(page)
    expect(settingsFailures, `${theme} settings controls`).toEqual([])
    const mapLabelsSwitch = page.getByLabel('Show map labels')
    await mapLabelsSwitch.uncheck()
    expect(await controlBoundaryFailures(page), `${theme} map labels switch off`).toEqual([])
    await mapLabelsSwitch.check()
    expect(await controlBoundaryFailures(page), `${theme} map labels switch on`).toEqual([])

    await page.goto('/explore')
    expect(await controlBoundaryFailures(page), `${theme} Explore search`).toEqual([])
    await page.goto('/data')
    expect(await controlBoundaryFailures(page), `${theme} Data search`).toEqual([])

    await page.goto('/games/countries?mode=freeplay')
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await controlBoundaryFailures(page), `${theme} setup controls`).toEqual([])
    await page.getByRole('button', { name: 'Start free play' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.locator('.map-playfield > .game-map-stage')).toBeVisible()
    await expect(page.locator('.autocomplete-field')).toHaveCount(0)
    expect(await controlBoundaryFailures(page), `${theme} answer controls`).toEqual([])

    const firstCountry = page.locator('.map-country[tabindex="0"]')
    await page.keyboard.press('Tab')
    await firstCountry.focus()
    await expect(firstCountry).toBeFocused()
    await expect.poll(() => firstCountry.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
    const focusRatio = await mapFocusContrast(page)
    expect(focusRatio, `${theme} map focus fill versus surrounding land`).not.toBeNull()
    expect(focusRatio!.ratio, `${theme} map focus ${JSON.stringify(focusRatio)}`).toBeGreaterThanOrEqual(3)

    await page.getByRole('button', { name: 'Game settings' }).click()
    await expect(page.locator('.game-setting-toggle i')).toBeVisible()
    expect(await controlBoundaryFailures(page), `${theme} game setting switch`).toEqual([])
    const timedRoundSwitch = page.getByLabel('60-second speed round')
    await timedRoundSwitch.check()
    expect(await controlBoundaryFailures(page), `${theme} game setting switch on`).toEqual([])
    await timedRoundSwitch.uncheck()
    expect(await controlBoundaryFailures(page), `${theme} game setting switch off`).toEqual([])
  }
})
