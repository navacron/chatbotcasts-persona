import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    
    // Fetch public personas
    let publicQuery = supabase
      .from('persona')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    
    if (query) {
      publicQuery = publicQuery.or(`name.ilike.%${query}%,prompt.ilike.%${query}%`)
    }
    
    const { data: publicPersonas, error: publicError } = await publicQuery
    
    if (publicError) {
      console.error('[v0] Error fetching public personas:', publicError)
      return NextResponse.json({ error: 'Failed to fetch public personas' }, { status: 500 })
    }
    
    // Fetch user's personas if authenticated
    let myPersonas = []
    if (user) {
      let myQuery = supabase
        .from('persona')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (query) {
        myQuery = myQuery.or(`name.ilike.%${query}%,prompt.ilike.%${query}%`)
      }
      
      const { data: userPersonas, error: myError } = await myQuery
      
      if (myError) {
        console.error('[v0] Error fetching user personas:', myError)
      } else {
        myPersonas = userPersonas || []
      }
    }
    
    return NextResponse.json({
      publicPersonas: publicPersonas || [],
      myPersonas,
      isAuthenticated: !!user
    })
  } catch (error) {
    console.error('[v0] Error in personas API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
