import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import * as logger from 'firebase-functions/logger'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import sharp from 'sharp'

initializeApp()

const THUMB_SIZE = 400
const THUMB_PREFIX = 'thumbnails/'
const THUMB_SUFFIX = `_${THUMB_SIZE}x${THUMB_SIZE}.jpeg`
const THUMB_CACHE_CONTROL = 'public, max-age=604800'
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif']
const LOCKS_COLLECTION = 'thumbnailLocks'

/**
 * Acquires a Firestore distributed lock for the given file path.
 * Returns true if the lock was successfully claimed, false if another
 * instance already holds it (duplicate trigger — safe to skip).
 *
 * The lock document is keyed by a sanitised version of the file path so
 * concurrent Cloud Function instances processing the same upload will race
 * on the Firestore transaction and only one will proceed.
 */
const acquireLock = async (filePath: string): Promise<boolean> => {
  const lockId = filePath.replace(/\//g, '_').replace(/\./g, '-')
  const lockRef = getFirestore().collection(LOCKS_COLLECTION).doc(lockId)

  try {
    await getFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(lockRef)
      if (snap.exists) {
        // Another instance is already processing this file
        throw new Error('LOCK_EXISTS')
      }
      tx.set(lockRef, {
        filePath,
        startedAt: FieldValue.serverTimestamp(),
      })
    })
    return true
  } catch (err) {
    if (err instanceof Error && err.message === 'LOCK_EXISTS') {
      return false
    }
    throw err
  }
}

/** Releases the lock so the file can be retried if processing failed. */
const releaseLock = async (filePath: string): Promise<void> => {
  const lockId = filePath.replace(/\//g, '_').replace(/\./g, '-')
  await getFirestore().collection(LOCKS_COLLECTION).doc(lockId).delete()
}

export const generateThumbnail = onObjectFinalized(
  {
    region: 'us-central1',
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (event) => {
    const filePath: string = event.data.name ?? ''
    const contentType: string = event.data.contentType ?? ''
    const bucketName: string = event.data.bucket

    // Skip if not an image, unless contentType is vaguely defined or empty. We also check the extension below safely.
    if (contentType && !contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
      logger.info(`Skipping non-image file based on content type: ${filePath} (${contentType})`)
      return
    }

    const ext = path.extname(filePath).toLowerCase()

    // Skip unsupported extensions
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      logger.info(`Skipping unsupported extension: ${ext}`)
      return
    }

    // Skip files already inside the thumbnails folder to avoid infinite loops
    if (filePath.startsWith(THUMB_PREFIX)) {
      logger.info(`Skipping already-thumbnail file: ${filePath}`)
      return
    }

    // Acquire distributed lock — guards against duplicate trigger executions
    // that can occur when multiple images are uploaded simultaneously
    const locked = await acquireLock(filePath)
    if (!locked) {
      logger.info(`Skipping duplicate trigger for: ${filePath} — already being processed`)
      return
    }

    const fileName = path.basename(filePath, ext)
    const dir = path.dirname(filePath)

    // Build the destination path: thumbnails/<original-dir>/<filename>_400x400.jpeg
    const thumbSubDir = dir === '.' ? THUMB_PREFIX : `${THUMB_PREFIX}${dir}/`
    const thumbFileName = `${fileName}${THUMB_SUFFIX}`
    const thumbFilePath = `${thumbSubDir}${thumbFileName}`

    logger.info(`Generating thumbnail for ${filePath} -> ${thumbFilePath}`)

    const bucket = getStorage().bucket(bucketName)
    const tmpInput = path.join(os.tmpdir(), `orig_${Date.now()}_${fileName}${ext}`)
    const tmpOutput = path.join(os.tmpdir(), `thumb_${Date.now()}_${fileName}${THUMB_SUFFIX}`)

    try {
      // Download original file to /tmp
      await bucket.file(filePath).download({ destination: tmpInput })
      logger.info(`Downloaded original file to ${tmpInput}`)

      // Generate 400x400 JPEG thumbnail with sharp
      await sharp(tmpInput)
        .resize(THUMB_SIZE, THUMB_SIZE, {
          fit: 'cover',
          position: 'centre',
        })
        .jpeg({ quality: 85, progressive: true })
        .toFile(tmpOutput)

      logger.info(`Thumbnail created at ${tmpOutput}`)

      // Upload thumbnail to Storage
      await bucket.upload(tmpOutput, {
        destination: thumbFilePath,
        public: true,
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: THUMB_CACHE_CONTROL,
          metadata: {
            originalFile: filePath,
            generatedBy: 'generateThumbnail',
          },
        },
      })

      logger.info(`Thumbnail uploaded to ${thumbFilePath}`)
    } catch (error) {
      logger.error(`Error generating thumbnail for ${filePath}:`, error)
      throw error
    } finally {
      // Release the lock so failed files can be retried
      await releaseLock(filePath).catch((e) =>
        logger.warn(`Failed to release lock for ${filePath}:`, e),
      )
      // Clean up temp files
      for (const tmpFile of [tmpInput, tmpOutput]) {
        try {
          if (fs.existsSync(tmpFile)) {
            fs.unlinkSync(tmpFile)
          }
        } catch (cleanupError) {
          logger.warn(`Failed to clean up temp file ${tmpFile}:`, cleanupError)
        }
      }
    }
  },
)
