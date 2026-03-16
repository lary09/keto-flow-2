'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/contexts/auth-context'
import { useMealLogs } from '@/hooks/use-meal-logs'
import { MacroRing } from '@/components/macro-ring'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, ChevronLeft, ChevronRight, Coffee, Sun, Moon, Apple, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { FoodLogDialog } from '@/components/food-log-dialog'
import { toast } from 'sonner'
import type { MealLog } from '@/lib/appwrite'

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
  
  const dateString = format(selectedDate, 'yyyy-MM-dd')
  const { logs, mealsByType, totals, isLoading, deleteMealLog } = useMealLogs(dateString)

  const goals = {
    calories: profile?.dailyCalorieGoal || 2000,
    fat: profile?.dailyFatGoal || 155,
    protein: profile?.dailyProteinGoal || 100,
    carbs: profile?.dailyCarbGoal || 25,
  }

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
      <div className="rounded-xl bg-primary/10 p-4">
        <p className="text-lg font-medium text-foreground">
          ¡Hola, {user?.name?.split(' ')[0] || 'amigo'}!
        </p>
        <p className="text-sm text-muted-foreground">
          {totals.calories > 0 
            ? `Has registrado ${Math.round(totals.calories)} calorías hoy.`
            : 'Empieza a registrar tus comidas para seguir tus macros.'}
        </p>
      </div>

      {/* Macro Rings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progreso Diario</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-around py-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-20 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex justify-around py-2">
              <MacroRing
                value={totals.fat}
                max={goals.fat}
                label="Grasas"
                unit="g"
                color="fat"
                size="sm"
              />
              <MacroRing
                value={totals.protein}
                max={goals.protein}
                label="Proteínas"
                unit="g"
                color="protein"
                size="sm"
              />
              <MacroRing
                value={totals.carbs}
                max={goals.carbs}
                label="Carbs"
                unit="g"
                color="carbs"
                size="sm"
              />
              <MacroRing
                value={totals.calories}
                max={goals.calories}
                label="Calorías"
                unit="kcal"
                color="calories"
                size="sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  )
}
