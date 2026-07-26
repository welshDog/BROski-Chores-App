# Chore Template Management v1.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `AdultDashboard` to the chore-template editing capabilities `choreStore` already has (`updateTemplate`, `deactivateTemplate`) but no UI exposes — edit, deactivate/reactivate, assignee picker, weekday scheduling.

**Architecture:** One new shared form component (`ChoreTemplateForm`) used for both adding and editing a template, driven inline (no modal) via a single `editingTemplateId` piece of state in `AdultDashboard`. No new `choreStore` methods — `updateTemplate(id, patch)` already covers both editing and reactivating (`{ active: true }` is just a patch).

**Tech Stack:** React 18, Zustand (`profileStore`, `choreStore` — both already exist, untouched by this plan except calling their existing methods), Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-07-26-chore-template-management-v1.1-design.md` (approved 2026-07-26).

## Global Constraints

- No new `choreStore` methods — `updateTemplate`/`deactivateTemplate` already cover everything this plan needs.
- No modal/dialog infrastructure — editing happens inline, in place.
- A `ChoreInstance` already generated for today is never retroactively mutated by an edit/deactivate/reactivate — only future generation reflects a template change.
- Every template-mutating action (add, edit-save, deactivate, reactivate) re-triggers `generateTodaysInstances` — it's already idempotent per template+date, so this is always safe to call unconditionally.
- The assignee `<select>`'s option *value* must be the kid's `profile.id` (or the literal string `'anyone'`) — never a display name. `KidChoreBoard.jsx` compares `assignedTo === currentProfileId` directly.
- `schedule` is exactly `{ type: 'daily' }` or `{ type: 'weekdays', days: [...] }` — never a third kind.
- Hard-delete, reordering, bulk actions, and profile/PIN editing are explicitly out of scope — do not add them.

## Confirmed current-state facts (verified before writing this plan)

- `src/pages/AdultDashboard.jsx` currently has an inline add-only form (`title`/`coinReward`/`xpReward` state, hardcoded `assignedTo: 'anyone'` and `schedule: { type: 'daily' }`), and its templates list filters to `t.active` only — deactivated templates vanish with no way back in the UI.
- `src/pages/__tests__/AdultDashboard.test.jsx` currently has **7 passing tests**. This plan preserves all 7 unmodified — the add flow keeps the same field labels (`Chore title`/`Coins`/`XP`) and button text (`Add chore`), so existing label-text-based queries keep resolving correctly.
- `src/stores/choreStore.js`'s `updateTemplate(id, patch)` and `deactivateTemplate(id)` are already implemented and tested (v1 Task 4) — this plan calls them, doesn't change them.
- `src/stores/profileStore.js`'s `profiles` array is the source for the assignee picker's kid list.

---

## Task 1: `ChoreTemplateForm` shared component

**Files:**
- Create: `src/components/ChoreTemplateForm.jsx`
- Test: `src/components/__tests__/ChoreTemplateForm.test.jsx`

**Interfaces:**
- Consumes: `useProfileStore` (existing, for the kid list).
- Produces: `<ChoreTemplateForm initialValues={template|null} onSubmit={(patch) => void} submitLabel={string} onCancel={(() => void)?} idPrefix={string="chore"} />`. `onSubmit`'s `patch` shape: `{ title: string, coinReward: number, xpReward: number, assignedTo: string, schedule: {type:'daily'} | {type:'weekdays', days: string[]} }`. Consumed by Task 2's `AdultDashboard.jsx`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/ChoreTemplateForm.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ChoreTemplateForm from '../ChoreTemplateForm';
import { useProfileStore } from '../../stores/profileStore';

describe('ChoreTemplateForm', () => {
  let evanId;

  beforeEach(() => {
    localStorage.clear();
    useProfileStore.setState({ profiles: [], currentProfileId: null });
    const evan = useProfileStore.getState().addProfile({ name: 'Evan', role: 'kid', avatarColor: '#FF6B6B' });
    evanId = evan.id;
    useProfileStore.getState().addProfile({ name: 'Bro', role: 'adult', pin: '1234', avatarColor: '#4A90D9' });
  });

  it('add mode (initialValues null) starts with empty fields, "anyone" assignee, and daily schedule', () => {
    render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" />);

    expect(screen.getByLabelText(/chore title/i).value).toBe('');
    expect(screen.getByLabelText(/assign to/i).value).toBe('anyone');
    expect(screen.getByRole('button', { name: /every day/i })).toHaveClass('bg-purple-600');
    expect(screen.queryByRole('checkbox', { name: 'Mon' })).not.toBeInTheDocument();
  });

  it('edit mode normalizes a daily template into the same internal shape as add mode, pre-filled', () => {
    render(
      <ChoreTemplateForm
        initialValues={{ title: 'Feed the dog', coinReward: 10, xpReward: 5, assignedTo: evanId, schedule: { type: 'daily' } }}
        onSubmit={() => {}}
        submitLabel="Save"
      />
    );

    expect(screen.getByLabelText(/chore title/i).value).toBe('Feed the dog');
    expect(screen.getByLabelText(/coins/i).value).toBe('10');
    expect(screen.getByLabelText(/xp/i).value).toBe('5');
    expect(screen.getByLabelText(/assign to/i).value).toBe(evanId);
    expect(screen.queryByRole('checkbox', { name: 'Mon' })).not.toBeInTheDocument();
  });

  it("edit mode normalizes a weekdays template's days correctly", () => {
    render(
      <ChoreTemplateForm
        initialValues={{ title: 'Take out bins', coinReward: 5, xpReward: 5, assignedTo: 'anyone', schedule: { type: 'weekdays', days: ['mon', 'thu'] } }}
        onSubmit={() => {}}
        submitLabel="Save"
      />
    );

    expect(screen.getByRole('button', { name: /specific days/i })).toHaveClass('bg-purple-600');
    expect(screen.getByRole('checkbox', { name: 'Mon' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Thu' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Wed' })).not.toBeChecked();
  });

  it('assignee options are exactly the kid profiles plus Anyone -- no adults', () => {
    render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" />);

    expect(screen.getByRole('option', { name: 'Anyone' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Evan' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Bro' })).not.toBeInTheDocument();
  });

  it('submits the correct patch shape for a daily schedule', () => {
    const onSubmit = vi.fn();
    render(<ChoreTemplateForm initialValues={null} onSubmit={onSubmit} submitLabel="Add chore" />);

    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Feed the dog' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Feed the dog',
      coinReward: 10,
      xpReward: 5,
      assignedTo: 'anyone',
      schedule: { type: 'daily' },
    });
  });

  it('submits the correct patch shape for a specific-weekdays schedule with a chosen assignee', () => {
    const onSubmit = vi.fn();
    render(<ChoreTemplateForm initialValues={null} onSubmit={onSubmit} submitLabel="Add chore" />);

    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Take out bins' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/assign to/i), { target: { value: evanId } });
    fireEvent.click(screen.getByRole('button', { name: /specific days/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mon' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Thu' }));
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Take out bins',
      coinReward: 8,
      xpReward: 4,
      assignedTo: evanId,
      schedule: { type: 'weekdays', days: ['mon', 'thu'] },
    });
  });

  it('blocks submit and shows a hint when Specific days is selected with zero days checked', () => {
    const onSubmit = vi.fn();
    render(<ChoreTemplateForm initialValues={null} onSubmit={onSubmit} submitLabel="Add chore" />);

    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Take out bins' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /specific days/i }));
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/pick at least one day/i)).toBeInTheDocument();
  });

  it('clears the hint the moment a day is checked', () => {
    render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" />);

    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Take out bins' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /specific days/i }));
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));
    expect(screen.getByText(/pick at least one day/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Mon' }));
    expect(screen.queryByText(/pick at least one day/i)).not.toBeInTheDocument();
  });

  it('resets to blank defaults after a successful add-mode submit', () => {
    render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" />);

    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Feed the dog' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    expect(screen.getByLabelText(/chore title/i).value).toBe('');
  });

  it('renders input ids derived from idPrefix, so two forms on screen at once never collide', () => {
    render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" idPrefix="chore-add" />);
    expect(document.getElementById('chore-add-title')).toBeInTheDocument();
  });

  it('renders a Cancel button only when onCancel is provided', () => {
    const { rerender } = render(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Add chore" />);
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();

    rerender(<ChoreTemplateForm initialValues={null} onSubmit={() => {}} submitLabel="Save" onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/ChoreTemplateForm.test.jsx`
