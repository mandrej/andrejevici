import React, { Fragment } from 'react'
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react'

interface AppDialogProps {
  modelValue: boolean
  maxWidth?: string
  persistent?: boolean
  onChange?: (val: boolean) => void
  children?: React.ReactNode
}

export const AppDialog: React.FC<AppDialogProps> = ({
  modelValue,
  maxWidth = 'max-w-md',
  persistent = false,
  onChange,
  children,
}) => {
  const onClose = () => {
    if (persistent) return
    if (onChange) onChange(false)
  }

  return (
    <Transition show={modelValue} as={Fragment}>
      <Dialog as="div" className="relative z-99999" onClose={onClose}>
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="duration-200 ease-out"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="duration-150 ease-in"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </TransitionChild>

        {/* Dialog panel wrapper */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="duration-250 ease-out"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="duration-200 ease-in"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <DialogPanel
                className={`w-full transform overflow-hidden rounded-2xl shadow-2xl transition-all bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 ${maxWidth}`}
              >
                {children}
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default AppDialog
