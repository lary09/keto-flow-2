'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Search, Clock, Users, Heart, Sparkles, AlertCircle, ChefHat } from 'lucide-react'
import { RecipeDetailSheet } from '@/components/recipe-detail-sheet'
import { useAuth } from '@/contexts/auth-context'
import { databases, APPWRITE_DATABASE_ID, COLLECTIONS, Query, ID, type SavedRecipe } from '@/lib/appwrite'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Recipe {
  id: string
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

type DietMode = 'keto' | 'flexible'

function RecipeGridImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-110"
      onError={(event) => {
        event.currentTarget.src = '/placeholder.jpg'
      }}
    />
  )
}

function parseRecipeIngredients(rawIngredients: unknown) {
  if (Array.isArray(rawIngredients)) {
    return rawIngredients.filter((item): item is string => typeof item === 'string')
  }

  if (typeof rawIngredients !== 'string' || rawIngredients.trim() === '') {
    return []
  }

  try {
    const parsed = JSON.parse(rawIngredients)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch (error) {
    console.warn('No se pudieron hidratar los ingredientes guardados de la receta.', error)
    return []
  }
}

export default function RecipesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [query, setQuery] = useState(searchParams.get('query') || '')
  const [dietMode, setDietMode] = useState<DietMode>(
    searchParams.get('mode') === 'flexible' ? 'flexible' : 'keto'
  )
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const lastSearchRef = useRef<string | null>(null)

  const modeLabel = dietMode === 'keto' ? 'keto estricto' : 'flexible'

  useEffect(() => {
    const nextQuery = searchParams.get('query') || ''
    const nextMode = searchParams.get('mode') === 'flexible' ? 'flexible' : 'keto'

    setQuery((current) => (current === nextQuery ? current : nextQuery))
    setDietMode((current) => (current === nextMode ? current : nextMode))
  }, [searchParams])

  const modeLabel = dietMode === 'keto' ? 'keto estricto' : 'flexible'

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

  const searchRecipes = useCallback(async (searchQuery: string, mode: DietMode) => {
    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/recipes/search?query=${encodeURIComponent(searchQuery)}&number=12&mode=${mode}`)
      if (!response.ok) {
        throw new Error('Failed to search recipes')
      }
      const data = await response.json()
      setRecipes(data.recipes || [])
      if (mode === 'keto' && data.filteredOut > 0) {
        toast.info(`Filtré ${data.filteredOut} receta(s) por no cumplir el modo keto estricto.`)
      }
      if ((data.recipes || []).length === 0) {
        toast.info(mode === 'keto' ? 'No encontré recetas keto válidas con esa búsqueda. Prueba otro ingrediente o usa modo flexible.' : 'No encontré recetas para esa búsqueda. Prueba con otro término.')
      }
    } catch (err) {
      console.error('Error de búsqueda:', err)
      setError('Error al buscar recetas. Por favor, comprueba tu clave API.')
      setRecipes([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('query', trimmedQuery)
    params.set('mode', dietMode)
    lastSearchRef.current = `${dietMode}:${trimmedQuery}`
    router.replace(`/recipes?${params.toString()}`)

    await searchRecipes(trimmedQuery, dietMode)
  }

  // Load popular keto recipes on mount with variety (Organic Cache first, then fallback to AI)
  useEffect(() => {
    const loadInitialRecipes = async () => {
      setIsLoading(true)
      
      // 1. Try Organic Cache to avoid AI latency and save tokens
      try {
        const organicResponse = await databases.listDocuments(
          APPWRITE_DATABASE_ID,
          COLLECTIONS.SAVED_RECIPES,
          [Query.limit(10), Query.orderDesc('$createdAt')]
        )

        if (organicResponse.documents && organicResponse.documents.length > 0) {
           const cachedRecipes = organicResponse.documents.map((doc: any) => ({
              id: doc.recipeId || doc.$id,
              title: doc.title,
              image: doc.image,
              readyInMinutes: doc.readyInMinutes || 30,
              servings: doc.servings || 2,
              calories: doc.calories,
              fat: doc.fat,
              protein: doc.protein,
              carbs: doc.carbs,
              netCarbs: doc.netCarbs ?? doc.carbs,
              ingredients: parseRecipeIngredients(doc.ingredients)
           }))

           const modeAwareRecipes = dietMode === 'keto'
             ? cachedRecipes.filter((recipe) => (recipe.netCarbs || recipe.carbs || 0) <= 15)
             : cachedRecipes
           
           // Remove duplicates by ID and take 12 max
           const uniqueOrganic = Array.from(new Map(modeAwareRecipes.map(item => [item.id, item])).values()).slice(0, 12)
           
           if (uniqueOrganic.length >= 4) { // Only use cache if we have a decent amount of recipes
              setRecipes(uniqueOrganic as Recipe[])
              setIsLoading(false)
              return // Stop here, instant load successful!
           }
        }
      } catch (err) {
        console.warn('No se pudo acceder a la caché orgánica, procediendo con IA:', err)
      }

      // 2. Fallback to AI (Llama-3 + Pexels)
      try {
        const keywords = dietMode === 'keto'
          ? ['keto', 'low carb', 'cetogenica', 'keto breakfast', 'keto dinner', 'keto snack', 'keto salmon', 'keto avocado']
          : ['comfort food', 'healthy dinner', 'easy chicken', 'avocado brunch', 'quick pasta', 'fresh salad', 'homemade soup', 'protein bowl']
        const randomKeyword = keywords[Math.floor(Math.random() * keywords.length)]
        
        const response = await fetch(`/api/recipes/search?query=${encodeURIComponent(randomKeyword)}&mode=${dietMode}`)
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
  }, [dietMode])

  useEffect(() => {
    const activeQuery = searchParams.get('query')?.trim()
    const activeMode = searchParams.get('mode') === 'flexible' ? 'flexible' : 'keto'

    if (!activeQuery) {
      return
    }

    const searchKey = `${activeMode}:${activeQuery}`
    if (lastSearchRef.current === searchKey) {
      return
    }

    lastSearchRef.current = searchKey
    void searchRecipes(activeQuery, activeMode)
  }, [searchParams, searchRecipes])

  const handleDietModeChange = (mode: DietMode) => {
    setDietMode(mode)
    const params = new URLSearchParams(searchParams.toString())
    params.set('mode', mode)
    if (query.trim()) {
      params.set('query', query.trim())
    } else {
      params.delete('query')
    }
    router.replace(`/recipes?${params.toString()}`)
  }

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
    <div className="flex flex-col gap-6 p-4 sm:p-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      
      {/* ── HEADER ── */}
      <header className="flex flex-col gap-1 pt-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-2xl shadow-inner">
            <ChefHat className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tighter">Explorar</h1>
        </div>
        <p className="text-sm font-semibold text-muted-foreground ml-1">
          {dietMode === 'keto' ? 'Inspiración cetogénica de nivel Chef' : 'Ideas ricas para comer bien, sin rigidez keto'}
        </p>
      </header>

      {/* ── SEARCH BAR (IMMERSIBA) ── */}
      <div className="relative z-20 group">
        <div className="absolute -inset-1 rounded-3xl bg-linear-to-r from-primary/30 to-accent/30 opacity-40 blur-lg transition duration-1000 group-focus-within:opacity-100" />
        <form onSubmit={handleSearch} className="relative flex gap-2 bg-card/60 backdrop-blur-2xl border border-border/50 p-2 rounded-2xl shadow-xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="search"
              placeholder={dietMode === 'keto' ? 'Busca recetas keto reales (ej. salmón, aguacate...)' : '¿Qué te apetece hoy? (ej. pasta, salmón, pizza...)'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 border-0 bg-transparent text-base h-12 focus-visible:ring-0 placeholder:text-muted-foreground/40 font-medium"
            />
          </div>
          <Button type="submit" disabled={isLoading} className="h-12 w-12 sm:w-auto px-4 rounded-xl font-black bg-primary text-primary-foreground shadow-lg active:scale-95 transition-all">
            <Sparkles className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">Descubrir</span>
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={dietMode === 'keto' ? 'default' : 'outline'}
          className="rounded-full font-bold"
          onClick={() => handleDietModeChange('keto')}
        >
          Keto estricto
        </Button>
        <Button
          type="button"
          variant={dietMode === 'flexible' ? 'default' : 'outline'}
          className="rounded-full font-bold"
          onClick={() => handleDietModeChange('flexible')}
        >
          Flexible
        </Button>
        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold">
          Modo actual: {modeLabel}
        </Badge>
      </div>

      {/* ── ERROR STATE ── */}
      {error && (
        <Card className="border-destructive/20 bg-destructive/5 rounded-3xl overflow-hidden">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="p-3 bg-destructive/10 rounded-2xl">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-destructive uppercase tracking-widest">Error de Conexión</p>
              <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && hasSearched && recipes.length === 0 && (
        <Card className="border-border/60 bg-card/40 rounded-3xl overflow-hidden">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Sin resultados válidos</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              No encontré recetas que encajaran con el modo <span className="font-bold text-foreground">{modeLabel}</span>. Prueba con otro ingrediente o cambia a modo flexible.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── SYMMETRIC GRID ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        
        {/* Loading Skeletons */}
        {isLoading && (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i}>
              <Card className="overflow-hidden border-border/50 rounded-3xl h-full">
                <Skeleton className="aspect-[4/5] w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-12 rounded-full" />
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ))
        )}

        {/* Recipe Cards */}
        {!isLoading && recipes.map((recipe, index) => (
          <div key={recipe.id}>
            <Card
              className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border-border/40 bg-card/40 backdrop-blur-md shadow-xs transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl"
              onClick={() => openRecipeDetail(recipe)}
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted/20">
                <RecipeGridImage
                  src={recipe.image}
                  alt={recipe.title}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                
                {/* Save Button */}
                <Button
                  variant="secondary"
                  size="icon"
                  className={cn(
                    "absolute right-3 top-3 h-10 w-10 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 hover:bg-white/20 active:scale-95 transition-all text-white",
                    savedRecipeIds.has(recipe.id) && "bg-white/90 text-red-500 border-white shadow-lg"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSaveRecipe(recipe)
                  }}
                >
                  <Heart className={cn("h-5 w-5", savedRecipeIds.has(recipe.id) && "fill-current")} />
                </Button>

                {/* Info Overlay */}
                <div className="absolute bottom-3 left-3 right-3 text-white flex flex-col gap-1">
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-80">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {recipe.readyInMinutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {recipe.servings} p.
                    </span>
                  </div>
                  <h3 className="text-sm font-black leading-tight line-clamp-2 drop-shadow-lg">
                    {recipe.title}
                  </h3>
                </div>
              </div>
              
              <CardContent className="mt-auto p-3">
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Badge variant="secondary" className="bg-primary/5 text-primary border-0 text-[9px] font-black uppercase tracking-tighter px-2">
                    {Math.round(recipe.netCarbs)}g NET
                  </Badge>
                  <Badge variant="outline" className="border-border/50 text-muted-foreground text-[9px] font-bold px-2">
                    {Math.round(recipe.calories)} KCAL
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* ── RECIPE DETAIL SHEET ── */}
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
