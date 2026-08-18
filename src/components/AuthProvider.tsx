"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore, StoreUser } from "@/store/useAuthStore";
import { ShieldAlert } from "lucide-react";
import { Role } from "@/types/user";

const ADMIN_ROLES: Role[] = ['superadmin', 'admin_finance', 'admin_operational', 'staff'];
const CLIENT_ROLES: Role[] = ['b2c', 'b2b'];
const DRIVER_ROLES: Role[] = ['driver'];

// Daftar Rute Publik (Auth) yang boleh diakses tamu di semua portal
const PUBLIC_AUTH_ROUTES = [
  "/login", "/register", "/forgot-password",
  "/admin/login", "/driver/login", "/driver/register"
];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, login, logout, isHydrated } = useAuthStore();
  const [initializing, setInitializing] = useState(true);
  
  const pathname = usePathname();
  const router = useRouter();

  // ==========================================
  // DETEKSI ZONA PORTAL (HOST & PATH)
  // ==========================================
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  // Menentukan user sedang membuka portal yang mana
  const isLandingPortal = hostname === 'flashglobalslogistik.com' || hostname === 'www.flashglobalslogistik.com';
  const isAdminPortal = hostname.includes('admin.flashglobalslogistik.com') || (isLocalhost && pathname.startsWith('/admin'));
  const isDriverPortal = hostname.includes('driver.flashglobalslogistik.com') || (isLocalhost && pathname.startsWith('/driver'));
  // Klien adalah web.flash... ATAU localhost selain admin/driver/landing
  const isClientPortal = hostname.includes('web.flashglobalslogistik.com') || (isLocalhost && !isAdminPortal && !isDriverPortal && !pathname.startsWith('/landing'));

  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.includes(pathname);

  // 1. Firebase Listener
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

            let detectedCity = "Pusat";
            if (userData.regional?.city) detectedCity = userData.regional.city;
            else if (userData.domisili) detectedCity = userData.domisili;

            login({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: userData.displayName || userData.name || firebaseUser.displayName || "Pengguna",
              photoURL: firebaseUser.photoURL || undefined,
              role: mappedRole as Role,
              regional: userData.regional || undefined,
              city: detectedCity,
              partnerType: userData.partnerType || undefined,
              createdAt: userData.createdAt || new Date(),
              updatedAt: userData.updatedAt || new Date(),
            } as StoreUser);

          } else {
            // Jika dokumen user belum ada, set role sementara sesuai portal
            const isRegisteringDriver = isDriverPortal;
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
  }, [login, logout, isDriverPortal]);

  // 2. Route Guard Berbasis Zona Portal
  useEffect(() => {
    if (initializing || !isHydrated) return;

    // A. Biarkan Landing Page bebas diakses siapa saja
    if (isLandingPortal) return;

    // B. JIKA BELUM LOGIN
    if (!user) {
      if (!isPublicAuthRoute) {
        if (isLocalhost) {
          if (isAdminPortal) router.push('/admin/login');
          else if (isDriverPortal) router.push('/driver/login');
          else router.push('/login');
        } else {
          router.push('/login'); // Di sub-domain, login selalu di root /login
        }
      }
      return;
    }

    // C. JIKA SUDAH LOGIN
    const isUserAdmin = ADMIN_ROLES.includes(user.role);
    const isUserClient = CLIENT_ROLES.includes(user.role);
    const isUserDriver = DRIVER_ROLES.includes(user.role);

    // Cross-Portal Redirects (Mencegah user nyasar ke portal yang salah)
    if (isUserAdmin && !isAdminPortal) {
      if (isLocalhost) router.push('/admin');
      else window.location.href = 'https://admin.flashglobalslogistik.com';
      return;
    }
    if (isUserDriver && !isDriverPortal) {
      if (isLocalhost) router.push('/driver');
      else window.location.href = 'https://driver.flashglobalslogistik.com';
      return;
    }
    if (isUserClient && !isClientPortal) {
      if (isLocalhost) router.push('/dashboard');
      else window.location.href = 'https://web.flashglobalslogistik.com/dashboard';
      return;
    }

    // Jika sudah di portal yang BENAR tapi malah mau buka halaman LOGIN lagi -> Tendang ke Dashboard
    if (isPublicAuthRoute) {
      if (isLocalhost) {
        if (isUserAdmin) router.push('/admin');
        else if (isUserDriver) router.push('/driver');
        else router.push('/dashboard');
      } else {
        // Di dalam sub-domain production, root dashboard cukup menggunakan "/" atau "/dashboard"
        if (isClientPortal) router.push('/dashboard');
        else router.push('/'); // Admin dan Driver dashboard-nya ada di root sub-domain
      }
    }

  }, [initializing, isHydrated, user, pathname, router, isLandingPortal, isAdminPortal, isDriverPortal, isClientPortal, isPublicAuthRoute]);

  // Loading Screen
  if (initializing || !isHydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-maroon rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-bold animate-pulse">Memverifikasi Otoritas Zona...</p>
      </div>
    );
  }

  // Blokir UI Jika Race Condition / Kebocoran State
  const isUnauthorized = !user && !isPublicAuthRoute && !isLandingPortal;
  const isWrongPortal = user && (
    (ADMIN_ROLES.includes(user.role) && !isAdminPortal) ||
    (DRIVER_ROLES.includes(user.role) && !isDriverPortal) ||
    (CLIENT_ROLES.includes(user.role) && !isClientPortal)
  ) && !isLandingPortal;

  if (isUnauthorized || isWrongPortal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Akses Ditolak</h2>
        <p className="text-slate-500 font-medium">Sistem sedang mengarahkan Anda ke zona yang tepat...</p>
      </div>
    );
  }

  return <>{children}</>;
}