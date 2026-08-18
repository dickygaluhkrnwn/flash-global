// src/app/driver/mobile/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";

// IMPORT KOMPONEN MODULAR KITA
import DashboardIndividual from "./components/DashboardIndividual";
import DashboardVendor from "./components/DashboardVendor";
import Header from "@/components/driver/Header"; 

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getDriverUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('driver.flashglobalslogistik.com')) {
    let cleanPath = path.replace(/^\/driver\/mobile/, '');
    cleanPath = cleanPath.replace(/^\/driver/, '');
    return cleanPath || '/';
  }
  if (path.startsWith('/driver') && !path.startsWith('/driver/mobile')) {
    return path.replace('/driver', '/driver/mobile');
  }
  return path;
};

export default function DriverDashboard() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);
  
  // States Global
  const [balance, setBalance] = useState(0);
  const [driverStatus, setDriverStatus] = useState<"Pending" | "Active" | "Suspended" | "">("");
  const [partnerType, setPartnerType] = useState<"Individual" | "Vendor" | "">("");

  // Fetch Data dari Firestore
  useEffect(() => {
    // Pastikan Zustand sudah terhidrasi sebelum mengecek user
    if (!isHydrated) return;

    const fetchDashboardData = async () => {
      // AUTH GUARD: Cegah infinite loading jika user tidak ada
      if (!user) {
        router.push(getDriverUrl("/driver/login"));
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDriverStatus(data.status || "Pending");
          setPartnerType(data.partnerType || "Individual"); 
          setBalance(data.balance || 0); 
        }
      } catch (error) {
        console.error("Gagal verifikasi status:", error);
      } finally {
        setIsVerifying(false);
      }
    };

    fetchDashboardData();
  }, [user, isHydrated, router]);

  // Layar Loading Premium
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[var(--brand-maroon)] rounded-full animate-spin shadow-sm"></div>
        <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">Memuat Radar...</p>
      </div>
    );
  }

  const isLocked = driverStatus === "Pending" || driverStatus === "Suspended";

  return (
    <div className="flex flex-col min-h-screen font-sans">
      
      {/* 🚀 SMART HEADER */}
      <Header 
        title="Dashboard" 
        showBack={false} 
        partnerType={partnerType} 
      />

      {/* Konten Utama */}
      <main className="p-4 md:p-5 relative z-10 space-y-6 pt-24"> 
        {/* 
          pt-24 (padding-top) ditambahkan agar konten pertama tidak tertutup 
          oleh Header yang melayang (fixed top-0).
        */}

        {/* ========================================= */}
        {/* SPLITTING MODUL: VENDOR vs INDIVIDUAL     */}
        {/* ========================================= */}
        {partnerType === "Vendor" ? (
          <DashboardVendor 
            driverStatus={driverStatus} 
            isLocked={isLocked} 
            balance={balance} 
          />
        ) : (
          <DashboardIndividual 
            driverStatus={driverStatus} 
            isLocked={isLocked} 
            balance={balance} 
          />
        )}
      </main>
    </div>
  );
}