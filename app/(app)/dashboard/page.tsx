'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/contexts/auth-context'
import { useMealLogs } from '@/hooks/use-meal-logs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, ChevronLeft, ChevronRight, Coffee, Sun, Moon, Apple, Trash2, Database, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { FoodLogDialog } from '@/components/food-log-dialog'
import { RecipeDetailSheet } from '@/components/recipe-detail-sheet'
import { toast } from 'sonner'
import type { MealLog } from '@/lib/appwrite'
import { startOfWeek, addDays, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'

const mealTypeConfig = {
  breakfast: { icon: Coffee, label: 'Desayuno', bg: 'bg-amber-500/10', color: 'text-amber-600', border: 'border-amber-500/20' },
  lunch: { icon: Sun, label: 'Almuerzo', bg: 'bg-sky-500/10', color: 'text-sky-600', border: 'border-sky-500/20' },
  dinner: { icon: Moon, label: 'Cena', bg: 'bg-indigo-500/10', color: 'text-indigo-600', border: 'border-indigo-500/20' },
  snack: { icon: Apple, label: 'Snack', bg: 'bg-emerald-500/10', color: 'text-emerald-600', border: 'border-emerald-500/20' },
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
        <Button className="mt-8" onClick={() => window.location.reload()}>
          Ya las he creado, reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-5 pb-24">
      
      {/* ─── HEADER (PRO MAX) ─── */}
      <header className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase mb-1">
            {format(selectedDate, "MMM d, yyyy", { locale: es })}
          </p>
          <h1 className="text-3xl font-black tracking-tight text-foreground leading-none">
            {isToday ? 'Hoy' : format(selectedDate, 'EEEE', { locale: es })}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/50 p-1.5 rounded-full backdrop-blur-md">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goToPrevDay}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 rounded-full font-bold text-xs px-3"
            onClick={() => setSelectedDate(new Date())}
            disabled={isToday}
          >
            Hoy
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goToNextDay}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* ─── SUGGESTED MEAL (HERO) ─── */}
      {suggestedPlan && (
        <section className="relative overflow-hidden rounded-4xl border-0 shadow-2xl group cursor-pointer transition-all hover:shadow-primary/20 aspect-4/3 sm:aspect-2/1" onClick={() => { setSelectedRecipe(suggestedPlan.lunch || suggestedPlan.dinner); setSheetOpen(true); }}>
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[1.5s] ease-out group-hover:scale-105 opacity-60" 
            style={{ backgroundImage: `url(${suggestedPlan.lunch?.image || suggestedPlan.dinner?.image || suggestedPlan.breakfast?.image})` }} 
          />
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
          
          <div className="relative p-6 pt-32 flex flex-col justify-end z-10 w-full h-full">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-primary/90 backdrop-blur-xl px-3 py-1 rounded-full text-[10px] font-black text-primary-foreground flex items-center gap-1.5 shadow-md tracking-wider">
                <Sparkles className="h-3 w-3" />
                ELECCIÓN DEL CHEF
              </span>
            </div>
            <h3 className="text-3xl sm:text-5xl font-black tracking-tighter text-foreground mb-3 leading-none drop-shadow-xl">
              {(suggestedPlan.lunch?.title || "Sugerencia del Día")}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base mb-6 font-bold text-foreground/90">
              <span className="bg-background/40 backdrop-blur-xl border border-white/10 px-2.5 py-1 rounded-lg shadow-sm">⏳ {suggestedPlan.lunch?.readyInMinutes || 20} min</span>
              <span className="bg-background/40 backdrop-blur-xl border border-white/10 px-2.5 py-1 rounded-lg text-keto-calories shadow-sm">🔥 {suggestedPlan.lunch?.calories || 400} kcal</span>
              <span className="bg-background/40 backdrop-blur-xl border border-white/10 px-2.5 py-1 rounded-lg text-keto-protein shadow-sm">🥩 {suggestedPlan.lunch?.protein || 20}g Prot</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="secondary" className="w-full h-12 rounded-2xl bg-background/80 backdrop-blur-2xl hover:bg-background font-bold" onClick={(e) => { e.stopPropagation(); setSelectedRecipe(suggestedPlan.breakfast); setSheetOpen(true); }}>
                Desayuno
              </Button>
              <Button size="sm" variant="secondary" className="w-full h-12 rounded-2xl bg-background/80 backdrop-blur-2xl hover:bg-background font-bold" onClick={(e) => { e.stopPropagation(); setSelectedRecipe(suggestedPlan.lunch); setSheetOpen(true); }}>
                Almuerzo
              </Button>
              <Button size="sm" variant="secondary" className="w-full h-12 rounded-2xl bg-background/80 backdrop-blur-2xl hover:bg-background font-bold" onClick={(e) => { e.stopPropagation(); setSelectedRecipe(suggestedPlan.dinner); setSheetOpen(true); }}>
                Cena
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── MACROS BENTO GRID (APPLE HEALTH STYLE) ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Impacto Keto
          </h2>
          <span className="text-sm font-bold text-muted-foreground">{Math.max(0, goals.calories - totals.calories)} kcal restantes</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            
            {/* Grasas (Fat) */}
            <Card className="rounded-4xl border-0 bg-keto-fat/10 shadow-sm overflow-hidden relative group">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-keto-fat/20 blur-3xl rounded-full transition-transform group-hover:scale-150" />
              <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
                <p className="text-[10px] font-black text-keto-fat/70 uppercase tracking-widest mb-2">Grasas</p>
                <div>
                  <div className="flex items-end gap-1 font-black text-keto-fat leading-none mb-3">
                    <span className="text-4xl">{Math.round(totals.fat)}</span>
                    <span className="text-base mb-1">/ {goals.fat}g</span>
                  </div>
                  <div className="h-2 w-full bg-keto-fat/10 rounded-full overflow-hidden">
                    <div className="h-full bg-keto-fat rounded-full transition-all duration-[1.5s] ease-out" style={{ width: `${Math.min(100, (totals.fat / Math.max(1, goals.fat)) * 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Proteínas (Protein) */}
            <Card className="rounded-4xl border-0 bg-keto-protein/10 shadow-sm overflow-hidden relative group">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-keto-protein/20 blur-3xl rounded-full transition-transform group-hover:scale-150" />
              <CardContent className="p-5 h-full flex flex-col justify-between relative z-10">
                <p className="text-[10px] font-black text-keto-protein/70 uppercase tracking-widest mb-2">Proteínas</p>
                <div>
                  <div className="flex items-end gap-1 font-black text-keto-protein leading-none mb-3">
                    <span className="text-4xl">{Math.round(totals.protein)}</span>
                    <span className="text-base mb-1">/ {goals.protein}g</span>
                  </div>
                  <div className="h-2 w-full bg-keto-protein/10 rounded-full overflow-hidden">
                    <div className="h-full bg-keto-protein rounded-full transition-all duration-[1.5s] ease-out" style={{ width: `${Math.min(100, (totals.protein / Math.max(1, goals.protein)) * 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Carbohidratos Netos (Wide) */}
            <Card className="col-span-2 rounded-4xl border-0 bg-keto-carbs/10 shadow-sm overflow-hidden relative group">
              <div className="absolute bottom-[-50%] right-[-10%] w-64 h-64 bg-keto-carbs/20 blur-[60px] rounded-full transition-transform group-hover:scale-110" />
              <CardContent className="p-5 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] font-black text-keto-carbs/70 uppercase tracking-widest mb-1">Carbos Netos</p>
                  <div className="flex items-end gap-1 font-black text-keto-carbs leading-none">
                    <span className="text-4xl sm:text-5xl">{Math.round(totals.carbs)}</span>
                    <span className="text-base sm:text-xl mb-1 sm:mb-1.5">/ {goals.carbs}g</span>
                  </div>
                </div>
                <div className="w-1/2 max-w-[150px]">
                  <div className="h-3 w-full bg-keto-carbs/10 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-keto-carbs rounded-full transition-all duration-[1.5s] ease-out" style={{ width: `${Math.min(100, (totals.carbs / Math.max(1, goals.carbs)) * 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </section>

      {/* ─── MEALS LOGS (GLASSMORPHISM LIST) ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xl font-black tracking-tight text-foreground">Registro de Hoy</h2>
          <Button size="sm" variant="ghost" className="rounded-full text-primary font-bold hover:bg-primary/10" asChild>
            <Link href="/recipes">
              <Sparkles className="mr-1.5 h-4 w-4" /> Buscar ideas
            </Link>
          </Button>
        </div>

        <div className="grid gap-3">
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
              <Card key={mealType} className={cn("overflow-hidden rounded-3xl border-border/40 shadow-sm transition-all hover:shadow-md", meals.length > 0 ? "bg-card" : "bg-muted/20 border-dashed")}>
                <div className="p-4 sm:p-5 flex flex-col gap-4">
                  
                  {/* Meal Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex items-center justify-center w-12 h-12 rounded-2xl", config.bg)}>
                        <config.icon className={cn("h-6 w-6", config.color)} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-foreground">{config.label}</h3>
                        {meals.length > 0 ? (
                          <p className="text-xs font-bold text-muted-foreground">{Math.round(mealTotals.calories)} kcal aportadas</p>
                        ) : (
                          <p className="text-xs font-medium text-muted-foreground">Sin registrar</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-10 w-10 rounded-full drop-shadow-sm transition-transform active:scale-95"
                      onClick={() => handleOpenLog(mealType)}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Meal Items */}
                  {meals.length > 0 && (
                    <div className="space-y-2 mt-1">
                      {meals.map((meal) => (
                        <div
                          key={meal.$id}
                          className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl bg-surface/50 border border-border/50 p-3.5 transition-colors hover:bg-muted/80"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-sm text-foreground mb-1">{meal.foodName}</p>
                            <div className="flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
                              <span className="bg-background/80 px-2 py-0.5 rounded-md shadow-xs text-foreground/80">{Math.round(meal.calories)} kcal</span>
                              <span className="bg-keto-fat/10 text-keto-fat px-2 py-0.5 rounded-md">F: {Math.round(meal.fat)}</span>
                              <span className="bg-keto-protein/10 text-keto-protein px-2 py-0.5 rounded-md">P: {Math.round(meal.protein)}</span>
                              <span className="bg-keto-carbs/10 text-keto-carbs px-2 py-0.5 rounded-md">C: {Math.round(meal.carbs)}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive self-end sm:self-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                            onClick={() => handleDeleteLog(meal.$id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </Card>
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

      {/* Recipe Detail Sheet */}
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
