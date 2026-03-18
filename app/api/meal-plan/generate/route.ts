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

IMPORTANTE: Todos los textos (títulos, ingredientes, instrucciones) deben generarse obligatoriamente en ESPAÑOL, excepto imageSearchTerm que debe ser en inglés.

Genera un plan de 7 días con recetas keto variadas.
Deben ser bajas en carbohidratos netos (menos de 15g por receta) y altas en grasas saludables.
Responde ÚNICAMENTE en JSON válido con la siguiente estructura exacta:
{
  "days": [
    {
      "day": 0,
      "breakfast": {
        "title": "Nombre del desayuno",
        "imageSearchTerm": "eggs bacon",
        "readyInMinutes": 15,
        "servings": 2,
        "calories": 400,
        "fat": 30,
        "protein": 20,
        "carbs": 5,
        "ingredients": ["ingrediente 1"],
        "instructions": ["Paso 1", "Paso 2"]
      },
      "lunch": {
        "title": "Nombre del almuerzo",
        "imageSearchTerm": "chicken salad",
        "readyInMinutes": 20,
        "servings": 2,
        "calories": 600,
        "fat": 45,
        "protein": 35,
        "carbs": 8,
        "ingredients": ["ingrediente 1"],
        "instructions": ["Paso 1", "Paso 2"]
      },
      "dinner": {
        "title": "Nombre de la cena",
        "imageSearchTerm": "steak broccoli",
        "readyInMinutes": 30,
        "servings": 2,
        "calories": 550,
        "fat": 40,
        "protein": 30,
        "carbs": 10,
        "ingredients": ["ingrediente 1"],
        "instructions": ["Paso 1", "Paso 2"]
      }
    }
  ]
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
             const searchQuery = encodeURIComponent((mealObj.imageSearchTerm || mealObj.title) + " food plating"); 
             const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${searchQuery}&per_page=8`, {
                headers: { 'Authorization': pexelsApiKey }
             });
             if (pexelsRes.ok) {
                 const pexelsData = await pexelsRes.json();
                 if (pexelsData.photos && pexelsData.photos.length > 0) {
                     const randomIdx = Math.floor(Math.random() * pexelsData.photos.length);
                     imageUrl = pexelsData.photos[randomIdx].src.medium;
                 }
             }
           } catch(e) {}
       }
       return {
         id: `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`,
         title: mealObj.title,
         image: imageUrl,
         readyInMinutes: mealObj.readyInMinutes || 20,
         servings: mealObj.servings || 2,
         calories: Math.round(mealObj.calories),
         fat: Math.round(mealObj.fat),
         protein: Math.round(mealObj.protein),
         carbs: Math.round(mealObj.carbs),
         ingredients: mealObj.ingredients || [],
         ingredientLines: mealObj.ingredients || [], // Duplicate for backward compatibility with UI
         instructions: mealObj.instructions || [],
       };
    };

    const daysArray = parsedMeals.days || [];
    
    const weekPlanPromises = daysArray.map(async (dayData: any) => {
      const b = await attachImage(dayData.breakfast, 'breakfast');
      const l = await attachImage(dayData.lunch, 'lunch');
      const d = await attachImage(dayData.dinner, 'dinner');
      return {
        day: dayData.day,
        breakfast: b,
        lunch: l,
        dinner: d,
      };
    });

    const weekPlan = await Promise.all(weekPlanPromises);

    return NextResponse.json({
      plan: weekPlan,
      totalRecipes: { breakfast: 7, lunch: 7, dinner: 7 },
    });

  } catch (error) {
    console.error('Error in Groq meal plan generation:', error);
    return NextResponse.json({ 
      error: 'Error al generar el plan', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
