import type { UploadTaskSnapshot, UploadTask } from 'firebase/storage'

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'error' | 'cancelled'

/**
 * Manages a single upload task with atomic state transitions.
 * Uses a unique filename to avoid collisions.
 */
export class UploadTracker {
  filename: string
  status: UploadStatus = 'pending'
  progress: number = 0
  downloadURL: string | null = null
  error: Error | null = null
  task: UploadTask | null = null // Firebase UploadTaskSnapshot

  constructor(filename: string) {
    this.filename = filename
  }

  /**
   * Transitions to uploading state and records the task reference.
   */
  setTask(task: UploadTask): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot set task on ${this.status} upload`)
    }
    this.task = task
    this.status = 'uploading'
  }

  /**
   * Updates progress atomically (0 to 1).
   */
  updateProgress(snapshot: UploadTaskSnapshot): void {
    if (this.status === 'uploading') {
      this.progress = snapshot.bytesTransferred / snapshot.totalBytes
    }
  }

  /**
   * Transitions to completed state and records download URL.
   */
  complete(downloadURL: string): void {
    if (this.status !== 'uploading') {
      throw new Error(`Cannot complete ${this.status} upload`)
    }
    this.downloadURL = downloadURL
    this.status = 'completed'
    this.progress = 1
  }

  /**
   * Transitions to error state and records the error.
   */
  markError(error: Error): void {
    if (this.status === 'cancelled') {
      return // Already cancelled, ignore error
    }
    this.error = error
    this.status = 'error'
    this.progress = 0
    if (this.task) {
      this.task.cancel()
    }
  }

  /**
   * Transitions to cancelled state.
   */
  cancel(): void {
    if (this.status === 'completed' || this.status === 'error') {
      return // Cannot cancel completed or errored uploads
    }
    this.status = 'cancelled'
    this.progress = 0
    if (this.task) {
      this.task.cancel()
    }
  }

  /**
   * Returns true if this upload is in a terminal state.
   */
  isTerminal(): boolean {
    return this.status === 'completed' || this.status === 'error' || this.status === 'cancelled'
  }
}
