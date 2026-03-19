'use client'

import { useState } from 'react'
import { useShoppingLists } from '@/hooks/use-shopping-lists'
import { useSavedRecipes } from '@/hooks/use-saved-recipes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
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

const KETO_STAPLES = [
  {
    category: 'Grasas',
    icon: Droplets,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    items: ['Aguacate', 'Aceite Oliva', 'Mantequilla', 'Nueces', 'Coco'],
  },
  {
    category: 'Proteínas',
    icon: Beef,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    items: ['Huevos', 'Pollo', 'Salmón', 'Carne Picada', 'Tocino'],
  },
  {
    category: 'Vegetales',
    icon: Leaf,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    items: ['Espinacas', 'Brócoli', 'Coliflor', 'Espárragos', 'Calabacín'],
  },
  {
    category: 'Snacks',
    icon: Apple,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    items: ['Quesos', 'Almendras', 'Aceitunas', 'Pipas'],
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

  // ── LIST DETAIL VIEW (Apple Reminders Style) ──
  if (selectedList) {
    const uncheckedItems = selectedList.items.filter((i) => !i.checked)
    const checkedItems = selectedList.items.filter((i) => i.checked)

    return (
      <div className="flex flex-col min-h-screen pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-background">
        {/* iOS Native Header */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" className="shrink-0 -ml-2 text-primary" onClick={() => setSelectedListId(null)}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-bold text-foreground truncate mx-4 flex-1 text-center">{selectedList.name}</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 -mr-2 text-primary">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl border-border/50 shadow-xl">
              <DropdownMenuItem
                onClick={() => handleDeleteList(selectedList.$id!)}
                className="text-destructive font-semibold p-3"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar Lista
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-6">
          
          <div className="px-2">
            <h2 className="text-3xl font-black text-foreground">{selectedList.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <Progress value={progressPercent} className="h-2 flex-1 max-w-[200px]" />
              <span className="text-xs font-bold text-muted-foreground">{checkedCount} / {totalCount} listos</span>
            </div>
          </div>

          <form onSubmit={handleAddItem} className="flex gap-2 bg-card/50 backdrop-blur-xl border border-border/50 p-2 rounded-2xl ring-offset-background focus-within:ring-2 focus-within:ring-primary shadow-sm transition-all mx-2">
            <Input
              placeholder="Añadir artículo..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 border-0 bg-transparent text-base h-12 focus-visible:ring-0 px-3"
            />
            <Button type="submit" size="icon" disabled={!newItemName.trim()} className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90">
              <Plus className="h-5 w-5" />
            </Button>
          </form>

          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center opacity-70">
              <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-bold text-foreground">Lista Perfectamente Vacía</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">Empieza añadiendo tus ingredientes keto favoritos arriba.</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Unchecked Items List */}
              {uncheckedItems.length > 0 && (
                <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-sm mx-2">
                  {uncheckedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-4 p-4 pl-3 group transition-colors focus-within:bg-muted/30",
                        idx !== uncheckedItems.length - 1 && "border-b border-border/50"
                      )}
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => handleToggleItem(selectedList.$id!, item.id)}
                        className="h-6 w-6 rounded-full border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-300 ml-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-foreground truncate leading-tight">{item.name}</p>
                        {item.unit && (
                          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                            {item.quantity} {item.unit}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        onClick={() => handleRemoveItem(selectedList.$id!, item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Checked Items List */}
              {checkedItems.length > 0 && (
                <div className="mx-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    Completados
                  </h3>
                  <div className="bg-card/30 backdrop-blur-xl border border-border/30 rounded-3xl overflow-hidden shadow-sm">
                    {checkedItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-4 p-4 pl-3 opacity-60 transition-colors",
                          idx !== checkedItems.length - 1 && "border-b border-border/30"
                        )}
                      >
                        <Checkbox
                          checked={true}
                          onCheckedChange={() => handleToggleItem(selectedList.$id!, item.id)}
                          className="h-6 w-6 rounded-full border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary ml-1"
                        />
                        <p className="flex-1 text-base font-medium text-muted-foreground line-through truncate leading-tight">
                          {item.name}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground rounded-full"
                          onClick={() => handleRemoveItem(selectedList.$id!, item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── MAIN LIST VIEW (Apple Health Bento Style) ──
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-black text-foreground">Compras</h1>
        </div>
        <Button onClick={() => setNewListDialogOpen(true)} className="h-10 rounded-full px-5 font-bold shadow-sm shadow-primary/20 active:scale-95 transition-all">
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva Lista
        </Button>
      </header>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-3xl" />
          ))}
        </div>
      )}

      {/* ── SAVED LISTS (PRO MAX CARDS) ── */}
      {!isLoading && lists.length === 0 && (
        <section className="bg-card/40 border border-dashed border-border/80 rounded-4xl p-10 flex flex-col items-center justify-center text-center mt-2">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
            <ListChecks className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">Ninguna Lista</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-8 font-medium">
            Prepara tu visita al supermercado. Crea una lista de compras para llevar el control.
          </p>
          <Button onClick={() => setNewListDialogOpen(true)} className="h-14 px-8 rounded-2xl font-black text-base shadow-sm active:scale-95 transition-all">
            <Plus className="mr-2 h-5 w-5" />
            Empezar Lista
          </Button>
        </section>
      )}

      {!isLoading && lists.length > 0 && (
        <section className="space-y-3">
          {lists.map((list) => {
            const checked = list.items.filter((i) => i.checked).length
            const total = list.items.length
            const progress = total > 0 ? Math.round((checked / total) * 100) : 0
            const isComplete = total > 0 && checked === total

            return (
              <div
                key={list.$id}
                onClick={() => setSelectedListId(list.$id!)}
                className={cn(
                  'bg-card/60 backdrop-blur-xl border rounded-4xl p-5 cursor-pointer transition-all active:scale-[0.98] shadow-sm relative overflow-hidden group',
                  isComplete ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/60 hover:border-primary/40 focus-within:border-primary'
                )}
              >
                {/* Background Decorator */}
                <div className={cn("absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full transition-transform group-hover:scale-150 duration-700", isComplete ? 'bg-emerald-500' : 'bg-primary')} />
                
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn(
                      'p-3 rounded-2xl shrink-0 shadow-inner',
                      isComplete ? 'bg-emerald-500 text-primary-foreground' : 'bg-primary/10 text-primary'
                    )}>
                      {isComplete ? <Check className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-foreground truncate leading-tight">{list.name}</p>
                      <p className="text-sm font-semibold mt-0.5 text-muted-foreground">
                        {total === 0 ? 'Vacía' : `${checked}/${total} comprados`}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground rounded-full hover:bg-background/80">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl border-border/50 shadow-xl">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteList(list.$id!)
                        }}
                        className="text-destructive font-semibold p-3"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar Lista
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {total > 0 && (
                  <div className="relative z-10">
                    <Progress value={progress} className={cn("h-2 rounded-full", isComplete && "[&>div]:bg-emerald-500")} />
                  </div>
                )}
              </div>
            )
          })}
        </section>
      )}

      {/* ── QUICK ADD (BENTO GRID) ── */}
      {!isLoading && (
        <section className="space-y-4 py-2">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Sugerencias Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {KETO_STAPLES.map((cat) => (
              <div key={cat.category} className={cn("rounded-3xl border shadow-sm overflow-hidden flex flex-col h-full bg-card/40 backdrop-blur-md transition-all hover:shadow-md", cat.borderColor)}>
                <div className={cn('p-3 flex items-center gap-2 font-black uppercase tracking-widest text-[10px]', cat.bgColor, cat.color)}>
                  <cat.icon className="w-4 h-4" />
                  {cat.category}
                </div>
                <div className="p-3 py-4 flex flex-wrap gap-2 content-start flex-1">
                  {cat.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleQuickAdd(item)}
                      className="text-[11px] font-bold bg-background shadow-xs border border-border px-3 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-primary/20 transition-all active:scale-95"
                    >
                      + {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── SAVED RECIPES INGREDIENTS EXPORTER ── */}
      {!isLoading && recipes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
              Exportar de Recetas
            </h3>
            <Badge variant="outline" className="text-xs font-bold border-border/50">
              {recipes.length} guardadas
            </Badge>
          </div>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-4 px-1">
              {recipes.map((recipe) => (
                <div
                  key={recipe.$id}
                  className="min-w-[220px] max-w-[220px] rounded-3xl overflow-hidden bg-card/50 backdrop-blur-xl border border-border/60 hover:border-primary/40 transition-all shadow-sm group flex flex-col"
                >
                  <div className="relative h-32 w-full overflow-hidden">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/40 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-sm font-black text-foreground line-clamp-2 leading-tight drop-shadow-md">
                        {recipe.title}
                      </p>
                    </div>
                  </div>
                  <div className="p-3">
                    <Button
                      variant="outline"
                      className="w-full h-10 rounded-xl font-bold text-xs gap-2 border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all active:scale-95 bg-background shadow-xs"
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
                          toast.success(`Ingredientes de "${recipe.title}" añadidos a tu compra`)
                        }
                      }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Añadir a lista
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>
        </section>
      )}

      {/* ── NEW LIST DIALOG ── */}
      <Dialog open={newListDialogOpen} onOpenChange={setNewListDialogOpen}>
        <DialogContent className="rounded-4xl sm:rounded-4xl p-6 border-border/50 shadow-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-2xl font-black">Tu Nueva Lista</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateList} className="space-y-6">
            <Input
              placeholder="Nombre (ej: Súper Lunes)"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              autoFocus
              className="h-14 font-bold text-base bg-muted/50 border-0 rounded-2xl px-4 focus-visible:ring-2 focus-visible:ring-primary"
            />
            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setNewListDialogOpen(false)} className="h-12 rounded-xl font-bold flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingList || !newListName.trim()} className="h-12 rounded-xl font-bold flex-1 shadow-md shadow-primary/20">
                {creatingList ? 'Creando...' : 'Crear Ahora'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
