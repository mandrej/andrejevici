'use client'

import React, { useState } from 'react'
import { useUserStore } from '../../stores/userStore'
import CONFIG from '../../config'
import notify from '../../helpers/notify'
import AppButton from '../atoms/AppButton'
import AppInput from '../atoms/AppInput'
import { formatDatum, dummy } from '../../helpers'
import { logAnalyticsEvent } from '../../firebase'

export const SendMessage: React.FC = () => {
  const user = useUserStore((state) => state.user)
  const token = useUserStore((state) => state.token)
  const [message, setMessage] = useState('TEST')

  const send = async () => {
    const msg = message.trim()
    if (msg === '') {
      notify({ type: 'warning', message: 'No message provided' })
      return
    }

    try {
      const response = await fetch(CONFIG.notifyUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: msg, from: user?.email || '' }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const results = await response.json()

      if (Array.isArray(results)) {
        if (results.length === 0) {
          notify({
            type: 'info',
            message: 'No subscribers found',
            icon: 'sym_r_info',
          })
          return
        }
        results.forEach((res) => {
          let msgText = `${dummy(res.to)}`
          msgText += !res.status && typeof res.days === 'number' ? ` ${res.days} days old` : ``
          logAnalyticsEvent('push_message', {
            when: formatDatum(new Date(), 'DD.MM.YYYY HH:mm'),
            who: dummy(user?.email),
            message: msg,
            text: msgText,
          })
        })
      }
      notify({
        type: 'positive',
        message: 'Notification sent successfully',
        icon: 'sym_r_check',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      notify({ type: 'negative', timeout: 0, message: `Failed to send message: ${errorMessage}` })
    }
  }

  return (
    <div className="flex items-end gap-2 p-2 pb-6 rounded-lg bg-gray-55 dark:bg-gray-800 transition-colors">
      <div className="grow">
        <AppInput
          modelValue={message}
          onChangeValue={setMessage}
          label="Send message to subscribers"
        />
      </div>
      <div className="flex items-end">
        <AppButton disabled={!token} label="Send" onClick={send} color="secondary" />
      </div>
    </div>
  )
}

export default SendMessage
