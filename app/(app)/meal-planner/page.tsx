'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/contexts/auth-context'
import { usePantry } from '@/hooks/use-pantry'
import { useMealLogs } from '@/hooks/use-meal-logs'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Plus, Coffee, Sun, Moon, Wand2, Sparkles, RefreshCw, CalendarDays, Flame, Beef, Activity, Utensils } from 'lucide-react'
import { FoodLogDialog } from '@/components/food-log-dialog'
import { PantryDialog } from '@/components/pantry-dialog'
import { MealPlanCard } from '@/components/meal-plan-card'
import { RecipeDetailSheet } from '@/components/recipe-detail-sheet'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import type { MealLog } from '@/lib/appwrite'

const mealTypeConfig = {
  breakfast: { icon: Coffee, label: 'Desayuno', shortLabel: 'Des', bg: 'bg-amber-500/10', color: 'text-amber-500' },
  lunch: { icon: Sun, label: 'Almuerzo', shortLabel: 'Alm', bg: 'bg-sky-500/10', color: 'text-sky-500' },
  dinner: { icon: Moon, label: 'Cena', shortLabel: 'Cen', bg: 'bg-indigo-500/10', color: 'text-indigo-500' },
  snack: { icon: Plus, label: 'Snack', shortLabel: 'Snack', bg: 'bg-emerald-500/10', color: 'text-emerald-500' },
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
  const [selectedRecipe, setSelectedRecipe] = useState<PlannedRecipe | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Auto meal plan state
  const [weekPlan, setWeekPlan] = useState<DayPlan[] | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('keto-flow-week-plan')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.plan) {
           setWeekPlan(parsed.plan)
           setHasGenerated(true)
        }
      } catch (e) {
        console.error("Error reading saved plan", e)
      }
    }
  }, [])

  const dateString = format(selectedDate, 'yyyy-MM-dd')
  const { mealsByType, isLoading: logsLoading } = useMealLogs(dateString)

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
          goals,
          days: 7,
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
      localStorage.setItem('keto-flow-week-plan', JSON.stringify({ plan: data.plan, generatedAt: new Date().toISOString() }))
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
  const anyManualLogs = !logsLoading && (mealsByType.breakfast.length > 0 || mealsByType.lunch.length > 0 || mealsByType.dinner.length > 0 || mealsByType.snack.length > 0)

  // Calcule current plan totals
  const pFat = (currentDayPlan?.breakfast?.fat || 0) + (currentDayPlan?.lunch?.fat || 0) + (currentDayPlan?.dinner?.fat || 0)
  const pPro = (currentDayPlan?.breakfast?.protein || 0) + (currentDayPlan?.lunch?.protein || 0) + (currentDayPlan?.dinner?.protein || 0)
  const pCar = (currentDayPlan?.breakfast?.carbs || 0) + (currentDayPlan?.lunch?.carbs || 0) + (currentDayPlan?.dinner?.carbs || 0)
  const pKcal = (currentDayPlan?.breakfast?.calories || 0) + (currentDayPlan?.lunch?.calories || 0) + (currentDayPlan?.dinner?.calories || 0)

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      
      {/* ─── NATIVE HEADER ─── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground">Planificador</h1>
        </div>
        <div className="flex items-center gap-2">
          {!pantryLoading && pantryItems.length >= 2 && (
            <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full font-bold px-4" onClick={() => setPantryDialogOpen(true)}>
              <Wand2 className="w-4 h-4 mr-2" />
              IA Chef
            </Button>
          )}
        </div>
      </header>

      {/* ─── WEEK NAVIGATION (APPLE CALENDAR STYLE) ─── */}
      <section className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4 px-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goToPrevWeek}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm font-bold text-foreground">
            {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goToNextWeek}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2.5 pb-2 px-1">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate)
              const isDayToday = isSameDay(day, new Date())
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'relative flex min-w-14 flex-col items-center justify-center rounded-2xl p-3 transition-all active:scale-95 duration-200',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'bg-transparent text-foreground hover:bg-muted/60',
                    isDayToday && !isSelected && 'text-primary'
                  )}
                >
                  <span className={cn('text-[10px] font-black uppercase tracking-widest', isSelected ? 'text-primary-foreground/90' : 'text-muted-foreground')}>
                    {format(day, 'EEE', { locale: es })}
                  </span>
                  <span className={cn('text-2xl font-black leading-none mt-1', isDayToday && !isSelected && 'text-primary')}>
                    {format(day, 'd')}
                  </span>
                  {isDayToday && !isSelected && (
                    <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </section>

      {/* ─── ACTION BLOCKS ─── */}
      {!pantryLoading && pantryItems.length >= 2 && !isGenerating && !currentDayPlan && (
        <section>
          <Button
            onClick={handleGeneratePlan}
            className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base rounded-3xl shadow-xl shadow-primary/20 transition-all active:scale-[0.98] border border-primary/20"
          >
            <Sparkles className="mr-2 h-6 w-6" />
            {hasGenerated ? 'Reescribir Menú Semanal' : 'Generar Menú Semanal Mágico'}
          </Button>
        </section>
      )}

      {/* ─── EMPTY STATE (PREMIUM) ─── */}
      {!pantryLoading && pantryItems.length < 2 && (
        <section className="bg-card/30 border border-dashed border-border/80 rounded-4xl p-10 flex flex-col items-center justify-center text-center mt-4">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl rotate-3 flex items-center justify-center mb-6 shadow-inner">
            <CalendarDays className="h-10 w-10 text-primary -rotate-3" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">Lienzo en Blanco</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-8 font-medium">
            Entra a tu despensa y dile a la IA qué ingredientes tienes para que cree tu menú Michelin Keto completo.
          </p>
          <Button asChild className="h-14 px-8 rounded-2xl font-black text-base shadow-sm active:scale-95 transition-all">
            <Link href="/pantry">
              <Plus className="mr-2 h-5 w-5" />
              Rellenar Despensa
            </Link>
          </Button>
        </section>
      )}

      {/* ─── GENERATING STATE ─── */}
      {isGenerating && (
        <section className="space-y-4 py-8 flex flex-col items-center justify-center text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
            <div className="bg-background rounded-full p-4 relative border shadow-sm">
              <RefreshCw className="h-10 w-10 text-primary animate-spin" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black mt-4">Cocinando tu menú...</h3>
            <p className="text-sm text-muted-foreground mt-1">Nuestra IA está diseñando recetas exclusivas.</p>
          </div>
        </section>
      )}

      {/* ─── DAILY PLAN VIEW (PRO MAX BENTO) ─── */}
      {!isGenerating && currentDayPlan && (
        <section className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                Menú del Día
              </h2>
            </div>
          </div>

          {/* Bento Daily Macro Sum */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-keto-fat/10 border border-keto-fat/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black text-keto-fat uppercase tracking-widest mb-1">Grasa</p>
              <p className="text-xl font-black text-foreground">{pFat}g</p>
            </div>
            <div className="bg-keto-protein/10 border border-keto-protein/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black text-keto-protein uppercase tracking-widest mb-1">Prot</p>
              <p className="text-xl font-black text-foreground">{pPro}g</p>
            </div>
            <div className="bg-keto-carbs/10 border border-keto-carbs/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black text-keto-carbs uppercase tracking-widest mb-1">Carb</p>
              <p className="text-xl font-black text-foreground">{pCar}g</p>
            </div>
            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Kcal</p>
              <p className="text-xl font-black text-foreground">{pKcal}</p>
            </div>
          </div>

          <div className="space-y-4">
            <MealPlanCard 
              recipe={currentDayPlan.breakfast} 
              mealLabel="☀️ Desayuno" 
              onClick={() => { setSelectedRecipe(currentDayPlan.breakfast!); setSheetOpen(true); }}
            />
            <MealPlanCard 
              recipe={currentDayPlan.lunch} 
              mealLabel="🌤️ Almuerzo" 
              onClick={() => { setSelectedRecipe(currentDayPlan.lunch!); setSheetOpen(true); }}
            />
            <MealPlanCard 
              recipe={currentDayPlan.dinner} 
              mealLabel="🌙 Cena" 
              onClick={() => { setSelectedRecipe(currentDayPlan.dinner!); setSheetOpen(true); }}
            />
          </div>
        </section>
      )}

      {/* ─── MANUAL LOGS (iOS LIST STYLE) ─── */}
      <section className="mt-6 space-y-4">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">
          Registro Extra
        </h3>
        
        {/* Render Manual logs if any */}
        {anyManualLogs && (
          <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-4xl shadow-sm overflow-hidden p-2 space-y-2">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
              const meals = mealsByType[mealType]
              if (meals.length === 0) return null
              const config = mealTypeConfig[mealType]

              return (
                <div key={mealType} className="space-y-1">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <config.icon className={cn("h-4 w-4", config.color)} />
                    <span className="text-xs font-black uppercase tracking-wider">{config.label}</span>
                  </div>
                  {meals.map((meal) => (
                    <div key={meal.$id} className="flex items-center justify-between bg-surface/50 rounded-2xl p-4 transition-colors hover:bg-muted/80">
                      <span className="font-bold text-sm text-foreground">{meal.foodName}</span>
                      <span className="text-xs font-bold text-muted-foreground bg-background/80 px-2.5 py-1 rounded-lg border shadow-xs">{Math.round(meal.calories)} kcal</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Quick Add Buttons */}
        <div className="grid grid-cols-2 gap-2 pb-6">
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mt) => {
            const config = mealTypeConfig[mt]
            return (
              <Button
                key={mt}
                variant="outline"
                className="h-12 rounded-2xl bg-card/50 backdrop-blur-xl border-border/50 shadow-sm font-bold active:scale-95 transition-all w-full"
                onClick={() => handleOpenLog(mt)}
              >
                <Plus className="mr-1 h-4 w-4 text-muted-foreground" />
                <span className={config.color}>{config.label}</span>
              </Button>
            )
          })}
        </div>
      </section>

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
        goals={goals}
      />

      {/* Recipe Detail Sheet */}
      <RecipeDetailSheet
        recipe={selectedRecipe as any}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isSaved={false}
        onToggleSave={() => {
          toast.info('Para guardar recetas como favoritas, búscalas en la sección de Recetas.');
        }}
        date={dateString}
      />
    </div>
  )
}
