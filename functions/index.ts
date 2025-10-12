import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { onRequest } from 'firebase-functions/v2/https'
import type { Request } from 'firebase-functions/v2/https'
import type { Response } from 'express'
import type { CollectionReference, DocumentData } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

initializeApp()

export const notify = onRequest(
  // : Cloud Functions can be configured with a maximum timeout of 540 seconds (9 minutes)
  {
    timeoutSeconds: 540,
    region: ['us-central1'],
    cors: ['https://andrejevici.web.app', 'http://localhost:9200'],
  },
  async (req: Request, res: Response) => {
    const registrationTokens: string[] = []
    const text: string = req.body.text

    const query: CollectionReference<DocumentData> = getFirestore().collection('Device')
    const querySnapshot = await query.get()

    querySnapshot.forEach((docSnap) => {
      registrationTokens.push(docSnap.id)
    })

    if (registrationTokens.length === 0) {
      res.status(200).send('No subscribers found error')
      return
    }

    const message = {
      tokens: registrationTokens,
      data: {
        title: 'Andrejevici',
        body: text,
        link: 'https://andrejevici.web.app/',
      },
    }

    try {
      getMessaging()
        .sendEachForMulticast(message)
        .then(async (response) => {
          const promises: Promise<void>[] = []
          response.responses.forEach((resp, idx) => {
            if (resp && idx < registrationTokens.length) {
              if (!resp.success) {
                promises.push(tokenDispacher(registrationTokens[idx]!, false, 'n/a'))
              } else {
                promises.push(tokenDispacher(registrationTokens[idx]!, true, text))
              }
            }
          })
          if (promises.length === 0) {
            res.status(200).send('No active subscribers found')
            logger.info(`No active subscribers found. No message sent`)
            return
          }
          await Promise.all(promises)
        })
    } catch (error) {
      logger.error('Error sending multicast message:', error)
      res.status(500).json({ error: (error as Error).message })
    }
  },
)

const tokenDispacher = async (token: string, status: boolean, msg: string): Promise<void> => {
  if (token === undefined) return
  const docRef = getFirestore().collection('Device').doc(token)
  const doc = await docRef.get()
  const data = doc.data()
  let text = 'successfully sent'

  if (status) {
    logger.info(`Message sent to ${data?.email}`)
  } else {
    const diff = Date.now() - data?.timestamp.toMillis()
    text = 'removed token age ' + Math.floor(diff / 86400000)
    logger.info(`Removed token for ${data?.email} age ` + Math.floor(diff / 86400000))
    await docRef.delete()
  }
  await getFirestore().collection('Message').add({
    email: data?.email,
    message: msg,
    status: status,
    text: text,
    timestamp: FieldValue.serverTimestamp(),
  })
}
