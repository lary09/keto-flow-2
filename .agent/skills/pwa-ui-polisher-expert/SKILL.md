---
name: pwa-ui-polisher-expert
description: Specialized in PWA visual consistency, safe-areas, and high-fidelity UI alignment.
---

# PWA & UI Standards

## Dynamic Overlays & Toasts
- **Contrast Protection:** Las notificaciones (toasts) NUNCA deben usar fondos blancos puros si el tema es oscuro. Usa `bg-surface/90` con `backdrop-blur` para mantener la estética.
- **Status Bar Sync:** Asegúrate de que el `theme-color` en el manifiesto cambie según el estado de la UI para evitar el "bloque blanco" en la parte superior.

## Button & Input Alignment
- **Fixed Heights:** Usa alturas estandarizadas (`h-12` o `h-14`) para botones y selects en la misma fila para evitar desalineaciones visuales (como en la pantalla de Despensa).
- **Safe Areas:** Implementa `padding-bottom: env(safe-area-inset-bottom)` en la TabBar inferior para que no se encime con la barra de navegación de iOS/Android.

# Constraints
- PROHIBIDO: Layout shifts. Usa skeletons para la carga de ingredientes.
- SIEMPRE: Usa `flex-1` o `grid-cols-X` con `items-center` para que los botones y dropdowns midan lo mismo.
