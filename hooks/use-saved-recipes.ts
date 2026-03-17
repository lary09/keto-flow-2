'use client'

import useSWR from 'swr'
import { databases, APPWRITE_DATABASE_ID, COLLECTIONS, Query, type SavedRecipe } from '@/lib/appwrite'
import { useAuth } from '@/contexts/auth-context'

export function useSavedRecipes() {
  const { user } = useAuth()

  const { data, error, isLoading, mutate } = useSWR(
    user ? `saved-recipes-${user.$id}` : null,
    async () => {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.SAVED_RECIPES,
        [
          Query.equal('userId', user!.$id),
          Query.orderDesc('savedAt'),
        ]
      )
      return response.documents.map((doc) => ({
        ...doc,
        ingredients: JSON.parse((doc as unknown as SavedRecipe).ingredients || '[]') as string[],
      })) as unknown as (SavedRecipe & { ingredients: string[] })[]
    }
  )

  return {
    recipes: data || [],
    error,
    isLoading,
    mutate,
  }
}
