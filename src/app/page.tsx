import type { Metadata } from 'next'
import HomePageContent from './HomePageContent'
import CONFIG from '../config'

export const metadata: Metadata = {
  title: CONFIG.title,
}

export default function HomePage() {
  return <HomePageContent />
}
