'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Wand2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMealLogs } from '@/hooks/use-meal-logs'

interface PantryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string // YYYY-MM-DD to save the plan on
  goals: {
    calories: number
    fat: number
    protein: number
    carbs: number
  }
}

export const PantryDialog = ({ open, onOpenChange, date, goals }: PantryDialogProps) => {
  const [ingredients, setIngredients] = useState<string[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const { addMealLog, mutate } = useMealLogs(date)

  const handleAddIngredient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentInput.trim()) {
      e.preventDefault();
      setIngredients((prev) => [...prev, currentInput.trim()]);
      setCurrentInput('');
    }
  }

  const removeIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      toast.error('Agrega al menos un ingrediente');
      return;
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/meal-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          goals,
          days: 1,
        }),
      })

      if (!response.ok) {
        throw new Error('Error en el servidor al generar')
      }

      const result = await response.json()
      const dayPlan = result.plan?.[0]

      if (!dayPlan) {
        throw new Error('La IA no devolvió un plan válido para el día')
      }

      const mealsToSave = [
        { type: 'breakfast', data: dayPlan.breakfast },
        { type: 'lunch', data: dayPlan.lunch },
        { type: 'dinner', data: dayPlan.dinner },
      ]

      for (const meal of mealsToSave) {
        if (!meal.data?.title) continue

        await addMealLog({
          date,
          mealType: meal.type as 'breakfast' | 'lunch' | 'dinner',
          foodName: meal.data.title,
          calories: Math.round(meal.data.calories || 0),
          fat: Math.round(meal.data.fat || 0),
          protein: Math.round(meal.data.protein || 0),
          carbs: Math.round(meal.data.carbs || 0),
        })
      }

      await mutate()
      toast.success('¡Plan generado con éxito!')
      onOpenChange(false)
      setIngredients([])
      setCurrentInput('')

    } catch (error) {
      console.error(error)
      toast.error('Hubo un error al generar el plan. Asegúrate de tener la API Key configurada.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Generar con Despensa
          </DialogTitle>
          <DialogDescription>
            Escribe los ingredientes principales de tu despensa y la IA armará tu día Keto perfecto basándose en tus macros.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ingredients">Ingredientes (Presiona Enter para añadir)</Label>
            <Input
              id="ingredients"
              placeholder="Ej. Huevos, aguacate, pollo..."
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleAddIngredient}
              disabled={isGenerating}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                {ing}
                <button disabled={isGenerating} onClick={() => removeIngredient(i)} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button className="w-full sm:w-auto" onClick={handleGenerate} disabled={isGenerating || ingredients.length === 0}>
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            {isGenerating ? 'Creando Magia...' : 'Generar Día'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
