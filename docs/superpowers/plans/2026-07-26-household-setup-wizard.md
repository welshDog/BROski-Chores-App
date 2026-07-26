# Household Setup Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close README's top-named v1.1 gap (no in-app profile creation) with a first-run wizard: welcome → add kids → add adult (with PIN) → optional first chore → finish, landing on the normal profile picker.

**Architecture:** `ProfilePicker.jsx` conditionally renders a new `SetupWizard` page when `profiles.length === 0`. The wizard holds everything it collects in its own local React state and writes nothing to `profileStore`/`choreStore` until a single Finish commit — this is what makes "remove a draft kid before continuing" free (no new store method) and avoids a premature-unmount race where committing the first kid mid-flow would flip `profiles.length` and yank `ProfilePicker` out of wizard mode early.

**Tech Stack:** React + Vite + Zustand + React Router v6 + Vitest + React Testing Library, plain JS/JSX, Tailwind for styling — matching the existing app exactly, no new dependencies.

## Global Constraints

- No new `profileStore` or `choreStore` methods anywhere in this plan — `addProfile`, `addTemplate`, and `generateTodaysInstances` already cover everything needed.
- No new route — the wizard is a conditional render inside the existing `/` route (`ProfilePicker`), not a new page/path.
- `ChoreTemplateForm`'s new `kidsOverride` prop is purely additive: when omitted, behavior must be byte-for-byte identical to today (both existing call sites in `AdultDashboard.jsx` omit it and must keep passing their existing tests unmodified).
- Nothing is written to `profileStore`/`choreStore` until the wizard's Finish step runs — no incremental commits per step.
- Finish commit order matters: kids first (building a `draftId → real id` map from each `addProfile` call's return value), then the adult, then the optional chore (with `assignedTo` resolved through that map), then `generateTodaysInstances(...)` — only if a chore was added.
- At least 1 kid and exactly 1 adult are required to reach the chore step; the chore step itself is optional/skippable.
- The adult PIN requires two-step confirmation (set, then confirm); on mismatch, keep the original set PIN (`pendingPin`) unchanged and only reset the confirm attempt — do not send the user back to re-enter the PIN from scratch.
- No back button spanning wizard steps. Corrections are local to a step: removing a kid from the running list, `PinPad`'s own built-in Clear button, and restarting just the confirm-PIN attempt on mismatch.
- Out of scope, do not build: editing/removing a profile after the wizard finishes, multiple adults in one wizard pass, re-entering the wizard once any profile exists, any change to `PinPad.jsx`/`profileStore.js`/`choreStore.js`.

---

### Task 1: `AvatarColorSwatches` component

**Files:**
- Create: `src/components/AvatarColorSwatches.jsx`
- Test: `src/components/__tests__/AvatarColorSwatches.test.jsx`

**Interfaces:**
- Produces: `<AvatarColorSwatches value={string} onChange={(hex: string) => void} />` — a fixed row of 8 preset color swatches. Clicking one calls `onChange` with that swatch's hex string. The swatch whose hex equals `value` renders with `aria-pressed="true"`; every other swatch renders `aria-pressed="false"`.
- Consumes: nothing (no store, no props beyond `value`/`onChange`).

- [ ] **Step 1: Write the failing tests**

```jsx
// src/components/__tests__/AvatarColorSwatches.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AvatarColorSwatches from '../AvatarColorSwatches';

describe('AvatarColorSwatches', () => {
  it("calls onChange with the clicked swatch's color", () => {
    const onChange = vi.fn();
    render(<AvatarColorSwatches value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '#4A90D9' }));

    expect(onChange).toHaveBeenCalledWith('#4A90D9');
  });

  it('marks the swatch matching value as pressed, and every other swatch as not', () => {
    render(<AvatarColorSwatches value="#4A90D9" onChange={() => {}} />);

    expect(screen.getByRole('button', { name: '#4A90D9' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '#FF6B6B' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders exactly 8 swatches', () => {
    render(<AvatarColorSwatches value="" onChange={() => {}} />);

    expect(screen.getAllByRole('button')).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/AvatarColorSwatches.test.jsx`
Expected: FAIL with "Failed to resolve import "../AvatarColorSwatches"" (the component file doesn't exist yet)

- [ ] **Step 3: Write the implementation**

```jsx
// src/components/AvatarColorSwatches.jsx
const SWATCHES = ['#FF6B6B', '#4A90D9', '#F5A623', '#7ED321', '#BD10E0', '#50E3C2', '#F8E71C', '#FF7AA2'];

export default function AvatarColorSwatches({ value, onChange }) {
  return (
    <div role="group" aria-label="Avatar color" className="flex gap-2 flex-wrap">
      {SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-pressed={value === color}
          aria-label={color}
          className={`w-8 h-8 rounded-full border-2 transition-colors ${
            value === color ? 'border-gray-800' : 'border-transparent'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/AvatarColorSwatches.test.jsx`
Expected: PASS, 3/3 tests

- [ ] **Step 5: Commit**

```bash
git add src/components/AvatarColorSwatches.jsx src/components/__tests__/AvatarColorSwatches.test.jsx
git commit -m "feat: AvatarColorSwatches -- reusable fixed-palette color picker"
```

---

### Task 2: `ChoreTemplateForm` `kidsOverride` prop

**Files:**
- Modify: `src/components/ChoreTemplateForm.jsx:34-37`
- Test: `src/components/__tests__/ChoreTemplateForm.test.jsx` (append one test)

**Interfaces:**
- Consumes: nothing new.
- Produces: `<ChoreTemplateForm ... kidsOverride={{id: string, name: string}[]} />` — new optional prop. When provided, the assignee `<select>`'s kid options come from this array instead of `useProfileStore`. When omitted, behavior is unchanged from today (confirmed by every existing test in this file, none of which pass this prop).

- [ ] **Step 1: Write the failing test**

Append this test to the end of the `describe('ChoreTemplateForm', ...)` block in `src/components/__tests__/ChoreTemplateForm.test.jsx`, immediately before the closing `});` of the describe block (after the existing `'renders a Cancel button only when onCancel is provided'` test):

```jsx
  it('uses kidsOverride for the assignee list instead of the store, when provided', () => {
    render(
      <ChoreTemplateForm
        initialValues={null}
        onSubmit={() => {}}
        submitLabel="Add chore"
        kidsOverride={[{ id: 'draft-1', name: 'DraftKid' }]}
      />
    );

    expect(screen.getByRole('option', { name: 'DraftKid' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Evan' })).not.toBeInTheDocument();
  });
```

(This file's existing `beforeEach` seeds a real kid profile named `'Evan'` via `useProfileStore` — the test above proves that when `kidsOverride` is passed, that real store-sourced kid is NOT what appears in the dropdown; only the override's `'DraftKid'` appears.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/ChoreTemplateForm.test.jsx -t "kidsOverride"`
Expected: FAIL — `getByRole('option', { name: 'DraftKid' })` finds nothing, because the component doesn't accept or use `kidsOverride` yet (the dropdown currently only ever shows `Evan`)

- [ ] **Step 3: Modify the implementation**

In `src/components/ChoreTemplateForm.jsx`, find:

```jsx
export default function ChoreTemplateForm({ initialValues, onSubmit, submitLabel, onCancel, idPrefix = 'chore' }) {
  const [state, setState] = useState(() => normalize(initialValues));
  const [dayError, setDayError] = useState(false);
  const kids = useProfileStore((s) => s.profiles.filter((p) => p.role === 'kid'));
```

Replace with:

```jsx
export default function ChoreTemplateForm({ initialValues, onSubmit, submitLabel, onCancel, idPrefix = 'chore', kidsOverride }) {
  const [state, setState] = useState(() => normalize(initialValues));
  const [dayError, setDayError] = useState(false);
  const storeKids = useProfileStore((s) => s.profiles.filter((p) => p.role === 'kid'));
  const kids = kidsOverride ?? storeKids;
```

No other line in this file changes — the rest of the component already reads from the `kids` variable, which now resolves to the override when provided.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/ChoreTemplateForm.test.jsx`
Expected: PASS, 12/12 tests (11 existing + 1 new)

- [ ] **Step 5: Commit**

```bash
git add src/components/ChoreTemplateForm.jsx src/components/__tests__/ChoreTemplateForm.test.jsx
git commit -m "feat: ChoreTemplateForm accepts an optional kidsOverride prop"
```

---

### Task 3: `SetupWizard` component

**Files:**
- Create: `src/pages/SetupWizard.jsx`
- Test: `src/pages/__tests__/SetupWizard.test.jsx`

**Interfaces:**
- Consumes: `useProfileStore` (`addProfile` — returns the created profile object including its real `id`), `useChoreStore` (`addTemplate`, `generateTodaysInstances(todayISO, todayWeekday)`), `AvatarColorSwatches` from Task 1 (`<AvatarColorSwatches value={string} onChange={(hex)=>void} />`), `PinPad` (existing, unchanged — `<PinPad onSubmit={(pin: string)=>void} />`, 4-digit, clears its own state after each submit), `ChoreTemplateForm` from Task 2 (`<ChoreTemplateForm initialValues={null} onSubmit={(patch)=>void} submitLabel={string} idPrefix={string} kidsOverride={{id,name}[]} />`).
- Produces: `<SetupWizard />` — no props. Rendered standalone in this task's tests (not yet wired into `ProfilePicker` — that's Task 4). On Finish, commits all collected data to the stores per the sequence in Global Constraints.

- [ ] **Step 1: Write the failing tests**

```jsx
// src/pages/__tests__/SetupWizard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import SetupWizard from '../SetupWizard';
import { useProfileStore } from '../../stores/profileStore';
import { useChoreStore } from '../../stores/choreStore';

function goPastKids(kidName = 'Evan', hex = '#FF6B6B') {
  fireEvent.click(screen.getByRole('button', { name: /get started/i }));
  fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: kidName } });
  fireEvent.click(screen.getByRole('button', { name: hex }));
  fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

function goPastAdultName(adultName = 'Bro', hex = '#4A90D9') {
  fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: adultName } });
  fireEvent.click(screen.getByRole('button', { name: hex }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
}

function enterPin(pin) {
  for (const digit of pin) {
    fireEvent.click(screen.getByRole('button', { name: digit }));
  }
}

describe('SetupWizard', () => {
  beforeEach(() => {
    localStorage.clear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    useChoreStore.setState({ templates: [], instances: [] });
  });

  it('adding a kid appends it to the list, and removing one removes it', () => {
    render(<SetupWizard />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: 'Evan' } });
    fireEvent.click(screen.getByRole('button', { name: '#FF6B6B' }));
    fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));

    expect(screen.getByText('Evan')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(screen.queryByText('Evan')).not.toBeInTheDocument();
  });

  it('Continue past the kids step is disabled with zero kids, enabled once one is added', () => {
    render(<SetupWizard />);
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));

    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: 'Evan' } });
    fireEvent.click(screen.getByRole('button', { name: '#FF6B6B' }));
    fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));

    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  it('a mismatched PIN confirmation shows an error and does not advance past the adult step', () => {
    render(<SetupWizard />);
    goPastKids();
    goPastAdultName();

    enterPin('1234');
    enterPin('9999');

    expect(screen.getByText(/didn't match/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /skip for now/i })).not.toBeInTheDocument();
  });

  it('a matching PIN confirmation advances to the chore step', () => {
    render(<SetupWizard />);
    goPastKids();
    goPastAdultName();

    enterPin('1234');
    enterPin('1234');

    expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
  });

  it('Skip on the chore step commits both profiles but creates no template', () => {
    render(<SetupWizard />);
    goPastKids();
    goPastAdultName();
    enterPin('1234');
    enterPin('1234');

    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(useProfileStore.getState().profiles).toHaveLength(2);
    expect(useChoreStore.getState().templates).toHaveLength(0);
  });

  it("Finish resolves a specifically-assigned draft kid to the real committed profile id, and generates today's instance", () => {
    render(<SetupWizard />);

    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: 'Evan' } });
    fireEvent.click(screen.getByRole('button', { name: '#FF6B6B' }));
    fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));
    fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: 'Ali' } });
    fireEvent.click(screen.getByRole('button', { name: '#7ED321' }));
    fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    goPastAdultName();
    enterPin('1234');
    enterPin('1234');

    const aliOptionValue = screen.getByRole('option', { name: 'Ali' }).value;
    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Feed the dog' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/assign to/i), { target: { value: aliOptionValue } });
    fireEvent.click(screen.getByRole('button', { name: /^add chore$/i }));

    const profiles = useProfileStore.getState().profiles;
    expect(profiles).toHaveLength(3);
    const ali = profiles.find((p) => p.name === 'Ali');
    expect(ali).toBeTruthy();

    const templates = useChoreStore.getState().templates;
    expect(templates).toHaveLength(1);
    expect(templates[0].assignedTo).toBe(ali.id);
    expect(templates[0].assignedTo).not.toBe(aliOptionValue);

    const today = new Date().toISOString().slice(0, 10);
    const instances = useChoreStore.getState().instances;
    expect(instances.some((i) => i.date === today && i.templateId === templates[0].id)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/__tests__/SetupWizard.test.jsx`
Expected: FAIL with "Failed to resolve import "../SetupWizard"" (the component file doesn't exist yet)

- [ ] **Step 3: Write the implementation**

```jsx
// src/pages/SetupWizard.jsx
import { useState } from 'react';
import { useProfileStore } from '../stores/profileStore';
import { useChoreStore } from '../stores/choreStore';
import AvatarColorSwatches from '../components/AvatarColorSwatches';
import PinPad from '../components/PinPad';
import ChoreTemplateForm from '../components/ChoreTemplateForm';

const WEEKDAY_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function SetupWizard() {
  const addProfile = useProfileStore((s) => s.addProfile);
  const addTemplate = useChoreStore((s) => s.addTemplate);
  const generateTodaysInstances = useChoreStore((s) => s.generateTodaysInstances);

  const [step, setStep] = useState('welcome');

  const [draftKids, setDraftKids] = useState([]);
  const [kidName, setKidName] = useState('');
  const [kidColor, setKidColor] = useState('');

  const [adultName, setAdultName] = useState('');
  const [adultColor, setAdultColor] = useState('');
  const [pendingPin, setPendingPin] = useState(null);
  const [confirmedPin, setConfirmedPin] = useState(null);
  const [pinError, setPinError] = useState(false);

  function addDraftKid() {
    if (!kidName || !kidColor) return;
    setDraftKids((prev) => [...prev, { draftId: crypto.randomUUID(), name: kidName, avatarColor: kidColor }]);
    setKidName('');
    setKidColor('');
  }

  function removeDraftKid(draftId) {
    setDraftKids((prev) => prev.filter((k) => k.draftId !== draftId));
  }

  function continueFromAdultName() {
    if (!adultName || !adultColor) return;
    setStep('adult-pin');
  }

  function handleSetPin(pin) {
    setPendingPin(pin);
    setPinError(false);
    setStep('adult-pin-confirm');
  }

  // On mismatch we deliberately stay on this same step with pendingPin
  // untouched -- only the confirm attempt is retried, per the spec's
  // "reset just the confirm step" rule. PinPad already clears its own
  // entered digits after every 4-digit submit, so it's ready to go again.
  function handleConfirmPin(pin) {
    if (pin === pendingPin) {
      setConfirmedPin(pin);
      setPinError(false);
      setStep('chore');
    } else {
      setPinError(true);
    }
  }

  // Single commit point: nothing touches profileStore/choreStore before
  // this runs. Kids are committed before the adult, and the adult before
  // the (optional) chore, so a kid-specific chore assignment can resolve
  // through a real profile id, never a draft-local one.
  function handleFinish(chorePatch) {
    const idMap = {};
    draftKids.forEach((kid) => {
      const created = addProfile({ name: kid.name, role: 'kid', avatarColor: kid.avatarColor });
      idMap[kid.draftId] = created.id;
    });

    addProfile({ name: adultName, role: 'adult', pin: confirmedPin, avatarColor: adultColor });

    if (chorePatch) {
      const resolvedAssignedTo = chorePatch.assignedTo === 'anyone' ? 'anyone' : idMap[chorePatch.assignedTo];
      addTemplate({ ...chorePatch, assignedTo: resolvedAssignedTo });
      const today = new Date();
      generateTodaysInstances(today.toISOString().slice(0, 10), WEEKDAY_ABBREV[today.getDay()]);
    }
  }

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-purple-50 p-6 text-center">
        <h1 className="text-4xl font-bold text-purple-700">Let's set up your household</h1>
        <p className="text-gray-600 max-w-md">
          We'll add who's doing chores, one adult with a PIN to approve them, and -- if you want -- your first chore.
        </p>
        <button
          onClick={() => setStep('kids')}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl text-lg hover:bg-purple-700 transition-colors"
        >
          Get started
        </button>
      </div>
    );
  }

  if (step === 'kids') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <h2 className="text-2xl font-bold text-purple-700">Add the kids</h2>
        <div className="w-full max-w-sm space-y-3 bg-white rounded-xl shadow-md p-6">
          <div>
            <label htmlFor="wizard-kid-name" className="block text-sm text-gray-600 mb-1">
              Kid's name
            </label>
            <input
              id="wizard-kid-name"
              value={kidName}
              onChange={(e) => setKidName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <AvatarColorSwatches value={kidColor} onChange={setKidColor} />
          <button
            onClick={addDraftKid}
            className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors"
          >
            Add kid
          </button>
        </div>

        {draftKids.length > 0 && (
          <ul className="w-full max-w-sm space-y-2">
            {draftKids.map((kid) => (
              <li key={kid.draftId} className="flex items-center justify-between bg-white rounded-lg shadow-sm px-4 py-2">
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full" style={{ backgroundColor: kid.avatarColor }} />
                  {kid.name}
                </span>
                <button onClick={() => removeDraftKid(kid.draftId)} className="text-sm text-red-600 underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => setStep('adult-name')}
          disabled={draftKids.length === 0}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl text-lg hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    );
  }

  if (step === 'adult-name') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <h2 className="text-2xl font-bold text-purple-700">Add an adult</h2>
        <div className="w-full max-w-sm space-y-3 bg-white rounded-xl shadow-md p-6">
          <div>
            <label htmlFor="wizard-adult-name" className="block text-sm text-gray-600 mb-1">
              Your name
            </label>
            <input
              id="wizard-adult-name"
              value={adultName}
              onChange={(e) => setAdultName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <AvatarColorSwatches value={adultColor} onChange={setAdultColor} />
        </div>
        <button
          onClick={continueFromAdultName}
          disabled={!adultName || !adultColor}
          className="bg-purple-600 text-white px-6 py-3 rounded-xl text-lg hover:bg-purple-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    );
  }

  if (step === 'adult-pin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Set a PIN</h2>
        <p className="text-gray-600 text-sm">This unlocks the adult dashboard to approve chores.</p>
        <PinPad onSubmit={handleSetPin} />
      </div>
    );
  }

  if (step === 'adult-pin-confirm') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
        <h2 className="text-xl font-semibold text-gray-800">Confirm PIN</h2>
        {pinError && <p className="text-red-600 text-sm">PINs didn't match, try again.</p>}
        <PinPad onSubmit={handleConfirmPin} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <h2 className="text-2xl font-bold text-purple-700">Add your first chore?</h2>
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-6">
        <ChoreTemplateForm
          initialValues={null}
          onSubmit={handleFinish}
          submitLabel="Add chore"
          idPrefix="wizard-chore"
          kidsOverride={draftKids.map((kid) => ({ id: kid.draftId, name: kid.name }))}
        />
      </div>
      <button onClick={() => handleFinish(null)} className="text-sm text-gray-500 underline">
        Skip for now
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/__tests__/SetupWizard.test.jsx`
Expected: PASS, 6/6 tests

- [ ] **Step 5: Commit**

```bash
git add src/pages/SetupWizard.jsx src/pages/__tests__/SetupWizard.test.jsx
git commit -m "feat: SetupWizard -- first-run household onboarding flow"
```

---

### Task 4: Wire `SetupWizard` into `ProfilePicker`

**Files:**
- Modify: `src/pages/ProfilePicker.jsx:1-13`
- Test: `src/pages/__tests__/ProfilePicker.test.jsx` (append one test)

**Interfaces:**
- Consumes: `SetupWizard` from Task 3 (`<SetupWizard />`, no props).
- Produces: nothing further downstream -- this is the last task in the plan. After this task, a fresh install with zero profiles shows the wizard; finishing it shows the normal picker.

- [ ] **Step 1: Write the failing test**

Append this test to the end of the `describe('ProfilePicker', ...)` block in `src/pages/__tests__/ProfilePicker.test.jsx`, immediately before the closing `});`:

```jsx
  it('after finishing the setup wizard from an empty household, the picker shows the new profiles', () => {
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    renderPicker();

    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    fireEvent.change(screen.getByLabelText(/kid's name/i), { target: { value: 'Evan' } });
    fireEvent.click(screen.getByRole('button', { name: '#FF6B6B' }));
    fireEvent.click(screen.getByRole('button', { name: /^add kid$/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Bro' } });
    fireEvent.click(screen.getByRole('button', { name: '#4A90D9' }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    for (const digit of '1234') fireEvent.click(screen.getByRole('button', { name: digit }));
    for (const digit of '1234') fireEvent.click(screen.getByRole('button', { name: digit }));

    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }));

    expect(screen.getByText('Evan')).toBeInTheDocument();
    expect(screen.getByText('Bro')).toBeInTheDocument();
  });
```

(This file's `beforeEach` always seeds 2 profiles before every test, so this new test starts by explicitly resetting `profiles` back to empty -- overriding just this one test's starting state, leaving `beforeEach` and every other test in this file untouched.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/__tests__/ProfilePicker.test.jsx -t "after finishing the setup wizard"`
Expected: FAIL -- `getByRole('button', { name: /get started/i })` finds nothing, because `ProfilePicker` doesn't render `SetupWizard` yet; with zero profiles it currently renders an empty grid instead.

- [ ] **Step 3: Modify the implementation**

In `src/pages/ProfilePicker.jsx`, find:

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
```

Replace with:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import PinPad from '../components/PinPad';
import SetupWizard from './SetupWizard';

export default function ProfilePicker() {
  const navigate = useNavigate();
  const profiles = useProfileStore((state) => state.profiles);
  const selectProfile = useProfileStore((state) => state.selectProfile);
  const verifyPin = useProfileStore((state) => state.verifyPin);
  const [pinTargetId, setPinTargetId] = useState(null);
  const [pinError, setPinError] = useState(false);

  if (profiles.length === 0) return <SetupWizard />;

  function pickProfile(profile) {
```

No other line in this file changes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/pages/__tests__/ProfilePicker.test.jsx`
Expected: PASS, 6/6 tests (5 existing + 1 new)

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: PASS, all test files green (71 pre-existing + 3 new in `AvatarColorSwatches.test.jsx` + 1 new in `ChoreTemplateForm.test.jsx` + 6 new in `SetupWizard.test.jsx` + 1 new in `ProfilePicker.test.jsx` = 82 total)

- [ ] **Step 6: Build sanity check**

Run: `npm run build`
Expected: succeeds, no new errors or warnings beyond the pre-existing three.js chunk-size notice

- [ ] **Step 7: Commit**

```bash
git add src/pages/ProfilePicker.jsx src/pages/__tests__/ProfilePicker.test.jsx
git commit -m "feat: wire SetupWizard into ProfilePicker for empty households"
```

- [ ] **Step 8: Push**

```bash
git fetch
git status --short --branch
git push
```

---

## Self-Review Notes

**Spec coverage:** Welcome screen (Task 3, `step === 'welcome'`), add-kids loop with remove-before-commit (Task 3, `draftKids`/`removeDraftKid`), add-exactly-one-adult with two-step PIN confirmation (Task 3, `adult-name` → `adult-pin` → `adult-pin-confirm`), optional first-chore step via `kidsOverride` (Task 2 + Task 3), single atomic Finish commit with `draftId → id` resolution and `generateTodaysInstances` (Task 3 `handleFinish`), entry gate in `ProfilePicker` (Task 4). Every spec section maps to a task.

**Placeholder scan:** No TBD/TODO/"add appropriate" language anywhere in this plan; every step has complete, runnable code.

**Type consistency:** `AvatarColorSwatches`'s `{value, onChange}` interface (Task 1) matches exactly how `SetupWizard` calls it (Task 3, `kidColor`/`setKidColor` and `adultColor`/`setAdultColor`). `ChoreTemplateForm`'s `kidsOverride: {id, name}[]` shape (Task 2) matches exactly what `SetupWizard` passes (Task 3: `draftKids.map(k => ({id: k.draftId, name: k.name}))`) -- the component never learns about `draftId`, only ever sees `id`. `handleFinish(chorePatch)`'s signature is called two ways in Task 3 (`onSubmit={handleFinish}` from `ChoreTemplateForm`, and `() => handleFinish(null)` from Skip) -- both consistent with the single-argument, nullable-patch signature.

**Existing-test preservation:** Task 2 leaves all 11 existing `ChoreTemplateForm.test.jsx` tests untouched (only appends one). Task 4 leaves all 5 existing `ProfilePicker.test.jsx` tests untouched (only appends one, which explicitly re-empties the store rather than relying on or modifying the shared `beforeEach`). Neither `AdultDashboard.jsx` call site of `ChoreTemplateForm` passes `kidsOverride`, so both continue to read from the live store exactly as today -- traced against `AdultDashboard.jsx:128-133` (add) and `:141-147` (edit).
