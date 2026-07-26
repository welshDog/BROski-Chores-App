# BROski Chores

> A household chores app for one shared device — pick your profile, complete chores, get approved, level up your 3D avatar.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

## What is this?

BROski Chores runs on one shared device — a tablet on the fridge, a laptop in the kitchen. Household members tap their own profile:

- **Kids** go straight to their chore board — no login, just a tap.
- **Adults** are behind a short PIN (a household speed bump, not real security) and land on an approval dashboard.

Kids complete chores for coins and XP; an adult approves before the reward lands, so the economy can't be self-awarded. Approved rewards level up the kid's 3D avatar, which visibly pulses on level-up — that's the whole payoff loop.

There is **no backend, no login system, no account creation**. Everything lives in the browser's `localStorage`. On first launch, when no profiles exist yet, the app shows a setup wizard that walks through adding the kids, one adult with a PIN, and an optional first chore — no console needed. Seeding profiles via the browser console (see [Seeding profiles from the console (optional)](#seeding-profiles-from-the-console-optional)) is still available as an alternative, e.g. for adding more profiles later.

## Design history

This app was rebuilt from scratch on 2026-07-26. The full reasoning — why one shared device instead of per-person logins, why chores are recurring templates instead of one-off tasks, why approval is required — is written up in:

- [`docs/superpowers/specs/2026-07-26-household-chores-v1-design.md`](docs/superpowers/specs/2026-07-26-household-chores-v1-design.md) — the design spec
- [`docs/superpowers/plans/2026-07-26-household-chores-v1.md`](docs/superpowers/plans/2026-07-26-household-chores-v1.md) — the task-by-task implementation plan

## Features

### Profile picker
A grid of avatar tiles. Kids tap through instantly; adults enter a PIN first.

### Recurring chores
Chores are defined once as templates (title, coin/XP reward, who it's for, how often) and the app generates today's instances automatically — daily, or on specific weekdays.

### Approval flow
A kid marking a chore "Done" moves it to `pending`, not straight to `approved`. An adult reviews the queue and approves or declines. Declined chores go back to `open` — nothing is ever deleted.

### Per-profile economy
Each profile has its own coins, XP, and level, credited only on approval.

### 3D avatar reward
A React Three Fiber avatar renders on the kid's board and pulses visibly when a reward crosses a level threshold.

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Routing | React Router v6 (three routes: `/`, `/kid`, `/adult`) |
| State | Zustand, with the `persist` middleware backing `profileStore` and `choreStore` to `localStorage` |
| 3D | `@react-three/fiber` + `@react-three/drei` + `three` |
| Styling | Tailwind CSS |
| Testing | Vitest + React Testing Library |

No backend, no database, no auth service, no Firebase, no REST/WebSocket API. If you're looking for any of those in this repo, they aren't here — an earlier scaffold described them, but they were never built and have been removed.

## Project Structure

```text
src/
├── stores/
│   ├── profileStore.js     # profiles, coins/xp/level, PIN check, level-up flag
│   ├── choreStore.js       # chore templates, daily instance generation, approval lifecycle
│   └── uiStore.js          # generic notification/modal state
├── pages/
│   ├── ProfilePicker.jsx   # entry screen — profile grid + adult PIN gate
│   ├── KidChoreBoard.jsx   # a kid's chores + their 3D avatar
│   └── AdultDashboard.jsx  # approval queue + add-a-chore form
├── components/
│   ├── PinPad.jsx          # numeric PIN entry
│   └── 3D/Avatar.jsx       # the reward-payoff avatar, pulses on level-up
├── lib/
│   ├── storage.js          # small localStorage read/write helper
│   └── avatarAnimation.js  # pure level-up pulse curve (no DOM/Three.js)
├── App.jsx                 # routes + generates today's chore instances on mount
└── main.jsx
```

Every file above has a matching test in a sibling `__tests__/` directory.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+ (or pnpm/yarn)

### Installation

```bash
git clone https://github.com/welshDog/BROski-Chores-App.git
cd BROski-Chores-App
npm install
npm run dev
```

The app opens at `http://localhost:5273`. No environment variables are needed — there's nothing to configure.

### Seeding profiles from the console (optional)

The in-app setup wizard now handles first-launch profile creation automatically — when the app opens with no profiles, it walks you through adding kids, one adult with a PIN, and an optional first chore. The console commands below are an alternative, useful for adding more profiles after the fact. Open the browser console and run:

```js
useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' })
useProfileStore.getState().addProfile({ name: 'Bro', role: 'adult', pin: '1234', avatarColor: '#4A90D9' })
useChoreStore.getState().addTemplate({ title: 'Feed the dog', coinReward: 10, xpReward: 60, assignedTo: 'anyone', schedule: { type: 'daily' } })
```

Reload the page and both profiles will appear on the picker.

### Available Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm test` — run the test suite (Vitest)
- `npm run lint` — run ESLint

## Known gaps (v1.1)

These are named, deliberate deferrals, not bugs:

- **In-app setup is wizard-only for the very first household setup.** The wizard covers kids + one adult + an optional first chore, and it always requires a PIN for the adult. The console-seeding path (still available for adding profiles after the fact) does not enforce one — an adult profile created via console with no PIN is permanently un-enterable, so always set one.
- No shared BROski$ economy integration — coins/XP are local to this app by design.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
