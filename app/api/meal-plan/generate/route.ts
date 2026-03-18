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
Eres un chef experto de clase mundial y especialista en Keto.
El usuario quiere recetas basadas principalmente en estos ingredientes que tiene: ${ingredients.join(', ')}.

AGENTIC WORKFLOW: No respondas mecánicamente. Aplica principios de alta cocina (UI/UX Pro Max). Combina texturas, colores y métodos de cocción variados a lo largo de los días para que la semana no sea aburrida. 
Asegúrate rigurosamente de que CADA RECETA tenga menos de 15g de carbohidratos netos y sea alta en grasas saludables.

IMPORTANTE: Todos los textos DEBEN estar en ESPAÑOL, excepto imageSearchTerm que debe ser en INGLÉS (sólo ingredientes básicos como "sliced avocado egg", nunca "keto" o "recipe").

Primero, explica tu línea de razonamiento en "reasoning" justificando tu elección de platillos.
Genera un plan de 7 días.
Responde ÚNICAMENTE en JSON válido con la siguiente estructura exacta:
{
  "reasoning": "El usuario proporcionó X. Diseñaré el día 1 con contrastes ácidos, el día 2 con estofados densos...",
  "days": [
    {
      "day": 0,
      "breakfast": {
        "title": "Huevos Poché sobre Cama de Aguacate",
        "imageSearchTerm": "poached egg avocado slice",
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
        "imageSearchTerm": "chicken breast salad",
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
        "imageSearchTerm": "steak broccoli roasted",
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
        max_tokens: 6000, 
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
       if (!mealObj) {
           return {
             id: `ai_${Date.now()}_err`,
             title: `Opción de ${defaultType} (Pendiente)`,
             image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
             readyInMinutes: 20, servings: 2, calories: 300, fat: 20, protein: 20, carbs: 5,
             ingredients: ["Generación interrumpida"], ingredientLines: ["Generación interrumpida"], instructions: ["Por favor, intenta generar el plan nuevamente."]
           };
       }
       let imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
       if (pexelsApiKey) {
           try {
             // Avoid human faces, diet text, and pull from randomized pages for variety
             const safeTerm = (mealObj.imageSearchTerm || mealObj.title || "food").replace(/keto|recipe|diet/gi, "").trim();
             const searchQuery = encodeURIComponent(`${safeTerm} dark food photography aesthetic plate`); 
             const randomPage = Math.floor(Math.random() * 4) + 1;
             const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${searchQuery}&per_page=12&page=${randomPage}`, {
                headers: { 'Authorization': pexelsApiKey }
             });
             if (pexelsRes.ok) {
                 const pexelsData = await pexelsRes.json();
                 if (pexelsData.photos && pexelsData.photos.length > 0) {
                     const randomIdx = Math.floor(Math.random() * pexelsData.photos.length);
                     imageUrl = pexelsData.photos[randomIdx].src.large || pexelsData.photos[randomIdx].src.medium;
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
