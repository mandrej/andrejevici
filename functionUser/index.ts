import { initializeApp } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { onCall, onRequest, HttpsError, type Request } from 'firebase-functions/v2/https'
import type { Response } from 'express'
import * as logger from 'firebase-functions/logger'

initializeApp()

// Cache singleton – avoids repeated SDK look-ups on every invocation
let _auth: Auth | undefined
export const getAdminAuth = () => (_auth ??= getAuth())

export interface GetUserUidRequest {
  email: string
}

export interface UserUidResponse {
  uid: string
  email: string
  displayName?: string
  disabled: boolean
}

/**
 * Retrieves user UID and details by email using Firebase Admin Auth.
 *
 * @param email - The email address to look up.
 * @param authInstance - Optional Auth instance for testing or custom configuration.
 */
export const getUserRecordByEmail = async (
  email: string,
  authInstance?: Auth,
): Promise<UserUidResponse> => {
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
 * Callable Cloud Function: get user UID from email address.
 */
export const getUserUidByEmail = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
  },
  async (request): Promise<UserUidResponse> => {
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
        throw new HttpsError('not-found', `No user found with email ${email}`)
      }
      logger.error('Failed to get user by email:', error)
      throw new HttpsError('internal', authError.message || 'Failed to retrieve user')
    }
  },
)

/** Alias for getUserUidByEmail */
export const functionUser = getUserUidByEmail

/**
 * HTTP Cloud Function: get user UID from email address via GET/POST request.
 */
export const functionUserHttp = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    cors: true,
  },
  async (req: Request, res: Response): Promise<void> => {
    const rawEmail = (req.method === 'GET' ? req.query.email : req.body?.email) as unknown
    if (typeof rawEmail !== 'string' || !rawEmail.trim()) {
      res.status(400).json({ error: 'A valid email query parameter or body property is required' })
      return
    }

    try {
      const result = await getUserRecordByEmail(rawEmail)
      res.status(200).json(result)
    } catch (error) {
      const authError = error as { code?: string; message?: string }
      if (authError.code === 'auth/user-not-found') {
        res.status(404).json({ error: `No user found with email ${rawEmail}` })
        return
      }
      logger.error('Error retrieving user by email:', error)
      res.status(500).json({ error: authError.message || 'Internal server error' })
    }
  },
)

/** Alias for HTTP Cloud Function */
export const getUserUidByEmailHttp = functionUserHttp
