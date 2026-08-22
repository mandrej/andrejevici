import type { Metadata } from 'next'
import HomePageContent from '@/app/HomePageContent'
import CONFIG from '@/config'

export const metadata: Metadata = {
  title: CONFIG.title,
  description: CONFIG.description,
  keywords: CONFIG.keywords,
  authors: CONFIG.authors,
}

export default function HomePage() {
  return <HomePageContent />
}
