import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildCacheKey, getCachedValue, setCachedValue } from '@/lib/ai-cache'

const rawRecipeSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  imageSearchTerm: z.string().optional(),
  readyInMinutes: z.coerce.number().optional(),
  servings: z.coerce.number().optional(),
  calories: z.coerce.number().optional(),
  fat: z.coerce.number().optional(),
  protein: z.coerce.number().optional(),
  carbs: z.coerce.number().optional(),
  netCarbs: z.coerce.number().optional(),
  ingredients: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
})

const rawResponseSchema = z.object({
  reasoning: z.string().optional(),
  recipes: z.array(rawRecipeSchema).min(1).max(12),
})

const recipeSchema = z.object({
  id: z.string().min(2),
  title: z.string().min(3),
  imageSearchTerm: z.string().min(2).max(80),
  readyInMinutes: z.number().min(5).max(180),
  servings: z.number().min(1).max(8),
  calories: z.number().min(50).max(2200),
  fat: z.number().min(1).max(220),
  protein: z.number().min(1).max(170),
  carbs: z.number().min(0).max(90),
  netCarbs: z.number().min(0).max(60),
  ingredients: z.array(z.string()).min(3).max(10),
  instructions: z.array(z.string()).min(2).max(5),
})

const dietModeSchema = z.enum(['keto', 'flexible'])
const RECIPES_TTL_MS = 1000 * 60 * 30
const IMAGE_TTL_MS = 1000 * 60 * 60 * 12
const DEFAULT_RECIPE_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'

const KETO_BLOCKED_TERMS = [
  'pan',
  'bread',
  'tostada',
  'tortilla de harina',
  'pasta',
  'spaghetti',
  'macarrones',
  'rice',
  'arroz',
  'papa',
  'patata',
  'potato',
  'avena',
  'oats',
  'harina',
  'flour',
  'maiz',
  'maíz',
  'corn',
  'frijol',
  'frijoles',
  'beans',
  'azúcar',
  'azucar',
  'sugar',
]

