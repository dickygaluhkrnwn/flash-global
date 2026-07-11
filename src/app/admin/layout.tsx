"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

// --- IMPORT FIREBASE CORE & AUTH SESSION ---
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const allowedRoles = ["superadmin", "admin_finance", "admin_ops", "admin_cs"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentRole, setCurrentRole] = useState("");

  // Jalur pengamanan rute Admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (pathname === "/admin/login") {
        setCheckingAuth(false);
        return;
      }

      if (!user) {
        router.push("/admin/login");
        setCheckingAuth(false);
        return;
      }

      try {
        // Verifikasi ulang status role admin di database
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        const userRole = userData?.role || "";

        if (userDoc.exists() && allowedRoles.includes(userRole)) {
          setCurrentRole(userRole);
          
          // PROTEKSI MODUL BERDASARKAN ROLE SPESIFIK
          if (userRole === "admin_finance" && pathname === "/admin/vehicles") {
            router.push("/admin/pricing"); 
          }
          if (userRole === "admin_ops" && pathname === "/admin/pricing") {
            router.push("/admin/vehicles"); 
          }

        } else {
          await signOut(auth);
          router.push("/admin/login");
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        router.push("/admin/login");
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  // State Loading Guard Screen Premium (Light Mode)
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-bold text-sm">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4 shadow-sm"></div>
        <span className="animate-pulse tracking-widest uppercase text-xs">Memverifikasi Otoritas Administrator...</span>
      </div>
    );
  }

  // Jika di halaman login, bypass layout sidebar dan render form langsung
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Jika lolos guard perlindungan, render sistem Admin Workspace (Light Mode Pro)
  if (allowedRoles.includes(currentRole)) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex relative overflow-hidden font-sans">
        
        {/* Ornamen Premium Background Khusus Admin (Clean Modern) */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600 rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-emerald-600 rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />

        {/* SIDEBAR WORKSPACE ADMIN (COLLAPSIBLE/HOVERABLE) */}
        <div className="z-50">
          <AdminSidebar currentRole={currentRole} pathname={pathname} />
        </div>

        {/* WORKSPACE AREA - Padding kiri disesuaikan dengan lebar Sidebar collapsed */}
        <main className="flex-1 max-h-screen overflow-y-auto w-full md:pl-20 transition-all duration-300 relative z-10 p-6 md:p-8">
          <div className="max-w-[1600px] mx-auto w-full">
            {children}
          </div>
        </main>

      </div>
    );
  }

  return null;
}