'use client'

import { useState, useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/contexts/auth-context'
import { useMealLogs } from '@/hooks/use-meal-logs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight, Plus, Coffee, Sun, Moon, Apple } from 'lucide-react'
import { FoodLogDialog } from '@/components/food-log-dialog'
import { cn } from '@/lib/utils'
import type { MealLog } from '@/lib/appwrite'
import { MealRecommendations } from '@/components/meal-recommendations'

const mealTypeConfig = {
  breakfast: { icon: Coffee, label: 'Desayuno', shortLabel: 'Des' },
  lunch: { icon: Sun, label: 'Almuerzo', shortLabel: 'Alm' },
  dinner: { icon: Moon, label: 'Cena', shortLabel: 'Cen' },
  snack: { icon: Apple, label: 'Snack', shortLabel: 'Snk' },
}

export default function MealPlannerPage() {
  const { profile } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealLog['mealType']>('breakfast')

  const dateString = format(selectedDate, 'yyyy-MM-dd')
  const { mealsByType, totals, isLoading } = useMealLogs(dateString)

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

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
  }

  const goToNextWeek = () => {
    const newStart = addDays(weekStart, 7)
    setWeekStart(newStart)
    setSelectedDate(newStart)
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

  const isToday = isSameDay(selectedDate, new Date())

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planificador</h1>
          <p className="text-sm text-muted-foreground">Planifica tus comidas semanales</p>
        </div>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoy
        </Button>
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
                  {format(day, 'EEE')}
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

      {/* Selected Day Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isToday ? 'Hoy' : format(selectedDate, 'EEEE', { locale: es })}
          </h2>
          <p className="text-sm text-muted-foreground">{format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })}</p>
        </div>
        {!isLoading && (
          <Badge variant="outline" className="text-xs">
            {Math.round(totals.calories)} / {goals.calories} kcal
          </Badge>
        )}
      </div>

      {/* Daily Macro Summary */}
      {!isLoading && totals.calories > 0 && (
        <div className="grid grid-cols-4 gap-2 rounded-lg bg-muted/50 p-3">
          <div className="text-center">
            <p className="text-sm font-semibold text-keto-fat">{Math.round(totals.fat)}g</p>
            <p className="text-xs text-muted-foreground">Grasas</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-keto-protein">{Math.round(totals.protein)}g</p>
            <p className="text-xs text-muted-foreground">Prots</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-keto-carbs">{Math.round(totals.carbs)}g</p>
            <p className="text-xs text-muted-foreground">Carbs</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-keto-calories">{Math.round(totals.calories)}</p>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
        </div>
      )}

      {/* Smart Recommendations */}
      <MealRecommendations />

      {/* Meals for Selected Day */}
      <div className="space-y-3">
        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((mealType) => {
          const config = mealTypeConfig[mealType]
          const meals = mealsByType[mealType]
          const Icon = config.icon

          return (
            <Card key={mealType}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">{config.label}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenLog(mealType)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : meals.length === 0 ? (
                  <button
                    onClick={() => handleOpenLog(mealType)}
                    className="flex w-full items-center justify-center rounded-lg border border-dashed border-muted py-3 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Planificar {config.label.toLowerCase()}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {meals.map((meal) => (
                      <div key={meal.$id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                        <span className="truncate text-sm text-foreground">{meal.foodName}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{Math.round(meal.calories)} kcal</span>
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
    </div>
  )
}
