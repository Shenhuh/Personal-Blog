import Header from "@/components/Header"
import { Hero } from "@/components/Hero"
import { RecentPosts } from "@/components/RecentPost"
import Footer from "@/components/Footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <div className="mx-auto max-w-6xl px-6 md:px-12 lg:px-20">
          <div className="h-px bg-border" role="separator" />
        </div>
        <div className="pt-16 md:pt-20">
          <RecentPosts />
        </div>
      </main>
      <Footer />
    </div>
  )
}
