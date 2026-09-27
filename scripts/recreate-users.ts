process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'

import { initializeApp } from '../functionUser/node_modules/firebase-admin/lib/app/index.js'
import {
  getFirestore,
  FieldValue,
} from '../functionUser/node_modules/firebase-admin/lib/firestore/index.js'

const app = initializeApp({ projectId: 'andrejevici' })
const db = getFirestore(app)

async function recreateUsers() {
  console.log('Connecting to Firestore emulator (admin) at 127.0.0.1:8080...')
  const snapshot = await db.collection('User').get()
  console.log(`Found ${snapshot.docs.length} document(s) in User collection.`)

  let recreatedCount = 0
  let alreadyCorrectCount = 0

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const email = data.email?.trim().toLowerCase()

    if (!email) {
      console.warn(`Doc ${docSnap.id} has no email, skipping.`)
      continue
    }

    const { uid: _oldUid, id: _oldId, ...rest } = data
    const userPayload = {
      ...rest,
      email: data.email,
    }

    if (docSnap.id === email && data.id === undefined && data.uid === undefined) {
      console.log(`User ${email} already has email as document ID and no id/uid fields.`)
      alreadyCorrectCount++
      continue
    }

    console.log(`Recreating user ${email} (old doc id: ${docSnap.id})...`)
    const targetRef = db.collection('User').doc(email)

    if (docSnap.id !== email) {
      await targetRef.set(userPayload)
      await docSnap.ref.delete()
      console.log(`Created new doc ${email} and deleted legacy doc ${docSnap.id}`)
    } else {
      await targetRef.set(
        {
          ...userPayload,
          id: FieldValue.delete(),
          uid: FieldValue.delete(),
        },
        { merge: true },
      )
      console.log(`Updated existing doc ${email}: removed id/uid fields`)
    }

    recreatedCount++
  }

  // Migrate legacy top-level Device collection to User/{email}/Device/{token}
  const deviceSnap = await db.collection('Device').get()
  let migratedDeviceCount = 0
  for (const devDoc of deviceSnap.docs) {
    const devData = devDoc.data()
    const devEmail = devData.email?.trim().toLowerCase()
    if (devEmail) {
      const targetRef = db.collection('User').doc(devEmail).collection('Device').doc(devDoc.id)
      await targetRef.set(
        {
          timestamp: devData.timestamp || new Date(),
        },
        { merge: true },
      )
      await devDoc.ref.delete()
      migratedDeviceCount++
    }
  }

  console.log(
    `Done! Users recreated/migrated: ${recreatedCount}, Already correct: ${alreadyCorrectCount}, Devices migrated: ${migratedDeviceCount}`,
  )
  process.exit(0)
}

recreateUsers().catch((err) => {
  console.error('Failed to recreate users:', err)
  process.exit(1)
})
