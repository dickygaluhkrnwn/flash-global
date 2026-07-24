"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Navigation, Package, Wallet, TrendingUp, 
  ChevronRight, Power, AlertTriangle, Lock,
  Clock, CheckCircle2, History
} from "lucide-react";

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { OrderDetail } from "@/types/order";

const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

// 🚀 FUNGSI EKSTRAKTOR WAKTU SUPER AMAN (Lolos Linter & Build)
// Mengatasi semua bentuk waktu: String ISO, Number Milliseconds, dan Firebase Timestamp Object
const getSafeMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj.toDate === 'function') {
      const dateObj = obj.toDate() as Date;
      return dateObj.getTime();
    }
  }
  return new Date(String(ts)).getTime();
};

interface DashboardIndividualProps {
  driverStatus: "Pending" | "Active" | "Suspended" | "";
  isLocked: boolean;
  balance: number;
}

export default function DashboardIndividual({ driverStatus, isLocked, balance }: DashboardIndividualProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // State Interaktif Lokal
  const [isOnline, setIsOnline] = useState(false);
  const [recentOrders, setRecentOrders] = useState<OrderDetail[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // KEKUATAN 1: BACA & SIMPAN STATUS ONLINE KE LOCAL STORAGE
  useEffect(() => {
    const savedStatus = localStorage.getItem("driver_is_online");
    if (savedStatus !== null && !isLocked) {
      setIsOnline(savedStatus === "true");
    }
  }, [isLocked]);

  const toggleOnline = (status: boolean) => {
    if (isLocked) return;
    setIsOnline(status);
    localStorage.setItem("driver_is_online", status.toString());
  };

  // KEKUATAN 2 & 3: TARIK DATA RIWAYAT ASLI DARI FIREBASE
  useEffect(() => {
    if (!user || isLocked) {
      setIsLoadingHistory(false);
      return;
    }

    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, "orders"),
          where("driverId", "==", user.uid),
          where("status", "==", "Selesai")
        );
        const snap = await getDocs(q);
        const ordersData = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail));

        // Sorting dari yang paling baru diselesaikan menggunakan getSafeMillis
        ordersData.sort((a, b) => {
          return getSafeMillis(b.updatedAt || b.createdAt) - getSafeMillis(a.updatedAt || a.createdAt);
        });

        // Hitung berapa order yang selesai hari ini
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayOrders = ordersData.filter(o => {
          const tsMillis = getSafeMillis(o.updatedAt || o.createdAt);
          return tsMillis >= today.getTime();
        });

        setTodayCount(todayOrders.length);
        setRecentOrders(ordersData.slice(0, 5)); // Ambil 5 data paling baru untuk preview
      } catch (error) {
        console.error("Gagal menarik riwayat:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
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
                <h3 className="text-sm font-bold text-amber-800 mb-1">Profil Belum Lengkap</h3>
                <p className="text-xs text-amber-700/80 mb-3 leading-relaxed">
                  Anda belum bisa menerima order. Segera lengkapi dokumen KTP, SIM, dan kendaraan Anda.
                </p>
                <button 
                  onClick={() => router.push("/driver/mobile/profile")}
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
          onClick={() => toggleOnline(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-bold transition-all duration-300 ${!isOnline ? "bg-white text-slate-800 shadow-md border border-slate-200/50" : "text-slate-400"} ${isLocked && "cursor-not-allowed"}`}
        >
          Offline
        </button>
        
        <button 
          disabled={isLocked}
          onClick={() => toggleOnline(true)}
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
            className="glass-maroon rounded-3xl p-6 text-center relative overflow-hidden shadow-lg shadow-[#7A171D]/10 border border-[#7A171D]/20 cursor-pointer"
            onClick={() => router.push("/driver/mobile/radar")}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#7A171D]/20 rounded-full animate-ping"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#7A171D]/10 rounded-full animate-ping" style={{ animationDelay: "0.2s" }}></div>
            
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md relative z-10">
              <Navigation className="text-[#7A171D]" size={28} />
            </div>
            <h3 className="text-lg font-black text-[#7A171D] mb-1 relative z-10">Mencari Order...</h3>
            <p className="text-xs font-medium text-[#7A171D]/70 relative z-10">
              Ketuk untuk membuka Radar Penawaran Penuh.
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
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[60px] opacity-20"></div>
        <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-[#7A171D] rounded-full blur-[40px] opacity-40"></div>
        
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Saldo Tersedia</p>
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
            Cek Saldo
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
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full"></div>
            <Package className="text-blue-500 mb-3 relative z-10" size={24} />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide relative z-10">Pesanan Selesai</p>
            <p className="text-xl font-black text-slate-800 relative z-10">
              {isLoadingHistory ? "-" : todayCount} <span className="text-sm font-semibold text-slate-500">Order</span>
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-50 rounded-full"></div>
            <TrendingUp className="text-emerald-500 mb-3 relative z-10" size={24} />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide relative z-10">Tingkat Sukses</p>
            <p className="text-xl font-black text-slate-800 relative z-10">100<span className="text-sm font-semibold text-slate-500">%</span></p>
          </div>
        </div>
      </motion.div>

      {/* SECTION 5: RIWAYAT TERBARU (LIVE) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3 px-1 mt-6">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <History className="text-[#7A171D] w-4 h-4" /> Riwayat Pengiriman
          </h3>
          <button className="text-xs font-bold text-[#7A171D] flex items-center">
            Lihat Semua <ChevronRight size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {isLoadingHistory ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center animate-pulse">
              <p className="text-xs font-bold text-slate-400">Memuat riwayat...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 border-dashed text-center">
              <p className="text-xs font-bold text-slate-500">Belum ada riwayat pengiriman.</p>
            </div>
          ) : (
            recentOrders.map((order) => {
              const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
              const destAddr = destObj?.address || order.destination || "Alamat tidak diketahui";
              const earned = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
              
              // Gunakan getSafeMillis untuk UI juga agar 100% aman
              let dateStr = "Hari ini";
              const tsMillis = getSafeMillis(order.updatedAt || order.createdAt);
              if (tsMillis > 0) {
                dateStr = new Date(tsMillis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
              }

              return (
                <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
                  <div className="bg-emerald-50 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{destAddr}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-slate-400 font-mono uppercase">#{order.id.substring(0,8)}</p>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {dateStr}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-emerald-600">+{formatRupiah(earned)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>

    </div>
  );
}