"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Bell, Heart, MessageCircle, Users } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"

export default function NotificationsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from("notifications")
      .select("*, actor:actor_id(username, avatar_url), post:post_id(title, user_id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (data) setNotifications(data)

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)

    return user.id
  }

  useEffect(() => {
    fetchNotifications().then(uid => {
      if (!uid) return
      const channel = supabase
        .channel(`notifications-page-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${uid}`
          },
          () => { fetchNotifications() }
        )
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    })
  }, [])

  const getNotificationText = (n: any) => {
    if (n.type === "reaction") return " liked your post"
    if (n.type === "follow") return " started following you"
    if (n.type === "comment") return " commented on your post"
    if (n.type === "comment_watch") return " commented on a post you're watching"
    return ""
  }

  const getIconBg = (type: string) => {
    if (type === "reaction") return "bg-red-500"
    if (type === "follow") return "bg-primary"
    if (type === "comment_watch") return "bg-yellow-500"
    return "bg-primary"
  }

  const handleClick = (n: any) => {
    if (n.type === "follow") {
      router.push(`/feed/user/${n.actor_id}`)
    } else if (n.post_id) {
      router.push(`/feed/${n.post_id}`)
    }
  }

  const grouped = notifications.reduce((acc: any, n: any) => {
    const date = new Date(n.created_at).toDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(n)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-6 space-y-6">
      <h1 className="font-serif text-2xl text-foreground">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Bell className="size-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-sm font-medium text-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">When someone reacts, comments, or follows you, you'll see it here</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]: any) => (
          <div key={date}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {new Date(date).toDateString() === new Date().toDateString() ? "Today" : date}
            </p>
            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
              {items.map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-4 text-left hover:bg-muted transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className="relative shrink-0">
                    {n.actor?.avatar_url ? (
                      <img src={n.actor.avatar_url} className="size-10 rounded-full object-cover" />
                    ) : (
                      <div className="size-10 rounded-full bg-muted" />
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 size-5 rounded-full flex items-center justify-center ${getIconBg(n.type)}`}>
                      {n.type === "reaction" ? (
                        <Heart className="size-2.5 text-white" />
                      ) : n.type === "follow" ? (
                        <Users className="size-2.5 text-white" />
                      ) : (
                        <MessageCircle className="size-2.5 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-semibold">@{n.actor?.username ?? "Someone"}</span>
                      {getNotificationText(n)}
                    </p>
                    {n.post?.title && n.type !== "follow" && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">"{n.post.title}"</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="size-2 rounded-full bg-primary shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}