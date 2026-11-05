import { describe, expect, it } from 'vitest'
import { PPULBATU_CHARACTERS } from '../data/ppulbatu'
import { dailyPpulbatuStickers } from './ppulbatu'

describe('daily PPULBATU selection', () => {
  it('keeps exactly one sticker for each of the five characters', () => {
    expect(dailyPpulbatuStickers('2026-11-05').map(sticker => sticker.character)).toEqual([
      'choi-yong-meong', 'hwang-choon', 'bamgeut', 'da-go-nyang', 'hhm-nya-ring',
    ])
  })

  it('gives reloads the same selection for the same day', () => {
    expect(dailyPpulbatuStickers('2026-11-05')).toEqual(dailyPpulbatuStickers('2026-11-05'))
  })

  it('uses every pose in each character bank before repeating', () => {
    const selections = ['2026-11-05', '2026-11-06', '2026-11-07'].map(dailyPpulbatuStickers)
    PPULBATU_CHARACTERS.forEach((character, index) => {
      expect(new Set(selections.map(stickers => stickers[index].image))).toEqual(
        new Set(character.stickers.map(sticker => sticker.image)),
      )
    })
  })

  it.each([
    ['2026-03-08', '2026-03-09'], // US spring DST
    ['2026-11-01', '2026-11-02'], // US autumn DST
    ['2026-12-31', '2027-01-01'],
    ['2028-02-28', '2028-02-29'],
    ['2028-02-29', '2028-03-01'],
  ])('changes every character between %s and %s', (before, after) => {
    const next = dailyPpulbatuStickers(after)
    dailyPpulbatuStickers(before).forEach((sticker, index) => {
      expect(next[index].character).toBe(sticker.character)
      expect(next[index].image).not.toBe(sticker.image)
    })
  })

  it('keeps selections valid for dates before the Unix epoch', () => {
    const stickers = dailyPpulbatuStickers('1960-01-01')
    stickers.forEach((sticker, index) => {
      expect(PPULBATU_CHARACTERS[index].stickers.some(pose => pose.image === sticker.image)).toBe(true)
    })
  })
})
