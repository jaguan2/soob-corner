import { PPULBATU_CHARACTERS } from '../data/ppulbatu'
import { calendarDayNumber } from './stats'

/** Advance through each character's bank by calendar day, independent of DST. */
export function dailyPpulbatuStickers(dayKey: string) {
  const day = calendarDayNumber(dayKey) ?? 0
  return PPULBATU_CHARACTERS.map((character, index) => {
    const count = character.stickers.length
    const sticker = character.stickers[((day + index) % count + count) % count]
    return { character: character.id, ...sticker }
  })
}
