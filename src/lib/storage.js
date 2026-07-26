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
