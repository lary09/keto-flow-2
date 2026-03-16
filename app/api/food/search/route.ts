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
    url.searchParams.set('method', 'foods.search.v2');
    url.searchParams.set('search_expression', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('region', 'ES'); // Default to Spain for Spanish results, can be made dynamic
    url.searchParams.set('language', 'es');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`FatSecret API error: ${response.status}`);
    }

    const data = await response.json();
    
    // FatSecret API uses "foods_search" or "foods" depending on version
    const foodsResult = data.foods_search || data.foods;
    const foods = foodsResult?.results?.food || foodsResult?.food || [];
    
    const normalizedFoods = (Array.isArray(foods) ? foods : [foods]).filter(f => f && f.food_name).map((food: any) => {
      const desc = food.food_description || '';
      
      // Improved regex with case-insensitive and flexible spacing
      const calories = parseFloat(desc.match(/Calories:\s*(\d+)/i)?.[1] || '0');
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
