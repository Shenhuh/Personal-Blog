"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"

export default function UserProfilePage() {
  const supabase = createClient()
  const { id } = useParams()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUser(user)

    const [{ data: profileData }, { data: postsData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.from("posts").select("*, reactions(count), comments(count)").eq("user_id", id).order("created_at", { ascending: false })
    ])

    if (profileData) setProfile(profileData)
    if (postsData) setPosts(postsData)

    const [{ count: followers }, { count: following }, { data: followData }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
      supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", id).maybeSingle()
    ])

    setFollowerCount(followers ?? 0)
    setFollowingCount(following ?? 0)
    setIsFollowing(!!followData)
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [id])

  const handleFollow = async () => {
    if (!currentUser) return
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", id)
      setIsFollowing(false)
      setFollowerCount(prev => prev - 1)
    } else {
      await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: id })
      setIsFollowing(true)
      setFollowerCount(prev => prev + 1)
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

  const isOwnProfile = currentUser?.id === id

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-6 space-y-6">

      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" />
        Back
      </button>

      {/* Profile Card */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="size-16 rounded-full object-cover shrink-0" />
            ) : (
              <div className="size-16 rounded-full bg-muted shrink-0" />
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">@{profile.username}</h1>
              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">{profile.bio}</p>
              )}
            </div>
          </div>

          {!isOwnProfile && (
            <Button
              size="sm"
              variant={isFollowing ? "outline" : "default"}
              className="rounded-full shrink-0"
              onClick={handleFollow}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </Button>
          )}

          {isOwnProfile && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shrink-0"
              onClick={() => router.push("/feed/profile")}
            >
              Edit profile
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{followerCount}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{followingCount}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{posts.length}</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
        </div>
      </div>

      {/* Posts */}
      <h2 className="font-serif text-xl text-foreground">Whispers</h2>

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🤫</p>
          <p className="text-sm text-muted-foreground">No whispers yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Link key={post.id} href={`/feed/${post.id}`}>
              <div className="rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="rounded-full text-xs px-2 py-0.5">{post.flair}</Badge>
                  <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{post.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">♥ {post.reactions[0]?.count ?? 0}</span>
                  <span className="text-xs text-muted-foreground">💬 {post.comments[0]?.count ?? 0}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}