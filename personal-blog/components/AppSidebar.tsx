"use client"

import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton
} from "@/components/ui/sidebar"
import { Home, Bookmark, Users, Compass, User, LogOut, Flame } from "lucide-react"
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

  const fetchTrending = async () => {
    const { data } = await supabase
      .from("posts")
      .select("id, title, flair, reactions(count)")
      .order("created_at", { ascending: false })
      .limit(10)
    if (data) {
      const sorted = [...data].sort((a, b) =>
        (b.reactions[0]?.count ?? 0) - (a.reactions[0]?.count ?? 0)
      ).slice(0, 5)
      setTrending(sorted)
    }
  }

  useEffect(() => { fetchTrending() }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Link href="/feed" className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">W</span>
          </div>
          <span className="font-serif text-lg font-bold">Whisper</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu>
          {navItems.map(item => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="rounded-xl px-3 py-2"
              >
                <Link href={item.href} className="flex items-center gap-3">
                  <item.icon className="size-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {/* Trending */}
        <div className="mt-6 px-3">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="size-4 text-orange-500" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trending</span>
          </div>
          <div className="space-y-1">
            {trending.map((post, i) => (
              <Link
                key={post.id}
                href={`/feed/${post.id}`}
                className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-muted transition-colors"
              >
                <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 mt-0.5">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{post.title}</p>
                  <p className="text-[10px] text-muted-foreground">{post.flair} · ♥ {post.reactions[0]?.count ?? 0}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="rounded-xl px-3 py-2 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            >
              <LogOut className="size-4" />
              <span className="text-sm">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}