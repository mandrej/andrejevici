import type { Metadata } from 'next'
import ListPageContent from '@/app/list/ListPageContent'

export const metadata: Metadata = {
  title: 'Album',
}

export default function ListPage() {
  return <ListPageContent />
}
