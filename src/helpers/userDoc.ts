/**
 * Pure helpers for the `User` collection. They are kept out of `users.ts` so the rules for keying
 * and merging a user document can be tested without a Firestore connection.
 */

/** A user document is keyed by its trimmed, lowercased email. */
export const normalizeUserEmail = (email?: string | null): string =>
  (email || '').trim().toLowerCase()

/**
 * Documents written by the older app carried the Firebase auth `uid` and a redundant `id`. Neither
 * belongs in Firestore now that the email is the key, so both are stripped on every repair.
 */
export const LEGACY_USER_FIELDS = ['uid', 'id'] as const

/** True for values that carry no information and should not overwrite an existing field. */
export const isEmptyValue = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '')

/** Reads a Firestore Timestamp (or any `toMillis()` object) as a number; 0 when absent. */
export const toMillis = (value: unknown): number => {
  const timestamp = value as { toMillis?: () => number } | undefined
  return typeof timestamp?.toMillis === 'function' ? timestamp.toMillis() : 0
}

/** Returns the document data without the legacy `uid`/`id` fields. */
export const stripLegacyFields = (data: Record<string, unknown>): Record<string, unknown> => {
  const payload = { ...data }
  for (const field of LEGACY_USER_FIELDS) delete payload[field]
  return payload
}

/**
 * Folds a legacy document into the email-keyed one.
 *
 * A client running a build from before the key change creates a bare email-keyed document on
 * sign-in, so when both exist the legacy document may hold the profile an administrator edited
 * earlier. Every field keeps the live document's value when it has one and falls back to the
 * legacy document otherwise, because only the live one is still being edited. The exceptions are
 * the ones where losing data would be destructive: permissions are OR-ed so a grant is never
 * revoked, `allowPush` survives from either side, and `timestamp` takes the newer value so a
 * stale one cannot expire the session.
 */
export const mergeUserData = (
  legacy: Record<string, unknown>,
  current: Record<string, unknown> | null,
): Record<string, unknown> => {
  if (!current) return { ...legacy }

  const merged: Record<string, unknown> = { ...legacy }
  for (const [field, value] of Object.entries(current)) {
    if (!isEmptyValue(value)) merged[field] = value
  }

  merged.isAdmin = Boolean(legacy.isAdmin || current.isAdmin)
  merged.isAuthorized = Boolean(legacy.isAuthorized || current.isAuthorized)
  merged.allowPush = Boolean(legacy.allowPush || current.allowPush)
  merged.timestamp =
    toMillis(legacy.timestamp) > toMillis(current.timestamp) ? legacy.timestamp : current.timestamp

  return merged
}

/**
 * Decides what has to happen to one `User` document.
 *
 * `migrate` means the document is not keyed by its email and has to be moved; `strip` means the key
 * is already right but the legacy fields linger; `skip` means there is no email to key it by, which
 * needs a human.
 */
export type UserDocAction = 'migrate' | 'strip' | 'skip' | 'none'

export const planUserDoc = (
  id: string,
  data: Record<string, unknown>,
): { action: UserDocAction; email: string } => {
  const email = normalizeUserEmail(data.email as string | undefined)
  if (!email) return { action: 'skip', email }

  const hasLegacyFields = LEGACY_USER_FIELDS.some((field) => data[field] !== undefined)
  if (id !== email) return { action: 'migrate', email }
  return { action: hasLegacyFields ? 'strip' : 'none', email }
}
