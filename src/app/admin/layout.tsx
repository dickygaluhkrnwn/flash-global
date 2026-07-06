"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

// --- IMPORT FIREBASE CORE & AUTH SESSION ---
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const allowedRoles = ["superadmin", "admin_finance", "admin_operational"];

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
          if (userRole === "admin_operational" && pathname === "/admin/pricing") {
            router.push("/admin/vehicles"); 
          }

        } else {
          await signOut(auth);
          router.push("/admin/login");
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        router.push("/admin/login");
      } final: {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  // State Loading Guard Screen
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-bold text-sm animate-pulse">
        Memverifikasi Otoritas Administrator...
      </div>
    );
  }

  // Jika di halaman login, bypass layout sidebar dan render form langsung
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Jika lolos guard perlindungan, render sistem Admin Workspace lengkap dengan Sidebar Baru
  if (allowedRoles.includes(currentRole)) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
        
        {/* SIDEBAR WORKSPACE ADMIN (DARI COMPONENT TERPISAH) */}
        <AdminSidebar currentRole={currentRole} pathname={pathname} />

        {/* WORKSPACE AREA */}
        <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto">
          {children}
        </main>

      </div>
    );
  }

  return null;
}