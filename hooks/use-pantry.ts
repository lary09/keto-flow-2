'use client'

import useSWR from 'swr'
import { databases, APPWRITE_DATABASE_ID, COLLECTIONS, Query, ID, type PantryItem } from '@/lib/appwrite'
import { useAuth } from '@/contexts/auth-context'

export function usePantry() {
  const { user } = useAuth()

  const { data, error, isLoading, mutate } = useSWR(
    user ? `pantry-${user.$id}` : null,
    async () => {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.PANTRY_ITEMS,
        [
          Query.equal('userId', user!.$id),
          Query.orderAsc('category'),
          Query.orderAsc('name'),
          Query.limit(200),
        ]
      )
      return response.documents as unknown as PantryItem[]
    }
  )

  const addItem = async (name: string, category: PantryItem['category']) => {
    if (!user) return
    await databases.createDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.PANTRY_ITEMS,
      ID.unique(),
      {
        userId: user.$id,
        name: name.trim(),
        category,
      }
    )
    mutate()
  }

  const removeItem = async (itemId: string) => {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.PANTRY_ITEMS,
      itemId
    )
    mutate()
  }

  const items = data || []

  const itemsByCategory = {
    proteína: items.filter((i) => i.category === 'proteína'),
    grasa: items.filter((i) => i.category === 'grasa'),
    vegetal: items.filter((i) => i.category === 'vegetal'),
    lácteo: items.filter((i) => i.category === 'lácteo'),
    otro: items.filter((i) => i.category === 'otro'),
  }

  return {
    items,
    itemsByCategory,
    error,
    isLoading,
    addItem,
    removeItem,
    mutate,
  }
}
