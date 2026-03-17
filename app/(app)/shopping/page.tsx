'use client'

import { useState } from 'react'
import { useShoppingLists } from '@/hooks/use-shopping-lists'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia
} from '@/components/ui/empty'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, Trash2, ShoppingCart, Check, Apple, Beef, Droplets, Leaf } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ShoppingItem } from '@/lib/appwrite'

const KETO_STAPLES = [
  {
    category: 'Grasas',
    icon: Droplets,
    items: ['Aguacate', 'Aceite de Oliva', 'Mantequilla', 'Nueces Macadamia'],
  },
  {
    category: 'Proteínas',
    icon: Beef,
    items: ['Huevos', 'Pechuga de Pollo', 'Salmón', 'Carne Picada', 'Tocino'],
  },
  {
    category: 'Vegetales',
    icon: Leaf,
    items: ['Espinacas', 'Brócoli', 'Coliflor', 'Espárragos', 'Calabacín'],
  },
  {
    category: 'Snacks',
    icon: Apple,
    items: ['Quesos', 'Almendras', 'Aceitunas'],
  },
]

export default function ShoppingPage() {
  const { lists, isLoading, createList, deleteList, addItemToList, toggleItemChecked, removeItemFromList } = useShoppingLists()
  const [newListDialogOpen, setNewListDialogOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')
  const [newItemUnit, setNewItemUnit] = useState('')

  const selectedList = lists.find((l) => l.$id === selectedListId)

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return

    setCreatingList(true)
    try {
      const list = await createList(newListName.trim())
      setNewListName('')
      setNewListDialogOpen(false)
      if (list) setSelectedListId(list.$id)
      toast.success('¡Lista de compras creada!')
    } catch {
      toast.error('Error al crear la lista')
    } finally {
      setCreatingList(false)
    }
  }

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteList(listId)
      if (selectedListId === listId) setSelectedListId(null)
      toast.success('Lista eliminada')
    } catch {
      toast.error('Error al eliminar la lista')
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedListId || !newItemName.trim()) return

    try {
      await addItemToList(selectedListId, {
        name: newItemName.trim(),
        quantity: parseFloat(newItemQuantity) || 1,
        unit: newItemUnit.trim(),
        checked: false,
      })
      setNewItemName('')
      setNewItemQuantity('1')
      setNewItemUnit('')
    } catch {
      toast.error('Error al añadir el artículo')
    }
  }

  const handleToggleItem = async (listId: string, itemId: string) => {
    try {
      await toggleItemChecked(listId, itemId)
    } catch {
      toast.error('Error al actualizar el artículo')
    }
  }

  const handleRemoveItem = async (listId: string, itemId: string) => {
    try {
      await removeItemFromList(listId, itemId)
    } catch {
      toast.error('Error al eliminar el artículo')
    }
  }

  const checkedCount = selectedList?.items.filter((i) => i.checked).length || 0
  const totalCount = selectedList?.items.length || 0

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Compras</h1>
          <p className="text-sm text-muted-foreground">Gestiona tus listas de compras</p>
        </div>
        <Button onClick={() => setNewListDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Lista
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {/* Keto Suggestions (Visible always) */}
      {!isLoading && (
        <div className="space-y-3 py-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Sugerencias Keto</h3>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-3">
              {KETO_STAPLES.map((cat) => (
                <Card key={cat.category} className="min-w-[160px] bg-muted/20 border-border/40">
                  <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-xs flex items-center gap-2">
                      <cat.icon className="w-3 h-3 text-primary" />
                      {cat.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-2">
                    <div className="flex flex-wrap gap-1">
                      {cat.items.map((item) => (
                        <button
                          key={item}
                          onClick={async () => {
                            let targetId = selectedListId
                            if (!targetId && lists.length > 0) {
                              targetId = lists[0].$id!
                              setSelectedListId(targetId)
                            }
                            
                            if (!targetId) {
                              try {
                                const list = await createList("Mi Compra Keto")
                                if (list) {
                                  targetId = list.$id
                                  setSelectedListId(targetId)
                                }
                              } catch (e) {
                                toast.error("Crea una lista primero")
                                return
                              }
                            }

                            if (targetId) {
                              await addItemToList(targetId, {
                                name: item,
                                quantity: 1,
                                unit: '',
                                checked: false,
                              })
                              toast.success(`${item} añadido`)
                            }
                          }}
                          className="text-[10px] bg-background border border-border px-2 py-1 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          + {item}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && lists.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingCart />
            </EmptyMedia>
            <EmptyTitle>No hay listas de compras</EmptyTitle>
            <EmptyDescription>
              Crea tu primera lista de compras o añade una sugerencia arriba.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setNewListDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Lista
          </Button>
        </Empty>
      )}

      {/* Lists Selection Screen */}
      {!isLoading && lists.length > 0 && !selectedListId && (
        <div className="grid grid-cols-1 gap-3">
          {lists.map((list) => {
            const checked = list.items.filter((i) => i.checked).length
            const total = list.items.length
            return (
              <Card
                key={list.$id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedListId(list.$id!)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{list.name}</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteList(list.$id!)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {checked}/{total} artículos
                    </Badge>
                    {total > 0 && checked === total && (
                      <Badge variant="default" className="bg-primary">
                        <Check className="mr-1 h-3 w-3" />
                        Completado
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Selected List Detail Screen */}
      {selectedList && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedListId(null)}>
              Volver
            </Button>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">{selectedList.name}</h2>
              <p className="text-xs text-muted-foreground">
                {checkedCount} de {totalCount} artículos marcados
              </p>
            </div>
          </div>

          <form onSubmit={handleAddItem} className="flex gap-2">
            <Input
              placeholder="Añadir artículo..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Cant"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              className="w-16"
            />
            <Input
              placeholder="Unidad"
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
              className="w-20"
            />
            <Button type="submit" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </form>

          <div className="space-y-2">
            {selectedList.items.length === 0 ? (
              <div className="py-8 text-center border rounded-lg border-dashed">
                <p className="text-sm text-muted-foreground">No hay artículos aún. Añade el primero arriba.</p>
              </div>
            ) : (
              selectedList.items
                .sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1))
                .map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border border-border p-3 transition-colors',
                      item.checked && 'bg-muted/50'
                    )}
                  >
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => handleToggleItem(selectedList.$id!, item.id)}
                    />
                    <div className="flex-1">
                      <p className={cn('text-sm text-foreground', item.checked && 'line-through opacity-60')}>
                        {item.name}
                      </p>
                      {(item.quantity && item.quantity > 1 || item.unit) && (
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {item.unit}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveItem(selectedList.$id!, item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      <Dialog open={newListDialogOpen} onOpenChange={setNewListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Lista de Compras</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateList}>
            <Input
              placeholder="Nombre de la lista (ej: Compras Semanales)"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              autoFocus
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setNewListDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingList || !newListName.trim()}>
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
