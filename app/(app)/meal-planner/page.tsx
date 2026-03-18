'use client'

import { useState, useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/contexts/auth-context'
import { usePantry } from '@/hooks/use-pantry'
import { useMealLogs } from '@/hooks/use-meal-logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Plus, Coffee, Sun, Moon, Apple, Wand2, Sparkles, Refrigerator, RefreshCw } from 'lucide-react'
import { FoodLogDialog } from '@/components/food-log-dialog'
import { PantryDialog } from '@/components/pantry-dialog'
import { MealPlanCard } from '@/components/meal-plan-card'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import type { MealLog } from '@/lib/appwrite'

const mealTypeConfig = {
  breakfast: { icon: Coffee, label: 'Desayuno', shortLabel: 'Des' },
  lunch: { icon: Sun, label: 'Almuerzo', shortLabel: 'Alm' },
  dinner: { icon: Moon, label: 'Cena', shortLabel: 'Cen' },
}

interface PlannedRecipe {
  id: string
  title: string
  image: string
  calories: number
  fat: number
  protein: number
  carbs: number
  readyInMinutes: number
  ingredients: string[]
}

interface DayPlan {
  day: number
  breakfast: PlannedRecipe | null
  lunch: PlannedRecipe | null
  dinner: PlannedRecipe | null
}

export default function MealPlannerPage() {
  const { profile } = useAuth()
  const { items: pantryItems, isLoading: pantryLoading } = usePantry()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [pantryDialogOpen, setPantryDialogOpen] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealLog['mealType']>('breakfast')

  // Auto meal plan state
  const [weekPlan, setWeekPlan] = useState<DayPlan[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  const dateString = format(selectedDate, 'yyyy-MM-dd')
  const { mealsByType, totals, isLoading: logsLoading } = useMealLogs(dateString)

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const selectedDayIndex = weekDays.findIndex((d) => isSameDay(d, selectedDate))

  const goals = {
    calories: profile?.dailyCalorieGoal || 2000,
    fat: profile?.dailyFatGoal || 155,
    protein: profile?.dailyProteinGoal || 100,
    carbs: profile?.dailyCarbGoal || 25,
  }

  const goToPrevWeek = () => {
    const newStart = addDays(weekStart, -7)
    setWeekStart(newStart)
    setSelectedDate(newStart)
    setWeekPlan(null)
    setHasGenerated(false)
  }

  const goToNextWeek = () => {
    const newStart = addDays(weekStart, 7)
    setWeekStart(newStart)
    setSelectedDate(newStart)
    setWeekPlan(null)
    setHasGenerated(false)
  }

  const goToToday = () => {
    const today = new Date()
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }))
    setSelectedDate(today)
  }

  const handleOpenLog = (mealType: MealLog['mealType']) => {
    setSelectedMealType(mealType)
    setLogDialogOpen(true)
  }

  const handleGeneratePlan = async () => {
    if (pantryItems.length < 2) {
      toast.error('Añade al menos 2 ingredientes a tu despensa')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/meal-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: pantryItems.map((i) => i.name),
        }),
      })

      const data = await response.json()

      if (response.status === 429) {
        toast.error(data.error || 'Límite de búsqueda alcanzado. Espera 1 minuto.')
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate plan')
      }

      setWeekPlan(data.plan)
      setHasGenerated(true)
      toast.success('¡Plan semanal generado! 🎉')
    } catch (error) {
      console.error('Error generating plan:', error)
      toast.error('Error al generar el plan. Inténtalo de nuevo.')
    } finally {
      setIsGenerating(false)
    }
  }

  const isToday = isSameDay(selectedDate, new Date())
  const currentDayPlan = weekPlan?.[selectedDayIndex] || null

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planificador</h1>
          <p className="text-sm text-muted-foreground">Tu plan semanal keto automático</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Hoy
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => setPantryDialogOpen(true)}>
            <Wand2 className="w-4 h-4 mr-2" />
            Generar con Despensa
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPrevWeek}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </span>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week Days Carousel */}
      <ScrollArea className="w-full whitespace-nowrap pb-2">
        <div className="flex gap-2">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate)
            const isDayToday = isSameDay(day, new Date())
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'flex min-w-[56px] flex-col items-center rounded-xl border-2 px-3 py-2 transition-colors',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/50',
                  isDayToday && !isSelected && 'border-primary/30'
                )}
              >
                <span className={cn('text-xs', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {format(day, 'EEE', { locale: es })}
                </span>
                <span className={cn('text-lg font-bold', !isSelected && 'text-foreground')}>
                  {format(day, 'd')}
                </span>
                {isDayToday && (
                  <span className={cn('h-1 w-1 rounded-full', isSelected ? 'bg-primary-foreground' : 'bg-primary')} />
                )}
              </button>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Generate Plan Button */}
      {!pantryLoading && pantryItems.length >= 2 && (
        <Button
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-bold py-6 rounded-xl shadow-lg transition-all active:scale-[0.98]"
          size="lg"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
              Generando plan...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              {hasGenerated ? 'Regenerar Plan Semanal' : '✨ Generar Mi Plan Semanal'}
            </>
          )}
        </Button>
      )}

      {/* Empty Pantry State */}
      {!pantryLoading && pantryItems.length < 2 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <Refrigerator className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Añade ingredientes primero</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ve a tu despensa y registra lo que tienes disponible para generar un plan personalizado.
              </p>
            </div>
            <Button asChild>
              <Link href="/pantry">
                <Plus className="mr-2 h-4 w-4" />
                Ir a Mi Despensa
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton while generating */}
      {isGenerating && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Generated Plan for Selected Day */}
      {!isGenerating && currentDayPlan && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isToday ? 'Hoy' : format(selectedDate, 'EEEE', { locale: es })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">Plan Auto</Badge>
          </div>

          {/* Daily macro estimate */}
          {currentDayPlan.breakfast && currentDayPlan.lunch && currentDayPlan.dinner && (
            <div className="grid grid-cols-4 gap-2 rounded-lg bg-muted/50 p-3">
              <div className="text-center">
                <p className="text-sm font-semibold text-keto-fat">
                  {(currentDayPlan.breakfast?.fat || 0) + (currentDayPlan.lunch?.fat || 0) + (currentDayPlan.dinner?.fat || 0)}g
                </p>
                <p className="text-xs text-muted-foreground">Grasas</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-keto-protein">
                  {(currentDayPlan.breakfast?.protein || 0) + (currentDayPlan.lunch?.protein || 0) + (currentDayPlan.dinner?.protein || 0)}g
                </p>
                <p className="text-xs text-muted-foreground">Prots</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-keto-carbs">
                  {(currentDayPlan.breakfast?.carbs || 0) + (currentDayPlan.lunch?.carbs || 0) + (currentDayPlan.dinner?.carbs || 0)}g
                </p>
                <p className="text-xs text-muted-foreground">Carbs</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-keto-calories">
                  {(currentDayPlan.breakfast?.calories || 0) + (currentDayPlan.lunch?.calories || 0) + (currentDayPlan.dinner?.calories || 0)}
                </p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
            </div>
          )}

          {/* Meal cards */}
          <div className="space-y-3">
            <MealPlanCard recipe={currentDayPlan.breakfast} mealLabel="☀️ Desayuno" />
            <MealPlanCard recipe={currentDayPlan.lunch} mealLabel="🌤️ Almuerzo" />
            <MealPlanCard recipe={currentDayPlan.dinner} mealLabel="🌙 Cena" />
          </div>
        </div>
      )}

      {/* Manual Logged Meals (always visible) */}
      {!logsLoading && (mealsByType.breakfast.length > 0 || mealsByType.lunch.length > 0 || mealsByType.dinner.length > 0 || mealsByType.snack.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
            Registros del día
          </h3>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
            const meals = mealsByType[mealType]
            if (meals.length === 0) return null
            const config = mealType === 'snack' 
              ? { icon: Plus, label: 'Snack' }
              : mealTypeConfig[mealType]

            return (
              <Card key={mealType}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <config.icon className="h-4 w-4 text-primary" />
                    {config.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {meals.map((meal) => (
                      <div key={meal.$id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                        <span className="truncate text-sm text-foreground">{meal.foodName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{Math.round(meal.calories)} kcal</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Manual Entry Button */}
      <div className="flex gap-2">
        {(['breakfast', 'lunch', 'dinner'] as const).map((mt) => {
          const config = mealTypeConfig[mt]
          return (
            <Button
              key={mt}
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => handleOpenLog(mt)}
            >
              <config.icon className="mr-1 h-3 w-3" />
              {config.shortLabel}
            </Button>
          )
        })}
      </div>

      {/* Food Log Dialog */}
      <FoodLogDialog
        open={logDialogOpen}
        onOpenChange={setLogDialogOpen}
        mealType={selectedMealType}
        date={dateString}
      />

      {/* Pantry Dialog */}
      <PantryDialog
        open={pantryDialogOpen}
        onOpenChange={setPantryDialogOpen}
        date={dateString}
      />
    </div>
  )
}
