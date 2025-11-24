import { db, storage } from 'src/lib/firebase'
import type { DocumentSnapshot } from 'firebase/firestore'
import { doc, collection, query, getDocs, deleteDoc, getDoc, writeBatch } from 'firebase/firestore'
import { ref as storageRef, listAll, getMetadata, getDownloadURL } from 'firebase/storage'
import { CONFIG } from './index'
import { storeToRefs } from 'pinia'
import { useAppStore } from 'src/stores/app'
import { useValuesStore } from 'src/stores/values'
import { useUserStore } from 'src/stores/user'
import { reFilename } from 'src/helpers'
import router from 'src/router'

import notify from './notify'
import type { PhotoType, ValuesState } from './models'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { uploaded } = storeToRefs(app)
const { user } = storeToRefs(auth)
const photosCol = collection(db, 'Photo')
const usersCol = collection(db, 'User')

/**
 * Fixes the users in the database.
 *
 * @return {Promise<void>} A promise that resolves when the users are fixed.
 */
export const fix = async () => {
  const setBatch = writeBatch(db)
  const q = query(usersCol)
  const usersSnap = await getDocs(q)
  usersSnap.forEach((it) => {
    const user = it.data()
    const docRef = doc(usersCol, user.uid)
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

  const photoNames: string[] = []
  const thumbNames: string[] = []

  const photoRefs = await listAll(storageRef(storage, ''))
  photoRefs.items.forEach((r) => {
    const match = r.name.match(reFilename)
    if (!match) return ''
    const [, name] = match
    if (name) photoNames.push(name)
  })

  const thumbRefs = await listAll(storageRef(storage, CONFIG.thumbnails))
  thumbRefs.items.forEach((r) => thumbNames.push(r.name.replace('_400x400.jpeg', '')))

  photoNames.sort()
  thumbNames.sort()

  const thumbSet = new Set(thumbNames)
  const missing = photoNames.filter((x) => !thumbSet.has(x))

  const promises: Array<Promise<DocumentSnapshot>> = []
  missing.forEach((name) => {
    let docRef
    ;['jpg', 'jpeg', 'JPG'].forEach((ext) => {
      docRef = doc(db, 'Photo', `${name}.${ext}`)
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
        message += `${data.date} ${filename}<br/>`
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

  const bucketNames: string[] = []
  const storageNames: string[] = []
  const uploadedFilenames = uploaded.value.length ? uploaded.value.map((it) => it.filename) : []
  const refs = await listAll(storageRef(storage, ''))

  refs.items.forEach((r) => bucketNames.push(r.name))

  const q = query(photosCol)
  const snapshot = await getDocs(q)
  snapshot.forEach((doc) => storageNames.push(doc.id))

  bucketNames.sort()
  storageNames.sort()

  const storageSet = new Set(storageNames)
  const bucketSet = new Set(bucketNames)
  const missing =
    bucketNames.length >= storageNames.length
      ? bucketNames.filter((x) => !storageSet.has(x))
      : storageNames.filter((x) => !bucketSet.has(x))

  if (bucketNames.length >= storageNames.length) {
    const promises = missing
      .filter((name) => !uploadedFilenames.includes(name))
      .map((name) => getStorageData(name))

    if (promises.length > 0) {
      const results = await Promise.all(promises)
      results.forEach((it) => uploaded.value.push(it as PhotoType))

      notify({
        type: 'negative',
        message: `${promises.length} files uploaded to bucket, but doesn't have record in firestore.<br>
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
        group: 'mismatch',
      })
    } else {
      notify({ message: `All good. Nothing to resolve`, group: 'mismatch' })
    }
  } else {
    await Promise.all(missing.map((name) => deleteDoc(doc(db, 'Photo', name))))
    notify({
      message: `${missing.length} records deleted from firestore that doesn't have image reference`,
      type: 'negative',
      group: 'mismatch',
    })
  }
}

/**
 * Renames a value in the database.
 *
 * @param {keyof ValuesState['values']} field - The field to rename.
 * @param {string} existing - The existing value.
 * @param {string} changed - The new value.
 * @return {Promise<void>} A promise that resolves when the value is renamed.
 */
export const rename = async (
  field: keyof ValuesState['values'],
  existing: string,
  changed: string,
) => {
  if (existing !== '' && changed !== '') {
    if (
      (field === 'tags' && existing === 'flash') ||
      (field === 'model' && existing === 'UNKNOWN')
    ) {
      notify({
        type: 'warning',
        message: `Cannot change "${existing}"`,
      })
    } else if (Object.keys(meta.values[field]).indexOf(changed) !== -1) {
      notify({
        type: 'warning',
        message: `"${changed}" already exists"`,
      })
    } else {
      await meta.renameValue(field, existing, changed)
      notify({
        message: `${existing} successfully renamed to ${changed}`,
      })
    }
  }
}
