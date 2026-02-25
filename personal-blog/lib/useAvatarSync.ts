import { useEffect, useState } from "react"

/**
 * useAvatarSync
 *
 * Returns a fresh avatar URL that updates in real-time when the user
 * changes their profile picture on the profile page — without needing
 * a full page reload or shared global state.
 *
 * Usage in your header / navbar / post card components:
 *
 *   const liveAvatar = useAvatarSync(profile?.avatar_url)
 *   // Use liveAvatar instead of profile?.avatar_url for the <img src>
 */
export function useAvatarSync(initialUrl: string | null | undefined): string | null {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUrl ?? null)

  // Keep in sync if the parent re-renders with a new initial URL
  useEffect(() => {
    if (initialUrl) setAvatarUrl(initialUrl)
  }, [initialUrl])

  // Listen for avatar-updated events fired by the profile page
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ avatar_url: string }>).detail
      if (detail?.avatar_url) setAvatarUrl(detail.avatar_url)
    }
    window.addEventListener("avatar-updated", handler)
    return () => window.removeEventListener("avatar-updated", handler)
  }, [])

  return avatarUrl
}