const text = value => typeof value === 'string' && value.trim() ? value.trim() : null

/** Watch-page metadata respects the English session; player details can stay original. */
export function catalogTitle(info) {
  const original = text(info.basic_info?.title)
  const title = text(info.primary_info?.title?.text) ?? original
  if (!title) throw new Error('No video title returned')
  return { title, ...(original && original !== title ? { originalTitle: original } : {}) }
}

/** An unavailable watch page must not prevent fetching ordinary video metadata. */
export async function englishVideoInfo(yt, id) {
  try { return await yt.getInfo(id) }
  catch { return yt.getBasicInfo(id) }
}
