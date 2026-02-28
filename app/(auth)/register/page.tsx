'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { BrandMark } from '@/components/cc-admin/BrandMark'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    username: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [usernameError, setUsernameError] = useState('')

  const supabase = createClient()
  const requestedNext = searchParams.get('next')

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username.length >= 3) {
        checkUsername(formData.username)
      } else if (formData.username.length > 0) {
        setUsernameStatus('invalid')
        setUsernameError('Username too short')
      } else {
        setUsernameStatus('idle')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [formData.username])

  async function checkUsername(username: string) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameStatus('invalid')
      setUsernameError('Use 3-20 letters, numbers or _')
      return
    }

    setUsernameStatus('checking')
    try {
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`)
      const data = await res.json()
      if (data.available) {
        setUsernameStatus('available')
      } else {
        setUsernameStatus('taken')
        setUsernameError('Username is already taken')
      }
    } catch (err) {
      setUsernameStatus('idle')
    }
  }

  function getErrorMessage(error: unknown, fallback: string) {
    if (typeof error === 'string' && error.trim()) return error
    if (error && typeof error === 'object' && 'message' in error) {
      const maybeMessage = (error as { message?: unknown }).message
      if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage
    }
    return fallback
  }

  function sanitizeNextPath(value: string | null | undefined) {
    if (!value) return null
    if (!value.startsWith('/')) return null
    if (value.startsWith('//')) return null
    if (value.startsWith('/login') || value.startsWith('/register') || value.startsWith('/auth')) return null
    return value
  }

  function authDestinationPath() {
    return sanitizeNextPath(requestedNext) ?? '/parent/dashboard'
  }

  function loginHref() {
    const destination = sanitizeNextPath(requestedNext)
    if (!destination) return '/login'
    return `/login?next=${encodeURIComponent(destination)}`
  }

  function getAuthRedirectUrl() {
    const destination = encodeURIComponent(authDestinationPath())
    return `${window.location.origin.replace(/\/$/, '')}/auth/confirm?next=${destination}`
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    
    if (usernameStatus !== 'available') {
      toast.error(usernameError || 'Please choose a valid username')
      return
    }

    const normalizedEmail = formData.email.trim().toLowerCase()
    const normalizedPassword = formData.password.trim()
    
    if (!normalizedEmail || !normalizedPassword) {
      toast.error('Email and password are required')
      return
    }

    if (normalizedPassword !== confirmPassword.trim()) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const emailRedirectTo = getAuthRedirectUrl()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          emailRedirectTo,
          data: {
            role: 'parent_user',
            full_name: formData.fullName,
            phone: formData.phone,
            username: formData.username.toLowerCase(),
          },
        },
      })
      
      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      if (!authData.session) {
        toast.success('Confirmation email sent. Check inbox/spam, then confirm and sign in.')
        router.push(loginHref())
        return
      }

      // Sync profile immediately
      await fetch('/api/auth/ensure-profile', { method: 'POST' })

      toast.success('Account created successfully!')
      router.push(authDestinationPath())
    } catch (error: any) {
      const message = getErrorMessage(error, 'Failed to create account')
      if (message.includes('unique constraint') && message.includes('username')) {
        toast.error('Username is taken. Please choose another.')
        setUsernameStatus('taken')
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignUp() {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl(),
          queryParams: {
            prompt: 'select_account',
          },
        },
      })
      if (error) throw error
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to start Google sign up'))
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-secondary text-slate-900">
      {/* Left Panel - Desktop Only */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-slate-900 to-[#1A1A2E] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,#3B82F6_0%,transparent_50%)]" />
        </div>
        <div className="relative z-10 text-center px-12">
          <BrandMark compact className="invert brightness-200 h-16 w-auto mx-auto mb-8" />
          <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
            Start your family&apos;s <br />
            <span className="text-cyan-400">Digital ECD Journey</span>
          </h1>
          <p className="mt-6 text-slate-400 text-lg max-w-md mx-auto">
            The simplest way to discover, compare, and apply to quality centres for your children.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors lg:hidden">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="w-full max-w-md my-8">
          <div className="bg-white rounded-[2rem] shadow-xl p-8 sm:p-10 border border-slate-100">
            <header className="mb-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 mb-2">New Operative Profile</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Account</h2>
              <p className="text-slate-500 mt-2 font-medium">Join the next generation of child care</p>
            </header>

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Username</Label>
                  {usernameStatus === 'checking' && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                  {usernameStatus === 'available' && <span className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Available</span>}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <span className="text-[9px] font-bold text-rose-500 uppercase flex items-center gap-1"><AlertCircle className="h-2.5 w-2.5" /> {usernameError}</span>}
                </div>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                  placeholder="unique_handle"
                  className={cn(
                    "h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 outline-none",
                    usernameStatus === 'available' && "border-emerald-200 bg-emerald-50/30",
                    (usernameStatus === 'taken' || usernameStatus === 'invalid') && "border-rose-200 bg-rose-50/30"
                  )}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Protocol</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@domain.com"
                  className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contact Signal (Phone)</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+27..."
                  className="h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500/20 outline-none"
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Security Key</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl pr-10 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 flex h-12 w-10 items-center justify-center text-slate-400"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm Key</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl pr-10 focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 flex h-12 w-10 items-center justify-center text-slate-400"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <Button type="submit" className="h-12 w-full bg-slate-900 text-white font-black uppercase tracking-widest rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98] mt-4" disabled={loading}>
                {loading ? 'Encrypting...' : 'Establish Profile'}
              </Button>
            </form>

            <div className="relative my-8 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <span className="relative px-4 bg-white text-[10px] font-black uppercase tracking-widest text-slate-400">
                Neural Handshake
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full bg-white border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
            >
              {googleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.48-.98 7.31-2.64l-3.57-2.77c-.99.66-2.26 1.06-3.74 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <footer className="mt-8 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Operative? </span>
              <Link href={loginHref()} className="text-xs font-black uppercase tracking-widest text-cyan-600 hover:underline">
                Initiate Login
              </Link>
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}
