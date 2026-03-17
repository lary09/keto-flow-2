'use client'

import useSWR from 'swr'
import { databases, APPWRITE_DATABASE_ID, COLLECTIONS, Query, ID, type MealLog } from '@/lib/appwrite'
import { useAuth } from '@/contexts/auth-context'

export function useMealLogs(date?: string) {
  const { user } = useAuth()
  const today = date || new Date().toISOString().split('T')[0]

  const { data, error, isLoading, mutate } = useSWR(
    user ? `meal-logs-${user.$id}-${today}` : null,
    async () => {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.MEAL_LOGS,
        [
          Query.equal('userId', user!.$id),
          Query.equal('date', today),
          Query.orderAsc('$createdAt'),
        ]
      )
      return response.documents as unknown as MealLog[]
    }
  )

  const addMealLog = async (log: Omit<MealLog, '$id' | 'userId' | '$createdAt'>) => {
    if (!user) return

    const newLog = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.MEAL_LOGS,
      ID.unique(),
      {
        ...log,
        userId: user.$id,
      }
    )
    mutate()
    return newLog
  }

  const deleteMealLog = async (logId: string) => {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.MEAL_LOGS,
      logId
    )
    mutate()
  }

  const totals = (data || []).reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      fat: acc.fat + (log.fat || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
    }),
    { calories: 0, fat: 0, protein: 0, carbs: 0 }
  )

  const mealsByType = {
    breakfast: (data || []).filter((log) => log.mealType === 'breakfast'),
    lunch: (data || []).filter((log) => log.mealType === 'lunch'),
    dinner: (data || []).filter((log) => log.mealType === 'dinner'),
    snack: (data || []).filter((log) => log.mealType === 'snack'),
  }

  return {
    logs: data || [],
    mealsByType,
    totals,
    error,
    isLoading,
    addMealLog,
    deleteMealLog,
    mutate,
  }
}
