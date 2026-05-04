import { db, storage } from '../firebase'
import type { DocumentSnapshot } from 'firebase/firestore'
import { doc, query, getDocs, deleteDoc, getDoc, writeBatch, where, setDoc } from 'firebase/firestore'
import { ref as storageRef, listAll, getMetadata, getDownloadURL } from 'firebase/storage'
import CONFIG from '../config'
import { reFilename, counterId, getYouTubeId } from '.'
import router from '../router'
import { counterCollection, photoCollection, renameCollection } from './collections'

import notify from './notify'
import type { PhotoType, ValuesState } from './models'

import readExif from './exif'

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
 * Fixes photos in the database by populating missing dimensions.
 *
 * @return {Promise<void>} A promise that resolves when the photos are fixed.
 */
export const fix = async () => {
  notify({
    message: 'Finding records missing dimensions...',
    timeout: 0,
    spinner: true,
    group: 'fix-dim',
  })

  try {
    const q = query(photoCollection)
    const querySnapshot = await getDocs(q)

    const toFix = querySnapshot.docs.filter((doc) => {
      const data = doc.data() as PhotoType
      // Only fix photos that are missing dimensions
      return data.kind === 'photo' && (!data.dim || (data.dim as number[]).length === 0)
    })

    if (toFix.length === 0) {
      notify({
        type: 'positive',
        message: 'No records missing dimensions',
        icon: 'sym_r_check',
        group: 'fix-dim',
      })
      return
    }

    notify({
      message: `Found ${toFix.length} records to fix. Processing...`,
      timeout: 0,
      spinner: true,
      group: 'fix-dim',
    })

    let fixedCount = 0
    let errorCount = 0

    // Collect items that need updating, then batch-commit
    const updates: Array<{ ref: typeof toFix[0]['ref']; dim: [number, number] }> = []

    for (const docSnap of toFix) {
      const filename = docSnap.id
      try {
        const _ref = storageRef(storage, filename)
        const url = await getDownloadURL(_ref)
        const exif = await readExif(url)

        if (exif && exif.dim) {
          updates.push({ ref: docSnap.ref, dim: exif.dim })
          fixedCount++
        } else {
          console.warn(`Could not find dimensions for ${filename}`)
          errorCount++
        }
      } catch (e) {
        console.error(`Failed to process ${filename}:`, e)
        errorCount++
      }
    }

    await commitInBatches(updates, (batch, { ref, dim }) => {
      batch.update(ref, { dim })
    })

    notify({
      type: fixedCount > 0 ? 'positive' : 'warning',
      message: `Fixed ${fixedCount} records. ${errorCount > 0 ? `Errors: ${errorCount}` : ''}`,
      icon: fixedCount > 0 ? 'sym_r_check' : 'sym_r_warning',
      timeout: 5000,
      group: 'fix-dim',
    })
  } catch (error) {
    notify({
      type: 'negative',
      message: 'Failed to run fix: ' + (error instanceof Error ? error.message : String(error)),
      group: 'fix-dim',
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
      const { useUserStore } = await import('../stores/user')
      const auth = useUserStore()
      return {
        url: downloadURL,
        filename: filename,
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
 * Gets the missing thumbnails.
 *
 * @return {Promise<void>} A promise that resolves when the missing thumbnails are found.
 */
export const missingThumbnails = async () => {
  notify({
    group: 'thumbnails',
    message: `Please wait`,
    spinner: true,
    timeout: 0,
  })

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
    thumbSet.add(r.name.replace(CONFIG.thumbSuffix, ''))
  }

  const missing = Array.from(photoMap.keys())
    .filter((x) => !thumbSet.has(x))
    .sort()

  const promises: Array<Promise<DocumentSnapshot>> = []
  for (const name of missing) {
    const filenames = photoMap.get(name)
    if (filenames) {
      for (const filename of filenames) {
        promises.push(getDoc(doc(photoCollection, filename)))
      }
    }
  }

  let hit = 0
  const results = await Promise.allSettled(promises)
  let message: string = ''
  for (const it of results) {
    if (it.status === 'fulfilled') {
      if (it.value.exists()) {
        const data = it.value.data() as PhotoType
        if (data.kind === 'video') continue // Skip videos
        const filename = it.value.id.replace(/\.[^.]+$/, '')
        message += `${data?.date} ${filename}<br/>`
        hit++
      }
    } else {
      notify({
        group: 'thumbnails',
        type: 'negative',
        message: `Rejected ${it.reason}.`,
        actions: [{ icon: 'sym_r_close' }],
        timeout: 0,
      })
    }
  }

  if (hit > 0) {
    notify({
      group: 'thumbnails',
      message: message,
      timeout: 0,
      actions: [{ icon: 'sym_r_close' }],
      html: true,
      multiLine: true,
    })
  } else {
    notify({
      group: 'thumbnails',
      type: 'positive',
      message: 'No missing thumbnails',
      icon: 'sym_r_check',
    })
  }
}

/**
 * Gets the mismatched files.
 *
 * @return {Promise<void>} A promise that resolves when the mismatched files are found.
 */
export const mismatch = async () => {
  const { storeToRefs } = await import('pinia')
  const { useAppStore } = await import('../stores/app')
  const app = useAppStore()
  const { uploaded } = storeToRefs(app)

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
  const firestoreDocs = firestoreResult.docs.map((d) => d.data() as PhotoType)
  const storageNames = new Set(firestoreDocs.filter(d => d.kind === 'photo').map((d) => d.filename))
  const uploadedFilenames = new Set(uploaded.value.map((it) => it.filename))

  // Files in storage but not in firestore (orphaned files)
  const missingRecords = Array.from(bucketNames).filter(
    (name) => !storageNames.has(name) && !uploadedFilenames.has(name),
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
    for (const it of results) {
      uploaded.value.push(it as PhotoType)
    }

    notify({
      group: 'mismatch',
      type: 'negative',
      message: `${missingRecords.length} files uploaded to bucket, but doesn't have record in firestore.<br>
      Resolve mismatched files either by publish or delete.`,
      actions: [
        {
          label: 'Resolve',
          handler: () => {
            void router.push({ path: '/add' })
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



/**
 * Deletes a value from all photo documents, its counter, and the local store.
 *
 * @param {keyof ValuesState['values']} field - The field to delete the value from.
 * @param {string} value - The value to delete.
 * @return {Promise<void>} A promise that resolves when the value is fully removed.
 */
export const deleteValue = async (field: keyof ValuesState['values'], value: string): Promise<void> => {
  const filter =
    field === 'tags' ? where(field, 'array-contains', value) : where(field, '==', value)
  const querySnapshot = await getDocs(query(photoCollection, filter))

  // Build the list of photo updates
  const updates: Array<{ id: string; data: Record<string, unknown> }> = []
  querySnapshot.forEach((d) => {
    const obj = d.data()
    if (field === 'tags' && Array.isArray(obj.tags)) {
      updates.push({ id: d.id, data: { tags: obj.tags.filter((t: string) => t !== value) } })
    } else if (field !== 'tags') {
      updates.push({ id: d.id, data: { [field]: '' } })
    }
  })

  await commitInBatches(updates, (batch, { id, data }) => {
    batch.update(doc(photoCollection, id), data)
  })
}

/**
 * Adds a value in the database.
 *
 * @param {keyof ValuesState['values']} field - The field to add the value for.
 * @param {string} value - The value to add.
 * @return {Promise<void>} A promise that resolves when the value is added.
 */
export const addValue = async (
  field: keyof ValuesState['values'],
  value: string,
): Promise<void> => {
  const { useValuesStore } = await import('../stores/values')
  const meta = useValuesStore()

  const id = counterId(field, value)
  const counterRef = doc(counterCollection, id)
  await setDoc(counterRef, { count: 0, field, value })
  
  if (!meta.values[field]) {
    meta.values[field] = {}
  }
  meta.values[field][value] = 0
}

/**
 * Renames a value in the database.
 *
 * @param {keyof ValuesState['values']} field - The field to be renamed.
 * @param {string} oldValue - The old value to be renamed.
 * @param {string} newValue - The new value to be renamed.
 * @return {Promise<void>} A promise that resolves when the value is renamed.
 */
export const renameValue = async (
  field: keyof ValuesState['values'],
  oldValue: string,
  newValue: string,
): Promise<void> => {
  // Parallelize reads
  const filter =
    field === 'tags' ? where(field, 'array-contains-any', [oldValue]) : where(field, '==', oldValue)
  const querySnapshot = await getDocs(query(photoCollection, filter))

  // Build the list of operations to commit
  type BatchOp = { type: 'set'; id: string; data: Record<string, unknown>; merge?: boolean }
    | { type: 'update'; id: string; data: Record<string, unknown> }

  const ops: BatchOp[] = []

  // Record rename for exif resolution
  if (field === 'lens' || field === 'model') {
    ops.push({
      type: 'set',
      id: oldValue,
      data: { newValue, field },
      merge: true,
    })
  }

  // Photo collection updates
  querySnapshot.forEach((d) => {
    if (field === 'tags') {
      const obj = d.data()
      if (Array.isArray(obj.tags)) {
        const idx = obj.tags.indexOf(oldValue)
        if (idx > -1) {
          const updatedTags = [...obj.tags]
          // If the new tag already exists, just remove the old one. Otherwise, replace it.
          if (updatedTags.includes(newValue)) {
            updatedTags.splice(idx, 1)
          } else {
            updatedTags.splice(idx, 1, newValue)
          }
          ops.push({ type: 'update', id: d.id, data: { [field]: updatedTags } })
        }
      }
    } else {
      ops.push({ type: 'update', id: d.id, data: { [field]: newValue } })
    }
  })

  await commitInBatches(ops, (batch, op) => {
    if (op.type === 'set') {
      batch.set(doc(renameCollection, op.id), op.data, { merge: op.merge ?? false })
    } else {
      batch.update(doc(photoCollection, op.id), op.data)
    }
  })
}

/**
 * Finds all videos missing the 'thumb' property and populates it using the YouTube ID.
 */
export const fixVideoThumbnails = async (): Promise<void> => {
  notify({
    message: 'Finding videos missing thumbnails...',
    timeout: 0,
    spinner: true,
    group: 'fix-video-thumb',
  })

  try {
    const q = query(photoCollection, where('kind', '==', 'video'))
    const querySnapshot = await getDocs(q)

    const toFix = querySnapshot.docs.filter((doc) => {
      const data = doc.data() as PhotoType
      return !data.thumb
    })

    if (toFix.length === 0) {
      notify({
        type: 'positive',
        message: 'No videos missing thumbnails',
        icon: 'sym_r_check',
        group: 'fix-video-thumb',
      })
      return
    }

    notify({
      message: `Found ${toFix.length} videos to fix. Processing...`,
      timeout: 0,
      spinner: true,
      group: 'fix-video-thumb',
    })

    const batch = writeBatch(db)
    toFix.forEach((doc) => {
      const data = doc.data() as PhotoType
      const id = getYouTubeId(data.url)
      if (id) {
        batch.update(doc.ref, {
          thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        })
      }
    })

    await batch.commit()

    notify({
      type: 'positive',
      message: `Successfully fixed ${toFix.length} video thumbnails`,
      icon: 'sym_r_check',
      group: 'fix-video-thumb',
    })
  } catch (error) {
    console.error('Failed to fix video thumbnails:', error)
    notify({
      type: 'negative',
      message: 'Error fixing video thumbnails',
      group: 'fix-video-thumb',
    })
  }
}
