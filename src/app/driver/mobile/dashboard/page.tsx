"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { Bell } from "lucide-react";
import Image from "next/image";

// IMPORT KOMPONEN MODULAR KITA
import DashboardIndividual from "./components/DashboardIndividual";
import DashboardVendor from "./components/DashboardVendor";

export default function DriverDashboard() {
  const { user } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);
  
  // States Global
  const [balance, setBalance] = useState(0);
  const [driverStatus, setDriverStatus] = useState<"Pending" | "Active" | "Suspended" | "">("");
  const [partnerType, setPartnerType] = useState<"Individual" | "Vendor" | "">("");

  // Fetch Data dari Firestore
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDriverStatus(data.status || "Pending");
          setPartnerType(data.partnerType || ""); // Cek tipe kemitraan
          setBalance(data.balance || 0); // Di-set 0 (Bisa diganti jika ada dummy)
        }
      } catch (error) {
        console.error("Gagal verifikasi status:", error);
      } finally {
        setIsVerifying(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Layar Loading Premium
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-bold text-slate-400 animate-pulse">Memuat Ekosistem...</p>
      </div>
    );
  }

  const isLocked = driverStatus === "Pending" || driverStatus === "Suspended";

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] font-sans pb-24"> {/* Tambah pb-24 untuk ruang Bottom Nav */}
      
      {/* HEADER UNIVERSAL */}
      <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
            <Image 
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=${partnerType === 'Vendor' ? '2563eb' : '7A171D'}&color=fff`} 
              alt="Profile" 
              fill 
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Selamat {partnerType === "Vendor" ? 'Bekerja,' : 'Mengaspal,'}</p>
            <h1 className="text-sm font-black text-slate-800 line-clamp-1">{user?.displayName}</h1>
          </div>
        </div>
        <button className="relative p-2 text-slate-600 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm">
          <Bell size={20} />
          {/* Indikator notifikasi menyala merah/biru */}
          <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${partnerType === 'Vendor' ? 'bg-blue-600' : 'bg-[#7A171D]'}`}></span>
        </button>
      </div>

      <main className="p-5">
        {/* CONDITIONAL RENDERING (SPLITTING) */}
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