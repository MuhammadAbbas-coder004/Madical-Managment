import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const COOKIE_SESSION = 'cookie-session';

export interface User {
  id: string;
  name?: string;
  username?: string;
  email: string;
  role: string;
  patientId?: string;
  doctorId?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage', // key used in localStorage
      version: 1,
      // Old frontend builds persisted a fake token and could lock users out of public auth pages.
      migrate: () => ({ user: null, token: null }),
    }
  )
);
