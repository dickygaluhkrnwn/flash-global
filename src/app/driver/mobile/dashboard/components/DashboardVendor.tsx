"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Wallet, ChevronRight, AlertTriangle, Lock,
  Building2, Truck, Wrench, Users, BarChart3, Activity
} from "lucide-react";

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

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

interface DashboardVendorProps {
  driverStatus: "Pending" | "Active" | "Suspended" | "";
  isLocked: boolean;
  balance: number;
}

export default function DashboardVendor({ driverStatus, isLocked, balance }: DashboardVendorProps) {
  const { user } = useAuthStore();
  const router = useRouter();

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [fleetStats, setFleetStats] = useState({ total: 0, active: 0, maintenance: 0 });
  const [driverStats, setDriverStats] = useState({ total: 0, onDuty: 0, idle: 0 });

  // Tarik Data Asli Armada & Sopir dari Firebase
  useEffect(() => {
    if (!user || isLocked) {
      setIsLoadingStats(false);
      return;
    }

    const fetchVendorStats = async () => {
      try {
        // 1. Tarik Data Sopir milik Vendor ini
        const driverQuery = query(
          collection(db, "driver_wallets"), 
          where("vendorId", "==", user.uid),
          where("partnerType", "==", "FleetDriver")
        );
        const driverSnap = await getDocs(driverQuery);
        
        const totalDrivers = driverSnap.size; 
        let activeDrivers = 0;
        
        driverSnap.forEach((doc) => {
          if (doc.data().status === "Active") activeDrivers++; 
        });

        setDriverStats({ 
          total: totalDrivers, 
          onDuty: activeDrivers, 
          idle: totalDrivers - activeDrivers 
        });

        // 2. Tarik Data Armada Truk milik Vendor ini
        const fleetQuery = query(
          collection(db, "driver_wallets"), 
          where("vendorId", "==", user.uid),
          where("partnerType", "==", "FleetVehicle")
        );
        const fleetSnap = await getDocs(fleetQuery);
        
        const totalVehicles = fleetSnap.size; 
        let activeVehicles = 0;

        fleetSnap.forEach((doc) => {
          if (doc.data().status === "Active") activeVehicles++;
        });

        setFleetStats({
          total: totalVehicles,
          active: activeVehicles,
          maintenance: totalVehicles - activeVehicles
        });

      } catch (error) {
        console.error("Gagal menarik data statistik vendor:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchVendorStats();
  }, [user, isLocked]);

  return (
    <div className="space-y-6">
      
      {/* ========================================================= */}
      {/* BANNER SOFT-LOCK (GLASSMORPHISM STYLE)                      */}
      {/* ========================================================= */}
      <AnimatePresence>
        {driverStatus === "Pending" && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-amber-50/80 backdrop-blur-md border border-amber-200/50 rounded-[1.5rem] p-4 shadow-sm relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-200/30 rounded-full blur-[10px]"></div>
            <div className="flex gap-3 relative z-10">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-amber-200">
                <AlertTriangle className="text-amber-600" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-900 mb-0.5 tracking-tight">Legalitas PT Sedang Direview</h3>
                <p className="text-xs text-amber-800/80 mb-3 leading-relaxed font-medium">
                  Akun vendor Anda sedang dalam tahap verifikasi oleh Tim Admin. Anda belum bisa menugaskan armada.
                </p>
                <button 
                  onClick={() => router.push(getDriverUrl("/driver/profile"))}
                  className="bg-gradient-to-b from-amber-500 to-amber-600 hover:to-amber-700 text-white text-xs font-bold py-2.5 px-5 rounded-[1rem] transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_10px_rgba(217,119,6,0.2)] border border-amber-700 active:scale-95 tap-highlight-transparent outline-none"
                >
                  Cek Status Berkas
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {driverStatus === "Suspended" && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            className="bg-red-50/80 backdrop-blur-md border border-red-200/50 rounded-[1.5rem] p-4 shadow-sm relative overflow-hidden"
          >
            <div className="flex gap-3 relative z-10">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-red-200">
                <Lock className="text-red-600" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-red-900 mb-0.5 tracking-tight">Vendor Ditangguhkan</h3>
                <p className="text-xs text-red-800/80 leading-relaxed font-medium">
                  Operasional PT Anda dibekukan sementara. Seluruh armada dan sopir tidak dapat menerima order.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* SECTION 1: DOMPET & OMSET KORPORAT (3D PREMIUM CARD)        */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-gradient-to-br from-slate-900 to-[#0B1120] rounded-[2rem] p-6 relative overflow-hidden shadow-[0_15px_30px_rgba(15,23,42,0.3)] border border-slate-800",
          isLocked && "opacity-90 grayscale-[20%]"
        )}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-indigo-500 rounded-full blur-[40px] opacity-30 pointer-events-none"></div>
        
        <div className="relative z-10 flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Building2 size={14} className="text-blue-400" />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Pendapatan Terkumpul</p>
            </div>
            <h2 className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-md">
              <span className="text-xl text-slate-400 mr-1 font-sans">Rp</span> 
              {balance.toLocaleString('id-ID')}
            </h2>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-[1.25rem] flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <Wallet className="text-blue-400" size={22} />
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          <button 
            disabled={isLocked} 
            onClick={() => router.push(getDriverUrl('/driver/wallet'))}
            className="bg-gradient-to-b from-blue-500 to-blue-600 hover:to-blue-700 text-white text-sm font-black py-3.5 rounded-[1.25rem] transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_6px_15px_rgba(37,99,235,0.3)] border border-blue-700 active:scale-95 tap-highlight-transparent disabled:opacity-50 disabled:active:scale-100"
          >
            Tarik Dana PT
          </button>
          <button 
            disabled={isLocked} 
            onClick={() => router.push(getDriverUrl('/driver/wallet'))}
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-3.5 rounded-[1.25rem] backdrop-blur-md transition-all border border-white/20 active:scale-95 tap-highlight-transparent shadow-sm disabled:opacity-50 disabled:active:scale-100"
          >
            Cek Mutasi
          </button>
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* SECTION 2: STATUS ARMADA (FLEET VIEW BENTO BOX)             */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="text-sm font-black text-slate-800 tracking-tight">Manajemen Armada</h3>
          <button 
            onClick={() => router.push(getDriverUrl('/driver/fleet'))}
            className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors tap-highlight-transparent flex items-center gap-1"
          >
            Kelola Truk <ChevronRight size={12} strokeWidth={3} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5 rounded-[2rem] flex flex-col justify-center relative group tap-highlight-transparent cursor-pointer active:scale-[0.98] transition-transform">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-50 rounded-full transition-transform duration-500 group-hover:scale-110"></div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 border border-blue-200 shadow-sm relative z-10">
              <Truck size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Aktif & Siap Jalan</p>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight relative z-10">
              {isLoadingStats ? "-" : fleetStats.active} <span className="text-xs font-bold text-slate-400 font-sans tracking-normal uppercase">/ {isLoadingStats ? "-" : fleetStats.total} Truk</span>
            </p>
          </div>
          
          <div className="glass-card p-5 rounded-[2rem] flex flex-col justify-center relative group tap-highlight-transparent cursor-pointer active:scale-[0.98] transition-transform">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-red-50 rounded-full transition-transform duration-500 group-hover:scale-110"></div>
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3 border border-red-200 shadow-sm relative z-10">
              <Wrench size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">Masuk Bengkel</p>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight relative z-10">
              {isLoadingStats ? "-" : fleetStats.maintenance} <span className="text-xs font-bold text-slate-400 font-sans tracking-normal uppercase">Truk</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* SECTION 3: PERFORMA SOPIR (GLASS PROGRESS BAR)              */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3 px-2 mt-6">
          <h3 className="text-sm font-black text-slate-800 tracking-tight">Performa Karyawan</h3>
          <button 
            onClick={() => router.push(getDriverUrl('/driver/fleet'))}
            className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors tap-highlight-transparent flex items-center gap-1"
          >
            Sopir <ChevronRight size={12} strokeWidth={3} />
          </button>
        </div>

        <div className="glass-card rounded-[2rem] p-6 tap-highlight-transparent cursor-pointer active:scale-[0.99] transition-transform">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-[1.25rem] flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                <Users size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Sopir Vendor</p>
                <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">{isLoadingStats ? "-" : driverStats.total} <span className="text-sm font-bold text-slate-400 font-sans tracking-normal uppercase">Orang</span></p>
              </div>
            </div>
            <div className="w-10 h-10 bg-slate-50/80 rounded-full flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm">
              <BarChart3 size={18} />
            </div>
          </div>

          {/* Progress Bar Sopir dengan style Apple */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-black mb-2">
                <span className="text-slate-600 flex items-center gap-1.5"><Activity size={14} className="text-emerald-500"/> Sedang Mengaspal (On Duty)</span>
                <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{isLoadingStats ? "-" : driverStats.onDuty}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100/80 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: driverStats.total > 0 ? `${(driverStats.onDuty / driverStats.total) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs font-black mb-2">
                <span className="text-slate-600 flex items-center gap-1.5"><Lock size={14} className="text-amber-500"/> Sedang Idle / Istirahat</span>
                <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{isLoadingStats ? "-" : driverStats.idle}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100/80 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                <div 
                  className="h-full bg-gradient-to-r from-amber-300 to-amber-400 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: driverStats.total > 0 ? `${(driverStats.idle / driverStats.total) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}