import type { Metadata } from 'next'
import NotFoundPageContent from '@/app/NotFoundPageContent'

export const metadata: Metadata = {
  title: '404',
}

export default function NotFoundPage() {
  return <NotFoundPageContent />
}
