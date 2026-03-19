---
name: backend-efficiency-architect
description: Expert in high-concurrency systems, LLM cost reduction, and background job processing.
---

# Scalable Logic Strategy

## AI Recipe Generation (Anti-Crash)
- **Job Queuing:** No generes la receta en el "main thread". Implementa un sistema de colas (ej. BullMQ o Upstash QStash). El usuario ve un "Generando..." mientras el proceso ocurre en background.
- **Response Streaming:** Usa Vercel AI SDK o similar para hacer *streaming* de la respuesta. Esto reduce el tiempo de espera percibido (TTFT) y evita timeouts del servidor.
- **Aggressive Caching:** Si 10 usuarios piden "Pollo + Aguacate", no llames a la IA 10 veces. Genera un `hash` de los ingredientes y busca en Redis/Supabase Cache primero.

## Performance
- **Prompt Token Economy:** Reduce el tamaño de los prompts enviando solo los macros necesarios, no toda la base de datos de nutrición.
- **Edge Functions:** Ejecuta la lógica pesada en el Edge para reducir la latencia desde Santo Domingo.

# Constraints
- NUNCA permitas más de 1 petición pesada de IA por usuario simultáneamente (Rate Limiting).
- SIEMPRE guarda el resultado en DB antes de enviarlo al cliente para evitar pérdida de datos si falla la conexión.
