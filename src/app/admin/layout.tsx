"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopNav from "@/components/admin/AdminTopNav"; // <-- IMPORT TOP NAV BARU

// --- IMPORT ISOLASI CSS KHUSUS ADMIN ---
import "./admin.css";

// --- IMPORT FIREBASE CORE & AUTH SESSION ---
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// --- IMPORT GLOBAL ROLE TYPES ---
import { Role } from "@/types/user";

// HANYA ROLE ADMIN YANG DIIZINKAN MASUK AREA INI
const allowedRoles: Role[] = ["superadmin", "admin_finance", "admin_operational", "staff"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentRole, setCurrentRole] = useState<Role | "">("");

  // =========================================================================
  // LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING & AUTH GUARD
  // =========================================================================
  
  // Helper cerdas untuk menyesuaikan URL (Hilangkan /admin jika di production sub-domain)
  const getAdminUrl = (path: string) => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
      return path; // Return langsung, misal: /login
    }
    return `/admin${path}`; // Localhost: /admin/login
  };

  // Pengecekan path fleksibel (karena di sub-domain pathname tidak memuat '/admin')
  const isLoginPage = pathname === "/login" || pathname === "/admin/login";
  const isVehiclesPage = pathname === "/vehicles" || pathname === "/admin/vehicles";
  const isPricingPage = pathname === "/pricing" || pathname === "/admin/pricing";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // 1. Bypass untuk halaman login
      if (isLoginPage) {
        setCheckingAuth(false);
        return;
      }

      // 2. Cegat user yang belum login
      if (!user) {
        router.push(getAdminUrl("/login"));
        setCheckingAuth(false);
        return;
      }

      // 3. Verifikasi Firestore Role
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();

        let userRole = (userData?.role || "") as Role | string;
        if (userRole === "admin_ops" || userRole === "admin_cs") userRole = "admin_operational";

        if (userDoc.exists() && allowedRoles.includes(userRole as Role)) {
          setCurrentRole(userRole as Role);

          // Proteksi Role Khusus (Redirect dinamis tanpa hardcode)
          if (userRole === "admin_finance" && isVehiclesPage) {
            router.push(getAdminUrl("/pricing")); 
          }
          if (userRole === "admin_operational" && isPricingPage) {
            router.push(getAdminUrl("/vehicles")); 
          }

        } else {
          // Role tidak berhak masuk Portal Admin
          await signOut(auth);
          router.push(getAdminUrl("/login"));
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        router.push(getAdminUrl("/login"));
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, router, isLoginPage, isVehiclesPage, isPricingPage]);

  // =========================================================================
  // UI/UX AREA: ROMBAKAN MODERN GEN-Z & ENTERPRISE DESKTOP
  // (UI TETAP UTUH TIDAK DISENTUH SAMA SEKALI SESUAI INSTRUKSI)
  // =========================================================================

  // 1. Loading Guard Screen Premium (Khas Flash Global)
  if (checkingAuth) {
    return (
      <div className="h-screen w-full bg-[var(--admin-bg)] flex flex-col items-center justify-center text-[var(--admin-fg-muted)]">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-[#7A171D]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#7A171D] border-t-[#C5A059] rounded-full animate-spin"></div>
        </div>
        <span className="animate-pulse tracking-[0.2em] uppercase text-xs font-semibold text-[#7A171D]">
          Memverifikasi Akses Sistem...
        </span>
      </div>
    );
  }

  // 2. Bypass layout untuk halaman Login Admin
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 3. Workspace Admin (Desktop Optimized)
  if (allowedRoles.includes(currentRole as Role)) {
    return (
      <div className="h-screen w-full bg-[var(--admin-bg)] text-[var(--admin-fg)] flex relative overflow-hidden font-sans selection:bg-[#7A171D]/20 selection:text-[#7A171D]">

        {/* Ornamen Premium Background */}
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-[#7A171D] rounded-full blur-[180px] opacity-[0.04] pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[700px] h-[700px] bg-[#C5A059] rounded-full blur-[180px] opacity-[0.04] pointer-events-none" />

        {/* SIDEBAR WORKSPACE ADMIN */}
        <div className="z-50 shrink-0">
          <AdminSidebar currentRole={currentRole} pathname={pathname} />
        </div>

        {/* WORKSPACE AREA - BUG FIX: Tambahkan md:pl-[120px] untuk menghindari overlap dengan Floating Sidebar */}
        <main className="flex-1 h-screen overflow-y-auto admin-scrollbar relative z-10 transition-all duration-300 pl-4 md:pl-[120px] pr-4 md:pr-8 py-6">
          <div className="min-h-full w-full max-w-[1600px] mx-auto flex flex-col">

            {/* SUNTIKKAN TOP NAVBAR DI SINI */}
            <AdminTopNav />

            {/* AREA KONTEN HALAMAN */}
            <div className="flex-1">
              {children}
            </div>

          </div>
        </main>

      </div>
    );
  }

  return null;
}