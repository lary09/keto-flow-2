import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MealPlanRecipe {
  id: string
  title: string
  image: string
  calories: number
  fat: number
  protein: number
  carbs: number
  readyInMinutes: number
}

interface MealPlanCardProps {
  recipe: MealPlanRecipe | null
  mealLabel: string
  onClick?: () => void
}

export function MealPlanCard({ recipe, mealLabel, onClick }: MealPlanCardProps) {
  if (!recipe) {
    return (
      <Card className="overflow-hidden border-dashed opacity-60">
        <CardContent className="flex items-center justify-center py-6">
          <p className="text-xs text-muted-foreground">Sin receta disponible</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={cn("overflow-hidden transition-shadow hover:shadow-md group flex-1", onClick && "cursor-pointer")}
      onClick={onClick}
    >
      <div className="flex gap-3 p-3">
        {/* Image */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
          <Image
            src={recipe.image}
            alt={recipe.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            sizes="80px"
          />
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{mealLabel}</p>
            <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">
              {recipe.title}
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {recipe.calories} kcal
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              G:{recipe.fat}g · P:{recipe.protein}g · C:{recipe.carbs}g
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
