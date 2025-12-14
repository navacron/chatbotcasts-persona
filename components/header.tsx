"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/ChatBotCastsSm.png" alt="ChatBotCasts" width={64} height={64} className="h-8 w-8" />
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
            <Link href="/billing" className="text-foreground hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link href="/test-prompt" className="text-foreground hover:text-primary transition-colors">
              Test Prompt
            </Link>
            <SignedIn>
              <Link href="/dashboard" className="text-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
            </SignedIn>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button>Sign Up</Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          {/* Mobile Menu */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2">
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
            <Link href="/billing" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
              Pricing
            </Link>
            <Link href="/test-prompt" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
              Test Prompt
            </Link>
            <SignedIn>
              <Link href="/dashboard" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
                Dashboard
              </Link>
            </SignedIn>
            <div className="border-t border-border pt-2">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary rounded">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary rounded">
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link href="/profile" className="block px-4 py-2 text-foreground hover:bg-secondary rounded">
                  Profile
                </Link>
                <div className="px-4 py-2">
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
