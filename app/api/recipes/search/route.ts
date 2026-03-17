import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ recipes: [] });
  }

  const appId = process.env.EDAMAM_RECIPE_APP_ID;
  const appKey = process.env.EDAMAM_RECIPE_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json({ error: 'Edamam recipe credentials not configured' }, { status: 500 });
  }

  try {
    // Edamam Recipe Search API
    // type=public search for recipes
    // health=keto-friendly for automatic keto filtering
    const url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(query)}&app_id=${appId}&app_key=${appKey}&health=keto-friendly&lang=es`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Edamam Recipe API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Normalize Edamam recipe response
    const normalizedRecipes = (data.hits || []).map((hit: any) => {
      const recipe = hit.recipe;
      const nutrients = recipe.totalNutrients || {};

      return {
        id: recipe.uri.split('#recipe_')[1] || recipe.uri,
        title: recipe.label,
        image: recipe.image,
        source: recipe.source,
        url: recipe.url,
        servings: recipe.yield || 1,
        calories: Math.round(recipe.calories / (recipe.yield || 1)),
        fat: Math.round((nutrients.FAT?.quantity || 0) / (recipe.yield || 1)),
        protein: Math.round((nutrients.PROCNT?.quantity || 0) / (recipe.yield || 1)),
        carbs: Math.round((nutrients.CHOCDF?.quantity || 0) / (recipe.yield || 1)),
        netCarbs: Math.round(((nutrients.CHOCDF?.quantity || 0) - (nutrients.FIBTG?.quantity || 0)) / (recipe.yield || 1)),
        dietLabels: recipe.dietLabels,
        healthLabels: recipe.healthLabels,
        ingredients: recipe.ingredientLines,
      };
    });

    return NextResponse.json({ 
      recipes: normalizedRecipes,
      _debug: normalizedRecipes.length === 0 ? data : undefined
    });
  } catch (error) {
    console.error('Edamam recipe search error:', error);
    return NextResponse.json({ 
      error: 'Failed to search recipes', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
