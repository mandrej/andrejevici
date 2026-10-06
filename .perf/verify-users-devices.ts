// One-off verification for the Device subcollection handling: reads (fetchUsersAndDevices),
// writes (updateDevice) and deletions (removeDevice, logoutUser, deleteUser).
//
// Run with: NODE_ENV=development npx tsx .perf/verify-users-devices.ts
//
// Expects a Firestore emulator on 127.0.0.1:8080 whose rules permit writes. The repo's rules only
// allow writes from an authenticated client, so against `./ands run` the seeding needs a signed-in
// user. The read/delete assertions at the end are the actual subject under test.
import { collection, deleteDoc, doc, getDocs, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { getUserDeviceCollection, userCollection } from '@/helpers/collections'
import { deleteUserDevices } from '@/helpers/devices'
import { useUserStore } from '@/stores/userStore'
import type { MyUserType } from '@/helpers/models'

console.log('firestore emulator:', process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080')

const EMAIL = 'devices-verify@example.com'
const norm = EMAIL.trim().toLowerCase()
const now = Date.now()
const day = 86400000
const failures: string[] = []
const check = (label: string, condition: boolean, detail: unknown) => {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${condition ? '' : ` -> ${JSON.stringify(detail)}`}`)
  if (!condition) failures.push(label)
}

const userDoc: MyUserType = {
  name: 'Devices Verify',
  email: norm,
  nick: 'devices-verify',
  isAuthorized: true,
  isAdmin: false,
  allowPush: true,
  timestamp: Timestamp.fromMillis(now),
}

/** Writes are what the rules gate; reads are allowed, which is why only this part needs a permissive emulator. */
const seedUser = async () => {
  await setDoc(doc(userCollection(), norm), userDoc)
  await setDoc(doc(getUserDeviceCollection(norm), 'tok-a'), {
    timestamp: Timestamp.fromMillis(now - 5 * day),
  })
  await setDoc(doc(getUserDeviceCollection(norm), 'tok-b'), {
    timestamp: Timestamp.fromMillis(now - 2 * day),
  })
}

const deviceCount = async () => (await getDocs(getUserDeviceCollection(norm))).size
const deviceDocCount = async (token: string) =>
  (await getDocs(getUserDeviceCollection(norm))).docs.filter((d) => d.id === token).length

await deleteUserDevices(norm)
await deleteDoc(doc(userCollection(), norm)).catch(() => {})

// A decoy collection named Device outside the User tree: a collection-group lookup would match it,
// a per-user sub-collection read must not.
await setDoc(doc(collection(db(), 'Orphan'), 'x', 'Device', 'stray'), {
  timestamp: Timestamp.fromMillis(now),
})

await seedUser()

// --- reads ---------------------------------------------------------------------------------
const users = await useUserStore.getState().fetchUsersAndDevices()
const mine = users.find((u) => u.email === norm)
const ages = (mine?.timestamps ?? []).map((t) => Math.round((now - t.toMillis()) / day))

check('fetchUsersAndDevices finds the user', Boolean(mine), users.length)
check('reads both Device sub-documents', mine?.timestamps.length === 2, mine?.timestamps.length)
check('timestamps sorted newest first', ages[0] === 2 && ages[1] === 5, ages)
check('decoy Device collection ignored', (mine?.timestamps.length ?? 0) === 2, ages)

// --- writes --------------------------------------------------------------------------------
const { updateDevice } = useUserStore.getState()
useUserStore.setState({ user: { ...userDoc, id: norm } })

await updateDevice('tok-c')
check('updateDevice writes into User/<email>/Device', (await deviceCount()) === 3, await deviceCount())
check('updateDevice stores the token as the document id', (await deviceDocCount('tok-c')) === 1, null)

// --- deletion: unsubscribe -----------------------------------------------------------------
await useUserStore.getState().removeDevice()
check('removeDevice clears every token for the user', (await deviceCount()) === 0, await deviceCount())
check('removeDevice leaves the decoy untouched', (await getDocs(collection(db(), 'Orphan', 'x', 'Device'))).size === 1, null)

// --- deletion: admin logout ----------------------------------------------------------------
await seedUser()
await useUserStore.getState().logoutUser({ ...userDoc, id: norm, timestamps: [] } as never)
check('logoutUser clears the Device subcollection', (await deviceCount()) === 0, await deviceCount())

// --- deletion: admin delete user -----------------------------------------------------------
await seedUser()
// Contributions block deletion, so the user must be deletable for the device cleanup to run.
await useUserStore.getState().deleteUser(norm)
check('deleteUser removes the user document', (await getDocs(userCollection())).docs.every((d) => d.id !== norm), null)
check('deleteUser clears the Device subcollection', (await deviceCount()) === 0, await deviceCount())

await deleteDoc(doc(collection(db(), 'Orphan'), 'x', 'Device', 'stray')).catch(() => {})
await deleteUserDevices(norm)
await deleteDoc(doc(userCollection(), norm)).catch(() => {})

console.log(failures.length === 0 ? '\nall checks passed' : `\n${failures.length} check(s) failed: ${failures.join('; ')}`)
process.exit(failures.length === 0 ? 0 : 1)
