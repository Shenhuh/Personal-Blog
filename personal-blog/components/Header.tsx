import Link from "next/link"
import { PenLine } from "lucide-react"

export default function Header() {
  return (
    <header className="flex sticky top-0 z-50 items-center justify-between px-6 py-5 md:px-12 lg:px-20">
      <Link href="/" className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary">
          <PenLine className="size-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Whisper
        </span>
      </Link>
      <nav className="hidden items-center gap-8 md:flex">
        <Link
          href="#"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Explore
        </Link>
        <Link
          href="#"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          About
        </Link>
      </nav>
      <Link
        href="#"
        className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
      >
        Write a Post
      </Link>
    </header>
  )
}
