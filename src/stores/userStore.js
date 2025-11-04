import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      familyId: null,
      role: null,

      setUser: (user) => set({ user }),
      setFamilyId: (familyId) => set({ familyId }),
      setRole: (role) => set({ role }),
      logout: () => set({ user: null, familyId: null, role: null }),
    }),
    { name: 'user-store' }
  )
);
