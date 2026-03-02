"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { Hash, ArrowLeft, Heart, MessageCircle } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"
import Link from "next/link"

export default function HashtagPage() {
  const supabase = createClient()
  const { tag } = useParams()
  const router = useRouter()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [postCount, setPostCount] = useState(0)

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      const { data, count } = await supabase
        .from("posts")
        .select("*, profiles(id, username, avatar_url), reactions(count), comments(count)", { count: "exact" })
        .ilike("content", `%#${tag}%`)
        .order("created_at", { ascending: false })
        .limit(30)
      setPosts(data ?? [])
      setPostCount(count ?? 0)
      setLoading(false)
    }
    fetchPosts()
  }, [tag])

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Hash className="size-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">#{tag}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {postCount} {postCount === 1 ? "post" : "posts"}
            </p>
          </div>
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Hash className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-base font-medium text-foreground">No posts yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to use <span className="text-primary font-medium">#{tag}</span>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Link key={post.id} href={`/feed/${post.id}`}>
              <article className="rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-md transition-all cursor-pointer mb-4">
                <div className="flex items-center gap-2 mb-3">
                  {post.profiles?.avatar_url
                    ? <img src={post.profiles.avatar_url} className="size-6 rounded-full object-cover" />
                    : <div className="size-6 rounded-full bg-muted" />}
                  <span className="text-xs font-medium text-foreground">@{post.profiles?.username}</span>
                  <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 ml-1">{post.flair}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{timeAgo(post.created_at)}</span>
                </div>
                <h2 className="text-sm font-semibold text-foreground mb-1 leading-snug">{post.title}</h2>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{post.content}</p>
                {post.image_urls?.length > 0 && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-border" style={{ height: "160px" }}>
                    <img src={post.image_urls[0]} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Heart className="size-3" /> {post.reactions?.[0]?.count ?? 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="size-3" /> {post.comments?.[0]?.count ?? 0}
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}