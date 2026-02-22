"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Camera, Check, X, Pencil, Trash2, Lock, Unlock, AlertCircle } from "lucide-react"
import { timeAgo } from "@/lib/timeAgo"

export default function ProfilePage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [username, setUsername] = useState("")
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "same">("idle")
  const [savingUsername, setSavingUsername] = useState(false)

  const [posts, setPosts] = useState<any[]>([])
  const [editingPost, setEditingPost] = useState<any>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")

  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const usernameTimeout = useRef<NodeJS.Timeout | null>(null)

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    if (data) {
      setProfile(data)
      setUsername(data.username)
    }
  }

  const fetchPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("posts")
      .select("*, reactions(count), comments(count)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    if (data) setPosts(data)
  }

  useEffect(() => {
    fetchProfile()
    fetchPosts()
  }, [])

  // Debounced username check
  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setUsernameStatus("idle")

    if (usernameTimeout.current) clearTimeout(usernameTimeout.current)

    if (value === profile?.username) {
      setUsernameStatus("same")
      return
    }

    if (value.length < 3) return

    setUsernameStatus("checking")
    usernameTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", value)
        .single()
      setUsernameStatus(data ? "taken" : "available")
    }, 500)
  }

  const handleSaveUsername = async () => {
    if (usernameStatus !== "available") return
    setSavingUsername(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("profiles").update({ username }).eq("id", user.id)
    await fetchProfile()
    setUsernameStatus("same")
    setSavingUsername(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split(".").pop()
    const path = `${user.id}/avatar.${ext}`

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id)
      await fetchProfile()
    }
    setAvatarUploading(false)
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return
    await supabase.from("posts").delete().eq("id", postId)
    fetchPosts()
  }

  const handleToggleLock = async (post: any) => {
  const { error } = await supabase
    .from("posts")
    .update({ locked: !post.locked })
    .eq("id", post.id)
  console.log("lock error:", error)
  fetchPosts()
}

  const handleEditPost = async () => {
    if (!editingPost) return
    await supabase.from("posts").update({ title: editTitle, content: editContent }).eq("id", editingPost.id)
    setEditingPost(null)
    fetchPosts()
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-6 py-8 space-y-8">

      {/* Profile Section */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-lg font-bold mb-6">Profile</h2>

        <div className="flex items-center gap-6 mb-8">
          {/* Avatar */}
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="size-20 rounded-full object-cover" />
            ) : (
              <div className="size-20 rounded-full bg-muted" />
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow"
            >
              {avatarUploading ? (
                <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="size-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

          {/* Username */}
          <div className="flex-1">
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Username</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  value={username}
                  onChange={e => handleUsernameChange(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background outline-none focus:border-foreground transition-colors pr-8"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && (
                    <span className="size-3.5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin block" />
                  )}
                  {usernameStatus === "available" && <Check className="size-3.5 text-green-500" />}
                  {usernameStatus === "taken" && <X className="size-3.5 text-red-500" />}
                  {usernameStatus === "same" && <Check className="size-3.5 text-muted-foreground" />}
                </div>
              </div>
              <Button
                size="sm"
                className="rounded-xl shrink-0"
                disabled={usernameStatus !== "available" || savingUsername}
                onClick={handleSaveUsername}
              >
                Save
              </Button>
            </div>
            <p className="text-xs mt-1.5">
              {usernameStatus === "available" && <span className="text-green-500">Username is available!</span>}
              {usernameStatus === "taken" && <span className="text-red-500">Username is already taken</span>}
              {usernameStatus === "checking" && <span className="text-muted-foreground">Checking availability...</span>}
              {usernameStatus === "same" && <span className="text-muted-foreground">This is your current username</span>}
              {usernameStatus === "idle" && username.length > 0 && username.length < 3 && (
                <span className="text-muted-foreground flex items-center gap-1"><AlertCircle className="size-3" /> At least 3 characters required</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* My Posts */}
      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <h2 className="text-lg font-bold mb-6">My Posts</h2>

        {posts.length === 0 && (
          <div className="text-center py-10">
            <p className="text-4xl mb-3">🤫</p>
            <p className="text-sm text-muted-foreground">You haven't whispered anything yet</p>
          </div>
        )}

        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="rounded-xl border border-border p-4">
              {editingPost?.id === post.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background outline-none font-semibold"
                  />
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background outline-none resize-none h-24"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-full" onClick={handleEditPost}>Save</Button>
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingPost(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="secondary" className="rounded-full text-xs px-2 py-0.5">{post.flair}</Badge>
                        {post.locked && (
                          <span className="text-xs text-orange-500 flex items-center gap-1">
                            <Lock className="size-3" /> Comments locked
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">{post.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingPost(post)
                          setEditTitle(post.title)
                          setEditContent(post.content)
                        }}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleLock(post)}
                        className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${post.locked ? "text-orange-500" : "text-muted-foreground hover:text-foreground"}`}
                        title={post.locked ? "Unlock comments" : "Lock comments"}
                      >
                        {post.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">♥ {post.reactions[0]?.count ?? 0}</span>
                    <span className="text-xs text-muted-foreground">💬 {post.comments[0]?.count ?? 0}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}