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
