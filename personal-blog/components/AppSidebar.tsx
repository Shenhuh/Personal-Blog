"use client"

import {
  Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarMenuItem, SidebarMenu,
  SidebarHeader, SidebarFooter
} from "@/components/ui/sidebar"
import { PenLine, Home, Bell, FileText, User, Flame, LogOut } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePathname, useRouter } from "next/navigation"

const navItems = [
  { label: "Feed", href: "/feed", icon: Home },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "My Posts", href: "/my-posts", icon: FileText },
  { label: "Profile", href: "/profile", icon: User },
]

export function AppSidebar() {
  const supabase = createClient()
  const pathname = usePathname()
  const router = useRouter()
  const [trending, setTrending] = useState<any[]>([])

  const fetchTrending = async () => {
    const { data } = await supabase
      .from("posts")
      .select(`*, reactions(count)`)
      .order("created_at", { ascending: false })
      .limit(5)

    if (data) {
      const sorted = data.sort((a, b) =>
        (b.reactions[0]?.count ?? 0) - (a.reactions[0]?.count ?? 0)
      )
      setTrending(sorted)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  useEffect(() => {
    fetchTrending()
  }, [])

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="px-5 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary shadow-md">
            <PenLine className="size-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">Whisper</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map(item => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.label}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors w-full ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </Link>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="my-3 border-t border-border" />

        {/* Trending */}
        <SidebarGroup>
          <div className="flex items-center gap-2 px-3 mb-2">
            <Flame className="size-4 text-orange-500" />
            <span className="text-sm font-bold text-foreground">Trending</span>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {trending.length === 0 && (
                <p className="text-xs text-muted-foreground px-3">No trending posts yet</p>
              )}
              {trending.map((post, index) => (
                <SidebarMenuItem key={post.id}>
                  <Link
                    href={`/feed/${post.id}`}
                    className="flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-muted transition-colors w-full"
                  >
                    <span className="text-xs font-bold text-muted-foreground mt-0.5 w-3 shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {post.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {post.flair} · ♥ {post.reactions[0]?.count ?? 0}
                      </span>
                    </div>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      {/* Logout */}
      <SidebarFooter className="px-3 py-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}