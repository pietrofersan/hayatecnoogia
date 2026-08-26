import { NextResponse } from 'next/server'
import { supabaseServidor } from '@/lib/supabase'

export async function POST(request: Request) {
  const supabase = await supabaseServidor()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
