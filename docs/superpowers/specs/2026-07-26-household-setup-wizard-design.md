# Design: Household Setup Wizard

**Status:** Approved for planning
**Date:** 2026-07-26
**Repo:** `BROski-Chores-App`

## Context

README's "Known gaps (v1.1)" names the top deferred item: no in-app profile creation. Households currently must open the browser console and call `useProfileStore.getState().addProfile(...)` / `useChoreStore.getState().addTemplate(...)` by hand to seed their first kids, adult, and chores. That's a real barrier — "a developer can seed and test this" is not the same as "a parent can open this on a tablet and use it." This spec closes that gap with an in-app first-run wizard: welcome → add kids → add adult → optional first chore → finish, landing on the normal profile picker.

## Architecture & entry point

**Where it hooks in:** `ProfilePicker.jsx` gets one new check near the top — `if (profiles.length === 0) return <SetupWizard />;`. No new route, no router changes. The instant any profile exists, this condition is false forever and the wizard never appears again.

**Local-state-until-Finish (the key decision):** everything the wizard collects — the draft kids list, the adult's name/PIN/color, the optional first chore — lives in `SetupWizard`'s own React state, not in `profileStore`/`choreStore`. Nothing is written to either store until the final Finish step. Two concrete failure modes this avoids:
1. **Removal support for free.** "Remove a kid from the list before continuing" (a typo/mis-tap correction) is just removing from a local array — no new `removeProfile` store method needed anywhere.
2. **The premature-unmount race.** `ProfilePicker` already subscribes to `profiles` via `useProfileStore((s) => s.profiles)`, so it re-renders on every store change. If the wizard committed each kid immediately on "Add," the very first kid added would flip `profiles.length` from 0 to 1 — and `ProfilePicker`'s own `profiles.length === 0` check would stop rendering the wizard mid-flow, kicking the household out before the adult or chore steps were ever reached.

**The regeneration invariant carries over from v1.1 unchanged.** `App.jsx` calls `generateTodaysInstances(...)` exactly once, on first mount, before any profiles or templates exist. By the time the wizard's Finish step (if it) adds a chore template, that one-time bootstrap has already fired and will not fire again — this is the same class of bug the v1 final review caught (a newly-added chore invisible until reload). Finish must explicitly call `generateTodaysInstances(...)` itself after committing a template, exactly like `AdultDashboard`'s existing `regenerateToday()` helper.

No new `profileStore`/`choreStore` methods are needed anywhere. `addProfile`, `addTemplate`, and `generateTodaysInstances` already do everything the wizard needs — this is purely a new UI layer that calls them once, at the end.

## Step-by-step flow

