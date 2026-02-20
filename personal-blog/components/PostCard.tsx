import { Heart, MessageCircle, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PostCardProps {
  title: string
  excerpt: string
  tag: string
  timeAgo: string
  likes: number
  comments: number
  username?: string
}

export function PostCard({
  title,
  excerpt,
  tag,
  timeAgo,
  likes,
  comments,
  username = "Anonymous",
}: PostCardProps) {
  return (
    <article className="group cursor-pointer rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:shadow-sm md:p-8">
      
      {/* Username and avatar row */}
      <div className="flex items-center gap-2 mb-4">
        <div className="size-7 rounded-full bg-muted" />
        <span className="text-sm font-medium text-foreground">{username}</span>
      </div>

      {/* Flair and time row */}
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
        >
          {tag}
        </Badge>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {timeAgo}
        </span>
      </div>

      {/* Title - fixed color on hover */}
      <h3 className="mt-4 font-serif text-xl leading-snug text-foreground transition-colors group-hover:text-foreground/80 md:text-2xl">
        {title}
      </h3>

      {/* Excerpt */}
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {excerpt}
      </p>

      {/* Footer */}
      <div className="mt-6 flex items-center gap-5 border-t border-border pt-5">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-red-500"
          aria-label={`${likes} likes`}
        >
          <Heart className="size-3.5" />
          {likes}
        </button>
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`${comments} comments`}
        >
          <MessageCircle className="size-3.5" />
          {comments}
        </button>
        <span className="ml-auto text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors group-hover:text-foreground">
          Read more
        </span>
      </div>
    </article>
  )
}