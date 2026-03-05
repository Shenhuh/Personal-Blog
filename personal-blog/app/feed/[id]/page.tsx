"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { HashtagText } from "@/components/HashtagText"
import {
  Heart, MessageCircle, Clock, ArrowLeft, Eye, Lock, VolumeX, ShieldOff,
  User, Bookmark, Bell, ImagePlus, X as XIcon, ChevronLeft, ChevronRight,
  CornerDownRight, ChevronDown, ChevronUp
} from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"

// ── Flair accent colors (same system as PostCard) ─────────────────────────────
const flairAccent: Record<string, { bg: string; text: string; dot: string; bar: string }> = {
  Gaming:     { bg: "rgba(99,102,241,0.12)",  text: "#818cf8", dot: "#6366f1", bar: "#6366f1" },
  Confession: { bg: "rgba(244,63,94,0.10)",   text: "#fb7185", dot: "#f43f5e", bar: "#f43f5e" },
  Advice:     { bg: "rgba(34,197,94,0.10)",   text: "#4ade80", dot: "#22c55e", bar: "#22c55e" },
  General:    { bg: "rgba(148,163,184,0.10)", text: "#94a3b8", dot: "#64748b", bar: "#64748b" },
  Question:   { bg: "rgba(251,191,36,0.10)",  text: "#fbbf24", dot: "#f59e0b", bar: "#f59e0b" },
  Random:     { bg: "rgba(249,115,22,0.10)",  text: "#fb923c", dot: "#f97316", bar: "#f97316" },
  Rant:       { bg: "rgba(239,68,68,0.10)",   text: "#f87171", dot: "#ef4444", bar: "#ef4444" },
  Story:      { bg: "rgba(168,85,247,0.10)",  text: "#c084fc", dot: "#a855f7", bar: "#a855f7" },
}
const defaultAccent = { bg: "rgba(148,163,184,0.10)", text: "#94a3b8", dot: "#64748b", bar: "#64748b" }

