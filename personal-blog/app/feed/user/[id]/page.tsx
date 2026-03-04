"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, Heart, MessageSquare, MoreHorizontal, BellOff, Bell, Ban, ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"

function formatJoinDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export default function UserProfilePage() {
  const supabase = createClient()
  const { id } = useParams()
  const router = useRouter()

  // useParams can return string | string[] — normalise to string
  const userId = Array.isArray(id) ? id[0] : id

  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Single ref for the menu container — works for both mobile and desktop
  // because only one is visible at a time (CSS hides the other)
  const desktopMenuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedDesktop = desktopMenuRef.current?.contains(target)
      const clickedMobile = mobileMenuRef.current?.contains(target)
      if (!clickedDesktop && !clickedMobile) setMenuOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user ?? null)

    const [{ data: profileData }, { data: postsData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("posts")
        .select("*, reactions(count), comments(count)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
    ])

    if (profileData) setProfile(profileData)
    if (postsData) setPosts(postsData)

    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    ])

    setFollowerCount(followers ?? 0)
    setFollowingCount(following ?? 0)

    if (user) {
      const [{ data: followData }, { data: muteData }, { data: blockData }] = await Promise.all([
        supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle(),
        supabase.from("mutes").select("id").eq("muter_id", user.id).eq("muted_id", userId).maybeSingle(),
        supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", userId).maybeSingle(),
      ])
      setIsFollowing(!!followData)
      setIsMuted(!!muteData)
      setIsBlocked(!!blockData)
    }

    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [userId])

  const handleFollow = async () => {
    if (!currentUser) return
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", userId)
      setIsFollowing(false)
      setFollowerCount(prev => prev - 1)
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: userId })
      setIsFollowing(true)
      setFollowerCount(prev => prev + 1)
    }
  }

  const handleMute = async () => {
    if (!currentUser) return
    setMenuOpen(false)
    if (isMuted) {
      const { error } = await supabase.from("mutes").delete().eq("muter_id", currentUser.id).eq("muted_id", userId)
      if (error) { console.error("unmute error:", error); return }
      setIsMuted(false)
      showToast(`@${profile?.username} unmuted`)
    } else {
      const { error } = await supabase.from("mutes").insert({ muter_id: currentUser.id, muted_id: userId })
      if (error) { console.error("mute error:", error); return }
      setIsMuted(true)
      showToast(`@${profile?.username} muted — their posts won't appear in your feed`)
    }
  }

  const handleBlock = async () => {
    if (!currentUser) return
    setMenuOpen(false)
    if (isBlocked) {
      const { error } = await supabase.from("blocks").delete().eq("blocker_id", currentUser.id).eq("blocked_id", userId)
      if (error) { console.error("unblock error:", error); return }
      setIsBlocked(false)
      showToast(`@${profile?.username} unblocked`)
    } else {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", userId)
        setIsFollowing(false)
        setFollowerCount(prev => prev - 1)
      }
      const { error } = await supabase.from("blocks").insert({ blocker_id: currentUser.id, blocked_id: userId })
      if (error) { console.error("block error:", error); return }
      setIsBlocked(true)
      showToast(`@${profile?.username} blocked`)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profile) return (
    <div className="text-center py-24 text-muted-foreground">User not found</div>
  )

  const isOwnProfile = currentUser?.id === userId
  const coverPos = profile.cover_position ?? { x: 50, y: 50 }
  const avatarPos = profile.avatar_position ?? { x: 50, y: 50 }

  const MoreMenuItems = () => (
    <>
      <button
        onClick={handleMute}
        className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-muted transition-colors text-sm text-foreground"
      >
        {isMuted
          ? <><Bell className="size-4 text-muted-foreground shrink-0" /> Unmute @{profile.username}</>
          : <><BellOff className="size-4 text-muted-foreground shrink-0" /> Mute @{profile.username}</>
        }
      </button>
      <div className="h-px bg-border mx-2 my-1" />
      <button
        onClick={handleBlock}
        className={`flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-muted transition-colors text-sm ${isBlocked ? "text-foreground" : "text-red-500"}`}
      >
        {isBlocked
          ? <><ShieldOff className="size-4 shrink-0" /> Unblock @{profile.username}</>
          : <><Ban className="size-4 shrink-0" /> Block @{profile.username}</>
        }
      </button>
    </>
  )

  return (
    <div className="w-full min-h-screen bg-background">

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 bg-foreground text-background text-xs font-medium px-4 py-2.5 rounded-full shadow-xl pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
          {toast}
        </div>
      )}

      {/* ── COVER PHOTO ── */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 bg-muted">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${coverPos.x}% ${coverPos.y}%` }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-muted" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-full bg-background/80 hover:bg-background text-foreground border border-border shadow-md backdrop-blur-sm transition-all"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </div>

      {/* ── PROFILE SECTION ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-4">
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="size-20 sm:size-24 md:size-28 rounded-2xl border-4 border-background shadow-lg object-cover"
                style={{ objectPosition: `${avatarPos.x}% ${avatarPos.y}%` }}
              />
            ) : (
              <div className="size-20 sm:size-24 md:size-28 rounded-2xl bg-muted border-4 border-background shadow-lg" />
            )}
          </div>

          {/* Stats + actions — desktop */}
          <div className="hidden sm:flex items-center gap-6 pb-1">
            {[
              { label: "Followers", value: followerCount },
              { label: "Following", value: followingCount },
              { label: "Posts", value: posts.length },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-xl font-bold text-foreground leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}

            {isOwnProfile ? (
              <Button size="sm" variant="outline" className="rounded-full shrink-0 px-6"
                onClick={() => router.push("/feed/profile")}>
                Edit profile
              </Button>
            ) : currentUser && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isFollowing ? "outline" : "default"}
                  className="rounded-full shrink-0 px-6"
                  onClick={handleFollow}
                  disabled={isBlocked}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </Button>
                {/* Desktop more menu */}
                <div className="relative" ref={desktopMenuRef}>
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="flex items-center justify-center size-8 rounded-full border border-border bg-card hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-xl shadow-xl overflow-hidden py-1 z-50">
                      <MoreMenuItems />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Username, bio, joined */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                @{profile.username}
              </h1>
              {currentUser && !isOwnProfile && (isMuted || isBlocked) && (
                <div className="flex items-center gap-2 mt-1.5">
                  {isMuted && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      <BellOff className="size-2.5" /> Muted
                    </span>
                  )}
                  {isBlocked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                      <Ban className="size-2.5" /> Blocked
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Mobile actions */}
            <div className="flex sm:hidden items-center gap-2 mt-1 shrink-0">
              {isOwnProfile ? (
                <Button size="sm" variant="outline" className="rounded-full px-5"
                  onClick={() => router.push("/feed/profile")}>
                  Edit profile
                </Button>
              ) : currentUser && (
                <>
                  <Button
                    size="sm"
                    variant={isFollowing ? "outline" : "default"}
                    className="rounded-full px-5"
                    onClick={handleFollow}
                    disabled={isBlocked}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                  {/* Mobile more menu — separate ref */}
                  <div className="relative" ref={mobileMenuRef}>
                    <button
                      onClick={() => setMenuOpen(v => !v)}
                      className="flex items-center justify-center size-8 rounded-full border border-border bg-card hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-10 w-52 bg-card border border-border rounded-xl shadow-xl overflow-hidden py-1 z-50">
                        <MoreMenuItems />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {profile.bio
            ? <p className="text-sm text-muted-foreground mt-1.5 max-w-lg leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            : <p className="text-sm text-muted-foreground/40 mt-1.5 italic">No bio yet</p>
          }
          {profile.created_at && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5 shrink-0" />
              <span>Joined {formatJoinDate(profile.created_at)}</span>
            </div>
          )}
        </div>

        {/* Stats — mobile */}
        <div className="flex sm:hidden items-center gap-0 mb-5 rounded-2xl border border-border bg-card p-3">
          {[
            { label: "Followers", value: followerCount },
            { label: "Following", value: followingCount },
            { label: "Posts", value: posts.length },
          ].map((stat, i) => (
            <div key={stat.label} className="flex-1 text-center relative">
              {i > 0 && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-5 bg-border" />}
              <p className="text-lg font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── DIVIDER ── */}
        <div className="border-b border-border mb-5">
          <span className="inline-block pb-2.5 text-sm font-medium text-foreground border-b-2 border-primary">
            Whispers ({posts.length})
          </span>
        </div>

        {/* ── BLOCKED STATE ── */}
        {isBlocked ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Ban className="size-10 text-muted-foreground/30 mb-4" />
            <p className="text-base font-medium text-foreground">You've blocked @{profile.username}</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Their posts are hidden while blocked.</p>
            <Button size="sm" variant="outline" className="rounded-full px-6" onClick={handleBlock}>
              Unblock
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-5xl mb-4">🤫</p>
            <p className="text-base font-medium text-foreground">No whispers yet</p>
            <p className="text-sm text-muted-foreground mt-1">This user hasn't posted anything</p>
          </div>
        ) : (
          <>
            {/* Mobile layout */}
            <div className="flex flex-col gap-4 md:hidden pb-12">
              {posts.map(post => (
                <Link key={post.id} href={`/feed/${post.id}`} className="block group">
                  <div className="rounded-2xl border border-border bg-card p-5 group-hover:border-primary/30 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0">{post.flair}</Badge>
                      <span className="text-[10px] text-muted-foreground font-medium">{timeAgo(post.created_at)}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{post.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{post.content}</p>
                    {post.image_urls && post.image_urls.length > 0 && (
                      <div className={`mb-4 grid gap-2 ${post.image_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                        {post.image_urls.slice(0, 4).map((url: string, idx: number) => (
                          <div key={idx} className="rounded-xl overflow-hidden border border-border bg-muted/30 aspect-video">
                            <img src={url} alt="Post content" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Heart className="size-3" />{post.reactions[0]?.count ?? 0}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <MessageSquare className="size-3" />{post.comments[0]?.count ?? 0}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop masonry */}
            <div className="hidden md:block pb-12">
              <div className="columns-2 lg:columns-3 gap-6">
                {posts.map(post => (
                  <div key={post.id} className="mb-6 break-inside-avoid">
                    <Link href={`/feed/${post.id}`} className="block group">
                      <div className="rounded-2xl border border-border bg-card p-5 group-hover:border-primary/30 transition-all duration-300">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0">{post.flair}</Badge>
                          <span className="text-[10px] text-muted-foreground font-medium">{timeAgo(post.created_at)}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">{post.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">{post.content}</p>
                        {post.image_urls && post.image_urls.length > 0 && (
                          <div className={`mb-4 grid gap-2 ${post.image_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                            {post.image_urls.slice(0, 4).map((url: string, idx: number) => (
                              <div key={idx} className="rounded-xl overflow-hidden border border-border bg-muted/30 aspect-video">
                                <img src={url} alt="Post content" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <Heart className="size-3" />{post.reactions[0]?.count ?? 0}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            <MessageSquare className="size-3" />{post.comments[0]?.count ?? 0}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center justify-center mt-8 mb-4 text-center">
                <div className="h-px w-24 bg-border mb-4" />
                <p className="text-sm font-medium text-muted-foreground">🎉 You're all caught up!</p>
                <p className="text-xs text-muted-foreground/70 mt-1">That's everything for now.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}