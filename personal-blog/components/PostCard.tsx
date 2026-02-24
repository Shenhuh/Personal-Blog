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
  avatar?: string
  imageUrls?: string[]
}

export function PostCard({
  title,
  excerpt,
  tag,
  timeAgo,
  likes,
  comments,
  username = "Anonymous",
  avatar = "",
  imageUrls = [],
}: PostCardProps) {

  const renderImages = () => {
    const urls = imageUrls?.filter(Boolean) ?? []
    if (urls.length === 0) return null
    
    const count = urls.length
    const wrapperClass = "mt-4 rounded-xl overflow-hidden border border-border bg-muted relative shrink-0"
    const containerStyle = { height: "220px" } // Fixed height for a uniform grid
    const imgClass = "w-full h-full object-cover transition-opacity hover:opacity-90"

    if (count === 1) return (
      <div className={wrapperClass} style={containerStyle}>
        <img src={urls[0]} className={imgClass} loading="lazy" alt="" />
      </div>
    )

    if (count === 2) return (
      <div className={wrapperClass} style={containerStyle}>
        <div className="flex gap-1 h-full">
          {urls.slice(0, 2).map((url, i) => (
            <div key={i} className="flex-1 min-w-0">
              <img src={url} className={imgClass} loading="lazy" alt="" />
            </div>
          ))}
        </div>
      </div>
    )

    if (count === 3) return (
      <div className={wrapperClass} style={containerStyle}>
        <div className="flex gap-1 h-full">
          <div className="flex-[2] min-w-0">
            <img src={urls[0]} className={imgClass} loading="lazy" alt="" />
          </div>
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            {urls.slice(1, 3).map((url, i) => (
              <div key={i} className="flex-1 min-h-0">
                <img src={url} className={imgClass} loading="lazy" alt="" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )

    // 4 or more images
    return (
      <div className={wrapperClass} style={containerStyle}>
        <div className="grid grid-cols-2 grid-rows-2 gap-1 h-full">
          {urls.slice(0, 4).map((url, i) => (
            <div key={i} className="relative h-full w-full min-h-0">
              <img src={url} className={imgClass} loading="lazy" alt="" />
              {i === 3 && count > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[2px]">
                  <span className="text-white text-lg font-bold">+{count - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <article className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-md flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {avatar ? (
          <img src={avatar} className="size-7 rounded-full object-cover border border-border" loading="lazy" />
        ) : (
          <div className="size-7 rounded-full bg-muted border border-border" />
        )}
        <span className="text-sm font-medium text-foreground">@{username}</span>
      </div>

      {/* Tags & Time */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold">
          {tag}
        </Badge>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          {timeAgo}
        </span>
      </div>

      {/* Title */}
      <h3 className="mt-3 font-serif text-lg leading-tight text-foreground group-hover:text-foreground/80 line-clamp-2">
        {title}
      </h3>

      {/* Images Grid */}
      {renderImages()}

      {/* Content Excerpt */}
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground flex-1">
        {excerpt}
      </p>

      {/* Footer Actions */}
      <div className="mt-5 flex items-center gap-4 border-t border-border pt-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-red-500">
          <Heart className="size-3.5" />
          <span>{likes}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          <MessageCircle className="size-3.5" />
          <span>{comments}</span>
        </div>
        <span className="ml-auto text-[10px] font-bold tracking-widest text-muted-foreground uppercase group-hover:text-foreground">
          Read more
        </span>
      </div>
    </article>
  )
}