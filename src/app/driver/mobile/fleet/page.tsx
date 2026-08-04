"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

// --- IMPORT KOMPONEN TAB ---
import DriverTab from "./components/DriverTab";
import VehicleTab from "./components/VehicleTab"; 
import Header from "@/components/driver/Header"; // 🚀 Import Smart Header kita

export default function FleetManagementPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk Tab
  const [activeTab, setActiveTab] = useState<"drivers" | "vehicles">("drivers");

  // ROUTE GUARD: Verifikasi Otoritas Vendor
  useEffect(() => {
    const checkVendorRole = async () => {
      if (!user) {
        router.replace("/driver/login");
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.partnerType !== "Vendor") {
            // Kalau bukan Vendor, tendang keluar ke Dashboard
            router.replace("/driver/dashboard");
          } else {
            setIsLoading(false);
          }
        } else {
          router.replace("/driver/dashboard");
        }
      } catch (error) {
        console.error("Gagal verifikasi role:", error);
        router.replace("/driver/dashboard");
      }
    };

    checkVendorRole();
  }, [user, router]);

  // LOADING SCREEN SEBELUM GUARD SELESAI
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin shadow-sm mb-3"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Otorisasi Vendor...
        </p>
      </div>
    );
  }

  return (
    // Gunakan tap-highlight-transparent agar no blue box saat klik tab
    <div className="min-h-screen font-sans pb-24 flex flex-col relative tap-highlight-transparent">
      
      {/* 🚀 SMART HEADER */}
      <Header 
        title="Manajemen Armada" 
        showBack={true} 
        partnerType="Vendor" 
      />

      <main className="p-4 md:p-5 relative z-10 flex-1 flex flex-col pt-24">
        
        {/* 🚀 DUAL-TAB SWITCHER (APPLE SEGMENTED CONTROL) */}
        <div className="flex bg-slate-200/60 p-1.5 rounded-[1.25rem] shadow-inner border border-slate-300/50 mb-6 relative">
          <button 
            onClick={() => setActiveTab("drivers")} 
            className={cn(
              "flex-1 py-3 text-xs font-black transition-colors rounded-[1rem] relative z-10 flex items-center justify-center gap-2", 
              activeTab === "drivers" ? "text-slate-800 drop-shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Users size={16} /> Data Sopir PT
          </button>
          
          <button 
            onClick={() => setActiveTab("vehicles")} 
            className={cn(
              "flex-1 py-3 text-xs font-black transition-colors rounded-[1rem] relative z-10 flex items-center justify-center gap-2", 
              activeTab === "vehicles" ? "text-slate-800 drop-shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Truck size={16} /> Fisik Truk PT
          </button>
          
          {/* Slider Animasi iOS */}
          <motion.div 
            className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-[1rem] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-100 z-0"
            animate={{ left: activeTab === "drivers" ? "6px" : "calc(50% + 0px)" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        </div>

        {/* 🚀 CONTENT AREA (Pindah antar Tab) */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            
            {/* KONTEN TAB SOPIR */}
            {activeTab === "drivers" ? (
              <motion.div 
                key="tab-drivers"
                initial={{ opacity: 0, x: -10, filter: "blur(4px)" }} 
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} 
                exit={{ opacity: 0, x: 10, filter: "blur(4px)" }} 
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {/* KOMPONEN TAB SOPIR */}
                <DriverTab />
              </motion.div>
            ) : (
              /* KONTEN TAB TRUK FISIK */
              <motion.div 
                key="tab-vehicles"
                initial={{ opacity: 0, x: 10, filter: "blur(4px)" }} 
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} 
                exit={{ opacity: 0, x: -10, filter: "blur(4px)" }} 
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {/* KOMPONEN TAB TRUK */}
                <VehicleTab />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}