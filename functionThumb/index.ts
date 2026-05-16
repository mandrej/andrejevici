import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getStorage, type Storage } from 'firebase-admin/storage'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import * as logger from 'firebase-functions/logger'
import * as path from 'path'
import sharp from 'sharp'

initializeApp()

// Cache singletons – avoids repeated SDK look-ups on every invocation
let _db: Firestore | undefined
let _storage: Storage | undefined
const db = () => (_db ??= getFirestore())
const storage = () => (_storage ??= getStorage())

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
  const lockRef = db().collection(LOCKS_COLLECTION).doc(lockId)

  try {
    await db().runTransaction(async (tx) => {
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
  await db().collection(LOCKS_COLLECTION).doc(lockId).delete()
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
    if (
      contentType &&
      !contentType.startsWith('image/') &&
      contentType !== 'application/octet-stream'
    ) {
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

    const bucket = storage().bucket(bucketName)

    try {
      // Stream-based pipeline: Storage read → sharp → Storage write
      // Eliminates two temp-file disk round-trips for maximum speed
      const sourceStream = bucket.file(filePath).createReadStream()

      const transformer = sharp({ failOn: 'none' })
        .resize(THUMB_SIZE, THUMB_SIZE, {
          fit: 'cover',
          position: 'centre',
        })
        .jpeg({ quality: 85, progressive: true })

      const destFile = bucket.file(thumbFilePath)
      const destStream = destFile.createWriteStream({
        resumable: false, // small file — skip resumable overhead
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

      await new Promise<void>((resolve, reject) => {
        sourceStream.on('error', reject)
        transformer.on('error', reject)
        destStream.on('error', reject)
        destStream.on('finish', resolve)

        sourceStream.pipe(transformer).pipe(destStream)
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
    }
  },
)
