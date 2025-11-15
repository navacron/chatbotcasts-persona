'use client'

import { useState, useEffect } from 'react'
import { Menu, X, LogOut, User, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ChatBotCastsSm-uw5DkA6iCVqNZD2RBZAsafFdLnZfyQ.webp"
              alt="ChatBotCasts"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-bold text-lg text-foreground">ChatBotCasts</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <Link href="/create" className="text-foreground hover:text-primary transition-colors">
              Create
            </Link>
            <Link href="/guests" className="text-foreground hover:text-primary transition-colors">
              Guests
            </Link>
            {user && (
              <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {isLoading ? (
              <div className="w-20 h-9 bg-secondary animate-pulse rounded" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <Link href="/profile">
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={handleSignOut}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-border">
            <Link href="/" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
              Home
            </Link>
            <Link href="/create" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
              Create Conversation
            </Link>
            <Link href="/guests" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
              Browse Guests
            </Link>
            {user && (
              <Link href="/dashboard" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
                Dashboard
              </Link>
            )}
            <div className="border-t border-border pt-2">
              {user ? (
                <>
                  <Link href="/profile" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
                    Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary rounded"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/login" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
                    Sign In
                  </Link>
                  <Link href="/auth/signup" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
