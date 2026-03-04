"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Camera, Check, X, Pencil, Trash2, Lock, Unlock,
  AlertCircle, ImagePlus, CalendarDays, Move, Eye
} from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"
import { PostCard } from "@/components/PostCard"

const sortOptions = ["Latest", "Top Liked", "Most Commented", "Trending"]

function formatJoinDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

// ── DRAGGABLE IMAGE ──────────────────────────────────────────────────────────
interface DraggableImageProps {
  position: { x: number; y: number }
  onChange: (pos: { x: number; y: number }) => void
  src: string
  className?: string
  editing: boolean
}

function DraggableImage({ src, position, onChange, className, editing }: DraggableImageProps) {
  const dragging = useRef(false)
  const start = useRef({ mx: 0, my: 0, px: 0, py: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    start.current = { mx: e.clientX, my: e.clientY, px: position.x, py: position.y }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - start.current.mx) / rect.width) * 100
    const dy = ((e.clientY - start.current.my) / rect.height) * 100
    onChange({
      x: Math.min(100, Math.max(0, start.current.px - dx)),
      y: Math.min(100, Math.max(0, start.current.py - dy)),
    })
  }

  const onPointerUp = () => { dragging.current = false }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className ?? ""}`}>
      <img
        src={src}
        className="w-full h-full object-cover select-none"
        style={{
          objectPosition: `${position.x}% ${position.y}%`,
          cursor: editing ? "grab" : "default",
          userSelect: "none",
        } as React.CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDragStart={e => e.preventDefault()}
      />
      {editing && (
        <div className="absolute inset-0 pointer-events-none border-2 border-primary/60 ring-2 ring-primary/20" />
      )}
    </div>
  )
}

// ── POPOVER MENU ─────────────────────────────────────────────────────────────
interface PopoverMenuProps {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  hasImage: boolean
  onView?: () => void
  onChange: () => void
  onReposition?: () => void
  repositionMode?: boolean
  repositionSrc?: string | null
  repositionPos?: { x: number; y: number }
  onRepositionChange?: (pos: { x: number; y: number }) => void
  onRepositionSave?: () => void
  onRepositionCancel?: () => void
  uploading?: boolean
}

function PopoverMenu({
  open, onClose, anchorRef, hasImage,
  onView, onChange, onReposition,
  repositionMode, repositionSrc, repositionPos, onRepositionChange,
  onRepositionSave, onRepositionCancel, uploading,
}: PopoverMenuProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", top: -9999, left: -9999, zIndex: 50, visibility: "hidden" })

  useEffect(() => {
    const update = () => {
      if (!anchorRef.current) return
      const anchor = (anchorRef.current as HTMLElement).getBoundingClientRect()
      const popW = repositionMode ? 288 : 192
      let left = anchor.left + anchor.width / 2 - popW / 2
      left = Math.max(8, Math.min(left, window.innerWidth - popW - 8))
      setStyle({ position: "fixed", top: anchor.bottom + 8, left, width: popW, zIndex: 50, visibility: "visible" })
    }
    if (open) {
      requestAnimationFrame(() => { requestAnimationFrame(update) })
      window.addEventListener("scroll", update, true)
      window.addEventListener("resize", update)
    } else {
      setStyle({ position: "fixed", top: -9999, left: -9999, zIndex: 50, visibility: "hidden" })
    }
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open, anchorRef, repositionMode])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose, anchorRef])

  if (!open && style.visibility === "hidden") return null

  if (repositionMode && repositionSrc && repositionPos && onRepositionChange) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
        <div className="flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur border-b border-border shrink-0">
          <span className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Move className="size-4 text-muted-foreground" /> Drag to reposition
          </span>
          <button onClick={onRepositionCancel} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <DraggableImage
            src={repositionSrc}
            position={repositionPos}
            onChange={onRepositionChange}
            editing={true}
            className="w-full h-full"
          />
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none">
            Drag anywhere to adjust position
          </p>
        </div>
        <div className="flex gap-3 p-4 bg-card/95 backdrop-blur border-t border-border shrink-0">
          <button
            onClick={onRepositionCancel}
            className="flex-1 py-3 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium text-muted-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRepositionSave}
            disabled={uploading}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {uploading
              ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Check className="size-4" />}
            {uploading ? "Saving..." : "Save position"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={popoverRef} style={style} className="bg-card border border-border rounded-xl shadow-xl overflow-hidden py-1">
      {hasImage && onView && (
        <button
          onClick={() => { onView(); onClose() }}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-muted transition-colors text-sm text-foreground"
        >
          <Eye className="size-4 text-muted-foreground shrink-0" />
          View photo
        </button>
      )}
      <button
        onClick={() => { onChange(); onClose() }}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-muted transition-colors text-sm text-foreground"
      >
        <Camera className="size-4 text-muted-foreground shrink-0" />
        {hasImage ? "Change photo" : "Upload photo"}
      </button>
      {hasImage && onReposition && (
        <button
          onClick={onReposition}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-muted transition-colors text-sm text-foreground"
        >
          <Move className="size-4 text-muted-foreground shrink-0" />
          Reposition
        </button>
      )}
    </div>
  )
}
// ────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [editingBio, setEditingBio] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "same">("idle")
  const [savingUsername, setSavingUsername] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const [posts, setPosts] = useState<any[]>([])
  const [filteredPosts, setFilteredPosts] = useState<any[]>([])
  const [editingPost, setEditingPost] = useState<any>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [activeTab, setActiveTab] = useState<"posts" | "settings">("posts")
  const [currentSort, setCurrentSort] = useState("Latest")

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)

  const [avatarPopoverOpen, setAvatarPopoverOpen] = useState(false)
  const [coverPopoverOpen, setCoverPopoverOpen] = useState(false)
  const [avatarRepositionInPopover, setAvatarRepositionInPopover] = useState(false)
  const [coverRepositionInPopover, setCoverRepositionInPopover] = useState(false)

  const avatarAnchorRef = useRef<HTMLElement | null>(null)
  const coverAnchorRef = useRef<HTMLElement | null>(null)
  const coverButtonRef = useRef<HTMLButtonElement>(null)

  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const [editingCover, setEditingCover] = useState(false)
  const [editingAvatar, setEditingAvatar] = useState(false)

  const [coverPos, setCoverPos] = useState({ x: 50, y: 50 })
  const [avatarPos, setAvatarPos] = useState({ x: 50, y: 50 })
  const [tempAvatarPos, setTempAvatarPos] = useState({ x: 50, y: 50 })
  const [tempCoverPos, setTempCoverPos] = useState({ x: 50, y: 50 })

  const [dragHint, setDragHint] = useState(false)
  const showDragHint = () => {
    setDragHint(true)
    setTimeout(() => setDragHint(false), 2500)
  }

  const [pendingCoverSrc, setPendingCoverSrc] = useState<string | null>(null)
  const [pendingAvatarSrc, setPendingAvatarSrc] = useState<string | null>(null)
  const [pendingCoverBlob, setPendingCoverBlob] = useState<File | null>(null)
  const [pendingAvatarBlob, setPendingAvatarBlob] = useState<File | null>(null)

  const [editImageFiles, setEditImageFiles] = useState<File[]>([])
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([])
  const [editExistingImages, setEditExistingImages] = useState<string[]>([])
  const editImageRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const usernameTimeout = useRef<NodeJS.Timeout | null>(null)

  const isMobile = () => typeof window !== "undefined" && window.innerWidth < 640

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (data) {
      setProfile(data)
      setUsername(data.username)
      setBio(data.bio ?? "")
      if (data.cover_position) setCoverPos(data.cover_position)
      if (data.avatar_position) setAvatarPos(data.avatar_position)
    }
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id)
    ])
    setFollowerCount(followers ?? 0)
    setFollowingCount(following ?? 0)
  }

  const fetchPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("posts")
      .select("*, reactions(count), comments(count), profiles(username, avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (data) setPosts(data)
  }

  useEffect(() => { fetchProfile(); fetchPosts() }, [])

  useEffect(() => {
    let sorted = [...posts]
    if (currentSort === "Top Liked") sorted.sort((a, b) => (b.reactions[0]?.count ?? 0) - (a.reactions[0]?.count ?? 0))
    else if (currentSort === "Most Commented") sorted.sort((a, b) => (b.comments[0]?.count ?? 0) - (a.comments[0]?.count ?? 0))
    else if (currentSort === "Trending") sorted.sort((a, b) => ((b.reactions[0]?.count ?? 0) + (b.comments[0]?.count ?? 0)) - ((a.reactions[0]?.count ?? 0) + (a.comments[0]?.count ?? 0)))
    setFilteredPosts(sorted)
  }, [posts, currentSort])

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setUsernameStatus("idle")
    if (usernameTimeout.current) clearTimeout(usernameTimeout.current)
    if (value === profile?.username) { setUsernameStatus("same"); return }
    if (value.length < 3) return
    setUsernameStatus("checking")
    usernameTimeout.current = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("username").eq("username", value).maybeSingle()
      setUsernameStatus(data ? "taken" : "available")
    }, 500)
  }

  const handleSaveUsername = async () => {
    if (usernameStatus !== "available") return
    setSavingUsername(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("profiles").update({ username }).eq("id", user.id)
    await fetchProfile()
    setUsernameStatus("same")
    setSavingUsername(false)
  }

  const handleSaveBio = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("profiles").update({ bio }).eq("id", user.id)
    setEditingBio(false)
    fetchProfile()
  }

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingCoverBlob(file)
    setPendingCoverSrc(URL.createObjectURL(file))
    const initPos = { x: 50, y: 50 }
    setCoverPos(initPos)
    if (isMobile()) {
      setTempCoverPos(initPos)
      setCoverRepositionInPopover(true)
      setCoverPopoverOpen(true)
    } else {
      setEditingCover(true)
      showDragHint()
    }
    e.target.value = ""
  }

  const handleCoverReposition = () => {
    if (isMobile()) {
      setTempCoverPos({ ...coverPos })
      setCoverRepositionInPopover(true)
    } else {
      setCoverPopoverOpen(false)
      setEditingCover(true)
      showDragHint()
    }
  }

  const handleSaveCover = async () => {
    const finalPos = coverRepositionInPopover ? tempCoverPos : coverPos
    setEditingCover(false)
    setCoverRepositionInPopover(false)
    setCoverPopoverOpen(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCoverUploading(true)
    if (pendingCoverBlob) {
      const ext = pendingCoverBlob.name.split(".").pop()
      const path = `${user.id}/cover-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from("avatars").upload(path, pendingCoverBlob, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
        const freshUrl = urlData.publicUrl
        await supabase.from("profiles").update({ cover_url: freshUrl, cover_position: finalPos }).eq("id", user.id)
        setProfile((prev: any) => ({ ...prev, cover_url: freshUrl, cover_position: finalPos }))
        setCoverPos(finalPos)
      }
      setPendingCoverBlob(null)
      setPendingCoverSrc(null)
    } else {
      setCoverPos(finalPos)
      await supabase.from("profiles").update({ cover_position: finalPos }).eq("id", user.id)
      setProfile((prev: any) => ({ ...prev, cover_position: finalPos }))
    }
    setCoverUploading(false)
  }

  const handleCancelCover = () => {
    setEditingCover(false)
    setCoverRepositionInPopover(false)
    setCoverPopoverOpen(false)
    setPendingCoverSrc(null)
    setPendingCoverBlob(null)
    if (profile?.cover_position) setCoverPos(profile.cover_position)
    else setCoverPos({ x: 50, y: 50 })
  }

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingAvatarBlob(file)
    setPendingAvatarSrc(URL.createObjectURL(file))
    const initPos = { x: 50, y: 50 }
    setAvatarPos(initPos)
    if (isMobile()) {
      setTempAvatarPos(initPos)
      setAvatarRepositionInPopover(true)
      setAvatarPopoverOpen(true)
    } else {
      setEditingAvatar(true)
      showDragHint()
    }
    e.target.value = ""
  }

  const handleAvatarReposition = () => {
    if (isMobile()) {
      setTempAvatarPos({ ...avatarPos })
      setAvatarRepositionInPopover(true)
    } else {
      setAvatarPopoverOpen(false)
      setEditingAvatar(true)
      showDragHint()
    }
  }

  const handleSaveAvatar = async () => {
    const finalPos = avatarRepositionInPopover ? tempAvatarPos : avatarPos
    setEditingAvatar(false)
    setAvatarRepositionInPopover(false)
    setAvatarPopoverOpen(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAvatarUploading(true)
    if (pendingAvatarBlob) {
      const ext = pendingAvatarBlob.name.split(".").pop()
      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from("avatars").upload(path, pendingAvatarBlob, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
        const freshUrl = urlData.publicUrl
        await supabase.from("profiles").update({ avatar_url: freshUrl, avatar_position: finalPos }).eq("id", user.id)
        setProfile((prev: any) => ({ ...prev, avatar_url: freshUrl, avatar_position: finalPos }))
        setAvatarPos(finalPos)
        localStorage.setItem(`live_avatar_url_${user.id}`, freshUrl)
        window.dispatchEvent(new CustomEvent("avatar-updated", { detail: { avatar_url: freshUrl, userId: user.id } }))
      }
      setPendingAvatarBlob(null)
      setPendingAvatarSrc(null)
    } else {
      setAvatarPos(finalPos)
      await supabase.from("profiles").update({ avatar_position: finalPos }).eq("id", user.id)
      setProfile((prev: any) => ({ ...prev, avatar_position: finalPos }))
    }
    setAvatarUploading(false)
  }

  const handleCancelAvatar = () => {
    setEditingAvatar(false)
    setAvatarRepositionInPopover(false)
    setAvatarPopoverOpen(false)
    setPendingAvatarSrc(null)
    setPendingAvatarBlob(null)
    if (profile?.avatar_position) setAvatarPos(profile.avatar_position)
    else setAvatarPos({ x: 50, y: 50 })
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return
    await supabase.from("posts").delete().eq("id", postId)
    fetchPosts()
  }

  const handleToggleLock = async (post: any) => {
    await supabase.from("posts").update({ locked: !post.locked }).eq("id", post.id)
    fetchPosts()
  }

  const startEditPost = (post: any) => {
    setEditingPost(post)
    setEditTitle(post.title)
    setEditContent(post.content)
    setEditExistingImages(post.image_urls ?? [])
    setEditImageFiles([])
    setEditImagePreviews([])
  }

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = 4 - editExistingImages.length - editImageFiles.length
    const toAdd = files.slice(0, remaining)
    setEditImageFiles(prev => [...prev, ...toAdd])
    setEditImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    if (editImageRef.current) editImageRef.current.value = ""
  }

  const handleEditPost = async () => {
    if (!editingPost) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const image_urls = [...editExistingImages]
    for (const file of editImageFiles) {
      const ext = file.name.split(".").pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from("post-images").upload(path, file)
      if (!error) {
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path)
        image_urls.push(urlData.publicUrl)
      }
    }
    await supabase.from("posts").update({ title: editTitle, content: editContent, image_urls }).eq("id", editingPost.id)
    setEditingPost(null)
    fetchPosts()
  }

  const coverSrc = pendingCoverSrc ?? profile?.cover_url ?? null
  const avatarSrc = pendingAvatarSrc ?? profile?.avatar_url ?? null

  // Shared post card with action buttons
  const PostCardWithActions = ({ post }: { post: any }) => (
    <>
      <Link href={`/feed/${post.id}`}>
        <PostCard
          title={post.title}
          excerpt={post.content}
          tag={post.flair}
          timeAgo={timeAgo(post.created_at)}
          likes={post.reactions[0]?.count ?? 0}
          comments={post.comments[0]?.count ?? 0}
          username={post.profiles?.username ?? profile?.username}
          avatar={avatarSrc ?? post.profiles?.avatar_url ?? ""}
          imageUrls={post.image_urls ?? []}
          videoUrl={post.video_url ?? null}
        />
      </Link>
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => { e.preventDefault(); startEditPost(post) }}
          className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shadow-sm"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); handleToggleLock(post) }}
          className={`p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors shadow-sm ${post.locked ? "text-orange-500" : "text-muted-foreground hover:text-foreground"}`}
        >
          {post.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); handleDeletePost(post.id) }}
          className="p-1.5 rounded-lg bg-card border border-border hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500 shadow-sm"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </>
  )

  // Edit form
  const EditPostForm = () => (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <input
        value={editTitle}
        onChange={e => setEditTitle(e.target.value)}
        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background outline-none font-semibold focus:border-primary transition-colors"
        placeholder="Title"
      />
      <textarea
        value={editContent}
        onChange={e => setEditContent(e.target.value)}
        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background outline-none resize-none h-28 focus:border-primary transition-colors"
        placeholder="Content"
      />
      {editExistingImages.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {editExistingImages.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} className="size-14 rounded-lg object-cover border border-border" />
              <button
                onClick={() => setEditExistingImages(prev => prev.filter((_, idx) => idx !== i))}
                className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-destructive text-white flex items-center justify-center"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {editImagePreviews.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {editImagePreviews.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} className="size-14 rounded-lg object-cover border border-border opacity-80" />
              <button
                onClick={() => {
                  setEditImageFiles(prev => prev.filter((_, idx) => idx !== i))
                  setEditImagePreviews(prev => prev.filter((_, idx) => idx !== i))
                }}
                className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-destructive text-white flex items-center justify-center"
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        {(editExistingImages.length + editImageFiles.length) < 4 && (
          <button
            onClick={() => editImageRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ImagePlus className="size-3.5" />
            Add image
          </button>
        )}
        <input ref={editImageRef} type="file" accept="image/*" multiple className="hidden" onChange={handleEditImageSelect} />
        <div className="flex gap-2 ml-auto">
          <Button size="sm" className="rounded-full" onClick={handleEditPost}>Save</Button>
          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingPost(null)}>Cancel</Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="w-full min-h-screen bg-background">

      {/* ── DRAG HINT TOAST ── */}
      {dragHint && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 bg-foreground text-background text-xs font-medium px-4 py-2.5 rounded-full shadow-xl pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Move className="size-3.5" />
          Drag the image to reposition it
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="size-5 text-white" />
          </button>
          <img
            src={lightboxSrc}
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* ── AVATAR POPOVER ── */}
      <PopoverMenu
        open={avatarPopoverOpen}
        onClose={handleCancelAvatar}
        anchorRef={avatarAnchorRef}
        hasImage={!!profile?.avatar_url}
        onView={profile?.avatar_url ? () => { setLightboxSrc(profile.avatar_url); setAvatarPopoverOpen(false) } : undefined}
        onChange={() => fileInputRef.current?.click()}
        onReposition={profile?.avatar_url ? handleAvatarReposition : undefined}
        repositionMode={avatarRepositionInPopover}
        repositionSrc={avatarSrc}
        repositionPos={tempAvatarPos}
        onRepositionChange={setTempAvatarPos}
        onRepositionSave={handleSaveAvatar}
        onRepositionCancel={handleCancelAvatar}
        uploading={avatarUploading}
      />

      {/* ── COVER POPOVER ── */}
      <PopoverMenu
        open={coverPopoverOpen}
        onClose={handleCancelCover}
        anchorRef={coverButtonRef.current ? coverButtonRef : coverAnchorRef}
        hasImage={!!profile?.cover_url}
        onView={profile?.cover_url ? () => { setLightboxSrc(profile.cover_url); setCoverPopoverOpen(false) } : undefined}
        onChange={() => coverInputRef.current?.click()}
        onReposition={profile?.cover_url ? handleCoverReposition : undefined}
        repositionMode={coverRepositionInPopover}
        repositionSrc={coverSrc}
        repositionPos={tempCoverPos}
        onRepositionChange={setTempCoverPos}
        onRepositionSave={handleSaveCover}
        onRepositionCancel={handleCancelCover}
        uploading={coverUploading}
      />

      {/* ── COVER PHOTO BANNER ── */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 bg-muted group/cover">
        {coverSrc ? (
          <DraggableImage
            key={coverSrc}
            src={coverSrc}
            position={coverPos}
            onChange={setCoverPos}
            editing={editingCover}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-muted" />
        )}

        {!editingCover && (
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}

        <div className={`absolute bottom-4 right-4 flex items-center gap-2 transition-opacity duration-200 ${editingCover ? "opacity-100" : "opacity-0 group-hover/cover:opacity-100"}`}>
          {editingCover ? (
            <>
              <button
                onClick={handleCancelCover}
                className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full bg-background/90 hover:bg-background text-foreground border border-border shadow-md transition-all"
              >
                <X className="size-3.5" /> Cancel
              </button>
              <button
                onClick={handleSaveCover}
                disabled={coverUploading}
                className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all disabled:opacity-70"
              >
                {coverUploading
                  ? <span className="size-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <Check className="size-3.5" />}
                {coverUploading ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <button
              ref={coverButtonRef}
              onClick={() => setCoverPopoverOpen(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full bg-background/90 hover:bg-background text-foreground border border-border shadow-md transition-all"
            >
              <Camera className="size-3.5" />
              {profile?.cover_url ? "Edit cover" : "Add cover"}
            </button>
          )}
        </div>

        <span ref={coverAnchorRef as React.RefObject<HTMLSpanElement>} className="absolute bottom-0 right-4 pointer-events-none sm:hidden" />

        {!editingCover && (
          <button
            className="absolute inset-0 w-full h-full bg-transparent sm:hidden"
            onClick={() => setCoverPopoverOpen(v => !v)}
            aria-label="Cover photo options"
          />
        )}

        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileSelect} />
      </div>

      {/* ── PROFILE SECTION ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-4">
          <div className="relative shrink-0">
            {avatarSrc ? (
              <DraggableImage
                key={avatarSrc}
                src={avatarSrc}
                position={avatarPos}
                onChange={setAvatarPos}
                editing={editingAvatar}
                className="size-20 sm:size-24 md:size-28 rounded-2xl border-4 border-background shadow-lg"
              />
            ) : (
              <div className="size-20 sm:size-24 md:size-28 rounded-2xl bg-muted border-4 border-background shadow-lg" />
            )}

            {editingAvatar && (
              <div className="absolute -bottom-9 left-0 flex items-center gap-1.5 z-10">
                <button
                  onClick={handleCancelAvatar}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-background border border-border shadow text-foreground hover:bg-muted transition-all"
                >
                  <X className="size-3" /> Cancel
                </button>
                <button
                  onClick={handleSaveAvatar}
                  disabled={avatarUploading}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow transition-all disabled:opacity-70"
                >
                  {avatarUploading
                    ? <span className="size-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Check className="size-3" />}
                  {avatarUploading ? "Saving..." : "Save"}
                </button>
              </div>
            )}

            {!editingAvatar && (
              <>
                <button
                  onClick={() => setAvatarPopoverOpen(v => !v)}
                  className="absolute inset-0 rounded-xl bg-black/0 hover:bg-black/40 active:bg-black/50 transition-all duration-150 flex items-center justify-center group/av"
                  aria-label="Profile photo options"
                >
                  <Camera className="size-5 text-white opacity-0 group-hover/av:opacity-100 transition-opacity drop-shadow" />
                </button>
                <span ref={avatarAnchorRef} className="absolute bottom-0 right-0 pointer-events-none" />
              </>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileSelect} />
          </div>

          {/* Stats — desktop */}
          <div className="hidden sm:flex items-center gap-6 pb-1">
            {[
              { label: "Followers", value: followerCount },
              { label: "Following", value: followingCount },
              { label: "Posts", value: posts.length },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-xl font-bold text-foreground leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {editingAvatar && <div className="h-6" />}

        {/* Username, bio, joined */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            @{profile?.username}
          </h1>
          {profile?.bio
            ? <p className="text-sm text-muted-foreground mt-1.5 max-w-lg leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            : <p className="text-sm text-muted-foreground/40 mt-1.5 italic">No bio yet</p>}
          {profile?.created_at && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5 shrink-0" />
              <span>Joined {formatJoinDate(profile.created_at)}</span>
            </div>
          )}
        </div>

        {/* Stats — mobile */}
        <div className="flex sm:hidden items-center gap-0 mb-5 rounded-2xl border border-border bg-card p-3">
          {[
            { label: "Followers", value: followerCount },
            { label: "Following", value: followingCount },
            { label: "Posts", value: posts.length },
          ].map((stat, i) => (
            <div key={stat.label} className="flex-1 text-center relative">
              {i > 0 && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-5 bg-border" />}
              <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {(["posts", "settings"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "posts" ? `My Posts (${posts.length})` : "Settings"}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── POSTS TAB ── */}
        {activeTab === "posts" && (
          <div className="pb-12 pt-5">
            {posts.length > 0 && (
              <div className="flex items-center justify-end mb-5">
                <Select value={currentSort} onValueChange={setCurrentSort}>
                  <SelectTrigger className="w-[140px] rounded-full h-8 text-xs px-4 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filteredPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <p className="text-5xl mb-4">🤫</p>
                <p className="text-base font-medium text-foreground">Nothing whispered yet</p>
                <p className="text-sm text-muted-foreground mt-1">Your posts will appear here</p>
              </div>
            ) : (
              <>
                {/* Mobile Layout */}
                <div className="flex flex-col gap-6 md:hidden">
                  {filteredPosts.map(post => (
                    <div key={post.id} className="relative group/card">
                      {editingPost?.id === post.id
                        ? <EditPostForm />
                        : <PostCardWithActions post={post} />
                      }
                    </div>
                  ))}
                </div>

                {/* Desktop Masonry */}
                <div className="hidden md:block">
                  <div className="columns-2 lg:columns-3 gap-6">
                    {filteredPosts.map(post => (
                      <div key={post.id} className="mb-6 break-inside-avoid relative group/card">
                        {editingPost?.id === post.id
                          ? <EditPostForm />
                          : <PostCardWithActions post={post} />
                        }
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-center justify-center mt-16 mb-8 text-center">
                    <div className="h-px w-24 bg-border mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">🎉 You're all caught up!</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">That's everything for now.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <div className="pb-12 pt-5">
            <div className="max-w-lg space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Username</h3>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                    <input
                      value={username}
                      onChange={e => handleUsernameChange(e.target.value)}
                      className="w-full border border-border rounded-xl pl-7 pr-8 py-2.5 text-sm bg-background outline-none focus:border-primary transition-colors"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && <span className="size-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin block" />}
                      {usernameStatus === "available" && <Check className="size-3.5 text-green-500" />}
                      {usernameStatus === "taken" && <X className="size-3.5 text-red-500" />}
                      {usernameStatus === "same" && <Check className="size-3.5 text-muted-foreground" />}
                    </div>
                  </div>
                  <Button size="sm" className="rounded-xl shrink-0 px-4" disabled={usernameStatus !== "available" || savingUsername} onClick={handleSaveUsername}>
                    {savingUsername ? <span className="size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Save"}
                  </Button>
                </div>
                <p className="text-xs mt-2">
                  {usernameStatus === "available" && <span className="text-green-500">✓ Username available</span>}
                  {usernameStatus === "taken" && <span className="text-red-500">✗ Already taken</span>}
                  {usernameStatus === "checking" && <span className="text-muted-foreground">Checking...</span>}
                  {usernameStatus === "idle" && username.length > 0 && username.length < 3 && (
                    <span className="text-muted-foreground flex items-center gap-1"><AlertCircle className="size-3" /> At least 3 characters</span>
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Bio</h3>
                {editingBio ? (
                  <div className="space-y-3">
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Tell people a little about yourself..."
                      maxLength={160}
                      autoFocus
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none resize-none h-24 focus:border-primary transition-colors"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{bio.length}/160</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingBio(false)}>Cancel</Button>
                        <Button size="sm" className="rounded-full px-5" onClick={handleSaveBio}>Save</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setEditingBio(true)} className="flex items-start gap-2 cursor-pointer group">
                    <p className="text-sm text-muted-foreground flex-1 min-h-8 leading-relaxed">
                      {bio || <span className="italic text-muted-foreground/50">No bio yet — click to add one</span>}
                    </p>
                    <Pencil className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}