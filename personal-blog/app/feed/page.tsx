"use client"

import { Suspense } from "react"
import FeedContent from "./FeedContent"

export default function FeedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FeedContent />
    </Suspense>
  )
}