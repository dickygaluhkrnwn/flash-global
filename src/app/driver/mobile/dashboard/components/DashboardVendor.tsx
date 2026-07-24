"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, ChevronRight, AlertTriangle, Lock,
  Building2, Truck, Wrench, Users, BarChart3, Activity
} from "lucide-react";

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";

interface DashboardVendorProps {
  driverStatus: "Pending" | "Active" | "Suspended" | "";
  isLocked: boolean;
  balance: number;
}

export default function DashboardVendor({ driverStatus, isLocked, balance }: DashboardVendorProps) {
  const { user } = useAuthStore();

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [fleetStats, setFleetStats] = useState({ total: 0, active: 0, maintenance: 0 });
  const [driverStats, setDriverStats] = useState({ total: 0, onDuty: 0, idle: 0 });

  // 🚀 KEKUATAN BARU: TARIK DATA ASLI ARMADA & SOPIR DARI FIREBASE
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
        
        const totalDrivers = driverSnap.size; // Diubah jadi const
        let activeDrivers = 0;
        
        driverSnap.forEach((doc) => {
          // Asumsi sopir OnDuty jika statusnya "Active", Sisanya Idle
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
        
        const totalVehicles = fleetSnap.size; // Diubah jadi const
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
      
      {/* --- BANNER SOFT-LOCK --- */}
      <AnimatePresence>
        {driverStatus === "Pending" && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-100 rounded-full opacity-50"></div>
            <div className="flex gap-3 relative z-10">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm font-bold text-amber-800 mb-1">Legalitas PT Sedang Direview</h3>
                <p className="text-xs text-amber-700/80 mb-3 leading-relaxed">
                  Akun vendor Anda sedang dalam tahap verifikasi oleh Tim Admin. Anda belum bisa menugaskan armada.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {driverStatus === "Suspended" && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm"
          >
            <div className="flex gap-3">
              <Lock className="text-red-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-sm font-bold text-red-800 mb-1">Vendor Ditangguhkan</h3>
                <p className="text-xs text-red-700/80 leading-relaxed">
                  Operasional PT Anda dibekukan sementara. Seluruh armada dan sopir tidak dapat menerima order.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 1: DOMPET & OMSET KORPORAT */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 relative overflow-hidden shadow-xl ${isLocked ? 'opacity-80 grayscale-[30%]' : ''}`}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20"></div>
        <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-indigo-500 rounded-full blur-[40px] opacity-30"></div>
        
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={14} className="text-blue-400" />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Pendapatan Terkumpul</p>
            </div>
            <h2 className="text-3xl font-black text-white">
              <span className="text-xl text-slate-400 mr-1">Rp</span> 
              {balance.toLocaleString('id-ID')}
            </h2>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10">
            <Wallet className="text-blue-400" size={20} />
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          <button disabled={isLocked} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50">
            Tarik Dana PT
          </button>
          <button disabled={isLocked} className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-3 rounded-xl backdrop-blur-md transition-colors border border-white/10 disabled:opacity-50">
            Cek Mutasi
          </button>
        </div>
      </motion.div>

      {/* SECTION 2: STATUS ARMADA (FLEET VIEW) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-800">Manajemen Armada</h3>
          <button className="text-xs font-bold text-blue-600 flex items-center">
            Kelola Truk <ChevronRight size={14} />
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full transition-transform group-hover:scale-110"></div>
            <Truck className="text-blue-500 mb-3 relative z-10" size={24} />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide relative z-10">Aktif & Siap Jalan</p>
            <p className="text-2xl font-black text-slate-800 relative z-10">
              {isLoadingStats ? "-" : fleetStats.active} <span className="text-xs font-semibold text-slate-500">/ {isLoadingStats ? "-" : fleetStats.total} Truk</span>
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-50 rounded-full transition-transform group-hover:scale-110"></div>
            <Wrench className="text-red-500 mb-3 relative z-10" size={24} />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide relative z-10">Masuk Bengkel</p>
            <p className="text-2xl font-black text-slate-800 relative z-10">
              {isLoadingStats ? "-" : fleetStats.maintenance} <span className="text-xs font-semibold text-slate-500">Truk</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* SECTION 3: PERFORMA SOPIR */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-800">Performa Sopir</h3>
          <button className="text-xs font-bold text-blue-600 flex items-center">
            Kelola Karyawan <ChevronRight size={14} />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Sopir Vendor</p>
                <p className="text-lg font-black text-slate-800">{isLoadingStats ? "-" : driverStats.total} <span className="text-sm font-medium text-slate-500">Orang</span></p>
              </div>
            </div>
            <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100">
              <BarChart3 size={18} />
            </div>
          </div>

          {/* Progress Bar Sopir */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-600 flex items-center gap-1.5"><Activity size={12} className="text-emerald-500"/> Sedang Mengaspal (On Duty)</span>
                <span className="text-slate-800">{isLoadingStats ? "-" : driverStats.onDuty}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                  style={{ width: driverStats.total > 0 ? `${(driverStats.onDuty / driverStats.total) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-600 flex items-center gap-1.5"><Lock size={12} className="text-amber-500"/> Sedang Idle / Istirahat</span>
                <span className="text-slate-800">{isLoadingStats ? "-" : driverStats.idle}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full transition-all duration-1000" 
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