function sanitizeSearchTerm(value: string) {
  return value
    .replace(/keto|recipe|diet|low carb/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function safeRecipeId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function fillArray(values: string[], minimum: number, fallbackPool: string[]) {
  const result = [...values]

  for (const fallback of fallbackPool) {
    if (result.length >= minimum) break
    if (!result.includes(fallback)) {
      result.push(fallback)
    }
  }

  return result
}

function normalizeRecipe(
  recipe: z.infer<typeof rawRecipeSchema>,
  index: number,
  mode: z.infer<typeof dietModeSchema>,
  query: string
) {
  const title = recipe.title?.trim() || `${mode === 'keto' ? 'Receta keto' : 'Receta'} ${index + 1}`
  const baseIngredients = (recipe.ingredients || [])
    .map((ingredient) => ingredient.trim())
    .filter(Boolean)

  const ingredients = fillArray(
    baseIngredients,
    3,
    mode === 'keto'
      ? ['aceite de oliva', 'sal', 'pimienta']
      : ['aceite de oliva', 'sal', 'hierbas frescas']
  ).slice(0, 10)

  const instructions = fillArray(
    (recipe.instructions || [])
      .map((instruction) => instruction.trim())
      .filter(Boolean),
    2,
    ['Ajusta sazón al gusto.', 'Sirve de inmediato.']
  ).slice(0, 5)

  const carbs = Math.max(0, Number(recipe.carbs || 0))
  const netCarbs = Math.max(0, Number(recipe.netCarbs ?? carbs))
  const normalized = {
    id: safeRecipeId(recipe.id?.trim() || title),
    title,
    imageSearchTerm: (recipe.imageSearchTerm?.trim() || query).slice(0, 80),
    readyInMinutes: Math.min(180, Math.max(5, Math.round(Number(recipe.readyInMinutes || 20)))),
    servings: Math.min(8, Math.max(1, Math.round(Number(recipe.servings || 2)))),
    calories: Math.min(2200, Math.max(50, Math.round(Number(recipe.calories || 320)))),
    fat: Math.min(220, Math.max(1, Math.round(Number(recipe.fat || 12)))),
    protein: Math.min(170, Math.max(1, Math.round(Number(recipe.protein || 12)))),
    carbs: Math.min(90, Math.round(carbs)),
    netCarbs: Math.min(60, Math.round(netCarbs)),
    ingredients,
    instructions,
  }

  return recipeSchema.safeParse(normalized)
}

function isStrictKetoRecipe(recipe: z.infer<typeof recipeSchema>) {
  if (recipe.netCarbs > 15 || recipe.carbs > 18) {
    return false
  }

  const haystack = normalizeText([
    recipe.title,
    recipe.imageSearchTerm,
    ...recipe.ingredients,
  ].join(' | '))

  return !KETO_BLOCKED_TERMS.some((term) => haystack.includes(normalizeText(term)))
}

async function resolveRecipeImage(searchTerm: string, pexelsApiKey?: string) {
  const cleanSearchTerm = sanitizeSearchTerm(searchTerm) || 'food'
  const cacheKey = buildCacheKey('recipe-image', cleanSearchTerm)
  const cached = getCachedValue<string>(cacheKey)

  if (cached) return cached

  let imageUrl = DEFAULT_RECIPE_IMAGE

  if (!pexelsApiKey) {
    return setCachedValue(cacheKey, imageUrl, IMAGE_TTL_MS)
  }

  try {
    const query = encodeURIComponent(`${cleanSearchTerm} plated dish food photography`)
    const response = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=1&page=1`, {
      headers: { Authorization: pexelsApiKey },
      next: { revalidate: 60 * 60 * 12 },
    })

    if (response.ok) {
      const data = await response.json()
      const photo = data.photos?.[0]
      if (photo?.src?.large || photo?.src?.medium) {
        imageUrl = photo.src.large || photo.src.medium
      }
    }
  } catch (error) {
    console.warn('Pexels error, using fallback image.', error)
  }

  return setCachedValue(cacheKey, imageUrl, IMAGE_TTL_MS)
}

function buildPrompt(query: string, limit: number, mode: z.infer<typeof dietModeSchema>) {
  if (mode === 'keto') {
    return `Genera ${limit} recetas keto estrictas para la búsqueda "${query}".

Reglas:
- Responde SOLO JSON válido.
- Todas las recetas deben ser verdaderamente keto, con netCarbs <= 15.
- Prohibido incluir pan, tostadas, arroz, pasta, avena, harina, maíz, azúcar, papas o frijoles.
- Si te falta un dato, completa con una opción razonable en vez de dejarlo vacío.
- Máximo 8 ingredientes por receta.
- Máximo 4 instrucciones cortas por receta.
- Textos en español.
- imageSearchTerm en inglés, simple y sin "keto", "recipe" o "diet".
- Títulos apetitosos, fáciles de leer y no demasiado largos.

Formato exacto:
{
  "reasoning": "máximo 160 caracteres",
  "recipes": [
    {
      "id": "slug-unico",
      "title": "",
      "imageSearchTerm": "",
      "readyInMinutes": 25,
      "servings": 2,
      "calories": 450,
      "fat": 32,
      "protein": 28,
      "carbs": 10,
      "netCarbs": 7,
      "ingredients": ["..."],
      "instructions": ["..."]
    }
  ]
}`
  }

  return `Genera ${limit} recetas ricas y variadas para la búsqueda "${query}".

Reglas:
- Responde SOLO JSON válido.
- No hace falta que sean keto estrictas.
- Si te falta un dato, completa con una opción razonable en vez de dejarlo vacío.
- Mantén las recetas fáciles de cocinar y coherentes con la búsqueda.
- Máximo 10 ingredientes por receta.
- Máximo 5 instrucciones cortas por receta.
- Textos en español.
- imageSearchTerm en inglés, simple y sin "keto", "recipe" o "diet".
- Títulos apetitosos, fáciles de leer y no demasiado largos.

Formato exacto:
{
  "reasoning": "máximo 160 caracteres",
  "recipes": [
    {
      "id": "slug-unico",
      "title": "",
      "imageSearchTerm": "",
      "readyInMinutes": 25,
      "servings": 2,
      "calories": 550,
      "fat": 24,
      "protein": 28,
      "carbs": 32,
      "netCarbs": 28,
      "ingredients": ["..."],
      "instructions": ["..."]
    }
  ]
}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')?.trim()
  const limit = Math.min(Number(searchParams.get('number') || '8'), 12)
  const mode = dietModeSchema.parse(searchParams.get('mode') || 'keto')

  if (!query) {
    return NextResponse.json({ recipes: [], mode })
  }

  const groqApiKey = process.env.GROQ_API_KEY
  const pexelsApiKey = process.env.PEXELS_API_KEY

  if (!groqApiKey) {
    return NextResponse.json({ error: 'Falta configurar GROQ_API_KEY en tu .env' }, { status: 500 })
  }

  try {
    const normalizedQuery = query.toLowerCase()
    const cacheKey = buildCacheKey('recipes-search', { query: normalizedQuery, limit, mode })
    const cached = getCachedValue<unknown>(cacheKey)

    if (cached) {
      return NextResponse.json({ ...cached, source: 'cache' })
    }

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Solo devuelves JSON válido, sin texto adicional.' },
          { role: 'user', content: buildPrompt(query, limit, mode) },
        ],
        temperature: mode === 'keto' ? 0.15 : 0.25,
        max_tokens: 2600,
        response_format: { type: 'json_object' },
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('GROQ_RAW:', errText)
      throw new Error(`Groq API Error: ${aiRes.status} - ${errText}`)
    }

    const data = await aiRes.json()
    const resultJson = rawResponseSchema.parse(JSON.parse(data.choices[0].message.content))
    const normalizedRecipes = resultJson.recipes
      .slice(0, limit)
      .flatMap((recipe, index) => {
        const normalized = normalizeRecipe(recipe, index, mode, query)
        return normalized.success ? [normalized.data] : []
      })

    const validRecipes = mode === 'keto'
      ? normalizedRecipes.filter(isStrictKetoRecipe)
      : normalizedRecipes

    const recipesWithImages = await Promise.all(
      validRecipes.map(async (recipe) => ({
        ...recipe,
        image: await resolveRecipeImage(recipe.imageSearchTerm || recipe.title, pexelsApiKey),
      }))
    )

    const payload = {
      recipes: recipesWithImages,
      mode,
      source: 'llm',
      filteredOut: normalizedRecipes.length - validRecipes.length,
    }
    setCachedValue(cacheKey, payload, RECIPES_TTL_MS)

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error generating AI recipes:', error)
    return NextResponse.json({
      error: 'Error al buscar/generar recetas',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
