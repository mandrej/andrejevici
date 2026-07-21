'use client'

import dynamic from 'next/dynamic'

const AddPageContent = dynamic(() => import('./AddPageContent'), { ssr: false })

export default function AddPage() {
  return <AddPageContent />
}
