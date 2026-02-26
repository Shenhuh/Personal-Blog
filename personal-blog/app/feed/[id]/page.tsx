"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Clock, ArrowLeft, Eye, Lock, VolumeX, ShieldOff, User, Bookmark, Bell, ImagePlus, X as XIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"

// --- Lightbox Component ---
function Lightbox({ images, startIndex, onClose }: { images: string[], startIndex: number, onClose: () => void }) {
  const [current, setCurrent] = useState(startIndex)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") setCurrent(p => Math.min(p + 1, images.length - 1))
      if (e.key === "ArrowLeft") setCurrent(p => Math.max(p - 1, 0))
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [images.length])

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full">
        <XIcon className="size-6" />
      </button>
      {images.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setCurrent(p => Math.max(p - 1, 0)) }} disabled={current === 0} className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full disabled:opacity-30">
            <ChevronLeft className="size-6" />
          </button>
          <button onClick={e => { e.stopPropagation(); setCurrent(p => Math.min(p + 1, images.length - 1)) }} disabled={current === images.length - 1} className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full disabled:opacity-30">
            <ChevronRight className="size-6" />
          </button>
        </>
      )}
      <img src={images[current]} onClick={e => e.stopPropagation()} className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
    </div>
  )
}

// --- ImageGrid Component ---
function ImageGrid({ images, onView }: { images: string[], onView: (index: number) => void }) {
  if (!images || images.length === 0) return null
  const count = images.length
  const wrapperClass = "mt-4 rounded-2xl overflow-hidden border border-border bg-muted relative"
  const containerStyle = { height: "320px" }
  const imgClass = "w-full h-full object-cover hover:opacity-95 transition-all cursor-pointer"

  if (count === 1) return (
    <div className={wrapperClass} style={{ maxHeight: "500px", height: "auto" }} onClick={() => onView(0)}>
      <img src={images[0]} className="w-full h-auto object-contain bg-black/5" />
    </div>
  )
  if (count === 2) return (
    <div className={wrapperClass} style={containerStyle}>
      <div className="flex gap-1 h-full">
        {images.slice(0, 2).map((url, i) => <div key={i} className="flex-1 min-w-0" onClick={() => onView(i)}><img src={url} className={imgClass} alt="" /></div>)}
      </div>
    </div>
  )
  if (count === 3) return (
    <div className={wrapperClass} style={containerStyle}>
      <div className="flex gap-1 h-full">
        <div className="flex-[2] min-w-0" onClick={() => onView(0)}><img src={images[0]} className={imgClass} alt="" /></div>
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          {images.slice(1, 3).map((url, i) => <div key={i} className="flex-1 min-h-0" onClick={() => onView(i + 1)}><img src={url} className={imgClass} alt="" /></div>)}
        </div>
      </div>
    </div>
  )
  return (
    <div className={wrapperClass} style={containerStyle}>
      <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
        {images.slice(0, 4).map((url, i) => (
          <div key={i} className="relative h-full w-full min-h-0" onClick={() => onView(i)}>
            <img src={url} className={imgClass} alt="" />
            {i === 3 && count > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <span className="text-white text-3xl font-bold">+{count - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// --- ProfileHoverCard Component ---
function ProfileHoverCard({ profile, currentUserId, onClose }: { profile: any, currentUserId: string, onClose: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const [isBlocked, setIsBlocked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [loading, setLoading] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      const [{ data: blockData }, { data: muteData }] = await Promise.all([
        supabase.from("blocks").select("id").eq("blocker_id", currentUserId).eq("blocked_id", profile.id).maybeSingle(),
        supabase.from("mutes").select("id").eq("muter_id", currentUserId).eq("muted_id", profile.id).maybeSingle()
      ])
      setIsBlocked(!!blockData)
      setIsMuted(!!muteData)
      setLoading(false)
    }
    fetchStatus()
  }, [profile.id])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleBlock = async () => {
    if (isBlocked) {
      await supabase.from("blocks").delete().eq("blocker_id", currentUserId).eq("blocked_id", profile.id)
      setIsBlocked(false)
    } else {
      await supabase.from("blocks").insert({ blocker_id: currentUserId, blocked_id: profile.id })
      setIsBlocked(true)
    }
  }

  const handleMute = async () => {
    if (isMuted) {
      await supabase.from("mutes").delete().eq("muter_id", currentUserId).eq("muted_id", profile.id)
      setIsMuted(false)
    } else {
      await supabase.from("mutes").insert({ muter_id: currentUserId, muted_id: profile.id })
      setIsMuted(true)
    }
  }

  if (profile.id === currentUserId) return null

  return (
    <div ref={cardRef} className="absolute z-50 left-0 top-8 w-56 rounded-2xl border border-border bg-card shadow-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        {profile.avatar_url ? <img src={profile.avatar_url} className="size-10 rounded-full object-cover" /> : <div className="size-10 rounded-full bg-muted" />}
        <div>
          <p className="text-sm font-semibold text-foreground">@{profile.username}</p>
          <p className="text-xs text-muted-foreground">Whisper user</p>
        </div>
      </div>
      <div className="border-t border-border pt-3 space-y-1">
        <button onClick={() => router.push(`/feed/user/${profile.id}`)} className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
          <User className="size-3.5" /> View profile
        </button>
        <button onClick={handleMute} disabled={loading} className={`flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium transition-colors ${isMuted ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground hover:bg-muted"}`}>
          <VolumeX className="size-3.5" /> {isMuted ? "Unmute user" : "Mute user"}
        </button>
        <button onClick={handleBlock} disabled={loading} className={`flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium transition-colors ${isBlocked ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-muted"}`}>
          <ShieldOff className="size-3.5" /> {isBlocked ? "Unblock user" : "Block user"}
        </button>
      </div>
    </div>
  )
}

// --- Main PostPage Component ---
export default function PostPage() {
  const supabase = createClient()
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [content, setContent] = useState("")
  const [reactions, setReactions] = useState<number>(0)
  const [hasReacted, setHasReacted] = useState(false)
  const [viewers, setViewers] = useState(0)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  const [activeHover, setActiveHover] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isWatching, setIsWatching] = useState(false)
  const [commentImages, setCommentImages] = useState<File[]>([])
  const [commentImagePreviews, setCommentImagePreviews] = useState<string[]>([])
  const [lightboxImages, setLightboxImages] = useState<string[]>([])
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null)
  const commentImageRef = useRef<HTMLInputElement>(null)

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images)
    setLightboxIndex(index)
  }

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUser(user)
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (data) setCurrentProfile(data)
  }

  const fetchPost = async () => {
    const { data } = await supabase.from("posts").select("*, profiles(id, username, avatar_url)").eq("id", id).single()
    if (data) setPost(data)
  }

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(id, username, avatar_url)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
    if (data) setComments(data)
  }

  const fetchReactions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, count } = await supabase.from("reactions").select("*", { count: "exact" }).eq("post_id", id)
    if (count !== null) setReactions(count)
    if (user && data) setHasReacted(data.some(r => r.user_id === user.id))
  }

  const fetchSavedAndWatch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: savedData }, { data: watchData }] = await Promise.all([
      supabase.from("saved_whispers").select("id").eq("user_id", user.id).eq("post_id", id).maybeSingle(),
      supabase.from("post_notification_preferences").select("id").eq("user_id", user.id).eq("post_id", id).maybeSingle()
    ])
    setIsSaved(!!savedData)
    setIsWatching(!!watchData)
  }

  useEffect(() => {
    fetchCurrentUser()
    fetchPost()
    fetchComments()
    fetchReactions()
    fetchSavedAndWatch()
  }, [])

  // FIXED AUTO-SCROLL & HIGHLIGHT LOGIC
  useEffect(() => {
    if (comments.length === 0) return

    const scrollAndHighlight = () => {
      const hash = window.location.hash
      if (hash.startsWith("#comment-")) {
        const commentId = hash.replace("#comment-", "")
        setHighlightedCommentId(commentId)

        // Give the DOM a tiny frame to ensure list items are rendered
        requestAnimationFrame(() => {
          const el = document.getElementById(`comment-${commentId}`)
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" })
          }
        })

        // Fade out the highlight after 4 seconds
        const timer = setTimeout(() => setHighlightedCommentId(null), 4000)
        return () => clearTimeout(timer)
      }
    }

    // Run on initial comment load
    scrollAndHighlight()

    // Listen for hash changes (case where user is already on page and clicks a new comment notification)
    window.addEventListener("hashchange", scrollAndHighlight)
    return () => window.removeEventListener("hashchange", scrollAndHighlight)
  }, [comments])

  useEffect(() => {
    const channel = supabase.channel(`post-${id}`)
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        setViewers(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ user: Math.random() })
      })
    return () => { supabase.removeChannel(channel) }
  }, [id])

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const remaining = 4 - commentImages.length
    const toAdd = files.slice(0, remaining)
    setCommentImages(prev => [...prev, ...toAdd])
    setCommentImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    if (commentImageRef.current) commentImageRef.current.value = ""
  }

  const removeCommentImage = (index: number) => {
    setCommentImages(prev => prev.filter((_, i) => i !== index))
    setCommentImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleComment = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !content) return
    if (post?.locked) return
    const image_urls: string[] = []
    for (const file of commentImages) {
      const ext = file.name.split(".").pop()
      const path = `${user.id}/comments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from("post-images").upload(path, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path)
        image_urls.push(urlData.publicUrl)
      }
    }
    await supabase.from("comments").insert({ post_id: id, user_id: user.id, content, image_urls })
    setContent("")
    setCommentImages([])
    setCommentImagePreviews([])
    fetchComments()
  }

  const handleReaction = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (hasReacted) {
      await supabase.from("reactions").delete().eq("post_id", id).eq("user_id", user.id)
    } else {
      await supabase.from("reactions").insert({ post_id: id, user_id: user.id })
    }
    fetchReactions()
  }

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (isSaved) {
      await supabase.from("saved_whispers").delete().eq("user_id", user.id).eq("post_id", id)
      setIsSaved(false)
    } else {
      await supabase.from("saved_whispers").insert({ user_id: user.id, post_id: id })
      setIsSaved(true)
    }
  }

  const handleWatch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (isWatching) {
      await supabase.from("post_notification_preferences").delete().eq("user_id", user.id).eq("post_id", id)
      setIsWatching(false)
    } else {
      await supabase.from("post_notification_preferences").insert({ user_id: user.id, post_id: id })
      setIsWatching(true)
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-6 space-y-4">

      {lightboxImages.length > 0 && (
        <Lightbox images={lightboxImages} startIndex={lightboxIndex} onClose={() => setLightboxImages([])} />
      )}

      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" /> Back
      </button>

      {post && (
        <article className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <button onClick={() => setActiveHover(activeHover === "post-author" ? null : "post-author")} className="flex items-center gap-2">
                  {post.profiles?.avatar_url
                    ? <img src={post.profiles.avatar_url} className="size-7 rounded-full object-cover hover:ring-2 ring-primary transition-all" />
                    : <div className="size-7 rounded-full bg-muted hover:ring-2 ring-primary transition-all" />}
                  <span className="text-sm font-medium text-foreground hover:underline">@{post.profiles?.username ?? "Anonymous"}</span>
                </button>
                {activeHover === "post-author" && currentUser && post.profiles && (
                  <ProfileHoverCard profile={post.profiles} currentUserId={currentUser.id} onClose={() => setActiveHover(null)} />
                )}
              </div>
              <span className="text-muted-foreground">·</span>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">{post.flair}</Badge>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" /> {timeAgo(post.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <Eye className="size-3.5" /> <span>{viewers} reading</span>
            </div>
          </div>

          <h1 className="mt-4 font-serif text-2xl leading-snug text-foreground md:text-3xl">{post.title}</h1>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground border-t border-border pt-6 whitespace-pre-wrap">{post.content}</p>

          <ImageGrid images={post.image_urls ?? []} onView={(i) => openLightbox(post.image_urls ?? [], i)} />

          <div className="mt-6 flex items-center gap-5 border-t border-border pt-5">
            <button onClick={handleReaction} className={`flex items-center gap-1.5 text-xs transition-colors ${hasReacted ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}>
              <Heart className={`size-3.5 ${hasReacted ? "fill-red-500" : ""}`} /> {reactions}
            </button>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="size-3.5" /> {comments.length}
            </button>
            <button onClick={handleSave} className={`flex items-center gap-1.5 text-xs transition-colors ml-auto ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              <Bookmark className={`size-3.5 ${isSaved ? "fill-primary" : ""}`} /> {isSaved ? "Saved" : "Save"}
            </button>
            <button onClick={handleWatch} className={`flex items-center gap-1.5 text-xs transition-colors ${isWatching ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}>
              <Bell className={`size-3.5 ${isWatching ? "fill-yellow-500" : ""}`} /> {isWatching ? "Watching" : "Watch"}
            </button>
          </div>
        </article>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Comments</h2>
        {post?.locked && (
          <div className="flex items-center gap-1.5 text-xs text-orange-500 bg-orange-500/10 rounded-full px-3 py-1.5">
            <Lock className="size-3" /> Comments locked
          </div>
        )}
      </div>

      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-4xl mb-4">💬</p>
          <p className="text-sm font-medium text-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <article
              key={comment.id}
              id={`comment-${comment.id}`}
              className={`rounded-2xl border transition-all duration-1000 ${
                highlightedCommentId === comment.id
                  ? "border-primary ring-2 ring-primary/40 bg-primary/10 scale-[1.01]"
                  : "border-border bg-card"
              } p-4 md:p-6`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                  <button onClick={() => setActiveHover(activeHover === comment.id ? null : comment.id)} className="flex items-center gap-2">
                    {comment.profiles?.avatar_url
                      ? <img src={comment.profiles.avatar_url} className="size-6 rounded-full object-cover hover:ring-2 ring-primary transition-all" />
                      : <div className="size-6 rounded-full bg-muted hover:ring-2 ring-primary transition-all" />}
                    <span className="text-xs font-medium text-foreground hover:underline">@{comment.profiles?.username ?? "Anonymous"}</span>
                  </button>
                  {activeHover === comment.id && currentUser && comment.profiles && (
                    <ProfileHoverCard profile={comment.profiles} currentUserId={currentUser.id} onClose={() => setActiveHover(null)} />
                  )}
                </div>
                {highlightedCommentId === comment.id && (
                  <Badge className="ml-2 h-4 text-[9px] px-1.5 bg-primary text-primary-foreground animate-pulse">Linked</Badge>
                )}
                <span className="text-xs text-muted-foreground ml-auto">{timeAgo(comment.created_at)}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
              <ImageGrid images={comment.image_urls ?? []} onView={(i) => openLightbox(comment.image_urls ?? [], i)} />
            </article>
          ))}
        </div>
      )}

      {!post?.locked && (
        <article className="rounded-2xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            {currentProfile?.avatar_url
              ? <img src={currentProfile.avatar_url} className="size-7 rounded-full object-cover" />
              : <div className="size-7 rounded-full bg-muted" />}
            <span className="text-sm font-medium text-foreground">@{currentProfile?.username ?? "Write a comment"}</span>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full border rounded-xl p-3 mb-3 h-24 resize-none bg-background text-sm focus:outline-none focus:ring-1 ring-primary"
          />
          {commentImagePreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {commentImagePreviews.map((preview, i) => (
                <div key={i} className="relative">
                  <img src={preview} className="size-16 rounded-xl object-cover border border-border" />
                  <button onClick={() => removeCommentImage(i)} className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-foreground text-background flex items-center justify-center">
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
              {commentImages.length < 4 && (
                <button onClick={() => commentImageRef.current?.click()} className="size-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                  <ImagePlus className="size-4" />
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button onClick={handleComment} className="rounded-full">Comment</Button>
            {commentImages.length === 0 && (
              <button onClick={() => commentImageRef.current?.click()} className="p-2 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <ImagePlus className="size-4" />
              </button>
            )}
            <input ref={commentImageRef} type="file" accept="image/*,.gif" multiple className="hidden" onChange={handleCommentImageSelect} />
          </div>
        </article>
      )}
    </div>
  )
}