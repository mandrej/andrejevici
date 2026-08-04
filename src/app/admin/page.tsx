import type { Metadata } from 'next'
import AdminPageContent from '@/app/admin/AdminPageContent'

export const metadata: Metadata = {
  title: 'Admin.',
}

export default function AdminPage() {
  return <AdminPageContent />
}
