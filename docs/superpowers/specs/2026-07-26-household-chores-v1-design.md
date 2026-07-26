# Design: BROski Chores — Household v1 rebuild

**Status:** Approved for planning
**Date:** 2026-07-26
**Repo:** `BROski-Chores-App`

## Context

This repo was scaffolded 2025-11-04 and frozen immediately — three same-day commits (App
shell, one 3D `Avatar` component, three Zustand stores), then nothing until an automated
`.hyperfocus.yml` manifest add on 2026-07-18. The README describes a full multi-tenant SaaS
(auth, Firebase, analytics dashboard, MSW, React Query, shadcn/ui, TypeScript throughout) —
none of that was ever built. `package.json` even lists `"@shadcn/ui": "^0.0.4"`, which isn't a
real npm package under that name; the README was aspirational scope-of-intent from day one,
not a status report.

This design replaces that aspiration with a concrete, scoped-down v1: a real household chores
app for one shared device, built on the ~10% of the original scaffold that's actually real and
worth keeping (the React/Vite/Three.js foundation, the `Avatar` component, the gamification
concept).

## Audience & device model

Household/family use — a handful of known people (kids + adults), not public signup. Runs on
one shared device (e.g. a tablet on the fridge): people tap their own profile on a shared
screen rather than each having their own login on their own device. This is the decision that
eliminates the need for a backend entirely — **no Firebase, no auth service, no network
dependency.** Everything is local-first, matching `hyperfocus-copilot`'s established pattern in
this ecosystem (instant load, zero build-time backend config, `localStorage` persistence).

## Economy scope

A separate, local economy — coins/XP/levels live entirely in this app's `localStorage`, not
wired into the ecosystem's shared BROski$ economy (used elsewhere for Discord/Vibe Labs/etc.).
Simpler, ships faster, no dependency on other repos' infrastructure being up. Bridging to the
shared economy is an explicit, deferred idea for later — not part of this design.

## Data model

**`Profile`** — `{ id, name, avatarConfig, role: 'kid' | 'adult', pin?, coins, xp, level }`.
Replaces the current `gameStore`'s single global `{coinBalance, level, experience}` — the
economy becomes per-profile, since the entire point is that each household member has their
own progress. `pin` exists only on adult profiles: a short numeric code, not real security —
just enough friction that a kid can't self-approve their own chores. It's a shared household
tablet, not a security boundary.

**`ChoreTemplate`** — `{ id, title, reward: { coins, xp }, assignedTo: profileId | 'anyone', schedule, active }`.
The reusable definition (e.g. "Feed the dog," 10 coins + 5 XP, daily). `schedule` is one of two
unambiguous kinds — `'daily'` (every day), or a specific set of weekdays, e.g. `{ days: ['mon', 'wed', 'fri'] }`.
There's no separate "weekly" option: a single weekday in that set (e.g. `{ days: ['sun'] }`)
already covers "once a week," so a third option would only add an ambiguous ("weekly on
which day?") overlapping case without covering anything the weekday-set can't.

**`ChoreInstance`** — `{ id, templateId, date, assignedTo, status: 'open' | 'pending' | 'approved' | 'declined' }`.
Generated from active templates whenever their schedule says today's a chore day. This is what
actually moves through the lifecycle:

```
open --(kid taps "Done")--> pending --(adult approves)--> approved (reward paid to that profile)
                                     \-(adult declines)--> open (kid can redo it — not deleted)
```

Chore templates were chosen over a flat one-off task list specifically because chores are
inherently recurring — a flat list would mean someone re-typing "take out bins" every week
indefinitely, a worse fit for the actual domain than the original README's generic
"create/update/complete tasks" framing implied.

## Screens & flow

**Profile picker (home/idle screen)** — a grid of avatar tiles, kids and adults together. Tap a
kid → straight into their board, zero friction. Tap an adult → PIN prompt → adult dashboard. A
persistent "switch profile" control is always reachable, so the tablet can be handed off
between people without reloading the app.

**Kid chore board** — today's `ChoreInstance`s assigned to them, plus any unclaimed
`'anyone'` ones. Tapping "Done" flips the instance to `pending` and shows a "waiting for
approval" state — the UI needs to make this feel like real progress, not a rejection, since
that's the cost of requiring approval at all. Their 3D avatar, coins, XP, and level live here
too: this is where the one piece of genuinely real existing code (`Avatar.jsx` plus the
`Canvas`/`OrbitControls` setup already in `App.jsx`) becomes the actual reward payoff screen
instead of a static demo.

**Adult dashboard (behind the PIN)** — the approval queue (every `pending` instance across
every kid, approve/decline in one tap each), plus chore-template management (add/edit/deactivate
recurring chores, assign to a specific person or `'anyone'`).

**The reward moment** — on approval: coins/XP tick up, and if a level threshold is crossed, the
avatar visibly levels up (the 3D system already exists for exactly this). Whether this fires
live (adult approves while the kid is still on screen) or on their next visit, it must never
happen silently — the whole gamification premise depends on the payoff being visible.

Large touch targets throughout — this is a shared touch tablet, not a desktop app, consistent
with the "chunky buttons" ND-first pattern already established elsewhere in this ecosystem
(e.g. `hyperfocus-copilot`'s Freeze Rescue mode).

## v1 scope

**In scope:** profile picker + PIN-gated adult mode; chore templates (create/edit/deactivate,
daily or specific-weekdays schedule); auto-generated daily instances; the full
open→pending→approved/declined lifecycle; per-profile coins/XP/level; the 3D avatar leveling
up as the reward payoff.

**Explicitly out of scope for v1** (trimmed from the original README's aspiration):
- Analytics dashboard
- Daily login bonuses / streak mechanics
- A separate achievement/unlock system (leveling already covers the "progression" need)
- Dark/light mode
- Keyboard shortcuts (touch-first kiosk device)
- Any online/offline distinction (the app is local-only regardless, so this is moot)
- Auth, Firebase, multi-tenant anything

Any of these can be revisited later if the shipped v1 actually gets used — none are ruled out
forever, just not part of this build.

## Tech

Keep React, Vite, Zustand, Tailwind, Three.js/`@react-three/fiber`/`@react-three/drei` — the
existing foundation is a reasonable fit for an interactive kiosk app with real animation, and
there's already working code (`Avatar.jsx`, the store shells) worth building on rather than
discarding.

Drop from `package.json`: `firebase`, the fake `@shadcn/ui` package, and any other dependency
that only existed to serve the abandoned multi-tenant SaaS framing (audited precisely during
planning, not guessed at here).

Persistence: a single versioned `localStorage` key holding `{ profiles, templates, instances }`
as JSON — same pattern as `hyperfocus-copilot`'s `task-list.js` (`hfc_tasks_v1`-style key
naming). No backend, no build-time config.

`gameStore` is reworked from a single global shape to profile-keyed. `uiStore`/`userStore`
get read and either folded into the new profile/PIN logic or replaced, depending on what they
actually contain today (to be confirmed during planning — this design doesn't assume their
current content beyond what `App.jsx` visibly consumes).

## Testing

Vitest (already configured in this repo) covers the parts worth locking in as real tests:
chore-lifecycle logic (template → instance generation, status transitions, reward payout math)
and the PIN gate. This matches the ecosystem's established pattern from tonight's other
session work: test the state machine and the decision logic, not just that components render.

## Non-goals (explicit, so they don't get silently assumed back in during planning)

- No real security model — the PIN is a household-appropriate speed bump, not authentication.
- No multi-device sync — this is one shared device, by design, per the audience decision above.
- No integration with the ecosystem's shared BROski$ economy in this version.
