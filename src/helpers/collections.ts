import { db } from '@/firebase'
import { collection } from 'firebase/firestore'

/**
 * Collection references are created on first use. Building them at module scope would drag the
 * Firestore SDK onto every route that merely imports this module.
 */
export const userCollection = () => collection(db(), 'User')
export const photoCollection = () => collection(db(), 'Photo')
export const counterCollection = () => collection(db(), 'Counter')
export const bucketCollection = () => collection(db(), 'Bucket')
export const renameCollection = () => collection(db(), 'Rename')
export const lastRecordCollection = () => collection(db(), 'LastRecord')
export const getUserDeviceCollection = (email: string) =>
  collection(db(), 'User', email.trim().toLowerCase(), 'Device')
