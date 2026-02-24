"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PostCard } from "@/components/PostCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, ImagePlus, X as XIcon, AlertCircle, Tag } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"

const sortOptions = ["Latest", "Top Liked", "Most Commented", "Trending"]
type PostStatus = "idle" | "uploading" | "posting" | "done" | "error"

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
  const [flairs, setFlairs] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [flairSearch, setFlairSearch] = useState("")
  const [showFlairDropdown, setShowFlairDropdown] = useState(false) // Added for stable dropdown
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [postStatus, setPostStatus] = useState<PostStatus>("idle")
  const [validationMsg, setValidationMsg] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null) // To detect clicks outside
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Fetch Flairs
  const fetchFlairs = async () => {
    const { data } = await supabase.from("flairs").select("name").order("name")
    if (data) setFlairs(["All", ...data.map((f: any) => f.name)])
  }

  // Fetch Posts
  const fetchPosts = async () => {
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
  }

  useEffect(() => { fetchFlairs() }, [])
  useEffect(() => { fetchPosts() }, [currentFlair, currentSort])

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFlairDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const toAdd = files.slice(0, 4 - imageFiles.length)
    setImageFiles(prev => [...prev, ...toAdd])
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
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
      await supabase.from("posts").insert({ title, content, flair, user_id: user.id, image_urls })
      setPostStatus("done")
      setTitle(""); setContent(""); setFlair(""); setImageFiles([]); setImagePreviews([]); setIsExpanded(false)
      fetchPosts()
      setTimeout(() => setPostStatus("idle"), 2500)
    } catch { setPostStatus("error") }
  }

  const filteredFlairs = flairs.filter(f => f !== "All" && f.toLowerCase().includes(flairSearch.toLowerCase()))

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-6">
      {validationMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-card border border-orange-500/30 rounded-2xl px-5 py-3 shadow-xl">
          <AlertCircle className="size-4 text-orange-500" />
          <p className="text-xs font-medium">{validationMsg}</p>
        </div>
      )}

      {/* Post Composer */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6 shadow-sm">
        {!isExpanded ? (
          <button onClick={() => setIsExpanded(true)} className="w-full text-left text-sm text-muted-foreground px-2 py-1">Whisper something...</button>
        ) : (
          <div className="flex flex-col gap-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full bg-transparent text-lg font-semibold outline-none border-b border-border pb-2" autoFocus />
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Content" className="w-full bg-transparent resize-none outline-none text-sm text-muted-foreground h-24" />
            
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 mb-2">
                {imagePreviews.map((p, i) => (
                  <div key={i} className="relative group">
                    <img src={p} className="size-16 rounded-lg object-cover border border-border" />
                    <button onClick={() => {
                      setImageFiles(f => f.filter((_, idx) => idx !== i));
                      setImagePreviews(p => p.filter((_, idx) => idx !== i));
                    }} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><XIcon className="size-3"/></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-3">
                {/* STABLE CUSTOM FLAIR DROPDOWN */}
                <div className="relative" ref={dropdownRef}>
                  <button 
                    type="button"
                    onClick={() => setShowFlairDropdown(!showFlairDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-xs hover:bg-muted transition-colors border border-border min-w-[120px]"
                  >
                    <Tag className="size-3 text-muted-foreground" />
                    <span className="truncate">{flair || "Add Flair"}</span>
                  </button>

                  {showFlairDropdown && (
                    <div className="absolute top-full mt-2 left-0 w-52 bg-card border border-border rounded-xl shadow-2xl z-[110] p-2 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center px-2 py-1 border-b border-border mb-1">
                        <Search className="size-3 mr-2 text-muted-foreground" />
                        <input 
                          className="bg-transparent outline-none text-xs w-full py-1"
                          placeholder="Search..."
                          value={flairSearch}
                          onChange={(e) => setFlairSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar">
                        {filteredFlairs.map(f => (
                          <button
                            key={f}
                            onClick={() => { setFlair(f); setShowFlairDropdown(false); setFlairSearch(""); }}
                            className="w-full text-left px-2 py-2 text-xs hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                          >
                            {f}
                          </button>
                        ))}
                        {filteredFlairs.length === 0 && <p className="text-[10px] text-center py-2 text-muted-foreground">No results</p>}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                  <ImagePlus className="size-4" />
                  <span>{imageFiles.length}/4</span>
                </button>
                <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="rounded-full h-8 px-4" onClick={() => setIsExpanded(false)}>Cancel</Button>
                <Button size="sm" className="rounded-full h-8 px-4" onClick={handlePost} disabled={postStatus !== 'idle'}>
                  {postStatus === 'uploading' ? 'Posting...' : 'Post'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar (Feed Navigation) */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md py-4 mb-6 border-b border-border flex items-center gap-4">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
          {flairs.map(f => (
            <button key={f} onClick={() => router.push(`/feed?flair=${f}&sort=${currentSort}`)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium border transition-all ${currentFlair === f ? "bg-primary text-white" : "bg-card"}`}>{f}</button>
          ))}
        </div>
        <Select value={currentSort} onValueChange={(v) => router.push(`/feed?flair=${currentFlair}&sort=${v}`)}>
          <SelectTrigger className="w-[130px] rounded-full h-8 text-xs px-4"><SelectValue /></SelectTrigger>
          <SelectContent>{sortOptions.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Post Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map(post => (
          <Link href={`/feed/${post.id}`} key={post.id}>
            <PostCard 
              title={post.title} excerpt={post.content} tag={post.flair} timeAgo={timeAgo(post.created_at)}
              likes={post.reactions[0]?.count ?? 0} comments={post.comments[0]?.count ?? 0}
              username={post.profiles?.username} avatar={post.profiles?.avatar_url}
              imageUrls={post.image_urls}
            />
          </Link>
        ))}
      </div>
    </div>
  )
}