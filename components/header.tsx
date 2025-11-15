'use client'

import { useState } from 'react'
import { Menu, X, LogIn, User, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const isLoggedIn = true // Mock auth state - set to true to show logged in nav

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
            {isLoggedIn && (
              <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
            )}
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/profile">
                  <Button variant="ghost" size="icon" title="Profile">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" size="icon" title="Settings">
                    <Settings className="h-5 w-5" />
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  Sign Up
                </Button>
              </>
            )}

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
            {isLoggedIn && (
              <>
                <Link href="/dashboard" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
                  Dashboard
                </Link>
                <Link href="/profile" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
                  Profile
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
