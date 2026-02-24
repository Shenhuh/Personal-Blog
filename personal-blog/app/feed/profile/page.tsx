"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Camera, Check, X, Pencil, Trash2, Lock, Unlock,
  AlertCircle, ImagePlus, Heart, MessageCircle, Tag, Search, XIcon
} from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"
import { PostCard } from "@/components/PostCard"

const sortOptions = ["Latest", "Top Liked", "Most Commented", "Trending"]

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

  // Edit post image state
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

  // Apply sort whenever posts or currentSort changes
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = file.name.split(".").pop()
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id)
      await fetchProfile()
    }
    setAvatarUploading(false)
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const ext = file.name.split(".").pop()
    const path = `${user.id}/cover.${ext}`
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      await supabase.from("profiles").update({ cover_url: urlData.publicUrl }).eq("id", user.id)
      await fetchProfile()
    }
    setCoverUploading(false)
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

  return (
    <div className="w-full min-h-screen relative">

      {/* ── FULL PAGE BACKGROUND COVER ── */}
      <div className="fixed inset-0 z-0">
        {profile?.cover_url ? (
          <img src={profile.cover_url} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-background to-background" />
        )}
        {/* Multi-layer gradient overlay so content is always readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="relative z-10 w-full">

        {/* Profile Hero */}
        <div className="max-w-5xl mx-auto px-6 pt-10 pb-6">

          {/* Avatar row */}
          <div className="flex items-end justify-between gap-4 mb-5">
            <div className="flex items-end gap-5">
              {/* Avatar */}
              <div className="relative shrink-0 group">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} className="size-24 md:size-28 rounded-2xl object-cover border-2 border-white/20 shadow-2xl" />
                ) : (
                  <div className="size-24 md:size-28 rounded-2xl bg-muted border-2 border-white/20 shadow-2xl" />
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {avatarUploading
                    ? <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera className="size-5 text-white" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>

              {/* Name & bio */}
              <div className="pb-1">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground drop-shadow-sm">@{profile?.username}</h1>
                {profile?.bio
                  ? <p className="text-sm text-muted-foreground mt-1 max-w-sm">{profile.bio}</p>
                  : <p className="text-sm text-muted-foreground/40 mt-1 italic">No bio yet</p>}
              </div>
            </div>

            {/* Stats + cover button */}
            <div className="flex flex-col items-end gap-3 pb-1">
              {/* Change cover button */}
              <button
                onClick={() => coverInputRef.current?.click()}
                className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm border border-white/10 transition-all"
              >
                {coverUploading
                  ? <span className="size-3 border border-white border-t-transparent rounded-full animate-spin" />
                  : <ImagePlus className="size-3" />}
                {coverUploading ? "Uploading..." : "Change cover"}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />

              {/* Stats */}
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground leading-none">{followerCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Followers</p>
                </div>
                <div className="w-px h-7 bg-border/50" />
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground leading-none">{followingCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Following</p>
                </div>
                <div className="w-px h-7 bg-border/50" />
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground leading-none">{posts.length}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Posts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border/50">
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
        </div>

        {/* ── POSTS TAB ── */}
        {activeTab === "posts" && (
          <div className="max-w-5xl mx-auto px-6 pb-12">

            {/* Sort bar — mirrors feed pattern */}
            {posts.length > 0 && (
              <div className="flex items-center justify-end mb-5">
                <Select value={currentSort} onValueChange={setCurrentSort}>
                  <SelectTrigger className="w-[140px] rounded-full h-8 text-xs px-4 bg-card/80 backdrop-blur-sm border-border/50">
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
              /* Same 2-col grid as feed */
              <div className="grid gap-5 md:grid-cols-2 auto-rows-fr">
                {filteredPosts.map(post => (
                  <div key={post.id} className="relative group/card">
                    {editingPost?.id === post.id ? (
                      /* ── INLINE EDIT CARD ── */
                      <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-5 space-y-3 h-full">
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

                        {/* Existing images */}
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

                        {/* New image previews */}
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
                      /* ── POST CARD (same as feed) ── */
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

                        {/* Action buttons — overlay on hover */}
                        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => { e.preventDefault(); startEditPost(post) }}
                            className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shadow-sm"
                            title="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); handleToggleLock(post) }}
                            className={`p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border hover:bg-muted transition-colors shadow-sm ${post.locked ? "text-orange-500" : "text-muted-foreground hover:text-foreground"}`}
                            title={post.locked ? "Unlock" : "Lock"}
                          >
                            {post.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); handleDeletePost(post.id) }}
                            className="p-1.5 rounded-lg bg-card/90 backdrop-blur-sm border border-border hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500 shadow-sm"
                            title="Delete"
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
          <div className="max-w-5xl mx-auto px-6 pb-12">
            <div className="max-w-lg space-y-4">

              {/* Username card */}
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5">
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

              {/* Bio card */}
              <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5">
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