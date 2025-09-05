# Agents Guide

This document defines how agents contribute to and interact with this codebase. The goal is to keep data access predictable, testable, and easy to evolve.

Golden Rule: All client-side networking and data fetching must happen through dedicated `useSWR`-based hooks. Do not call `fetch`, `axios`, or other networking APIs directly from components, pages, or one-off utilities.

## Client Data Layer

- Hooks live in `app/hooks/` and are named `useThing.jsx` (one resource per file).
- Always use the fetch wrappers from `app/util/url.js`:
  - `authFetch`: authenticated requests, injects `Authorization` and `X-Instance` headers and handles 401/402/500 UX.
  - `publicFetch`: unauthenticated/public endpoints.
  - `authFetchWithoutContentType`: for uploads or non-JSON bodies.
- Compose hooks with `useSWR` for reads and either `mutate` or `useSWRMutation` for writes. Return `{ data-like, loading, error, refetch, mutationLoading, ...actions }`.
- Keys: Use stable, URL-like keys that mirror API routes (e.g., ``/api/events/${eventId}/locations``). If a required param is missing, pass `null` to suspend the request.
- Invalidations: After a mutation, `await mutate(key)` to revalidate impacted queries. Invalidate related list/detail keys if needed.
- Schema fetching: If the API exposes schemas via the custom `QUERY` method, fetch them with a separate SWR key (e.g., `[key, 'schema']`) and `dezerialize` with `zodex`. This should be present in all new API routes and their corresponding hooks.
- Subscriptions/streaming: Use `swr/subscription` for SSE/websocket style streams, inside a hook (see `app/hooks/useConversations.jsx`).
- Toasts: For create/update/delete, wrap network calls in `toast.promise(...)` for consistent UX. Hooks should return a boolean success where practical.

Scaffolding: You can quickly scaffold hooks via `app/hooks/generateHook.js`. `app/hooks/__TEMPLATE.jsx` is outdated.

## Component Usage

- Components must never call `fetch` directly. Use a hook and consume its returned state/actions.
- Keep components declarative: render from hook state; trigger mutations via hook actions.
- Prefer simple, single-responsibility hooks; compose multiple hooks in components as needed.

## Auth & Instance Context

- `app/hooks/useAuth.jsx` centralizes auth flows. It contains some direct `fetch` calls for session bootstrap; do not replicate this pattern elsewhere. For new authed calls, prefer `authFetch` within hooks.
- Instance selection lives in `app/contexts/SelectedInstanceContext.jsx`. It stores the active instance in `localStorage` and revalidates all SWR keys on change; rely on it rather than manually wiring `X-Instance`.

## Server Data Layer

- API uses file-based routing in `api/routes/**`. Export handlers named after HTTP verbs: `get`, `post`, `put`, `patch`, `del`, `head`, `options`, and custom `query` (for schema/introspection). See `api/util/router.js`.
- Prefer Prisma via `#prisma` alias and keep multi-step writes inside `prisma.$transaction(...)`.
- Validation: Use `zod` and return `400` on validation errors. Keep response shapes consistent with existing patterns (top-level resource keys, e.g., `{ widgets: [...] }` or `{ widget: {...} }`).
- Auth: Guard private endpoints with `verifyAuth` where appropriate. Client hooks should use `authFetch` which handles 401/402 UX.

## Adding A New Data Flow (Checklist)

1) Server: Add or extend a route under `api/routes/...` and return JSON with stable shapes and IDs.
2) Client: Create a hook in `app/hooks/` that:
   - Uses `useSWR(key, fetcher)` with `authFetch`/`publicFetch`.
   - Exposes needed actions (create/update/delete) that wrap calls in `toast.promise` and `await mutate(key)`.
   - Optionally exposes schema via a `QUERY` call and `zodex` deserialization.
3) Component: Consume the hook; do not perform networking in the component.
4) Invalidate related SWR keys appropriately after mutations.

## Conventions & Constraints

- No `axios`. Use the built-in `fetch` wrapped by `authFetch`/`publicFetch`.
- No ad-hoc networking in components, contexts (except the existing `useAuth`), or utilities. Centralize access in hooks.
- Keep SWR keys deterministic; prefer URL strings. Use `null` to suspend when inputs are incomplete.
- Return simple shapes from hooks: singular/plural resource, `loading`, `error`, `refetch`, and action functions.
- For uploads, use `authFetchWithoutContentType` and FormData.
- For real-time, use `useSWRSubscription` inside hooks; fan-out updates with `mutate(key)`.
- Do not change database migrations when making product changes unless explicitly scoped to the task.
- Never EVER modify anything in the schema/migrations folder.
- Never EVER put anything in the schema/migrations folder.

## Pointers

- Example hooks: see `app/hooks/*` (e.g., `useEvents.jsx`, `useInstance.jsx`, `useConversations.jsx`).
- Fetch wrappers: `app/util/url.js`.
- Selected instance behavior: `app/contexts/SelectedInstanceContext.jsx`.
- Example server route patterns: `api/routes/events/[eventId]/**`.

When in doubt: if new code needs data, add or extend an API route, then create/extend a dedicated `useSWR` hook to consume it. Components should stay networking-free.

