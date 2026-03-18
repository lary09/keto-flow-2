---
name: security-best-practices
description: Essential security patterns for Next.js and Appwrite applications.
---

# Security Best Practices

## Authentication
- Protect all sensitive routes with a common `ProtectedRoute` or Middleware.
- Disable anonymous sessions if registration is mandatory.
- Use HttpOnly cookies for session management (handled by Appwrite).

## Data Access
- Enforce Appwrite Permissions (Document Level Security).
- Never expose API keys or Secrets on the client-side.
- Validate all incoming API request bodies with Zod.

## Frontend Security
- Sanitize user-generated content to prevent XSS.
- Use Content Security Policy (CSP) headers.
- Prevent CSRF by using modern framework protections.
