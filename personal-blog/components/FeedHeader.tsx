"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Search, Bell, Heart, MessageCircle } from "lucide-react"
import Link from "next/link"
import { timeAgo } from "@/lib/timeAgo"

export default function FeedHeader() {
  const supabase = createClient()
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [avatar, setAvatar] = useState("")
  const [notifications, setNotifications] = useState<any[]>([])
  const [showPopup, setShowPopup] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from("profiles").select("username, avatar_url").eq("id", user.id).single()
    if (data) {
      setUsername(data.username)
      setAvatar(data.avatar_url ?? "")
    }
  }

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("notifications")
      .select("*, actor:actor_id(username, avatar_url), post:post_id(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
    if (data) setNotifications(data)
  }

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
    fetchNotifications()
  }

  const handleBellClick = () => {
    setShowPopup(prev => !prev)
    if (!showPopup && unreadCount > 0) markAllRead()
  }

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Realtime notifications
  useEffect(() => {
    fetchProfile()
    fetchNotifications()

    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications"
      }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur px-6 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-4">

        {/* Search */}
        <div className="flex items-center gap-2 border border-border rounded-full px-4 py-2 flex-1 max-w-xl bg-background">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            placeholder="Search whispers..."
            className="bg-transparent outline-none text-sm flex-1 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-3 ml-auto">

          {/* Notification Bell */}
          <div className="relative" ref={popupRef}>
            <button
              onClick={handleBellClick}
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Bell className="size-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Popup */}
            {showPopup && (
              <div className="absolute right-0 top-11 w-80 rounded-2xl border border-border bg-card shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
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
                      <button
                        key={n.id}
                        onClick={() => {
                          router.push(`/feed/${n.post_id}`)
                          setShowPopup(false)
                        }}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
                      >
                        {n.actor?.avatar_url ? (
                          <img src={n.actor.avatar_url} className="size-8 rounded-full object-cover shrink-0 mt-0.5" />
                        ) : (
                          <div className="size-8 rounded-full bg-muted shrink-0 mt-0.5 flex items-center justify-center">
                            {n.type === "reaction" ? (
                              <Heart className="size-3.5 text-red-400" />
                            ) : (
                              <MessageCircle className="size-3.5 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-foreground leading-snug">
                            <span className="font-semibold">@{n.actor?.username ?? "Someone"}</span>
                            {n.type === "reaction" ? " liked your post" : " commented on your post"}
                          </p>
                          {n.post?.title && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">"{n.post.title}"</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.is_read && (
                          <div className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-border px-4 py-2.5">
                  <button
                    onClick={() => { router.push("/feed/notifications"); setShowPopup(false) }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Logged in as</p>
              <p className="text-sm font-medium text-foreground">@{username}</p>
            </div>
            {avatar ? (
              <img src={avatar} className="size-8 rounded-full object-cover" />
            ) : (
              <div className="size-8 rounded-full bg-muted" />
            )}
          </div>

        </div>
      </div>
    </header>
  )
}