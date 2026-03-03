"use client"

import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Home, Bookmark, Users, Compass, User, LogOut, Flame, Hash } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

const navItems = [
  { label: "Feed", href: "/feed", icon: Home },
  { label: "Following", href: "/feed/following", icon: Users },
  { label: "Discover", href: "/feed/discover", icon: Compass },
  { label: "Saved Whispers", href: "/feed/saved", icon: Bookmark },
  { label: "Profile", href: "/feed/profile", icon: User },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [trending, setTrending] = useState<any[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [trendingTags, setTrendingTags] = useState<{ tag: string, count: number }[]>([])
  const [loadingTags, setLoadingTags] = useState(true)

  const isActive = (href: string) => {
    if (href === "/feed") return pathname === "/feed"
    return pathname.startsWith(href)
  }

  const fetchTrending = async () => {
    setLoadingTrending(true)
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, flair, reactions(count)")
      .order("created_at", { ascending: false })
      .limit(20)
    if (!error && data) {
      const sorted = [...data]
        .sort((a, b) => (b.reactions?.[0]?.count ?? 0) - (a.reactions?.[0]?.count ?? 0))
        .slice(0, 10)
      setTrending(sorted)
    }
    setLoadingTrending(false)
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
        .slice(0, 10)
      setTrendingTags(sorted)
    }
    setLoadingTags(false)
  }

  useEffect(() => {
    fetchTrending()
    fetchTrendingTags()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <Sidebar className="border-r flex flex-col h-screen overflow-hidden">
      {/* HEADER */}
      <SidebarHeader className="px-4 py-5 shrink-0">
        <Link href="/feed" className="flex items-center gap-3 group">
          <div className="size-9 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-bold text-sm">W</span>
          </div>
          <span className="font-serif text-xl font-bold tracking-tight group-hover:opacity-80 transition">
            Whisper
          </span>
        </Link>
      </SidebarHeader>

      {/* MAIN NAV — fixed, no scroll */}
      <div className="px-2 shrink-0">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                className="rounded-2xl px-4 py-3 text-sm font-medium transition-all hover:bg-muted"
              >
                <Link href={item.href} className="flex items-center gap-3">
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>

      {/* SCROLLABLE SECTIONS — flex-1 so they fill remaining space */}
      <div className="flex-1 overflow-hidden flex flex-col gap-0 px-2 min-h-0">

        {/* TRENDING WHISPERS */}
        <div className="flex flex-col min-h-0 flex-1 py-3">
          <div className="flex items-center gap-2 mb-2 px-3 shrink-0">
            <Flame className="size-4 text-orange-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Trending Whispers
            </span>
          </div>

          {/* Scrollable container — scrollbar only on hover */}
          <div
            className="overflow-y-auto min-h-0 flex-1 px-1"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "transparent transparent",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.scrollbarColor = "hsl(var(--border)) transparent"
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.scrollbarColor = "transparent transparent"
            }}
          >
            {loadingTrending ? (
              <div className="text-xs text-muted-foreground px-3 py-2">Loading...</div>
            ) : trending.length === 0 ? (
              <div className="text-xs text-muted-foreground px-3 py-2">No trending posts yet.</div>
            ) : (
              <div className="space-y-1 pb-2">
                {trending.map((post, i) => (
                  <Link
                    key={post.id}
                    href={`/feed/${post.id}`}
                    className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-muted transition-colors"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 mt-0.5">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{post.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {post.flair ?? "General"} · ♥ {post.reactions?.[0]?.count ?? 0}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t border-border mx-3 shrink-0" />

        {/* TRENDING HASHTAGS */}
        <div className="flex flex-col min-h-0 flex-1 py-3">
          <div className="flex items-center gap-2 mb-2 px-3 shrink-0">
            <Hash className="size-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Trending Tags
            </span>
          </div>

          {/* Scrollable container — scrollbar only on hover */}
          <div
            className="overflow-y-auto min-h-0 flex-1 px-1"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "transparent transparent",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.scrollbarColor = "hsl(var(--border)) transparent"
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.scrollbarColor = "transparent transparent"
            }}
          >
            {loadingTags ? (
              <div className="text-xs text-muted-foreground px-3 py-2">Loading...</div>
            ) : trendingTags.length === 0 ? (
              <div className="text-xs text-muted-foreground px-3 py-2">No hashtags yet.</div>
            ) : (
              <div className="space-y-1 pb-2">
                {trendingTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => router.push(`/feed/hashtag/${tag.replace("#", "")}`)}
                    className="flex items-center justify-between w-full rounded-xl px-2 py-2 hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash className="size-3 text-primary shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate">{tag.replace("#", "")}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{count} posts</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER — always at bottom */}
      <SidebarFooter className="px-2 py-3 shrink-0 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="rounded-2xl px-4 py-3 text-sm text-red-500 hover:bg-red-500/10"
            >
              <LogOut className="size-4" />
              Logout
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}