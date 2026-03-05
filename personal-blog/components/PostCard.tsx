"use client"

import { Heart, MessageCircle, Clock, Play, Pause, Volume2, VolumeX, Maximize2, X } from "lucide-react"
import { useRef, useState, useEffect } from "react"

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

// Flair → accent color per tag for visual identity
const flairAccent: Record<string, { bg: string; text: string; dot: string }> = {
  Gaming:     { bg: "rgba(99,102,241,0.15)",  text: "#818cf8", dot: "#6366f1" },
  Confession: { bg: "rgba(244,63,94,0.12)",   text: "#fb7185", dot: "#f43f5e" },
  Advice:     { bg: "rgba(34,197,94,0.12)",   text: "#4ade80", dot: "#22c55e" },
  General:    { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", dot: "#64748b" },
  Question:   { bg: "rgba(251,191,36,0.12)",  text: "#fbbf24", dot: "#f59e0b" },
  Random:     { bg: "rgba(249,115,22,0.12)",  text: "#fb923c", dot: "#f97316" },
  Rant:       { bg: "rgba(239,68,68,0.12)",   text: "#f87171", dot: "#ef4444" },
  Story:      { bg: "rgba(168,85,247,0.12)",  text: "#c084fc", dot: "#a855f7" },
}
const defaultAccent = { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", dot: "#64748b" }

// ── Fullscreen Video Modal ────────────────────────────────────────────────────
function VideoModal({ src, startTime, wasPlaying, onClose }: {
  src: string; startTime: number; wasPlaying: boolean; onClose: () => void
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
    block(e); const v = videoRef.current; if (!v) return
    if (playing) { v.pause(); setPlaying(false) } else { v.play(); setPlaying(true) }
  }
  const toggleMute = (e: React.MouseEvent) => {
    block(e); const v = videoRef.current; if (!v) return
    v.muted = !muted; setMuted(!muted)
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    block(e); const v = videoRef.current; if (!v) return
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
          <video ref={videoRef} src={src} className="w-full max-h-[80vh] object-contain block"
            playsInline onTimeUpdate={onTimeUpdate} onEnded={() => setPlaying(false)} />
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
                <div className="h-1.5 bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-end">
                <button onClick={toggleMute} className="cursor-pointer text-white hover:text-white/70 transition-colors">
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
  src: string; onFullscreen: (t: number, wasPlaying: boolean) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)

  const block = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation() }
  const toggle = (e: React.MouseEvent) => {
    block(e); const v = videoRef.current; if (!v) return
    if (playing) { v.pause(); setPlaying(false) } else { v.play(); setPlaying(true) }
  }
  const toggleMute = (e: React.MouseEvent) => {
    block(e); const v = videoRef.current; if (!v) return
    v.muted = !muted; setMuted(!muted)
  }
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    block(e); const v = videoRef.current; if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration
  }
  const onTimeUpdate = () => {
    const v = videoRef.current; if (!v?.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  if (!src || src.trim() === "") return null

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black group/video mt-3" onClick={block}>
      <video ref={videoRef} src={src} className="w-full object-contain cursor-pointer block"
        playsInline onTimeUpdate={onTimeUpdate} onEnded={() => setPlaying(false)} onClick={toggle} />
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/video:opacity-100 transition-opacity bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover/video:opacity-100 transition-opacity flex flex-col justify-between p-2">
        <div className="flex justify-end">
          <button className="pointer-events-auto p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors cursor-pointer"
            onClick={(e) => {
              block(e); const v = videoRef.current
              const t = v?.currentTime ?? 0; const wasPlaying = playing
              v?.pause(); setPlaying(false); onFullscreen(t, wasPlaying)
            }}>
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
            <div className="h-1 bg-white rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-end">
            <button className="pointer-events-auto cursor-pointer text-white hover:text-white/70 transition-colors" onClick={toggleMute}>
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        </div>
      </div>
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm">
            <Play className="size-7 text-white fill-white" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── PostCard ──────────────────────────────────────────────────────────────────
export function PostCard({
  title, excerpt, tag, timeAgo, likes, comments,
  username = "Anonymous", avatar = "", imageUrls = [], videoUrl = null,
}: PostCardProps) {
  const [modal, setModal] = useState<{ time: number; wasPlaying: boolean } | null>(null)
  const [hovered, setHovered] = useState(false)
  const accent = flairAccent[tag] ?? defaultAccent

  const renderImages = () => {
    const urls = imageUrls?.filter(Boolean) ?? []
    if (urls.length === 0) return null
    const count = urls.length
    const imgClass = "w-full h-full object-cover"

    if (count === 1) return (
      <div className="mt-3 rounded-xl overflow-hidden" style={{ height: 200 }}>
        <img src={urls[0]} className={imgClass} loading="lazy" alt="" />
      </div>
    )
    if (count === 2) return (
      <div className="mt-3 rounded-xl overflow-hidden flex gap-1" style={{ height: 180 }}>
        {urls.slice(0, 2).map((url, i) => (
          <div key={i} className="flex-1 min-w-0 overflow-hidden rounded-lg">
            <img src={url} className={imgClass} loading="lazy" alt="" />
          </div>
        ))}
      </div>
    )
    if (count === 3) return (
      <div className="mt-3 rounded-xl overflow-hidden flex gap-1" style={{ height: 180 }}>
        <div className="flex-[2] min-w-0 overflow-hidden rounded-lg">
          <img src={urls[0]} className={imgClass} loading="lazy" alt="" />
        </div>
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          {urls.slice(1, 3).map((url, i) => (
            <div key={i} className="flex-1 min-h-0 overflow-hidden rounded-lg">
              <img src={url} className={imgClass} loading="lazy" alt="" />
            </div>
          ))}
        </div>
      </div>
    )
    return (
      <div className="mt-3 rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 gap-1" style={{ height: 180 }}>
        {urls.slice(0, 4).map((url, i) => (
          <div key={i} className="relative overflow-hidden rounded-lg">
            <img src={url} className={imgClass} loading="lazy" alt="" />
            {i === 3 && count > 4 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-lg font-bold">+{count - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {modal && videoUrl && (
        <VideoModal src={videoUrl} startTime={modal.time} wasPlaying={modal.wasPlaying} onClose={() => setModal(null)} />
      )}

      <article
        className="group relative cursor-pointer rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
        style={{
          background: "hsl(var(--card))",
          border: `1px solid ${hovered ? accent.dot + "50" : "hsl(var(--border))"}`,
          boxShadow: hovered
            ? `0 8px 30px rgba(0,0,0,0.15), 0 0 0 1px ${accent.dot}30`
            : "0 1px 4px rgba(0,0,0,0.06)",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          transition: "all 0.18s ease",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Colored top accent bar per flair */}
        <div className="h-[3px] w-full shrink-0"
          style={{ background: `linear-gradient(90deg, ${accent.dot} 0%, ${accent.dot}50 100%)` }} />

        <div className="p-4 flex flex-col flex-1 gap-0">

          {/* ── Header: avatar + name + time + flair ── */}
          <div className="flex items-center gap-2.5 mb-3">
            {avatar ? (
              <img src={avatar} className="size-8 rounded-full object-cover shrink-0"
                style={{ boxShadow: `0 0 0 2px ${accent.dot}40` }} loading="lazy" />
            ) : (
              <div className="size-8 rounded-full shrink-0 flex items-center justify-center text-xs font-black"
                style={{ background: accent.bg, color: accent.text }}>
                {username.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-foreground leading-tight truncate">
                @{username}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <Clock className="size-2.5 shrink-0" />{timeAgo}
              </span>
            </div>

            {/* Flair pill */}
            <div className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: accent.bg }}>
              <span className="size-[5px] rounded-full" style={{ background: accent.dot }} />
              <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ color: accent.text }}>
                {tag}
              </span>
            </div>
          </div>

          {/* ── Title — bold, high contrast ── */}
          <h3 className="font-bold text-[15px] leading-snug text-foreground line-clamp-2 mb-2">
            {title}
          </h3>

          {/* ── Media ── */}
          {renderImages()}
          {videoUrl && videoUrl.trim() !== "" && (
            <div onClick={e => { e.preventDefault(); e.stopPropagation() }}>
              <VideoPlayer src={videoUrl} onFullscreen={(t, wasPlaying) => setModal({ time: t, wasPlaying })} />
            </div>
          )}

          {/* ── Excerpt ── */}
          <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed flex-1 transition-colors duration-200"
            style={{ color: hovered ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
            {excerpt}
          </p>

          {/* ── Footer ── */}
          <div className="mt-4 pt-3 flex items-center gap-3"
            style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-rose-400 transition-colors group/like">
              <Heart className="size-3.5 transition-transform group-hover/like:scale-125 group-hover/like:fill-rose-400" />
              <span className="font-semibold tabular-nums">{likes}</span>
            </button>
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="size-3.5" />
              <span className="font-semibold tabular-nums">{comments}</span>
            </button>
            <span className="ml-auto text-[10px] font-bold tracking-widest uppercase"
              style={{ color: hovered ? accent.dot : accent.text }}>
              Read more →
            </span>
          </div>

        </div>
      </article>
    </>
  )
}