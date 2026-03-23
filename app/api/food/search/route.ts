import { NextRequest, NextResponse } from 'next/server';
import { buildCacheKey, getCachedValue, setCachedValue } from '@/lib/ai-cache';

const FOOD_SEARCH_TTL_MS = 1000 * 60 * 30;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim();

  if (!query) {
    return NextResponse.json({ recipes: [] });
  }

  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return NextResponse.json({ error: 'Falta configurar GROQ_API_KEY en tu .env' }, { status: 500 });
  }

  try {
    const normalizedQuery = query.toLowerCase();
    const cacheKey = buildCacheKey('food-search', { query: normalizedQuery });
    const cached = getCachedValue<unknown>(cacheKey);

    if (cached) {
      return NextResponse.json({ ...cached, source: 'cache' });
    }

    // 1. Check Appwrite for cached community foods first
    const { databases, APPWRITE_DATABASE_ID, COLLECTIONS, Query } = await import('@/lib/appwrite');
    
    try {
      const localResult = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.COMMUNITY_FOODS,
        [Query.search('foodName', query)]
      );

      if (localResult.documents.length > 0) {
        const normalizedLocal = localResult.documents.map((doc: any) => ({
          id: doc.$id,
          title: doc.foodName,
          calories: doc.calories,
          fat: doc.fat,
          protein: doc.protein,
          carbs: doc.carbs,
          servingSize: doc.servingSize,
          isCommunity: true
        }));
        
        const payload = { recipes: normalizedLocal, source: 'local' };
        setCachedValue(cacheKey, payload, FOOD_SEARCH_TTL_MS);
        return NextResponse.json(payload);
      }
    } catch (e) {
      console.warn('Local search failed, falling back to LLM:', e);
    }

    // 2. Fallback to LLM for Food Parsing
    const systemPrompt = `Actúa como una base de datos nutricional Keto. El usuario busca información nutricional para: "${query}".
Devuelve entre 3 y 5 opciones o variantes realistas de este alimento (por ejemplo, cocido, crudo, frito, o diferentes marcas comunes).
Los macros deben ser precisos y calculados por cada 100g o por una porción normal (especifícalo en brand o categoría si quieres).
Devuelve ÚNICAMENTE un JSON con esta estructura exacta:
{
  "foods": [
    {
      "id": "generar-un-id-unico",
      "title": "Nombre del alimento",
      "brand": "Genérico",
      "category": "Generic foods",
      "calories": 160,
      "fat": 15,
      "protein": 2,
      "carbs": 9,
      "netCarbs": 2,
      "image": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80"
    }
  ]
}`;

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', 
        messages: [{ role: 'system', content: 'Solo devuelves JSON válido, sin formato adicional.' }, { role: 'user', content: systemPrompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiRes.ok) {
      throw new Error(`Groq API error: ${aiRes.status}`);
    }

    const data = await aiRes.json();
    const resultJson = JSON.parse(data.choices[0].message.content);
    
    // Normalize to match expectation (the UI expects 'recipes' array for food search too)
    const normalizedFoods = (resultJson.foods || []).map((food: any) => ({
        id: food.id,
        title: food.title,
        brand: food.brand || '',
        category: food.category,
        calories: Math.round(food.calories || 0),
        fat: parseFloat((food.fat || 0).toFixed(1)),
        protein: parseFloat((food.protein || 0).toFixed(1)),
        carbs: parseFloat((food.carbs || 0).toFixed(1)),
        netCarbs: parseFloat((food.netCarbs || 0).toFixed(1)),
        image: food.image,
    }));

    const payload = { recipes: normalizedFoods, source: 'llm' };
    setCachedValue(cacheKey, payload, FOOD_SEARCH_TTL_MS);

    return NextResponse.json(payload);
  } catch (error) {
    console.error('LLM search error:', error);
    return NextResponse.json({ 
      error: 'Failed to search food via LLM', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
