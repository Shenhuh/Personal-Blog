"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Bookmark } from "lucide-react"
import { PostCard } from "@/components/PostCard"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"

export default function SavedWhispersPage() {
  const supabase = createClient()
  const [saved, setSaved] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSaved = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("saved_whispers")
      .select("*, post:post_id(*, profiles(username, avatar_url), reactions(count), comments(count))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (data) setSaved(data)
    setLoading(false)
  }

  useEffect(() => { fetchSaved() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Bookmark className="size-5 text-foreground" />
        <h1 className="font-serif text-2xl text-foreground">Saved Whispers</h1>
      </div>

      {saved.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Bookmark className="size-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-sm font-medium text-foreground">No saved whispers yet</p>
          <p className="text-xs text-muted-foreground mt-1">When you save a post it will appear here</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {saved.map(s => (
            <Link key={s.id} href={`/feed/${s.post.id}`}>
              <PostCard
                title={s.post.title}
                excerpt={s.post.content}
                tag={s.post.flair}
                timeAgo={timeAgo(s.post.created_at)}
                likes={s.post.reactions[0]?.count ?? 0}
                comments={s.post.comments[0]?.count ?? 0}
                username={s.post.profiles?.username ?? "Anonymous"}
                avatar={s.post.profiles?.avatar_url ?? ""}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}