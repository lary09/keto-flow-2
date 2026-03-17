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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Users, Heart, HeartOff, ExternalLink, ShoppingCart, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useMealLogs } from '@/hooks/use-meal-logs'
import { toast } from 'sonner'
import type { MealLog } from '@/lib/appwrite'

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
}

interface RecipeDetail extends Recipe {
  summary?: string
  instructions?: string
  extendedIngredients?: {
    id: number
    original: string
    name: string
    amount: number
    unit: string
    aisle: string
  }[]
  nutrition?: {
    calories: number
    fat: number
    protein: number
    carbs: number
    fiber: number
    netCarbs: number
  }
}

interface RecipeDetailSheetProps {
  recipe: Recipe | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isSaved: boolean
  onToggleSave: () => void
}

export function RecipeDetailSheet({
  recipe,
  open,
  onOpenChange,
  isSaved,
  onToggleSave,
}: RecipeDetailSheetProps) {
  const { user } = useAuth()
  const [detail, setDetail] = useState<RecipeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [addingToMeal, setAddingToMeal] = useState(false)
  const today = new Date().toISOString().split('T')[0]
  const { addMealLog } = useMealLogs(today)

  useEffect(() => {
    if (!recipe || !open) {
      setDetail(null)
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
    if (!recipe || !user) return

    setAddingToMeal(true)
    try {
      const nutrition = detail?.nutrition || recipe
      await addMealLog({
        date: today,
        mealType,
        foodName: recipe.title,
        calories: Math.round(nutrition.calories / recipe.servings),
        fat: Math.round(nutrition.fat / recipe.servings),
        protein: Math.round(nutrition.protein / recipe.servings),
        carbs: Math.round(nutrition.carbs / recipe.servings),
        recipeId: String(recipe.id),
      })
      toast.success(`¡Añadido a ${mealType}!`)
      onOpenChange(false)
    } catch (err) {
      console.error('Error al añadir a la comida:', err)
      toast.error('Error al añadir a la comida')
    } finally {
      setAddingToMeal(false)
    }
  }

  if (!recipe) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl p-0">
        <ScrollArea className="h-full">
          {/* Hero Image */}
          <div className="relative h-48 w-full">
            <Image
              src={recipe.image}
              alt={recipe.title}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <SheetHeader>
                <SheetTitle className="text-left text-xl text-foreground">
                  {recipe.title}
                </SheetTitle>
              </SheetHeader>
            </div>
          </div>

          <div className="p-4">
            {/* Quick Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {recipe.readyInMinutes} min
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {recipe.servings} porciones
              </span>
            </div>

            {/* Nutrition per serving */}
            <div className="mt-4 grid grid-cols-4 gap-2 rounded-lg bg-muted/50 p-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {Math.round(detail?.nutrition?.calories || recipe.calories || 0)}
                </p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-keto-fat">
                  {Math.round(detail?.nutrition?.fat || recipe.fat || 0)}g
                </p>
                <p className="text-xs text-muted-foreground">Grasas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-keto-protein">
                  {Math.round(detail?.nutrition?.protein || recipe.protein || 0)}g
                </p>
                <p className="text-xs text-muted-foreground">Protein</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-keto-carbs">
                  {Math.round(detail?.nutrition?.netCarbs || recipe.netCarbs || 0)}g
                </p>
                <p className="text-xs text-muted-foreground">Carbs Netos</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <Button
                variant={isSaved ? 'default' : 'outline'}
                className="flex-1"
                onClick={onToggleSave}
              >
                {isSaved ? (
                  <>
                    <Heart className="mr-2 h-4 w-4 fill-current" />
                    Guardado
                  </>
                ) : (
                  <>
                    <HeartOff className="mr-2 h-4 w-4" />
                    Guardar
                  </>
                )}
              </Button>
              {detail?.extendedIngredients && (
                <Button variant="outline" className="flex-1">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Añadir a la lista
                </Button>
              )}
            </div>

            {/* Add to Meal */}
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-foreground">Añadir a la comida de hoy:</p>
              <div className="flex flex-wrap gap-2">
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => (
                  <Button
                    key={mealType}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToMeal(mealType)}
                    disabled={addingToMeal}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {mealType === 'breakfast' ? 'Desayuno' : 
                     mealType === 'lunch' ? 'Almuerzo' : 
                     mealType === 'dinner' ? 'Cena' : 'Snack'}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            )}

            {/* Ingredients */}
            {detail?.extendedIngredients && (
              <div className="mt-4">
                <h3 className="mb-3 font-semibold text-foreground">Ingredientes</h3>
                <ul className="space-y-2">
                  {detail.extendedIngredients.map((ingredient) => (
                    <li key={ingredient.id} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="text-foreground">{ingredient.original}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            {detail?.summary && (
              <div className="mt-6">
                <h3 className="mb-3 font-semibold text-foreground">Sobre esta receta</h3>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: detail.summary }}
                />
              </div>
            )}

            {/* Instructions */}
            {detail?.instructions && (
              <div className="mt-6">
                <h3 className="mb-3 font-semibold text-foreground">Instrucciones</h3>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: detail.instructions }}
                />
              </div>
            )}

            {/* Source Link */}
            <div className="mt-6 pb-8">
              <Button variant="link" className="h-auto p-0" asChild>
                <a
                  href={recipe.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver receta completa en {recipe.source || 'Edamam'}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
