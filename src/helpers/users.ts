import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  deleteField,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { getUserDeviceCollection, userCollection } from '@/helpers/collections'
import {
  LEGACY_USER_FIELDS,
  mergeUserData,
  normalizeUserEmail,
  planUserDoc,
  stripLegacyFields,
} from '@/helpers/userDoc'

export { normalizeUserEmail } from '@/helpers/userDoc'

/** A Firestore batch accepts at most 500 writes, so device moves are chunked below that. */
const BATCH_LIMIT = 400

/**
 * Moves every FCM token from `User/{legacyId}/Device` to `User/{email}/Device`.
 *
 * A token left on the legacy path would keep receiving pushes for a user document that is about to
 * disappear, so this runs before that document is deleted.
 */
const moveUserDevices = async (legacyId: string, email: string): Promise<number> => {
  const snapshot = await getDocs(getUserDeviceCollection(legacyId))
  if (snapshot.empty) return 0

  for (let i = 0; i < snapshot.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db())
    for (const device of snapshot.docs.slice(i, i + BATCH_LIMIT)) {
      batch.set(doc(getUserDeviceCollection(email), device.id), device.data(), { merge: true })
      batch.delete(device.ref)
    }
    await batch.commit()
  }

  return snapshot.size
}

/**
 * Rewrites a user document onto the `User/{email}` key and deletes the legacy one.
 *
 * @returns True when the legacy document existed and was migrated.
 */
export const migrateUserDoc = async (legacyId: string, email: string): Promise<boolean> => {
  const target = normalizeUserEmail(email)
  if (!target || legacyId === target) return false

  const legacySnap = await getDoc(doc(userCollection(), legacyId))
  if (!legacySnap.exists()) return false

  const legacy = stripLegacyFields(legacySnap.data() as Record<string, unknown>)
  const targetRef = doc(userCollection(), target)
  const targetSnap = await getDoc(targetRef)
  const current = targetSnap.exists() ? (targetSnap.data() as Record<string, unknown>) : null

  await setDoc(targetRef, { ...mergeUserData(legacy, current), email: target }, { merge: true })
  await moveUserDevices(legacyId, target)
  await deleteDoc(doc(userCollection(), legacyId))
  return true
}

/**
 * Removes the legacy `uid`/`id` fields from a user document whose key is already correct.
 *
 * @returns True when at least one legacy field was removed.
 */
export const stripLegacyUserFields = async (id: string): Promise<boolean> => {
  const ref = doc(userCollection(), id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return false

  const data = snap.data() as Record<string, unknown>
  const fields = LEGACY_USER_FIELDS.filter((field) => data[field] !== undefined)
  if (fields.length === 0) return false

  await setDoc(ref, Object.fromEntries(fields.map((field) => [field, deleteField()])), {
    merge: true,
  })
  return true
}

export interface RepairUsersResult {
  /** Documents moved from a uid key onto their email key. */
  migrated: number
  /** Documents that had `uid`/`id` fields removed. */
  stripped: number
  /** Documents without an email, which have no key to move to and need a human. */
  skipped: number
}

/**
 * Repairs the `User` collection: documents keyed by a Firebase auth uid are rewritten onto their
 * email key, and the `uid`/`id` fields are removed everywhere else.
 *
 * Before 27 Sep 2026 the app keyed `User` documents by `uid`. A client still running one of those
 * builds can write such a document at any time, which is how they keep appearing in production.
 */
export const repairUsers = async (): Promise<RepairUsersResult> => {
  const snapshot = await getDocs(userCollection())
  const result: RepairUsersResult = { migrated: 0, stripped: 0, skipped: 0 }

  for (const snap of snapshot.docs) {
    const { action, email } = planUserDoc(snap.id, snap.data() as Record<string, unknown>)

    if (action === 'skip') {
      result.skipped++
    } else if (action === 'strip' && (await stripLegacyUserFields(snap.id))) {
      result.stripped++
    } else if (action === 'migrate' && (await migrateUserDoc(snap.id, email))) {
      result.migrated++
    }
  }

  return result
}
