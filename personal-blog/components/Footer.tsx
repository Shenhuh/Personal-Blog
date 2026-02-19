import { PenLine } from "lucide-react"
import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12 md:px-12 lg:px-20">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-full bg-primary">
            <PenLine className="size-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            Whisper
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <Link
            href="#"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="#"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href="#"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Guidelines
          </Link>
        </nav>
        <p className="text-xs text-muted-foreground">
          Your identity is always protected.
        </p>
      </div>
    </footer>
  )
}
