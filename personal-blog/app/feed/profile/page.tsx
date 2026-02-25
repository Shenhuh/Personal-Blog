"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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

// ── INLINE DRAGGABLE IMAGE ───────────────────────────────────────────────────
interface DraggableImageProps {
  /** The objectPosition value, e.g. "50% 30%" */
  position: { x: number; y: number }
  onChange: (pos: { x: number; y: number }) => void
  src: string
  className?: string
  /** aspect ratio container class — caller controls the outer box */
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
    // Convert pixel drag to percentage of container
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
          draggable: false,
        } as React.CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDragStart={e => e.preventDefault()}
      />
      {/* Editing overlay hint */}
      {editing && (
        <div className="absolute inset-0 pointer-events-none border-2 border-primary/60 ring-2 ring-primary/20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
            <Move className="size-3.5" />
            Drag to reposition
          </div>
        </div>
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

  // Inline editing states
  const [avatarOverlayOpen, setAvatarOverlayOpen] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [coverOverlayOpen, setCoverOverlayOpen] = useState(false)
  const [editingCover, setEditingCover] = useState(false)
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [coverPos, setCoverPos] = useState({ x: 50, y: 50 })
  const [avatarPos, setAvatarPos] = useState({ x: 50, y: 50 })
  // Pending new image files (before save)
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

  // Cover: pick file → enter drag mode immediately
  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingCoverBlob(file)
    setPendingCoverSrc(URL.createObjectURL(file))
    setCoverPos({ x: 50, y: 50 })
    setEditingCover(true)
    e.target.value = ""
  }

  // If already have a cover, just enter reposition mode without picking new file
  const handleEditCoverPosition = () => {
    setEditingCover(true)
  }

  const handleSaveCover = async () => {
    setEditingCover(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCoverUploading(true)
    if (pendingCoverBlob) {
      // Upload new file
      const ext = pendingCoverBlob.name.split(".").pop()
      const path = `${user.id}/cover.${ext}`
      const { error } = await supabase.storage.from("avatars").upload(path, pendingCoverBlob, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
        const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`
        await supabase.from("profiles").update({
          cover_url: freshUrl,
          cover_position: coverPos,
        }).eq("id", user.id)
        // Update local state directly — do NOT call fetchProfile() which would
        // re-read a potentially stale/cached URL from the DB and revert the image
        setProfile((prev: any) => ({ ...prev, cover_url: freshUrl, cover_position: coverPos }))
      }
      setPendingCoverBlob(null)
      setPendingCoverSrc(null)
    } else {
      // Just save new position
      await supabase.from("profiles").update({ cover_position: coverPos }).eq("id", user.id)
    }
    setCoverUploading(false)
  }

  const handleCancelCover = () => {
    setEditingCover(false)
    setPendingCoverSrc(null)
    setPendingCoverBlob(null)
    // Reset position to saved
    if (profile?.cover_position) setCoverPos(profile.cover_position)
    else setCoverPos({ x: 50, y: 50 })
  }

  // Avatar: pick file → enter drag mode immediately
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingAvatarBlob(file)
    setPendingAvatarSrc(URL.createObjectURL(file))
    setAvatarPos({ x: 50, y: 50 })
    setEditingAvatar(true)
    e.target.value = ""
  }

  const handleEditAvatarPosition = () => {
    setEditingAvatar(true)
  }

  const handleSaveAvatar = async () => {
    setEditingAvatar(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setAvatarUploading(true)
    if (pendingAvatarBlob) {
      const ext = pendingAvatarBlob.name.split(".").pop()
      const path = `${user.id}/avatar.${ext}`
      const { error } = await supabase.storage.from("avatars").upload(path, pendingAvatarBlob, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
        const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`
        await supabase.from("profiles").update({
          avatar_url: freshUrl,
          avatar_position: avatarPos,
        }).eq("id", user.id)
        // Update local state directly — do NOT call fetchProfile() which would
        // re-read a potentially stale/cached URL from the DB and revert the image
        setProfile((prev: any) => ({ ...prev, avatar_url: freshUrl, avatar_position: avatarPos }))
      }
      setPendingAvatarBlob(null)
      setPendingAvatarSrc(null)
    } else {
      await supabase.from("profiles").update({ avatar_position: avatarPos }).eq("id", user.id)
    }
    setAvatarUploading(false)
  }

  const handleCancelAvatar = () => {
    setEditingAvatar(false)
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

  return (
    <div className="w-full min-h-screen bg-background">

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

        {/* Tap zone for mobile — toggles cover buttons */}
        {!editingCover && (
          <button
            className="absolute inset-0 w-full h-full bg-transparent sm:hidden"
            onClick={() => setCoverOverlayOpen(v => !v)}
            aria-label="Show cover options"
          />
        )}

        {/* Fade to page bg */}
        {!editingCover && (
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        )}

        {/* Cover action buttons — visible on hover */}
        <div className={`absolute bottom-4 right-4 flex items-center gap-2 transition-opacity duration-200 ${editingCover || coverOverlayOpen ? "opacity-100" : "opacity-0 group-hover/cover:opacity-100"}`}>
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
                className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all"
              >
                {coverUploading
                  ? <span className="size-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <Check className="size-3.5" />}
                {coverUploading ? "Saving..." : "Save position"}
              </button>
            </>
          ) : (
            <>
              {/* Reposition existing cover */}
              {profile?.cover_url && (
                <button
                  onClick={handleEditCoverPosition}
                  className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full bg-background/90 hover:bg-background text-foreground border border-border shadow-md transition-all"
                >
                  <Move className="size-3.5" /> Reposition
                </button>
              )}
              {/* Upload new cover */}
              <button
                onClick={() => coverInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full bg-background/90 hover:bg-background text-foreground border border-border shadow-md transition-all"
              >
                <Camera className="size-3.5" />
                {profile?.cover_url ? "Change cover" : "Add cover"}
              </button>
            </>
          )}
        </div>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFileSelect} />
      </div>

      {/* ── PROFILE SECTION ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-4">

          {/* Avatar */}
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

            {/* Avatar hover overlay — View / Change / Reposition */}
            {editingAvatar ? (
              <div className="absolute -bottom-9 left-0 flex items-center gap-1.5 z-10">
                <button
                  onClick={handleCancelAvatar}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-background border border-border shadow text-foreground hover:bg-muted transition-all"
                >
                  <X className="size-3" /> Cancel
                </button>
                <button
                  onClick={handleSaveAvatar}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow transition-all"
                >
                  {avatarUploading
                    ? <span className="size-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Check className="size-3" />}
                  Save
                </button>
              </div>
            ) : (
              <div
                className={`absolute inset-0 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-1.5 cursor-pointer select-none ${avatarOverlayOpen ? "bg-black/55 opacity-100" : "bg-black/0 opacity-0 hover:bg-black/55 hover:opacity-100"}`}
                onClick={() => setAvatarOverlayOpen(v => !v)}
              >
                {/* View */}
                {avatarSrc && (
                  <button
                    onClick={e => { e.stopPropagation(); setLightboxSrc(profile?.avatar_url ?? avatarSrc); setAvatarOverlayOpen(false) }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-white px-2.5 py-1 rounded-full bg-white/20 active:bg-white/40 transition-all backdrop-blur-sm"
                  >
                    <Eye className="size-3" /> View
                  </button>
                )}
                {/* Change */}
                <button
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); setAvatarOverlayOpen(false) }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-white px-2.5 py-1 rounded-full bg-white/20 active:bg-white/40 transition-all backdrop-blur-sm"
                >
                  <Camera className="size-3" /> Change
                </button>
                {/* Reposition */}
                {profile?.avatar_url && (
                  <button
                    onClick={e => { e.stopPropagation(); handleEditAvatarPosition(); setAvatarOverlayOpen(false) }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-white px-2.5 py-1 rounded-full bg-white/20 active:bg-white/40 transition-all backdrop-blur-sm"
                  >
                    <Move className="size-3" /> Reposition
                  </button>
                )}
              </div>
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

        {/* Spacer when avatar save buttons are showing */}
        {editingAvatar && <div className="h-6" />}

        {/* Username, bio, joined */}
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            @{profile?.username}
          </h1>
          {profile?.bio
            ? <p className="text-sm text-muted-foreground mt-1.5 max-w-lg leading-relaxed">{profile.bio}</p>
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
              <div className="grid gap-5 md:grid-cols-2 auto-rows-fr">
                {filteredPosts.map(post => (
                  <div key={post.id} className="relative group/card">
                    {editingPost?.id === post.id ? (
                      <div className="rounded-2xl border border-border bg-card p-5 space-y-3 h-full">
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
                    ) : (
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
                            avatar={post.profiles?.avatar_url ?? profile?.avatar_url}
                            imageUrls={post.image_urls ?? []}
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
                    )}
                  </div>
                ))}
              </div>
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