import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Definisikan semua kemungkinan role di sistem kita
export type UserRole = 
  | 'superadmin' 
  | 'admin_cs' 
  | 'admin_finance' 
  | 'admin_ops' 
  | 'user' 
  | 'business';

// Interface untuk data preferensi regional (BARU)
export interface UserRegional {
  country?: string;
  city?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  measurement?: string;
}

// Mendefinisikan struktur data User
export interface User {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  role: UserRole;
  regional?: UserRegional; // Tambahkan properti regional opsional di sini
}

// Mendefinisikan struktur fungsi dan variabel di dalam Store
interface AuthState {
  user: User | null;
  login: (userData: User) => void;
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