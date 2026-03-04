"use client"

import { Heart, MessageCircle, Clock, Play, Pause, Volume2, VolumeX, Maximize2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRef, useState, useEffect, useCallback } from "react"

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
  videoUrl?: string | null
}

// ── Fullscreen Video Modal ────────────────────────────────────────────────────
function VideoModal({ src, startTime, wasPlaying, onClose }: {
  src: string
  startTime: number
  wasPlaying: boolean
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const v = videoRef.current; if (!v) return
    v.currentTime = startTime
    if (wasPlaying) v.play().then(() => setPlaying(true)).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  const block = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() }
  const toggle = (e: React.MouseEvent) => {
    block(e)
    const v = videoRef.current; if (!v) return
    if (playing) { v.pause(); setPlaying(false) } else { v.play(); setPlaying(true) }
  }
  const toggleMute = (e: React.MouseEvent) => {
    block(e)
    const v = videoRef.current; if (!v) return
    v.muted = !muted; setMuted(!muted)
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    block(e)
    const v = videoRef.current; if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration
  }
  const onTimeUpdate = () => {
    const v = videoRef.current; if (!v?.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl px-4" onClick={block}>
        <button onClick={onClose} className="absolute -top-10 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
          <X className="size-5 text-white" />
        </button>
        <div className="relative rounded-2xl overflow-hidden bg-black group/modal">
          <video
            ref={videoRef}
            src={src}
            className="w-full max-h-[80vh] object-contain block"
            playsInline
            onTimeUpdate={onTimeUpdate}
            onEnded={() => setPlaying(false)}
          />
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/modal:opacity-100 transition-opacity bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/modal:opacity-100 transition-opacity flex flex-col justify-between p-3">
            <div />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button className="pointer-events-auto bg-black/50 rounded-full p-4 backdrop-blur-sm hover:bg-black/70 transition-colors cursor-pointer" onClick={toggle}>
                {playing ? <Pause className="size-7 text-white" /> : <Play className="size-7 text-white fill-white" />}
              </button>
            </div>
            <div className="flex flex-col gap-2 pointer-events-auto" onClick={block}>
              <div className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer" onClick={seek}>
                <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-end">
                <button onClick={toggleMute} className="cursor-pointer text-white hover:text-primary transition-colors">
                  {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline Video Player ───────────────────────────────────────────────────────
function VideoPlayer({ src, onFullscreen }: {
  src: string
  onFullscreen: (currentTime: number, wasPlaying: boolean) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = containerRef.current; if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      const v = videoRef.current; if (!v) return
      if (entry.isIntersecting) v.play().then(() => setPlaying(true)).catch(() => {})
      else { v.pause(); setPlaying(false) }
    }, { threshold: 0.6 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const block = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() }
  const toggle = (e: React.MouseEvent) => {
    block(e)
    const v = videoRef.current; if (!v) return
    if (playing) { v.pause(); setPlaying(false) } else { v.play(); setPlaying(true) }
  }
  const toggleMute = (e: React.MouseEvent) => {
    block(e)
    const v = videoRef.current; if (!v) return
    v.muted = !muted; setMuted(!muted)
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    block(e)
    const v = videoRef.current; if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration
  }
  const onTimeUpdate = () => {
    const v = videoRef.current; if (!v?.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  if (!src || src.trim() === "") return null

  return (
    <div ref={containerRef} className="relative w-full rounded-xl overflow-hidden bg-black group/video mt-4" onClick={block}>
      <video
        ref={videoRef}
        src={src}
        className="w-full object-contain cursor-pointer block"
        playsInline
        onTimeUpdate={onTimeUpdate}
        onEnded={() => setPlaying(false)}
        onClick={toggle}
      />
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/video:opacity-100 transition-opacity bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/video:opacity-100 transition-opacity flex flex-col justify-between p-2">
        <div className="flex justify-end">
          <button
            className="pointer-events-auto p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors cursor-pointer"
            onClick={(e) => {
              block(e)
              const v = videoRef.current
              const t = v?.currentTime ?? 0
              const wasPlaying = playing
              v?.pause(); setPlaying(false)
              onFullscreen(t, wasPlaying)
            }}
          >
            <Maximize2 className="size-3.5 text-white" />
          </button>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button className="pointer-events-auto bg-black/50 rounded-full p-3 backdrop-blur-sm hover:bg-black/70 transition-colors cursor-pointer" onClick={toggle}>
            {playing ? <Pause className="size-5 text-white" /> : <Play className="size-5 text-white fill-white" />}
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <div className="pointer-events-auto w-full h-1 bg-white/30 rounded-full cursor-pointer" onClick={seek}>
            <div className="h-1 bg-primary rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-end">
            <button className="pointer-events-auto cursor-pointer text-white hover:text-primary transition-colors" onClick={toggleMute}>
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PostCard ──────────────────────────────────────────────────────────────────
export function PostCard({
  title, excerpt, tag, timeAgo, likes, comments,
  username = "Anonymous", avatar = "", imageUrls = [], videoUrl = null,
}: PostCardProps) {
  const [modal, setModal] = useState<{ time: number; wasPlaying: boolean } | null>(null)

  const renderImages = () => {
    const urls = imageUrls?.filter(Boolean) ?? []
    if (urls.length === 0) return null
    const count = urls.length
    const wrapperClass = "mt-4 rounded-xl overflow-hidden border border-border bg-muted relative shrink-0"
    const containerStyle = { height: "220px" }
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
            <div key={i} className="flex-1 min-w-0"><img src={url} className={imgClass} loading="lazy" alt="" /></div>
          ))}
        </div>
      </div>
    )
    if (count === 3) return (
      <div className={wrapperClass} style={containerStyle}>
        <div className="flex gap-1 h-full">
          <div className="flex-[2] min-w-0"><img src={urls[0]} className={imgClass} loading="lazy" alt="" /></div>
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            {urls.slice(1, 3).map((url, i) => (
              <div key={i} className="flex-1 min-h-0"><img src={url} className={imgClass} loading="lazy" alt="" /></div>
            ))}
          </div>
        </div>
      </div>
    )
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
    <>
      {modal && videoUrl && (
        <VideoModal
          src={videoUrl}
          startTime={modal.time}
          wasPlaying={modal.wasPlaying}
          onClose={() => setModal(null)}
        />
      )}
      <article className="group cursor-pointer rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-md flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          {avatar
            ? <img src={avatar} className="size-7 rounded-full object-cover border border-border" loading="lazy" />
            : <div className="size-7 rounded-full bg-muted border border-border" />}
          <span className="text-sm font-medium text-foreground">@{username}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold">{tag}</Badge>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" />{timeAgo}
          </span>
        </div>
        <h3 className="mt-3 font-serif text-lg leading-tight text-foreground group-hover:text-foreground/80 line-clamp-2">{title}</h3>
        {renderImages()}
        {videoUrl && videoUrl.trim() !== "" && (
          <div onClick={e => { e.preventDefault(); e.stopPropagation() }}>
            <VideoPlayer src={videoUrl} onFullscreen={(t, wasPlaying) => setModal({ time: t, wasPlaying })} />
          </div>
        )}
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground flex-1">{excerpt}</p>
        <div className="mt-5 flex items-center gap-4 border-t border-border pt-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-red-500">
            <Heart className="size-3.5" /><span>{likes}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <MessageCircle className="size-3.5" /><span>{comments}</span>
          </div>
          <span className="ml-auto text-[10px] font-bold tracking-widest text-muted-foreground uppercase group-hover:text-foreground">Read more</span>
        </div>
      </article>
    </>
  )
}