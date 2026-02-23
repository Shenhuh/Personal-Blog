"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PostCard } from "@/components/PostCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Search, ImagePlus, X as XIcon } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"

const sortOptions = ["Latest", "Top Liked", "Most Commented", "Trending"]

export default function FeedPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentFlair = searchParams.get("flair") || "All"
  const currentSort = searchParams.get("sort") || "Latest"

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [flair, setFlair] = useState("")
  const [posts, setPosts] = useState<any[]>([])
  const [flairs, setFlairs] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [flairSearch, setFlairSearch] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const filterScrollRef = useRef<HTMLDivElement>(null)
  const formScrollRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      ref.current.scrollBy({ left: direction === "left" ? -150 : 150, behavior: "smooth" })
    }
  }

  const fetchFlairs = async () => {
    const { data } = await supabase.from("flairs").select("name").order("name")
    if (data) setFlairs(["All", ...data.map((f: any) => f.name)])
  }

  const fetchPosts = async () => {
    let query = supabase
      .from("posts")
      .select(`*, reactions(count), comments(count), profiles(username, avatar_url)`)

    if (currentFlair !== "All") {
      query = query.eq("flair", currentFlair)
    }

    query = query.order("created_at", { ascending: false })

    const { data } = await query

    if (data) {
      let sorted = data
      if (currentSort === "Top Liked") {
        sorted = [...data].sort((a, b) => (b.reactions[0]?.count ?? 0) - (a.reactions[0]?.count ?? 0))
      } else if (currentSort === "Most Commented") {
        sorted = [...data].sort((a, b) => (b.comments[0]?.count ?? 0) - (a.comments[0]?.count ?? 0))
      } else if (currentSort === "Trending") {
        sorted = [...data].sort((a, b) =>
          ((b.reactions[0]?.count ?? 0) + (b.comments[0]?.count ?? 0)) -
          ((a.reactions[0]?.count ?? 0) + (a.comments[0]?.count ?? 0))
        )
      }
      setPosts(sorted)
    }
  }

  useEffect(() => { fetchFlairs() }, [])
  useEffect(() => { fetchPosts() }, [currentFlair, currentSort])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (imageInputRef.current) imageInputRef.current.value = ""
  }

  const handlePost = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !title || !content || !flair) return

    let image_url = null
    if (imageFile) {
      const ext = imageFile.name.split(".").pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from("post-images").upload(path, imageFile)
      if (!error) {
        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path)
        image_url = urlData.publicUrl
      }
    }

    await supabase.from("posts").insert({ title, content, flair, user_id: user.id, image_url })
    setTitle("")
    setContent("")
    setFlair("")
    setImageFile(null)
    setImagePreview(null)
    setIsExpanded(false)
    fetchPosts()
  }

  const filteredFlairs = flairs.filter(f =>
    f !== "All" && f.toLowerCase().includes(flairSearch.toLowerCase())
  )

  // Split posts into image posts (full width) and text posts (grid)
  const renderPosts = () => {
    return posts.map(post => (
      <Link
        href={`/feed/${post.id}`}
        key={post.id}
        className={post.image_url ? "col-span-1 md:col-span-2" : "col-span-1"}
      >
        <PostCard
          title={post.title}
          excerpt={post.content}
          tag={post.flair}
          timeAgo={timeAgo(post.created_at)}
          likes={post.reactions[0]?.count ?? 0}
          comments={post.comments[0]?.count ?? 0}
          username={post.profiles?.username ?? "Anonymous"}
          avatar={post.profiles?.avatar_url ?? ""}
          imageUrl={post.image_url ?? ""}
        />
      </Link>
    ))
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-6">

      {/* Compact Post Form */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-3">
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full text-left text-sm text-muted-foreground px-2"
          >
            Whisper something...
          </button>
        ) : (
          <>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full bg-transparent text-lg font-semibold outline-none mb-3 border-b border-border pb-3"
              autoFocus
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Whisper something..."
              className="w-full bg-transparent resize-none outline-none text-sm text-muted-foreground h-20 mb-3"
            />

            {imagePreview && (
              <div className="relative mb-3 inline-block">
                <img src={imagePreview} className="max-h-48 rounded-xl border border-border" style={{ objectFit: "contain" }} />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 size-5 rounded-full bg-foreground text-background flex items-center justify-center"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">Flair:</span>
              <div className="flex items-center gap-1 border border-border rounded-full px-3 py-1">
                <Search className="size-3 text-muted-foreground shrink-0" />
                <input
                  value={flairSearch}
                  onChange={e => setFlairSearch(e.target.value)}
                  placeholder="Search flair..."
                  className="bg-transparent outline-none text-xs w-24"
                />
              </div>
              <button
                onClick={() => imageInputRef.current?.click()}
                className="ml-auto shrink-0 rounded-full border border-border p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Add image or GIF"
              >
                <ImagePlus className="size-3.5" />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*,.gif"
                className="hidden"
                onChange={handleImageSelect}
              />
            </div>

            <div className="flex items-center gap-1">
              {filteredFlairs.length > 0 ? (
                <>
                  <button onClick={() => scroll(formScrollRef, "left")} className="shrink-0 rounded-full border border-border p-1 hover:bg-muted">
                    <ChevronLeft className="size-3" />
                  </button>
                  <div ref={formScrollRef} className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
                    {filteredFlairs.map(f => (
                      <button
                        key={f}
                        onClick={() => setFlair(f)}
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                          flair === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => scroll(formScrollRef, "right")} className="shrink-0 rounded-full border border-border p-1 hover:bg-muted">
                    <ChevronRight className="size-3" />
                  </button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground flex-1">No flair found for "{flairSearch}"</p>
              )}
              <div className="flex gap-2 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => { setIsExpanded(false); setFlairSearch(""); setImageFile(null); setImagePreview(null) }}
                >
                  Discard
                </Button>
                <Button size="sm" onClick={handlePost} className="rounded-full">Post</Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Sticky Filters */}
      <div className="sticky top-0 z-10 bg-background py-3 mb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={() => scroll(filterScrollRef, "left")} className="shrink-0 rounded-full border border-border p-1 hover:bg-muted">
            <ChevronLeft className="size-3" />
          </button>
          <div ref={filterScrollRef} className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
            {flairs.map(f => (
              <button
                key={f}
                onClick={() => router.push(`/feed?flair=${f}&sort=${currentSort}`)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors border ${
                  currentFlair === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => scroll(filterScrollRef, "right")} className="shrink-0 rounded-full border border-border p-1 hover:bg-muted">
            <ChevronRight className="size-3" />
          </button>
          <div className="shrink-0">
            <Select value={currentSort} onValueChange={(value) => router.push(`/feed?flair=${currentFlair}&sort=${value}`)}>
              <SelectTrigger className="rounded-full text-xs h-8 px-4 border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(sort => (
                  <SelectItem key={sort} value={sort} className="text-xs">{sort}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Posts — 2 col grid, image posts span full width */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-4xl mb-4">🤫</p>
          <p className="text-sm font-medium text-foreground">No whispers here yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {currentFlair !== "All" ? `No posts found under "${currentFlair}"` : "Be the first to whisper something"}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {renderPosts()}
        </div>
      )}

    </div>
  )
}