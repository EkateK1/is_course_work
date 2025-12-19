import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    set => ({
      token: null,
      user: null,
      role: null,
      setAuth: ({ token, user, role }) => set({ token, user, role }),
      clearAuth: () => set({ token: null, user: null, role: null }),
    }),
    { name: 'kiper-auth' },
  ),
);
