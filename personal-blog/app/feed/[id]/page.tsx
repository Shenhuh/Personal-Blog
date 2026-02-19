"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function PostPage() {
  const supabase = createClient()
  const { id } = useParams()
  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [content, setContent] = useState("")

  const fetchPost = async () => {
    const { data } = await supabase.from("posts").select("*").eq("id", id).single()
    if (data) setPost(data)
  }

  const fetchComments = async () => {
    const { data } = await supabase.from("comments").select("*").eq("post_id", id).order("created_at", { ascending: true })
    if (data) setComments(data)
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

  const [reactions, setReactions] = useState<number>(0)
  const [hasReacted, setHasReacted] = useState(false)

  const fetchReactions = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, count } = await supabase.from("reactions").select("*", { count: "exact" }).eq("post_id", id)
  if (count !== null) setReactions(count)
    if (user && data) {
        setHasReacted(data.some(r => r.user_id === user.id))
    }
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
    <div className="max-w-2xl mx-auto mt-10 px-4">
      {post && (
  <div className="border rounded-md p-4 mb-8">
    <p className="text-sm text-muted-foreground mb-2">Anonymous</p>
    <p>{post.content}</p>
    <button onClick={handleReaction} className={`text-2xl mt-4 ${hasReacted ? "text-red-500" : "text-gray-400"}`}>
      ♥ {reactions}
    </button>
  </div>
)}
      <h2 className="text-lg font-bold mb-4">Comments</h2>
      <div className="space-y-3 mb-6">
        {comments.map(comment => (
          <div key={comment.id} className="border rounded-md p-3">
            <p className="text-sm text-muted-foreground mb-1">Anonymous</p>
            <p>{comment.content}</p>
          </div>
        ))}
      </div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Write a comment..."
        className="w-full border rounded-md p-3 mb-3 h-20 resize-none bg-background"
      />
      <Button onClick={handleComment}>Comment</Button>
    </div>
  )
}