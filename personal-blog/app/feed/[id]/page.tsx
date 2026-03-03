"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HashtagText } from "@/components/HashtagText"
import {
  Heart, MessageCircle, Clock, ArrowLeft, Eye, Lock, VolumeX, ShieldOff,
  User, Bookmark, Bell, ImagePlus, X as XIcon, ChevronLeft, ChevronRight,
  CornerDownRight, ChevronDown, ChevronUp, PlayCircle
} from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"

// ── LIGHTBOX ──────────────────────────────────────────────────────────────────
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
      {images.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); setCurrent(p => Math.max(p - 1, 0)) }} disabled={current === 0} className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full disabled:opacity-30">
          <ChevronLeft className="size-6" />
        </button>
        <button onClick={e => { e.stopPropagation(); setCurrent(p => Math.min(p + 1, images.length - 1)) }} disabled={current === images.length - 1} className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full disabled:opacity-30">
          <ChevronRight className="size-6" />
        </button>
      </>}
      <img src={images[current]} onClick={e => e.stopPropagation()} className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
      {images.length > 1 && (
        <div className="absolute bottom-4 flex gap-2">
          {images.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setCurrent(i) }} className={`size-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── MEDIA RENDERER (Supports Video & Images) ──────────────────────────────────
function PostMedia({ post, openLightbox }: { post: any, openLightbox: (images: string[], index: number) => void }) {
  const { image_urls, video_url } = post;

  if (video_url) {
    return (
      <div className="mt-4 rounded-2xl overflow-hidden border border-border bg-black relative aspect-video max-h-[450px]">
        <video 
          src={video_url} 
          controls 
          className="w-full h-full object-contain"
          poster={image_urls?.[0]} // Use first image as thumbnail if available
        />
      </div>
    );
  }

  return <ImageGrid images={image_urls ?? []} onView={(i) => openLightbox(image_urls ?? [], i)} />;
}

// ── IMAGE GRID ────────────────────────────────────────────────────────────────
function ImageGrid({ images, onView }: { images: string[], onView: (index: number) => void }) {
  if (!images || images.length === 0) return null
  const count = images.length
  const wrapperClass = "mt-3 rounded-2xl overflow-hidden border border-border bg-muted/30 relative"
  const imgClass = "w-full h-full object-cover hover:opacity-95 transition-all cursor-pointer"

  if (count === 1) return (
    <div className={wrapperClass} onClick={() => onView(0)}>
      <img
        src={images[0]}
        className="cursor-pointer rounded-2xl"
        style={{ maxHeight: "450px", width: "auto", maxWidth: "100%", display: "block", margin: "0 auto" }}
      />
    </div>
  )

  if (count === 2) return (
    <div className={wrapperClass} style={{ height: "320px" }}>
      <div className="flex gap-1 h-full">
        {images.slice(0, 2).map((url, i) => (
          <div key={i} className="flex-1 min-w-0" onClick={() => onView(i)}>
            <img src={url} className={imgClass} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className={wrapperClass} style={{ height: "400px" }}>
      <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
        {images.slice(0, 4).map((url, i) => (
          <div key={i} className="relative h-full w-full min-h-0" onClick={() => onView(i)}>
            <img src={url} className={imgClass} />
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

// ── PROFILE HOVER CARD ────────────────────────────────────────────────────────
function ProfileHoverCard({ profile, currentUserId, onClose }: {
  profile: any, currentUserId: string, onClose: () => void
}) {
  const supabase = createClient()
  const router = useRouter()
  const [isBlocked, setIsBlocked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [loading, setLoading] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      const [{ data: b }, { data: m }] = await Promise.all([
        supabase.from("blocks").select("id").eq("blocker_id", currentUserId).eq("blocked_id", profile.id).maybeSingle(),
        supabase.from("mutes").select("id").eq("muter_id", currentUserId).eq("muted_id", profile.id).maybeSingle()
      ])
      setIsBlocked(!!b); setIsMuted(!!m); setLoading(false)
    }
    fetchStatus()
  }, [profile.id])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  if (profile.id === currentUserId) return null
  return (
    <div ref={cardRef} className="absolute z-50 left-0 top-8 w-56 rounded-2xl border border-border bg-card shadow-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        {profile.avatar_url
          ? <img src={profile.avatar_url} className="size-10 rounded-full object-cover" />
          : <div className="size-10 rounded-full bg-muted" />}
        <div>
          <p className="text-sm font-semibold text-foreground">@{profile.username}</p>
          <p className="text-xs text-muted-foreground">Whisper user</p>
        </div>
      </div>
      <div className="border-t border-border pt-3 space-y-1">
        <button onClick={() => router.push(`/feed/user/${profile.id}`)} className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
          <User className="size-3.5" /> View profile
        </button>
        <button
          onClick={async () => {
            if (isMuted) { await supabase.from("mutes").delete().eq("muter_id", currentUserId).eq("muted_id", profile.id); setIsMuted(false) }
            else { await supabase.from("mutes").insert({ muter_id: currentUserId, muted_id: profile.id }); setIsMuted(true) }
          }}
          disabled={loading}
          className={`flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium transition-colors ${isMuted ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground hover:bg-muted"}`}
        >
          <VolumeX className="size-3.5" /> {isMuted ? "Unmute user" : "Mute user"}
        </button>
        <button
          onClick={async () => {
            if (isBlocked) { await supabase.from("blocks").delete().eq("blocker_id", currentUserId).eq("blocked_id", profile.id); setIsBlocked(false) }
            else { await supabase.from("blocks").insert({ blocker_id: currentUserId, blocked_id: profile.id }); setIsBlocked(true) }
          }}
          disabled={loading}
          className={`flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium transition-colors ${isBlocked ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-muted"}`}
        >
          <ShieldOff className="size-3.5" /> {isBlocked ? "Unblock user" : "Block user"}
        </button>
      </div>
    </div>
  )
}

// ── COMMENT NODE (recursive) ──────────────────────────────────────────────────
function CommentNode({
  comment, depth, allComments, currentUser, currentProfile, postId, postLocked,
  highlightedCommentId, onScrollTo, openLightbox, onReplySubmitted
}: {
  comment: any
  depth: number
  allComments: any[]
  currentUser: any
  currentProfile: any
  postId: string
  postLocked: boolean
  highlightedCommentId: string | null
  onScrollTo: (id: string) => void
  openLightbox: (images: string[], index: number) => void
  onReplySubmitted: () => void
}) {
  const supabase = createClient()
  const children = allComments.filter(c => c.parent_id === comment.id)
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [replyContent, setReplyContent] = useState("")
  const [replyImages, setReplyImages] = useState<File[]>([])
  const [replyImagePreviews, setReplyImagePreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [activeHover, setActiveHover] = useState<string | null>(null)
  const replyImageRef = useRef<HTMLInputElement>(null)
  const isHighlighted = highlightedCommentId === comment.id

  const handleSubmitReply = async () => {
    if (!currentUser || (!replyContent.trim() && replyImages.length === 0)) return
    setSubmitting(true)

    const image_urls: string[] = []
    for (const file of replyImages) {
      const ext = file.name.split(".").pop()
      const path = `${currentUser.id}/comments/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from("post-images").upload(path, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path)
        image_urls.push(urlData.publicUrl)
      }
    }

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUser.id,
      content: replyContent.trim(),
      parent_id: comment.id,
      image_urls,
    })

    if (error) {
      console.error("Reply error:", error)
      alert(`Failed to save reply: ${error.message}`)
      setSubmitting(false)
      return
    }

    setReplyContent("")
    setReplyImages([])
    setReplyImagePreviews([])
    setShowReplyBox(false)
    setExpanded(true)
    onReplySubmitted()
    setSubmitting(false)
  }

  return (
    <div className={depth > 0 ? "pl-3 sm:pl-5 border-l-2 border-border/50 mt-2" : ""}>
      <article
        id={`comment-${comment.id}`}
        className={`rounded-2xl border bg-card p-4 transition-all duration-700 ${
          isHighlighted
            ? "border-primary ring-2 ring-primary/40 bg-primary/5"
            : "border-border"
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="relative">
            <button
              onClick={() => setActiveHover(activeHover === comment.id ? null : comment.id)}
              className="flex items-center gap-1.5"
            >
              {comment.profiles?.avatar_url
                ? <img src={comment.profiles.avatar_url} className="size-6 rounded-full object-cover hover:ring-2 ring-primary transition-all" />
                : <div className="size-6 rounded-full bg-muted hover:ring-2 ring-primary transition-all" />}
              <span className="text-xs font-medium text-foreground hover:underline">
                @{comment.profiles?.username ?? "Anonymous"}
              </span>
            </button>
            {activeHover === comment.id && currentUser && comment.profiles && (
              <ProfileHoverCard
                profile={comment.profiles}
                currentUserId={currentUser.id}
                onClose={() => setActiveHover(null)}
              />
            )}
          </div>
          <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo(comment.created_at)}</span>
        </div>

        <HashtagText
          text={comment.content}
          className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap"
        />
        <ImageGrid images={comment.image_urls ?? []} onView={(i) => openLightbox(comment.image_urls ?? [], i)} />

        <div className="flex items-center gap-3 mt-3">
          {!postLocked && currentUser && (
            <button
              onClick={() => setShowReplyBox(v => !v)}
              className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              <CornerDownRight className="size-3" /> Reply
            </button>
          )}
          {children.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-[11px] font-medium text-primary/80 hover:text-primary transition-colors"
            >
              {expanded
                ? <><ChevronUp className="size-3" /> Collapse</>
                : <><ChevronDown className="size-3" /> {children.length} {children.length === 1 ? "reply" : "replies"}</>
              }
            </button>
          )}
        </div>
      </article>

      {showReplyBox && (
        <div className="mt-2 pl-3 sm:pl-5 border-l-2 border-primary/40">
          <div className="flex items-center gap-2 mb-2 mt-1">
            {currentProfile?.avatar_url
              ? <img src={currentProfile.avatar_url} className="size-5 rounded-full object-cover" />
              : <div className="size-5 rounded-full bg-muted" />}
            <span className="text-xs font-medium text-foreground">@{currentProfile?.username}</span>
          </div>
          <textarea
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            placeholder={`Reply to @${comment.profiles?.username ?? "Anonymous"}...`}
            autoFocus
            className="w-full border border-border rounded-xl p-2.5 h-20 resize-none bg-background text-xs outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {replyImagePreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {replyImagePreviews.map((preview, i) => (
                <div key={i} className="relative">
                  <img src={preview} className="size-14 rounded-xl object-cover border border-border" />
                  <button
                    onClick={() => {
                      setReplyImages(prev => prev.filter((_, j) => j !== i))
                      setReplyImagePreviews(prev => prev.filter((_, j) => j !== i))
                    }}
                    className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-foreground text-background flex items-center justify-center"
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-2 items-center">
            <button
              onClick={handleSubmitReply}
              disabled={submitting || (!replyContent.trim() && replyImages.length === 0)}
              className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {submitting ? "Replying..." : "Reply"}
            </button>
            <button
              onClick={() => {
                setShowReplyBox(false)
                setReplyContent("")
                setReplyImages([])
                setReplyImagePreviews([])
              }}
              className="px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/70 transition-colors"
            >
              Cancel
            </button>
            {replyImages.length < 4 && (
              <button
                onClick={() => replyImageRef.current?.click()}
                className="p-1.5 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ml-1"
              >
                <ImagePlus className="size-3.5" />
              </button>
            )}
            <input
              ref={replyImageRef}
              type="file"
              accept="image/*,.gif"
              multiple
              className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files ?? [])
                const toAdd = files.slice(0, 4 - replyImages.length)
                setReplyImages(prev => [...prev, ...toAdd])
                setReplyImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
                if (replyImageRef.current) replyImageRef.current.value = ""
              }}
            />
          </div>
        </div>
      )}

      {expanded && children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map(child => (
            <CommentNode
              key={child.id}
              comment={child}
              depth={depth + 1}
              allComments={allComments}
              currentUser={currentUser}
              currentProfile={currentProfile}
              postId={postId}
              postLocked={postLocked}
              highlightedCommentId={highlightedCommentId}
              onScrollTo={onScrollTo}
              openLightbox={openLightbox}
              onReplySubmitted={onReplySubmitted}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── POST PAGE ─────────────────────────────────────────────────────────────────
export default function PostPage() {
  const supabase = createClient()
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<any>(null)
  const [allComments, setAllComments] = useState<any[]>([])
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
    const { data } = await supabase
      .from("posts")
      .select("*, profiles(id, username, avatar_url)")
      .eq("id", id)
      .single()
    if (data) setPost(data)
  }

  const fetchAllComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(id, username, avatar_url)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
    if (data) setAllComments(data)
  }

  const fetchReactions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, count } = await supabase
      .from("reactions")
      .select("*", { count: "exact" })
      .eq("post_id", id)
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
    fetchAllComments()
    fetchReactions()
    fetchSavedAndWatch()
  }, [])

  const scrollToComment = (commentId: string) => {
    setHighlightedCommentId(commentId)
    let attempts = 0
    const tryScroll = () => {
      const el = document.getElementById(`comment-${commentId}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      } else if (attempts < 15) {
        attempts++
        setTimeout(tryScroll, 100)
      }
    }
    tryScroll()
    setTimeout(() => setHighlightedCommentId(null), 3500)
  }

  useEffect(() => {
    if (allComments.length === 0) return
    const hash = window.location.hash
    if (hash.startsWith("#comment-")) scrollToComment(hash.replace("#comment-", ""))
  }, [allComments])

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash
      if (hash.startsWith("#comment-")) scrollToComment(hash.replace("#comment-", ""))
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

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
    const toAdd = files.slice(0, 4 - commentImages.length)
    setCommentImages(prev => [...prev, ...toAdd])
    setCommentImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    if (commentImageRef.current) commentImageRef.current.value = ""
  }

  const handleComment = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || (!content.trim() && commentImages.length === 0)) return
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
    await supabase.from("comments").insert({
      post_id: id,
      user_id: user.id,
      content: content.trim(),
      image_urls,
    })
    setContent("")
    setCommentImages([])
    setCommentImagePreviews([])
    fetchAllComments()
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

  const topLevelComments = allComments.filter(c => !c.parent_id)

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
                <button
                  onClick={() => setActiveHover(activeHover === "post-author" ? null : "post-author")}
                  className="flex items-center gap-2"
                >
                  {post.profiles?.avatar_url
                    ? <img src={post.profiles.avatar_url} className="size-7 rounded-full object-cover hover:ring-2 ring-primary transition-all" />
                    : <div className="size-7 rounded-full bg-muted hover:ring-2 ring-primary transition-all" />}
                  <span className="text-sm font-medium text-foreground hover:underline">
                    @{post.profiles?.username ?? "Anonymous"}
                  </span>
                </button>
                {activeHover === "post-author" && currentUser && post.profiles && (
                  <ProfileHoverCard
                    profile={post.profiles}
                    currentUserId={currentUser.id}
                    onClose={() => setActiveHover(null)}
                  />
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
          
          <HashtagText
            text={post.content}
            className="mt-6 text-sm leading-relaxed text-muted-foreground border-t border-border pt-6 whitespace-pre-wrap block"
          />

          {/* Render Video or Image Grid */}
          <PostMedia post={post} openLightbox={openLightbox} />

          <div className="mt-6 flex items-center gap-5 border-t border-border pt-5">
            <button
              onClick={handleReaction}
              className={`flex items-center gap-1.5 text-xs transition-colors ${hasReacted ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
            >
              <Heart className={`size-3.5 ${hasReacted ? "fill-red-500" : ""}`} /> {reactions}
            </button>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="size-3.5" /> {allComments.length}
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 text-xs transition-colors ml-auto ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              <Bookmark className={`size-3.5 ${isSaved ? "fill-primary" : ""}`} /> {isSaved ? "Saved" : "Save"}
            </button>
            <button
              onClick={handleWatch}
              className={`flex items-center gap-1.5 text-xs transition-colors ${isWatching ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}
            >
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

      {topLevelComments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-4xl mb-4">💬</p>
          <p className="text-sm font-medium text-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevelComments.map(comment => (
            <CommentNode
              key={comment.id}
              comment={comment}
              depth={0}
              allComments={allComments}
              currentUser={currentUser}
              currentProfile={currentProfile}
              postId={id as string}
              postLocked={post?.locked ?? false}
              highlightedCommentId={highlightedCommentId}
              onScrollTo={scrollToComment}
              openLightbox={openLightbox}
              onReplySubmitted={fetchAllComments}
            />
          ))}
        </div>
      )}

      {post?.locked ? (
        <div className="flex items-center gap-2 text-sm text-orange-500 bg-orange-500/10 rounded-2xl px-6 py-4">
          <Lock className="size-4 shrink-0" /> The author has locked comments on this post
        </div>
      ) : (
        <article className="rounded-2xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
             {currentProfile?.avatar_url
              ? <img src={currentProfile.avatar_url} className="size-8 rounded-full object-cover" />
              : <div className="size-8 rounded-full bg-muted" />}
             <span className="text-sm font-medium">@{currentProfile?.username || 'Guest'}</span>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What are your thoughts?"
            className="w-full bg-transparent border-none focus:ring-0 text-sm h-32 resize-none"
          />
          {commentImagePreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              {commentImagePreviews.map((p, i) => (
                <div key={i} className="relative size-20">
                  <img src={p} className="w-full h-full object-cover rounded-lg border" />
                  <button 
                    onClick={() => {
                      setCommentImages(prev => prev.filter((_, idx) => idx !== i));
                      setCommentImagePreviews(prev => prev.filter((_, idx) => idx !== i));
                    }}
                    className="absolute -top-2 -right-2 bg-foreground text-background rounded-full p-0.5"
                  >
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-4">
            <button 
              onClick={() => commentImageRef.current?.click()}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ImagePlus className="size-5" />
            </button>
            <input 
              ref={commentImageRef}
              type="file" 
              className="hidden" 
              accept="image/*" 
              multiple 
              onChange={handleCommentImageSelect}
            />
            <Button onClick={handleComment} disabled={!content.trim() && commentImages.length === 0}>
              Post Comment
            </Button>
          </div>
        </article>
      )}
    </div>
  )
}