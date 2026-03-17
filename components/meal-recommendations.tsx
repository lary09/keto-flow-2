'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMealLogs } from '@/hooks/use-meal-logs'
import { useAuth } from '@/contexts/auth-context'
import { Lightbulb, CheckCircle2, AlertCircle, UtensilsCrossed } from 'lucide-react'

export function MealRecommendations() {
  const { totals } = useMealLogs()
  const { profile } = useAuth()

  const recommendations = useMemo(() => {
    if (!profile) return []

    const recs = []
    const fatLeft = profile.dailyFatGoal - totals.fat
    const proteinLeft = profile.dailyProteinGoal - totals.protein
    const carbLeft = profile.dailyCarbGoal - totals.carbs

    // 1. Carb Warning
    if (totals.carbs >= profile.dailyCarbGoal) {
      recs.push({
        type: 'warning',
        title: 'Límite de Carbohidratos alcanzado',
        description: 'Has llegado a tu límite diario de carbs. Para el resto del día, prioriza grasas puras como aceite de oliva o aguacate.',
        icon: AlertCircle,
        color: 'text-red-500'
      })
    } else if (carbLeft < 5) {
      recs.push({
        type: 'info',
        title: 'Carbs bajo control',
        description: 'Te quedan muy pocos carbohidratos. Evita frutas y prefiere verduras de hoja verde.',
        icon: Lightbulb,
        color: 'text-yellow-500'
      })
    }

    // 2. Fat Recommendations (The soul of Keto)
    if (fatLeft > 40) {
      recs.push({
        type: 'recommendation',
        title: 'Aumenta tus Grasas Saludables',
        description: 'Estás bajo en grasas. Considera añadir media unidad de aguacate, nueces de macadamia o un toque extra de aceite de oliva a tu próxima comida.',
        icon: UtensilsCrossed,
        color: 'text-emerald-500'
      })
    }

    // 3. Protein Recommendations
    if (proteinLeft > 30) {
      recs.push({
        type: 'recommendation',
        title: 'Necesitas Proteína',
        description: 'Tu cuerpo necesita proteína para mantener el músculo. Prueba con pechuga de pollo, salmón o un par de huevos duros.',
        icon: UtensilsCrossed,
        color: 'text-blue-500'
      })
    }

    // 4. Perfect Balance
    if (recs.length === 0) {
      recs.push({
        type: 'success',
        title: '¡Vas por buen camino!',
        description: 'Tus macros están equilibrados. Sigue manteniendo este ratio de grasas y proteínas.',
        icon: CheckCircle2,
        color: 'text-green-500'
      })
    }

    return recs
  }, [totals, profile])

  if (!profile) return null

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-primary" />
        Sugerencias Inteligentes
      </h3>
      
      <div className="grid grid-cols-1 gap-3">
        {recommendations.map((rec, index) => (
          <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-4 flex gap-4">
              <div className={`p-2 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0 h-fit`}>
                <rec.icon className={`w-5 h-5 ${rec.color}`} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground leading-none">{rec.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rec.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
