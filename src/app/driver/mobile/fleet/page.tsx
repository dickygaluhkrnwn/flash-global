"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Users, Truck, Loader2 } from "lucide-react";

// --- IMPORT KOMPONEN TAB ---
import DriverTab from "./components/DriverTab";
import VehicleTab from "./components/VehicleTab"; // <-- INI YANG BARU DITAMBAHKAN

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
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-sm font-bold text-slate-500 mt-4 animate-pulse uppercase tracking-widest">
          Otorisasi Vendor...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans pb-24 flex flex-col">
      
      {/* HEADER */}
      <div className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/driver/dashboard")} 
            className="p-2 bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none">Manajemen Armada</h1>
            <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase tracking-widest">Portal Vendor PT</p>
          </div>
        </div>
      </div>

      <main className="p-5 flex-1 flex flex-col">
        
        {/* DUAL-TAB SWITCHER */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 relative">
          <button 
            onClick={() => setActiveTab("drivers")} 
            className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "drivers" ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Users size={18} /> Sopir PT
          </button>
          <button 
            onClick={() => setActiveTab("vehicles")} 
            className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "vehicles" ? "text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Truck size={18} /> Truk Fisik
          </button>
          
          {/* ANIMATED PILL BACKGROUND */}
          <div 
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-blue-600 rounded-xl shadow-md transition-all duration-300 ease-out ${activeTab === "drivers" ? "left-1.5" : "left-[calc(50%+4px)]"}`}
          />
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            
            {/* KONTEN TAB SOPIR */}
            {activeTab === "drivers" ? (
              <motion.div 
                key="tab-drivers"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}
              >
                {/* MEMANGGIL KOMPONEN TAB SOPIR */}
                <DriverTab />
              </motion.div>

            ) : (

              /* KONTEN TAB TRUK FISIK */
              <motion.div 
                key="tab-vehicles"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
              >
                {/* MEMANGGIL KOMPONEN TAB TRUK YANG BARU SAJA KITA BUAT */}
                <VehicleTab />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}