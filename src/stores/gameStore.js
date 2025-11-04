import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    // Avatar state
    position: 0,
    level: 1,
    experience: 0,
    coinBalance: 100,
    maxExperience: 100,

    // Appearance
    appearance: {
      baseColor: '#FF6B6B',
      hatId: null,
      wingId: null,
      petId: null,
    },

    // Actions
    moveAvatar: (spaces) =>
      set((state) => ({
        position: Math.min(state.position + spaces, 50),
      })),

    addCoins: (amount) =>
      set((state) => {
        const newExp = state.experience + Math.floor(amount / 25);
        const newLevel = Math.floor(newExp / 100) + 1;
        return {
          coinBalance: state.coinBalance + amount,
          experience: newExp % 100,
          level: newLevel,
        };
      }),

    levelUp: () =>
      set((state) => ({
        level: state.level + 1,
        experience: 0,
      })),
  }))
);
