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
