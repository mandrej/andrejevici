'use client'

import dynamic from 'next/dynamic'

const AdminPageContent = dynamic(() => import('./AdminPageContent'), { ssr: false })

export default function AdminPage() {
  return <AdminPageContent />
}
