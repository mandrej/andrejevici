import { db, storage } from 'src/boot/firebase'
import type { DocumentReference, DocumentSnapshot } from 'firebase/firestore'
import {
  doc,
  query,
  getDocs,
  deleteDoc,
  getDoc,
  writeBatch,
  where,
  orderBy,
  setDoc,
} from 'firebase/firestore'
import { ref as storageRef, listAll, getMetadata, getDownloadURL } from 'firebase/storage'
import { CONFIG, thumbSuffix } from './index'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import { useUserStore } from 'src/stores/user'
import { reFilename, counterId } from 'src/helpers'
import router from 'src/router'
import { counterCollection, photoCollection, userCollection } from 'src/helpers/collections'

import notify from './notify'
import type { PhotoType, ValuesState } from './models'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { uploaded } = storeToRefs(app)
const { user } = storeToRefs(auth)

/**
 * Fixes the users in the database.
 *
 * @return {Promise<void>} A promise that resolves when the users are fixed.
 */
export const fix = async () => {
  const setBatch = writeBatch(db)
  const q = query(userCollection)
  const usersSnap = await getDocs(q)
  usersSnap.forEach((it) => {
    const user = it.data()
    const docRef = doc(userCollection, user.uid)
    setBatch.set(docRef, user, { merge: true })
  })

  await setBatch.commit()
  notify({
    message: `All users fixed`,
  })
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
    const downloadURL = await getDownloadURL(_ref)
    const metadata = await getMetadata(_ref)
    if (downloadURL) {
      return {
        url: downloadURL,
        filename: filename,
        size: metadata.size || 0,
        email: user.value?.email,
        nick: user.value?.nick,
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
    message: `Please wait`,
  })

  const photoMap = new Map<string, string[]>()
  const thumbSet = new Set<string>()
  const allowedExts = ['.jpg', '.jpeg', '.png']

  const photoRefs = await listAll(storageRef(storage, ''))
  photoRefs.items.forEach((r) => {
    const match = r.name.match(reFilename)
    if (!match) return
    const [, name, ext] = match
    if (name && ext && allowedExts.includes(ext.toLowerCase())) {
      const list = photoMap.get(name) || []
      list.push(r.name)
      photoMap.set(name, list)
    }
  })

  const thumbRefs = await listAll(storageRef(storage, CONFIG.thumbnails))
  thumbRefs.items.forEach((r) => thumbSet.add(r.name.replace(thumbSuffix, '')))

  const missing = Array.from(photoMap.keys())
    .filter((x) => !thumbSet.has(x))
    .sort()

  const promises: Array<Promise<DocumentSnapshot>> = []
  missing.forEach((name) => {
    const filenames = photoMap.get(name)
    filenames?.forEach((filename) => {
      const docRef = doc(photoCollection, filename)
      promises.push(getDoc(docRef))
    })
  })

  let hit = 0
  const results = await Promise.allSettled(promises)
  let message: string = ''
  results.forEach((it) => {
    if (it.status === 'fulfilled') {
      if (it.value.exists()) {
        const data = it.value.data()
        const filename = it.value.id.replace(/\.[^.]+$/, '')
        message += `${data?.date} ${filename}<br/>`
        hit++
      }
    } else {
      notify({
        type: 'negative',
        message: `Rejected ${it.reason}.`,
        actions: [{ icon: 'close' }],
        timeout: 0,
      })
    }
  })

  if (hit > 0) {
    notify({
      message: message,
      timeout: 0,
      actions: [{ icon: 'close' }],
      html: true,
      multiLine: true,
    })
  } else {
    notify({
      message: 'No missing thumbnails',
    })
  }
}

/**
 * Gets the mismatched files.
 *
 * @return {Promise<void>} A promise that resolves when the mismatched files are found.
 */
export const mismatch = async () => {
  notify({
    message: `Please wait`,
    timeout: 0,
    actions: [{ icon: 'close' }],
    group: 'mismatch',
  })

  const [storageResult, firestoreResult] = await Promise.all([
    listAll(storageRef(storage, '')),
    getDocs(query(photoCollection)),
  ])

  const bucketNames = new Set(storageResult.items.map((r) => r.name))
  const storageNames = new Set(firestoreResult.docs.map((d) => d.id))
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
      message: `${missingFiles.length} records deleted from firestore that doesn't have image reference`,
      type: 'negative',
      group: 'mismatch',
    })
  }

  if (missingRecords.length > 0) {
    const promises = missingRecords.map((name) => getStorageData(name))
    const results = await Promise.all(promises)
    results.forEach((it) => {
      uploaded.value.push(it as PhotoType)
    })

    notify({
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
      group: missingFiles.length > 0 ? 'mismatch-add' : 'mismatch',
    })
  }

  if (missingRecords.length === 0 && missingFiles.length === 0) {
    notify({ message: `All good. Nothing to resolve`, group: 'mismatch' })
  }
}

/**
 * Removes unused tags from the database.
 *
 * @return {Promise<void>} A promise that resolves when the unused tags are removed.
 */
export const removeUnusedTags = async (): Promise<void> => {
  // delete from store
  let id, counterRef: DocumentReference
  for (const [value, count] of Object.entries(meta.values.tags)) {
    if (typeof count === 'number' && count <= 0) {
      try {
        id = counterId('tags', value)
        counterRef = doc(counterCollection, id)
        deleteDoc(counterRef)
      } finally {
        delete meta.values.tags[value]
      }
    }
  }
  // delete from database
  const q = query(counterCollection, where('field', '==', 'tags'))
  const querySnapshot = await getDocs(q)

  // Use for...of loop instead of forEach to properly handle async operations
  for (const d of querySnapshot.docs) {
    const obj = d.data()
    if (obj.count <= 0) {
      try {
        const id = counterId('tags', obj.value)
        const counterRef = doc(counterCollection, id)
        deleteDoc(counterRef)
      } finally {
        delete meta.values.tags[obj.value]
      }
    }
  }
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
  // Prepare batch for photo updates
  const batch = writeBatch(db)
  const filter =
    field === 'tags' ? where(field, 'array-contains-any', [oldValue]) : where(field, '==', oldValue)
  const q = query(photoCollection, filter, orderBy('date', 'desc'))
  const querySnapshot = await getDocs(q)

  querySnapshot.forEach((d) => {
    const photoRef = doc(photoCollection, d.id)
    if (field === 'tags') {
      const obj = d.data()
      const idx = obj.tags.indexOf(oldValue)
      obj.tags.splice(idx, 1, newValue)
      batch.update(photoRef, { [field]: obj.tags })
    } else {
      batch.update(photoRef, { [field]: newValue })
    }
  })

  // Commit batch for photos
  await batch.commit()

  // Update counters
  const oldRef = doc(counterCollection, counterId(field, oldValue))
  const newRef = doc(counterCollection, counterId(field, newValue))
  const counter = await getDoc(oldRef)
  const obj = counter.data()

  if (obj) {
    await setDoc(
      newRef,
      {
        count: obj.count,
        field: field,
        value: newValue,
      },
      { merge: true },
    )
    deleteDoc(oldRef)

    // Update store
    meta.values[field][newValue] = obj.count
    delete meta.values[field][oldValue]
  }
}
