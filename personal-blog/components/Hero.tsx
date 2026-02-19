import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section className="flex flex-col items-center px-6 pb-20 pt-24 text-center md:px-12 md:pb-28 md:pt-32 lg:px-20 lg:pt-40">
      <h1 className="max-w-4xl font-serif text-5xl leading-[1.1] tracking-tight text-foreground md:text-7xl lg:text-8xl text-balance">
        Words without faces,
        <br className="hidden md:block" />
        stories without names
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:mt-8 md:text-lg">
        A space for honest expression. Share your thoughts, confessions, and
        stories — completely anonymous, completely free.
      </p>
      <div className="mt-10 flex items-center gap-4">
        <Button
          size="lg"
          className="rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90"
        >
          Get Started
          <ArrowRight className="ml-1 size-4" />
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="rounded-full text-muted-foreground hover:text-foreground"
        >
          Read Stories
        </Button>
      </div>
    </section>
  )
}
