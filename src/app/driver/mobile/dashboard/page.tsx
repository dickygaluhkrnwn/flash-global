"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { Navigation, Package, Wallet, TrendingUp, ChevronRight, Power, Bell, AlertTriangle, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function DriverDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);
  
  // State Interaktif Dashboard
  const [isOnline, setIsOnline] = useState(false);
  const [balance, setBalance] = useState(0);
  
  // STATE SOFT-LOCK (Baru)
  const [driverStatus, setDriverStatus] = useState<"Pending" | "Active" | "Suspended" | "">("");

  // Cek Status Driver ke Firestore (Tanpa Redirect)
  useEffect(() => {
    const verifyStatus = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDriverStatus(data.status || "Pending");
          // Simulasi ambil saldo
          setBalance(data.balance || 1250000);
        }
      } catch (error) {
        console.error("Gagal verifikasi status:", error);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyStatus();
  }, [user]);

  // Loading Screen Premium
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-bold text-slate-400 animate-pulse">Menyiapkan Dashboard...</p>
      </div>
    );
  }

  // Cek apakah akun dikunci (belum lengkap data atau disuspend)
  const isLocked = driverStatus === "Pending" || driverStatus === "Suspended";

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] font-sans pb-6">
      {/* Header */}
      <div className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
            <Image 
              src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}&background=7A171D&color=fff`} 
              alt="Profile" 
              fill 
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Selamat Bekerja,</p>
            <h1 className="text-sm font-black text-slate-800 line-clamp-1">{user?.displayName}</h1>
          </div>
        </div>
        <button className="relative p-2 text-slate-600 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors border border-slate-200 shadow-sm">
          <Bell size={20} />
          {/* Indikator notifikasi menyala merah */}
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#7A171D] rounded-full border-2 border-white"></span>
        </button>
      </div>

      <main className="p-5 space-y-6">

        {/* --- BANNER SOFT-LOCK (Baru) --- */}
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
                  <h3 className="text-sm font-bold text-amber-800 mb-1">Profil Belum Lengkap</h3>
                  <p className="text-xs text-amber-700/80 mb-3 leading-relaxed">
                    Anda belum bisa menerima order. Segera lengkapi dokumen KTP, SIM, dan kendaraan Anda.
                  </p>
                  <button 
                    onClick={() => router.push("/driver/profile")}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors shadow-sm"
                  >
                    Lengkapi Sekarang
                  </button>
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
                  <h3 className="text-sm font-bold text-red-800 mb-1">Akun Ditangguhkan</h3>
                  <p className="text-xs text-red-700/80 leading-relaxed">
                    Sistem mendeteksi aktivitas tidak biasa. Silakan hubungi tim Support kami.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* SECTION 1: TOGGLE STATUS (Soft-Locked) */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative bg-white p-1.5 rounded-[2rem] shadow-sm border ${isLocked ? 'border-slate-200/50 opacity-80' : 'border-slate-100'} flex items-center`}
        >
          <div className="absolute inset-0 bg-slate-50 rounded-[2rem] -z-10 m-1.5"></div>
          
          <button 
            disabled={isLocked}
            onClick={() => setIsOnline(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-bold transition-all duration-300 ${!isOnline ? "bg-white text-slate-800 shadow-md border border-slate-200/50" : "text-slate-400"} ${isLocked && "cursor-not-allowed"}`}
          >
            Offline
          </button>
          
          <button 
            disabled={isLocked}
            onClick={() => {
              if (isLocked) return;
              setIsOnline(true);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-bold transition-all duration-300 ${isOnline ? "bg-[#7A171D] text-white shadow-lg shadow-[#7A171D]/30" : "text-slate-400"} ${isLocked && "cursor-not-allowed bg-slate-100"}`}
          >
            {isLocked ? <Lock size={16} className="text-slate-400" /> : <Power size={16} className={isOnline ? "animate-pulse" : ""} />}
            {isLocked ? "Terkunci" : "Online"}
          </button>
        </motion.div>

        {/* SECTION 2: RADAR & CURRENT ACTIVITY */}
        <AnimatePresence mode="wait">
          {isOnline ? (
            <motion.div 
              key="online"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-maroon rounded-3xl p-6 text-center relative overflow-hidden shadow-lg shadow-[#7A171D]/10 border border-[#7A171D]/20"
            >
              {/* Radar Ping Animation */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#7A171D]/20 rounded-full animate-ping"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#7A171D]/10 rounded-full animate-ping" style={{ animationDelay: "0.2s" }}></div>
              
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md relative z-10">
                <Navigation className="text-[#7A171D]" size={28} />
              </div>
              <h3 className="text-lg font-black text-[#7A171D] mb-1 relative z-10">Mencari Order...</h3>
              <p className="text-xs font-medium text-[#7A171D]/70 relative z-10">
                Sistem sedang memindai pengiriman terdekat dari lokasi Anda.
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="offline"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-100 rounded-3xl p-6 text-center border border-slate-200 border-dashed"
            >
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Power className="text-slate-400" size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">Anda Sedang Offline</h3>
              <p className="text-xs font-medium text-slate-500">
                {isLocked ? "Selesaikan pendaftaran untuk mulai menerima order." : "Geser tombol ke Online untuk mulai menerima penawaran order."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SECTION 3: DOMPET & PENDAPATAN */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-3xl p-6 relative overflow-hidden shadow-xl"
        >
          {/* Abstract Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[60px] opacity-20"></div>
          <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-[#7A171D] rounded-full blur-[40px] opacity-40"></div>
          
          <div className="relative z-10 flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Saldo Corporate</p>
              <h2 className="text-3xl font-black text-white">
                <span className="text-xl text-slate-400 mr-1">Rp</span> 
                {balance.toLocaleString('id-ID')}
              </h2>
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10">
              <Wallet className="text-[#C5A059]" size={20} />
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3">
            <button className="bg-[#C5A059] hover:bg-[#A68345] text-white text-sm font-bold py-3 rounded-xl transition-colors shadow-lg shadow-[#C5A059]/20">
              Tarik Dana
            </button>
            <button className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-3 rounded-xl backdrop-blur-md transition-colors border border-white/10">
              Riwayat
            </button>
          </div>
        </motion.div>

        {/* SECTION 4: METRIK HARI INI */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-800">Ringkasan Hari Ini</h3>
            <button className="text-xs font-bold text-[#7A171D] flex items-center">
              Lihat Detail <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full"></div>
              <Package className="text-blue-500 mb-3 relative z-10" size={24} />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide relative z-10">Selesai</p>
              <p className="text-xl font-black text-slate-800 relative z-10">8 <span className="text-sm font-semibold text-slate-500">Order</span></p>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full"></div>
              <TrendingUp className="text-emerald-500 mb-3 relative z-10" size={24} />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide relative z-10">Tingkat Sukses</p>
              <p className="text-xl font-black text-slate-800 relative z-10">100<span className="text-sm font-semibold text-slate-500">%</span></p>
            </div>
          </div>
        </motion.div>

      </main>
    </div>
  );
}