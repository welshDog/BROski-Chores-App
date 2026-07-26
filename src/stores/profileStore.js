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
