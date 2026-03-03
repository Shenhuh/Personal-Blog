"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X, Users, FileText, Clock, Heart, MessageCircle } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"
import { PostCard } from "@/components/PostCard"

type Tab = "all" | "posts" | "users"

export default function SearchPageContent() {  // ← only change: function name
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQuery)
  const [inputValue, setInputValue] = useState(initialQuery)
  const [tab, setTab] = useState<Tab>("all")
  const [posts, setPosts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = async (q: string) => {
    if (!q.trim()) { setPosts([]); setUsers([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    const term = q.trim()

    const [{ data: postsData }, { data: usersData }] = await Promise.all([
      supabase
        .from("posts")
        .select("*, reactions(count), comments(count), profiles(id, username, avatar_url)")
        .or(`title.ilike.%${term}%,content.ilike.%${term}%`)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .ilike("username", `%${term}%`)
        .limit(10),
    ])

    setPosts(postsData ?? [])
    setUsers(usersData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (initialQuery) runSearch(initialQuery)
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const q = searchParams.get("q") || ""
    setInputValue(q)
    setQuery(q)
    if (q) runSearch(q)
  }, [searchParams])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQuery(val)
      runSearch(val)
      const url = val.trim() ? `/feed/search?q=${encodeURIComponent(val.trim())}` : "/feed/search"
      window.history.replaceState(null, "", url)
    }, 300)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setQuery(inputValue)
      runSearch(inputValue)
    }
    if (e.key === "Escape") inputRef.current?.blur()
  }

  const clearSearch = () => {
    setInputValue("")
    setQuery("")
    setPosts([])
    setUsers([])
    setSearched(false)
    window.history.replaceState(null, "", "/feed/search")
    inputRef.current?.focus()
  }

  const totalResults = posts.length + users.length
  const visiblePosts = tab === "users" ? [] : posts
  const visibleUsers = tab === "posts" ? [] : users

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">

      {/* Search input */}
      <div className="mb-6">
        <div className="flex items-center gap-2 border border-border rounded-2xl px-4 py-3 bg-background focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search posts, users..."
            className="bg-transparent outline-none text-sm flex-1 text-foreground placeholder:text-muted-foreground"
          />
          {inputValue && (
            <button onClick={clearSearch} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs + result count */}
      {searched && !loading && (
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {([
              { key: "all", label: `All (${totalResults})` },
              { key: "posts", label: `Posts (${posts.length})` },
              { key: "users", label: `Users (${users.length})` },
            ] as { key: Tab; label: string }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  tab === t.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {query && (
            <p className="text-xs text-muted-foreground hidden sm:block">
              Results for <span className="font-medium text-foreground">"{query}"</span>
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">Searching...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Search className="size-7 text-muted-foreground/50" />
          </div>
          <p className="text-base font-medium text-foreground mb-1">Search Whisper</p>
          <p className="text-sm text-muted-foreground max-w-xs">Find posts by title or content, or discover users by username</p>
        </div>
      )}

      {/* No results */}
      {!loading && searched && totalResults === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Search className="size-7 text-muted-foreground/50" />
          </div>
          <p className="text-base font-medium text-foreground mb-1">No results found</p>
          <p className="text-sm text-muted-foreground">
            Nothing matched <span className="font-medium text-foreground">"{query}"</span>. Try a different search.
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && searched && totalResults > 0 && (
        <div className="space-y-8">
          {visibleUsers.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="size-3.5" /> Users
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => router.push(`/feed/user/${user.id}`)}
                    className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-md transition-all text-left"
                  >
                    {user.avatar_url
                      ? <img src={user.avatar_url} className="size-10 rounded-full object-cover shrink-0" />
                      : <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0"><Users className="size-4 text-muted-foreground" /></div>}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">@{user.username}</p>
                      {user.bio && <p className="text-xs text-muted-foreground truncate mt-0.5">{user.bio}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {visiblePosts.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="size-3.5" /> Posts
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {visiblePosts.map(post => (
                  <Link href={`/feed/${post.id}`} key={post.id}>
                    <PostCard
                      title={post.title}
                      excerpt={post.content}
                      tag={post.flair}
                      timeAgo={timeAgo(post.created_at)}
                      likes={post.reactions[0]?.count ?? 0}
                      comments={post.comments[0]?.count ?? 0}
                      username={post.profiles?.username}
                      avatar={post.profiles?.avatar_url}
                      imageUrls={post.image_urls ?? []}
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}