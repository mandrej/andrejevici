import { db, storage } from '../boot/fire'
import { doc, collection, query, orderBy, getDocs, setDoc, deleteDoc } from 'firebase/firestore'
import { ref as storageRef, listAll, getMetadata, getDownloadURL } from 'firebase/storage'
import { has } from 'lodash'
import { textSlug, sliceSlug } from '../helpers'
import { storeToRefs } from 'pinia'
import { useAppStore } from '../stores/app'
import { useValuesStore } from '../stores/values'
import { useUserStore } from '../stores/user'
import { emailNick } from '.'
import router from '../router'
import notify from './notify'

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
    if (!has(rec, 'text')) {
      const docRef = doc(db, 'Photo', rec.filename)
      const slug = textSlug(rec.headline)
      rec.text = sliceSlug(slug)
      notify({
        message: `Fixed ${++num} records`,
        group: 'fix',
      })
      await setDoc(docRef, rec, { merge: true })
    }
  })
  if (num === 0) {
    notify({
      message: `No records to fix`,
      group: 'fix',
    })
  }
}

const getStorageData = (filename) => {
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
            email: user.value.email,
            nick: emailNick(user.value.email),
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
  const bucketNames = []
  const storageNames = []
  const uploadedFilenames = uploaded.value.length ? uploaded.value.map((it) => it.filename) : []
  const refs = await listAll(storageRef(storage, ''))
  for (let r of refs.items) {
    bucketNames.push(r.name)
  }
  const q = query(photosCol)
  const snapshot = await getDocs(q)
  snapshot.forEach((doc) => {
    storageNames.push(doc.id)
  })

  bucketNames.sort()
  storageNames.sort()

  let missing
  let promises = []
  if (bucketNames.length >= storageNames.length) {
    // uploaded to bucket but no record in firestore
    missing = bucketNames.filter((x) => storageNames.indexOf(x) === -1)
    for (let name of missing) {
      if (uploadedFilenames.indexOf(name) === -1) {
        promises.push(getStorageData(name))
      }
    }
    if (promises.length > 0) {
      Promise.all(promises).then((results) => {
        results.forEach((it) => {
          uploaded.values.push(it)
        })
      })
      notify({
        type: 'negative',
        message: `${promises.length} files uploaded to bucket, but doesn't have record in firestore.<br>
        Resolve mismathed files either by publish or delete.`,
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
      notify({ message: `All good. Nothing to reslove`, group: 'mismatch' })
    }
  } else {
    // records with no image reference
    missing = storageNames.filter((x) => bucketNames.indexOf(x) === -1)
    for (let name of missing) {
      const docRef = doc(db, 'Photo', name)
      await deleteDoc(docRef)
    }
    notify({
      message: `${missing.length} records deleted from firestore that doesn't have image reference`,
      type: 'negative',
      group: 'mismatch',
    })
  }
}

export const rename = async (field, existing, changed) => {
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
