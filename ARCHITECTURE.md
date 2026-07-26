# BROski Chores — Architecture

This describes what's actually built. For *why* it's shaped this way, see the design spec at
[`docs/superpowers/specs/2026-07-26-household-chores-v1-design.md`](docs/superpowers/specs/2026-07-26-household-chores-v1-design.md).

## 1. System shape

There is no backend. Everything below runs entirely in the browser.

```mermaid
graph TD
    A[ProfilePicker] -->|selectProfile / verifyPin| P[profileStore]
    B[KidChoreBoard] -->|markDone| C[choreStore]
    B -->|reads profile, renders| D[Avatar 3D]
    E[AdultDashboard] -->|approve / decline| C
    E -->|addReward, fed from choreStore.approve's return value| P
    P -->|persist middleware| L[(localStorage)]
    C -->|persist middleware| L
```

**The one deliberate coupling rule:** `profileStore` and `choreStore` never import each other. `AdultDashboard.jsx` is the sole bridge — it calls `choreStore.approve(instanceId)`, which returns `{ profileId, coinReward, xpReward } | null` as plain data, and only then calls `profileStore.addReward(...)` with that data. Neither store has any awareness the other exists.

## 2. Data flow: completing a chore

1. `App.jsx` generates today's `ChoreInstance`s from active `ChoreTemplate`s once on mount (idempotent — safe even if called again, e.g. by React StrictMode's double-invoke in dev).
2. A kid taps "Done" on `KidChoreBoard` → `choreStore.markDone(instanceId, profileId)` → instance status `open → pending`.
3. An adult opens `AdultDashboard`, sees the instance in the approval queue, taps Approve → `choreStore.approve(instanceId)` flips status to `approved` and returns the reward → `profileStore.addReward(profileId, { coins, xp })` credits it and recomputes level.
4. If the reward crosses a level threshold, `addReward` sets `justLeveledUp: true` on that profile.
5. Next time that kid's board mounts, `Avatar.jsx` sees `justLeveledUp === true`, plays a pulse animation (curve computed by the pure `pulseScale()` function in `src/lib/avatarAnimation.js`, no DOM/Three.js dependency — fully unit-testable), then calls `clearLevelUpFlag`.

## 3. State ownership

| Store | Owns | Persisted under |
|---|---|---|
| `profileStore` | Profiles, PINs, coins/xp/level, `justLeveledUp` | `broski_chores_profiles_v1` (Zustand `persist`) |
| `choreStore` | Templates, daily instances, lifecycle status | `broski_chores_chores_v1` (Zustand `persist`) |
| `uiStore` | Generic notifications/modal state | not persisted |

`src/lib/storage.js` is a small standalone `localStorage` read/write helper, kept for any future code that needs manual persistence outside a Zustand store — neither current store uses it, since `persist` already handles that lifecycle correctly for them.

## 4. Routing

Three routes via React Router v6, all defined in `App.jsx`:

- `/` — `ProfilePicker`
- `/kid` — `KidChoreBoard`
- `/adult` — `AdultDashboard`

`AdultDashboard`'s route guard checks that the *currently selected profile's role* is `'adult'` (not just that some profile is selected) — this closes a real bug found during a whole-branch review, where a kid picking their own profile could still reach `/adult` via the Back button, URL bar, or session restore.

## 5. Testing

Vitest + React Testing Library. Every store and component has a colocated `__tests__` file. Pure logic (`pulseScale`, `classifyEngagement`-style decision functions) is extracted so it can be tested with plain data, no DOM. There is no E2E test framework in this repo and no CI pipeline configured — `npm test` is run locally.

## 6. Build

Standard Vite build, `npm run build` outputs to `dist/`. `vite.config.js`'s `manualChunks` splits `react`/`three`/`utils` into separate bundles; the `three` chunk exceeds Rollup's default 500kB warning threshold (react-three-fiber + drei pull in a meaningful chunk of Three.js) — this is expected for a 3D-avatar app and not something this repo currently addresses with lazy-loading.

## 7. What this app deliberately does not have

- No authentication, no accounts, no login — profiles are picked by tap, adults gated by a plain-string PIN comparison (a household speed bump, explicitly not a security boundary).
- No backend, no database, no REST or WebSocket API.
- No error-tracking service, no analytics, no monitoring.
- No CI/CD pipeline.

These aren't omissions to fix — they're the point. See the design spec's Non-goals section.
