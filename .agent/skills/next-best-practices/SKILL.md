---
name: next-best-practices
description: Performance and architecture excellence for Next.js App Router applications.
---

# Next.js Best Practices

## RSC Boundaries
- Use Server Components by default.
- Minimize 'use client' to the leaf nodes.
- Do not pass non-serializable props (functions, classes) to Client Components.

## Data Fetching
- Favor Server Actions for mutations.
- Use `Suspense` for loading states to prevent page-wide blocking.
- Avoid data waterfalls with `Promise.all` or preloading.

## Optimization
- **Images**: Always use `next/image` with proper `sizes` and `priority` for LCP.
- **Fonts**: Use `next/font` for zero CLS.
- **Metadata**: Define static and dynamic metadata for SEO.
- **Link**: Use `next/link` for prefetching.

## Error Handling
- Use `error.tsx` for component-level recovery.
- Use `not-found.tsx` for missing 404 segments.
