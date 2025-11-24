import { db } from 'src/lib/firebase'
import { collection } from 'firebase/firestore'

export const usersCol = collection(db, 'User')
export const photosCol = collection(db, 'Photo')
export const countersCol = collection(db, 'Counter')
export const messagesCol = collection(db, 'Message')
export const devicesCol = collection(db, 'Device')
export const bucketCol = collection(db, 'Bucket')
