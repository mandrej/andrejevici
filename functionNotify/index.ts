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
      'http://localhost:9200',
      'http://localhost:9000',
      'http://localhost:8080',
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
        res.status(200).send('No subscribers found')
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
        deviceData.set(
          docSnap.id,
          docSnap.data() as { email?: string; timestamp?: FirebaseFirestore.Timestamp },
        )
      })

      const message = {
        tokens: registrationTokens,
        data: {
          title: 'Andrejevici',
          body: text,
          link: 'https://andrejevici.web.app/',
        },
      }

      const response = await messaging().sendEachForMulticast(message)

      // Collect all Firestore writes into batched operations
      const MAX_BATCH = 500
      const ops: Array<(batch: FirebaseFirestore.WriteBatch) => void> = []

      response.responses.forEach((resp, idx) => {
        if (!resp || idx >= registrationTokens.length) return

        const token = registrationTokens[idx]
        if (!token) return

        const data = deviceData.get(token)

        let statusText: string
        if (resp.success) {
          statusText = 'successfully sent to ' + data?.email
          logger.info(`Message sent to ${data?.email}`)
        } else {
          const diff = Date.now() - (data?.timestamp?.toMillis() ?? Date.now())
          statusText = 'removed token for ' + data?.email + ' age ' + Math.floor(diff / 86400000)
          logger.info(`Removed token for ${data?.email} age ${Math.floor(diff / 86400000)}`)
          // Queue delete of stale token
          ops.push((batch) => {
            batch.delete(db().collection('Device').doc(token))
          })
        }

        // Queue Message log entry
        ops.push((batch) => {
          batch.set(db().collection('Message').doc(), {
            email: data?.email,
            message: text,
            status: resp.success,
            text: statusText,
            timestamp: FieldValue.serverTimestamp(),
          })
        })
      })

      if (ops.length === 0) {
        res.status(200).send('No active subscribers found')
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

      res.status(200).send(`Message sent successfully to ${registrationTokens.length} devices`)
    } catch (error) {
      logger.error('Error sending multicast message:', error)
      res.status(500).json({ error: (error as Error).message })
    }
  },
)
