'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/contexts/auth-context'
import { useMealLogs } from '@/hooks/use-meal-logs'
import { MacroRing } from '@/components/macro-ring'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, ChevronLeft, ChevronRight, Coffee, Sun, Moon, Apple, Trash2, Database, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { FoodLogDialog } from '@/components/food-log-dialog'
import { MealPlanCard } from '@/components/meal-plan-card'
import { RecipeDetailSheet } from '@/components/recipe-detail-sheet'
import { toast } from 'sonner'
import type { MealLog } from '@/lib/appwrite'
import { startOfWeek, addDays, isSameDay } from 'date-fns'

const mealTypeConfig = {
  breakfast: { icon: Coffee, label: 'Desayuno', color: 'bg-amber-100 text-amber-700' },
  lunch: { icon: Sun, label: 'Almuerzo', color: 'bg-sky-100 text-sky-700' },
  dinner: { icon: Moon, label: 'Cena', color: 'bg-indigo-100 text-indigo-700' },
  snack: { icon: Apple, label: 'Snack', color: 'bg-emerald-100 text-emerald-700' },
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealLog['mealType']>('breakfast')
  const [suggestedPlan, setSuggestedPlan] = useState<any>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  
  const dateString = format(selectedDate, 'yyyy-MM-dd')
  const { logs, mealsByType, totals, isLoading, deleteMealLog, error } = useMealLogs(dateString)

  const goals = {
    calories: profile?.dailyCalorieGoal || 2000,
    fat: profile?.dailyFatGoal || 155,
    protein: profile?.dailyProteinGoal || 100,
    carbs: profile?.dailyCarbGoal || 25,
  }

  // Load auto-generated plan for the selected day
  useEffect(() => {
    const saved = localStorage.getItem('keto-flow-week-plan')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.plan) {
          const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
          const dayIndex = weekDays.findIndex((d) => isSameDay(d, selectedDate))
          if (dayIndex !== -1 && parsed.plan[dayIndex]) {
            setSuggestedPlan(parsed.plan[dayIndex])
          } else {
            setSuggestedPlan(null)
          }
        }
      } catch (e) {
        console.error("Error reading saved plan on dashboard", e)
      }
    } else {
      setSuggestedPlan(null)
    }
  }, [selectedDate])

  const goToPrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  const handleOpenLog = (mealType: MealLog['mealType']) => {
    setSelectedMealType(mealType)
    setLogDialogOpen(true)
  }

  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteMealLog(logId)
      toast.success('Entrada eliminada')
    } catch {
      toast.error('Error al eliminar la entrada')
    }
  }

  if (error && (error as any)?.code === 404) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
        <div className="bg-amber-100 p-4 rounded-full mb-4">
          <Database className="h-10 w-10 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold mb-2">Configuración Requerida</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          No se ha encontrado la base de datos en Appwrite. Para empezar, debes crear las colecciones necesarias.
        </p>
        <div className="space-y-2 text-sm text-left bg-muted p-4 rounded-lg w-full max-w-md">
           <p className="font-semibold mb-2">Instrucciones:</p>
           <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
             <li>Entra en tu consola de Appwrite</li>
             <li>Ve a Databases &gt; main</li>
             <li>Crea la colección: <code className="bg-background px-1 rounded">user_profiles</code></li>
             <li>Crea la colección: <code className="bg-background px-1 rounded">meal_logs</code></li>
           </ul>
        </div>
        <Button className="mt-8" onClick={() => window.location.reload()}>
          Ya las he creado, reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isToday ? 'Hoy' : format(selectedDate, 'EEEE', { locale: es })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goToPrevDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setSelectedDate(new Date())}
            disabled={isToday}
          >
            Hoy
          </Button>
          <Button variant="ghost" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Greeting */}
      <div className="pt-2">
        <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-1">
          RESUMEN DIARIO
        </p>
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
          ¡Hola, {user?.name?.split(' ')[0] || 'amigo'}! 👋
        </h2>
      </div>

      {/* Suggested Auto-Plan Magazine Cover (UI/UX Pro Max) */}
      {suggestedPlan && (
        <div className="relative overflow-hidden rounded-[2rem] border shadow-2xl group cursor-pointer transition-all hover:shadow-primary/20" onClick={() => { setSelectedRecipe(suggestedPlan.lunch || suggestedPlan.dinner); setSheetOpen(true); }}>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110 opacity-60" 
            style={{ backgroundImage: `url(${suggestedPlan.lunch?.image || suggestedPlan.dinner?.image || suggestedPlan.breakfast?.image})` }} 
          />
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
          
          <div className="relative p-6 pt-32 flex flex-col justify-end z-10 w-full h-full">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-primary px-3 py-1 rounded-full text-xs font-bold text-primary-foreground flex items-center gap-1 shadow-md">
                <Sparkles className="h-3 w-3" />
                ELECCIÓN DEL CHEF
              </span>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-2 leading-tight drop-shadow-md">
              {(suggestedPlan.lunch?.title || "Sugerencia del Día")}
            </h3>
            <p className="text-foreground/80 font-medium flex items-center gap-3 text-sm sm:text-base mb-5">
              <span className="bg-background/50 backdrop-blur-md px-2 py-1 rounded-md">⏳ {suggestedPlan.lunch?.readyInMinutes || 20} min</span>
              <span className="bg-background/50 backdrop-blur-md px-2 py-1 rounded-md">🔥 {suggestedPlan.lunch?.calories || 400} kcal</span>
              <span className="bg-background/50 backdrop-blur-md px-2 py-1 rounded-md">🥩 {suggestedPlan.lunch?.protein || 20}g Prot</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="secondary" className="w-full rounded-xl bg-background/80 backdrop-blur-lg hover:bg-background" onClick={(e) => { e.stopPropagation(); setSelectedRecipe(suggestedPlan.breakfast); setSheetOpen(true); }}>
                Desayuno
              </Button>
              <Button size="sm" variant="secondary" className="w-full rounded-xl bg-background/80 backdrop-blur-lg hover:bg-background" onClick={(e) => { e.stopPropagation(); setSelectedRecipe(suggestedPlan.lunch); setSheetOpen(true); }}>
                Almuerzo
              </Button>
              <Button size="sm" variant="secondary" className="w-full rounded-xl bg-background/80 backdrop-blur-lg hover:bg-background" onClick={(e) => { e.stopPropagation(); setSelectedRecipe(suggestedPlan.dinner); setSheetOpen(true); }}>
                Cena
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modern High-Impact Macro Bars */}
      <div className="rounded-[2rem] bg-card border shadow-sm p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Progreso de Macros
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Restan <span className="font-bold text-foreground">{Math.max(0, goals.calories - totals.calories)} kcal</span> hoy.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Grasas */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-orange-500">Grasas</span>
                <span>{Math.round(totals.fat)}g <span className="text-muted-foreground">/ {goals.fat}g</span></span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (totals.fat / Math.max(1, goals.fat)) * 100)}%` }} />
              </div>
            </div>
            
            {/* Proteinas */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-primary">Proteínas</span>
                <span>{Math.round(totals.protein)}g <span className="text-muted-foreground">/ {goals.protein}g</span></span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (totals.protein / Math.max(1, goals.protein)) * 100)}%` }} />
              </div>
            </div>

            {/* Carbohidratos */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-amber-600">Carbs Netos</span>
                <span>{Math.round(totals.carbs)}g <span className="text-muted-foreground">/ {goals.carbs}g</span></span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, (totals.carbs / Math.max(1, goals.carbs)) * 100)}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Meals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Comidas</h2>
          <Button size="sm" asChild>
            <Link href="/recipes">
              <Plus className="mr-1 h-4 w-4" />
              Buscar Recetas
            </Link>
          </Button>
        </div>

        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
          const config = mealTypeConfig[mealType]
          const meals = mealsByType[mealType]
          const mealTotals = meals.reduce(
            (acc, m) => ({
              calories: acc.calories + (m.calories || 0),
              fat: acc.fat + (m.fat || 0),
              protein: acc.protein + (m.protein || 0),
              carbs: acc.carbs + (m.carbs || 0),
            }),
            { calories: 0, fat: 0, protein: 0, carbs: 0 }
          )

          return (
            <Card key={mealType}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-2 ${config.color}`}>
                      <config.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{config.label}</CardTitle>
                      {meals.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {Math.round(mealTotals.calories)} kcal
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenLog(mealType)}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : meals.length === 0 ? (
                  <button
                    onClick={() => handleOpenLog(mealType)}
                    className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-muted py-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Añadir comida
                  </button>
                ) : (
                  <div className="space-y-2">
                    {meals.map((meal) => (
                      <div
                        key={meal.$id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{meal.foodName}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(meal.calories)} kcal · F: {Math.round(meal.fat)}g · P: {Math.round(meal.protein)}g · C: {Math.round(meal.carbs)}g
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteLog(meal.$id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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

      {/* Recipe Detail Sheet for Suggested Meals */}
      <RecipeDetailSheet
        recipe={selectedRecipe}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isSaved={false}
        onToggleSave={() => toast.info('Para guardar recetas, usa la sección Recetas.')}
        date={dateString}
      />
    </div>
  )
}
