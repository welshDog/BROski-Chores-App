import { create } from 'zustand';

export const useUIStore = create((set) => ({
  notifications: [],
  showModal: null,

  addNotification: (message, type = 'info') => {
    const id = Date.now();
    set((state) => ({
      notifications: [...state.notifications, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 3000);
  },

  openModal: (modalName) => set({ showModal: modalName }),
  closeModal: () => set({ showModal: null }),
}));