1. **Welcome** — "Let's set up your household." One button: Get started.
2. **Add kids (loop)** — form: name + `AvatarColorSwatches` picker → "Add kid" appends `{ draftId, name, avatarColor }` to a visible list; each row has a small Remove (×). "Add another kid" clears the form for the next one. "Continue" is disabled until the list has at least 1 kid — at least one kid is required to finish the wizard (the app is a kids' chore board; finishing with zero kids would land on a picker showing only an adult tile).
3. **Add adult** — name + `AvatarColorSwatches` picker, then `PinPad` shown twice in sequence: "Set a PIN" → "Confirm PIN". If the second entry doesn't match the first, show an error and reset just the confirm step (re-render `PinPad` fresh — its own internal `entered` state already clears itself after each 4-digit submit). Exactly one adult, required — the app needs at least one adult to approve any chore at all.
4. **Add first chore (optional)** — `ChoreTemplateForm` in add mode (`initialValues={null}`), with `kidsOverride` set to the draft kids list (converted to `{id, name}` shape — see Component structure below). A "Skip for now" button sits beside the form's own "Add chore" submit button; chores can trivially be added later from the Adult Dashboard's existing Chores panel, so this step is never required.
5. **Finish** — runs the commit sequence below, then the wizard unmounts (its own local state is discarded) and `ProfilePicker` naturally re-renders into the normal, now-populated picker grid. No explicit navigation call is needed — `ProfilePicker`'s own `profiles.length === 0` check simply becomes false.

**Finish commit sequence (order matters):**
1. For each draft kid, call `addProfile({ name, role: 'kid', avatarColor })`; capture the returned profile's real `id` and build a `draftId → id` map. Profiles are committed before the template so the template can reference a real, already-existing kid id.
2. Call `addProfile({ name, role: 'adult', pin: confirmedPin, avatarColor })` for the adult.
3. If a chore was added (not skipped): resolve its `assignedTo` through the `draftId → id` map (unchanged if it's the literal string `'anyone'`), then call `addTemplate({ ...patch, assignedTo: resolvedAssignedTo })`.
4. If a chore was added: call `generateTodaysInstances(todayISO, todayWeekday)` (same date/weekday computation already used in `App.jsx` and `AdultDashboard.jsx`) so an applicable chore is visible immediately, not after a reload.
5. If no chore was added, skip steps 3–4 entirely — `choreStore.templates` stays empty, which is a fully valid finish state (chores get added later from the Adult Dashboard).

## Component structure

**New: `src/pages/SetupWizard.jsx`.** No props — mounted unconditionally by `ProfilePicker` when `profiles.length === 0`. Internal step state (`'welcome' | 'kids' | 'adult-name' | 'adult-pin' | 'adult-pin-confirm' | 'chore'`), plus `draftKids: { draftId, name, avatarColor }[]` and `adultDraft: { name, avatarColor, pendingPin }` held in local state until `handleFinish()` runs the sequence above.

**New: `src/components/AvatarColorSwatches.jsx`.** Props: `value` (current hex string, or `''` before a first pick) and `onChange(hex)`. Renders a fixed row of 8 preset kid-friendly colors as tappable circles, highlighting whichever matches `value`. No existing avatar-color palette exists anywhere in the app today (`avatarColor` has always been an arbitrary hex string with no picker UI) — this introduces the app's first one, reused identically by both the kid step and the adult step.

**Modify: `src/pages/ProfilePicker.jsx`.** One new line near the top of the component body: `if (profiles.length === 0) return <SetupWizard />;`, plus the import. No other change to this file.

**Modify: `src/components/ChoreTemplateForm.jsx`.** One new optional prop, `kidsOverride?: { id: string, name: string }[]`. When provided, the assignee dropdown uses this array instead of the `useProfileStore` subscription (`s.profiles.filter(p => p.role === 'kid')`). When omitted — every existing call site, both instances in `AdultDashboard.jsx` — behavior is byte-for-byte unchanged. The component only ever consumes `{id, name}` from either source; it has no concept of "draft" data. `SetupWizard` does the relabeling at the boundary: `kidsOverride={draftKids.map(k => ({ id: k.draftId, name: k.name }))}` — the form's own `<option value={kid.id}>` code is untouched, so a draft kid's `draftId` flows through the form's `onSubmit` patch as `assignedTo` exactly like a real kid's `id` would, ready for the `draftId → id` resolution in Finish step 3.

**Reused as-is, no changes: `src/components/PinPad.jsx`.** Rendered twice in sequence in the adult step (set, then confirm) — its `onSubmit(pin)` callback already fires once per 4-digit entry and clears its own internal state afterward, so no modification is needed to use it for "set" vs. "verify."

**No `profileStore.js` or `choreStore.js` changes.** `addProfile`, `addTemplate`, and `generateTodaysInstances` already cover everything this feature needs.

## Testing

Vitest + React Testing Library, matching the rest of the app's convention.

**`ProfilePicker`:** renders `SetupWizard` when `profiles.length === 0`; renders the normal grid otherwise (all existing `ProfilePicker.test.jsx` tests must keep passing unmodified, since they all seed at least one profile first).

**`AvatarColorSwatches`:** clicking a swatch calls `onChange` with that swatch's hex; the swatch matching the current `value` renders as visually selected (e.g. a distinct border/ring class or `aria-pressed`).

**`SetupWizard`:**
- Adding a kid appends to the visible list; removing one removes it from the list (and from what gets committed at Finish).
- "Continue" past the kids step is disabled with zero kids, enabled with one or more.
- Adult step: mismatched PIN confirmation shows an error and does not advance past the adult step; matching PINs advance to the chore step.
- Skip on the chore step advances to Finish without calling `addTemplate`.
- **End-to-end Finish test with a chore (the seam-proving test):** add two draft kids, fill and submit the chore-step form assigning the chore specifically to the *second* draft kid (not "Anyone"), let Finish run, then assert directly against `useProfileStore.getState()`/`useChoreStore.getState()`: both kids exist as real profiles, the committed template's `assignedTo` equals the second kid's *real, store-generated* profile id (not any draft-local value), and today's `instances` contains an entry for that template — proving the `draftId → id` resolution actually works end-to-end and that `generateTodaysInstances` was actually called, not just that the wizard's UI advances correctly.
- **End-to-end Finish test without a chore (the fast-path test):** add one kid, complete the adult step, tap Skip on the chore step, let Finish run, then assert both profiles committed correctly, `choreStore.templates` stays empty (no template was created), and the profile-picker grid appears afterward (i.e. `ProfilePicker`'s own re-render shows both new profiles, proving the wizard→picker handoff works with the empty-chores finish state, not only the with-chore one).

**`ChoreTemplateForm`:** one new test proving `kidsOverride`, when provided, replaces the store-sourced kid list in the assignee dropdown; all existing tests (which never pass this prop) double as proof that omitting it leaves behavior byte-for-byte unchanged.

## Scope

**In scope:** welcome screen; add-kids loop with remove-before-commit; add-exactly-one-adult with two-step PIN confirmation; optional first-chore step reusing `ChoreTemplateForm` via a new `kidsOverride` prop; single atomic commit at Finish; immediate same-day instance generation if a chore was added.

**Explicitly out of scope:**
- Editing or removing a profile *after* it's been committed (i.e. after the wizard finishes) — that's the separate, already-named "profile/PIN editing" gap, not part of this feature.
- Multiple adults in one wizard pass — exactly one adult is required; a second adult (if ever needed) still goes through the console, unchanged from today.
- Re-entering the wizard once any profile exists — there is no "add another kid later via wizard" path; that's the Adult Dashboard's job (for chores) or the console (for profiles), both already true today.
- Any change to `PinPad.jsx`, `profileStore.js`, or `choreStore.js` — this feature is additive UI only.
- A back button spanning wizard steps — within a step, corrections are handled locally (remove-from-list for kids, PinPad's own Clear button, restarting just the confirm-PIN step on mismatch); there is no cross-step "go back and change the adult's name after reaching the chore step" affordance in this version.

## Non-goals (explicit, so they don't get silently assumed back in during planning)

- No new `profileStore` or `choreStore` methods.
- No route changes — the wizard is a conditional render inside the existing `/` route, not a new page.
- No changes to `ChoreTemplateForm`'s existing props, validation, or submit shape — `kidsOverride` is purely additive.
