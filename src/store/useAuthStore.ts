import { create } from 'zustand';

// Mendefinisikan struktur data User
interface User {
  uid: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
}

// Mendefinisikan struktur fungsi dan variabel di dalam Store
interface AuthState {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}

// Membuat Global Store menggunakan Zustand
export const useAuthStore = create<AuthState>((set) => ({
  user: null, // Kondisi awal: Belum login (null)
  
  // Fungsi untuk menyimpan data user saat login berhasil
  login: (userData) => set({ user: userData }),
  
  // Fungsi untuk menghapus data user saat logout
  logout: () => set({ user: null }),
}));