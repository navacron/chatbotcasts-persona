import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const error_description = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  console.log('[v0] OAuth callback URL:', requestUrl.href)
  console.log('[v0] OAuth callback params:', { 
    hasCode: !!code, 
    error, 
    error_description,
    allParams: Object.fromEntries(requestUrl.searchParams.entries())
  })

  if (error) {
    console.error('[v0] OAuth error from provider:', error, error_description)
    return NextResponse.redirect(
      `${origin}/auth/signup?error=${encodeURIComponent(error_description || error)}`
    )
  }

  if (code) {
    try {
      const supabase = await createClient()
      console.log('[v0] Exchanging code for session...')
      
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('[v0] Exchange result:', { 
        hasSession: !!data.session,
        hasUser: !!data.user,
        userId: data.user?.id,
        userEmail: data.user?.email,
        errorMessage: exchangeError?.message 
      })

      if (exchangeError) {
        console.error('[v0] Session exchange error:', exchangeError)
        return NextResponse.redirect(
          `${origin}/auth/signup?error=${encodeURIComponent(exchangeError.message)}`
        )
      }

      if (!data.session) {
        console.error('[v0] No session returned after exchange')
        return NextResponse.redirect(
          `${origin}/auth/signup?error=${encodeURIComponent('Failed to create session')}`
        )
      }

      console.log('[v0] OAuth successful, redirecting to dashboard')
      return NextResponse.redirect(`${origin}/dashboard`)
    } catch (err) {
      console.error('[v0] Unexpected error in callback:', err)
      return NextResponse.redirect(
        `${origin}/auth/signup?error=${encodeURIComponent('Authentication failed: ' + (err instanceof Error ? err.message : 'Unknown error'))}`
      )
    }
  }

  console.error('[v0] No code or error in callback, invalid state')
  return NextResponse.redirect(
    `${origin}/auth/signup?error=${encodeURIComponent('Invalid authentication response')}`
  )
}
