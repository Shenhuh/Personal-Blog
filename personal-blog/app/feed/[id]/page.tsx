"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Clock, ArrowLeft, Eye, Lock, VolumeX, ShieldOff, User, Bookmark, Bell, ImagePlus, X as XIcon } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"

function ProfileHoverCard({ profile, currentUserId, onClose }: {
  profile: any
  currentUserId: string
  onClose: () => void
}) {
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
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose()
      }
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
        {profile.avatar_url ? (
          <img src={profile.avatar_url} className="size-10 rounded-full object-cover" />
        ) : (
          <div className="size-10 rounded-full bg-muted" />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">@{profile.username}</p>
          <p className="text-xs text-muted-foreground">Whisper user</p>
        </div>
      </div>
      <div className="border-t border-border pt-3 space-y-1">
        <button
          onClick={() => router.push(`/feed/user/${profile.id}`)}
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          <User className="size-3.5" />
          View profile
        </button>
        <button
          onClick={handleMute}
          disabled={loading}
          className={`flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
            isMuted ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <VolumeX className="size-3.5" />
          {isMuted ? "Unmute user" : "Mute user"}
        </button>
        <button
          onClick={handleBlock}
          disabled={loading}
          className={`flex items-center gap-2 w-full rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
            isBlocked ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <ShieldOff className="size-3.5" />
          {isBlocked ? "Unblock user" : "Block user"}
        </button>
      </div>
    </div>
  )
}

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
  const [commentImage, setCommentImage] = useState<File | null>(null)
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null)
  const commentImageRef = useRef<HTMLInputElement>(null)

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
    fetchComments()
    fetchReactions()
    fetchSavedAndWatch()
  }, [])

  useEffect(() => {
    const channel = supabase.channel(`post-${id}`)
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        setViewers(Object.keys(state).length)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user: Math.random() })
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [id])

  const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCommentImage(file)
    setCommentImagePreview(URL.createObjectURL(file))
  }

  const handleComment = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !content) return
    if (post?.locked) return

    let image_url = null
    if (commentImage) {
      const ext = commentImage.name.split(".").pop()
      const path = `${user.id}/comments/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from("post-images").upload(path, commentImage)
      if (!error) {
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path)
        image_url = urlData.publicUrl
      }
    }

    await supabase.from("comments").insert({ post_id: id, user_id: user.id, content, image_url })
    setContent("")
    setCommentImage(null)
    setCommentImagePreview(null)
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

      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back
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
                  {post.profiles?.avatar_url ? (
                    <img src={post.profiles.avatar_url} className="size-7 rounded-full object-cover hover:ring-2 ring-primary transition-all" />
                  ) : (
                    <div className="size-7 rounded-full bg-muted hover:ring-2 ring-primary transition-all" />
                  )}
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
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
                {post.flair}
              </Badge>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {timeAgo(post.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <Eye className="size-3.5" />
              <span>{viewers} reading</span>
            </div>
          </div>

          <h1 className="mt-4 font-serif text-2xl leading-snug text-foreground md:text-3xl">
            {post.title}
          </h1>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground border-t border-border pt-6">
            {post.content}
          </p>

          {post.image_url && (
  <img
    src={post.image_url}
    className="mt-4 w-full rounded-xl border border-border"
    style={{ maxHeight: "600px", objectFit: "contain", background: "hsl(var(--muted))" }}
  />
)}

          <div className="mt-6 flex items-center gap-5 border-t border-border pt-5">
            <button
              onClick={handleReaction}
              className={`flex items-center gap-1.5 text-xs transition-colors ${hasReacted ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
            >
              <Heart className={`size-3.5 ${hasReacted ? "fill-red-500" : ""}`} />
              {reactions}
            </button>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="size-3.5" />
              {comments.length}
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 text-xs transition-colors ml-auto ${isSaved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            >
              <Bookmark className={`size-3.5 ${isSaved ? "fill-primary" : ""}`} />
              {isSaved ? "Saved" : "Save"}
            </button>
            <button
              onClick={handleWatch}
              className={`flex items-center gap-1.5 text-xs transition-colors ${isWatching ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}
            >
              <Bell className={`size-3.5 ${isWatching ? "fill-yellow-500" : ""}`} />
              {isWatching ? "Watching" : "Watch"}
            </button>
          </div>
        </article>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-foreground">Comments</h2>
        {post?.locked && (
          <div className="flex items-center gap-1.5 text-xs text-orange-500 bg-orange-500/10 rounded-full px-3 py-1.5">
            <Lock className="size-3" />
            Comments locked
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
        <div className="h-[400px] overflow-y-auto space-y-4 pr-2">
          {comments.map(comment => (
            <article key={comment.id} className="rounded-2xl border border-border bg-card p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                  <button
                    onClick={() => setActiveHover(activeHover === comment.id ? null : comment.id)}
                    className="flex items-center gap-2"
                  >
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} className="size-6 rounded-full object-cover hover:ring-2 ring-primary transition-all" />
                    ) : (
                      <div className="size-6 rounded-full bg-muted hover:ring-2 ring-primary transition-all" />
                    )}
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
                <span className="text-xs text-muted-foreground ml-auto">
                  {timeAgo(comment.created_at)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{comment.content}</p>
              {comment.image_url && (
                <img
                  src={comment.image_url}
                  className="mt-3 max-h-48 rounded-xl object-cover border border-border"
                />
              )}
            </article>
          ))}
        </div>
      )}

      {post?.locked ? (
        <div className="flex items-center gap-2 text-sm text-orange-500 bg-orange-500/10 rounded-2xl px-6 py-4">
          <Lock className="size-4 shrink-0" />
          The author has locked comments on this post
        </div>
      ) : (
        <article className="rounded-2xl border border-border bg-card p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            {currentProfile?.avatar_url ? (
              <img src={currentProfile.avatar_url} className="size-7 rounded-full object-cover" />
            ) : (
              <div className="size-7 rounded-full bg-muted" />
            )}
            <span className="text-sm font-medium text-foreground">
              @{currentProfile?.username ?? "Write a comment"}
            </span>
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Share your thoughts anonymously..."
            className="w-full border rounded-xl p-3 mb-3 h-24 resize-none bg-background text-sm"
          />
          {commentImagePreview && (
            <div className="relative mb-3 inline-block">
              <img src={commentImagePreview} className="max-h-40 rounded-xl object-cover border border-border" />
              <button
                onClick={() => { setCommentImage(null); setCommentImagePreview(null) }}
                className="absolute -top-2 -right-2 size-5 rounded-full bg-foreground text-background flex items-center justify-center"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button onClick={handleComment} className="rounded-full">
              Comment
            </Button>
            <button
              onClick={() => commentImageRef.current?.click()}
              className="p-2 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Add image or GIF"
            >
              <ImagePlus className="size-4" />
            </button>
            <input
              ref={commentImageRef}
              type="file"
              accept="image/*,.gif"
              className="hidden"
              onChange={handleCommentImageSelect}
            />
          </div>
        </article>
      )}

    </div>
  )
}