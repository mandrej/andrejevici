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
 * HTTPS callable function that fetches YouTube video title and description
 * using the youtube-caption-extractor library.
 *
 * @param data - { videoID: string, lang?: string } — the 11-character YouTube video ID and optional language code
 * @returns { title: string, description: string }
 * @throws HttpsError('invalid-argument') when videoID is missing or empty
 * @throws HttpsError('internal') when the extractor fails
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

    try {
      const details = await getVideoDetails({ videoID, ...(lang ? { lang } : {}) })

      logger.log('getYouTubeDetails success', { videoID, title: details.title })

      return {
        title: details.title,
        description: details.description,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('getYouTubeDetails failed', { videoID, error: message })
      throw new HttpsError('internal', `Failed to fetch YouTube video details: ${message}`)
    }
  },
)
