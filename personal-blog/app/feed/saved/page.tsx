"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bookmark, Loader2 } from "lucide-react"
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
    
    // The asterisk (*) inside post(...) ensures we get image_urls
    const { data } = await supabase
      .from("saved_whispers")
      .select(`
        *, 
        post:post_id (
          *, 
          profiles(username, avatar_url), 
          reactions(count), 
          comments(count)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      
    if (data) setSaved(data)
    setLoading(false)
  }

  useEffect(() => { fetchSaved() }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="size-6 text-primary animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-xl bg-primary/10">
          <Bookmark className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saved Whispers</h1>
          <p className="text-xs text-muted-foreground">Things you've kept for later</p>
        </div>
      </div>

      {saved.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-3xl">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Bookmark className="size-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-foreground">No saved whispers yet</p>
          <p className="text-xs text-muted-foreground mt-1">Tap the bookmark icon on any post to save it here.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 auto-rows-fr">
          {saved.map(s => (
            <Link key={s.id} href={`/feed/${s.post.id}`} className="block h-full transition-transform active:scale-[0.98]">
              <PostCard
                title={s.post.title}
                excerpt={s.post.content}
                tag={s.post.flair}
                timeAgo={timeAgo(s.post.created_at)}
                likes={s.post.reactions[0]?.count ?? 0}
                comments={s.post.comments[0]?.count ?? 0}
                username={s.post.profiles?.username ?? "Anonymous"}
                avatar={s.post.profiles?.avatar_url ?? ""}
                // FIXED: Passing the array of images to the PostCard
                imageUrls={s.post.image_urls} 
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}