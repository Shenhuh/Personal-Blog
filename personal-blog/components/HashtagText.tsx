"use client"

import { useRouter } from "next/navigation"

interface HashtagTextProps {
  text: string
  className?: string
}

export function HashtagText({ text, className }: HashtagTextProps) {
  const router = useRouter()
  if (!text) return null

  const parts = text.split(/(#[a-zA-Z0-9_]+)/g)

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^#[a-zA-Z0-9_]+$/.test(part)) {
          return (
            <span
              key={i}
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                router.push(`/feed/hashtag/${part.slice(1).toLowerCase()}`)
              }}
              className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors cursor-pointer"
            >
              {part}
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}