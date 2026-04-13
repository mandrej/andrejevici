import { db } from '../firebase'
import { collection } from 'firebase/firestore'

export const userCollection = collection(db, 'User')
export const photoCollection = collection(db, 'Photo')
export const counterCollection = collection(db, 'Counter')
export const messageCollection = collection(db, 'Message')
export const deviceCollection = collection(db, 'Device')
export const bucketCollection = collection(db, 'Bucket')
