import { getDocs, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase'
import { getUserDeviceCollection } from '@/helpers/collections'

/**
 * A Firestore batch accepts at most 500 writes, so device token documents are removed in chunks.
 */
const BATCH_LIMIT = 400

/**
 * Deletes every FCM device token document under `User/{email}/Device`.
 *
 * Device tokens live only in that subcollection, so this has to run whenever a user is deleted,
 * logged out or unsubscribes — otherwise the orphaned tokens keep receiving push notifications.
 */
export const deleteUserDevices = async (email: string): Promise<number> => {
  const devices = getUserDeviceCollection(email)
  let removed = 0

  for (;;) {
    const snapshot = await getDocs(devices)
    if (snapshot.empty) break

    const batch = writeBatch(db())
    snapshot.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()

    removed += snapshot.size
    if (snapshot.size < BATCH_LIMIT) break
  }

  return removed
}
