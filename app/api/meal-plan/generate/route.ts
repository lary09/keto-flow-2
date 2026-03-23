import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildCacheKey, getCachedValue, setCachedValue } from '@/lib/ai-cache'

const requestSchema = z.object({
  ingredients: z.array(z.string()).default([]),
  goals: z.object({
    calories: z.number().min(1200).max(5000),
    fat: z.number().min(20).max(400),
    protein: z.number().min(20).max(300),
    carbs: z.number().min(5).max(80),
  }).optional(),
  days: z.number().int().min(1).max(7).default(7),
})

const mealSchema = z.object({
  title: z.string().min(3),
  imageSearchTerm: z.string().min(2).max(80),
  readyInMinutes: z.number().min(5).max(180),
  servings: z.number().min(1).max(8),
  calories: z.number().min(50).max(2000),
  fat: z.number().min(1).max(200),
  protein: z.number().min(1).max(150),
  carbs: z.number().min(0).max(15),
  ingredients: z.array(z.string()).min(3).max(8),
  instructions: z.array(z.string()).min(2).max(4),
})

const responseSchema = z.object({
  reasoning: z.string().optional(),
  days: z.array(z.object({
    day: z.number().int().min(0).max(6),
    breakfast: mealSchema,
    lunch: mealSchema,
    dinner: mealSchema,
  })).min(1).max(7),
})

const DEFAULT_IMAGES = {
  breakfast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
  lunch: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  dinner: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
} as const

const PLAN_TTL_MS = 1000 * 60 * 30
const IMAGE_TTL_MS = 1000 * 60 * 60 * 12

type MealType = keyof typeof DEFAULT_IMAGES

function normalizeIngredients(ingredients: string[]) {
  return Array.from(
    new Set(
      ingredients
        .map((ingredient) => ingredient.trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 18)
}

function normalizeGoals(goals?: z.infer<typeof requestSchema>['goals']) {
  return goals ?? {
    calories: 2000,
    fat: 155,
    protein: 110,
    carbs: 25,
  }
}

function sanitizeSearchTerm(value: string) {
  return value
    .replace(/keto|recipe|diet|low carb/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

async function fetchMealImage(searchTerm: string, mealType: MealType, pexelsApiKey?: string) {
  const cleanSearchTerm = sanitizeSearchTerm(searchTerm) || mealType
  const cacheKey = buildCacheKey('pexels-image', { cleanSearchTerm, mealType })
  const cached = getCachedValue<string>(cacheKey)

  if (cached) {
    return cached
  }

  let imageUrl = DEFAULT_IMAGES[mealType]

  if (!pexelsApiKey) {
    return setCachedValue(cacheKey, imageUrl, IMAGE_TTL_MS)
  }

  try {
    const query = encodeURIComponent(`${cleanSearchTerm} food photography plated dish`)
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
    console.warn('Pexels image lookup failed, using fallback image.', error)
  }

  return setCachedValue(cacheKey, imageUrl, IMAGE_TTL_MS)
}

function buildPrompt({
  ingredients,
  goals,
  days,
}: {
  ingredients: string[]
  goals: ReturnType<typeof normalizeGoals>
  days: number
}) {
  return `
Eres un chef keto experto. Diseña un plan de ${days} día(s) usando principalmente estos ingredientes: ${ingredients.join(', ')}.

Objetivos diarios aproximados:
- calorías: ${goals.calories}
- grasa: ${goals.fat}g
- proteína: ${goals.protein}g
- carbohidratos netos máximos: ${goals.carbs}g

Reglas:
- Responde SOLO JSON válido.
- Devuelve días numerados desde 0.
- Cada comida debe tener menos de 15g de carbs.
- Máximo 8 ingredientes por receta.
- Máximo 4 instrucciones cortas por receta.
- Textos en español.
- imageSearchTerm en inglés, simple, sin palabras "keto", "diet" o "recipe".
- Usa títulos claros y apetitosos, pero compactos.

Formato exacto:
{
  "reasoning": "máximo 160 caracteres",
  "days": [
    {
      "day": 0,
      "breakfast": {
        "title": "",
        "imageSearchTerm": "",
        "readyInMinutes": 15,
        "servings": 2,
        "calories": 400,
        "fat": 30,
        "protein": 20,
        "carbs": 5,
        "ingredients": ["..."],
        "instructions": ["..."]
      },
      "lunch": {},
      "dinner": {}
    }
  ]
}
`
}

export async function POST(request: NextRequest) {
  const groqApiKey = process.env.GROQ_API_KEY
  const pexelsApiKey = process.env.PEXELS_API_KEY

  if (!groqApiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY no está configurada en el entorno' }, { status: 500 })
  }

  try {
    const body = requestSchema.parse(await request.json())
    const ingredients = normalizeIngredients(body.ingredients)
    const goals = normalizeGoals(body.goals)
    const days = body.days

    if (ingredients.length < 2) {
      return NextResponse.json({ error: 'Debes enviar al menos 2 ingredientes válidos.' }, { status: 400 })
    }

    const cacheKey = buildCacheKey('meal-plan', { ingredients, goals, days })
    const cachedPlan = getCachedValue<unknown>(cacheKey)

    if (cachedPlan) {
      return NextResponse.json({ ...cachedPlan, source: 'cache' })
    }

    const prompt = buildPrompt({ ingredients, goals, days })

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond exclusively with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.15,
        max_tokens: 3200,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`)
    }

    const data = await response.json()
    const rawPlan = JSON.parse(data.choices[0].message.content)
    const parsedPlan = responseSchema.parse(rawPlan)

    const plan = await Promise.all(parsedPlan.days.slice(0, days).map(async (dayData) => {
      const [breakfastImage, lunchImage, dinnerImage] = await Promise.all([
        fetchMealImage(dayData.breakfast.imageSearchTerm || dayData.breakfast.title, 'breakfast', pexelsApiKey),
        fetchMealImage(dayData.lunch.imageSearchTerm || dayData.lunch.title, 'lunch', pexelsApiKey),
        fetchMealImage(dayData.dinner.imageSearchTerm || dayData.dinner.title, 'dinner', pexelsApiKey),
      ])

      return {
        day: dayData.day,
        breakfast: {
          id: `ai_day${dayData.day}_breakfast_${dayData.breakfast.title.toLowerCase().replace(/\s+/g, '-')}`,
          ...dayData.breakfast,
          image: breakfastImage,
          ingredientLines: dayData.breakfast.ingredients,
        },
        lunch: {
          id: `ai_day${dayData.day}_lunch_${dayData.lunch.title.toLowerCase().replace(/\s+/g, '-')}`,
          ...dayData.lunch,
          image: lunchImage,
          ingredientLines: dayData.lunch.ingredients,
        },
        dinner: {
          id: `ai_day${dayData.day}_dinner_${dayData.dinner.title.toLowerCase().replace(/\s+/g, '-')}`,
          ...dayData.dinner,
          image: dinnerImage,
          ingredientLines: dayData.dinner.ingredients,
        },
      }
    }))

    const payload = {
      plan,
      goals,
      totalRecipes: {
        breakfast: plan.length,
        lunch: plan.length,
        dinner: plan.length,
      },
      generatedAt: new Date().toISOString(),
      source: 'llm',
    }

    setCachedValue(cacheKey, payload, PLAN_TTL_MS)

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error in Groq meal plan generation:', error)
    return NextResponse.json({
      error: 'Error al generar el plan',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
