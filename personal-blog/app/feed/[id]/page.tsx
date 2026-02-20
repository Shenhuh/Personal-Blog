"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Clock, ArrowLeft } from "lucide-react"

export default function PostPage() {
  const supabase = createClient()
  const { id } = useParams()
  const router = useRouter()
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [content, setContent] = useState("")
  const [reactions, setReactions] = useState<number>(0)
  const [hasReacted, setHasReacted] = useState(false)

  const fetchPost = async () => {
    const { data } = await supabase.from("posts").select("*").eq("id", id).single()
    if (data) setPost(data)
  }

  const fetchComments = async () => {
    const { data } = await supabase.from("comments").select("*").eq("post_id", id).order("created_at", { ascending: true })
    if (data) setComments(data)
  }

  const fetchReactions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, count } = await supabase.from("reactions").select("*", { count: "exact" }).eq("post_id", id)
    if (count !== null) setReactions(count)
    if (user && data) setHasReacted(data.some(r => r.user_id === user.id))
  }

  useEffect(() => {
    fetchPost()
    fetchComments()
    fetchReactions()
  }, [])

  const handleComment = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !content) return
    await supabase.from("comments").insert({ post_id: id, user_id: user.id, content })
    setContent("")
    fetchComments()
  }

  const handleReaction = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (hasReacted) {
      await supabase.from("reactions").delete().eq("post_id", id).eq("user_id", user.id)
    } else {
      await supabase.from("reactions").insert({ post_id: id, user_id: user.id })
    }
    fetchReactions()
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-6 space-y-4">

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      {/* Post */}
      {post && (
        <article className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="size-7 rounded-full bg-muted" />
            <span className="text-sm font-medium text-foreground">Anonymous</span>
            <span className="text-muted-foreground">·</span>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
              {post.flair}
            </Badge>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>

          <h1 className="mt-4 font-serif text-2xl leading-snug text-foreground md:text-3xl">
            {post.title}
          </h1>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground border-t border-border pt-6">
            {post.content}
          </p>

          <div className="mt-6 flex items-center gap-5 border-t border-border pt-5">
            <button
              onClick={handleReaction}
              className={`flex items-center gap-1.5 text-xs transition-colors ${hasReacted ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
            >
              <Heart className="size-3.5" />
              {reactions}
            </button>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="size-3.5" />
              {comments.length}
            </button>
          </div>
        </article>
      )}

      {/* Comments */}
      <h2 className="font-serif text-xl text-foreground">Comments</h2>

      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-4xl mb-4">💬</p>
          <p className="text-sm font-medium text-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground mt-1">Be the first to share your thoughts</p>
        </div>
      ) : (
        <div className="h-[400px] overflow-y-auto space-y-4 pr-2">
          {comments.map(comment => (
            <article key={comment.id} className="rounded-2xl border border-border bg-card p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-6 rounded-full bg-muted" />
                <span className="text-xs text-muted-foreground">Anonymous</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{comment.content}</p>
            </article>
          ))}
        </div>
      )}

      {/* Comment Form */}
      <article className="rounded-2xl border border-border bg-card p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-7 rounded-full bg-muted" />
          <span className="text-sm font-medium text-foreground">Write a comment</span>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Share your thoughts anonymously..."
          className="w-full border rounded-xl p-3 mb-3 h-24 resize-none bg-background text-sm"
        />
        <Button onClick={handleComment} className="rounded-full">
          Comment
        </Button>
      </article>

    </div>
  )
}