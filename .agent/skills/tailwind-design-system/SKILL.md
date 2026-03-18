---
name: tailwind-design-system
description: Structured, scalable Tailwind CSS architecture for modern web apps.
---

# Tailwind Design System

## Design Tokens
- Define a consistent palette in `tailwind.config`.
- Use semantic names (primary, secondary, accent, surface, border).
- Stick to a spacing scale (rem-based).

## Components (CVA Pattern)
- Use `class-variance-authority` or `clsx/tailwind-merge` for complex component states.
- Avoid long string literals in components; group them.

## Dark Mode
- Implement a cohesive dark theme using the `dark:` selector.
- Use transparency (`/20`, `/50`) for overlays.

## Responsive Strategy
- Mobile-first approach.
- Use `md:`, `lg:` prefixes consistently.
- Implement container queries where appropriate.
