"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Compass, Search, Hash, TrendingUp } from "lucide-react"

// Determines if text should be light or dark based on background image brightness
function useImageBrightness(imageUrl: string | null) {
  const [isDark, setIsDark] = useState(false) // isDark = true means image is dark → use light text

  useEffect(() => {
    if (!imageUrl) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = imageUrl

    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Sample a small portion for performance
      canvas.width = 50
      canvas.height = 20
      ctx.drawImage(img, 0, 0, 50, 20)

      const { data } = ctx.getImageData(0, 0, 50, 20)
      let totalBrightness = 0
      const pixelCount = data.length / 4

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2]
        // Perceived brightness formula
        totalBrightness += (r * 299 + g * 587 + b * 114) / 1000
      }

      const avgBrightness = totalBrightness / pixelCount
      setIsDark(avgBrightness < 128) // dark image → use white text
    }
  }, [imageUrl])

  return isDark
}

function FollowButton({
  isFollowing,
  hasCover,
  isDarkBg,
  onClick,
}: {
  isFollowing: boolean
  hasCover: boolean
  isDarkBg: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  const getStyle = (): React.CSSProperties => {
    if (!hasCover) return {}

    if (isFollowing) {
      // Outline style
      const base: React.CSSProperties = {
        background: hovered ? (isDarkBg ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)") : "transparent",
        color: isDarkBg ? "white" : "#111",
        borderColor: isDarkBg ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
        transform: pressed ? "scale(0.95)" : "scale(1)",
        opacity: pressed ? 0.8 : 1,
      }
      return base
    } else {
      // Filled style
      const bgBase = isDarkBg ? "255,255,255" : "17,17,17"
      return {
        background: pressed
          ? `rgba(${bgBase}, 0.75)`
          : hovered
          ? `rgba(${bgBase}, 0.85)`
          : `rgba(${bgBase}, 1)`,
        color: isDarkBg ? "#111" : "white",
        borderColor: "transparent",
        transform: pressed ? "scale(0.95)" : "scale(1)",
      }
    }
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      className="rounded-full shrink-0 px-4 py-1.5 text-sm font-medium border cursor-pointer"
      style={{
        transition: "background 0.15s, transform 0.1s, opacity 0.1s, border-color 0.15s",
        ...getStyle(),
      }}
    >
      {isFollowing ? "Unfollow" : "Follow"}
    </button>
  )
}

// Individual user card with cover photo background
function UserCard({
  user,
  isFollowing,
  onFollow,
  onNavigate,
}: {
  user: any
  isFollowing: boolean
  onFollow: (id: string) => void
  onNavigate: (id: string) => void
}) {
  const isDarkBg = useImageBrightness(user.cover_url ?? null)

  // If there's a cover photo, use dynamic text color. Otherwise use default card styles.
  const hasCover = !!user.cover_url
  const textPrimary = hasCover ? (isDarkBg ? "text-white" : "text-gray-900") : "text-foreground"
  const textSecondary = hasCover ? (isDarkBg ? "text-white/75" : "text-gray-700") : "text-muted-foreground"
  const textMeta = hasCover ? (isDarkBg ? "text-white/60" : "text-gray-600") : "text-muted-foreground"

  return (
    <div
      className="relative flex items-center gap-4 rounded-2xl border border-border overflow-hidden p-4 hover:border-foreground/20 transition-colors"
      style={
        hasCover
          ? {
              backgroundImage: `url(${user.cover_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}
      }
    >
      {/* Dark/light overlay for readability when cover exists */}
      {hasCover && (
        <div
          className="absolute inset-0"
          style={{
            background: isDarkBg
              ? "linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 100%)"
              : "linear-gradient(to right, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.4) 100%)",
          }}
        />
      )}

      {/* Card content — must be above overlay */}
      <div className="relative z-10 flex items-center gap-4 w-full">
        <button onClick={() => onNavigate(user.id)}>
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              className="size-12 rounded-full object-cover shrink-0 ring-2 ring-white/30"
            />
          ) : (
            <div className="size-12 rounded-full bg-muted shrink-0 ring-2 ring-white/20" />
          )}
        </button>

        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onNavigate(user.id)}
          role="button"
        >
          <p className={`text-sm font-semibold hover:underline ${textPrimary}`}>
            @{user.username}
          </p>
          {user.bio ? (
            <p className={`text-xs mt-0.5 line-clamp-1 ${textSecondary}`}>{user.bio}</p>
          ) : (
            <p className={`text-xs mt-0.5 italic ${textSecondary}`}>No bio yet</p>
          )}
          <p className={`text-[10px] mt-1 flex items-center gap-2 ${textMeta}`}>
            <span>{user.follows?.[0]?.count ?? 0} followers</span>
            <span className="opacity-40">·</span>
            <span>{user.posts[0]?.count ?? 0} whispers</span>
          </p>
        </div>

        <FollowButton
          isFollowing={isFollowing}
          hasCover={hasCover}
          isDarkBg={isDarkBg}
          onClick={() => onFollow(user.id)}
        />
      </div>
    </div>
  )
}

export default function DiscoverPage() {
  const supabase = createClient()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [followingIds, setFollowingIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [trendingTags, setTrendingTags] = useState<{ tag: string; count: number }[]>([])
  const [loadingTags, setLoadingTags] = useState(true)

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUser(user)
    const { data } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
    if (data) setFollowingIds(data.map((f) => f.following_id))
  }

  const fetchUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("profiles")
      .select("*, posts(count), follows!follows_following_id_fkey(count)")
      .neq("id", user.id)
      .order("created_at", { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  const fetchTrendingTags = async () => {
    setLoadingTags(true)
    const { data } = await supabase
      .from("posts")
      .select("content")
      .not("content", "is", null)
      .limit(200)
    if (data) {
      const counts: Record<string, number> = {}
      for (const post of data) {
        const matches = post.content?.match(/#[a-zA-Z0-9_]+/g) ?? []
        for (const tag of matches) {
          const normalized = tag.toLowerCase()
          counts[normalized] = (counts[normalized] ?? 0) + 1
        }
      }
      const sorted = Object.entries(counts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12)
      setTrendingTags(sorted)
    }
    setLoadingTags(false)
  }

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
    fetchTrendingTags()
  }, [])

  const handleFollow = async (targetId: string) => {
    if (!currentUser) return
    const isFollowing = followingIds.includes(targetId)
    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", targetId)
      setFollowingIds((prev) => prev.filter((id) => id !== targetId))
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: currentUser.id, following_id: targetId })
      setFollowingIds((prev) => [...prev, targetId])
    }
  }

  const filtered = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.bio?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <span className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-6 space-y-8">

      {/* TRENDING HASHTAGS */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="size-5 text-primary" />
          <h2 className="font-serif text-xl text-foreground">Trending Hashtags</h2>
        </div>
        {loadingTags ? (
          <div className="flex items-center justify-center py-8">
            <span className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trendingTags.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Hash className="size-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hashtags used yet. Start a trend!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {trendingTags.map(({ tag, count }, i) => (
              <button
                key={tag}
                onClick={() => router.push(`/feed/hashtag/${tag.replace("#", "")}`)}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md transition-all text-left group"
              >
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Hash className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    #{tag.replace("#", "")}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {count} {count === 1 ? "post" : "posts"}
                  </p>
                </div>
                {i < 3 && (
                  <span className="text-[10px] font-bold text-orange-500 shrink-0">HOT</span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-border" />

      {/* DISCOVER PEOPLE */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <Compass className="size-5 text-foreground" />
          <h2 className="font-serif text-xl text-foreground">Discover People</h2>
        </div>
        <div className="flex items-center gap-2 border border-border rounded-full px-4 py-2 bg-card mb-4">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            {filtered.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                isFollowing={followingIds.includes(user.id)}
                onFollow={handleFollow}
                onNavigate={(id) => router.push(`/feed/user/${id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}