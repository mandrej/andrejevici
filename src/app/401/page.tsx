import type { Metadata } from 'next'
import UnauthorizedPageContent from './UnauthorizedPageContent'

export const metadata: Metadata = {
  title: '401',
}

export default function UnauthorizedPage() {
  return <UnauthorizedPageContent />
}
