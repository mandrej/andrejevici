import type { Metadata } from 'next'
import ListPageContent from '@/app/list/ListPageContent'

export const metadata: Metadata = {
  title: 'Browse',
}

export default function ListPage() {
  return <ListPageContent />
}
