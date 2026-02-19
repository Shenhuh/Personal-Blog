"use client"
import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function FeedPage() {
  const supabase = createClient()
  const router = useRouter()
  const [content, setContent] = useState("")
  const [posts, setPosts] = useState<any[]>([])

  const fetchPosts = async () => {
    const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false })
    if (data) setPosts(data)
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handlePost = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("posts").insert({ content, user_id: user.id })
    setContent("")
    fetchPosts()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Feed</h1>
        <button onClick={handleLogout} className="text-red-500 text-sm">Logout</button>
      </div>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Whisper something..."
        className="w-full border rounded-md p-3 mb-3 h-24 resize-none bg-background"
      />
      <Button onClick={handlePost} className="mb-8">Post Anonymously</Button>
      <div className="space-y-4">
        {posts.map(post => (
          <Link href={`/feed/${post.id}`} key={post.id}>
            <div className="border rounded-md p-4 hover:bg-muted cursor-pointer transition">
                <p className="text-sm text-muted-foreground mb-2">Anonymous</p>
                <p>{post.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(post.created_at).toLocaleDateString()}</p>
            </div>
        </Link>
        ))}
      </div>
    </div>
  )
}