Expected: FAIL — `Cannot find module '../ChoreTemplateForm'`.

- [ ] **Step 3: Write the implementation**

Create `src/components/ChoreTemplateForm.jsx`:

```jsx
import { useState } from 'react';
import { useProfileStore } from '../stores/profileStore';

const WEEKDAY_OPTIONS = [
  { value: 'sun', label: 'Sun' },
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
];

// Normalizes both call shapes (null for add-mode defaults, a template
// object for edit-mode) into the SAME internal shape, resolved once up
// front -- the rest of this component never branches on which mode it's
// in. A daily-type template has no `.days` array at all, so `days`
// defaults to [] in that case exactly like add mode, not undefined.
function normalize(initialValues) {
  if (!initialValues) {
    return { title: '', coinReward: '', xpReward: '', assignedTo: 'anyone', scheduleType: 'daily', days: [] };
  }
  const { title, coinReward, xpReward, assignedTo, schedule } = initialValues;
  return {
    title,
    coinReward: String(coinReward),
    xpReward: String(xpReward),
    assignedTo,
    scheduleType: schedule.type,
    days: schedule.type === 'weekdays' ? schedule.days : [],
  };
}

export default function ChoreTemplateForm({ initialValues, onSubmit, submitLabel, onCancel, idPrefix = 'chore' }) {
  const [state, setState] = useState(() => normalize(initialValues));
  const [dayError, setDayError] = useState(false);
  const kids = useProfileStore((s) => s.profiles.filter((p) => p.role === 'kid'));

  function toggleDay(day) {
    setState((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
    setDayError(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!state.title || !state.coinReward || !state.xpReward) return;
    if (state.scheduleType === 'weekdays' && state.days.length === 0) {
      setDayError(true);
      return;
    }
    onSubmit({
      title: state.title,
      coinReward: Number(state.coinReward),
      xpReward: Number(state.xpReward),
      assignedTo: state.assignedTo,
      schedule: state.scheduleType === 'daily' ? { type: 'daily' } : { type: 'weekdays', days: state.days },
    });
    setState(normalize(initialValues));
    setDayError(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor={`${idPrefix}-title`} className="block text-sm text-gray-600 mb-1">
          Chore title
        </label>
        <input
          id={`${idPrefix}-title`}
          value={state.title}
          onChange={(e) => setState((p) => ({ ...p, title: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor={`${idPrefix}-coins`} className="block text-sm text-gray-600 mb-1">
            Coins
          </label>
          <input
            id={`${idPrefix}-coins`}
            type="number"
            value={state.coinReward}
            onChange={(e) => setState((p) => ({ ...p, coinReward: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex-1">
          <label htmlFor={`${idPrefix}-xp`} className="block text-sm text-gray-600 mb-1">
            XP
          </label>
          <input
            id={`${idPrefix}-xp`}
            type="number"
            value={state.xpReward}
            onChange={(e) => setState((p) => ({ ...p, xpReward: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-assignee`} className="block text-sm text-gray-600 mb-1">
          Assign to
        </label>
        <select
          id={`${idPrefix}-assignee`}
          value={state.assignedTo}
          onChange={(e) => setState((p) => ({ ...p, assignedTo: e.target.value }))}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="anyone">Anyone</option>
          {kids.map((kid) => (
            <option key={kid.id} value={kid.id}>
              {kid.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className="block text-sm text-gray-600 mb-1">Schedule</span>
        <div className="flex gap-2 mb-2">
          <button
            type="button"
            onClick={() => setState((p) => ({ ...p, scheduleType: 'daily' }))}
            className={`px-3 py-1 rounded-lg text-sm ${state.scheduleType === 'daily' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Every day
          </button>
          <button
            type="button"
            onClick={() => setState((p) => ({ ...p, scheduleType: 'weekdays' }))}
            className={`px-3 py-1 rounded-lg text-sm ${state.scheduleType === 'weekdays' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Specific days
          </button>
        </div>
        {state.scheduleType === 'weekdays' && (
          <div>
            <div className="flex gap-1 flex-wrap">
              {WEEKDAY_OPTIONS.map((day) => (
                <label
                  key={day.value}
                  htmlFor={`${idPrefix}-day-${day.value}`}
                  className="flex items-center gap-1 text-sm bg-gray-50 border rounded-lg px-2 py-1"
                >
                  <input
                    id={`${idPrefix}-day-${day.value}`}
                    type="checkbox"
                    checked={state.days.includes(day.value)}
                    onChange={() => toggleDay(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
            {dayError && <p className="text-red-600 text-sm mt-1">Pick at least one day</p>}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors">
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/ChoreTemplateForm.test.jsx`
Expected: 12 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChoreTemplateForm.jsx src/components/__tests__/ChoreTemplateForm.test.jsx
git commit -m "feat: ChoreTemplateForm — shared add/edit form for chore templates"
```

---

## Task 2: Wire `AdultDashboard` to edit/deactivate/reactivate

**Files:**
- Modify: `src/pages/AdultDashboard.jsx` (entire file replaced)
- Modify: `src/pages/__tests__/AdultDashboard.test.jsx` (5 new tests appended — the existing 7 are untouched and must still pass)

**Interfaces:**
- Consumes: `ChoreTemplateForm` (Task 1) — exact props as defined there. `choreStore.updateTemplate`, `choreStore.deactivateTemplate` (both pre-existing, untouched).
- Produces: nothing further downstream — this is the last task in this plan.

- [ ] **Step 1: Write the failing tests**

Find the end of `src/pages/__tests__/AdultDashboard.test.jsx` (the closing of the `describe` block, right after the last existing test):

```jsx
  it("a newly added chore template immediately generates today's instance, visible without reload", () => {
    renderDashboard();
    fireEvent.change(screen.getByLabelText(/chore title/i), { target: { value: 'Take out bins' } });
    fireEvent.change(screen.getByLabelText(/coins/i), { target: { value: '8' } });
    fireEvent.change(screen.getByLabelText(/xp/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: /add chore/i }));

    const today = new Date().toISOString().slice(0, 10);
    const newTemplate = useChoreStore.getState().templates.find((t) => t.title === 'Take out bins');
    const instances = useChoreStore.getState().instancesForDate(today);
    expect(instances.some((i) => i.templateId === newTemplate.id)).toBe(true);
  });
});
```

Insert 5 new tests immediately before that final `});` (i.e., after the existing last test, still inside the `describe` block):

```jsx
  it('deactivating a template shows it greyed out with a Reactivate option, still in the list', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }));

    expect(screen.getByText('Feed the dog')).toBeInTheDocument();
    expect(screen.getByText(/inactive/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^deactivate$/i })).not.toBeInTheDocument();
    const template = useChoreStore.getState().templates.find((t) => t.title === 'Feed the dog');
    expect(template.active).toBe(false);
  });

  it("reactivating a template restores it to active and doesn't duplicate today's instance", () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }));
    fireEvent.click(screen.getByRole('button', { name: /reactivate/i }));

    const template = useChoreStore.getState().templates.find((t) => t.title === 'Feed the dog');
    expect(template.active).toBe(true);

    const today = new Date().toISOString().slice(0, 10);
    const todaysInstancesForTemplate = useChoreStore
      .getState()
      .instancesForDate(today)
      .filter((i) => i.templateId === template.id);
    expect(todaysInstancesForTemplate).toHaveLength(1);
  });

  it('editing a template shows the edit form pre-filled with its current values', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    const editForm = within(screen.getByTestId('chore-edit-form'));
    expect(editForm.getByLabelText(/chore title/i).value).toBe('Feed the dog');
    expect(editForm.getByLabelText(/coins/i).value).toBe('10');
    expect(editForm.getByLabelText(/xp/i).value).toBe('5');
  });

  it('saving an edit updates the template, regenerates instances, and closes the editor', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    const editForm = within(screen.getByTestId('chore-edit-form'));
    fireEvent.change(editForm.getByLabelText(/chore title/i), { target: { value: 'Feed the dog daily' } });
    fireEvent.click(editForm.getByRole('button', { name: /^save$/i }));

    expect(useChoreStore.getState().templates.some((t) => t.title === 'Feed the dog daily')).toBe(true);
    expect(screen.queryByTestId('chore-edit-form')).not.toBeInTheDocument();
  });

  it('cancelling an edit discards changes and does not call updateTemplate', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    const editForm = within(screen.getByTestId('chore-edit-form'));
    fireEvent.change(editForm.getByLabelText(/chore title/i), { target: { value: 'Should not save' } });
    fireEvent.click(editForm.getByRole('button', { name: /cancel/i }));

    expect(useChoreStore.getState().templates.some((t) => t.title === 'Should not save')).toBe(false);
    expect(useChoreStore.getState().templates.some((t) => t.title === 'Feed the dog')).toBe(true);
    expect(screen.queryByTestId('chore-edit-form')).not.toBeInTheDocument();
  });
});
```

(`within` is already imported on this file's line 1 from the v1 build — `import { render, screen, fireEvent, within } from '@testing-library/react';` — verified directly, no import change needed.)

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/pages/__tests__/AdultDashboard.test.jsx`
Expected: the 7 pre-existing tests still PASS; the 5 new tests FAIL (no Deactivate/Edit/Reactivate buttons or `chore-edit-form` testid exist yet against the current component).

- [ ] **Step 3: Replace `AdultDashboard.jsx` entirely**

Find (entire current file):

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useChoreStore } from '../stores/choreStore';

const WEEKDAY_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function AdultDashboard() {
  const navigate = useNavigate();
  const currentProfileId = useProfileStore((state) => state.currentProfileId);
  const profiles = useProfileStore((state) => state.profiles);
  const addReward = useProfileStore((state) => state.addReward);
  const clearCurrentProfile = useProfileStore((state) => state.clearCurrentProfile);

  const templates = useChoreStore((state) => state.templates);
  const instances = useChoreStore((state) => state.instances);
  const addTemplate = useChoreStore((state) => state.addTemplate);
  const approve = useChoreStore((state) => state.approve);
  const decline = useChoreStore((state) => state.decline);
  const generateTodaysInstances = useChoreStore((state) => state.generateTodaysInstances);

  const [title, setTitle] = useState('');
  const [coinReward, setCoinReward] = useState('');
  const [xpReward, setXpReward] = useState('');

  const currentProfile = profiles.find((p) => p.id === currentProfileId);

  useEffect(() => {
    if (currentProfile?.role !== 'adult') navigate('/', { replace: true });
  }, [currentProfile, navigate]);

  if (currentProfile?.role !== 'adult') return null;

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
    const today = new Date();
    generateTodaysInstances(today.toISOString().slice(0, 10), WEEKDAY_ABBREV[today.getDay()]);
    setTitle('');
    setCoinReward('');
    setXpReward('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-700">Adult dashboard</h1>
        <button
          onClick={() => {
            clearCurrentProfile();
            navigate('/', { replace: true });
          }}
          className="text-sm text-gray-500 underline"
        >
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

Replace with:

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileStore } from '../stores/profileStore';
import { useChoreStore } from '../stores/choreStore';
import ChoreTemplateForm from '../components/ChoreTemplateForm';

const WEEKDAY_ABBREV = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function AdultDashboard() {
  const navigate = useNavigate();
  const currentProfileId = useProfileStore((state) => state.currentProfileId);
  const profiles = useProfileStore((state) => state.profiles);
  const addReward = useProfileStore((state) => state.addReward);
  const clearCurrentProfile = useProfileStore((state) => state.clearCurrentProfile);

  const templates = useChoreStore((state) => state.templates);
  const instances = useChoreStore((state) => state.instances);
  const addTemplate = useChoreStore((state) => state.addTemplate);
  const updateTemplate = useChoreStore((state) => state.updateTemplate);
  const deactivateTemplate = useChoreStore((state) => state.deactivateTemplate);
  const approve = useChoreStore((state) => state.approve);
  const decline = useChoreStore((state) => state.decline);
  const generateTodaysInstances = useChoreStore((state) => state.generateTodaysInstances);

  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const currentProfile = profiles.find((p) => p.id === currentProfileId);

  useEffect(() => {
    if (currentProfile?.role !== 'adult') navigate('/', { replace: true });
  }, [currentProfile, navigate]);

  if (currentProfile?.role !== 'adult') return null;

  const pending = instances.filter((i) => i.status === 'pending');

  function nameFor(profileId) {
    return profiles.find((p) => p.id === profileId)?.name ?? 'Someone';
  }

  // Every template mutation re-runs this. generateTodaysInstances already
  // dedupes per template+date, so this is a harmless no-op after a
  // deactivate, and correctly produces today's instance immediately after
  // a reactivate (or an edit that newly makes a template apply today).
  function regenerateToday() {
    const today = new Date();
    generateTodaysInstances(today.toISOString().slice(0, 10), WEEKDAY_ABBREV[today.getDay()]);
  }

  function handleApprove(instanceId) {
    const result = approve(instanceId);
    if (result) addReward(result.profileId, { coins: result.coinReward, xp: result.xpReward });
  }

  function handleAddTemplate(patch) {
    addTemplate(patch);
    regenerateToday();
  }

  function handleUpdateTemplate(patch) {
    updateTemplate(editingTemplateId, patch);
    regenerateToday();
    setEditingTemplateId(null);
  }

  function handleDeactivate(id) {
    deactivateTemplate(id);
    regenerateToday();
  }

  function handleReactivate(id) {
    updateTemplate(id, { active: true });
    regenerateToday();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <header className="mb-6 flex items-center justify-between max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-purple-700">Adult dashboard</h1>
        <button
          onClick={() => {
            clearCurrentProfile();
            navigate('/', { replace: true });
          }}
          className="text-sm text-gray-500 underline"
        >
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
          <div data-testid="chore-add-form" className="mb-6">
            <ChoreTemplateForm
              initialValues={null}
              onSubmit={handleAddTemplate}
              submitLabel="Add chore"
              idPrefix="chore-add"
            />
          </div>

          <ul className="space-y-2">
            {templates.map((template) => {
              if (editingTemplateId === template.id) {
                return (
                  <li key={template.id} data-testid="chore-edit-form" className="border-b py-3">
                    <ChoreTemplateForm
                      initialValues={template}
                      onSubmit={handleUpdateTemplate}
                      submitLabel="Save"
                      onCancel={() => setEditingTemplateId(null)}
                      idPrefix="chore-edit"
                    />
                  </li>
                );
              }

              return (
                <li
                  key={template.id}
                  className={`flex items-center justify-between border-b py-2 ${template.active ? '' : 'opacity-50'}`}
                >
                  <div className="text-sm text-gray-700">
                    <span>{template.title}</span>
                    <span className="text-gray-500 ml-2">
                      {template.coinReward}c · {template.xpReward}xp
                    </span>
                    {!template.active && <span className="ml-2 text-xs text-gray-400">(Inactive)</span>}
                  </div>
                  <div className="flex gap-2">
                    {template.active ? (
                      <>
                        <button onClick={() => setEditingTemplateId(template.id)} className="text-sm text-blue-600 underline">
                          Edit
                        </button>
                        <button onClick={() => handleDeactivate(template.id)} className="text-sm text-red-600 underline">
                          Deactivate
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleReactivate(template.id)} className="text-sm text-green-600 underline">
                        Reactivate
                      </button>
                    )}
                  </div>
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

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: every test file passes, including all 12 tests in `AdultDashboard.test.jsx` (7 pre-existing + 5 new) and every other file untouched by this plan.

- [ ] **Step 5: Manual smoke check**

Run: `npm run build` — confirm it still succeeds (no new dependency, no new build config needed).

- [ ] **Step 6: Commit**

```bash
git add src/pages/AdultDashboard.jsx src/pages/__tests__/AdultDashboard.test.jsx
git commit -m "feat: wire AdultDashboard to template edit/deactivate/reactivate via ChoreTemplateForm"
```

- [ ] **Step 7: Fetch, then push**

```bash
git fetch
git status --short --branch
git push
```

---

## Self-Review Notes

**Spec coverage:** shared form + normalization (Task 1), assignee picker restricted to kids (Task 1), weekday schedule toggle + checkboxes + inline hint (Task 1), edit-in-place via `editingTemplateId` (Task 2), deactivate/reactivate with a visibly-inactive state (Task 2), the regeneration invariant applied to every mutation (Task 2's `regenerateToday`, called from all four handlers), the "instances are snapshots, never retroactively mutated" invariant (respected by construction — no task touches `ChoreInstance` records at all, only `ChoreTemplate` ones).

**Real bug found and fixed during planning (before any task was dispatched):** the first draft of this plan would have rendered two `ChoreTemplateForm` instances simultaneously the moment edit mode opens (the always-present Add form + the swapped-in Edit form), both using hardcoded ids like `chore-title` — duplicate DOM ids (invalid HTML, ambiguous `label htmlFor` association) and ambiguous `getByLabelText` queries the moment both are mounted. Fixed by adding the `idPrefix` prop (Task 1) and `data-testid="chore-edit-form"`/`"chore-add-form"` scoping (Task 2's markup, Task 2's new tests use `within(screen.getByTestId('chore-edit-form'))` specifically for anything touching the edit form once both forms are on screen). This is the same collision class that bit the v1 plan twice (Task 6's `KidChoreBoard` fixture, Task 7's `AdultDashboard` approval-queue-vs-templates-panel `within` fix) — caught this time during planning instead of during a review round.

**Type consistency checked:** `ChoreTemplateForm`'s prop names (`initialValues`, `onSubmit`, `submitLabel`, `onCancel`, `idPrefix`) and the `onSubmit` patch shape are identical between Task 1's implementation, Task 1's tests, and Task 2's two call sites (`handleAddTemplate`/`handleUpdateTemplate`). `updateTemplate`/`deactivateTemplate` signatures match their existing `choreStore.js` definitions (unchanged by this plan) exactly.

**Existing-test preservation confirmed:** all 7 pre-existing `AdultDashboard.test.jsx` tests were traced against the new component — the add flow keeps identical field labels/button text, and none of them ever open edit mode, so none hit the two-forms-on-screen collision the new tests are specifically scoped to handle.
