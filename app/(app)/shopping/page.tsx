'use client'

import { useState } from 'react'
import { useShoppingLists } from '@/hooks/use-shopping-lists'
import { useSavedRecipes } from '@/hooks/use-saved-recipes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
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
import {
  Plus,
  MoreVertical,
  Trash2,
  ShoppingCart,
  Check,
  Apple,
  Beef,
  Droplets,
  Leaf,
  ChevronLeft,
  Sparkles,
  ListChecks,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ShoppingItem } from '@/lib/appwrite'

const KETO_STAPLES = [
  {
    category: 'Grasas',
    icon: Droplets,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    items: ['Aguacate', 'Aceite de Oliva', 'Mantequilla', 'Nueces Macadamia', 'Aceite de Coco'],
  },
  {
    category: 'Proteínas',
    icon: Beef,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    items: ['Huevos', 'Pechuga de Pollo', 'Salmón', 'Carne Picada', 'Tocino', 'Atún'],
  },
  {
    category: 'Vegetales',
    icon: Leaf,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    items: ['Espinacas', 'Brócoli', 'Coliflor', 'Espárragos', 'Calabacín', 'Lechuga'],
  },
  {
    category: 'Snacks',
    icon: Apple,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    items: ['Quesos', 'Almendras', 'Aceitunas', 'Pepinos'],
  },
]

