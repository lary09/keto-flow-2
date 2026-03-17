import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ recipes: [] });
  }

  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json({ error: 'Edamam credentials not configured' }, { status: 500 });
  }

  try {
    // Edamam Food Database API
    // Using &lang=es for Spanish results
    const url = `https://api.edamam.com/api/food-database/v2/parser?app_id=${appId}&app_key=${appKey}&ingr=${encodeURIComponent(query)}&lang=es`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Edamam API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Normalize Edamam response to match our UI expectations
    const normalizedFoods = (data.hints || []).map((hint: any) => {
      const food = hint.food;
      const nutrients = food.nutrients || {};

      // Proteins, Fats, and Carbs are usually per 100g or per serving in Edamam
      return {
        id: food.foodId,
        title: food.label,
        brand: food.brand || '',
        category: food.category,
        calories: Math.round(nutrients.ENERC_KCAL || 0),
        fat: parseFloat((nutrients.FAT || 0).toFixed(1)),
        protein: parseFloat((nutrients.PROCNT || 0).toFixed(1)),
        carbs: parseFloat((nutrients.CHOCDF || 0).toFixed(1)),
        netCarbs: parseFloat(((nutrients.CHOCDF || 0) - (nutrients.FIBTG || 0)).toFixed(1)), // Carbs - Fiber
        image: food.image,
      };
    });

    return NextResponse.json({ 
      recipes: normalizedFoods,
      _debug: normalizedFoods.length === 0 ? data : undefined
    });
  } catch (error) {
    console.error('Edamam search error:', error);
    return NextResponse.json({ 
      error: 'Failed to search food', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
