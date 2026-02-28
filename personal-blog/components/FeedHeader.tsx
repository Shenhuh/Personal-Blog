"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { Search, Bell, Heart, MessageCircle, Users, Menu, FileText, X, CornerDownRight } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function FeedHeader() {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [username, setUsername] = useState("")
  const [avatar, setAvatar] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showPopup, setShowPopup] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Search
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ posts: any[], users: any[] }>({ posts: [], users: [] })
  const [showSearch, setShowSearch] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  // ── SEARCH ────────────────────────────────────────────────────────────────
  const runSearch = async (q: string) => {
    if (!q.trim()) {
      setSearchResults({ posts: [], users: [] })
      return
    }
    setSearchLoading(true)
    const term = q.trim()
    const [{ data: posts }, { data: users }] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, flair, created_at, profiles(username, avatar_url)")
        .ilike("title", `%${term}%`)
        .limit(5),
      supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${term}%`)
        .limit(4),
    ])
    setSearchResults({ posts: posts ?? [], users: users ?? [] })
    setSearchLoading(false)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setShowSearch(true)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => runSearch(val), 300)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      setShowSearch(false)
      router.push(`/feed/search?q=${encodeURIComponent(query.trim())}`)
    }
    if (e.key === "Escape") {
      setShowSearch(false)
      searchInputRef.current?.blur()
    }
  }

  const clearSearch = () => {
    setQuery("")
    setSearchResults({ posts: [], users: [] })
    setShowSearch(false)
    searchInputRef.current?.focus()
  }

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowSearch(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  const fetchNotifications = async (uid: string) => {
    const { data } = await supabase
      .from("notifications")
      .select("*, actor:actor_id(username, avatar_url), post:post_id(title, user_id), comment_id")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }

  const markAllRead = async (uid: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", uid).eq("is_read", false)
    fetchNotifications(uid)
  }

  const handleBellClick = () => {
    setShowPopup(prev => !prev)
    if (!showPopup && unreadCount > 0 && userId) markAllRead(userId)
  }

  const getNotificationText = (n: any) => {
    if (n.type === "reaction") return " liked your post"
    if (n.type === "follow") return " started following you"
    if (n.type === "comment") return " commented on your post"
    if (n.type === "comment_watch") return " commented on a post you're watching"
    if (n.type === "reply") return " replied to your comment"
    return ""
  }

  const getIconBg = (type: string) => {
    if (type === "reaction") return "bg-red-500"
    if (type === "follow") return "bg-primary"
    if (type === "comment_watch") return "bg-yellow-500"
    if (type === "reply") return "bg-violet-500"
    return "bg-primary"
  }

  const handleNotificationClick = (n: any) => {
    setShowPopup(false)
    if (n.type === "follow") { router.push(`/feed/user/${n.actor_id}`); return }
    if (n.post_id) {
      const targetPath = `/feed/${n.post_id}`
      const needsHash = (n.type === "comment" || n.type === "comment_watch" || n.type === "reply") && n.comment_id
      const hash = needsHash ? `#comment-${n.comment_id}` : ""
      const fullUrl = `${targetPath}${hash}`
      if (pathname === targetPath && hash) window.location.hash = hash
      else router.push(fullUrl)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setShowPopup(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const onAvatarUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ avatar_url: string; userId: string }>).detail
      // Always apply — this event is only ever fired by the current user's own profile page
      if (detail?.avatar_url) setAvatar(detail.avatar_url)
    }
    const onStorage = (e: StorageEvent) => {
      const uid = userIdRef.current
      if (uid && e.key === `live_avatar_url_${uid}` && e.newValue) setAvatar(e.newValue)
    }
    window.addEventListener("avatar-updated", onAvatarUpdated)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("avatar-updated", onAvatarUpdated)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  useEffect(() => {
    let channel: any = null
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      userIdRef.current = user.id
      const { data: profileData } = await supabase.from("profiles").select("username, avatar_url").eq("id", user.id).single()
      if (profileData) {
        setUsername(profileData.username)
        const cached = localStorage.getItem(`live_avatar_url_${user.id}`)
        setAvatar(cached || profileData.avatar_url || "")
      }
      await fetchNotifications(user.id)
      channel = supabase.channel(`notif-header-${user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications(user.id))
        .subscribe()
    }
    init()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  const hasResults = searchResults.posts.length > 0 || searchResults.users.length > 0

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur px-4 md:px-6 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-4">

        <div className="md:hidden flex items-center">
          <SidebarTrigger>
            <Menu className="size-5 text-muted-foreground" />
          </SidebarTrigger>
        </div>

        {/* SEARCH */}
        <div ref={searchRef} className="relative flex-1 max-w-xl">
          <div className={`flex items-center gap-2 border rounded-full px-4 py-2 bg-background transition-colors ${showSearch ? "border-primary/50 ring-2 ring-primary/10" : "border-border"}`}>
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => { if (query) setShowSearch(true) }}
              placeholder="Search whispers..."
              className="bg-transparent outline-none text-sm flex-1 text-foreground placeholder:text-muted-foreground min-w-0"
            />
            {query && (
              <button onClick={clearSearch} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {showSearch && query.trim() && (
            <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden">
              {searchLoading ? (
                <div className="flex items-center justify-center py-6">
                  <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !hasResults ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Search className="size-6 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No results for "<span className="font-medium text-foreground">{query}</span>"</p>
                </div>
              ) : (
                <div className="py-2">
                  {/* Users */}
                  {searchResults.users.length > 0 && (
                    <div>
                      <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Users</p>
                      {searchResults.users.map(user => (
                        <button
                          key={user.id}
                          onClick={() => { router.push(`/feed/user/${user.id}`); setShowSearch(false); setQuery("") }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                        >
                          {user.avatar_url
                            ? <img src={user.avatar_url} className="size-7 rounded-full object-cover shrink-0" />
                            : <div className="size-7 rounded-full bg-muted border border-border shrink-0 flex items-center justify-center"><Users className="size-3.5 text-muted-foreground" /></div>}
                          <span className="text-sm font-medium text-foreground">@{user.username}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Posts */}
                  {searchResults.posts.length > 0 && (
                    <div className={searchResults.users.length > 0 ? "border-t border-border mt-1 pt-1" : ""}>
                      <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Posts</p>
                      {searchResults.posts.map(post => (
                        <button
                          key={post.id}
                          onClick={() => { router.push(`/feed/${post.id}`); setShowSearch(false); setQuery("") }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                        >
                          <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="size-3.5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground truncate">{post.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              @{post.profiles?.username} · {post.flair} · {timeAgo(post.created_at)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* See all results */}
                  <div className="border-t border-border mt-1">
                    <button
                      onClick={() => { router.push(`/feed/search?q=${encodeURIComponent(query.trim())}`); setShowSearch(false) }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-xs text-primary hover:bg-muted transition-colors font-medium"
                    >
                      <Search className="size-3.5" />
                      See all results for "{query}"
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          {/* NOTIFICATIONS */}
          <div className="relative" ref={popupRef}>
            <button onClick={handleBellClick} className="relative p-2 rounded-full hover:bg-muted transition-colors">
              <Bell className="size-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showPopup && (
              <div className="absolute right-0 top-11 w-72 md:w-80 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={() => userId && markAllRead(userId)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-border">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Bell className="size-8 text-muted-foreground mb-2 opacity-30" />
                      <p className="text-xs text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <button key={n.id} onClick={() => handleNotificationClick(n)} className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}>
                        <div className="relative shrink-0">
                          {n.actor?.avatar_url
                            ? <img src={n.actor.avatar_url} className="size-8 rounded-full object-cover mt-0.5" />
                            : <div className="size-8 rounded-full bg-muted mt-0.5" />}
                          <div className={`absolute -bottom-0.5 -right-0.5 size-4 rounded-full flex items-center justify-center ${getIconBg(n.type)}`}>
                            {n.type === "reaction" ? <Heart className="size-2 text-white" />
                              : n.type === "follow" ? <Users className="size-2 text-white" />
                              : n.type === "reply" ? <CornerDownRight className="size-2 text-white" />
                              : <MessageCircle className="size-2 text-white" />}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground leading-snug">
                            <span className="font-semibold">@{n.actor?.username ?? "Someone"}</span>
                            {getNotificationText(n)}
                          </p>
                          {n.post?.title && n.type !== "follow" && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">"{n.post.title}"</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                      </button>
                    ))
                  )}
                </div>
                <div className="border-t border-border px-4 py-2.5">
                  <button onClick={() => { router.push("/feed/notifications"); setShowPopup(false) }} className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* USER AVATAR */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Logged in as</p>
              <p className="text-sm font-medium text-foreground">@{username}</p>
            </div>
            <button onClick={() => router.push("/feed/profile")} className="flex items-center justify-center shrink-0 rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
              {avatar
                ? <img src={avatar} className="size-8 rounded-full object-cover shadow-sm" alt="Profile" />
                : <div className="size-8 rounded-full bg-muted flex items-center justify-center"><Users className="size-4 text-muted-foreground" /></div>}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}