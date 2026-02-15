import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Cache this API route for 1 hour
export const revalidate = 3600

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: categories, error } = await supabase
      .from('category')
      .select('id, name, slug, description')
      .order('name', { ascending: true })

    if (error) {
      console.error('[v0] Error fetching categories:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('[v0] Error in categories API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
