"use client"

import { Suspense } from "react"
import FeedContent from "./FeedContent"

export default function FeedPage() {
  function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  )
}
  return (
    <Suspense fallback={<LoadingSkeleton />}>
  <FeedContent />
</Suspense>
  )
}