// ── Brightness hook (for cover photo popup) ───────────────────────────────────
function useImageBrightness(imageUrl: string | null) {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    if (!imageUrl) return
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = imageUrl
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d"); if (!ctx) return
      canvas.width = 50; canvas.height = 20
      ctx.drawImage(img, 0, 0, 50, 20)
      const { data } = ctx.getImageData(0, 0, 50, 20)
      let total = 0; const count = data.length / 4
      for (let i = 0; i < data.length; i += 4)
        total += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
      setIsDark(total / count < 128)
    }
  }, [imageUrl])
  return isDark
}

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
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors">
        <XIcon className="size-6" />
      </button>
      {images.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); setCurrent(p => Math.max(p - 1, 0)) }} disabled={current === 0}
          className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors">
          <ChevronLeft className="size-6" />
        </button>
        <button onClick={e => { e.stopPropagation(); setCurrent(p => Math.min(p + 1, images.length - 1)) }} disabled={current === images.length - 1}
          className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full disabled:opacity-30 transition-colors">
          <ChevronRight className="size-6" />
        </button>
      </>}
      <img src={images[current]} onClick={e => e.stopPropagation()} className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl" />
      {images.length > 1 && (
        <div className="absolute bottom-4 flex gap-2">
          {images.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setCurrent(i) }}
              className={`size-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── IMAGE GRID ────────────────────────────────────────────────────────────────
function ImageGrid({ images, onView }: { images: string[], onView: (index: number) => void }) {
  if (!images || images.length === 0) return null
  const count = images.length
  const imgClass = "w-full h-full object-cover hover:opacity-95 transition-all cursor-pointer"

  if (count === 1) return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-border/50 cursor-pointer" onClick={() => onView(0)}>
      <img src={images[0]} className="cursor-pointer rounded-2xl max-h-[480px] w-auto max-w-full block mx-auto" />
    </div>
  )
  if (count === 2) return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-border/50" style={{ height: 320 }}>
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
    <div className="mt-4 rounded-2xl overflow-hidden border border-border/50" style={{ height: 400 }}>
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

// ── MEDIA RENDERER ────────────────────────────────────────────────────────────
function PostMedia({ post, openLightbox }: { post: any, openLightbox: (images: string[], index: number) => void }) {
  const { image_urls, video_url } = post
  if (video_url) return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-border/50 bg-black relative aspect-video max-h-[450px]">
      <video src={video_url} controls className="w-full h-full object-contain" poster={image_urls?.[0]} />
    </div>
  )
  return <ImageGrid images={image_urls ?? []} onView={(i) => openLightbox(image_urls ?? [], i)} />
}

// ── PROFILE HOVER CARD (with cover photo background) ─────────────────────────
function ProfileHoverCard({ profile, currentUserId, onClose }: {
  profile: any, currentUserId: string, onClose: () => void
}) {
  const supabase = createClient()
  const router = useRouter()
  const [isBlocked, setIsBlocked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [loading, setLoading] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)
  const isDark = useImageBrightness(profile.cover_url ?? null)
  const hasCover = !!profile.cover_url

  const textPrimary  = isDark ? "rgba(255,255,255,1)"    : hasCover ? "rgba(0,0,0,0.9)"   : "hsl(var(--foreground))"
  const textMuted    = isDark ? "rgba(255,255,255,0.65)" : hasCover ? "rgba(0,0,0,0.55)"  : "hsl(var(--muted-foreground))"
  const menuHover    = isDark ? "rgba(255,255,255,0.12)" : hasCover ? "rgba(0,0,0,0.08)"  : "hsl(var(--muted))"
  const dividerColor = isDark ? "rgba(255,255,255,0.15)" : hasCover ? "rgba(0,0,0,0.1)"   : "hsl(var(--border))"

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
    <div
      ref={cardRef}
      className="absolute z-50 left-0 top-9 w-60 rounded-2xl border overflow-hidden shadow-2xl"
      style={{
        borderColor: hasCover ? (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)") : "hsl(var(--border))",
        background: hasCover
          ? `url(${profile.cover_url}) center/cover no-repeat`
          : "hsl(var(--card))",
      }}
    >
      {/* Overlay */}
      {hasCover && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.72)" }} />
      )}

      <div className="relative z-10 p-4">
        {/* Profile header */}
        <div className="flex items-center gap-3 mb-3">
          {profile.avatar_url
            ? <img src={profile.avatar_url} className="size-11 rounded-full object-cover"
                style={{ boxShadow: `0 0 0 2px ${hasCover ? (isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)") : "hsl(var(--border))"}` }} />
            : <div className="size-11 rounded-full bg-muted/60" />}
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: textPrimary }}>
              @{profile.username}
            </p>
            {profile.bio && (
              <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: textMuted }}>
                {profile.bio}
              </p>
            )}
            {!profile.bio && (
              <p className="text-[11px] mt-0.5 italic" style={{ color: textMuted }}>Whisper user</p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mb-3 h-px" style={{ background: dividerColor ?? "hsl(var(--border))" }} />

        {/* Actions */}
        <div className="space-y-1">
          {[
            {
              icon: <User className="size-3.5" />,
              label: "View profile",
              onClick: () => router.push(`/feed/user/${profile.id}`),
              color: textMuted,
            },
            {
              icon: <VolumeX className="size-3.5" />,
              label: isMuted ? "Unmute user" : "Mute user",
              onClick: async () => {
                if (isMuted) { await supabase.from("mutes").delete().eq("muter_id", currentUserId).eq("muted_id", profile.id); setIsMuted(false) }
                else { await supabase.from("mutes").insert({ muter_id: currentUserId, muted_id: profile.id }); setIsMuted(true) }
              },
              color: isMuted ? "#f59e0b" : textMuted,
              disabled: loading,
            },
            {
              icon: <ShieldOff className="size-3.5" />,
              label: isBlocked ? "Unblock user" : "Block user",
              onClick: async () => {
                if (isBlocked) { await supabase.from("blocks").delete().eq("blocker_id", currentUserId).eq("blocked_id", profile.id); setIsBlocked(false) }
                else { await supabase.from("blocks").insert({ blocker_id: currentUserId, blocked_id: profile.id }); setIsBlocked(true) }
              },
              color: isBlocked ? "#ef4444" : textMuted,
              disabled: loading,
            },
          ].map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              disabled={item.disabled}
              className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-xs font-medium transition-all"
              style={{ color: item.color, background: "transparent" }}
              onMouseEnter={e => (e.currentTarget.style.background = menuHover ?? "hsl(var(--muted))")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── COMMENT NODE ──────────────────────────────────────────────────────────────
function CommentNode({
  comment, depth, allComments, currentUser, currentProfile, postId, postLocked,
  highlightedCommentId, onScrollTo, openLightbox, onReplySubmitted
}: {
  comment: any; depth: number; allComments: any[]; currentUser: any; currentProfile: any
  postId: string; postLocked: boolean; highlightedCommentId: string | null
  onScrollTo: (id: string) => void; openLightbox: (images: string[], index: number) => void
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
      post_id: postId, user_id: currentUser.id,
      content: replyContent.trim(), parent_id: comment.id, image_urls,
    })
    if (error) { alert(`Failed to save reply: ${error.message}`); setSubmitting(false); return }
    setReplyContent(""); setReplyImages([]); setReplyImagePreviews([])
    setShowReplyBox(false); setExpanded(true); onReplySubmitted(); setSubmitting(false)
  }

  return (
    <div className={depth > 0 ? "pl-3 sm:pl-5 border-l-2 border-border/40 mt-2" : ""}>
      <article
        id={`comment-${comment.id}`}
        className="rounded-2xl p-4 transition-all duration-500"
        style={{
          background: isHighlighted ? "hsl(var(--primary) / 0.06)" : "hsl(var(--card))",
          border: `1px solid ${isHighlighted ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border))"}`,
          boxShadow: isHighlighted ? "0 0 0 3px hsl(var(--primary) / 0.15)" : "none",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <button
              onClick={() => setActiveHover(activeHover === comment.id ? null : comment.id)}
              className="flex items-center gap-2 group"
            >
              {comment.profiles?.avatar_url
                ? <img src={comment.profiles.avatar_url} className="size-7 rounded-full object-cover ring-1 ring-border group-hover:ring-primary/50 transition-all" />
                : <div className="size-7 rounded-full bg-muted ring-1 ring-border" />}
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                @{comment.profiles?.username ?? "Anonymous"}
              </span>
            </button>
            {activeHover === comment.id && currentUser && comment.profiles && (
              <ProfileHoverCard profile={comment.profiles} currentUserId={currentUser.id} onClose={() => setActiveHover(null)} />
            )}
          </div>
          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
            <Clock className="size-2.5" />{timeAgo(comment.created_at)}
          </span>
        </div>

        <HashtagText text={comment.content} className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap" />
        <ImageGrid images={comment.image_urls ?? []} onView={(i) => openLightbox(comment.image_urls ?? [], i)} />

        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/50">
          {!postLocked && currentUser && (
            <button onClick={() => setShowReplyBox(v => !v)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors">
              <CornerDownRight className="size-3" /> Reply
            </button>
          )}
          {children.length > 0 && (
            <button onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
              {expanded
                ? <><ChevronUp className="size-3" /> Collapse</>
                : <><ChevronDown className="size-3" /> {children.length} {children.length === 1 ? "reply" : "replies"}</>}
            </button>
          )}
        </div>
      </article>

      {showReplyBox && (
        <div className="mt-2 pl-4 border-l-2 border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            {currentProfile?.avatar_url
              ? <img src={currentProfile.avatar_url} className="size-6 rounded-full object-cover" />
              : <div className="size-6 rounded-full bg-muted" />}
            <span className="text-xs font-semibold text-foreground">@{currentProfile?.username}</span>
          </div>
          <textarea
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            placeholder={`Reply to @${comment.profiles?.username ?? "Anonymous"}...`}
            autoFocus
            className="w-full border border-border rounded-xl p-3 h-20 resize-none bg-card text-xs outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
          />
          {replyImagePreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {replyImagePreviews.map((preview, i) => (
                <div key={i} className="relative">
                  <img src={preview} className="size-14 rounded-xl object-cover border border-border" />
                  <button onClick={() => { setReplyImages(p => p.filter((_, j) => j !== i)); setReplyImagePreviews(p => p.filter((_, j) => j !== i)) }}
                    className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-foreground text-background flex items-center justify-center">
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-2 items-center">
            <button onClick={handleSubmitReply} disabled={submitting || (!replyContent.trim() && replyImages.length === 0)}
              className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors">
              {submitting ? "Replying..." : "Reply"}
            </button>
            <button onClick={() => { setShowReplyBox(false); setReplyContent(""); setReplyImages([]); setReplyImagePreviews([]) }}
              className="px-4 py-1.5 rounded-full border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            {replyImages.length < 4 && (
              <button onClick={() => replyImageRef.current?.click()}
                className="p-1.5 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground ml-1">
                <ImagePlus className="size-3.5" />
              </button>
            )}
            <input ref={replyImageRef} type="file" accept="image/*,.gif" multiple className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files ?? [])
                const toAdd = files.slice(0, 4 - replyImages.length)
                setReplyImages(p => [...p, ...toAdd])
                setReplyImagePreviews(p => [...p, ...toAdd.map(f => URL.createObjectURL(f))])
                if (replyImageRef.current) replyImageRef.current.value = ""
              }} />
          </div>
        </div>
      )}

      {expanded && children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map(child => (
            <CommentNode key={child.id} comment={child} depth={depth + 1} allComments={allComments}
              currentUser={currentUser} currentProfile={currentProfile} postId={postId}
              postLocked={postLocked} highlightedCommentId={highlightedCommentId}
              onScrollTo={onScrollTo} openLightbox={openLightbox} onReplySubmitted={onReplySubmitted} />
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

  const accent = post ? (flairAccent[post.flair] ?? defaultAccent) : defaultAccent
  const openLightbox = (images: string[], index: number) => { setLightboxImages(images); setLightboxIndex(index) }

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
      .select("*, profiles(id, username, avatar_url, cover_url, bio)")
      .eq("id", id).single()
    if (data) setPost(data)
  }

  const fetchAllComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, profiles(id, username, avatar_url, cover_url, bio)")
      .eq("post_id", id).order("created_at", { ascending: true })
    if (data) setAllComments(data)
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
    setIsSaved(!!savedData); setIsWatching(!!watchData)
  }

  useEffect(() => {
    fetchCurrentUser(); fetchPost(); fetchAllComments(); fetchReactions(); fetchSavedAndWatch()
  }, [])

  const scrollToComment = (commentId: string) => {
    setHighlightedCommentId(commentId)
    let attempts = 0
    const tryScroll = () => {
      const el = document.getElementById(`comment-${commentId}`)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
      else if (attempts++ < 15) setTimeout(tryScroll, 100)
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
      .on("presence", { event: "sync" }, () => setViewers(Object.keys(channel.presenceState()).length))
      .subscribe(async (status) => { if (status === "SUBSCRIBED") await channel.track({ user: Math.random() }) })
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
    if (!user || (!content.trim() && commentImages.length === 0) || post?.locked) return
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
    await supabase.from("comments").insert({ post_id: id, user_id: user.id, content: content.trim(), image_urls })
    setContent(""); setCommentImages([]); setCommentImagePreviews([])
    fetchAllComments()
  }

  const handleReaction = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (hasReacted) await supabase.from("reactions").delete().eq("post_id", id).eq("user_id", user.id)
    else await supabase.from("reactions").insert({ post_id: id, user_id: user.id })
    fetchReactions()
  }

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (isSaved) { await supabase.from("saved_whispers").delete().eq("user_id", user.id).eq("post_id", id); setIsSaved(false) }
    else { await supabase.from("saved_whispers").insert({ user_id: user.id, post_id: id }); setIsSaved(true) }
  }

  const handleWatch = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (isWatching) { await supabase.from("post_notification_preferences").delete().eq("user_id", user.id).eq("post_id", id); setIsWatching(false) }
    else { await supabase.from("post_notification_preferences").insert({ user_id: user.id, post_id: id }); setIsWatching(true) }
  }

  const topLevelComments = allComments.filter(c => !c.parent_id)

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
      {lightboxImages.length > 0 && (
        <Lightbox images={lightboxImages} startIndex={lightboxIndex} onClose={() => setLightboxImages([])} />
      )}

      {/* Back button */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" /> Back
      </button>

      {/* ── POST ARTICLE ── */}
      {post && (
        <article className="rounded-3xl overflow-hidden border border-border bg-card shadow-sm">

          {/* Flair accent bar */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accent.bar}, ${accent.bar}60)` }} />

          <div className="p-6 md:p-8">

            {/* ── Author row ── */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <button
                    onClick={() => setActiveHover(activeHover === "post-author" ? null : "post-author")}
                    className="flex items-center gap-2.5 group"
                  >
                    {post.profiles?.avatar_url
                      ? <img src={post.profiles.avatar_url} className="size-9 rounded-full object-cover ring-2 ring-border group-hover:ring-primary/40 transition-all" />
                      : <div className="size-9 rounded-full bg-muted ring-2 ring-border" />}
                    <div>
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                        @{post.profiles?.username ?? "Anonymous"}
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="size-2.5" />{timeAgo(post.created_at)}
                      </p>
                    </div>
                  </button>
                  {activeHover === "post-author" && currentUser && post.profiles && (
                    <ProfileHoverCard profile={post.profiles} currentUserId={currentUser.id} onClose={() => setActiveHover(null)} />
                  )}
                </div>

                {/* Flair pill */}
                <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: accent.bg }}>
                  <span className="size-[5px] rounded-full" style={{ background: accent.dot }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent.text }}>
                    {post.flair}
                  </span>
                </div>
              </div>

              {/* Viewer count */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 rounded-full px-3 py-1.5 bg-muted/50">
                <Eye className="size-3.5" /> <span>{viewers} reading</span>
              </div>
            </div>

            {/* ── Title ── */}
            <h1 className="text-2xl md:text-3xl leading-snug text-foreground font-semibold tracking-tight mb-1">
              {post.title}
            </h1>

            {/* ── Content ── */}
            <div className="mt-5 pt-5 border-t border-border/60">
              <HashtagText
                text={post.content}
                className="text-[15px] leading-relaxed text-foreground/85 whitespace-pre-wrap block"
              />
            </div>

            {/* ── Media ── */}
            <PostMedia post={post} openLightbox={openLightbox} />

            {/* ── Action bar ── */}
            <div className="mt-6 pt-5 border-t border-border flex items-center gap-2 flex-wrap">
              <button
                onClick={handleReaction}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: hasReacted ? "rgba(244,63,94,0.12)" : "hsl(var(--muted) / 0.6)",
                  color: hasReacted ? "#f43f5e" : "hsl(var(--muted-foreground))",
                }}
              >
                <Heart className={`size-3.5 transition-transform ${hasReacted ? "fill-rose-500 scale-110" : ""}`} />
                {reactions}
              </button>

              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/60 text-muted-foreground">
                <MessageCircle className="size-3.5" /> {allComments.length}
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: isSaved ? "hsl(var(--primary) / 0.12)" : "hsl(var(--muted) / 0.6)",
                    color: isSaved ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  }}>
                  <Bookmark className={`size-3.5 ${isSaved ? "fill-primary" : ""}`} />
                  {isSaved ? "Saved" : "Save"}
                </button>

                <button onClick={handleWatch}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: isWatching ? "rgba(245,158,11,0.12)" : "hsl(var(--muted) / 0.6)",
                    color: isWatching ? "#f59e0b" : "hsl(var(--muted-foreground))",
                  }}>
                  <Bell className={`size-3.5 ${isWatching ? "fill-amber-400" : ""}`} />
                  {isWatching ? "Watching" : "Watch"}
                </button>
              </div>
            </div>
          </div>
        </article>
      )}

      {/* ── COMMENTS SECTION ── */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="font-serif text-xl font-bold text-foreground">
          Comments
          {allComments.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({allComments.length})</span>
          )}
        </h2>
        {post?.locked && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 bg-orange-500/10 rounded-full px-3 py-1.5">
            <Lock className="size-3" /> Locked
          </div>
        )}
      </div>

      {topLevelComments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border border-dashed border-border bg-card/50">
          <p className="text-3xl mb-3">💬</p>
          <p className="text-sm font-semibold text-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topLevelComments.map(comment => (
            <CommentNode key={comment.id} comment={comment} depth={0} allComments={allComments}
              currentUser={currentUser} currentProfile={currentProfile} postId={id as string}
              postLocked={post?.locked ?? false} highlightedCommentId={highlightedCommentId}
              onScrollTo={scrollToComment} openLightbox={openLightbox} onReplySubmitted={fetchAllComments} />
          ))}
        </div>
      )}

      {/* ── COMMENT COMPOSER ── */}
      {post?.locked ? (
        <div className="flex items-center gap-3 text-sm text-orange-500 bg-orange-500/10 rounded-2xl px-5 py-4 border border-orange-500/20">
          <Lock className="size-4 shrink-0" /> The author has locked comments on this post
        </div>
      ) : (
        <article className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            {currentProfile?.avatar_url
              ? <img src={currentProfile.avatar_url} className="size-9 rounded-full object-cover ring-2 ring-border" />
              : <div className="size-9 rounded-full bg-muted ring-2 ring-border" />}
            <div>
              <p className="text-sm font-bold text-foreground">@{currentProfile?.username || "Guest"}</p>
              <p className="text-[10px] text-muted-foreground">Leave a comment</p>
            </div>
          </div>

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="What are your thoughts?"
            className="w-full bg-muted/30 border border-border rounded-2xl p-4 text-sm h-28 resize-none outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all text-foreground placeholder:text-muted-foreground"
          />

          {commentImagePreviews.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-3">
              {commentImagePreviews.map((p, i) => (
                <div key={i} className="relative size-20">
                  <img src={p} className="w-full h-full object-cover rounded-xl border border-border" />
                  <button onClick={() => { setCommentImages(prev => prev.filter((_, idx) => idx !== i)); setCommentImagePreviews(prev => prev.filter((_, idx) => idx !== i)) }}
                    className="absolute -top-2 -right-2 bg-foreground text-background rounded-full p-0.5 size-5 flex items-center justify-center">
                    <XIcon className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <button onClick={() => commentImageRef.current?.click()}
              className="p-2 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              <ImagePlus className="size-4" />
            </button>
            <input ref={commentImageRef} type="file" className="hidden" accept="image/*" multiple onChange={handleCommentImageSelect} />

            <Button
              onClick={handleComment}
              disabled={!content.trim() && commentImages.length === 0}
              className="rounded-full px-6 text-sm font-semibold"
            >
              Post Comment
            </Button>
          </div>
        </article>
      )}
    </div>
  )
}