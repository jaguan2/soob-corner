import { describe, expect, it } from 'vitest'
import { cardDestination, tabDestination } from './keyboardNavigation'

describe('keyboard navigation destinations', () => {
  it('wraps horizontal tabs and supports Home/End without consuming vertical scrolling', () => {
    expect(tabDestination('ArrowLeft', 0, 7)).toBe(6)
    expect(tabDestination('ArrowRight', 6, 7)).toBe(0)
    expect(tabDestination('Home', 4, 7)).toBe(0)
    expect(tabDestination('End', 2, 7)).toBe(6)
    expect(tabDestination('ArrowUp', 2, 7)).toBeNull()
    expect(tabDestination('ArrowDown', 2, 7)).toBeNull()
    expect(tabDestination('ArrowRight', 0, 0)).toBeNull()
  })

  it.each([2, 3, 4])('moves vertically using the current %s-column layout', columns => {
    const rects = Array.from({ length: 12 }, (_, i) => ({ left: i % columns * 110, top: Math.floor(i / columns) * 180, width: 100 }))
    expect(cardDestination('ArrowDown', 1, rects)).toBe(columns + 1)
    expect(cardDestination('ArrowUp', columns + 1, rects)).toBe(1)
    expect(cardDestination('ArrowLeft', 1, rects)).toBe(0)
    expect(cardDestination('ArrowRight', 1, rects)).toBe(2)
    expect(cardDestination('Home', 8, rects)).toBe(0)
    expect(cardDestination('End', 1, rects)).toBe(11)
  })

  it('uses the nearest column in a short final row and stops at collection edges', () => {
    const rects = [{ left: 0, top: 0, width: 90 }, { left: 110, top: 0, width: 90 },
      { left: 0, top: 180, width: 90 }]
    expect(cardDestination('ArrowDown', 1, rects)).toBe(2)
    expect(cardDestination('ArrowUp', 0, rects)).toBe(0)
    expect(cardDestination('ArrowDown', 2, rects)).toBe(2)
    expect(cardDestination('ArrowLeft', 0, rects)).toBe(0)
    expect(cardDestination('ArrowRight', 2, rects)).toBe(2)
    expect(cardDestination('Tab', 0, rects)).toBeNull()
    expect(cardDestination('ArrowDown', 5, rects)).toBeNull()
  })

  it('reads inherited rectangle getters returned by the browser', () => {
    const rects = Array.from({ length: 8 }, (_, i) => Object.create({ left: i % 4 * 100, top: Math.floor(i / 4) * 200, width: 90 }))
    expect(cardDestination('ArrowDown', 1, rects)).toBe(5)
    expect(cardDestination('ArrowUp', 5, rects)).toBe(1)
  })
})
