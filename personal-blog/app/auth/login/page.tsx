"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  const supabase = createClient()

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push("/feed")
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <h1 className="text-2xl font-bold mb-6">Welcome back</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="mb-4" />
      <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="mb-4" />
      <Button onClick={handleLogin} className="w-full">Login</Button>
      <p className="mt-4 text-center text-sm">Don't have an account? <Link href="/auth/register" className="underline">Register</Link></p>
    </div>
  )
}