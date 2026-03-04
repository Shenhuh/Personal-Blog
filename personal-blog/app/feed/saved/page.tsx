"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bookmark } from "lucide-react"
import { PostCard } from "@/components/PostCard"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"

export default function SavedWhispersPage() {
  const supabase = createClient()
  const [saved, setSaved] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [liveAvatar, setLiveAvatar] = useState<string | null>(null)

  const fetchSaved = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    // Get live avatar
    const cached = localStorage.getItem(`live_avatar_url_${user.id}`)
    if (cached) {
      setLiveAvatar(cached)
    } else {
      const { data: profileData } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single()
      if (profileData?.avatar_url) setLiveAvatar(profileData.avatar_url)
    }

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

    if (data) setSaved(data.filter(s => s.post)) // filter out any deleted posts
    setLoading(false)
  }

  useEffect(() => { fetchSaved() }, [])

  // Keep avatar in sync if user updates it during session
  useEffect(() => {
    const onAvatarUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ avatar_url: string; userId: string }>).detail
      if (detail?.avatar_url && (!detail.userId || detail.userId === currentUserId)) setLiveAvatar(detail.avatar_url)
    }
    window.addEventListener("avatar-updated", onAvatarUpdated)
    return () => window.removeEventListener("avatar-updated", onAvatarUpdated)
  }, [currentUserId])

  const getPostAvatar = (post: any) => {
    if (currentUserId && post.user_id === currentUserId && liveAvatar) return liveAvatar
    return post.profiles?.avatar_url ?? ""
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary/10">
          <Bookmark className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saved Whispers</h1>
          <p className="text-xs text-muted-foreground">
            {saved.length > 0 ? `${saved.length} saved ${saved.length === 1 ? "whisper" : "whispers"}` : "Things you've kept for later"}
          </p>
        </div>
      </div>

      {/* ── Empty state ── */}
      {saved.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center border-2 border-dashed border-border rounded-3xl">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center">
            <Bookmark className="size-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="font-semibold text-base">No saved whispers yet</p>
            <p className="text-sm text-muted-foreground mt-1">Tap the bookmark icon on any post to save it here.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: single column */}
          <div className="flex flex-col gap-6 md:hidden">
            {saved.map(s => (
              <Link key={s.id} href={`/feed/${s.post.id}`} className="cursor-pointer">
                <PostCard
                  title={s.post.title}
                  excerpt={s.post.content}
                  tag={s.post.flair}
                  timeAgo={timeAgo(s.post.created_at)}
                  likes={s.post.reactions[0]?.count ?? 0}
                  comments={s.post.comments[0]?.count ?? 0}
                  username={s.post.profiles?.username ?? "Anonymous"}
                  avatar={getPostAvatar(s.post)}
                  imageUrls={s.post.image_urls ?? []}
                  videoUrl={s.post.video_url ?? null}
                />
              </Link>
            ))}
          </div>

          {/* Desktop: masonry */}
          <div className="hidden md:block">
            <div className="columns-2 lg:columns-3 gap-6">
              {saved.map(s => (
                <div key={s.id} className="mb-6 break-inside-avoid">
                  <Link href={`/feed/${s.post.id}`} className="cursor-pointer">
                    <PostCard
                      title={s.post.title}
                      excerpt={s.post.content}
                      tag={s.post.flair}
                      timeAgo={timeAgo(s.post.created_at)}
                      likes={s.post.reactions[0]?.count ?? 0}
                      comments={s.post.comments[0]?.count ?? 0}
                      username={s.post.profiles?.username ?? "Anonymous"}
                      avatar={getPostAvatar(s.post)}
                      imageUrls={s.post.image_urls ?? []}
                      videoUrl={s.post.video_url ?? null}
                    />
                  </Link>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center mt-16 mb-8 text-center">
              <div className="h-px w-24 bg-border mb-4" />
              <p className="text-sm font-medium text-muted-foreground">🔖 That's all your saved whispers!</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Bookmark more posts to see them here.</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}