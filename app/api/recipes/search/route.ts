import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildCacheKey, getCachedValue, setCachedValue } from '@/lib/ai-cache'

const recipeSchema = z.object({
  id: z.string().min(2),
  title: z.string().min(3),
  imageSearchTerm: z.string().min(2).max(80),
  readyInMinutes: z.number().min(5).max(180),
  servings: z.number().min(1).max(8),
  calories: z.number().min(50).max(2000),
  fat: z.number().min(1).max(200),
  protein: z.number().min(1).max(150),
  carbs: z.number().min(0).max(20),
  netCarbs: z.number().min(0).max(15),
  ingredients: z.array(z.string()).min(3).max(8),
  instructions: z.array(z.string()).min(2).max(4),
})

const responseSchema = z.object({
  reasoning: z.string().optional(),
  recipes: z.array(recipeSchema).min(1).max(12),
})

const RECIPES_TTL_MS = 1000 * 60 * 30
const IMAGE_TTL_MS = 1000 * 60 * 60 * 12
const DEFAULT_RECIPE_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'

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

function buildPrompt(query: string, limit: number) {
  return `Genera ${limit} recetas keto para la búsqueda "${query}".

Reglas:
- Responde SOLO JSON válido.
- Todas las recetas con netCarbs <= 15.
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')?.trim()
  const limit = Math.min(Number(searchParams.get('number') || '8'), 12)

  if (!query) {
    return NextResponse.json({ recipes: [] })
  }

  const groqApiKey = process.env.GROQ_API_KEY
  const pexelsApiKey = process.env.PEXELS_API_KEY

  if (!groqApiKey) {
    return NextResponse.json({ error: 'Falta configurar GROQ_API_KEY en tu .env' }, { status: 500 })
  }

  try {
    const normalizedQuery = query.toLowerCase()
    const cacheKey = buildCacheKey('recipes-search', { query: normalizedQuery, limit })
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
          { role: 'user', content: buildPrompt(query, limit) },
        ],
        temperature: 0.2,
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
    const resultJson = responseSchema.parse(JSON.parse(data.choices[0].message.content))

    const recipesWithImages = await Promise.all(
      resultJson.recipes.slice(0, limit).map(async (recipe) => ({
        ...recipe,
        id: recipe.id ? safeRecipeId(recipe.id) : safeRecipeId(recipe.title),
        image: await resolveRecipeImage(recipe.imageSearchTerm || recipe.title, pexelsApiKey),
      }))
    )

    const payload = { recipes: recipesWithImages, source: 'llm' }
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
