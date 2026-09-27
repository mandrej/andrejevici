process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'

import { initializeApp } from '../functionUser/node_modules/firebase-admin/lib/app/index.js'
import {
  getFirestore,
  FieldValue,
} from '../functionUser/node_modules/firebase-admin/lib/firestore/index.js'

const app = initializeApp({ projectId: 'andrejevici' })
const db = getFirestore(app)

async function migrateDevices() {
  console.log('Connecting to Firestore emulator (admin) at 127.0.0.1:8080...')
  const snapshot = await db.collection('Device').get()
  console.log(`Found ${snapshot.docs.length} document(s) in top-level Device collection.`)

  let migratedCount = 0

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const email = data.email?.trim().toLowerCase()
    const token = docSnap.id

    if (!email) {
      console.warn(`Device ${token} has no email, skipping.`)
      continue
    }

    console.log(`Migrating device ${token} for user ${email}...`)
    const targetRef = db.collection('User').doc(email).collection('Device').doc(token)

    // Store only timestamp in the record (remove email field)
    await targetRef.set(
      {
        timestamp: data.timestamp || FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    await docSnap.ref.delete()
    console.log(`Migrated to User/${email}/Device/${token} and deleted top-level Device doc.`)
    migratedCount++
  }

  console.log(`Done! Successfully migrated ${migratedCount} device(s).`)
  process.exit(0)
}

migrateDevices().catch((err) => {
  console.error('Failed to migrate devices:', err)
  process.exit(1)
})
