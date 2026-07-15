import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role } from '@/types/user';

// Interface untuk data preferensi regional
export interface UserRegional {
  country?: string;
  city?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  measurement?: string;
}

// Extend Global User untuk kebutuhan internal Store (menambahkan regional)
export interface StoreUser extends User {
  regional?: UserRegional;
}

// Mendefinisikan struktur fungsi dan variabel di dalam Store
interface AuthState {
  user: StoreUser | null;
  login: (userData: StoreUser) => void;
  logout: () => void;
  isHydrated: boolean;
  setHydrated: (state: boolean) => void;
}

// Membuat Global Store menggunakan Zustand + Persist (Local Storage)
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null, // Kondisi awal: Belum login
      isHydrated: false, // Untuk mencegah hydration mismatch di Next.js
      
      login: (userData) => set({ user: userData }),
      logout: () => set({ user: null }),
      setHydrated: (state) => set({ isHydrated: state }),
    }),
    {
      name: 'auth-storage', // nama key di localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);