import { atom } from 'jotai'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface Category {
  id: string
  userId: string
  name: string
  color: string  // hex e.g. "#ff5733"
  icon: string
  createdAt: string
}

// ----------------------------------------------------------------
// Atoms
// ----------------------------------------------------------------

export const categoriesAtom = atom<Category[]>([])
