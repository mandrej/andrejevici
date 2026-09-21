import { initializeApp } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'

initializeApp()

// Cache singleton – avoids repeated SDK look-ups on every invocation
let _auth: Auth | undefined
export const getAdminAuth = () => (_auth ??= getAuth())

export interface UserRecordResponse {
  uid: string
  email: string
  displayName?: string
  disabled: boolean
}

/**
 * Retrieves user UID and displayName by email using Firebase Admin Auth.
 * These properties populate `user.uid` and `name` in the Firestore User collection.
 *
 * @param email - The email address to look up.
 * @param authInstance - Optional Auth instance for testing or custom configuration.
 */
export const getUserRecordByEmail = async (
  email: string,
  authInstance?: Auth,
): Promise<UserRecordResponse> => {
  if (typeof email !== 'string' || !email.trim()) {
    throw new Error('A valid email address is required')
  }

  const normalizedEmail = email.trim().toLowerCase()
  const a = authInstance ?? getAdminAuth()
  const userRecord = await a.getUserByEmail(normalizedEmail)

  return {
    uid: userRecord.uid,
    email: userRecord.email ?? normalizedEmail,
    displayName: userRecord.displayName,
    disabled: userRecord.disabled,
  }
}

/**
 * Callable Cloud Function: retrieve user record (uid and displayName) by email address.
 */
export const functionUser = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    invoker: 'public', // Cloud Run must allow requests through; auth is enforced inside via request.auth
  },
  async (request): Promise<UserRecordResponse | null> => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication is required')
    }

    const email = request.data?.email
    if (typeof email !== 'string' || !email.trim()) {
      throw new HttpsError('invalid-argument', 'A valid email address is required')
    }

    try {
      return await getUserRecordByEmail(email)
    } catch (error) {
      const authError = error as { code?: string; message?: string }
      if (authError.code === 'auth/user-not-found') {
        return null
      }
      logger.error('Error retrieving user by email:', error)
      throw new HttpsError('internal', authError.message || 'Failed to retrieve user')
    }
  },
)
