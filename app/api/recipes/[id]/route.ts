import { NextRequest, NextResponse } from 'next/server';
import { buildCacheKey, getCachedValue, setCachedValue } from '@/lib/ai-cache';

const RECIPE_DETAIL_TTL_MS = 1000 * 60 * 60 * 6;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const appId = process.env.EDAMAM_RECIPE_APP_ID;
  const appKey = process.env.EDAMAM_RECIPE_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json(
      { error: 'Edamam recipe credentials not configured' },
      { status: 500 }
    )
  }

  const { id } = await params;

  try {
    const cacheKey = buildCacheKey('recipe-detail', { id });
    const cached = getCachedValue<unknown>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    // Edamam expects the full URI or the ID. Since we store the ID, 
    // we reconstruct the URI: http://www.edamam.com/ontologies/edamam.owl#recipe_{id}
    const recipeUri = `http://www.edamam.com/ontologies/edamam.owl#recipe_${id}`;
    const url = `https://api.edamam.com/api/recipes/v2/by-uri?type=public&uri=${encodeURIComponent(recipeUri)}&app_id=${appId}&app_key=${appKey}&lang=es`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Edamam API error: ${response.status}`);
    }

    const data = await response.json();
    const recipe = data.hits?.[0]?.recipe;

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const nutrients = recipe.totalNutrients || {};

    const payload = {
      id: id,
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
      ingredientLines: recipe.ingredientLines,
      healthLabels: recipe.healthLabels,
      dietLabels: recipe.dietLabels,
    };

    setCachedValue(cacheKey, payload, RECIPE_DETAIL_TTL_MS);

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Failed to get recipe detail:', error);
    return NextResponse.json(
      { error: 'Failed to get recipe details', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
