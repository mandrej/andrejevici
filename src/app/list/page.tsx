'use client'

import dynamic from 'next/dynamic'

const ListPageContent = dynamic(() => import('./ListPageContent'), { ssr: false })

export default function ListPage() {
  return <ListPageContent />
}
