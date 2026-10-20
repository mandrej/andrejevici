import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { storage } from '@/firebase'
import CONFIG from '@/config'
import type { StartUpload } from '@/stores/transfer/types'

/**
 * The real byte transfer: `uploadBytesResumable`, with progress wired to the caller's reporter.
 *
 * Originals are sent byte-exact — the `File`'s own bytes, with no re-encode or resize. This module
 * is kept separate from the slice so the store can be built with a fake uploader in tests, since
 * nothing here is importable without initializing Firebase.
 */
export const startUpload: StartUpload = (name, file, onProgress) => {
  const task = uploadBytesResumable(storageRef(storage(), name), file, {
    contentType: file.type,
    cacheControl: CONFIG.cache_control,
  })

  const promise = new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => onProgress(snapshot.bytesTransferred, snapshot.totalBytes),
      (error) => reject(error),
      () => {
        getDownloadURL(task.snapshot.ref).then(resolve, reject)
      },
    )
  })

  return { promise, cancel: () => void task.cancel() }
}
