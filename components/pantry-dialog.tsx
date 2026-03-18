'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Wand2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { ID, databases, APPWRITE_DATABASE_ID, COLLECTIONS } from '@/lib/appwrite'

interface PantryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string // YYYY-MM-DD to save the plan on
}

export const PantryDialog = ({ open, onOpenChange, date }: PantryDialogProps) => {
  const { profile, user } = useAuth()
  const [ingredients, setIngredients] = useState<string[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

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
    if (!profile || !user) {
      toast.error('Ocurrió un error con el perfil');
      return;
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/meal-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients,
          goals: {
            calories: profile.dailyCalorieGoal,
            fat: profile.dailyFatGoal,
            protein: profile.dailyProteinGoal,
            carbs: profile.dailyCarbGoal,
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Error en el servidor al generar')
      }

      const plan = await response.json()

      // Guardar en la base de datos de Appwrite
      const mealsToSave = [
        { type: 'breakfast', data: plan.breakfast },
        { type: 'lunch', data: plan.lunch },
        { type: 'dinner', data: plan.dinner },
        { type: 'snack', data: plan.snack },
      ]

      for (const meal of mealsToSave) {
        if (!meal.data || !meal.data.foodName) continue;
        
        await databases.createDocument(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.MEAL_LOGS,
            ID.unique(),
            {
              userId: user.$id,
              date,
              mealType: meal.type,
              foodId: `ai_${Date.now()}_${Math.random()}`,
              foodName: meal.data.foodName,
              calories: meal.data.calories,
              fat: meal.data.fat,
              protein: meal.data.protein,
              carbs: meal.data.carbs,
              servings: 1,
              servingSize: '1 porción'
            }
        );
      }

      toast.success('¡Plan generado con éxito!')
      onOpenChange(false)
      // Recargar la página o disparar mutación
      window.location.reload() 

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

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || ingredients.length === 0}>
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            {isGenerating ? 'Creando Magia...' : 'Generar Día'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
