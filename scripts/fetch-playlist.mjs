// Refresh the source playlist plus curated TXT links; no runtime API or API key.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { Innertube } from 'youtubei.js'
import { secondsToDuration, renderCatalogLinks } from './catalog-output.mjs'
import { membersFromTitle, broadcastDateFromTitle, kindFromTitle, validDate, sameBroadcast } from './catalog-metadata.mjs'
import { catalogTitle, englishVideoInfo } from './catalog-titles.mjs'

const titlesOnly = process.argv.includes('--titles-only')
if (process.argv.slice(2).some(arg => arg !== '--titles-only')) throw new Error('Only --titles-only is supported')

const PLAYLIST_ID = 'PLwzQP2wCE5w4hRj01BS0zxO2Bu8eaBDWt'
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const OUT_PATH = path.join(SCRIPT_DIR, '..', 'src', 'data', 'playlist.json')
const EXTRAS_PATH = path.join(SCRIPT_DIR, 'extra-videos.json')
const LINKS_PATH = path.join(SCRIPT_DIR, '..', 'docs', 'video-catalog.md')

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error }
}
const config = await readJson(EXTRAS_PATH, { videos: [] })
if (!Array.isArray(config.videos)) throw new Error('extra-videos.json must contain a videos array')
const overrides = new Map()
for (const entry of config.videos) {
  if (!/^[\w-]{11}$/.test(entry.id) || overrides.has(entry.id)) throw new Error(`Invalid or duplicate curated id: ${entry.id}`)
  if (!entry.members?.length || entry.members.some(m => !['soobin', 'yeonjun', 'beomgyu', 'taehyun', 'hueningkai'].includes(m))) throw new Error(`Missing or invalid members: ${entry.id}`)
  if (entry.broadcastDate && !validDate(entry.broadcastDate)) throw new Error(`Invalid broadcast date: ${entry.id}`)
  overrides.set(entry.id, entry)
}
const previous = await readJson(OUT_PATH, { videos: [] })
const cached = new Map(previous.videos.map(v => [v.id, v]))
if (titlesOnly && !previous.videos.length) throw new Error('No existing catalog to update')
const yt = await Innertube.create({ lang: 'en', location: 'US', retrieve_player: false,
  fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(20_000) }) })
let title = previous.title
const upstream = []
if (!titlesOnly) {
  let playlist = await yt.getPlaylist(PLAYLIST_ID)
  title = playlist.info.title
  while (true) {
    for (const item of playlist.items) {
      const id = item.content_id ?? item.id
      if (id && !upstream.includes(id)) upstream.push(id)
    }
    if (!playlist.has_continuation) break
    playlist = await playlist.getContinuation()
  }
  if (!upstream.length) throw new Error('Parsed 0 videos — refusing to overwrite the catalog. Check the YouTube playlist schema.')
}
const ids = titlesOnly ? previous.videos.map(video => video.id) : [...new Set([...upstream, ...overrides.keys()])]
console.log(`Resolving ${ids.length} videos (${titlesOnly ? 'English-preferred titles only' : 'titles, durations, channels and release dates'})...`)
let cursor = 0
let successes = 0
let extraSuccesses = 0
let failures = 0
const results = new Array(ids.length)
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < ids.length) {
    const index = cursor++
    const id = ids[index]
    const override = overrides.get(id)
    try {
      const info = await englishVideoInfo(yt, id)
      const basic = info.basic_info
      const labels = catalogTitle(info)
      if (titlesOnly) {
        results[index] = { ...cached.get(id), originalTitle: undefined, ...labels }
      } else {
        if (!basic.title || !basic.duration) throw new Error('No title/duration returned')
        const micro = info.page[0].microformat
        const inferred = membersFromTitle(basic.title)
        results[index] = {
          id, ...labels,
          duration: secondsToDuration(basic.duration), durationSeconds: basic.duration,
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          members: override?.members ?? (inferred.length ? inferred : ['soobin']),
          kind: override?.kind ?? kindFromTitle(basic.title),
          publishedAt: validDate(micro?.publish_date) ?? cached.get(id)?.publishedAt ?? null,
          broadcastDate: override?.broadcastDate ?? broadcastDateFromTitle(basic.title),
          channel: basic.author ?? basic.channel?.name ?? '',
        }
        if (override) extraSuccesses++
      }
      successes++
    } catch (error) {
      failures++
      console.warn(`  ${id}: ${error.message}${cached.has(id) ? ' — keeping last verified metadata' : ' — skipping'}`)
      results[index] = cached.get(id)
    }
    if ((index + 1) % 25 === 0) console.log(`  ${index + 1}/${ids.length} checked`)
  }
}))
if (!successes || (!titlesOnly && overrides.size && !extraSuccesses) || failures > ids.length / 4) {
  throw new Error('Too many metadata lookups failed — previous catalog was NOT overwritten. Check connectivity/YouTube schema.')
}
const videos = []
for (const video of results.filter(Boolean)) {
  const duplicate = !titlesOnly && videos.find(v => sameBroadcast(v, video))
  if (duplicate) { console.warn(`  ${video.id}: duplicate broadcast of ${duplicate.id}, omitted`); continue }
  videos.push(video)
}
const data = { title, sourceUrl: titlesOnly ? previous.sourceUrl : `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`, fetchedAt: new Date().toISOString(), videos }
await writeFile(OUT_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8')
const links = renderCatalogLinks(data)
await mkdir(path.dirname(LINKS_PATH), { recursive: true })
await writeFile(LINKS_PATH, links, 'utf8')
console.log(`Wrote ${videos.length} videos and docs/video-catalog.md (${successes} fresh metadata lookups, ${failures} failures).`)
console.log(`${videos.filter(v => v.originalTitle).length} titles differ from the original; ${videos.filter(v => v.title !== cached.get(v.id)?.title).length} displayed titles changed.`)
