import { db, storage } from '../boot/fire'
import { doc, collection, query, orderBy, getDocs, setDoc, deleteDoc } from 'firebase/firestore'
import { ref as storageRef, listAll, getMetadata, getDownloadURL } from 'firebase/storage'
import { textSlug, sliceSlug } from '.'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import { emailNick } from '.'
import router from '../router'

import notify from './notify'
import type { PhotoType, ValuesState } from './models'

const app = useAppStore()
const meta = useValuesStore()
const auth = useUserStore()
const { uploaded } = storeToRefs(app)
const { user } = storeToRefs(auth)
const photosCol = collection(db, 'Photo')

export const fix = async () => {
  let num = 0
  const q = query(photosCol, orderBy('date', 'desc'))
  const querySnapshot = await getDocs(q)

  querySnapshot.forEach(async (it) => {
    const rec = it.data()
    if (!('text' in rec)) {
      const docRef = doc(db, 'Photo', rec.filename)
      rec.text = sliceSlug(textSlug(rec.headline))
      await setDoc(docRef, rec, { merge: true })
    }
  })
  if (num === 0) {
    notify({
      message: `No records to fix`,
      group: 'fix',
    })
  } else {
    notify({
      message: `Fixed ${++num} records`,
      group: 'fix',
    })
  }
}

const getStorageData = (filename: string) => {
  return new Promise((resolve, reject) => {
    const fetchData = async () => {
      try {
        const _ref = storageRef(storage, filename)
        const downloadURL = await getDownloadURL(_ref)
        const metadata = await getMetadata(_ref)
        if (downloadURL) {
          resolve({
            url: downloadURL,
            filename: filename,
            size: metadata.size || 0,
            email: user.value?.email ?? '',
            nick: emailNick(user.value?.email ?? ''),
          })
        } else {
          reject()
        }
      } catch (error) {
        reject(error)
      }
    }
    fetchData()
  })
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

  const missing =
    bucketNames.length >= storageNames.length
      ? bucketNames.filter((x) => !storageNames.includes(x))
      : storageNames.filter((x) => !bucketNames.includes(x))

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
              router.push({ path: '/add' })
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
    } else if (
      Object.keys(meta.values[field as keyof typeof meta.values]).indexOf(changed) !== -1
    ) {
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
