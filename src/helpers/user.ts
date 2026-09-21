import { functions } from '@/firebase'
import { httpsCallable } from 'firebase/functions'

export interface UserUidResponse {
  uid: string
  email: string
  displayName?: string
  disabled: boolean
}

/**
 * Callable Firebase Cloud Function to retrieve user UID and metadata by email address.
 */
export const getUserUidByEmailCallable = httpsCallable<{ email: string }, UserUidResponse>(
  functions,
  'getUserUidByEmail',
)

/**
 * Helper to fetch a user's UID given their email address.
 *
 * @param email - The email address to look up.
 * @returns The Firebase Auth UID.
 */
export const getUserUidByEmail = async (email: string): Promise<string> => {
  const result = await getUserUidByEmailCallable({ email })
  return result.data.uid
}
