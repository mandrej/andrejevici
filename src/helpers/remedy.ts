import { db, storage } from '@/firebase'
import {
  doc,
  query,
  getDocs,
  deleteDoc,
  getDoc,
  writeBatch,
  deleteField,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import {
  ref as storageRef,
  listAll,
  getMetadata,
  getDownloadURL,
  uploadBytes,
} from 'firebase/storage'
import CONFIG from '@/config'
import { parseDate, reFilename, thumbName, thumbSuffix } from '@/helpers'
import { photoCollection } from '@/helpers/collections'

import notify from '@/helpers/notify'
import type { PhotoType } from '@/helpers/models'

const BATCH_LIMIT = 498

/**
 * Commits items in batches to stay within Firestore's 500-operation limit.
 */
const commitInBatches = async <T>(
  items: T[],
  applyFn: (batch: ReturnType<typeof writeBatch>, item: T) => void,
): Promise<void> => {
  let batch = writeBatch(db)
  let count = 0
  for (const item of items) {
    applyFn(batch, item)
    count++
    if (count >= BATCH_LIMIT) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }
  if (count > 0) await batch.commit()
}

/**
 * Fixes records in the database by converting string date fields to Firestore Timestamps
 * and removing the legacy 'filename' property.
 *
 * @return {Promise<void>} A promise that resolves when the records are fixed.
 */
export const fix = async () => {
  notify({
    message: 'Finding records with string date field...',
    timeout: 0,
    spinner: true,
    group: 'fix-date-timestamp',
  })

  try {
    const q = query(photoCollection)
    const querySnapshot = await getDocs(q)

    const toFix = querySnapshot.docs.filter((docSnap) => {
      const data = docSnap.data()
      return typeof data.date === 'string' || 'filename' in data
    })

    if (toFix.length === 0) {
      notify({
        type: 'positive',
        message: 'All records have date as Timestamp',
        icon: 'sym_r_check',
        group: 'fix-date-timestamp',
      })
      return
    }

    notify({
      message: `Found ${toFix.length} documents to update to Timestamp`,
      timeout: 0,
      spinner: true,
      group: 'fix-date-timestamp',
    })

    await commitInBatches(toFix, (batch, docSnap) => {
      const data = docSnap.data()
      const updateData: Record<string, unknown> = {}
      if (typeof data.date === 'string') {
        const d = parseDate(data.date)
        updateData.date = Timestamp.fromDate(d)
      }
      if ('filename' in data) {
        updateData.filename = deleteField()
      }
      batch.update(docSnap.ref, updateData)
    })

    notify({
      type: 'positive',
      message: `Updated date field to Timestamp in ${toFix.length} records.`,
      icon: 'sym_r_check',
      timeout: 5000,
      group: 'fix-date-timestamp',
    })
  } catch (error) {
    notify({
      type: 'negative',
      message: 'Failed to run fix: ' + (error instanceof Error ? error.message : String(error)),
      group: 'fix-date-timestamp',
    })
  }
}

/**
 * Gets the storage data for a file.
 *
 * @param {string} filename - The name of the file.
 * @return {Promise<PhotoType | null>} A promise that resolves to an object containing the storage data, or null if the file does not exist.
 */
const getStorageData = async (filename: string) => {
  try {
    const _ref = storageRef(storage, filename)
    // Parallelize the two independent storage calls
    const [downloadURL, metadata] = await Promise.all([getDownloadURL(_ref), getMetadata(_ref)])
    if (downloadURL) {
      const { useUserStore } = await import('@/stores/userStore')
      const auth = useUserStore.getState()
      return {
        id: filename,
        url: downloadURL,
        size: metadata.size || 0,
        email: auth.user?.email,
        nick: auth.user?.nick,
      }
    } else {
      throw new Error(`Failed to get download URL for file: ${filename}`)
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}

/**
 * Creates a 400×400 JPEG thumbnail blob from the given image URL using a
 * canvas element. The image is centre-cropped (cover fit) and exported as
 * a progressive-style JPEG at 85 % quality.
 */
const createThumbnailBlob = (imageUrl: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = CONFIG.thumbSize
      canvas.height = CONFIG.thumbSize
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas 2d context'))
        return
      }

      // Centre-crop (cover fit)
      const scale = Math.max(CONFIG.thumbSize / img.width, CONFIG.thumbSize / img.height)
      const sw = CONFIG.thumbSize / scale
      const sh = CONFIG.thumbSize / scale
      const sx = (img.width - sw) / 2
      const sy = (img.height - sh) / 2

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CONFIG.thumbSize, CONFIG.thumbSize)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob returned null'))
        },
        'image/jpeg',
        0.85,
      )
    }
    img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`))
    img.src = imageUrl
  })
}

/**
 * Finds photos with missing thumbnails, generates them client-side,
 * uploads to /thumbnails in Cloud Storage, and updates each Firestore
 * record's `thumb` field with the download URL.
 */
export const missingThumbnails = async () => {
  notify({
    group: 'thumbnails',
    message: 'Scanning for missing thumbnails…',
    spinner: true,
    timeout: 0,
  })

  try {
    const photoMap = new Map<string, string[]>()
    const thumbSet = new Set<string>()
    const allowedExts = ['.jpg', '.jpeg', '.png']

    // Parallelize the two independent listAll calls
    const [photoRefs, thumbRefs] = await Promise.all([
      listAll(storageRef(storage, '')),
      listAll(storageRef(storage, CONFIG.thumbnails)),
    ])

    for (const r of photoRefs.items) {
      const match = r.name.match(reFilename)
      if (!match) continue
      const [, name, ext] = match
      if (name && ext && allowedExts.includes(ext.toLowerCase())) {
        const list = photoMap.get(name)
        if (list) {
          list.push(r.name)
        } else {
          photoMap.set(name, [r.name])
        }
      }
    }

    for (const r of thumbRefs.items) {
      thumbSet.add(r.name.replace(thumbSuffix(), ''))
    }

    const missing = Array.from(photoMap.keys())
      .filter((x) => !thumbSet.has(x))
      .sort()

    if (missing.length === 0) {
      notify({
        group: 'thumbnails',
        type: 'positive',
        message: 'No missing thumbnails',
        icon: 'sym_r_check',
      })
      return
    }

    notify({
      group: 'thumbnails',
      message: `Found ${missing.length} missing. Generating…`,
      spinner: true,
      timeout: 0,
    })

    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (const name of missing) {
      const filenames = photoMap.get(name)
      if (!filenames) continue

      // Pick the first filename to fetch the Firestore record & source image
      const filename = filenames[0]

      try {
        // Skip videos – they use YouTube thumbnails
        const snap = await getDoc(doc(photoCollection, filename))
        if (snap.exists()) {
          const data = snap.data() as PhotoType
          if (data.kind === 'video') {
            skipped++
            continue
          }
        }

        // Download the original image URL
        const originalRef = storageRef(storage, filename)
        const originalUrl = await getDownloadURL(originalRef)

        // Generate thumbnail client-side
        const blob = await createThumbnailBlob(originalUrl)

        // Upload to thumbnails/<name>_400x400.jpeg
        const thumbPath = thumbName(filename)
        const thumbRef = storageRef(storage, thumbPath)
        await uploadBytes(thumbRef, blob, {
          contentType: 'image/jpeg',
          cacheControl: CONFIG.cache_control,
        })

        // Get the download URL for the newly uploaded thumbnail
        const thumbDownloadUrl = await getDownloadURL(thumbRef)

        // Update all Firestore records that share the same base name
        for (const fn of filenames) {
          const docSnap = await getDoc(doc(photoCollection, fn))
          if (docSnap.exists()) {
            await updateDoc(docSnap.ref, { thumb: thumbDownloadUrl })
          }
        }

        created++

        notify({
          group: 'thumbnails',
          message: `Progress: ${created}/${missing.length - skipped} created…`,
          spinner: true,
          timeout: 0,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`Thumbnail error for ${filename}:`, err)
        errors.push(`${filename}: ${msg}`)
      }
    }

    // Final report
    if (errors.length > 0) {
      notify({
        group: 'thumbnails',
        type: 'negative',
        message: `Created ${created} thumbnails. ${errors.length} failed:<br/>${errors.join('<br/>')}`,
        actions: [{ icon: 'sym_r_close' }],
        timeout: 0,
        html: true,
        multiLine: true,
      })
    } else {
      notify({
        group: 'thumbnails',
        type: 'positive',
        message: `Created ${created} thumbnails successfully`,
        icon: 'sym_r_check',
      })
    }
  } catch (error) {
    console.error('missingThumbnails failed:', error)
    notify({
      group: 'thumbnails',
      type: 'negative',
      message: 'Error: ' + (error instanceof Error ? error.message : String(error)),
      actions: [{ icon: 'sym_r_close' }],
      timeout: 0,
    })
  }
}

/**
 * Gets the mismatched files.
 *
 * @return {Promise<void>} A promise that resolves when the mismatched files are found.
 */
export const mismatch = async () => {
  const { useAppStore } = await import('@/stores/appStore')
  const uploaded = useAppStore.getState().uploaded

  notify({
    group: 'mismatch',
    message: `Please wait`,
    timeout: 0,
    spinner: true,
  })

  const [storageResult, firestoreResult] = await Promise.all([
    listAll(storageRef(storage, '')),
    getDocs(query(photoCollection)),
  ])

  const bucketNames = new Set(storageResult.items.map((r) => r.name))
  const firestoreDocs = firestoreResult.docs.map(
    (d) => ({ ...(d.data() as object), id: d.id }) as PhotoType,
  )
  const storageNames = new Set(firestoreDocs.filter((d) => d.kind === 'photo').map((d) => d.id))
  const uploadedIds = new Set(uploaded.map((it) => it.id))

  // Files in storage but not in firestore (orphaned files)
  const missingRecords = Array.from(bucketNames).filter(
    (name) => !storageNames.has(name) && !uploadedIds.has(name),
  )

  // Records in firestore but not in storage (broken links)
  const missingFiles = Array.from(storageNames).filter((name) => !bucketNames.has(name))

  if (missingFiles.length > 0) {
    await Promise.all(missingFiles.map((name) => deleteDoc(doc(photoCollection, name))))
    notify({
      group: 'mismatch',
      message: `${missingFiles.length} records deleted from firestore that doesn't have image reference`,
      type: 'negative',
    })
  }

  if (missingRecords.length > 0) {
    const results = await Promise.all(missingRecords.map((name) => getStorageData(name)))
    useAppStore.setState({ uploaded: [...uploaded, ...results] as PhotoType[] })

    notify({
      group: 'mismatch',
      type: 'negative',
      message: `${missingRecords.length} files uploaded to bucket, but doesn't have record in firestore.<br>
      Resolve mismatched files either by publish or delete.`,
      actions: [
        {
          label: 'Resolve',
          /**
           * Handles handler.
           */
          handler: () => {
            useAppStore.getState().setAddTab('photo')
            window.location.assign('/add')
          },
        },
      ],
      multiLine: true,
      html: true,
      timeout: 0,
    })
  }

  if (missingRecords.length === 0 && missingFiles.length === 0) {
    notify({
      group: 'mismatch',
      type: 'positive',
      message: `All good. Nothing to resolve`,
      icon: 'sym_r_check',
    })
  }
}
