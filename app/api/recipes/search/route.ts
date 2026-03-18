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
Estas recetas no deben ser básicas ni genéricas. Como experto culinario, diseña platillos visualmente hermosos y de sabor premium (Agentic Creativity), manteniendo estrictamente un alto contenido de grasa y menos de 15g de carbohidratos netos (netCarbs).

IMPORTANTE: Todos los textos deben generarse en ESPAÑOL, excepto imageSearchTerm que debe ser en inglés literal para la API fotográfica (usa ingredientes, no platos). EJEMPLO: "grilled salmon slices", "roasted broccoli cheese". NUNCA uses la palabra "keto" o "recipe" en imageSearchTerm.

Usa pensamiento lógico (Chain of Thought): Escribe primero en la propiedad "reasoning" por qué elegiste estas recetas y cómo garantizas el estándar gourmet.
Devuelve ÚNICAMENTE un JSON con la estructura exacta:
{
  "reasoning": "Elegí ingredientes frescos con alto contraste de texturas...",
  "recipes": [
    {
      "id": "id-unico-generado",
      "title": "Nombre de receta (Elegante)",
      "imageSearchTerm": "ingredient 1 ingredient 2 close up",
      "readyInMinutes": 30,
      "servings": 2,
      "calories": 400,
      "fat": 30,
      "protein": 25,
      "carbs": 10,
      "netCarbs": 6,
      "ingredients": ["ingrediente 1"],
      "instructions": ["Paso 1", "Paso 2"]
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
        model: 'llama-3.3-70b-versatile', 
        messages: [{ role: 'system', content: 'Solo devuelves JSON.' }, { role: 'user', content: systemPrompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("GROQ_RAW:", errText);
      throw new Error(`Groq API Error: ${aiRes.status} - ${errText}`);
    }
    
    const data = await aiRes.json();
    const resultJson = JSON.parse(data.choices[0].message.content);
    
    // 2. Add Images from Pexels (or Fallback)
    const recipesWithImages = await Promise.all((resultJson.recipes || []).map(async (recipe: any) => {
        // Fallback default image for Keto food
        let imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'; 
        
        if (pexelsApiKey) {
           try {
             // Optimize image term for UI/UX Pro Max aesthetic (no people, dark/high contrast plates)
             const safeTerm = (recipe.imageSearchTerm || "food").replace(/keto|recipe|diet/gi, "").trim();
             const searchQuery = encodeURIComponent(`${safeTerm} food photography plating`); 
             const randomPage = Math.floor(Math.random() * 3) + 1; // Pull from different pages to avoid repetition
             const pexelsRes = await fetch(`https://api.pexels.com/v1/search?query=${searchQuery}&per_page=10&page=${randomPage}`, {
                headers: { 'Authorization': pexelsApiKey }
             });
             if (pexelsRes.ok) {
                 const pexelsData = await pexelsRes.json();
                 if (pexelsData.photos && pexelsData.photos.length > 0) {
                     // Pick a random photo to avoid repeating identical images
                     const randomIdx = Math.floor(Math.random() * pexelsData.photos.length);
                     imageUrl = pexelsData.photos[randomIdx].src.large || pexelsData.photos[randomIdx].src.medium;
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
