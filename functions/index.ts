import { initializeApp } from 'firebase-admin/app'
import type { CollectionReference, DocumentData } from 'firebase-admin/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import type { Request } from 'firebase-functions/v2/https'
import { onRequest } from 'firebase-functions/v2/https'
import type { Response } from 'express'
import * as logger from 'firebase-functions/logger'

initializeApp()

export const notify = onRequest(
  {
    timeoutSeconds: 120,
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
        .then((response) => {
          const failedTokens: string[] = []
          const successTokens: string[] = []
          response.responses.forEach((resp, idx) => {
            if (resp && idx < registrationTokens.length) {
              if (!resp.success) {
                failedTokens.push(registrationTokens[idx]!)
              } else {
                successTokens.push(registrationTokens[idx]!)
              }
            }
          })
          if (failedTokens.length > 0) {
            failedTokens.forEach((token) => removeToken(token))
          }
          if (successTokens.length > 0) {
            successTokens.forEach((token) => messageSent(token))
          } else if (successTokens.length === 0) {
            res.status(200).send('No active subscribers found')
            logger.info(`No active subscribers found. No message sent`)
          }
        })
    } catch (error) {
      logger.error('Error sending multicast message:', error)
      res.status(500).json({ error: (error as Error).message })
    }
  },
)

const removeToken = async (token: string): Promise<void> => {
  if (token === undefined) return
  const docRef = getFirestore().collection('Device').doc(token)
  const doc = await docRef.get()
  logger.info(`Remove token for ${doc.data()?.email}`)
  await docRef.delete()
}

const messageSent = async (token: string): Promise<void> => {
  if (token === undefined) return
  const docRef = getFirestore().collection('Device').doc(token)
  const doc = await docRef.get()
  logger.info(`Message sent to ${doc.data()?.email}`)
}
