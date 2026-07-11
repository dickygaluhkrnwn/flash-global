"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore, UserRole } from "@/store/useAuthStore";
import { ShieldAlert } from "lucide-react";

// Daftar rute client yang butuh login
const CLIENT_PROTECTED_ROUTES = [
  "/desktop/dashboard",
  "/desktop/settings",
  "/desktop/pembayaran",
  "/desktop/delivery/booking",
  "/desktop/forwarding/quote",
  "/mobile/dashboard", // antisipasi route mobile
];

// Grouping Roles
const ADMIN_ROLES: UserRole[] = ['superadmin', 'admin_cs', 'admin_finance', 'admin_ops'];
const CLIENT_ROLES: UserRole[] = ['user', 'business'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, login, logout, isHydrated } = useAuthStore();
  const [initializing, setInitializing] = useState(true);
  
  const pathname = usePathname();
  const router = useRouter();

  const isClientProtectedRoute = CLIENT_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginRoute = pathname === "/admin/login";
  const isClientLoginRoute = pathname.startsWith("/desktop/login") || pathname.startsWith("/mobile/login");

  // 1. Firebase Listener: Mengecek Sesi Auth & Ambil Role dari Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ambil data tambahan user (terutama role dan regional) dari Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            login({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userData.name || firebaseUser.displayName || "Pengguna",
              photoURL: firebaseUser.photoURL,
              role: userData.role as UserRole || "user", // Default ke 'user' jika kosong
              regional: userData.regional || undefined, // TARIk DATA REGIONAL (BARU)
            });
          } else {
            // Jika document user belum ada (misal baru register pakai Google), 
            // set default role sebagai 'user'
            login({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || "Pengguna",
              photoURL: firebaseUser.photoURL,
              role: "user",
            });
          }
        } catch (error) {
          console.error("Gagal mengambil data user dari Firestore:", error);
          logout();
        }
      } else {
        logout();
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, [login, logout]);

  // 2. Route Guard: Logika Pengalihan Berdasarkan Role
  useEffect(() => {
    if (initializing || !isHydrated) return;

    // Jika Belum Login
    if (!user) {
      if (isAdminRoute && !isAdminLoginRoute) {
        router.push("/admin/login");
      } else if (isClientProtectedRoute && !isClientLoginRoute) {
        // Asumsi default lempar ke desktop login
        router.push("/desktop/login"); 
      }
      return;
    }

    // Jika Sudah Login (Cek Role)
    const isUserAdmin = ADMIN_ROLES.includes(user.role);
    const isUserClient = CLIENT_ROLES.includes(user.role);

    if (isUserAdmin) {
      // Admin nyasar ke halaman client (termasuk login client)
      if (!isAdminRoute || isClientLoginRoute) {
         router.push("/admin"); 
      }
      // Admin nyasar ke halaman login admin padahal sudah login
      if (isAdminLoginRoute) {
         router.push("/admin");
      }
    } else if (isUserClient) {
      // Client nyasar ke halaman admin (termasuk login admin)
      if (isAdminRoute) {
        router.push("/desktop/dashboard");
      }
      // Client nyasar ke halaman login client padahal sudah login
      if (isClientLoginRoute) {
        router.push("/desktop/dashboard");
      }
    }

  }, [initializing, isHydrated, user, pathname, router, isClientProtectedRoute, isAdminRoute, isAdminLoginRoute, isClientLoginRoute]);

  // Tampilkan loading saat initial load
  if (initializing || !isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold animate-pulse">Memverifikasi Akses...</p>
      </div>
    );
  }

  // Tampilkan blokir UI sementara sebelum router.push dieksekusi oleh useEffect 
  // (Mencegah "kebocoran" UI)
  const isUnauthorizedAdmin = !user && isAdminRoute && !isAdminLoginRoute;
  const isUnauthorizedClient = !user && isClientProtectedRoute && !isClientLoginRoute;
  const isClientInAdminArea = user && CLIENT_ROLES.includes(user.role) && isAdminRoute;
  const isAdminInClientArea = user && ADMIN_ROLES.includes(user.role) && !isAdminRoute;

  if (isUnauthorizedAdmin || isUnauthorizedClient || isClientInAdminArea || isAdminInClientArea) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <p className="text-gray-800 font-bold">Akses Ditolak. Mengalihkan jalur...</p>
      </div>
    );
  }

  return <>{children}</>;
}