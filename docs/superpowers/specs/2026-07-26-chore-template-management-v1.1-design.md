# Design: Chore template management v1.1

**Status:** Approved for planning
**Date:** 2026-07-26
**Repo:** `BROski-Chores-App`

## Context

The v1 design spec (`2026-07-26-household-chores-v1-design.md`) named template *edit*, *deactivate*, and *daily-or-specific-weekdays scheduling* as in-scope UI. The v1 implementation plan's Task 7 only ever specified an add-only form — `AdultDashboard.jsx` hardcodes `assignedTo: 'anyone'` and `schedule: { type: 'daily' }`, and has no way to call the already-existing, already-tested `choreStore.updateTemplate`/`deactivateTemplate`. That's the gap this spec closes: no new store logic, only the UI wired to what already exists.

## Data layer

No new `choreStore` methods. Reactivating a template is `updateTemplate(id, { active: true })` — no separate `activateTemplate` action is needed just to set one field. `deactivateTemplate(id)` stays as the convenience wrapper for the common deactivate case.

**Two invariants, stated explicitly so they don't have to be re-derived later:**

1. **A `ChoreInstance` is an immutable snapshot taken at generation time.** Editing or deactivating a template never retroactively touches an already-generated instance for today — `assignedTo`, `coinReward`, `xpReward` on an in-progress or completed instance stay whatever they were when it was generated. This matches how `approve`/`decline` already work (neither ever rewrites an instance's assignee or reward). A kid partway through a chore today won't have it change owner or vanish mid-day because an adult edited or deactivated the template.
2. **Every template-mutating action — add, edit-save, deactivate, reactivate — re-triggers `generateTodaysInstances`.** This extends the exact bugfix from the v1 final review (a newly added chore was invisible until reload) into a general rule rather than a one-off patch. It's safe to call unconditionally: `generateTodaysInstances` already dedupes per template+date via `existingTemplateIds` before creating anything, so re-triggering it after a deactivate (which can only reduce eligibility) is a harmless no-op, and re-triggering it after a reactivate (which can restore eligibility) correctly produces today's instance immediately if the template applies today.

The assignee picker's options are `profileStore.profiles.filter(p => p.role === 'kid')` plus the literal `'anyone'` — adults are never assignable; chores are a kid's job, adults approve them.

## Component structure

**New: `src/components/ChoreTemplateForm.jsx`.** One shared form for both the add flow and the edit flow, since v1.1 needs the assignee and schedule pickers on *both*, not just edit — duplicating that UI twice would be pointless.

- **Props:** `initialValues` (`null` for add mode, a template object for edit mode), `onSubmit(patch)`, `submitLabel`, `onCancel` (rendered only when provided — add mode has nothing to cancel back to).
- **Normalization:** the component's internal state is initialized once from `initialValues` via a single normalizing step that produces the *same* internal shape regardless of which mode it's in (`{ title, coinReward, xpReward, assignedTo, scheduleType: 'daily'|'weekdays', days }`). Add mode defaults to `assignedTo: 'anyone'`, `scheduleType: 'daily'`, `days: []`. Edit mode derives `scheduleType` directly from `template.schedule.type`, and `days` as `template.schedule.type === 'weekdays' ? template.schedule.days : []` — pinned explicitly because a `daily`-type template's `schedule` object has no `days` array at all, so `days` defaults to `[]` in that case exactly like add mode, rather than being left undefined. The rest of the component never branches on "am I in add or edit mode" — it only ever reads its own normalized state.
- **Fields:** title, coins, XP (existing three, unchanged validation — non-empty). **Assignee** — a `<select>` whose *displayed* options are `'Anyone'` + each kid profile's name, but whose *option value* is the literal string `'anyone'` or the kid's `profile.id` — never a name string. `KidChoreBoard.jsx` compares `assignedTo === currentProfileId`, so storing a display name instead of an id would silently break every specific-assignee chore. **Schedule** — a two-option toggle (`Every day` / `Specific days`); picking `Every day` hides the day checkboxes entirely; picking `Specific days` reveals a Sun–Sat checkbox row.
- **Validation:** existing non-empty rule for title/coins/XP, unchanged. New: if `scheduleType === 'weekdays'` and zero days are checked, the form does not submit — and shows an inline hint ("Pick at least one day") near the checkboxes. This is the one added validation case that's genuinely less obvious than an empty text field, so unlike the existing silent no-op on empty fields, it gets an explicit message. The hint clears the moment any day is checked (not only on the next submit attempt) — checking a day is the specific action that makes the previous warning stale, so the UI shouldn't wait for another submit to say so.
- **On submit**, packages the normalized state into exactly the shape `choreStore` expects: `{ title, coinReward: Number(...), xpReward: Number(...), assignedTo, schedule: scheduleType === 'daily' ? { type: 'daily' } : { type: 'weekdays', days } }`.

## `AdultDashboard.jsx` changes

- **New state:** `editingTemplateId` (`null` = nothing being edited). Only one template can be in edit mode at a time — tapping Edit on a different row while one is already open switches which one expands; it never stacks two open forms.
- **The Chores list shows every template, not just active ones.** Active rows: title/reward + **Edit** + **Deactivate** buttons. Inactive rows: same info, visually greyed (reduced opacity + an "Inactive" label) + a single **Reactivate** button in place of Edit/Deactivate.
- **Tapping Edit** swaps that row's read-only content for `<ChoreTemplateForm initialValues={template} onSubmit={handleUpdateTemplate} submitLabel="Save" onCancel={() => setEditingTemplateId(null)} />` inline. Everything else on the page stays exactly where it is.
- `handleUpdateTemplate`, `handleDeactivate`, `handleReactivate` all follow one shape: mutate the store, then call `generateTodaysInstances(...)` (same call already used after `addTemplate`), then (edit only) clear `editingTemplateId`.
- **Deactivate-while-editing that same row is not reachable through this UI** — edit mode replaces the row entirely with the form (Save/Cancel only, no Deactivate button), so to deactivate a template you'd Cancel out of editing it first. Deactivating or reactivating a *different* template never touches `editingTemplateId` (it's scoped to one id), so no interaction between them needs handling — this holds by construction, not by an added guard.
- **Reactivate never touches `editingTemplateId`**, so it can never accidentally auto-open an editor for the template it just reactivated.
- **The Add form** at the top of the Chores panel becomes `<ChoreTemplateForm initialValues={null} onSubmit={handleAddTemplate} submitLabel="Add chore" />` — same component, no `onCancel` (nothing to collapse back to, it's always present).

## v1.1 scope

**In scope:** edit via the shared form; deactivate + reactivate with a visibly-inactive state (never hidden); assignee picker (kid profiles + "Anyone"); weekday schedule picker (toggle + checkboxes); the inline zero-days-selected hint.

**Explicitly out of scope:**
- Hard-deleting a template — only deactivate exists, consistent with "decline never deletes" elsewhere in this app. State changes stay reversible/inspectable, not destructive.
- Reordering or categorizing templates.
- Bulk actions (deactivating/reactivating multiple at once).
- Any schedule kind beyond the existing two (`daily` / `weekdays`).
- Editing profiles or PINs — a separate, further-deferred item, not part of this spec.
- Any change to the approval/instance lifecycle itself (`markDone`/`approve`/`decline`) — already correct, untouched by this work.

## Testing

Vitest + React Testing Library, matching the rest of the app's convention.

**`ChoreTemplateForm`:**
- Normalizes `null` into add-mode defaults, and an existing template's `schedule`/`assignedTo` into the same internal shape a fresh form would have — both paths produce identical-shaped state, verified directly rather than assumed.
- Submits the correct patch shape for a `daily` schedule and for a `weekdays` schedule with specific days checked.
- Blocks submit and shows the "Pick at least one day" hint when Specific-days is selected with nothing checked; clears the hint once a day is checked.
- Assignee `<select>` options are exactly the kid profiles present in `profileStore` plus `"Anyone"` — no adult profiles ever appear as an option.

**`AdultDashboard`:**
- Tapping Edit on a template renders the form pre-filled with that template's current values.
- Save calls `updateTemplate` with the new patch, calls `generateTodaysInstances`, and closes the editor (`editingTemplateId` back to `null`).
- Cancel closes the editor without calling `updateTemplate`.
- Deactivate flips a template to the greyed/Reactivate-button state; the template still appears in the list (not removed).
- Reactivate flips it back to the active/Edit+Deactivate-button state, and — for a template whose schedule applies today — produces today's `ChoreInstance` immediately (proving the regeneration invariant from the Data layer section, and that it doesn't produce a duplicate if one already existed for that template+date).

## Non-goals (explicit, so they don't get silently assumed back in during planning)

- No new `choreStore` methods — `updateTemplate`/`deactivateTemplate` already cover everything this spec needs.
- No modal/dialog infrastructure — editing happens inline, in place, matching this app's existing single-page kiosk style.
- No retroactive mutation of already-generated `ChoreInstance` records under any circumstance.
