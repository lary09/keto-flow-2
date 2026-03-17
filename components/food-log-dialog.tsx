'use client'

import { useState } from 'react'
import { useMealLogs } from '@/hooks/use-meal-logs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { Search, Filter, Beef, Droplets, Leaf, Apple } from 'lucide-react'
import { toast } from 'sonner'
import type { MealLog } from '@/lib/appwrite'

interface FoodLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealType: MealLog['mealType']
  date: string
}

export function FoodLogDialog({ open, onOpenChange, mealType, date }: FoodLogDialogProps) {
  const { addMealLog } = useMealLogs(date)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'manual' | 'quick'>('quick')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const mealTypeLabels = {
    breakfast: 'el Desayuno',
    lunch: 'el Almuerzo',
    dinner: 'la Cena',
    snack: 'un Snack',
  }

  // Manual entry state
  const [foodName, setFoodName] = useState('')
  const [calories, setCalories] = useState('')
  const [fat, setFat] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')

  const resetForm = () => {
    setFoodName('')
    setCalories('')
    setFat('')
    setProtein('')
    setCarbs('')
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foodName.trim()) {
      toast.error('Por favor, introduce el nombre del alimento')
      return
    }

    setIsLoading(true)
    try {
      await addMealLog({
        date,
        mealType,
        foodName: foodName.trim(),
        calories: parseFloat(calories) || 0,
        fat: parseFloat(fat) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
      })
      toast.success('¡Alimento registrado correctamente!')
      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error('Error al registrar alimento:', error)
      toast.error('Error al registrar alimento. Por favor, inténtalo de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  // Quick add common keto foods
  const quickFoods = [
    { name: 'Huevos (2 grandes)', calories: 143, fat: 10, protein: 13, carbs: 1, category: 'Proteínas' },
    { name: 'Bacon (3 lonchas)', calories: 161, fat: 12, protein: 12, carbs: 0, category: 'Proteínas' },
    { name: 'Aguacate (medio)', calories: 161, fat: 15, protein: 2, carbs: 2, category: 'Grasas' },
    { name: 'Pechuga de Pollo (100g)', calories: 165, fat: 4, protein: 31, carbs: 0, category: 'Proteínas' },
    { name: 'Salmón (100g)', calories: 208, fat: 13, protein: 20, carbs: 0, category: 'Proteínas' },
    { name: 'Queso (30g)', calories: 113, fat: 9, protein: 7, carbs: 0, category: 'Grasas' },
    { name: 'Almendras (28g)', calories: 164, fat: 14, protein: 6, carbs: 3, category: 'Snacks' },
    { name: 'Aceite de Oliva (1 cda)', calories: 119, fat: 14, protein: 0, carbs: 0, category: 'Grasas' },
    { name: 'Mantequilla (1 cda)', calories: 102, fat: 12, protein: 0, carbs: 0, category: 'Grasas' },
    { name: 'Carne Picada (100g)', calories: 250, fat: 17, protein: 26, carbs: 0, category: 'Proteínas' },
    { name: 'Brócoli (1 taza)', calories: 55, fat: 1, protein: 4, carbs: 6, category: 'Vegetales' },
    { name: 'Espinacas (2 tazas)', calories: 14, fat: 0, protein: 2, carbs: 2, category: 'Vegetales' },
    { name: 'Nueces Macadamia (28g)', calories: 204, fat: 21, protein: 2, carbs: 4, category: 'Grasas' },
    { name: 'Espárragos (5 tallos)', calories: 20, fat: 0, protein: 2, carbs: 4, category: 'Vegetales' },
  ]

  const categories = Array.from(new Set(quickFoods.map(f => f.category)))

  const filteredFoods = quickFoods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || food.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleQuickAdd = async (food: typeof quickFoods[0]) => {
    setIsLoading(true)
    try {
      await addMealLog({
        date,
        mealType,
        foodName: food.name,
        calories: food.calories,
        fat: food.fat,
        protein: food.protein,
        carbs: food.carbs,
      })
      toast.success(`¡${food.name} añadido!`)
      onOpenChange(false)
    } catch (error) {
      console.error('Error al registrar alimento:', error)
      toast.error('Error al registrar alimento')
    } finally {
      setIsLoading(false)
    }
  }

  // mealTypeLabels moved up

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar {mealTypeLabels[mealType]}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'manual' | 'quick')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick">Añadido Rápido</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="mt-4 space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar alimento rápido..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => setSelectedCategory(null)}
                >
                  Todos
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredFoods.length > 0 ? (
                filteredFoods.map((food) => (
                  <button
                    key={food.name}
                    onClick={() => handleQuickAdd(food)}
                    disabled={isLoading}
                    className="flex flex-col items-start rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                  >
                    <div className="flex w-full items-center justify-between mb-1">
                        <span className="text-sm font-bold text-foreground line-clamp-1">{food.name}</span>
                        <Badge variant="secondary" className="text-[8px] h-4 px-1">{food.category}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {food.calories} kcal · {food.fat}g grasas
                    </span>
                  </button>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground text-center w-full">No se encontraron alimentos.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <form onSubmit={handleManualSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="foodName">Nombre del Alimento</FieldLabel>
                  <Input
                    id="foodName"
                    placeholder="ej. Pollo a la plancha"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                    disabled={isLoading}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="calories">Calorías</FieldLabel>
                    <Input
                      id="calories"
                      type="number"
                      placeholder="0"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="fat">Grasas (g)</FieldLabel>
                    <Input
                      id="fat"
                      type="number"
                      placeholder="0"
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="protein">Proteínas (g)</FieldLabel>
                    <Input
                      id="protein"
                      type="number"
                      placeholder="0"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                      disabled={isLoading}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="carbs">Carbs (g)</FieldLabel>
                    <Input
                      id="carbs"
                      type="number"
                      placeholder="0"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                      disabled={isLoading}
                    />
                  </Field>
                </div>
              </FieldGroup>
              <div className="mt-6 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? <Spinner className="mr-2" /> : null}
                  Registrar Alimento
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
