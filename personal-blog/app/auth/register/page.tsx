"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const supabase = createClient()

  const handleRegister = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else alert("Check your email to confirm your account!")
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <h1 className="text-2xl font-bold mb-6">Create an account</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="mb-4" />
      <Input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="mb-4" />
      <Button onClick={handleRegister} className="w-full">Register</Button>
      <p className="mt-4 text-center text-sm">Already have an account? <Link href="/auth/login" className="underline">Login</Link></p>
    </div>
  )
}