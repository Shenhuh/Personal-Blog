"use client"

import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import {
  Home,
  Bookmark,
  Users,
  Compass,
  User,
  LogOut,
  Flame,
} from "lucide-react"
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

  // Better active state (works for nested routes)
  const isActive = (href: string) => {
    if (href === "/feed") return pathname === "/feed"
    return pathname.startsWith(href)
  }

  const fetchTrending = async () => {
    setLoadingTrending(true)

    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        title,
        flair,
        reactions(count)
      `)
      .order("created_at", { ascending: false })
      .limit(20)

    if (!error && data) {
      const sorted = [...data]
        .sort(
          (a, b) =>
            (b.reactions?.[0]?.count ?? 0) -
            (a.reactions?.[0]?.count ?? 0)
        )
        .slice(0, 5)

      setTrending(sorted)
    }

    setLoadingTrending(false)
  }

  useEffect(() => {
    fetchTrending()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <Sidebar className="border-r">
      {/* HEADER */}
      <SidebarHeader className="px-4 py-5">
        <Link
          href="/feed"
          className="flex items-center gap-3 group"
        >
          <div className="size-9 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <span className="text-primary-foreground font-bold text-sm">
              W
            </span>
          </div>
          <span className="font-serif text-xl font-bold tracking-tight group-hover:opacity-80 transition">
            Whisper
          </span>
        </Link>
      </SidebarHeader>

      {/* MAIN NAV */}
      <SidebarContent className="px-2 space-y-6">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                className="rounded-2xl px-4 py-3 text-sm font-medium transition-all hover:bg-muted"
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-3"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {/* TRENDING */}
        <div className="px-3">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="size-4 text-orange-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Trending Whispers
            </span>
          </div>

          {loadingTrending ? (
            <div className="text-xs text-muted-foreground px-2 py-2">
              Loading...
            </div>
          ) : trending.length === 0 ? (
            <div className="text-xs text-muted-foreground px-2 py-2">
              No trending posts yet.
            </div>
          ) : (
            <div className="space-y-1">
              {trending.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/feed/${post.id}`}
                  className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-muted transition-colors"
                >
                  <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 mt-0.5">
                    {i + 1}
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {post.title}
                    </p>

                    <p className="text-[10px] text-muted-foreground">
                      {post.flair ?? "General"} · ♥{" "}
                      {post.reactions?.[0]?.count ?? 0}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="px-2 py-3">
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