import { initializeApp } from 'firebase-admin/app'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getVideoDetails } from 'youtube-caption-extractor'

initializeApp()

export interface GetYouTubeDetailsData {
  videoID: string
  lang?: string
}

export interface GetYouTubeDetailsResult {
  title: string
  description: string
}

/**
 * Fetches video details via YouTube's official oEmbed API.
 */
async function fetchFromOEmbed(videoID: string): Promise<GetYouTubeDetailsResult | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoID)}&format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as { title?: string; author_name?: string }
    if (data && typeof data.title === 'string' && data.title.trim()) {
      return {
        title: data.title.trim(),
        description: data.author_name ? `By ${data.author_name}` : '',
      }
    }
  } catch {
    // Ignore error and fall through
  }
  return null
}

/**
 * Fetches video details by scraping YouTube watch page HTML metadata.
 */
async function fetchFromPageScrape(videoID: string): Promise<GetYouTubeDetailsResult | null> {
  try {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoID)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!res.ok) return null
    const html = await res.text()
    const titleMatch =
      html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i) ||
      html.match(/<meta\s+name="title"\s+content="([^"]*)"/i) ||
      html.match(/<title>([^<]*)<\/title>/i)
    const descMatch =
      html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i) ||
      html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)

    const rawTitle = titleMatch ? titleMatch[1].replace(/ - YouTube$/, '').trim() : ''
    const rawDesc = descMatch ? descMatch[1].trim() : ''

    if (rawTitle) {
      return {
        title: rawTitle,
        description: rawDesc,
      }
    }
  } catch {
    // Ignore error and fall through
  }
  return null
}

/**
 * HTTPS callable function that fetches YouTube video title and description
 * using youtube-caption-extractor with automatic URL fixing and multi-provider fallbacks.
 *
 * @param data - { videoID: string, lang?: string } — the 11-character YouTube video ID and optional language code
 * @returns { title: string, description: string }
 * @throws HttpsError('invalid-argument') when videoID is missing or empty
 * @throws HttpsError('internal') when all providers fail
 */
export const getYouTubeDetails = onCall(
  { region: 'us-central1' },
  async (request): Promise<GetYouTubeDetailsResult> => {
    const data = request.data as GetYouTubeDetailsData

    if (!data?.videoID || typeof data.videoID !== 'string' || data.videoID.trim() === '') {
      throw new HttpsError('invalid-argument', 'videoID is required and must be a non-empty string')
    }

    const videoID = data.videoID.trim()
    const lang = typeof data.lang === 'string' && data.lang.trim() ? data.lang.trim() : undefined

    logger.log('getYouTubeDetails called', { videoID, lang })

    // Custom fetch interceptor fixing youtube-caption-extractor's invalid hostname (youtubei.googleapis.com -> www.youtube.com)
    const fixedFetch: typeof fetch = (url, init) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      const fixedUrl = urlStr.replace('youtubei.googleapis.com', 'www.youtube.com')
      return fetch(fixedUrl, init)
    }

    // Try primary extractor (youtube-caption-extractor)
    try {
      const details = await getVideoDetails({
        videoID,
        ...(lang ? { lang } : {}),
        fetch: fixedFetch,
      })

      if (details?.title && details.title !== 'No title found') {
        logger.log('getYouTubeDetails success via youtube-caption-extractor', {
          videoID,
          title: details.title,
        })
        return {
          title: details.title,
          description: details.description || '',
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.warn('youtube-caption-extractor failed, attempting fallbacks', { videoID, error: message })
    }

    // Fallback 1: YouTube oEmbed API
    const oembedResult = await fetchFromOEmbed(videoID)
    if (oembedResult) {
      logger.log('getYouTubeDetails success via oEmbed fallback', { videoID, title: oembedResult.title })
      return oembedResult
    }

    // Fallback 2: HTML Page Scrape
    const scrapeResult = await fetchFromPageScrape(videoID)
    if (scrapeResult) {
      logger.log('getYouTubeDetails success via page scrape fallback', { videoID, title: scrapeResult.title })
      return scrapeResult
    }

    logger.error('getYouTubeDetails failed: all providers failed', { videoID })
    throw new HttpsError('internal', `Failed to fetch YouTube video details for '${videoID}' across all providers.`)
  },
)

