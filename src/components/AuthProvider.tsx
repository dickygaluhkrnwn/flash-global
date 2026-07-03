"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { ShieldAlert } from "lucide-react";

// Daftar rute rahasia yang tidak boleh dimasuki tanpa login
const PROTECTED_ROUTES = [
  "/dashboard",
  "/settings",
  "/pembayaran",
  "/delivery/booking",
  "/forwarding/quote"
];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, login, logout } = useAuthStore();
  const [initializing, setInitializing] = useState(true);
  
  const pathname = usePathname();
  const router = useRouter();

  // Cek apakah halaman saat ini termasuk rute yang dilindungi
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  // 1. Firebase Listener: Mengecek Sesi Auth di Background
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        login({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || "Pengguna",
          photoURL: firebaseUser.photoURL,
        });
      } else {
        logout();
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, [login, logout]);

  // 2. Route Guard: Menendang user anonim yang mencoba masuk ke Rute VIP
  useEffect(() => {
    if (!initializing && !user && isProtectedRoute) {
      router.push("/login");
    }
  }, [initializing, user, pathname, isProtectedRoute, router]);

  // Tampilkan loading screen mewah saat aplikasi sedang mencocokkan sesi token login
  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold animate-pulse">Memverifikasi Sesi...</p>
      </div>
    );
  }

  // Cegah render konten jika user belum login TAPI sedang berada di rute terproteksi
  // (Ini mencegah "kedipan" UI dasbor sebelum user ditendang ke /login)
  if (!user && isProtectedRoute) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <p className="text-gray-800 font-bold">Akses Ditolak. Mengalihkan...</p>
      </div>
    );
  }

  return <>{children}</>;
}