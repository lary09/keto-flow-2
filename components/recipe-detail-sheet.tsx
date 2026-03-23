'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Users, Heart, HeartOff, ShoppingCart, Plus, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useMealLogs } from '@/hooks/use-meal-logs'
import { toast } from 'sonner'
import type { MealLog } from '@/lib/appwrite'
import { cn } from '@/lib/utils'

interface Recipe {
  id: string | number
  title: string
  image: string
  readyInMinutes?: number
  servings: number
  calories: number
  fat: number
  protein: number
  carbs: number
  netCarbs: number
  url?: string
  source?: string
  instructions?: string[]
  ingredientLines?: string[]
  ingredients?: string[]
}

interface RecipeDetailSheetProps {
  recipe: Recipe | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isSaved: boolean
  onToggleSave: () => void
  date?: string
}

export function RecipeDetailSheet({
  recipe,
  open,
  onOpenChange,
  isSaved,
  onToggleSave,
  date,
}: RecipeDetailSheetProps) {
  const { user } = useAuth()
  const [detail, setDetail] = useState<Recipe | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [addingToMeal, setAddingToMeal] = useState(false)
  const [imageSrc, setImageSrc] = useState<string>('/placeholder.jpg')
  const targetDate = date || new Date().toISOString().split('T')[0]
  const { addMealLog } = useMealLogs(targetDate)

  useEffect(() => {
    if (!recipe || !open) {
      setDetail(null)
      return
    }

    setImageSrc(recipe.image || '/placeholder.jpg')

    if (String(recipe.id).startsWith('ai_')) {
      setIsLoading(false)
      setDetail(recipe)
      return
    }

    const fetchDetail = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/recipes/${recipe.id}`)
        if (response.ok) {
          const data = await response.json()
          setDetail(data)
        }
      } catch (err) {
        console.error('Failed to fetch recipe detail:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDetail()
  }, [recipe, open])

  const handleAddToMeal = async (mealType: MealLog['mealType']) => {
    if (!recipe || !user) {
      if (!user) toast.error('Inicia sesión para registrar comidas.')
      return
    }

    setAddingToMeal(true)
    try {
      const data = detail || recipe
      await addMealLog({
        date: targetDate,
        mealType,
        foodName: recipe.title,
        calories: Math.round(data.calories),
        fat: Math.round(data.fat),
        protein: Math.round(data.protein),
        carbs: Math.round(data.carbs),
        recipeId: String(recipe.id),
      })
      toast.success(`¡Disfruta tu platillo! Añadido a ${mealType}`)
      onOpenChange(false)
    } catch (err) {
      toast.error('Error al registrar esta comida.')
    } finally {
      setAddingToMeal(false)
    }
  }

  if (!recipe) return null
  const data = detail || recipe

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 overflow-hidden bg-background sm:max-w-xl sm:mx-auto">
        <ScrollArea className="h-full">
          <div className="pb-[calc(4rem+env(safe-area-inset-bottom))]">
            
            {/* Hero Section Pro Max */}
            <div className="relative h-72 w-full">
              <Image
                src={imageSrc}
                alt={data.title}
                fill
                className="object-cover"
                priority
                onError={() => setImageSrc('/placeholder.jpg')}
              />
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
              
              <div className="absolute top-4 right-4 flex gap-2">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="rounded-full bg-background/50 backdrop-blur-md hover:bg-background/80"
                  onClick={onToggleSave}
                >
                  <Heart className={cn("h-5 w-5 transition-colors", isSaved ? "fill-primary text-primary" : "text-foreground")} />
                </Button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6">
                <SheetHeader>
                  <SheetTitle className="text-left text-3xl font-black tracking-tight text-foreground leading-tight">
                    {recipe.title}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-3 flex items-center gap-4 text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5 bg-background/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <Clock className="h-4 w-4 text-primary" />
                    {data.readyInMinutes || recipe.readyInMinutes || 0} min
                  </span>
                  <span className="flex items-center gap-1.5 bg-background/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
                    <Users className="h-4 w-4 text-primary" />
                    {data.servings || recipe.servings || 2} porciones
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 pt-2 pb-6 space-y-8">
              
              {/* Nutrition Bento */}
              <div>
                <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase mb-3">Macros (por ración)</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-border/50 shadow-xs">
                    <span className="text-xl font-bold text-foreground leading-none">{Math.round(data.calories || 0)}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Kcal</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-keto-fat/10 border border-keto-fat/20 shadow-xs">
                    <span className="text-xl font-bold text-keto-fat leading-none">{Math.round(data.fat || 0)}g</span>
                    <span className="text-[10px] uppercase font-bold text-keto-fat/80 mt-1">Grasa</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-keto-protein/10 border border-keto-protein/20 shadow-xs">
                    <span className="text-xl font-bold text-keto-protein leading-none">{Math.round(data.protein || 0)}g</span>
                    <span className="text-[10px] uppercase font-bold text-keto-protein/80 mt-1">Prot</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-keto-carbs/10 border border-keto-carbs/20 shadow-xs">
                    <span className="text-xl font-bold text-keto-carbs leading-none">{Math.round(data.netCarbs || data.carbs || 0)}g</span>
                    <span className="text-[10px] uppercase font-bold text-keto-carbs/80 mt-1">Netos</span>
                  </div>
                </div>
              </div>

              {/* Add to Meal - PWA Touch Ergonomics */}
              <div className="p-5 rounded-3xl bg-surface/40 border border-border/50 backdrop-blur-sm">
                <p className="text-sm font-bold text-foreground mb-4">
                  Registrar hoy en: <span className="text-primary">{targetDate.split('-').reverse().join('/')}</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => (
                    <Button
                      key={mealType}
                      variant="secondary"
                      className="h-12 rounded-xl font-bold justify-start px-4 transition-all hover:bg-primary hover:text-primary-foreground"
                      onClick={() => handleAddToMeal(mealType)}
                      disabled={addingToMeal}
                    >
                      <Plus className="mr-2 h-4 w-4 opacity-70" />
                      {mealType === 'breakfast' ? 'Desayuno' : 
                       mealType === 'lunch' ? 'Almuerzo' : 
                       mealType === 'dinner' ? 'Cena' : 'Snack'}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/50" />

              {/* Loading State */}
              {isLoading && (
                <div className="space-y-4 px-2">
                  <Skeleton className="h-4 w-full rounded-full" />
                  <Skeleton className="h-4 w-3/4 rounded-full" />
                  <Skeleton className="h-4 w-full rounded-full" />
                </div>
              )}

              {/* Premium Ingredients List */}
              {(data.ingredientLines || data.ingredients) && (
                <div className="mt-4">
                  <h3 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
                    Ingredientes
                  </h3>
                  <ul className="space-y-3">
                    {(data.ingredientLines || data.ingredients)?.map((line: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors">
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm font-medium leading-relaxed text-foreground/90">{line}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full mt-4 h-12 rounded-xl font-bold border-primary/20 hover:bg-primary/10 text-primary">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Añadir todo a la Lista de Compras
                  </Button>
                </div>
              )}

              {/* Culinary Instructions */}
              {data.instructions && data.instructions.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-black text-foreground mb-6">Preparación</h3>
                  <div className="space-y-8">
                    {data.instructions.map((step, idx) => (
                      <div key={idx} className="flex gap-4 relative">
                        <div className="flex flex-col items-center">
                          <span className="flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-black text-sm ring-4 ring-background z-10">
                            {idx + 1}
                          </span>
                          {idx !== data.instructions!.length - 1 && (
                            <div className="absolute top-8 -bottom-8 left-4 w-px bg-border/50 -translate-x-1/2" />
                          )}
                        </div>
                        <p className="text-foreground/90 leading-relaxed font-medium pt-1 pb-2">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
