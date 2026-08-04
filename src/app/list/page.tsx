import type { Metadata } from 'next'
import ListPageContent from './ListPageContent'

export const metadata: Metadata = {
  title: 'Album',
}

export default function ListPage() {
  return <ListPageContent />
}
