import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase.server'

export async function AuthGuard({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return <>{children}</>
}
