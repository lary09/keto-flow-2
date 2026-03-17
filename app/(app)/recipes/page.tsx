'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Search, Clock, Users, Heart, HeartOff, AlertCircle } from 'lucide-react'
import { RecipeDetailSheet } from '@/components/recipe-detail-sheet'
import { useAuth } from '@/contexts/auth-context'
import { databases, APPWRITE_DATABASE_ID, COLLECTIONS, Query, ID, type SavedRecipe } from '@/lib/appwrite'
import { toast } from 'sonner'

interface Recipe {
  id: number
  title: string
  image: string
  readyInMinutes: number
  servings: number
  calories: number
  fat: number
  protein: number
  carbs: number
  netCarbs: number
  ingredients: string[]
}

export default function RecipesPage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Fetch saved recipes on mount
  useEffect(() => {
    const fetchSavedRecipes = async () => {
      if (!user) return
      try {
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.SAVED_RECIPES,
          [Query.equal('userId', user.$id)]
        )
        const ids = new Set(response.documents.map((doc) => (doc as unknown as SavedRecipe).recipeId))
        setSavedRecipeIds(ids)
      } catch (err) {
        console.error('Error al obtener recetas guardadas:', err)
      }
    }
    fetchSavedRecipes()
  }, [user])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/recipes/search?query=${encodeURIComponent(query)}&number=12`)
      if (!response.ok) {
        throw new Error('Failed to search recipes')
      }
      const data = await response.json()
      setRecipes(data.recipes || [])
    } catch (err) {
      console.error('Error de búsqueda:', err)
      setError('Error al buscar recetas. Por favor, comprueba tu clave API.')
      setRecipes([])
    } finally {
      setIsLoading(false)
    }
  }

  // Load popular keto recipes on mount with variety
  useEffect(() => {
    const loadInitialRecipes = async () => {
      setIsLoading(true)
      try {
        const keywords = ['keto', 'low carb', 'cetogenica', 'keto breakfast', 'keto dinner', 'keto snack', 'keto salmon', 'keto avocado']
        const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)]
        
        const response = await fetch(`/api/recipes/search?query=${encodeURIComponent(randomKeyword)}&number=12`)
        if (response.ok) {
          const data = await response.json()
          setRecipes(data.recipes || [])
        }
      } catch (err) {
        console.error('Error al cargar recetas iniciales:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadInitialRecipes()
  }, [])

  const toggleSaveRecipe = useCallback(async (recipe: Recipe) => {
    if (!user) return

    const isSaved = savedRecipeIds.has(recipe.id)

    try {
      if (isSaved) {
        // Find and delete the saved recipe
        const response = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.SAVED_RECIPES,
          [
            Query.equal('userId', user.$id),
            Query.equal('recipeId', recipe.id),
          ]
        )
        if (response.documents[0]) {
          await databases.deleteDocument(
            APPWRITE_DATABASE_ID,
            COLLECTIONS.SAVED_RECIPES,
            response.documents[0].$id
          )
        }
        setSavedRecipeIds((prev) => {
          const next = new Set(prev)
          next.delete(recipe.id)
          return next
        })
        toast.success('Receta eliminada de favoritos')
      } else {
        // Save the recipe
        await databases.createDocument(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.SAVED_RECIPES,
          ID.unique(),
          {
            userId: user.$id,
            recipeId: recipe.id,
            title: recipe.title,
            image: recipe.image,
            calories: Math.round(recipe.calories),
            fat: Math.round(recipe.fat),
            protein: Math.round(recipe.protein),
            carbs: Math.round(recipe.carbs),
            servings: recipe.servings,
            readyInMinutes: recipe.readyInMinutes,
            ingredients: JSON.stringify(recipe.ingredients || []),
            savedAt: new Date().toISOString(),
          }
        )
        setSavedRecipeIds((prev) => new Set(prev).add(recipe.id))
        toast.success('¡Receta guardada en favoritos!')
      }
    } catch (err) {
      console.error('Error al cambiar estado de guardado:', err)
      toast.error('Error al guardar la receta')
    }
  }, [user, savedRecipeIds])

  const openRecipeDetail = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setSheetOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recetas</h1>
        <p className="text-sm text-muted-foreground">Descubre deliciosas recetas keto-friendly</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar recetas keto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          Buscar
        </Button>
      </form>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Error de API</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && recipes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <Card
              key={recipe.id}
              className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
              onClick={() => openRecipeDetail(recipe)}
            >
              <div className="relative aspect-video">
                <Image
                  src={recipe.image}
                  alt={recipe.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSaveRecipe(recipe)
                  }}
                >
                  {savedRecipeIds.has(recipe.id) ? (
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                  ) : (
                    <HeartOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardContent className="p-4">
                <h3 className="line-clamp-2 font-semibold text-foreground">{recipe.title}</h3>
                <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {recipe.readyInMinutes}min
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {recipe.servings} porc.
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(recipe.calories)} kcal
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    F: {Math.round(recipe.fat)}g
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    P: {Math.round(recipe.protein)}g
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    C: {Math.round(recipe.netCarbs)}g
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && hasSearched && recipes.length === 0 && !error && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No se encontraron recetas. Intenta con otro término.</p>
        </div>
      )}

      {/* Recipe Detail Sheet */}
      <RecipeDetailSheet
        recipe={selectedRecipe}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isSaved={selectedRecipe ? savedRecipeIds.has(selectedRecipe.id) : false}
        onToggleSave={() => selectedRecipe && toggleSaveRecipe(selectedRecipe)}
      />
    </div>
  )
}
