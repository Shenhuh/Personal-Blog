import { createClient } from "@/lib/supabase/client"

export async function getTrendingHashtags(limit = 5): Promise<{ tag: string, count: number }[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("posts")
    .select("content")
    .not("content", "is", null)
    .limit(200)

  if (!data) return []

  const counts: Record<string, number> = {}
  for (const post of data) {
    const matches = post.content?.match(/#[a-zA-Z0-9_]+/g) ?? []
    for (const tag of matches) {
      const normalized = tag.toLowerCase()
      counts[normalized] = (counts[normalized] ?? 0) + 1
    }
  }

  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}