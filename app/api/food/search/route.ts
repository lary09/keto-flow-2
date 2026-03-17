import { NextRequest, NextResponse } from 'next/server';
import { getFatSecretToken } from '@/lib/fatsecret/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    const token = await getFatSecretToken();
    
    // FatSecret API uses a method-based approach
    const url = new URL('https://platform.fatsecret.com/rest/server.api');
    url.searchParams.set('method', 'foods.search');
    url.searchParams.set('search_expression', query);
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`FatSecret API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('FatSecret API raw response keys:', Object.keys(data));
    
    // FatSecret results can be deeply nested: foods.results.food OR foods_search.results.food
    const foodsRoot = data.foods_search || data.foods;
    const foodResults = foodsRoot?.results?.food || foodsRoot?.food || [];
    const foods = Array.isArray(foodResults) ? foodResults : (foodResults ? [foodResults] : []);
    
    console.log(`Found ${foods.length} foods from FatSecret`);

    const normalizedFoods = foods.filter((f: any) => f && f.food_name).map((food: any) => {
      const desc = food.food_description || '';
      
      // calories are usually in "Calories: 123kcal" or just "123kcal"
      const calories = parseFloat(desc.match(/Calories:\s*(\d+)/i)?.[1] || desc.match(/(\d+)kcal/i)?.[1] || '0');
      const fat = parseFloat(desc.match(/Fat:\s*([\d.]+)g/i)?.[1] || '0');
      const carbs = parseFloat(desc.match(/Carbs:\s*([\d.]+)g/i)?.[1] || '0');
      const protein = parseFloat(desc.match(/Protein:\s*([\d.]+)g/i)?.[1] || '0');

      return {
        id: food.food_id,
        title: food.food_name,
        brand: food.brand_name || '',
        type: food.food_type,
        calories,
        fat,
        protein,
        carbs,
        netCarbs: carbs, 
        description: desc,
      };
    });

    return NextResponse.json({ recipes: normalizedFoods });
  } catch (error) {
    console.error('FatSecret search error detail:', error);
    return NextResponse.json({ 
      error: 'Failed to search food', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
