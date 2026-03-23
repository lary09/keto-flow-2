'use client'

import useSWR from 'swr'
import { databases, APPWRITE_DATABASE_ID, COLLECTIONS, Query, ID, type ShoppingList, type ShoppingItem } from '@/lib/appwrite'
import { useAuth } from '@/contexts/auth-context'

function parseShoppingItems(rawItems: unknown) {
  if (Array.isArray(rawItems)) {
    return rawItems as ShoppingItem[]
  }

  if (typeof rawItems !== 'string' || rawItems.trim() === '') {
    return []
  }

  try {
    const parsed = JSON.parse(rawItems)
    return Array.isArray(parsed) ? parsed as ShoppingItem[] : []
  } catch (error) {
    console.warn('No se pudieron parsear los items de shopping, se usará una lista vacía.', error)
    return []
  }
}

function hydrateShoppingList(doc: ShoppingList | (ShoppingList & { items: unknown })) {
  return {
    ...doc,
    items: parseShoppingItems(doc.items),
  } as ShoppingList & { items: ShoppingItem[] }
}

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
      return response.documents.map((doc) => hydrateShoppingList(doc as unknown as ShoppingList))
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
    const hydratedList = hydrateShoppingList(newList as unknown as ShoppingList)
    mutate((current) => [hydratedList, ...(current || [])], false)
    return hydratedList
  }

  const deleteList = async (listId: string) => {
    await databases.deleteDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.SHOPPING_LISTS,
      listId
    )
    mutate((current) => (current || []).filter((list) => list.$id !== listId), false)
  }

  const updateList = async (listId: string, updates: { name?: string; items?: ShoppingItem[] }) => {
    const updateData: Record<string, string> = {}
    if (updates.name) updateData.name = updates.name
    if (updates.items) updateData.items = JSON.stringify(updates.items)

    const updatedDoc = await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.SHOPPING_LISTS,
      listId,
      updateData
    )
    const hydratedList = hydrateShoppingList(updatedDoc as unknown as ShoppingList)
    mutate((current) => (current || []).map((list) => (list.$id === listId ? hydratedList : list)), false)
  }

  const addItemToList = async (listId: string, item: Omit<ShoppingItem, 'id'>) => {
    let list = data?.find((l) => l.$id === listId)

    if (!list) {
      const remoteList = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.SHOPPING_LISTS,
        listId
      )
      list = hydrateShoppingList(remoteList as unknown as ShoppingList)
    }

    const newItem: ShoppingItem = {
      ...item,
      id: ID.unique(),
    }

    await updateList(listId, {
      items: [...list.items, newItem],
    })
  }

  const toggleItemChecked = async (listId: string, itemId: string) => {
    let list = data?.find((l) => l.$id === listId)

    if (!list) {
      const remoteList = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.SHOPPING_LISTS,
        listId
      )
      list = hydrateShoppingList(remoteList as unknown as ShoppingList)
    }

    const updatedItems = list.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )

    await updateList(listId, { items: updatedItems })
  }

  const removeItemFromList = async (listId: string, itemId: string) => {
    let list = data?.find((l) => l.$id === listId)

    if (!list) {
      const remoteList = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.SHOPPING_LISTS,
        listId
      )
      list = hydrateShoppingList(remoteList as unknown as ShoppingList)
    }

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
