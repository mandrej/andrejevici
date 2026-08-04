import type { Metadata } from 'next'
import AddPageContent from '@/app/add/AddPageContent'

export const metadata: Metadata = {
  title: 'Add',
}

export default function AddPage() {
  return <AddPageContent />
}
