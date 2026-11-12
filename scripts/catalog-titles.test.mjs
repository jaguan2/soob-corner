import { describe, expect, it, vi } from 'vitest'
import { catalogTitle, englishVideoInfo } from './catalog-titles.mjs'

describe('English-preferred catalog titles', () => {
  it('prefers the English-session watch title and preserves the original', () => {
    expect(catalogTitle({ basic_info: { title: '수빈의 브이로그' }, primary_info: { title: { text: "Soobin's vlog" } } }))
      .toEqual({ title: "Soobin's vlog", originalTitle: '수빈의 브이로그' })
  })
  it('keeps the original when YouTube supplies no different localized title', () => {
    expect(catalogTitle({ basic_info: { title: '수빈의 브이로그' } })).toEqual({ title: '수빈의 브이로그' })
    expect(catalogTitle({ basic_info: { title: '수빈의 브이로그' }, primary_info: { title: { text: '  ' } } })).toEqual({ title: '수빈의 브이로그' })
    expect(catalogTitle({ basic_info: { title: 'Study time' }, primary_info: { title: { text: 'Study time' } } })).toEqual({ title: 'Study time' })
    expect(() => catalogTitle({ basic_info: {} })).toThrow('No video title')
  })
  it('uses ordinary metadata if the localized watch-page lookup fails', async () => {
    const original = { basic_info: { title: '수빈의 브이로그' } }
    const yt = { getInfo: vi.fn().mockRejectedValue(new Error('next unavailable')), getBasicInfo: vi.fn().mockResolvedValue(original) }
    expect(await englishVideoInfo(yt, 'video')).toBe(original)
    expect(yt.getBasicInfo).toHaveBeenCalledWith('video')
    yt.getInfo.mockResolvedValue(original)
    yt.getBasicInfo.mockClear()
    expect(await englishVideoInfo(yt, 'video')).toBe(original)
    expect(yt.getBasicInfo).not.toHaveBeenCalled()
  })
})
