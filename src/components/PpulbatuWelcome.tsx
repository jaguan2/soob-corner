import { useLocalDay } from '../hooks/useLocalDay'
import { dailyPpulbatuStickers } from '../lib/ppulbatu'

/** Complete, static sticker poses sit behind the home page content. */
export function PpulbatuWelcome() {
  const stickers = dailyPpulbatuStickers(useLocalDay())
  return <div className="ppulbatu-welcome" aria-hidden="true">
    {stickers.map(friend => <span key={friend.character} className="ppulbatu-character" data-character={friend.character}>
      <img src={`/ppulbatu/${friend.image}.png`} width={friend.width} height={300}
        alt="" draggable={false} />
    </span>)}
  </div>
}
