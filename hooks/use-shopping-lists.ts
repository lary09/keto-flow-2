'use client'

import useSWR from 'swr'
import { databases, APPWRITE_DATABASE_ID, COLLECTIONS, Query, ID, type ShoppingList, type ShoppingItem } from '@/lib/appwrite'
import { useAuth } from '@/contexts/auth-context'

export function useShoppingLists() {
  const { user } = useAuth()

  const { data, error, isLoading, mutate } = useSWR(
    user ? `shopping-lists-${user.$id}` : null,
    async () => {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.SHOPPING_LISTS,
        [
          Query.equal('userId', user!.$id),
          Query.orderDesc('$createdAt'),
        ]
      )
      return response.documents.map((doc) => ({
        ...doc,
        items: JSON.parse((doc as unknown as ShoppingList).items || '[]') as ShoppingItem[],
      })) as unknown as (ShoppingList & { items: ShoppingItem[] })[]
    }
  )

  const createList = async (name: string) => {
    if (!user) return

    const newList = await databases.createDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.SHOPPING_LISTS,
      ID.unique(),
      {
        userId: user.$id,
        name,
        items: '[]',
      }
    )
    mutate()
    return newList
  }

  const deleteList = async (listId: string) => {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.SHOPPING_LISTS,
      listId
    )
    mutate()
  }

  const updateList = async (listId: string, updates: { name?: string; items?: ShoppingItem[] }) => {
    const updateData: Record<string, string> = {}
    if (updates.name) updateData.name = updates.name
    if (updates.items) updateData.items = JSON.stringify(updates.items)

    await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.SHOPPING_LISTS,
      listId,
      updateData
    )
    mutate()
  }

  const addItemToList = async (listId: string, item: Omit<ShoppingItem, 'id'>) => {
    const list = data?.find((l) => l.$id === listId)
    if (!list) return

    const newItem: ShoppingItem = {
      ...item,
      id: ID.unique(),
    }

    await updateList(listId, {
      items: [...list.items, newItem],
    })
  }

  const toggleItemChecked = async (listId: string, itemId: string) => {
    const list = data?.find((l) => l.$id === listId)
    if (!list) return

    const updatedItems = list.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )

    await updateList(listId, { items: updatedItems })
  }

  const removeItemFromList = async (listId: string, itemId: string) => {
    const list = data?.find((l) => l.$id === listId)
    if (!list) return

    const updatedItems = list.items.filter((item) => item.id !== itemId)
    await updateList(listId, { items: updatedItems })
  }

  return {
    lists: data || [],
    error,
    isLoading,
    createList,
    deleteList,
    updateList,
    addItemToList,
    toggleItemChecked,
    removeItemFromList,
    mutate,
  }
}
