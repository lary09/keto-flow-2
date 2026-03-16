import { NextRequest, NextResponse } from 'next/server'

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || 'edcb1567aa67409a8f492aea634f77a9'
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!SPOONACULAR_API_KEY) {
    return NextResponse.json(
      { error: 'Spoonacular API key not configured' },
      { status: 500 }
    )
  }

  const { id } = await params

  try {
    const url = new URL(`${SPOONACULAR_BASE_URL}/recipes/${id}/information`)
    url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
    url.searchParams.set('includeNutrition', 'true')

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.status}`)
    }

    const recipe = await response.json()
    const nutrients = recipe.nutrition?.nutrients || []

    return NextResponse.json({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      readyInMinutes: recipe.readyInMinutes,
      servings: recipe.servings,
      sourceUrl: recipe.sourceUrl,
      summary: recipe.summary,
      instructions: recipe.instructions,
      extendedIngredients: recipe.extendedIngredients?.map((ing: {
        id: number
        original: string
        name: string
        amount: number
        unit: string
        aisle: string
      }) => ({
        id: ing.id,
        original: ing.original,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        aisle: ing.aisle,
      })),
      analyzedInstructions: recipe.analyzedInstructions,
      nutrition: {
        calories: nutrients.find((n: { name: string; amount: number }) => n.name === 'Calories')?.amount || 0,
        fat: nutrients.find((n: { name: string; amount: number }) => n.name === 'Fat')?.amount || 0,
        protein: nutrients.find((n: { name: string; amount: number }) => n.name === 'Protein')?.amount || 0,
        carbs: nutrients.find((n: { name: string; amount: number }) => n.name === 'Carbohydrates')?.amount || 0,
        fiber: nutrients.find((n: { name: string; amount: number }) => n.name === 'Fiber')?.amount || 0,
        netCarbs: (nutrients.find((n: { name: string; amount: number }) => n.name === 'Carbohydrates')?.amount || 0) - 
                  (nutrients.find((n: { name: string; amount: number }) => n.name === 'Fiber')?.amount || 0),
      },
    })
  } catch (error) {
    console.error('Failed to get recipe:', error)
    return NextResponse.json(
      { error: 'Failed to get recipe details' },
      { status: 500 }
    )
  }
}
