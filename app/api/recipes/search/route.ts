import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ recipes: [] });
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  const pexelsApiKey = process.env.PEXELS_API_KEY;

  if (!groqApiKey) {
    return NextResponse.json({ error: 'Falta configurar GROQ_API_KEY en tu .env' }, { status: 500 });
  }

  try {
    // 1. LLM Generation
    const systemPrompt = `Genera 12 excelentes recetas de dieta Cetogénica (Keto) basadas en la búsqueda: "${query}".
Estas recetas no existen en una base de datos, así que diséñalas con macros calculados realísticamente.
Estrictamente cada receta debe tener un alto contenido de grasa y menos de 15g de carbohidratos netos (netCarbs).
Devuelve ÚNICAMENTE un JSON con la estructura exacta:
{
  "recipes": [
    {
      "id": "id-unico-generado",
      "title": "Nombre de receta",
      "readyInMinutes": 30,
      "servings": 2,
      "calories": 400,
      "fat": 30,
      "protein": 25,
      "carbs": 10,
      "netCarbs": 6,
      "ingredients": ["ingrediente 1", "ingrediente 2"]
    }
  ]
}
`;

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192', 
        messages: [{ role: 'system', content: 'Solo devuelves JSON.' }, { role: 'user', content: systemPrompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiRes.ok) throw new Error(`Groq API Error: ${aiRes.status}`);
    
    const data = await aiRes.json();
    const resultJson = JSON.parse(data.choices[0].message.content);
    
    // 2. Add Images from Pexels (or Fallback)
    const recipesWithImages = await Promise.all((resultJson.recipes || []).map(async (recipe: any) => {
        // Fallback default image for Keto food
        let imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'; 
        
        if (pexelsApiKey) {
           try {
             // Translate simple ingredients to english for Pexels if needed, but modern Pexels handles Spanish ok.
             // We just use the first two words of the title to get a broad food picture, or the word 'keto'
             const searchQuery = encodeURIComponent(recipe.title + " keto meal"); 
             const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${searchQuery}&per_page=1`, {
                headers: { 'Authorization': pexelsApiKey }
             });
             if (pexelsRes.ok) {
                 const pexelsData = await pexelsRes.json();
                 if (pexelsData.photos && pexelsData.photos.length > 0) {
                     imageUrl = pexelsData.photos[0].src.medium;
                 }
             }
           } catch(e) {
               console.warn("Pexels error, using fallback image.");
           }
        }
        return { ...recipe, image: imageUrl };
    }));

    return NextResponse.json({ recipes: recipesWithImages });
  } catch (error) {
    console.error('Error generating AI recipes:', error);
    return NextResponse.json({ 
      error: 'Error al buscar/generar recetas', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
