'use server'

import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase.server'

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const USER_CAP = parseInt(process.env.USER_CAP ?? '5', 10)

const DEFAULT_CATEGORIES = [
  { name: 'Gimnasio / Ejercicio', color: '#FF6B6B', icon: 'dumbbell' },
  { name: 'Estudio', color: '#4ECDC4', icon: 'book' },
  { name: 'Trabajo', color: '#45B7D1', icon: 'briefcase' },
  { name: 'Búsqueda de empleo', color: '#96CEB4', icon: 'search' },
  { name: 'Social / Familia', color: '#FFEAA7', icon: 'users' },
  { name: 'Descanso / Sueño', color: '#DDA0DD', icon: 'moon' },
  { name: 'Proyectos personales', color: '#98D8C8', icon: 'folder' },
  { name: 'Deportes / Recreación', color: '#F7DC6F', icon: 'trophy' },
]

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type AuthResult<T> = { data: T | null; error: string | null }

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUserCount(): Promise<number> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1, page: 1 })
  if (error) throw new Error(`Failed to count users: ${error.message}`)
  return data.total ?? 0
}

export async function seedDefaultCategories(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const rows = DEFAULT_CATEGORIES.map((cat) => ({
    user_id: userId,
    name: cat.name,
    color: cat.color,
    icon: cat.icon,
  }))
  const { error } = await supabase.from('categories').insert(rows)
  if (error) throw new Error(`Failed to seed categories: ${error.message}`)
}

// ----------------------------------------------------------------
// Actions
// ----------------------------------------------------------------

export async function registerUser(
  email: string,
  password: string
): Promise<AuthResult<{ user: { id: string; email: string } }>> {
  // 1. Check user cap
  const count = await getUserCount()
  if (count >= USER_CAP) {
    return {
      data: null,
      error: 'La app está en beta cerrada, no hay más cupos disponibles',
    }
  }

  // 2. Create user via admin client — email_confirm:true skips confirmation email
  const supabase = createAdminClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data?.user) {
    return { data: null, error: error?.message ?? 'Registration failed' }
  }

  // 3. Insert into public.users (required by FK on categories)
  const { error: userInsertError } = await supabase
    .from('users')
    .insert({ id: data.user.id, email })
  if (userInsertError) {
    return { data: null, error: userInsertError.message }
  }

  // 4. Seed default categories
  await seedDefaultCategories(data.user.id)

  return {
    data: { user: { id: data.user.id, email: data.user.email ?? email } },
    error: null,
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResult<object>> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