export default function ShoppingPage() {
  const {
    lists,
    isLoading: listsLoading,
    createList,
    deleteList,
    addItemToList,
    toggleItemChecked,
    removeItemFromList,
  } = useShoppingLists()
  const { recipes, isLoading: recipesLoading } = useSavedRecipes()

  const isLoading = listsLoading || recipesLoading
  const [newListDialogOpen, setNewListDialogOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [creatingList, setCreatingList] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')

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
      toast.success('¡Lista creada!')
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
        quantity: 1,
        unit: '',
        checked: false,
      })
      setNewItemName('')
    } catch {
      toast.error('Error al añadir el artículo')
    }
  }

  const handleQuickAdd = async (itemName: string) => {
    let targetId = selectedListId
    if (!targetId && lists.length > 0) {
      targetId = lists[0].$id!
      setSelectedListId(targetId)
    }

    if (!targetId) {
      try {
        const list = await createList('Mi Compra Keto')
        if (list) {
          targetId = list.$id
          setSelectedListId(targetId)
        }
      } catch {
        toast.error('Crea una lista primero')
        return
      }
    }

    if (targetId) {
      await addItemToList(targetId, {
        name: itemName,
        quantity: 1,
        unit: '',
        checked: false,
      })
      toast.success(`${itemName} añadido`)
    }
  }

  const handleToggleItem = async (listId: string, itemId: string) => {
    try {
      await toggleItemChecked(listId, itemId)
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const handleRemoveItem = async (listId: string, itemId: string) => {
    try {
      await removeItemFromList(listId, itemId)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const checkedCount = selectedList?.items.filter((i) => i.checked).length || 0
  const totalCount = selectedList?.items.length || 0
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  // ── LIST DETAIL VIEW ──
  if (selectedList) {
    const uncheckedItems = selectedList.items.filter((i) => !i.checked)
    const checkedItems = selectedList.items.filter((i) => i.checked)

    return (
      <div className="flex flex-col gap-4 p-4">
        {/* Back header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSelectedListId(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{selectedList.name}</h1>
            <p className="text-xs text-muted-foreground">
              {checkedCount} de {totalCount} completados
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleDeleteList(selectedList.$id!)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar lista
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress */}
        {totalCount > 0 && (
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">{progressPercent}% completado</p>
          </div>
        )}

        {/* Add item form */}
        <form onSubmit={handleAddItem} className="flex gap-2">
          <Input
            placeholder="Añadir artículo..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={!newItemName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {/* Items */}
        {totalCount === 0 ? (
          <div className="py-12 text-center border rounded-xl border-dashed">
            <ShoppingCart className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Lista vacía</p>
            <p className="text-xs text-muted-foreground">Añade artículos con el campo de arriba</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Pending items */}
            {uncheckedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:shadow-sm"
              >
                <Checkbox
                  checked={false}
                  onCheckedChange={() => handleToggleItem(selectedList.$id!, item.id)}
                  className="h-5 w-5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  {item.unit && (
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} {item.unit}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemoveItem(selectedList.$id!, item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {/* Checked items */}
            {checkedItems.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-3 pb-1 px-1">
                  <Check className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Completados ({checkedItems.length})
                  </span>
                </div>
                {checkedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-3.5 transition-all"
                  >
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => handleToggleItem(selectedList.$id!, item.id)}
                      className="h-5 w-5"
                    />
                    <p className="flex-1 text-sm text-muted-foreground line-through truncate">
                      {item.name}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveItem(selectedList.$id!, item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── MAIN LIST VIEW ──
  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" />
            Compras
          </h1>
          <p className="text-sm text-muted-foreground">Organiza tus compras keto</p>
        </div>
        <Button onClick={() => setNewListDialogOpen(true)} className="shadow-sm">
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Quick Add by Category */}
      {!isLoading && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            Añadido Rápido
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {KETO_STAPLES.map((cat) => (
              <Card key={cat.category} className="overflow-hidden border-border/50">
                <CardHeader className={cn('p-3 pb-2', cat.bgColor)}>
                  <CardTitle className="text-xs flex items-center gap-1.5">
                    <cat.icon className={cn('w-3.5 h-3.5', cat.color)} />
                    <span className={cat.color}>{cat.category}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item) => (
                      <button
                        key={item}
                        onClick={() => handleQuickAdd(item)}
                        className="text-[10px] font-medium bg-background border border-border px-2.5 py-1 rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all active:scale-95"
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Saved Recipe Suggestions */}
      {!isLoading && recipes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Desde tus Recetas
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {recipes.length} guardadas
            </Badge>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-2">
              {recipes.map((recipe) => (
                <Card
                  key={recipe.$id}
                  className="min-w-[200px] overflow-hidden bg-card border-border/50 hover:border-primary/50 transition-all group"
                >
                  <div className="relative h-28 w-full">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="object-cover w-full h-full opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3">
                      <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                        {recipe.title}
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-[10px] gap-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                      onClick={async () => {
                        let targetId = selectedListId
                        if (!targetId && lists.length > 0) {
                          targetId = lists[0].$id!
                          setSelectedListId(targetId)
                        }

                        if (!targetId) {
                          try {
                            const list = await createList(`Compras: ${recipe.title}`)
                            if (list) {
                              targetId = list.$id
                              setSelectedListId(targetId)
                            }
                          } catch {
                            toast.error('Crea una lista primero')
                            return
                          }
                        }

                        if (targetId) {
                          for (const ingredient of recipe.ingredients) {
                            await addItemToList(targetId, {
                              name: ingredient,
                              quantity: 1,
                              unit: '',
                              checked: false,
                            })
                          }
                          toast.success(`Ingredientes de "${recipe.title}" añadidos`)
                        }
                      }}
                    >
                      <Plus className="w-3 h-3" />
                      Añadir ingredientes
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Lists */}
      {!isLoading && lists.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ListChecks />
            </EmptyMedia>
            <EmptyTitle>No hay listas de compras</EmptyTitle>
            <EmptyDescription>
              Crea tu primera lista o usa el añadido rápido arriba.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => setNewListDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Lista
          </Button>
        </Empty>
      )}

      {!isLoading && lists.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            Mis Listas
          </h3>
          {lists.map((list) => {
            const checked = list.items.filter((i) => i.checked).length
            const total = list.items.length
            const progress = total > 0 ? Math.round((checked / total) * 100) : 0
            const isComplete = total > 0 && checked === total

            return (
              <Card
                key={list.$id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md active:scale-[0.99] overflow-hidden',
                  isComplete && 'border-emerald-500/30'
                )}
                onClick={() => setSelectedListId(list.$id!)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        'p-2 rounded-lg shrink-0',
                        isComplete ? 'bg-emerald-500/10' : 'bg-primary/10'
                      )}>
                        {isComplete ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ShoppingCart className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{list.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {total === 0 ? 'Lista vacía' : `${checked}/${total} artículos`}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
                  {total > 0 && (
                    <Progress value={progress} className="h-1.5" />
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* New List Dialog */}
      <Dialog open={newListDialogOpen} onOpenChange={setNewListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Lista de Compras</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateList} className="space-y-4">
            <Input
              placeholder="Nombre (ej: Compras del Lunes)"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewListDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingList || !newListName.trim()}>
                {creatingList ? 'Creando...' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
