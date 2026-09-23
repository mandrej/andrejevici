import { functions, storage } from '@/firebase'
import {
  doc,
  query,
  getDocs,
  deleteDoc,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { ref as storageRef, listAll, getMetadata, getDownloadURL } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import CONFIG from '@/config'
import { dummy, reFilename, thumbSuffix } from '@/helpers'
import { photoCollection, userCollection } from '@/helpers/collections'

import notify from '@/helpers/notify'
import type { MyUserType, PhotoType } from '@/helpers/models'

/**
 * Scans values.email for contributors, checks if they do not exist in the User collection.
 * If found using functionUser Auth UID, creates new user with id = uid, displayName for name,
 * allowPush: false, email, isAdmin: false, isAuthorized: true, and timestamp earlier than loginDays.
 * If user cannot be found in Auth, skips creation.
 *
 * @return {Promise<void>} A promise that resolves when the contributors are synced.
 */
export const fix = async () => {
  notify({
    message: 'Scanning values.email for contributors...',
    timeout: 0,
    spinner: true,
    group: 'fix-contributors-users',
  })

  try {
    const { useValuesStore } = await import('@/stores/valuesStore')
    let values = useValuesStore.getState().values
    if (!values?.email || Object.keys(values.email).length === 0) {
      await useValuesStore.getState().fetchValues()
      values = useValuesStore.getState().values
    }

    const userSnapshot = await getDocs(query(userCollection))

    const existingEmails = new Set(
      userSnapshot.docs
        .map((d) => (d.data().email as string | undefined)?.trim().toLowerCase())
        .filter(Boolean),
    )

    const contributorEmails = new Map<string, string>()
    for (const rawEmail of Object.keys(values.email || {})) {
      if (typeof rawEmail === 'string' && rawEmail.trim()) {
        const email = rawEmail.trim()
        const normalized = email.toLowerCase()
        if (!contributorEmails.has(normalized)) {
          contributorEmails.set(normalized, email)
        }
      }
    }

    const toAdd = Array.from(contributorEmails.values()).filter(
      (email) => !existingEmails.has(email.toLowerCase()),
    )

    if (toAdd.length === 0) {
      notify({
        type: 'positive',
        message: 'All contributors already exist in the user collection.',
        icon: 'sym_r_check',
        timeout: 5000,
        group: 'fix-contributors-users',
      })
      return
    }

    notify({
      message: `Found ${toAdd.length} contributor(s) not in users. Syncing...`,
      timeout: 0,
      spinner: true,
      group: 'fix-contributors-users',
    })

    // Timestamp earlier than loginDays to ensure session is expired
    const expiredDate = new Date(Date.now() - (CONFIG.loginDays + 1) * 86400000)
    const expiredTimestamp = Timestamp.fromDate(expiredDate)

    let addedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    const fetchUserRecord = httpsCallable<
      { email: string },
      { uid: string; displayName?: string; email?: string } | null
    >(functions, 'functionUser')

    for (const email of toAdd) {
      try {
        let authUser: { uid: string; displayName?: string; email?: string } | null = null

        try {
          const res = await fetchUserRecord({ email })
          if (res.data?.uid) {
            authUser = res.data
          }
        } catch (callErr: unknown) {
          const errCode = (callErr as { code?: string })?.code
          if (errCode === 'functions/not-found' || errCode === 'not-found') {
            authUser = null
          } else {
            console.warn(`Error calling functionUser for ${email}:`, callErr)
            authUser = null
          }
        }

        if (!authUser?.uid) {
          skippedCount++
          continue
        }

        const uid = authUser.uid
        const name = authUser.displayName || ''
        const userDocRef = doc(userCollection, uid)
        const userDocSnap = await getDoc(userDocRef)

        if (userDocSnap.exists()) {
          const existingUser = userDocSnap.data() as MyUserType
          if (!existingUser.name && name) {
            await updateDoc(userDocRef, { name })
          }
          continue
        }

        const newUser: MyUserType = {
          uid,
          name,
          email,
          nick: dummy(email),
          isAuthorized: true,
          isAdmin: false,
          allowPush: false,
          timestamp: expiredTimestamp,
        }

        await setDoc(userDocRef, newUser)
        addedCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`Could not add contributor ${email}:`, err)
        errors.push(`${email}: ${msg}`)
      }
    }

    if (errors.length > 0) {
      notify({
        type: addedCount > 0 ? 'warning' : 'negative',
        message: `Added ${addedCount} contributor(s). ${errors.length} failed:<br/>${errors.join('<br/>')}${skippedCount > 0 ? `<br/>${skippedCount} skipped (not found in Auth)` : ''}`,
        timeout: 0,
        html: true,
        multiLine: true,
        group: 'fix-contributors-users',
      })
    } else if (addedCount > 0) {
      notify({
        type: 'positive',
        message: `Successfully added ${addedCount} contributor(s) to users collection.${skippedCount > 0 ? ` (${skippedCount} skipped - not found in Auth)` : ''}`,
        icon: 'sym_r_check',
        timeout: 5000,
        group: 'fix-contributors-users',
      })
    } else {
      notify({
        type: 'warning',
        message: `No contributors added. ${skippedCount} contributor(s) not found in Firebase Auth.`,
        icon: 'sym_r_warning',
        timeout: 5000,
        group: 'fix-contributors-users',
      })
    }
  } catch (error) {
    notify({
      type: 'negative',
      message:
        'Failed to sync contributors: ' + (error instanceof Error ? error.message : String(error)),
      group: 'fix-contributors-users',
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
 * Cloud Function to generate a thumbnail for a given file path.
 */
const generateThumbnail = httpsCallable<{ filePath: string }, { filePath: string }>(
  functions,
  'generateThumbnail',
)

/**
 * Finds photos with missing thumbnails, generates them in Cloud Functions,
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

        // Generate the thumbnail with sharp in the Cloud Function
        const result = await generateThumbnail({ filePath: filename })
        const thumbRef = storageRef(storage, result.data.filePath)

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

  try {
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
  } catch (error) {
    notify({
      group: 'mismatch',
      type: 'negative',
      message:
        'Failed to resolve mismatch: ' + (error instanceof Error ? error.message : String(error)),
    })
  }
}
