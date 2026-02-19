import { PostCard } from "@/components/PostCard"

const posts = [
  {
    title: "I finally told my best friend the truth after 7 years",
    excerpt:
      "It started with a small lie that snowballed into something I could never take back. Every time we met, the weight grew heavier. Last Tuesday, I sat across from her at our usual coffee spot and let it all pour out.",
    tag: "Confession",
    timeAgo: "2h ago",
    likes: 142,
    comments: 38,
  },
  {
    title: "The quiet beauty of eating breakfast alone",
    excerpt:
      "There's something profoundly peaceful about a slow morning with no one to perform for. Just you, a warm cup, and the gentle hum of the world waking up outside your window. I used to fear loneliness. Now I crave these moments.",
    tag: "Reflection",
    timeAgo: "5h ago",
    likes: 89,
    comments: 12,
  },
  {
    title: "A letter to the person I was at 16",
    excerpt:
      "You're going to survive this. I know it doesn't feel like it right now, but every bruise, every tear, every sleepless night is building something in you that the world desperately needs. Keep going.",
    tag: "Letter",
    timeAgo: "8h ago",
    likes: 231,
    comments: 54,
  },
  {
    title: "Why I quit my six-figure job to paint",
    excerpt:
      "Everyone thought I'd lost my mind. My parents stopped calling for two weeks. But standing in my tiny studio apartment with paint under my fingernails, I felt alive for the first time in a decade.",
    tag: "Story",
    timeAgo: "12h ago",
    likes: 176,
    comments: 41,
  },
  {
    title: "The strangest night of my entire life",
    excerpt:
      "It was 3 AM on a Wednesday in November. The power had been out for hours, and I was sitting on my fire escape watching the city go dark block by block. That's when I heard the music — a violin, playing from somewhere above.",
    tag: "Story",
    timeAgo: "1d ago",
    likes: 304,
    comments: 67,
  },
  {
    title: "I forgave someone who never apologized",
    excerpt:
      "Not for them. For me. Carrying that resentment was like drinking poison and waiting for them to get sick. The moment I let it go, I could finally breathe again. Forgiveness isn't about them. It never was.",
    tag: "Reflection",
    timeAgo: "1d ago",
    likes: 198,
    comments: 29,
  },
]

export function RecentPosts() {
  return (
    <section className="px-6 pb-24 md:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-serif text-3xl tracking-tight text-foreground md:text-4xl">
              Recent Whispers
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Fresh voices from the community
            </p>
          </div>
          <button className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block">
            View all
          </button>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.title} {...post} />
          ))}
        </div>
      </div>
    </section>
  )
}
