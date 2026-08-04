import type { Metadata } from 'next'
import UnauthorizedPageContent from '@/app/401/UnauthorizedPageContent'

export const metadata: Metadata = {
  title: '401',
}

export default function UnauthorizedPage() {
  return <UnauthorizedPageContent />
}
