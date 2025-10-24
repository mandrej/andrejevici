import { db, storage } from '../lib/firebase'
import type { DocumentSnapshot } from 'firebase/firestore'
import { doc, collection, query, getDocs, deleteDoc, getDoc, writeBatch } from 'firebase/firestore'
import { ref as storageRef, listAll, getMetadata, getDownloadURL } from 'firebase/storage'
import { CONFIG } from './index'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import { nickInsteadEmail, reFilename } from '../helpers'
import router from '../router'

import notify from './notify'
import type { PhotoType, ValuesState, SubscriberType } from './models'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { uploaded } = storeToRefs(app)
const { user } = storeToRefs(auth)
const photosCol = collection(db, 'Photo')
const usersCol = collection(db, 'User')
const subscribersCol = collection(db, 'Subscriber')

export const fix = async () => {
  const setBatch = writeBatch(db)
  const subscribers = [] as Array<SubscriberType>
  let q = query(usersCol)
  const usersSnap = await getDocs(q)

  q = query(subscribersCol)
  const subscribersSnap = await getDocs(q)
  subscribersSnap.forEach((doc) => {
    subscribers.push(doc.data() as SubscriberType)
  })
  usersSnap.forEach((it) => {
    const user = it.data()
    user.nick = nickInsteadEmail(user.email)
    user.isAuthorized = CONFIG.familyMap.get(user.email) != undefined
    user.isAdmin = process.env.DEV
      ? CONFIG.adminMap.get(user.email) != undefined
      : CONFIG.adminMap.get(user.email) === user.uid
    user.allowPush = subscribers.find((sub) => sub.email === user.email)?.allowPush || false
    user.timestamp =
      subscribers.find((sub) => sub.email === user.email)?.timestamp || user.timestamp
    const docRef = doc(usersCol, it.id)
    setBatch.set(docRef, user, { merge: true })
  })

  await setBatch.commit()
  notify({
    message: `All users fixed`,
  })

  const deleteBatch = writeBatch(db)
  subscribersSnap.forEach((doc) => deleteBatch.delete(doc.ref))
  await deleteBatch.commit()
  notify({
    message: `All subscribers deleted`,
  })
}

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
        email: user.value?.email ?? '',
        nick: nickInsteadEmail(user.value?.email as string),
      }
    } else {
      throw new Error(`Failed to get download URL for file: ${filename}`)
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error))
  }
}

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

  const thumbRefs = await listAll(storageRef(storage, 'thumbnails'))
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
