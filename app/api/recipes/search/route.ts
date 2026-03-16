import { NextRequest, NextResponse } from 'next/server'

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || 'edcb1567aa67409a8f492aea634f77a9'
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com'

export async function GET(request: NextRequest) {
  if (!SPOONACULAR_API_KEY) {
    return NextResponse.json(
      { error: 'Spoonacular API key not configured' },
      { status: 500 }
    )
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query') || ''
  const offset = searchParams.get('offset') || '0'
  const number = searchParams.get('number') || '10'

  try {
    const url = new URL(`${SPOONACULAR_BASE_URL}/recipes/complexSearch`)
    url.searchParams.set('apiKey', SPOONACULAR_API_KEY)
    url.searchParams.set('query', query)
    url.searchParams.set('diet', 'ketogenic')
    url.searchParams.set('addRecipeNutrition', 'true')
    url.searchParams.set('offset', offset)
    url.searchParams.set('number', number)
    url.searchParams.set('sort', 'popularity')

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Transform the data to a simpler format
    const recipes = data.results.map((recipe: {
      id: number
      title: string
      image: string
      readyInMinutes: number
      servings: number
      sourceUrl: string
      nutrition?: {
        nutrients: Array<{
          name: string
          amount: number
        }>
      }
    }) => {
      const nutrients = recipe.nutrition?.nutrients || []
      return {
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        readyInMinutes: recipe.readyInMinutes,
        servings: recipe.servings,
        sourceUrl: recipe.sourceUrl,
        calories: nutrients.find(n => n.name === 'Calories')?.amount || 0,
        fat: nutrients.find(n => n.name === 'Fat')?.amount || 0,
        protein: nutrients.find(n => n.name === 'Protein')?.amount || 0,
        carbs: nutrients.find(n => n.name === 'Carbohydrates')?.amount || 0,
        netCarbs: nutrients.find(n => n.name === 'Net Carbohydrates')?.amount || 
                  (nutrients.find(n => n.name === 'Carbohydrates')?.amount || 0) - 
                  (nutrients.find(n => n.name === 'Fiber')?.amount || 0),
      }
    })

    return NextResponse.json({
      recipes,
      totalResults: data.totalResults,
      offset: data.offset,
      number: data.number,
    })
  } catch (error) {
    console.error('Failed to search recipes:', error)
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    )
  }
}
