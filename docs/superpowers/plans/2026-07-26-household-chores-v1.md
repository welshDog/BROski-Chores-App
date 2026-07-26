# Household Chores v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the abandoned SaaS scaffold with a real, working household chores app: a shared-kiosk-device experience where household members pick their profile, kids complete recurring chores for coins/XP, and a PIN-gated adult approves before rewards land — with the existing 3D avatar as the visible payoff.

**Architecture:** Two new Zustand stores (`profileStore` — replaces `gameStore`+`userStore`; `choreStore` — new) drive three pages (`ProfilePicker`, `KidChoreBoard`, `AdultDashboard`) wired through React Router, all persisted to a single versioned `localStorage` key via a small storage util. No backend. Reward crediting and chore-lifecycle transitions live in the stores as pure, directly-testable actions; the stores never call each other — the calling component orchestrates (e.g. "approve this chore, then credit that profile").

**Tech Stack:** React 18, Vite, Zustand (`persist` middleware for `profileStore`/`choreStore`), React Router v6, `@react-three/fiber`/`@react-three/drei` (existing `Avatar` component), Tailwind, Vitest + React Testing Library (already configured).

**Spec:** `docs/superpowers/specs/2026-07-26-household-chores-v1-design.md` (approved 2026-07-26).

## Global Constraints

- No backend, no auth service, no network dependency — local-first, `localStorage` only.
- Economy is local to this app — no integration with the ecosystem's shared BROski$ economy.
- PIN on adult profiles is a household speed bump, not real security — plain string comparison, no hashing.
- `schedule` on a `ChoreTemplate` is exactly one of two kinds — `{ type: 'daily' }` or `{ type: 'weekdays', days: [...] }` — never a separate "weekly" option (collapses into the weekday-set case).
- Declining a chore returns it to `'open'`, never deletes it.
- Out of scope for v1 (do not add): analytics dashboard, daily login bonuses/streaks, a separate achievement/unlock system, dark/light mode, keyboard shortcuts, any online/offline distinction, auth, Firebase, multi-tenant anything.
- `node_modules` does not exist yet in this repo — `npm install` has never been run here. Confirmed by direct check before this plan was written.

## Confirmed current-state facts (verified before writing this plan, don't re-derive)

- `src/stores/uiStore.js` — generic `notifications`/`showModal` state, no profile concept. Reusable as-is, untouched by this plan.
- `src/stores/userStore.js` — single logged-in user/familyId/role, `persist`-backed. Replaced entirely (deleted) — doesn't fit multi-profile.
- `src/stores/gameStore.js` — real leveling math (`addCoins` derives XP from coins, `levelUp`), but single global blob with **no persistence** (`subscribeWithSelector`, not `persist`) and a `position`/`moveAvatar` concept (board-track avatar movement) that isn't part of this spec. Replaced entirely (deleted) — its leveling *shape* (not its derived-XP formula) is ported into `profileStore`.
- `src/stores/__tests__/gameStore.test.js` — currently inconsistent with `gameStore.js` itself (calls `moveAvatar({x,y,z})`, an object, while the real implementation treats `position` as a number) — was never actually run (see below). Deleted alongside `gameStore.js`.
- `src/__tests__/setup.js` — imports `@jest/globals` in a **Vitest** project; that package isn't installed. This breaks every test run before it reaches a single test file.
- Dependency audit (`grep -rl "from '<pkg>'" src/`): only `react-router-dom`, `zustand`, `@react-three/fiber`, `@react-three/drei` are actually imported anywhere. `firebase`, `@shadcn/ui`, `axios`, `date-fns`, `framer-motion`, `gsap`, `lucide-react`, `react-hot-toast` have zero imports in `src/` — all dead weight from the abandoned SaaS scaffold.
- `node_modules` doesn't exist — nothing in this repo (dev server, tests, lint) has ever actually been run to completion.

## Core shapes (used verbatim across every task below — do not rename)

```js
// Profile
{
  id: string,              // crypto.randomUUID()
  name: string,
  role: 'kid' | 'adult',
  pin: string | null,      // 4-digit string; only set on role: 'adult'
  avatarColor: string,     // hex color, e.g. '#FF6B6B'
  coins: number,
  xp: number,
  level: number,
  justLeveledUp: boolean,  // transient: true right after a level-up, cleared by the UI once animated
}

// ChoreTemplate
{
  id: string,
  title: string,
  coinReward: number,
  xpReward: number,
  assignedTo: string | 'anyone',   // a profile id, or the literal string 'anyone'
  schedule: { type: 'daily' } | { type: 'weekdays', days: string[] },  // days from ['sun','mon','tue','wed','thu','fri','sat']
  active: boolean,
}

// ChoreInstance
{
  id: string,
  templateId: string,
  date: string,                     // 'YYYY-MM-DD'
  assignedTo: string | 'anyone',    // copied from the template at generation time
  completedBy: string | null,       // the profile id who tapped "Done" — set on markDone, cleared on decline
  status: 'open' | 'pending' | 'approved' | 'declined',
}
```

---

## Task 1: Environment audit + cleanup

**Files:**
- Modify: `package.json`
- Modify: `src/__tests__/setup.js`
- Modify: `vite.config.js:44-49` (the `manualChunks.ui` bucket references `@shadcn/ui`, which is being removed)

**Interfaces:**
- Produces: a working `npm test` command (Vitest actually executes) and a `package.json` with only genuinely-used dependencies. Nothing downstream consumes new code from this task — it's pure cleanup.

- [ ] **Step 1: Install dependencies for the first time**

Run: `npm install`
Expected: completes without error; `node_modules/` now exists.

- [ ] **Step 2: Confirm the test runner is currently broken**

Run: `npx vitest run`
Expected: fails before running any test file, with an error about `@jest/globals` not being resolvable (from `src/__tests__/setup.js:3`). This confirms the bug described in "Confirmed current-state facts" above.

- [ ] **Step 3: Fix `src/__tests__/setup.js`**

Find:
```js
// Add this at the top of setup.js
import { configure } from '@testing-library/react';
import { jest } from '@jest/globals';

// Rest of the file remains the same
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Configure test environment
configure({ testIdAttribute: 'data-testid' });

// Mock ResizeObserver
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverStub;
```

