import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  ingredients: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  const groqApiKey = process.env.GROQ_API_KEY;
  const pexelsApiKey = process.env.PEXELS_API_KEY;

  if (!groqApiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY no está configurada en el entorno' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { ingredients } = requestSchema.parse(body);

    const systemPrompt = `
Eres un chef experto en la dieta Cetogénica (Keto).
El usuario quiere recetas basadas principalmente en estos ingredientes que tiene: ${ingredients.join(', ')}.

Genera exactamente 3 recetas keto increíbles:
1. Un desayuno (breakfast)
2. Un almuerzo (lunch)
3. Una cena (dinner)

Deben ser bajas en carbohidratos netos (menos de 15g por receta) y altas en grasas saludables.
Responde ÚNICAMENTE en JSON válido con la siguiente estructura exacta:
{
  "breakfast": {
    "title": "Nombre del desayuno",
    "readyInMinutes": 15,
    "calories": 400,
    "fat": 30,
    "protein": 20,
    "carbs": 5,
    "ingredients": ["ingrediente 1", "ingrediente 2"]
  },
  "lunch": {
    "title": "Nombre del almuerzo",
    "readyInMinutes": 20,
    "calories": 600,
    "fat": 45,
    "protein": 35,
    "carbs": 8,
    "ingredients": ["ingrediente 1", "ingrediente 2"]
  },
  "dinner": {
    "title": "Nombre de la cena",
    "readyInMinutes": 30,
    "calories": 550,
    "fat": 40,
    "protein": 30,
    "carbs": 10,
    "ingredients": ["ingrediente 1", "ingrediente 2"]
  }
}
`;

    // Fetch from Groq API (Llama-3)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', 
        messages: [
          { role: 'system', content: 'You are a JSON-only API. Respond exclusively with valid JSON.' },
          { role: 'user', content: systemPrompt }
        ],
        temperature: 0.2, // Low temp for reliable JSON
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const parsedMeals = JSON.parse(data.choices[0].message.content);

    // Helpet function to add images via Pexels
    const attachImage = async (mealObj: any, defaultType: string) => {
       let imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
       if (pexelsApiKey) {
           try {
             const searchQuery = encodeURIComponent(mealObj.title + " keto " + defaultType); 
             const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${searchQuery}&per_page=1`, {
                headers: { 'Authorization': pexelsApiKey }
             });
             if (pexelsRes.ok) {
                 const pexelsData = await pexelsRes.json();
                 if (pexelsData.photos && pexelsData.photos.length > 0) {
                     imageUrl = pexelsData.photos[0].src.medium;
                 }
             }
           } catch(e) {}
       }
       return {
         id: `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`,
         title: mealObj.title,
         image: imageUrl,
         readyInMinutes: mealObj.readyInMinutes || 20,
         calories: Math.round(mealObj.calories),
         fat: Math.round(mealObj.fat),
         protein: Math.round(mealObj.protein),
         carbs: Math.round(mealObj.carbs),
         ingredients: mealObj.ingredients || [],
       };
    };

    const breakfast = await attachImage(parsedMeals.breakfast, 'breakfast');
    const lunch = await attachImage(parsedMeals.lunch, 'lunch');
    const dinner = await attachImage(parsedMeals.dinner, 'dinner');

    // Duplicate recipes across 7 days to match UI expectations
    const weekPlan = Array.from({ length: 7 }, (_, dayIndex) => ({
      day: dayIndex,
      breakfast: breakfast,
      lunch: lunch,
      dinner: dinner,
    }));

    return NextResponse.json({
      plan: weekPlan,
      totalRecipes: { breakfast: 1, lunch: 1, dinner: 1 },
    });

  } catch (error) {
    console.error('Error in Groq meal plan generation:', error);
    return NextResponse.json({ 
      error: 'Error al generar el plan', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
