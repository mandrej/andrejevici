import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'
import { onRequest } from 'firebase-functions/v2/https'
import type { Request } from 'firebase-functions/v2/https'
import type { Response } from 'express'
import * as logger from 'firebase-functions/logger'

initializeApp()

// Cache singletons – avoids repeated SDK look-ups on every invocation
let _db: Firestore | undefined
let _messaging: Messaging | undefined
const db = () => (_db ??= getFirestore())
const messaging = () => (_messaging ??= getMessaging())

export const notify = onRequest(
  // : Cloud Functions can be configured with a maximum timeout of 540 seconds (9 minutes)
  {
    timeoutSeconds: 540,
    region: ['us-central1'],
    cors: [
      'https://andrejevici.web.app',
      'https://andrejevici.firebaseapp.com', // (Highly recommended in case users access via firebaseapp.com)
      'http://localhost:5173',
    ],
  },
  async (req: Request, res: Response) => {
    logger.info('Notify request received', { body: req.body })
    try {
      const text: string = req.body.text

      if (!text) {
        res.status(400).send('No message text provided')
        return
      }

      // Fetch only the fields we need from Device docs
      const querySnapshot = await db().collection('Device').select('email', 'timestamp').get()

      if (querySnapshot.empty) {
        res.status(200).json([])
        return
      }

      // Build token list and cache device data in one pass
      const registrationTokens: string[] = []
      const deviceData = new Map<
        string,
        { email?: string; timestamp?: FirebaseFirestore.Timestamp }
      >()

      querySnapshot.forEach((docSnap) => {
        registrationTokens.push(docSnap.id)
        deviceData.set(docSnap.id, docSnap.data())
      })

      const message = {
        tokens: registrationTokens,
        data: {
          title: 'Andrejevici',
          body: text,
          link: 'https://andrejevici.web.app/',
        },
      }

      let response
      if (process.env.FUNCTIONS_EMULATOR === 'true') {
        logger.info('Running in emulator environment. Mocking multicast messaging response.', {
          message,
        })
        response = {
          responses: registrationTokens.map(() => ({
            success: true,
            messageId: 'mock-message-id-' + Math.random().toString(36).substring(2, 9),
          })),
          successCount: registrationTokens.length,
          failureCount: 0,
        }
      } else {
        response = await messaging().sendEachForMulticast(message)
      }

      // Collect all Firestore writes into batched operations
      const MAX_BATCH = 500
      const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = []
      const results: Array<{
        from: string
        to: string
        status: boolean
        days?: number
      }> = []

      response.responses.forEach((resp, idx) => {
        if (!resp || idx >= registrationTokens.length) return

        const token = registrationTokens[idx]
        if (!token) return

        const data = deviceData.get(token)
        const email = data?.email || ''

        let statusText = `sent to ${email}`
        let days: number | undefined
        if (resp.success) {
          statusText += ` successfully`
        } else {
          const diff = Date.now() - (data?.timestamp?.toMillis() ?? Date.now())
          days = Math.floor(diff / 86400000)
          statusText += ` removed expired token ${days} days old`
          // Queue delete of stale token
          ops.push((batch) => {
            batch.delete(db().collection('Device').doc(token))
          })
        }

        results.push({
          from: req.body.from || '',
          to: email,
          status: resp.success,
          ...(days !== undefined ? { days } : {}),
        })

        // Queue Message log entry
        ops.push((batch) => {
          batch.set(db().collection('Message').doc(), {
            from: req.body.from || '',
            to: email,
            message: text,
            status: resp.success,
            text: statusText,
            timestamp: FieldValue.serverTimestamp(),
          })
        })
      })

      if (ops.length === 0) {
        res.status(200).json([])
        logger.info('No active subscribers found. No message sent')
        return
      }

      // Commit all writes in parallel batches of 500
      const batchPromises: Promise<FirebaseFirestore.WriteResult[]>[] = []
      for (let i = 0; i < ops.length; i += MAX_BATCH) {
        const batch = db().batch()
        const chunk = ops.slice(i, i + MAX_BATCH)
        for (const op of chunk) {
          op(batch)
        }
        batchPromises.push(batch.commit())
      }
      await Promise.all(batchPromises)

      res.status(200).json(results)
    } catch (error) {
      logger.error('Error sending multicast message:', error)
      res.status(500).json({ error: (error as Error).message })
    }
  },
)
