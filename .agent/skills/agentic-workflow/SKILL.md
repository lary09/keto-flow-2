---
name: agentic-workflow
description: Principios de automatización avanzada, CoT (Chain-of-Thought) y toma de decisiones autónoma para LLMs.
---

# Agentic Workflow

## Core Principles
Un sistema "agéntico" no responde de forma directa o mecánica (Zero-Shot pasivo). En su lugar, analiza, planifica y verifica antes de emitir un resultado final.

### 1. Chain of Thought (Mente del Chef)
- **Regla:** Obligar al LLM a "pensar en voz alta" dentro de un parámetro oculto del JSON (ej. `"reasoning"`) antes de generar los datos que el usuario verá. 
- **Beneficio:** Garantiza resultados lógicos, creativos y de calidad superior (ej. menús que no repiten texturas, elección correcta de macros).

### 2. Autocorrección y Variabilidad
- **Regla:** Los LLMs y APIs de terceros (como Pexels) tienden a repetir respuestas estáticas (el mismo tipo de imagen o platillo). 
- **Solución:** Introducir aleatoriedad en el código (ej. elegir páginas de resultados Random o rotar *Seeds* en la IA) y proveer prompts negativos estrictos (ej. `"no humans, no text"`).

### 3. Contexto Estricto
- **Regla:** La IA debe comportarse como un sistema cerrado. No acepta "salirse del personaje" ni entregar formatos rotos (siempre forzar JSON Objects).
