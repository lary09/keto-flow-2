'use client'

import { useState } from 'react'
import { usePantry } from '@/hooks/use-pantry'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty'
import { Plus, X, Beef, Droplets, Leaf, Milk, Package, Sparkles, Refrigerator } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { PantryItem } from '@/lib/appwrite'

const categoryConfig: Record<PantryItem['category'], { icon: typeof Beef; label: string; color: string; bgColor: string }> = {
  proteína: { icon: Beef, label: 'Proteínas', color: 'text-rose-600 dark:text-rose-400', bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
  grasa: { icon: Droplets, label: 'Grasas', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  vegetal: { icon: Leaf, label: 'Vegetales', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  lácteo: { icon: Milk, label: 'Lácteos', color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-100 dark:bg-sky-900/30' },
  otro: { icon: Package, label: 'Otros', color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
}

const quickSuggestions: { name: string; category: PantryItem['category'] }[] = [
  { name: 'Huevos', category: 'proteína' },
  { name: 'Pollo', category: 'proteína' },
  { name: 'Salmón', category: 'proteína' },
  { name: 'Carne molida', category: 'proteína' },
  { name: 'Tocino', category: 'proteína' },
  { name: 'Aguacate', category: 'grasa' },
  { name: 'Aceite de oliva', category: 'grasa' },
  { name: 'Mantequilla', category: 'grasa' },
  { name: 'Nueces', category: 'grasa' },
  { name: 'Almendras', category: 'grasa' },
  { name: 'Brócoli', category: 'vegetal' },
  { name: 'Espinacas', category: 'vegetal' },
  { name: 'Coliflor', category: 'vegetal' },
  { name: 'Calabacín', category: 'vegetal' },
  { name: 'Espárragos', category: 'vegetal' },
  { name: 'Queso crema', category: 'lácteo' },
  { name: 'Queso cheddar', category: 'lácteo' },
  { name: 'Crema de leche', category: 'lácteo' },
  { name: 'Aceitunas', category: 'otro' },
  { name: 'Ajo', category: 'otro' },
  { name: 'Cebolla', category: 'otro' },
]

export default function PantryPage() {
  const { items, itemsByCategory, isLoading, addItem, removeItem } = usePantry()
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState<PantryItem['category']>('proteína')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim()) return

    // Check for duplicate
    if (items.some((i) => i.name.toLowerCase() === newItemName.trim().toLowerCase())) {
      toast.error('Ya tienes ese ingrediente en la despensa')
      return
    }

    setIsAdding(true)
    try {
      await addItem(newItemName.trim(), newItemCategory)
      toast.success(`${newItemName.trim()} añadido a la despensa`)
      setNewItemName('')
    } catch {
      toast.error('Error al añadir el ingrediente')
    } finally {
      setIsAdding(false)
    }
  }

  const handleQuickAdd = async (name: string, category: PantryItem['category']) => {
    if (items.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Ya tienes ese ingrediente')
      return
    }
    try {
      await addItem(name, category)
      toast.success(`${name} añadido`)
    } catch {
      toast.error('Error al añadir')
    }
  }

  const handleRemove = async (item: PantryItem) => {
    try {
      await removeItem(item.$id)
      toast.success(`${item.name} eliminado`)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const availableSuggestions = quickSuggestions.filter(
    (s) => !items.some((i) => i.name.toLowerCase() === s.name.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Refrigerator className="h-6 w-6 text-primary" />
            Mi Despensa
          </h1>
          <p className="text-sm text-muted-foreground">
            Registra lo que tienes y genera tu plan semanal
          </p>
        </div>
        {items.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {items.length} items
          </Badge>
        )}
      </div>

      {/* Generate Plan CTA */}
      {items.length >= 3 && (
        <Link href="/meal-planner">
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all cursor-pointer group">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-xl bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">Generar Plan Semanal</p>
                <p className="text-xs text-muted-foreground">
                  Con tus {items.length} ingredientes, creamos 7 días de comidas keto
                </p>
              </div>
              <span className="text-primary text-xl">→</span>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Add Item Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Añadir Ingrediente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddItem} className="flex gap-2">
            <Input
              placeholder="ej. Huevos, Pollo, Brócoli..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              disabled={isAdding}
              className="flex-1"
            />
            <Select
              value={newItemCategory}
              onValueChange={(v) => setNewItemCategory(v as PantryItem['category'])}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(categoryConfig) as [PantryItem['category'], typeof categoryConfig['proteína']][]).map(
                  ([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <config.icon className={cn('h-3 w-3', config.color)} />
                        {config.label}
                      </span>
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Button type="submit" size="icon" disabled={isAdding || !newItemName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Quick Suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            Sugerencias Keto — toca para añadir
          </h3>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((s) => {
              const config = categoryConfig[s.category]
              return (
                <button
                  key={s.name}
                  onClick={() => handleQuickAdd(s.name, s.category)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                    'border-border hover:border-primary/50 hover:bg-primary/5 active:scale-95'
                  )}
                >
                  <config.icon className={cn('h-3 w-3', config.color)} />
                  {s.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Refrigerator />
            </EmptyMedia>
            <EmptyTitle>Tu despensa está vacía</EmptyTitle>
            <EmptyDescription>
              Añade los ingredientes que tienes disponibles para generar tu plan semanal de comidas keto automáticamente.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Pantry Items by Category */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-4">
          {(Object.entries(categoryConfig) as [PantryItem['category'], typeof categoryConfig['proteína']][]).map(
            ([categoryKey, config]) => {
              const categoryItems = itemsByCategory[categoryKey]
              if (categoryItems.length === 0) return null

              return (
                <Card key={categoryKey} className="overflow-hidden">
                  <CardHeader className={cn('pb-2', config.bgColor)}>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <config.icon className={cn('h-4 w-4', config.color)} />
                      <span>{config.label}</span>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {categoryItems.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3">
                    <div className="flex flex-wrap gap-2">
                      {categoryItems.map((item) => (
                        <span
                          key={item.$id}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium',
                            'bg-card border-border group'
                          )}
                        >
                          {item.name}
                          <button
                            onClick={() => handleRemove(item)}
                            className="ml-0.5 rounded-full p-0.5 opacity-40 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            }
          )}
        </div>
      )}
    </div>
  )
}
