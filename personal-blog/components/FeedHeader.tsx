"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export default function FeedHeader() {
  const supabase = createClient()
  const [username, setUsername] = useState("")
  const [avatar, setAvatar] = useState("")

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single()
      if (data) {
        setUsername(data.username)
        setAvatar(data.avatar_url ?? "")
      }
    }
    getProfile()
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b bg-background px-6 py-3 flex items-center justify-between gap-4">
      {/* Search */}
      <div className="flex items-center gap-2 border border-border rounded-full px-4 py-2 flex-1 max-w-xl bg-muted">
        <Search className="size-4 text-muted-foreground shrink-0" />
        <input
          placeholder="Search whispers..."
          className="bg-transparent outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* User */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Logged in as</p>
          <p className="text-sm font-semibold text-foreground">@{username}</p>
        </div>
        {avatar ? (
          <img src={avatar} className="size-8 rounded-full object-cover" />
        ) : (
          <div className="size-8 rounded-full bg-muted border border-border" />
        )}
      </div>
    </header>
  )
}