Replace with (swaps `@jest/globals`'s `jest.fn()` for Vitest's `vi.fn()`, already globally available since `vite.config.js`'s `test.globals: true`):
```js
import { configure } from '@testing-library/react';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

configure({ testIdAttribute: 'data-testid' });

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverStub;
```

- [ ] **Step 4: Confirm the test runner now executes**

Run: `npx vitest run`
Expected: setup no longer throws; it now runs the existing test files and reports real pass/fail counts (some failures are expected here — `gameStore.test.js` is inconsistent with `gameStore.js` as noted above, and both are deleted in Task 3. Do not attempt to fix `gameStore.test.js` in this task).

- [ ] **Step 5: Remove unused dependencies from `package.json`**

In the `"dependencies"` block, remove these four keys entirely (all confirmed zero-import in `src/` — see "Confirmed current-state facts"): `"@shadcn/ui"`, `"firebase"`, `"axios"`, `"date-fns"`, `"framer-motion"`, `"gsap"`, `"lucide-react"`, `"react-hot-toast"`.

Resulting `"dependencies"` block:
```json
  "dependencies": {
    "@react-three/drei": "^9.98.0",
    "@react-three/fiber": "^8.18.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.1",
    "three": "^0.160.0",
    "zustand": "^4.5.0"
  },
```

- [ ] **Step 6: Fix `vite.config.js`'s now-dangling reference to `@shadcn/ui`**

Find (`vite.config.js:41-48`):
```js
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            ui: ['@shadcn/ui', 'lucide-react'],
            utils: ['date-fns', 'zustand'],
          },
        },
      },
```

Replace with:
```js
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            utils: ['zustand'],
          },
        },
      },
```

- [ ] **Step 7: Reinstall to sync `node_modules`/`package-lock.json` with the trimmed `package.json`**

Run: `npm install`
Expected: completes without error; `package-lock.json` no longer lists the removed packages as direct dependencies.

- [ ] **Step 8: Re-run tests one more time to confirm nothing new broke**

Run: `npx vitest run`
Expected: same pass/fail shape as Step 4 (the dependency removal shouldn't change test outcomes, since none of the removed packages were imported anywhere).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.js src/__tests__/setup.js
git commit -m "chore: fix broken test setup, remove unused SaaS-scaffold dependencies"
```

---

## Task 2: `localStorage` persistence util

**Files:**
- Create: `src/lib/storage.js`
- Test: `src/lib/__tests__/storage.test.js`

**Interfaces:**
- Produces: `STORAGE_KEY` (string constant), `loadState()` and `saveState(state)` — a thin wrapper so `profileStore`/`choreStore` don't each hand-roll their own `localStorage` JSON handling, and so the versioned key convention lives in exactly one place.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/storage.test.js`:
```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { STORAGE_KEY, loadState, saveState } from '../storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadState returns null when nothing is stored yet', () => {
    expect(loadState()).toBeNull();
  });

  it('saveState then loadState round-trips the same object', () => {
    const data = { profiles: [{ id: '1', name: 'Bro' }], templates: [], instances: [] };
    saveState(data);
    expect(loadState()).toEqual(data);
  });

  it('saveState writes under the versioned STORAGE_KEY', () => {
    saveState({ profiles: [] });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(STORAGE_KEY).toMatch(/^broski_chores_v\d+$/);
  });

  it('loadState returns null (not throw) on corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadState()).toBeNull();
    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/storage.test.js`
Expected: FAIL — `Cannot find module '../storage'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/storage.js`:
```js
// Single versioned localStorage key for the whole app's persisted state.
// Bump the version suffix if the shape ever changes incompatibly — old
// data under the old key is simply ignored, not migrated (household data
// is small enough that "start fresh" is an acceptable v1 answer).
export const STORAGE_KEY = 'broski_chores_v1';

export function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn('broski_chores: corrupted localStorage data, ignoring', err);
    return null;
  }
}

export function saveState(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/storage.test.js`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.js src/lib/__tests__/storage.test.js
git commit -m "feat: localStorage persistence util"
```

---

## Task 3: `profileStore` (replaces `gameStore` + `userStore`)

**Files:**
- Create: `src/stores/profileStore.js`
- Test: `src/stores/__tests__/profileStore.test.js`
- Delete: `src/stores/gameStore.js`
- Delete: `src/stores/__tests__/gameStore.test.js`
- Delete: `src/stores/userStore.js`

**Interfaces:**
- Consumes: nothing from earlier tasks (Zustand's own `persist` middleware, no dependency on `src/lib/storage.js` — `persist` manages its own `localStorage` key directly, see Step 3's note).
- Produces (all consumed by later tasks — exact names, don't rename): `useProfileStore` hook exposing state `{ profiles: Profile[], currentProfileId: string | null }` and actions `addProfile({name, role, pin, avatarColor}) => Profile`, `selectProfile(id)`, `clearCurrentProfile()`, `verifyPin(id, pin) => boolean`, `addReward(profileId, {coins, xp}) => void`, `clearLevelUpFlag(profileId) => void`, `getProfile(id) => Profile | undefined`.

- [ ] **Step 1: Write the failing test**

Create `src/stores/__tests__/profileStore.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { useProfileStore } from '../profileStore';

describe('profileStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
  });

  it('starts with no profiles and no current profile', () => {
    const state = useProfileStore.getState();
    expect(state.profiles).toEqual([]);
    expect(state.currentProfileId).toBeNull();
  });

  it('addProfile creates a kid profile with zeroed economy and no pin', () => {
    const profile = useProfileStore.getState().addProfile({
      name: 'Evan',
      role: 'kid',
      avatarColor: '#FF6B6B',
    });

    expect(profile.id).toBeTruthy();
    expect(profile.name).toBe('Evan');
    expect(profile.role).toBe('kid');
    expect(profile.pin).toBeNull();
    expect(profile.coins).toBe(0);
    expect(profile.xp).toBe(0);
    expect(profile.level).toBe(1);
    expect(profile.justLeveledUp).toBe(false);
    expect(useProfileStore.getState().profiles).toHaveLength(1);
  });

  it('addProfile stores a pin for an adult profile', () => {
    const profile = useProfileStore.getState().addProfile({
      name: 'Bro',
      role: 'adult',
      pin: '1234',
      avatarColor: '#4A90D9',
    });
    expect(profile.pin).toBe('1234');
  });

  it('selectProfile sets currentProfileId, clearCurrentProfile clears it', () => {
    const profile = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    useProfileStore.getState().selectProfile(profile.id);
    expect(useProfileStore.getState().currentProfileId).toBe(profile.id);
    useProfileStore.getState().clearCurrentProfile();
    expect(useProfileStore.getState().currentProfileId).toBeNull();
  });

  it('verifyPin returns true only for the matching pin on that profile', () => {
    const profile = useProfileStore.getState().addProfile({ name: 'Bro', role: 'adult', pin: '1234', avatarColor: '#4A90D9' });
    expect(useProfileStore.getState().verifyPin(profile.id, '1234')).toBe(true);
    expect(useProfileStore.getState().verifyPin(profile.id, '0000')).toBe(false);
  });

  it('verifyPin returns false for a kid profile (no pin set)', () => {
    const profile = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    expect(useProfileStore.getState().verifyPin(profile.id, '')).toBe(false);
  });

  it('addReward credits coins and xp without leveling up below the threshold', () => {
    const profile = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    useProfileStore.getState().addReward(profile.id, { coins: 10, xp: 30 });

    const updated = useProfileStore.getState().getProfile(profile.id);
    expect(updated.coins).toBe(10);
    expect(updated.xp).toBe(30);
    expect(updated.level).toBe(1);
    expect(updated.justLeveledUp).toBe(false);
  });

  it('addReward levels up and sets justLeveledUp when xp crosses a 100-point threshold', () => {
    const profile = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    useProfileStore.getState().addReward(profile.id, { coins: 5, xp: 90 });
    useProfileStore.getState().addReward(profile.id, { coins: 5, xp: 20 }); // xp now 110

    const updated = useProfileStore.getState().getProfile(profile.id);
    expect(updated.xp).toBe(110);
    expect(updated.level).toBe(2); // floor(110/100)+1
    expect(updated.justLeveledUp).toBe(true);
  });

  it('addReward does not re-flag justLeveledUp on a reward that stays within the same level', () => {
    const profile = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    useProfileStore.getState().addReward(profile.id, { coins: 5, xp: 150 }); // levels up to 2
    useProfileStore.getState().clearLevelUpFlag(profile.id);
    useProfileStore.getState().addReward(profile.id, { coins: 5, xp: 10 }); // still level 2

    const updated = useProfileStore.getState().getProfile(profile.id);
    expect(updated.level).toBe(2);
    expect(updated.justLeveledUp).toBe(false);
  });

  it('clearLevelUpFlag resets justLeveledUp to false', () => {
    const profile = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    useProfileStore.getState().addReward(profile.id, { coins: 5, xp: 150 });
    expect(useProfileStore.getState().getProfile(profile.id).justLeveledUp).toBe(true);

    useProfileStore.getState().clearLevelUpFlag(profile.id);
    expect(useProfileStore.getState().getProfile(profile.id).justLeveledUp).toBe(false);
  });

  it('getProfile returns undefined for an unknown id', () => {
    expect(useProfileStore.getState().getProfile('nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/__tests__/profileStore.test.js`
Expected: FAIL — `Cannot find module '../profileStore'`.

- [ ] **Step 3: Write the implementation**

Create `src/stores/profileStore.js`:
```js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Level formula: 100 xp per level, flat. xp is credited directly per
// chore (ChoreTemplate.xpReward) rather than derived from coins spent —
// that's a deliberate change from the old gameStore, which computed xp
// as coins/25. Independent coin/xp rewards give more control per chore
// (e.g. a high-effort, low-coin, high-xp chore).
function levelForXp(xp) {
  return Math.floor(xp / 100) + 1;
}

export const useProfileStore = create(
  persist(
    (set, get) => ({
      profiles: [],
      currentProfileId: null,

      addProfile: ({ name, role, pin = null, avatarColor }) => {
        const profile = {
          id: crypto.randomUUID(),
          name,
          role,
          pin: role === 'adult' ? pin : null,
          avatarColor,
          coins: 0,
          xp: 0,
          level: 1,
          justLeveledUp: false,
        };
        set((state) => ({ profiles: [...state.profiles, profile] }));
        return profile;
      },

      selectProfile: (id) => set({ currentProfileId: id }),
      clearCurrentProfile: () => set({ currentProfileId: null }),

      verifyPin: (id, pin) => {
        const profile = get().profiles.find((p) => p.id === id);
        return !!profile && profile.pin != null && profile.pin === pin;
      },

      addReward: (profileId, { coins, xp }) => {
        set((state) => ({
          profiles: state.profiles.map((p) => {
            if (p.id !== profileId) return p;
            const newXp = p.xp + xp;
            const newLevel = levelForXp(newXp);
            return {
              ...p,
              coins: p.coins + coins,
              xp: newXp,
              level: newLevel,
              justLeveledUp: newLevel > p.level,
            };
          }),
        }));
      },

      clearLevelUpFlag: (profileId) => {
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === profileId ? { ...p, justLeveledUp: false } : p
          ),
        }));
      },

      getProfile: (id) => get().profiles.find((p) => p.id === id),
    }),
    { name: 'broski_chores_profiles_v1' }
  )
);
```

Note: this store uses Zustand's `persist` middleware directly (its own `localStorage` key, `broski_chores_profiles_v1`) rather than `src/lib/storage.js` from Task 2 — `persist` already handles the read/write/JSON lifecycle correctly for a Zustand store, and duplicating that with the plain util would just be two competing persistence mechanisms for the same data. `src/lib/storage.js` stays available for anything that isn't already a Zustand store; nothing in this plan ends up needing it directly once `choreStore` (Task 4) also uses `persist` for the same reason — it is still tested and committed from Task 2 as a small, independently useful primitive, not wasted work.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/__tests__/profileStore.test.js`
Expected: 11 passed.

- [ ] **Step 5: Delete the files this store replaces**

```bash
git rm src/stores/gameStore.js src/stores/__tests__/gameStore.test.js src/stores/userStore.js
```

- [ ] **Step 6: Run the full suite to confirm nothing else references the deleted files yet**

Run: `npx vitest run`
Expected: `src/components/3D/__tests__/Avatar.test.jsx` now fails (it mocks `'../../../stores/gameStore'`, which no longer exists) — this is expected and fixed in Task 6, which reworks `Avatar.jsx` itself. Every other test file passes.

- [ ] **Step 7: Commit**

```bash
git add src/stores/profileStore.js src/stores/__tests__/profileStore.test.js
git commit -m "feat: profileStore replaces gameStore + userStore with per-profile economy"
```

---

## Task 4: `choreStore`

**Files:**
- Create: `src/stores/choreStore.js`
- Test: `src/stores/__tests__/choreStore.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks directly (no import of `profileStore` — kept decoupled; the calling component bridges the two, per the plan's Architecture section).
- Produces (exact names, consumed by later tasks): `useChoreStore` hook exposing `{ templates: ChoreTemplate[], instances: ChoreInstance[] }` and actions `addTemplate({title, coinReward, xpReward, assignedTo, schedule}) => ChoreTemplate`, `updateTemplate(id, patch)`, `deactivateTemplate(id)`, `generateTodaysInstances(todayISO, todayWeekday)`, `markDone(instanceId, byProfileId)`, `approve(instanceId) => {profileId, coinReward, xpReward} | null`, `decline(instanceId)`, `instancesForDate(dateISO) => ChoreInstance[]`.

- [ ] **Step 1: Write the failing test**

Create `src/stores/__tests__/choreStore.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';
import { useChoreStore } from '../choreStore';

describe('choreStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useChoreStore.setState({ templates: [], instances: [] });
  });

  it('addTemplate creates an active daily template', () => {
    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog',
      coinReward: 10,
      xpReward: 5,
      assignedTo: 'anyone',
      schedule: { type: 'daily' },
    });

    expect(template.id).toBeTruthy();
    expect(template.title).toBe('Feed the dog');
    expect(template.active).toBe(true);
    expect(useChoreStore.getState().templates).toHaveLength(1);
  });

  it('updateTemplate patches fields on an existing template', () => {
    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().updateTemplate(template.id, { coinReward: 15 });

    expect(useChoreStore.getState().templates[0].coinReward).toBe(15);
    expect(useChoreStore.getState().templates[0].title).toBe('Feed the dog'); // untouched fields survive
  });

  it('deactivateTemplate sets active to false without removing it', () => {
    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().deactivateTemplate(template.id);

    expect(useChoreStore.getState().templates).toHaveLength(1);
    expect(useChoreStore.getState().templates[0].active).toBe(false);
  });

  it('generateTodaysInstances creates one instance per active daily template', () => {
    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');

    const instances = useChoreStore.getState().instancesForDate('2026-07-26');
    expect(instances).toHaveLength(1);
    expect(instances[0].status).toBe('open');
    expect(instances[0].completedBy).toBeNull();
  });

  it('generateTodaysInstances only creates weekday-scheduled instances on a matching weekday', () => {
    useChoreStore.getState().addTemplate({
      title: 'Take out bins', coinReward: 5, xpReward: 5, assignedTo: 'anyone',
      schedule: { type: 'weekdays', days: ['mon', 'thu'] },
    });

    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun'); // a Sunday
    expect(useChoreStore.getState().instancesForDate('2026-07-26')).toHaveLength(0);

    useChoreStore.getState().generateTodaysInstances('2026-07-27', 'mon'); // a Monday
    expect(useChoreStore.getState().instancesForDate('2026-07-27')).toHaveLength(1);
  });

  it('generateTodaysInstances skips inactive templates', () => {
    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().deactivateTemplate(template.id);
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');

    expect(useChoreStore.getState().instancesForDate('2026-07-26')).toHaveLength(0);
  });

  it('generateTodaysInstances is idempotent for the same date', () => {
    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun'); // called again, e.g. app remounted

    expect(useChoreStore.getState().instancesForDate('2026-07-26')).toHaveLength(1);
  });

  it('markDone moves an instance from open to pending and records who did it', () => {
    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');
    const instance = useChoreStore.getState().instancesForDate('2026-07-26')[0];

    useChoreStore.getState().markDone(instance.id, 'evan-id');

    const updated = useChoreStore.getState().instances.find((i) => i.id === instance.id);
    expect(updated.status).toBe('pending');
    expect(updated.completedBy).toBe('evan-id');
  });

  it('approve returns the reward info and moves the instance to approved', () => {
    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');
    const instance = useChoreStore.getState().instancesForDate('2026-07-26')[0];
    useChoreStore.getState().markDone(instance.id, 'evan-id');

    const result = useChoreStore.getState().approve(instance.id);

    expect(result).toEqual({ profileId: 'evan-id', coinReward: 10, xpReward: 5 });
    expect(useChoreStore.getState().instances.find((i) => i.id === instance.id).status).toBe('approved');
  });

  it('approve returns null for an instance that is not pending', () => {
    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');
    const instance = useChoreStore.getState().instancesForDate('2026-07-26')[0]; // still 'open', never markDone'd

    expect(useChoreStore.getState().approve(instance.id)).toBeNull();
  });

  it('decline returns a pending instance to open and clears completedBy, without deleting it', () => {
    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances('2026-07-26', 'sun');
    const instance = useChoreStore.getState().instancesForDate('2026-07-26')[0];
    useChoreStore.getState().markDone(instance.id, 'evan-id');

    useChoreStore.getState().decline(instance.id);

    const updated = useChoreStore.getState().instances.find((i) => i.id === instance.id);
    expect(updated.status).toBe('open');
    expect(updated.completedBy).toBeNull();
    expect(useChoreStore.getState().instances).toHaveLength(1); // not deleted
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/__tests__/choreStore.test.js`
Expected: FAIL — `Cannot find module '../choreStore'`.

- [ ] **Step 3: Write the implementation**

Create `src/stores/choreStore.js`:
```js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function templateAppliesToday(template, todayWeekday) {
  if (!template.active) return false;
  if (template.schedule.type === 'daily') return true;
  return template.schedule.days.includes(todayWeekday);
}

export const useChoreStore = create(
  persist(
    (set, get) => ({
      templates: [],
      instances: [],

      addTemplate: ({ title, coinReward, xpReward, assignedTo, schedule }) => {
        const template = {
          id: crypto.randomUUID(),
          title,
          coinReward,
          xpReward,
          assignedTo,
          schedule,
          active: true,
        };
        set((state) => ({ templates: [...state.templates, template] }));
        return template;
      },

      updateTemplate: (id, patch) => {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
      },

      deactivateTemplate: (id) => {
        set((state) => ({
          templates: state.templates.map((t) => (t.id === id ? { ...t, active: false } : t)),
        }));
      },

      // Idempotent per date: only generates an instance for a template
      // that doesn't already have one for that date, so calling this on
      // every app mount is safe even if today's instances already exist.
      generateTodaysInstances: (todayISO, todayWeekday) => {
        const { templates, instances } = get();
        const existingTemplateIds = new Set(
          instances.filter((i) => i.date === todayISO).map((i) => i.templateId)
        );

        const newInstances = templates
          .filter((t) => templateAppliesToday(t, todayWeekday) && !existingTemplateIds.has(t.id))
          .map((t) => ({
            id: crypto.randomUUID(),
            templateId: t.id,
            date: todayISO,
            assignedTo: t.assignedTo,
            completedBy: null,
            status: 'open',
          }));

        if (newInstances.length > 0) {
          set((state) => ({ instances: [...state.instances, ...newInstances] }));
        }
      },

      instancesForDate: (dateISO) => get().instances.filter((i) => i.date === dateISO),

      markDone: (instanceId, byProfileId) => {
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId ? { ...i, status: 'pending', completedBy: byProfileId } : i
          ),
        }));
      },

      // Returns the reward to credit (the caller is responsible for
      // actually crediting it via profileStore.addReward — this store
      // never imports profileStore, keeping the two decoupled) or null
      // if the instance isn't in a state that can be approved.
      approve: (instanceId) => {
        const instance = get().instances.find((i) => i.id === instanceId);
        if (!instance || instance.status !== 'pending') return null;

        const template = get().templates.find((t) => t.id === instance.templateId);
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId ? { ...i, status: 'approved' } : i
          ),
        }));

        return { profileId: instance.completedBy, coinReward: template.coinReward, xpReward: template.xpReward };
      },

      decline: (instanceId) => {
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId ? { ...i, status: 'open', completedBy: null } : i
          ),
        }));
      },
    }),
    { name: 'broski_chores_chores_v1' }
  )
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/__tests__/choreStore.test.js`
Expected: 11 passed.

- [ ] **Step 5: Commit**

```bash
git add src/stores/choreStore.js src/stores/__tests__/choreStore.test.js
git commit -m "feat: choreStore — templates, daily instance generation, approval lifecycle"
```

---

## Task 5: `PinPad` component + `ProfilePicker` page

**Files:**
- Create: `src/components/PinPad.jsx`
- Test: `src/components/__tests__/PinPad.test.jsx`
- Create: `src/pages/ProfilePicker.jsx`
- Test: `src/pages/__tests__/ProfilePicker.test.jsx`

**Interfaces:**
- Consumes: `useProfileStore` (Task 3) — `profiles`, `selectProfile`, `verifyPin`.
- Produces: `<PinPad onSubmit={(pin) => void} digits={4} />` (controlled internally, calls `onSubmit` once 4 digits are entered). `<ProfilePicker />` — no props; on selecting a kid profile calls `selectProfile` and navigates to `/kid`; on selecting an adult profile shows the `PinPad`, and on a correct PIN calls `selectProfile` and navigates to `/adult`.

- [ ] **Step 1: Write the failing test for `PinPad`**

Create `src/components/__tests__/PinPad.test.jsx`:
```js
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PinPad from '../PinPad';

describe('PinPad', () => {
  it('renders a digit button for 0-9', () => {
    render(<PinPad onSubmit={() => {}} />);
    for (let d = 0; d <= 9; d++) {
      expect(screen.getByRole('button', { name: String(d) })).toBeInTheDocument();
    }
  });

  it('calls onSubmit with the 4-digit pin once 4 digits are entered', () => {
    const onSubmit = vi.fn();
    render(<PinPad onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onSubmit).not.toHaveBeenCalled(); // only 3 digits so far

    fireEvent.click(screen.getByRole('button', { name: '4' }));
    expect(onSubmit).toHaveBeenCalledWith('1234');
  });

  it('clear button resets entered digits without submitting', () => {
    const onSubmit = vi.fn();
    render(<PinPad onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: /clear/i }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: '6' }));

    expect(onSubmit).toHaveBeenCalledWith('3456'); // not '1234', the clear worked
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/PinPad.test.jsx`
Expected: FAIL — `Cannot find module '../PinPad'`.

- [ ] **Step 3: Write `PinPad`**

Create `src/components/PinPad.jsx`:
```jsx
import { useState } from 'react';

export default function PinPad({ onSubmit, digits = 4 }) {
  const [entered, setEntered] = useState('');

  function press(digit) {
    const next = entered + String(digit);
    if (next.length >= digits) {
      onSubmit(next.slice(0, digits));
      setEntered('');
    } else {
      setEntered(next);
    }
  }

  return (
    <div className="max-w-xs mx-auto">
      <div className="text-center text-2xl tracking-widest mb-4" data-testid="pin-display">
        {entered.padEnd(digits, '•').replace(/\d/g, '●')}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="h-16 text-2xl font-semibold bg-white rounded-xl shadow hover:bg-gray-100"
          >
            {d}
          </button>
        ))}
        <button
          onClick={() => setEntered('')}
          className="h-16 text-sm font-medium bg-gray-200 rounded-xl hover:bg-gray-300"
        >
          Clear
        </button>
        <button
          onClick={() => press(0)}
          className="h-16 text-2xl font-semibold bg-white rounded-xl shadow hover:bg-gray-100"
        >
          0
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/PinPad.test.jsx`
Expected: 3 passed.

- [ ] **Step 5: Write the failing test for `ProfilePicker`**

Create `src/pages/__tests__/ProfilePicker.test.jsx`:
```js
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProfilePicker from '../ProfilePicker';
import { useProfileStore } from '../../stores/profileStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderPicker() {
  return render(
    <MemoryRouter>
      <ProfilePicker />
    </MemoryRouter>
  );
}

describe('ProfilePicker', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    useProfileStore.getState().addProfile({ name: 'Bro', role: 'adult', pin: '1234', avatarColor: '#4A90D9' });
  });

  it('renders a tile for every profile', () => {
    renderPicker();
    expect(screen.getByText('Evan')).toBeInTheDocument();
    expect(screen.getByText('Bro')).toBeInTheDocument();
  });

  it('tapping a kid profile selects it and navigates straight to /kid', () => {
    renderPicker();
    fireEvent.click(screen.getByText('Evan'));

    const evan = useProfileStore.getState().profiles.find((p) => p.name === 'Evan');
    expect(useProfileStore.getState().currentProfileId).toBe(evan.id);
    expect(mockNavigate).toHaveBeenCalledWith('/kid');
  });

  it('tapping an adult profile shows the PIN pad instead of navigating immediately', () => {
    renderPicker();
    fireEvent.click(screen.getByText('Bro'));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId('pin-display')).toBeInTheDocument();
  });

  it('a correct PIN selects the adult profile and navigates to /adult', () => {
    renderPicker();
    fireEvent.click(screen.getByText('Bro'));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '4' }));

    const bro = useProfileStore.getState().profiles.find((p) => p.name === 'Bro');
    expect(useProfileStore.getState().currentProfileId).toBe(bro.id);
    expect(mockNavigate).toHaveBeenCalledWith('/adult');
  });

  it('an incorrect PIN does not navigate and does not select the profile', () => {
    renderPicker();
    fireEvent.click(screen.getByText('Bro'));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    fireEvent.click(screen.getByRole('button', { name: '9' }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(useProfileStore.getState().currentProfileId).toBeNull();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/ProfilePicker.test.jsx`
Expected: FAIL — `Cannot find module '../ProfilePicker'`.

- [ ] **Step 7: Write `ProfilePicker`**

Create `src/pages/ProfilePicker.jsx`:
```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import PinPad from '../components/PinPad';

export default function ProfilePicker() {
  const navigate = useNavigate();
  const profiles = useProfileStore((state) => state.profiles);
  const selectProfile = useProfileStore((state) => state.selectProfile);
  const verifyPin = useProfileStore((state) => state.verifyPin);
  const [pinTargetId, setPinTargetId] = useState(null);
  const [pinError, setPinError] = useState(false);

  function pickProfile(profile) {
    if (profile.role === 'kid') {
      selectProfile(profile.id);
      navigate('/kid');
    } else {
      setPinError(false);
      setPinTargetId(profile.id);
    }
  }

  function submitPin(pin) {
    if (verifyPin(pinTargetId, pin)) {
      selectProfile(pinTargetId);
      navigate('/adult');
    } else {
      setPinError(true);
    }
  }

  if (pinTargetId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Enter PIN</h2>
        {pinError && <p className="text-red-600 text-sm">Wrong PIN, try again.</p>}
        <PinPad onSubmit={submitPin} />
        <button
          onClick={() => setPinTargetId(null)}
          className="text-sm text-gray-500 underline"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-2">BROski</h1>
        <p className="text-gray-600">Who's doing chores?</p>
      </header>
      <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-6">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => pickProfile(profile)}
            className="flex flex-col items-center gap-3 bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div
              className="w-20 h-20 rounded-full"
              style={{ backgroundColor: profile.avatarColor }}
            />
            <span className="text-lg font-semibold text-gray-800">{profile.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/pages/__tests__/ProfilePicker.test.jsx`
Expected: 5 passed.

- [ ] **Step 9: Commit**

```bash
git add src/components/PinPad.jsx src/components/__tests__/PinPad.test.jsx src/pages/ProfilePicker.jsx src/pages/__tests__/ProfilePicker.test.jsx
git commit -m "feat: PinPad + ProfilePicker — shared-device profile selection with adult PIN gate"
```

---

## Task 6: Avatar rework + `KidChoreBoard` page

**Files:**
- Create: `src/lib/avatarAnimation.js`
- Test: `src/lib/__tests__/avatarAnimation.test.js`
- Modify: `src/components/3D/Avatar.jsx`
- Modify: `src/components/3D/__tests__/Avatar.test.jsx`
- Create: `src/pages/KidChoreBoard.jsx`
- Test: `src/pages/__tests__/KidChoreBoard.test.jsx`

**Interfaces:**
- Consumes: `useProfileStore` (Task 3), `useChoreStore` (Task 4).
- Produces: `pulseScale(elapsedMs, durationMs) => number` (pure, testable animation-progress function). `<Avatar profileId={string} />` (reads that profile's `avatarColor`/`justLeveledUp` from the store, renders the pulse when leveling up, clears the flag when the animation completes). `<KidChoreBoard />` — no props; reads `currentProfileId` from `profileStore`, redirects to `/` if none.

- [ ] **Step 1: Write the failing test for the animation helper**

Create `src/lib/__tests__/avatarAnimation.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { pulseScale } from '../avatarAnimation';

describe('pulseScale', () => {
  it('returns 1.0 (no scale change) before the pulse starts', () => {
    expect(pulseScale(-10, 1500)).toBe(1);
  });

  it('returns 1.0 exactly at the end of the pulse duration', () => {
    expect(pulseScale(1500, 1500)).toBe(1);
  });

  it('returns 1.0 after the pulse duration has fully elapsed', () => {
    expect(pulseScale(5000, 1500)).toBe(1);
  });

  it('is greater than 1.0 partway through the pulse (the avatar visibly grows)', () => {
    const mid = pulseScale(750, 1500); // halfway
    expect(mid).toBeGreaterThan(1);
  });

  it('peaks and comes back down rather than growing monotonically', () => {
    const early = pulseScale(200, 1500);
    const peak = pulseScale(375, 1500); // quarter-way, where a sine-based pulse peaks
    const late = pulseScale(1300, 1500);
    expect(peak).toBeGreaterThan(early);
    expect(peak).toBeGreaterThan(late);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/avatarAnimation.test.js`
Expected: FAIL — `Cannot find module '../avatarAnimation'`.

- [ ] **Step 3: Write `avatarAnimation.js`**

Create `src/lib/avatarAnimation.js`:
```js
// Pure function: given how many ms have elapsed since a level-up fired,
// returns a scale multiplier for the avatar mesh. 1.0 = normal size.
// A half-sine bump peaking at 1.3x midway through the duration, back to
// 1.0 by the end — separated from Avatar.jsx so the animation curve is
// testable without any Three.js/DOM involved.
const PEAK_SCALE = 1.3;

export function pulseScale(elapsedMs, durationMs) {
  if (elapsedMs < 0 || elapsedMs >= durationMs) return 1;
  const progress = elapsedMs / durationMs; // 0..1
  const bump = Math.sin(progress * Math.PI); // 0 -> 1 -> 0 over the duration
  return 1 + bump * (PEAK_SCALE - 1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/avatarAnimation.test.js`
Expected: 5 passed.

- [ ] **Step 5: Rewrite `Avatar.jsx` to be profile-aware and drop the old `position`/board-movement concept**

Find `src/components/3D/Avatar.jsx` (entire current file):
```jsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';

export default function Avatar() {
  const avatarRef = useRef();
  const { position } = useGameStore();

  useFrame(() => {
    // Animate avatar movement
    if (avatarRef.current) {
      // Simple animation - in a real app, you'd use GSAP or similar
      avatarRef.current.position.x = position * 0.5; // Adjust multiplier as needed
    }
  });

  return (
    <group ref={avatarRef}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1, 0.4]} />
        <meshStandardMaterial color="#FF6B6B" />
      </mesh>
    </group>
  );
}
```

Replace with:
```jsx
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { useProfileStore } from '../../stores/profileStore';
import { pulseScale } from '../../lib/avatarAnimation';

const LEVEL_UP_DURATION_MS = 1500;

export default function Avatar({ profileId }) {
  const avatarRef = useRef();
  const avatarColor = useProfileStore((state) => state.getProfile(profileId)?.avatarColor ?? '#FF6B6B');
  const justLeveledUp = useProfileStore((state) => state.getProfile(profileId)?.justLeveledUp ?? false);
  const clearLevelUpFlag = useProfileStore((state) => state.clearLevelUpFlag);
  const [elapsed, setElapsed] = useState(0);

  useFrame((_, delta) => {
    if (!avatarRef.current) return;

    if (justLeveledUp) {
      const nextElapsed = elapsed + delta * 1000;
      const scale = pulseScale(nextElapsed, LEVEL_UP_DURATION_MS);
      avatarRef.current.scale.setScalar(scale);
      if (nextElapsed >= LEVEL_UP_DURATION_MS) {
        setElapsed(0);
        clearLevelUpFlag(profileId);
      } else {
        setElapsed(nextElapsed);
      }
    } else {
      avatarRef.current.scale.setScalar(1);
    }
  });

  return (
    <group ref={avatarRef}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.8, 1, 0.4]} />
        <meshStandardMaterial color={avatarColor} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 6: Rewrite `Avatar.test.jsx` to match the new profile-driven props**

Find `src/components/3D/__tests__/Avatar.test.jsx` (entire current file — it mocks the deleted `gameStore` and tests a `position` prop that no longer exists):
```jsx
import { render, screen } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { describe, it, expect, vi } from 'vitest';
import Avatar from '../Avatar';
import { useGameStore } from '../../../stores/gameStore';

// Mock the game store
vi.mock('../../../stores/gameStore', () => ({
  useGameStore: vi.fn()
}));

describe('Avatar Component', () => {
  const mockPosition = { x: 0, y: 0, z: 0 };
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock implementation
    useGameStore.mockImplementation((selector) => {
      const state = {
        position: mockPosition,
        // Add other store properties as needed
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders without crashing', () => {
    render(
      <Canvas>
        <Avatar />
      </Canvas>
    );
    
    // The canvas should be rendered
    expect(screen.getByTestId('canvas')).toBeInTheDocument();
  });

  it('uses position from the store', () => {
    const testPosition = { x: 1, y: 2, z: 3 };
    useGameStore.mockImplementation((selector) => {
      const state = {
        position: testPosition,
      };
      return selector ? selector(state) : state;
    });

    render(
      <Canvas>
        <Avatar />
      </Canvas>
    );

    // We can't directly test the Three.js position in the DOM,
    // but we can verify the store was called
    expect(useGameStore).toHaveBeenCalled();
  });

  it('handles missing position gracefully', () => {
    useGameStore.mockImplementation((selector) => {
      const state = {
        position: undefined, // Simulate missing position
      };
      return selector ? selector(state) : state;
    });

    expect(() => {
      render(
        <Canvas>
          <Avatar />
        </Canvas>
      );
    }).not.toThrow();
  });
});
```

Replace with:
```jsx
import { render } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import { describe, it, expect, beforeEach } from 'vitest';
import Avatar from '../Avatar';
import { useProfileStore } from '../../../stores/profileStore';

describe('Avatar Component', () => {
  beforeEach(() => {
    localStorage.clear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
  });

  it('renders without crashing for a known profile', () => {
    const profile = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });

    expect(() => {
      render(
        <Canvas>
          <Avatar profileId={profile.id} />
        </Canvas>
      );
    }).not.toThrow();
  });

  it('handles an unknown profileId gracefully (falls back to a default color)', () => {
    expect(() => {
      render(
        <Canvas>
          <Avatar profileId="does-not-exist" />
        </Canvas>
      );
    }).not.toThrow();
  });
});
```

- [ ] **Step 7: Run the Avatar tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/avatarAnimation.test.js src/components/3D/__tests__/Avatar.test.jsx`
Expected: 5 + 2 = 7 passed.

- [ ] **Step 8: Write the failing test for `KidChoreBoard`**

Create `src/pages/__tests__/KidChoreBoard.test.jsx`:
```js
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import KidChoreBoard from '../KidChoreBoard';
import { useProfileStore } from '../../stores/profileStore';
import { useChoreStore } from '../../stores/choreStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderBoard() {
  return render(
    <MemoryRouter>
      <KidChoreBoard />
    </MemoryRouter>
  );
}

describe('KidChoreBoard', () => {
  let evanId;

  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    useChoreStore.setState({ templates: [], instances: [] });

    const evan = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    evanId = evan.id;
    useProfileStore.getState().selectProfile(evanId);

    useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: evanId, schedule: { type: 'daily' },
    });
    useChoreStore.getState().addTemplate({
      title: 'Water the plants', coinReward: 5, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'daily' },
    });
  });

  it('redirects to / if no profile is selected', () => {
    useProfileStore.getState().clearCurrentProfile();
    renderBoard();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows chores assigned to the current profile and to anyone', () => {
    renderBoard();
    expect(screen.getByText('Feed the dog')).toBeInTheDocument();
    expect(screen.getByText('Water the plants')).toBeInTheDocument();
  });

  it('does not show a chore assigned to a different specific profile', () => {
    useChoreStore.getState().addTemplate({
      title: 'Only for someone else', coinReward: 1, xpReward: 1, assignedTo: 'some-other-id', schedule: { type: 'daily' },
    });
    renderBoard();
    expect(screen.queryByText('Only for someone else')).not.toBeInTheDocument();
  });

  it('tapping Done on an open chore moves it to a pending/waiting state', () => {
    renderBoard();
    const doneButtons = screen.getAllByRole('button', { name: /done/i });
    fireEvent.click(doneButtons[0]);

    expect(screen.getAllByText(/waiting for approval/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 9: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/KidChoreBoard.test.jsx`
Expected: FAIL — `Cannot find module '../KidChoreBoard'`.

- [ ] **Step 10: Write `KidChoreBoard`**

Create `src/pages/KidChoreBoard.jsx`:
```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useProfileStore } from '../stores/profileStore';
import { useChoreStore } from '../stores/choreStore';
import Avatar from '../components/3D/Avatar';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function KidChoreBoard() {
  const navigate = useNavigate();
  const currentProfileId = useProfileStore((state) => state.currentProfileId);
  const profile = useProfileStore((state) => state.getProfile(currentProfileId));
  const instances = useChoreStore((state) => state.instances);
  const templates = useChoreStore((state) => state.templates);
  const markDone = useChoreStore((state) => state.markDone);

  useEffect(() => {
    if (!currentProfileId) navigate('/');
  }, [currentProfileId, navigate]);

  if (!currentProfileId || !profile) return null;

  const myChores = instances.filter(
    (i) =>
      i.date === todayISO() &&
      (i.assignedTo === currentProfileId || i.assignedTo === 'anyone') &&
      i.status !== 'approved'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-purple-700">Hey {profile.name}!</h1>
          <p className="text-gray-600">
            {profile.coins} coins · Level {profile.level}
          </p>
        </div>
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 underline">
          Switch profile
        </button>
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-4 h-64">
          <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Avatar profileId={currentProfileId} />
            <OrbitControls />
          </Canvas>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Today's chores</h2>
          {myChores.length === 0 && <p className="text-gray-500">Nothing left today — nice work!</p>}
          <ul className="space-y-3">
            {myChores.map((instance) => {
              const template = templates.find((t) => t.id === instance.templateId);
              return (
                <li key={instance.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="font-medium text-gray-800">{template.title}</p>
                    <p className="text-sm text-gray-500">
                      {template.coinReward} coins · {template.xpReward} XP
                    </p>
                  </div>
                  {instance.status === 'pending' ? (
                    <span className="text-sm text-amber-600 font-medium">Waiting for approval</span>
                  ) : (
                    <button
                      onClick={() => markDone(instance.id, currentProfileId)}
                      className="bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Done
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: Run test to verify it passes**

Run: `npx vitest run src/pages/__tests__/KidChoreBoard.test.jsx`
Expected: 4 passed.

- [ ] **Step 12: Commit**

```bash
git add src/lib/avatarAnimation.js src/lib/__tests__/avatarAnimation.test.js src/components/3D/Avatar.jsx src/components/3D/__tests__/Avatar.test.jsx src/pages/KidChoreBoard.jsx src/pages/__tests__/KidChoreBoard.test.jsx
git commit -m "feat: profile-aware Avatar with level-up pulse, KidChoreBoard page"
```

---

## Task 7: `AdultDashboard` page

**Files:**
- Create: `src/pages/AdultDashboard.jsx`
- Test: `src/pages/__tests__/AdultDashboard.test.jsx`

**Interfaces:**
- Consumes: `useProfileStore` (Task 3) — `currentProfileId`, `profiles`, `addReward`. `useChoreStore` (Task 4) — `templates`, `instances`, `addTemplate`, `approve`, `decline`.
- Produces: `<AdultDashboard />` — no props; redirects to `/` if no profile selected.

- [ ] **Step 1: Write the failing test**

Create `src/pages/__tests__/AdultDashboard.test.jsx`:
```js
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AdultDashboard from '../AdultDashboard';
import { useProfileStore } from '../../stores/profileStore';
import { useChoreStore } from '../../stores/choreStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderDashboard() {
  return render(
    <MemoryRouter>
      <AdultDashboard />
    </MemoryRouter>
  );
}

describe('AdultDashboard', () => {
  let evanId, broId;

  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    useChoreStore.setState({ templates: [], instances: [] });

    const evan = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    evanId = evan.id;
    const bro = useProfileStore.getState().addProfile({ name: 'Bro', role: 'adult', pin: '1234', avatarColor: '#4A90D9' });
    broId = bro.id;
    useProfileStore.getState().selectProfile(broId);

    const template = useChoreStore.getState().addTemplate({
      title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: evanId, schedule: { type: 'daily' },
    });
    useChoreStore.getState().generateTodaysInstances(new Date().toISOString().slice(0, 10), 'sun');
    const instance = useChoreStore.getState().instancesForDate(new Date().toISOString().slice(0, 10))[0];
    useChoreStore.getState().markDone(instance.id, evanId);
  });

  it('redirects to / if no profile is selected', () => {
    useProfileStore.getState().clearCurrentProfile();
    renderDashboard();
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows pending chores in the approval queue', () => {
    renderDashboard();
    expect(screen.getByText('Feed the dog')).toBeInTheDocument();
    expect(screen.getByText(/evan/i)).toBeInTheDocument();
  });

  it('approving a pending chore credits the completing profile and removes it from the queue', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    expect(useProfileStore.getState().getProfile(evanId).coins).toBe(10);
    expect(useProfileStore.getState().getProfile(evanId).xp).toBe(5);
    expect(screen.queryByText('Feed the dog')).not.toBeInTheDocument();
  });

  it('declining a pending chore returns it to open without crediting anything', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));

    expect(useProfileStore.getState().getProfile(evanId).coins).toBe(0);
    const todaysInstances = useChoreStore.getState().instancesForDate(new Date().toISOString().slice(0, 10));
    expect(todaysInstances[0].status).toBe('open');
  });

  it('adding a new chore template shows it in the template list', () => {
    renderDashboard();
    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Take out bins' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    expect(useChoreStore.getState().templates.some((t) => t.title === 'Take out bins')).toBe(true);
    expect(screen.getByText('Take out bins')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/AdultDashboard.test.jsx`
Expected: FAIL — `Cannot find module '../AdultDashboard'`.

- [ ] **Step 3: Write `AdultDashboard`**

Create `src/pages/AdultDashboard.jsx`:
```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useChoreStore } from '../stores/choreStore';

export default function AdultDashboard() {
  const navigate = useNavigate();
  const currentProfileId = useProfileStore((state) => state.currentProfileId);
  const profiles = useProfileStore((state) => state.profiles);
  const addReward = useProfileStore((state) => state.addReward);

  const templates = useChoreStore((state) => state.templates);
  const instances = useChoreStore((state) => state.instances);
  const addTemplate = useChoreStore((state) => state.addTemplate);
  const approve = useChoreStore((state) => state.approve);
  const decline = useChoreStore((state) => state.decline);

  const [title, setTitle] = useState('');
  const [coinReward, setCoinReward] = useState('');
  const [xpReward, setXpReward] = useState('');

  useEffect(() => {
    if (!currentProfileId) navigate('/');
  }, [currentProfileId, navigate]);

  if (!currentProfileId) return null;

  const pending = instances.filter((i) => i.status === 'pending');

  function nameFor(profileId) {
    return profiles.find((p) => p.id === profileId)?.name ?? 'Someone';
  }

  function handleApprove(instanceId) {
    const result = approve(instanceId);
    if (result) addReward(result.profileId, { coins: result.coinReward, xp: result.xpReward });
  }

  function handleAddTemplate(e) {
    e.preventDefault();
    if (!title || !coinReward || !xpReward) return;
    addTemplate({
      title,
      coinReward: Number(coinReward),
      xpReward: Number(xpReward),
      assignedTo: 'anyone',
      schedule: { type: 'daily' },
    });
    setTitle('');
    setCoinReward('');
    setXpReward('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-700">Adult dashboard</h1>
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 underline">
          Switch profile
        </button>
      </header>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Waiting for approval</h2>
          {pending.length === 0 && <p className="text-gray-500">Nothing to approve right now.</p>}
          <ul className="space-y-3">
            {pending.map((instance) => {
              const template = templates.find((t) => t.id === instance.templateId);
              return (
                <li key={instance.id} className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-800">{template.title}</p>
                  <p className="text-sm text-gray-500 mb-3">
                    by {nameFor(instance.completedBy)} · {template.coinReward} coins · {template.xpReward} XP
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(instance.id)}
                      className="bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => decline(instance.id)}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Chores</h2>
          <form onSubmit={handleAddTemplate} className="space-y-3 mb-6">
            <div>
              <label htmlFor="chore-title" className="block text-sm text-gray-600 mb-1">
                Chore title
              </label>
              <input
                id="chore-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="chore-coins" className="block text-sm text-gray-600 mb-1">
                  Coins
                </label>
                <input
                  id="chore-coins"
                  type="number"
                  value={coinReward}
                  onChange={(e) => setCoinReward(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="chore-xp" className="block text-sm text-gray-600 mb-1">
                  XP
                </label>
                <input
                  id="chore-xp"
                  type="number"
                  value={xpReward}
                  onChange={(e) => setXpReward(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors"
            >
              Add chore
            </button>
          </form>

          <ul className="space-y-2">
            {templates.filter((t) => t.active).map((template) => (
              <li key={template.id} className="text-sm text-gray-700 flex justify-between border-b py-2">
                <span>{template.title}</span>
                <span className="text-gray-500">
                  {template.coinReward}c · {template.xpReward}xp
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

Note the labels use `htmlFor`/`id` pairs (`chore-title`/`chore-coins`/`chore-xp`) specifically so the test's `getByLabelText` queries resolve correctly — this is a real accessibility win too, not just a testing convenience.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/__tests__/AdultDashboard.test.jsx`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/pages/AdultDashboard.jsx src/pages/__tests__/AdultDashboard.test.jsx
git commit -m "feat: AdultDashboard — approval queue + chore template management"
```

---

## Task 8: App integration, routing, and manual verification

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/main.jsx` (no functional change expected — confirm `BrowserRouter` still wraps correctly)

**Interfaces:**
- Consumes: `ProfilePicker` (Task 5), `KidChoreBoard` (Task 6), `AdultDashboard` (Task 7), `useChoreStore.generateTodaysInstances` (Task 4).
- Produces: the actual routed app — nothing further downstream in this plan.

- [ ] **Step 1: Replace `App.jsx`'s single-screen content with routes**

Find `src/App.jsx` (entire current file — the whole thing is being replaced; it currently imports `useGameStore`, deleted in Task 3):
```jsx
import { useGameStore } from './stores/gameStore';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Avatar from './components/3D/Avatar';

export default function App() {
  const { coinBalance, level, experience } = useGameStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-purple-700 mb-2">BROski </h1>
        <p className="text-gray-600">Chores made fun with gamification!</p>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Board */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 h-[500px]">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Game Board</h2>
          <div className="h-[400px] bg-gray-100 rounded-lg">
            <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              <Avatar />
              <OrbitControls />
            </Canvas>
          </div>
        </div>

        {/* Player Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Player Stats</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Coins</p>
                <p className="text-2xl font-bold text-yellow-500"> {coinBalance}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Level {level}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${(experience / 100) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-right text-gray-500">{experience}/100 XP</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors">
                Add Chore
              </button>
              <button className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors">
                View Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Replace with:
```jsx
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProfilePicker from './pages/ProfilePicker';
import KidChoreBoard from './pages/KidChoreBoard';
import AdultDashboard from './pages/AdultDashboard';
import { useChoreStore } from './stores/choreStore';

const WEEKDAY_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function App() {
  const generateTodaysInstances = useChoreStore((state) => state.generateTodaysInstances);

  useEffect(() => {
    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);
    const todayWeekday = WEEKDAY_ABBREV[today.getDay()];
    generateTodaysInstances(todayISO, todayWeekday);
  }, [generateTodaysInstances]);

  return (
    <Routes>
      <Route path="/" element={<ProfilePicker />} />
      <Route path="/kid" element={<KidChoreBoard />} />
      <Route path="/adult" element={<AdultDashboard />} />
    </Routes>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: every test file passes — this is the first point where the entire suite (all tasks combined) should be green with zero pre-existing-failure carve-outs (Task 1's Step 4 exception no longer applies, since `gameStore.test.js` was deleted in Task 3).

- [ ] **Step 3: Manual smoke test in the actual browser**

Run: `npm run dev`, open the printed local URL. Confirm by hand:
1. The profile picker loads with zero profiles (empty state — there's no seed data in this plan; that's expected, profile creation isn't part of this v1's UI either, per spec scope. Note this as a follow-up, don't build it now.)

Since there is currently no way to create a profile from the UI (out of scope for this plan — see the note in Step 4 below), manually seed one kid and one adult profile via the browser console before verifying the rest of the flow:
```js
useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' })
useProfileStore.getState().addProfile({ name: 'Bro', role: 'adult', pin: '1234', avatarColor: '#4A90D9' })
useChoreStore.getState().addTemplate({ title: 'Feed the dog', coinReward: 10, xpReward: 60, assignedTo: 'anyone', schedule: { type: 'daily' } })
```
(These stores are attached to `window` automatically in dev via Vite/React DevTools's Zustand integration — if `useProfileStore`/`useChoreStore` aren't reachable from the console, add a temporary `window.useProfileStore = useProfileStore` line to `main.jsx`, test, then remove it before committing — do not ship a permanent global export.)

Reload the page, then confirm: the two profiles appear on the picker; tapping Evan goes straight to the kid board and shows "Feed the dog"; tapping "Done" shows "Waiting for approval"; tapping Bro on the picker prompts for a PIN, `1234` succeeds and shows the pending chore; clicking Approve credits Evan (visible coin count changes if you navigate back to his board) and the avatar box visibly pulses briefly the next time his board loads with `justLeveledUp` true.

- [ ] **Step 4: Note the follow-up this plan deliberately doesn't cover**

There is no in-app way to create the first profiles — v1 assumes household members are added once via the browser console (as in Step 3) or a future small admin form. This wasn't part of the approved spec's screens (`ProfilePicker`/`KidChoreBoard`/`AdultDashboard` only) and is called out here rather than silently built in, since adding it now would be scope creep beyond what was designed and approved. Flag it as a candidate for a v1.1 follow-up if the shipped app gets real use.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire ProfilePicker/KidChoreBoard/AdultDashboard into App via React Router"
```

- [ ] **Step 6: Push**

```bash
git fetch
git status --short --branch
git push
```

---

## Self-Review Notes

**Spec coverage:** data model (Tasks 3-4), profile picker + PIN gate (Task 5), kid chore board + avatar reward moment (Task 6), adult approval queue + template management (Task 7), routing/integration (Task 8), local-only persistence throughout (Tasks 3-4's `persist` middleware, Task 2's util for anything else), v1 scope cuts respected (no analytics/streaks/dark-mode/auth/Firebase anywhere in this plan).

**Type consistency checked:** `Profile`/`ChoreTemplate`/`ChoreInstance` shapes from the "Core shapes" section are used identically in every task that touches them (`profileStore.js`, `choreStore.js`, `ProfilePicker.jsx`, `KidChoreBoard.jsx`, `AdultDashboard.jsx`, `Avatar.jsx`). `approve()`'s return shape (`{profileId, coinReward, xpReward} | null`) matches exactly between Task 4's implementation and Task 7's consumption in `handleApprove`. `pulseScale(elapsedMs, durationMs)`'s signature matches between Task 6's test and its two call sites (the test file and `Avatar.jsx`).

**Cross-task dependency resolved during planning:** Task 6 (`Avatar.jsx` rework) has to land before Task 8 can wire `App.jsx`, since `KidChoreBoard` (also Task 6) already renders `Avatar` — ordering in this plan reflects that; Task 8 only touches `App.jsx` itself, never `Avatar.jsx` again.

**Real bugs found in the existing scaffold and fixed as part of this plan** (not silently worked around):
- `src/__tests__/setup.js` imported `@jest/globals` in a Vitest project — a package that isn't even installed. This blocked every single test in the repo from running at all, and was only discovered by actually running `npx vitest run` before writing this plan (Task 1, Step 2) rather than trusting `package.json`'s `"test": "vitest"` script name into assuming the suite worked.
- `node_modules` didn't exist anywhere in the repo — `npm install` had never been run, confirmed directly (`ls node_modules` → "No such file or directory") before this plan was written. Nothing in this codebase — dev server, tests, lint — had ever actually executed to completion.
- `src/stores/__tests__/gameStore.test.js` called `moveAvatar({x, y, z})` (an object) while `gameStore.js`'s real implementation treated `position` as a plain number — the test and the code it claimed to test had diverged. Both files are deleted in Task 3 rather than reconciled, since the `gameStore` concept itself (global, non-persisted, board-position-based) doesn't survive the rework to a per-profile economy.
