import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: billingHistory, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Error fetching billing history:', error)
      return NextResponse.json({ error: 'Failed to fetch billing history' }, { status: 500 })
    }

    return NextResponse.json({ history: billingHistory || [] })
  } catch (error) {
    console.error('[v0] Error in billing history API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
