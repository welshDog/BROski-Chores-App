# API Documentation

**There is no API.** This app has no backend, no REST endpoints, and no WebSocket connection — everything runs client-side, with state persisted directly to the browser's `localStorage` via Zustand's `persist` middleware.

An earlier version of this file described a full REST + WebSocket API (JWT auth, `/tasks`, `/rewards`, `/avatar` endpoints, rate limiting, versioning) for a multi-tenant backend that was scaffolded in the project's original planning but never built. That content has been removed rather than left to mislead — none of it exists in this codebase.

If you're looking for how state actually flows through this app — the Zustand store shapes, the profile/chore data model, the approval lifecycle — see [`ARCHITECTURE.md`](ARCHITECTURE.md) and the design spec at [`docs/superpowers/specs/2026-07-26-household-chores-v1-design.md`](docs/superpowers/specs/2026-07-26-household-chores-v1-design.md).
