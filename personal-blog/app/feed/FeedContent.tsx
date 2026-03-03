"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PostCard } from "@/components/PostCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ImagePlus, X as XIcon, AlertCircle, Tag, ArrowUp, Video, Play, Pause, Volume2, VolumeX } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"

const sortOptions = ["Latest", "Top Liked", "Most Commented", "Trending"]
type PostStatus = "idle" | "uploading" | "posting" | "done" | "error"

// ── Inline Video Player ───────────────────────────────────────────────────────
function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    const v = videoRef.current
    if (!v) return
    playing ? v.pause() : v.play()
    setPlaying(!playing)
  }

  const toggleMute = (e: React.MouseEvent) => {
    e.preventDefault()
    const v = videoRef.current
    if (!v) return
    v.muted = !muted
    setMuted(!muted)
  }

  const onTimeUpdate = () => {
    const v = videoRef.current
    if (!v || !v.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const v = videoRef.current
    if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black group/video">
      <video
        ref={videoRef}
        src={src}
        className="w-full max-h-64 object-contain"
        muted
        playsInline
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlaying(false)}
      />
      {/* Overlay controls */}
      <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover/video:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
        {/* Play / Pause centre button */}
        <button
          onClick={toggle}
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
        >
          <div className="bg-black/50 rounded-full p-3 backdrop-blur-sm hover:bg-black/70 transition-colors">
            {playing
              ? <Pause className="size-5 text-white" />
              : <Play className="size-5 text-white fill-white" />}
          </div>
        </button>
        {/* Bottom bar */}
        <div className="mt-auto flex flex-col gap-1 pointer-events-auto">
          {/* Seek bar */}
          <div
            className="w-full h-1 bg-white/30 rounded-full cursor-pointer"
            onClick={seek}
          >
            <div className="h-1 bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          {/* Mute */}
          <div className="flex justify-end">
            <button onClick={toggleMute} className="cursor-pointer text-white hover:text-primary transition-colors">
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FeedContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFlair = searchParams.get("flair") || "All"
  const currentSort = searchParams.get("sort") || "Latest"

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [flair, setFlair] = useState("")
  const [posts, setPosts] = useState<any[]>([])
  const [pendingPosts, setPendingPosts] = useState<any[]>([])
  const [flairs, setFlairs] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [flairSearch, setFlairSearch] = useState("")
  const [showFlairDropdown, setShowFlairDropdown] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [postStatus, setPostStatus] = useState<PostStatus>("idle")
  const [validationMsg, setValidationMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [liveAvatar, setLiveAvatar] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)
      const cached = localStorage.getItem(`live_avatar_url_${user.id}`)
      if (cached) { setLiveAvatar(cached); return }
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).single()
      if (data?.avatar_url) setLiveAvatar(data.avatar_url)
    }
    init()
  }, [])

  useEffect(() => {
    const onAvatarUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ avatar_url: string; userId: string }>).detail
      if (detail?.avatar_url && (!detail.userId || detail.userId === currentUserId)) setLiveAvatar(detail.avatar_url)
    }
    const onStorage = (e: StorageEvent) => {
      if (currentUserId && e.key === `live_avatar_url_${currentUserId}` && e.newValue) setLiveAvatar(e.newValue)
    }
    window.addEventListener("avatar-updated", onAvatarUpdated)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("avatar-updated", onAvatarUpdated)
      window.removeEventListener("storage", onStorage)
    }
  }, [currentUserId])

  const fetchFlairs = async () => {
    const { data } = await supabase.from("flairs").select("name").order("name")
    if (data) setFlairs(["All", ...data.map((f: any) => f.name)])
  }

  const fetchPosts = async () => {
    setLoading(true)
    let query = supabase.from("posts").select(`*, reactions(count), comments(count), profiles(username, avatar_url)`)
    if (currentFlair !== "All") query = query.eq("flair", currentFlair)
    query = query.order("created_at", { ascending: false })
    const { data } = await query
    if (data) {
      let sorted = data
      if (currentSort === "Top Liked") sorted = [...data].sort((a, b) => (b.reactions[0]?.count ?? 0) - (a.reactions[0]?.count ?? 0))
      else if (currentSort === "Most Commented") sorted = [...data].sort((a, b) => (b.comments[0]?.count ?? 0) - (a.comments[0]?.count ?? 0))
      else if (currentSort === "Trending") sorted = [...data].sort((a, b) => ((b.reactions[0]?.count ?? 0) + (b.comments[0]?.count ?? 0)) - ((a.reactions[0]?.count ?? 0) + (a.comments[0]?.count ?? 0)))
      setPosts(sorted)
    }
    setLoading(false)
  }

  useEffect(() => { fetchFlairs() }, [])

  useEffect(() => {
    setPendingPosts([])
    fetchPosts()
  }, [currentFlair, currentSort])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowFlairDropdown(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, async (payload) => {
        if (payload.new.user_id === currentUserId) return
        if (currentFlair !== "All" && payload.new.flair !== currentFlair) return
        const { data } = await supabase
          .from("posts")
          .select("*, reactions(count), comments(count), profiles(username, avatar_url)")
          .eq("id", payload.new.id)
          .single()
        if (data) setPendingPosts(prev => [data, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, currentFlair])

  const flushPendingPosts = () => {
    setPosts(prev => [...pendingPosts, ...prev])
    setPendingPosts([])
    topRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const toAdd = files.slice(0, 4 - imageFiles.length)
    setImageFiles(prev => [...prev, ...toAdd])
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Max 100 MB guard
    if (file.size > 100 * 1024 * 1024) {
      setValidationMsg("Video must be under 100 MB.")
      setTimeout(() => setValidationMsg(null), 3000)
      return
    }
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
  }

  const removeVideo = () => {
    setVideoFile(null)
    setVideoPreview(null)
    if (videoInputRef.current) videoInputRef.current.value = ""
  }

  const handlePost = async () => {
    if (!title.trim() || !content.trim() || !flair) {
      setValidationMsg("Please add a title, content, and a flair!")
      setTimeout(() => setValidationMsg(null), 3000)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setPostStatus("uploading")
    try {
      const image_urls: string[] = []
      for (const file of imageFiles) {
        const path = `${user.id}/${Date.now()}-${file.name}`
        await supabase.storage.from("post-images").upload(path, file)
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path)
        image_urls.push(urlData.publicUrl)
      }

      let video_url: string | null = null
      if (videoFile) {
        const ext = videoFile.name.split(".").pop()
        const safeName = `${Date.now()}.${ext}`
        const path = `${user.id}/${safeName}`
        const { error: videoError } = await supabase.storage
          .from("post-videos")
          .upload(path, videoFile)
        if (videoError) {
          setValidationMsg("Video upload failed. Please try again.")
          setTimeout(() => setValidationMsg(null), 3000)
          setPostStatus("idle")
          return
        }
        const { data: urlData } = supabase.storage.from("post-videos").getPublicUrl(path)
        video_url = urlData.publicUrl
      }

      await supabase.from("posts").insert({ title, content, flair, user_id: user.id, image_urls, video_url })
      setPostStatus("done")
      setTitle(""); setContent(""); setFlair("")
      setImageFiles([]); setImagePreviews([])
      setVideoFile(null); setVideoPreview(null)
      setIsExpanded(false)
      fetchPosts()
      setTimeout(() => setPostStatus("idle"), 2500)
    } catch { setPostStatus("error") }
  }

  const getPostAvatar = (post: any) => {
    if (currentUserId && post.user_id === currentUserId && liveAvatar) return liveAvatar
    return post.profiles?.avatar_url ?? ""
  }

  const filteredFlairs = flairs.filter(f => f !== "All" && f.toLowerCase().includes(flairSearch.toLowerCase()))

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-6">
      <div ref={topRef} />

      {/* ── Validation toast ── */}
      {validationMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-card border border-orange-500/30 rounded-2xl px-5 py-3 shadow-xl">
          <AlertCircle className="size-4 text-orange-500" />
          <p className="text-xs font-medium">{validationMsg}</p>
        </div>
      )}

      {/* ── New posts pill ── */}
      {pendingPosts.length > 0 && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[90]" style={{ animation: "slideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          <button
            onClick={flushPendingPosts}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-full shadow-2xl hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowUp className="size-4" />
            {pendingPosts.length} new {pendingPosts.length === 1 ? "whisper" : "whispers"}
          </button>
        </div>
      )}

      {/* ── Post Composer ── */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6 shadow-sm">
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full text-left text-sm text-muted-foreground px-2 py-1 cursor-text hover:text-foreground transition-colors"
          >
            Whisper something...
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-transparent text-lg font-semibold outline-none border-b border-border pb-2 cursor-text"
              autoFocus
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Content"
              className="w-full bg-transparent resize-none outline-none text-sm text-muted-foreground h-24 cursor-text"
            />

            {/* Image previews */}
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 mb-1">
                {imagePreviews.map((p, i) => (
                  <div key={i} className="relative group">
                    <img src={p} className="size-16 rounded-lg object-cover border border-border" />
                    <button
                      onClick={() => {
                        setImageFiles(f => f.filter((_, idx) => idx !== i))
                        setImagePreviews(p => p.filter((_, idx) => idx !== i))
                      }}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Video preview */}
            {videoPreview && (
              <div className="relative mb-1">
                <VideoPlayer src={videoPreview} />
                <button
                  onClick={removeVideo}
                  className="absolute top-2 right-2 bg-destructive text-white rounded-full p-1 cursor-pointer hover:bg-destructive/80 transition-colors z-10"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-3">
                {/* Flair picker */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowFlairDropdown(!showFlairDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-xs hover:bg-muted transition-colors border border-border min-w-[120px] cursor-pointer"
                  >
                    <Tag className="size-3 text-muted-foreground" />
                    <span className="truncate">{flair || "Add Flair"}</span>
                  </button>
                  {showFlairDropdown && (
                    <div className="absolute top-full mt-2 left-0 w-52 bg-card border border-border rounded-xl shadow-2xl z-[110] p-2 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center px-2 py-1 border-b border-border mb-1">
                        <Search className="size-3 mr-2 text-muted-foreground" />
                        <input
                          className="bg-transparent outline-none text-xs w-full py-1 cursor-text"
                          placeholder="Search..."
                          value={flairSearch}
                          onChange={e => setFlairSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar">
                        {filteredFlairs.map(f => (
                          <button
                            key={f}
                            onClick={() => { setFlair(f); setShowFlairDropdown(false); setFlairSearch("") }}
                            className="w-full text-left px-2 py-2 text-xs hover:bg-primary/10 hover:text-primary rounded-lg transition-colors cursor-pointer"
                          >
                            {f}
                          </button>
                        ))}
                        {filteredFlairs.length === 0 && (
                          <p className="text-[10px] text-center py-2 text-muted-foreground">No results</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Image upload */}
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  title="Add images (max 4)"
                >
                  <ImagePlus className="size-4" />
                  <span>{imageFiles.length}/4</span>
                </button>
                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />

                {/* Video upload */}
                <button
                  onClick={() => !videoFile && videoInputRef.current?.click()}
                  className={`flex items-center gap-2 text-xs transition-colors ${
                    videoFile
                      ? "text-primary cursor-default"
                      : "text-muted-foreground hover:text-primary cursor-pointer"
                  }`}
                  title={videoFile ? "Video attached" : "Add a video (max 100 MB)"}
                >
                  <Video className="size-4" />
                  <span>{videoFile ? "1/1" : "0/1"}</span>
                </button>
                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="rounded-full h-8 px-4 cursor-pointer" onClick={() => setIsExpanded(false)}>Cancel</Button>
                <Button size="sm" className="rounded-full h-8 px-4 cursor-pointer" onClick={handlePost} disabled={postStatus !== "idle"}>
                  {postStatus === "uploading" ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 mb-6 border-b border-border flex items-center gap-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
          {flairs.map(f => (
            <button
              key={f}
              onClick={() => router.push(`/feed?flair=${f}&sort=${currentSort}`)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                currentFlair === f ? "bg-primary text-white" : "bg-card hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {mounted && (
          <Select value={currentSort} onValueChange={v => router.push(`/feed?flair=${currentFlair}&sort=${v}`)}>
            <SelectTrigger className="w-[130px] rounded-full h-8 text-xs px-4 cursor-pointer"><SelectValue /></SelectTrigger>
            <SelectContent>{sortOptions.map(s => <SelectItem key={s} value={s} className="text-xs cursor-pointer">{s}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>

      {/* ── Post Grid ── */}
      {loading ? (
        // Skeleton loader
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-40" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        // ── Empty state ──
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center">
            <Search className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-base">No whispers yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {currentFlair !== "All"
                ? <>Be the first to whisper under <span className="text-primary font-medium">{currentFlair}</span>!</>
                : "Be the first to post something!"}
            </p>
          </div>
          {currentFlair !== "All" && (
            <button
              onClick={() => router.push(`/feed?flair=All&sort=${currentSort}`)}
              className="text-xs text-primary underline underline-offset-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              View all whispers instead
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map(post => (
            <Link href={`/feed/${post.id}`} key={post.id} className="cursor-pointer">
              <PostCard
                title={post.title}
                excerpt={post.content}
                tag={post.flair}
                timeAgo={timeAgo(post.created_at)}
                likes={post.reactions[0]?.count ?? 0}
                comments={post.comments[0]?.count ?? 0}
                username={post.profiles?.username}
                avatar={getPostAvatar(post)}
                imageUrls={post.image_urls}
                videoUrl={post.video_url ?? null}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}