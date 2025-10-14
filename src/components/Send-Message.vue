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
import { db } from '../boot/fire'
import { collection, onSnapshot } from 'firebase/firestore'
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
  const lastSendTime = Date.now()
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }
  const subscribe = onSnapshot(messageRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const data = change.doc.data() as MessageType
        // Only handle messages added after send is pressed
        if (data.timestamp && data.timestamp.toMillis() > lastSendTime) {
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
      }
    })
  })
  fetch(CONFIG.notifyUrl, {
    method: 'POST',
    mode: 'cors',
    headers: headers,
    body: JSON.stringify({ text: msg }),
  })
    .then((response) => {
      if (!response.ok) {
        throw response
      }
      return response.text()
    })
    .then((text) => {
      notify({ message: `${text}` })
      setTimeout(
        () => {
          subscribe()
        },
        5 * 60 * 1000, // 5 minutes
      )
    })
    .catch((error) => {
      notify({ type: 'negative', message: `${error}` })
    })
}
</script>
