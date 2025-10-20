<template>
  <q-item clickable>
    <q-item-section>
      <q-input v-model="message" label="Send message to subscribers" color="teal" dark />
    </q-item-section>
    <q-item-section side>
      <q-btn :disabled="!token" color="secondary" label="Send" @click="send" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../stores/user'
import { db } from '../lib/firebase'
import { query, where, orderBy, collection, onSnapshot, Timestamp } from 'firebase/firestore'
import { CONFIG } from '../helpers'
import notify from '../helpers/notify'
import type { MessageType } from '../helpers/models'

const auth = useUserStore()
const { token } = storeToRefs(auth)
const message = ref('TEST')
const messageRef = collection(db, 'Message')

const send = () => {
  const msg = message.value.trim()
  if (msg === '') notify({ type: 'warning', message: 'No message provided' })

  const sendDateTime = Timestamp.fromDate(new Date())
  // Only handle messages added after send is pressed
  const q = query(messageRef, where('timestamp', '>', sendDateTime), orderBy('timestamp', 'desc'))
  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data() as MessageType
        if (data.status) {
          notify({
            type: 'positive',
            message: `${data.email}<br>${data.timestamp.toDate().toLocaleString()}`,
            icon: 'check',
            html: true,
          })
        } else {
          notify({
            type: 'negative',
            message: `${data.email}<br>${data.text}`,
            actions: [{ icon: 'close' }],
            icon: 'error',
            html: true,
            timeout: 0,
          })
        }
      }
    })
  })

  fetch(CONFIG.notifyUrl, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ text: msg }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return response.text()
    })
    .then((text) => {
      notify({ message: `${text}` })
      setTimeout(
        () => {
          unsubscribe()
          // TODO remove older messages
        },
        2 * 60 * 1000, // 2 minutes
      )
    })
    .catch((error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      notify({ type: 'negative', message: `Failed to send message: ${errorMessage}` })
    })
}
</script>
