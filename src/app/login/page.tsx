'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, User, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Login failed')
            }

            // Successful login
            router.push('/')
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            {/* Background Gradient Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1a0b00_0%,#000000_60%)] pointer-events-none" />

            <div className="w-full max-w-md space-y-8 relative z-10 bg-[#0c0c0e] p-8 rounded-3xl border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                <div className="text-center space-y-2">
                    <div className="h-12 w-12 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                        <Lock className="h-6 w-6 text-orange-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Access Ledgerly</h1>
                    <p className="text-zinc-500 text-sm">Enter your secure credentials to continue.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 mt-8">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Username</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
                                <Input
                                    type="text"
                                    placeholder="admin"
                                    className="bg-white/5 border-white/10 pl-10 h-11 text-white focus:ring-orange-500/50 focus:border-orange-500"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="bg-white/5 border-white/10 pl-10 pr-10 h-11 text-white focus:ring-orange-500/50 focus:border-orange-500"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg text-center font-medium">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]"
                        disabled={isLoading}
                    >
                        {isLoading ? "Verifying..." : "Secure Login"}
                    </Button>
                </form>

                <div className="text-center text-[10px] text-zinc-600 mt-6">
                    <p>Protected by Layer-7 Middleware & AES-256 Encryption</p>
                </div>
            </div>
        </div>
    )
}
