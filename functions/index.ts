/* eslint-disable comma-dangle */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, CollectionReference, DocumentData } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { onRequest, Request } from 'firebase-functions/v2/https'
import { Response } from 'express'
import * as logger from 'firebase-functions/logger'

const TOPIC = 'newimages'

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
    if (!text || text.length === 0) {
      res.send('No message error')
      return
    }
    const msg = {
      topic: TOPIC,
      data: {
        title: 'Andrejevici',
        body: text,
        link: 'https://andrejevici.web.app/',
      },
    }

    const query: CollectionReference<DocumentData> = getFirestore().collection('Device')
    const querySnapshot = await query.get()
    if (querySnapshot.size === 0) {
      res.status(200).send('No subscribers error')
      return
    }

    querySnapshot.forEach((docSnap) => {
      registrationTokens.push(docSnap.id)
    })

    if (registrationTokens.length > 0) {
      const tokens = await unsubscribe(registrationTokens)
      if (tokens.length > 0) {
        getMessaging()
          .send(msg)
          .then((response) => {
            logger.info('send response:', response)
            res.write(response)
          })
          .catch((error) => {
            logger.error(error)
            res.write(error)
          })
          .finally(() => {
            res.end()
          })
      } else {
        res.status(200).send('All tokens expired')
      }
    } else {
      res.status(200).send('No subscribers')
    }
  },
)

const unsubscribe = async (tokens: string[]): Promise<string[]> => {
  const resp = await getMessaging().unsubscribeFromTopic(tokens, TOPIC)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resp.errors.forEach((it: any) => {
    const token = tokens[it.index]
    if (
      token !== undefined &&
      (it.error.code === 'messaging/invalid-registration-token' ||
        it.error.code === 'messaging/registration-token-not-registered')
    ) {
      removeToken(token)
      tokens.splice(it.index, 1)
    }
  })
  if (tokens.length > 0) {
    await getMessaging().subscribeToTopic(tokens, TOPIC)
  }
  return tokens
}

const removeToken = async (token: string): Promise<void> => {
  if (token === undefined) return
  const docRef = getFirestore().collection('Device').doc(token)
  const doc = await docRef.get()
  logger.info(`Remove token for ${doc.data()?.email}`)
  await docRef.delete()
}
