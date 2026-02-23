"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Compass, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DiscoverPage() {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUser(user)
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
    if (data) setFollowingIds(data.map(f => f.following_id))
  }

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("profiles")
      .select("*, posts(count)")
      .neq("id", user.id)
      .order("created_at", { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  const handleFollow = async (targetId: string) => {
    if (!currentUser) return
    const isFollowing = followingIds.includes(targetId)
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", targetId)
      setFollowingIds(prev => prev.filter(id => id !== targetId))
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: targetId })
      setFollowingIds(prev => [...prev, targetId])
    }
  }

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.bio?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Compass className="size-5 text-foreground" />
        <h1 className="font-serif text-2xl text-foreground">Discover People</h1>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 border border-border rounded-full px-4 py-2 bg-card">
        <Search className="size-4 text-muted-foreground shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by username or bio..."
          className="bg-transparent outline-none text-sm flex-1"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Compass className="size-12 text-muted-foreground mb-4 opacity-20" />
          <p className="text-sm font-medium text-foreground">No users found</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different search</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(user => (
            <div
              key={user.id}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-foreground/20 transition-colors"
            >
              <button onClick={() => router.push(`/feed/user/${user.id}`)}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="size-12 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="size-12 rounded-full bg-muted shrink-0" />
                )}
              </button>

              <div className="flex-1 min-w-0" onClick={() => router.push(`/feed/user/${user.id}`)} role="button">
                <p className="text-sm font-semibold text-foreground hover:underline cursor-pointer">
                  @{user.username}
                </p>
                {user.bio ? (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{user.bio}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5 italic">No bio yet</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {user.posts[0]?.count ?? 0} whispers
                </p>
              </div>

              <Button
                size="sm"
                variant={followingIds.includes(user.id) ? "outline" : "default"}
                className="rounded-full shrink-0"
                onClick={() => handleFollow(user.id)}
              >
                {followingIds.includes(user.id) ? "Unfollow" : "Follow"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}