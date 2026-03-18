import { NextRequest, NextResponse } from 'next/server';

// Simple translation map for common keto ingredients to improve Edamam hits
const TRANSLATIONS: Record<string, string> = {
  'huevo': 'egg',
  'huevos': 'eggs',
  'aguacate': 'avocado',
  'tocino': 'bacon',
  'pollo': 'chicken',
  'carne': 'meat',
  'pescado': 'fish',
  'salmon': 'salmon',
  'salmón': 'salmon',
  'atún': 'tuna',
  'queso': 'cheese',
  'mantequilla': 'butter',
  'aceite': 'oil',
  'oliva': 'olive',
  'espinaca': 'spinach',
  'espinacas': 'spinach',
  'brócoli': 'broccoli',
  'coliflor': 'cauliflower',
  'almendras': 'almonds',
  'nueces': 'walnuts',
  'carne picada': 'ground beef',
  'pechuga': 'breast',
}

export async function POST(request: NextRequest) {
  const appId = process.env.EDAMAM_RECIPE_APP_ID;
  const appKey = process.env.EDAMAM_RECIPE_APP_KEY;

  if (!appId || !appKey) {
    return NextResponse.json(
      { error: 'Edamam recipe credentials not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const ingredients: string[] = body.ingredients || [];

    // Translate ingredients to English for better search results
    const translatedIngredients = ingredients.map(ing => {
      const lower = ing.toLowerCase().trim();
      return TRANSLATIONS[lower] || lower;
    });

    // Build the ingredient query string (max 3 for better hits)
    const ingredientQuery = translatedIngredients.slice(0, 3).join(' ');

    const fetchRecipes = async (keywords: string, retryWithoutIngredients = false) => {
      const q = retryWithoutIngredients ? keywords : `${keywords} ${ingredientQuery}`;
      const url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(q)}&app_id=${appId}&app_key=${appKey}&health=keto-friendly&random=true&lang=en`;

      try {
        const response = await fetch(url);
        
        if (response.status === 429) {
          throw new Error('API_LIMIT_REACHED');
        }

        if (!response.ok) {
          console.error(`Edamam API error: ${response.status}`);
          return [];
        }

        const data = await response.json();
        const hits = data.hits || [];

        // If no hits and we haven't retried yet, try a broader search
        if (hits.length === 0 && !retryWithoutIngredients && ingredientQuery) {
          console.log(`No hits for "${q}", retrying broad search for "${keywords}"`);
          return fetchRecipes(keywords, true);
        }

        return hits.map((hit: any) => {
          const recipe = hit.recipe;
          const nutrients = recipe.totalNutrients || {};
          const servings = recipe.yield || 1;

          return {
            id: recipe.uri.split('#recipe_')[1] || recipe.uri,
            title: recipe.label,
            image: recipe.image,
            source: recipe.source,
            servings,
            readyInMinutes: recipe.totalTime || 30,
            calories: Math.round(recipe.calories / servings),
            fat: Math.round((nutrients.FAT?.quantity || 0) / servings),
            protein: Math.round((nutrients.PROCNT?.quantity || 0) / servings),
            carbs: Math.round((nutrients.CHOCDF?.quantity || 0) / servings),
            netCarbs: Math.round(
              ((nutrients.CHOCDF?.quantity || 0) - (nutrients.FIBTG?.quantity || 0)) / servings
            ),
            ingredients: recipe.ingredientLines,
          };
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'API_LIMIT_REACHED') throw error;
        console.error('Fetch error:', error);
        return [];
      }
    };

    // Sequential fetching to avoid burst limit (Edamam free tier is ~10/min)
    const breakfastRecipes = await fetchRecipes('keto breakfast');
    const lunchRecipes = await fetchRecipes('keto lunch');
    const dinnerRecipes = await fetchRecipes('keto dinner');

    const weekPlan = Array.from({ length: 7 }, (_, dayIndex) => ({
      day: dayIndex,
      breakfast: breakfastRecipes[dayIndex % (breakfastRecipes.length || 1)] || null,
      lunch: lunchRecipes[dayIndex % (lunchRecipes.length || 1)] || null,
      dinner: dinnerRecipes[dayIndex % (dinnerRecipes.length || 1)] || null,
    }));

    return NextResponse.json({
      plan: weekPlan,
      totalRecipes: {
        breakfast: breakfastRecipes.length,
        lunch: lunchRecipes.length,
        dinner: dinnerRecipes.length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'API_LIMIT_REACHED') {
      return NextResponse.json(
        { error: 'Límite de búsqueda alcanzado. Por favor, espera 1 minuto e inténtalo de nuevo.', code: 'RATE_LIMIT' },
        { status: 429 }
      );
    }

    console.error('Meal plan generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate meal plan',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
