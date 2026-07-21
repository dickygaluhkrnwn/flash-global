"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore, StoreUser } from "@/store/useAuthStore";
import { ShieldAlert } from "lucide-react";
import { Role } from "@/types/user";

// Daftar rute PUBLIC client yang butuh login (TANPA /desktop atau /mobile)
const CLIENT_PROTECTED_ROUTES = [
  "/dashboard",
  "/settings",
  "/pembayaran",
  "/delivery/booking",
  "/forwarding/quote",
];

// Daftar rute PUBLIC driver yang butuh login
const DRIVER_PROTECTED_ROUTES = [
  "/driver/dashboard",
  // HAPUS BARIS INI: "/driver/pending",
  "/driver/wallet",
  "/driver/profile",
];

// Grouping Roles (Memisahkan driver ke ekosistemnya sendiri)
const ADMIN_ROLES: Role[] = ['superadmin', 'admin_finance', 'admin_operational', 'staff'];
const CLIENT_ROLES: Role[] = ['b2c', 'b2b'];
const DRIVER_ROLES: Role[] = ['driver'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, login, logout, isHydrated } = useAuthStore();
  const [initializing, setInitializing] = useState(true);
  
  const pathname = usePathname();
  const router = useRouter();

  // Deteksi Rute Saat Ini
  const isClientProtectedRoute = CLIENT_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isClientLoginRoute = pathname === "/login"; 
  
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginRoute = pathname === "/admin/login";
  
  const isDriverRoute = pathname.startsWith("/driver");
  const isDriverProtectedRoute = DRIVER_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isDriverAuthRoute = pathname === "/driver/login" || pathname === "/driver/register";

  // 1. Firebase Listener: Mengecek Sesi Auth & Ambil Role dari Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Konversi Role Lama (Legacy) ke Global Role Baru
            let mappedRole = userData.role || "b2c";
            if (mappedRole === "user") mappedRole = "b2c";
            if (mappedRole === "business") mappedRole = "b2b";
            if (mappedRole === "admin_cs" || mappedRole === "admin_ops") mappedRole = "admin_operational";

            login({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: userData.displayName || userData.name || firebaseUser.displayName || "Pengguna",
              photoURL: firebaseUser.photoURL || undefined,
              role: mappedRole as Role,
              regional: userData.regional || undefined,
              createdAt: userData.createdAt || new Date(),
              updatedAt: userData.updatedAt || new Date(),
            } as StoreUser);
          } else {
            // ANTI-RACE CONDITION: Cek apakah user sedang berada di jalur driver
            const isRegisteringDriver = window.location.pathname.startsWith("/driver");

            // Jika document user belum ada, set role sementara sesuai jalur pendaftarannya
            login({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "Pengguna",
              photoURL: firebaseUser.photoURL || undefined,
              role: isRegisteringDriver ? "driver" : "b2c",
              createdAt: new Date(),
            } as StoreUser);
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

    // JIKA BELUM LOGIN
    if (!user) {
      if (isAdminRoute && !isAdminLoginRoute) {
        router.push("/admin/login");
      } else if (isDriverRoute && !isDriverAuthRoute) {
        router.push("/driver/login");
      } else if (isClientProtectedRoute && !isClientLoginRoute) {
        router.push("/login"); 
      }
      return;
    }

    // JIKA SUDAH LOGIN (Cek Role)
    const isUserAdmin = ADMIN_ROLES.includes(user.role);
    const isUserClient = CLIENT_ROLES.includes(user.role);
    const isUserDriver = DRIVER_ROLES.includes(user.role);

    if (isUserAdmin) {
      // Admin nyasar ke halaman selain admin atau mencoba login ulang
      if (!isAdminRoute || isAdminLoginRoute) {
         router.push("/admin"); 
      }
    } else if (isUserDriver) {
      // Driver nyasar ke halaman admin/client atau mencoba login/register ulang
      if (!isDriverRoute || isDriverAuthRoute) {
         router.push("/driver/dashboard");
      }
    } else if (isUserClient) {
      // Client nyasar ke halaman admin/driver atau mencoba login ulang
      if (isAdminRoute || isDriverRoute || isClientLoginRoute) {
        router.push("/dashboard"); 
      }
    }

  }, [initializing, isHydrated, user, pathname, router, isClientProtectedRoute, isAdminRoute, isAdminLoginRoute, isClientLoginRoute, isDriverRoute, isDriverAuthRoute]);

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
  // (Mencegah "kebocoran" UI dari komponen halaman yang diproteksi)
  const isUnauthorizedAdmin = !user && isAdminRoute && !isAdminLoginRoute;
  const isUnauthorizedClient = !user && isClientProtectedRoute && !isClientLoginRoute;
  const isUnauthorizedDriver = !user && isDriverProtectedRoute && !isDriverAuthRoute;

  const isClientInWrongArea = user && CLIENT_ROLES.includes(user.role) && (isAdminRoute || isDriverRoute || isClientLoginRoute);
  const isAdminInWrongArea = user && ADMIN_ROLES.includes(user.role) && (!isAdminRoute || isAdminLoginRoute);
  const isDriverInWrongArea = user && DRIVER_ROLES.includes(user.role) && (!isDriverRoute || isDriverAuthRoute);

  if (
    isUnauthorizedAdmin || 
    isUnauthorizedClient || 
    isUnauthorizedDriver || 
    isClientInWrongArea || 
    isAdminInWrongArea || 
    isDriverInWrongArea
  ) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <p className="text-gray-800 font-bold">Akses Ditolak. Mengalihkan jalur...</p>
      </div>
    );
  }

  return <>{children}</>;
}