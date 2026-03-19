'use client'

import { useState } from 'react'
import { usePantry } from '@/hooks/use-pantry'
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
import { Plus, X, Beef, Droplets, Leaf, Milk, Package, Sparkles, Refrigerator, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { PantryItem } from '@/lib/appwrite'

const categoryConfig: Record<PantryItem['category'], { icon: typeof Beef; label: string; color: string; bgColor: string; bentoBg: string; bentoBorder: string }> = {
  proteína: { icon: Beef, label: 'Proteínas', color: 'text-rose-500', bgColor: 'bg-rose-500/10', bentoBg: 'bg-linear-to-br from-rose-500/5 to-transparent', bentoBorder: 'border-rose-500/20' },
  grasa: { icon: Droplets, label: 'Grasas', color: 'text-amber-500', bgColor: 'bg-amber-500/10', bentoBg: 'bg-linear-to-br from-amber-500/5 to-transparent', bentoBorder: 'border-amber-500/20' },
  vegetal: { icon: Leaf, label: 'Vegetales', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', bentoBg: 'bg-linear-to-br from-emerald-500/5 to-transparent', bentoBorder: 'border-emerald-500/20' },
  lácteo: { icon: Milk, label: 'Lácteos', color: 'text-sky-500', bgColor: 'bg-sky-500/10', bentoBg: 'bg-linear-to-br from-sky-500/5 to-transparent', bentoBorder: 'border-sky-500/20' },
  otro: { icon: Package, label: 'Otros', color: 'text-violet-500', bgColor: 'bg-violet-500/10', bentoBg: 'bg-linear-to-br from-violet-500/5 to-transparent', bentoBorder: 'border-violet-500/20' },
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

    if (items.some((i) => i.name.toLowerCase() === newItemName.trim().toLowerCase())) {
      toast.error('Ya tienes ese ingrediente en la despensa')
      return
    }

    setIsAdding(true)
    try {
      await addItem(newItemName.trim(), newItemCategory)
      toast.success('Añadido exitosamente', {
        description: `${newItemName.trim()} ahora está en tu despensa.`
      })
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
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Immersive Header */}
      <div className="relative flex flex-col items-center justify-center text-center pt-8 pb-4">
        <div className="absolute inset-0 max-w-2xl mx-auto bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center justify-center p-3 rounded-3xl bg-primary/10 mb-2">
            <Refrigerator className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
            Mi Despensa
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-md mx-auto">
            Registra tus ingredientes y deja que la IA cree magia cetogénica.
          </p>
        </div>
      </div>

      {/* Floating Command Bar (UI/UX Pro Max) */}
      <div className="relative z-20 mx-auto w-full max-w-3xl transform transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_40px_-15px_rgba(255,255,255,0.1)] group">
        <div className="absolute -inset-1 rounded-4xl bg-linear-to-r from-primary/30 to-accent/30 opacity-40 blur-lg transition duration-1000 group-hover:opacity-100 group-hover:duration-200" />
        <form 
          onSubmit={handleAddItem} 
          className="relative flex flex-col sm:flex-row items-center bg-card/90 backdrop-blur-2xl rounded-4xl border border-white/10 shadow-2xl overflow-hidden p-2 gap-2"
        >
          <div className="flex flex-1 items-center w-full px-4 text-foreground">
            <Search className="h-5 w-5 text-muted-foreground mr-3" />
            <Input
              placeholder="Ej. Huevos, Aguacate, Pollo..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              disabled={isAdding}
              className="flex-1 border-0 focus-visible:ring-0 text-lg sm:text-xl bg-transparent px-0 placeholder:text-muted-foreground/50 h-14"
            />
          </div>
          <div className="flex w-full sm:w-auto items-center gap-2 pl-4 sm:pl-0 border-t sm:border-t-0 border-white/10 pt-2 sm:pt-0">
            <Select
              value={newItemCategory}
              onValueChange={(v) => setNewItemCategory(v as PantryItem['category'])}
            >
              <SelectTrigger className="w-full sm:w-[150px] border-0 bg-muted/50 focus:ring-0 rounded-2xl h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/10 bg-card/95 backdrop-blur-xl">
                {(Object.entries(categoryConfig) as [PantryItem['category'], typeof categoryConfig['proteína']][]).map(
                  ([key, config]) => (
                    <SelectItem key={key} value={key} className="rounded-xl cursor-pointer">
                      <span className="flex items-center gap-2 font-medium">
                        <config.icon className={cn('h-4 w-4', config.color)} />
                        {config.label}
                      </span>
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Button 
              type="submit" 
              disabled={isAdding || !newItemName.trim()}
              className="w-full sm:w-auto rounded-2xl px-6 h-12 bg-primary text-primary-foreground font-bold shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5 sm:mr-2" />
              <span className="hidden sm:inline">Añadir</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Dynamic Suggestions Carousel */}
      {availableSuggestions.length > 0 && (
        <div className="mx-auto w-full max-w-5xl overflow-hidden pt-4 pb-2">
          <div className="flex overflow-x-auto pb-4 pt-2 px-2 sm:px-4 gap-3 no-scrollbar snap-x mask-fade-edges">
            {availableSuggestions.map((s) => {
              const config = categoryConfig[s.category]
              return (
                <button
                  key={s.name}
                  onClick={() => handleQuickAdd(s.name, s.category)}
                  className="group shrink-0 snap-center rounded-full bg-card/50 backdrop-blur-md border border-white/5 py-2.5 px-6 text-sm font-semibold text-foreground/80 shadow-sm transition-all duration-500 hover:scale-110 hover:bg-card hover:text-foreground hover:border-white/20 hover:shadow-xl active:scale-95 flex items-center gap-2"
                >
                  <config.icon className={cn('h-4 w-4 transition-transform group-hover:scale-125', config.color)} />
                  {s.name}
                  <Plus className="h-3 w-3 opacity-0 -ml-2 transition-all duration-300 group-hover:opacity-100 group-hover:ml-0 text-primary" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Generate Plan Magestic CTA */}
      {items.length >= 3 && (
        <div className="mx-auto w-full max-w-5xl mt-2 mb-4">
          <Link href="/meal-planner">
            <div className="group relative overflow-hidden rounded-4xl border border-primary/20 bg-card p-1 transition-all duration-700 hover:shadow-[0_0_50px_-15px_rgba(var(--primary),0.3)] hover:-translate-y-1 cursor-pointer">
              <div className="absolute inset-0 bg-linear-to-r from-primary/10 via-transparent to-accent/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative flex items-center gap-6 rounded-4xl bg-card/80 backdrop-blur-xl p-6 sm:p-8">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-accent shadow-inner text-white transform transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-1">
                    Cocinar con IA
                  </h3>
                  <p className="text-muted-foreground font-medium text-sm sm:text-base">
                    Tienes <span className="text-primary font-bold">{items.length} ingredientes</span>. Genera un menú cetogénico instantáneo para tu semana basándote en lo que ya tienes.
                  </p>
                </div>
                <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-background/50 text-primary transition-transform duration-500 group-hover:translate-x-2">
                  <span className="text-2xl font-black">→</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Loading Skeleton Bento */}
      {isLoading && (
        <div className="mx-auto w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-4xl bg-card/60" />
          ))}
        </div>
      )}

      {/* Immersive Empty State */}
      {!isLoading && items.length === 0 && (
        <div className="mx-auto w-full max-w-3xl mt-12">
           <div className="relative p-12 text-center rounded-5xl border border-dashed border-white/10 bg-card/30 backdrop-blur-sm">
             <Refrigerator className="mx-auto h-20 w-20 text-muted-foreground/30 mb-6" />
             <h3 className="text-2xl font-extrabold text-foreground mb-3">La despensa está vacía</h3>
             <p className="text-muted-foreground max-w-sm mx-auto">
               Utiliza la barra inteligente de arriba para registrar rápidamente tus proteínas, lácteos y vegetales disponibles.
             </p>
           </div>
        </div>
      )}

      {/* Bento Box Grid para Ingredientes */}
      {!isLoading && items.length > 0 && (
        <div className="mx-auto w-full max-w-7xl">
          <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Tu Inventario</h2>
            <Badge variant="outline" className="text-sm font-semibold rounded-full px-4 py-1.5 border-white/10 bg-card/50 backdrop-blur-md">
              Total: {items.length} items
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(Object.entries(categoryConfig) as [PantryItem['category'], typeof categoryConfig['proteína']][]).map(
              ([categoryKey, config]) => {
                const categoryItems = itemsByCategory[categoryKey]
                if (categoryItems.length === 0) return null

                return (
                  <div 
                    key={categoryKey} 
                    className={cn(
                      "group relative flex flex-col overflow-hidden rounded-4xl border bg-card p-6 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]",
                      config.bentoBorder
                    )}
                  >
                    {/* Glass Decorator Background */}
                    <div className={cn("absolute inset-0 opacity-40 transition-opacity duration-700 group-hover:opacity-100", config.bentoBg)} />
                    
                    <div className="relative z-10 flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-12 w-12 items-center justify-center rounded-3xl shadow-inner", config.bgColor, config.color)}>
                          <config.icon className="h-6 w-6" />
                        </div>
                        <h3 className="font-extrabold tracking-tight text-[1.1rem] text-foreground">
                          {config.label}
                        </h3>
                      </div>
                      <Badge variant="secondary" className="rounded-full bg-background/50 font-black px-3 py-1 border border-white/5 backdrop-blur-xl">
                        {categoryItems.length}
                      </Badge>
                    </div>

                    <div className="relative z-10 flex flex-wrap gap-2 auto-rows-max">
                      {categoryItems.map((item) => (
                        <div
                          key={item.$id}
                          className="group/item flex items-center gap-2 rounded-2xl bg-background/60 backdrop-blur-md border border-white/5 pl-4 pr-1 py-1 text-sm font-semibold text-foreground/90 transition-all duration-300 hover:bg-background hover:shadow-md hover:border-white/10"
                        >
                          <span>{item.name}</span>
                          <button
                            onClick={() => handleRemove(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition-all duration-300 hover:bg-destructive hover:text-destructive-foreground hover:scale-105 active:scale-95"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                  </div>
                )
              }
            )}
          </div>
        </div>
      )}
    </div>
  )
}
