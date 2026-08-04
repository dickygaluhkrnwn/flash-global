"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Navigation, Package, Wallet, TrendingUp, 
  ChevronRight, Power, AlertTriangle, Lock,
  Clock, CheckCircle2, History, Truck
} from "lucide-react";

import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { OrderDetail } from "@/types/order";
import { cn } from "@/lib/utils";

const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

// Ekstraktor Waktu Super Aman
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
  
  const [isOnline, setIsOnline] = useState(false);
  const [recentOrders, setRecentOrders] = useState<OrderDetail[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // 🚀 STATE UNTUK MENDETEKSI ORDER AKTIF
  const [activeOrder, setActiveOrder] = useState<OrderDetail | null>(null);

  // Status Online Local Storage
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

  // 🚀 FETCH ACTIVE ORDER SECARA REALTIME
  useEffect(() => {
    if (!user || isLocked) return;
    
    const activeStatuses = ["Menuju Lokasi Jemput", "Sedang Diproses", "Dikirim"];
    const q = query(
      collection(db, "orders"),
      where("driverId", "==", user.uid),
      where("status", "in", activeStatuses)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        // Ambil order pertama yang aktif
        setActiveOrder({ id: snap.docs[0].id, ...snap.docs[0].data() } as OrderDetail);
      } else {
        setActiveOrder(null);
      }
    });

    return () => unsub();
  }, [user, isLocked]);

  // Fetch History Orders (Untuk order Selesai)
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

        ordersData.sort((a, b) => {
          return getSafeMillis(b.updatedAt || b.createdAt) - getSafeMillis(a.updatedAt || a.createdAt);
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayOrders = ordersData.filter(o => {
          const tsMillis = getSafeMillis(o.updatedAt || o.createdAt);
          return tsMillis >= today.getTime();
        });

        setTodayCount(todayOrders.length);
        setRecentOrders(ordersData.slice(0, 5));
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
                <h3 className="text-sm font-black text-amber-900 mb-0.5 tracking-tight">Profil Belum Lengkap</h3>
                <p className="text-xs text-amber-800/80 mb-3 leading-relaxed font-medium">
                  Anda belum bisa menerima order. Segera lengkapi dokumen KTP, SIM, dan kendaraan Anda.
                </p>
                <button 
                  onClick={() => router.push("/driver/profile")}
                  className="bg-gradient-to-b from-amber-500 to-amber-600 hover:to-amber-700 text-white text-xs font-bold py-2.5 px-5 rounded-[1rem] transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_10px_rgba(217,119,6,0.2)] border border-amber-700 active:scale-95 tap-highlight-transparent outline-none"
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
            className="bg-red-50/80 backdrop-blur-md border border-red-200/50 rounded-[1.5rem] p-4 shadow-sm relative overflow-hidden"
          >
            <div className="flex gap-3 relative z-10">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-red-200">
                <Lock className="text-red-600" size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-red-900 mb-0.5 tracking-tight">Akun Ditangguhkan</h3>
                <p className="text-xs text-red-800/80 leading-relaxed font-medium">
                  Sistem mendeteksi aktivitas tidak biasa. Silakan hubungi tim Support kami.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 🚀 BANNER PENGIRIMAN AKTIF (Kembali ke AWB)                */}
      {/* ========================================================= */}
      <AnimatePresence>
        {activeOrder && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
            onClick={() => router.push(`/driver/awb/${activeOrder.id}`)}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-[1.5rem] p-4 shadow-[0_8px_20px_rgba(16,185,129,0.3)] border border-emerald-400 relative overflow-hidden cursor-pointer tap-highlight-transparent active:scale-[0.98] transition-transform"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-[40px] pointer-events-none"></div>
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-white/20 rounded-xl border border-white/30 flex items-center justify-center shadow-sm backdrop-blur-sm">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 bg-emerald-200 rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
                    <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest leading-none">Pengiriman Aktif</p>
                  </div>
                  <h3 className="text-sm font-black text-white tracking-tight">{activeOrder.status}</h3>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-200" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ========================================================= */}
      {/* SECTION 1: TOGGLE STATUS (iOS SEGMENTED CONTROL VIBE)     */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative bg-white/70 backdrop-blur-md p-1.5 rounded-[2rem] shadow-sm border flex items-center transition-all duration-300",
          isLocked ? 'border-slate-200/50 opacity-80' : 'border-white'
        )}
      >
        <div className="absolute inset-0 bg-slate-100/50 rounded-[2rem] -z-10 m-1.5"></div>
        
        <button 
          disabled={isLocked}
          onClick={() => toggleOnline(false)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-sm transition-all duration-300 tap-highlight-transparent select-none outline-none relative z-10",
            !isOnline 
              ? "bg-white text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-100 font-black" 
              : "text-slate-400 font-bold",
            isLocked && "cursor-not-allowed"
          )}
        >
          Offline
        </button>
        
        <button 
          disabled={isLocked}
          onClick={() => toggleOnline(true)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[1.5rem] text-sm transition-all duration-300 tap-highlight-transparent select-none outline-none relative z-10",
            isOnline 
              ? "bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_4px_15px_rgba(122,23,29,0.3)] border border-[#5A0E13] font-black" 
              : "text-slate-400 font-bold",
            isLocked && "cursor-not-allowed bg-slate-100"
          )}
        >
          {isLocked ? <Lock size={16} className="text-slate-400" /> : <Power size={16} className={isOnline ? "animate-pulse drop-shadow-sm" : ""} />}
          {isLocked ? "Terkunci" : "Online"}
        </button>
      </motion.div>

      {/* ========================================================= */}
      {/* SECTION 2: RADAR & CURRENT ACTIVITY (GLASSMORPHISM)       */}
      {/* ========================================================= */}
      <AnimatePresence mode="wait">
        {isOnline ? (
          <motion.div 
            key="online"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card rounded-[2rem] p-6 text-center relative overflow-hidden tap-highlight-transparent cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => router.push("/driver/radar")}
          >
            {/* Animasi Gelombang Radar */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#7A171D]/10 rounded-full animate-ping"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#7A171D]/5 rounded-full animate-ping" style={{ animationDelay: "0.2s" }}></div>
            
            <div className="w-16 h-16 bg-gradient-to-b from-white to-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border border-slate-100 relative z-10">
              <Navigation className="text-[#7A171D]" size={28} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1 relative z-10 tracking-tight">Mencari Order...</h3>
            <p className="text-xs font-bold text-slate-500 relative z-10">
              Ketuk untuk membuka Radar Penawaran Penuh.
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="offline"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card rounded-[2rem] p-6 text-center border-dashed border-2 border-slate-200 bg-white/40"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-white shadow-sm">
              <Power className="text-slate-400" size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1 tracking-tight">Anda Sedang Offline</h3>
            <p className="text-xs font-bold text-slate-500 max-w-[250px] mx-auto">
              {isLocked ? "Selesaikan pendaftaran untuk mulai menerima order." : "Geser tombol ke Online untuk mulai menerima penawaran order."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* SECTION 3: DOMPET & PENDAPATAN (3D PREMIUM CARD)          */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-[#1e293b] to-slate-900 rounded-[2rem] p-6 relative overflow-hidden shadow-[0_15px_30px_rgba(15,23,42,0.3)] border border-slate-800"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
        <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-[#7A171D] rounded-full blur-[40px] opacity-40 pointer-events-none"></div>
        
        <div className="relative z-10 flex justify-between items-start mb-8">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Saldo Tersedia</p>
            <h2 className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-md">
              <span className="text-xl text-slate-400 mr-1 font-sans">Rp</span> 
              {balance.toLocaleString('id-ID')}
            </h2>
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-[1.25rem] flex items-center justify-center backdrop-blur-md border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
            <Wallet className="text-[#C5A059]" size={22} />
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3">
          <button 
            onClick={() => router.push('/driver/wallet')}
            className="bg-gradient-to-b from-[#DFBE7B] to-[#C5A059] hover:to-[#B69352] text-white text-sm font-black py-3.5 rounded-[1.25rem] transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_15px_rgba(197,160,89,0.3)] border border-[#A68345] active:scale-95 tap-highlight-transparent"
          >
            Tarik Dana
          </button>
          <button 
            onClick={() => router.push('/driver/wallet')}
            className="bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-3.5 rounded-[1.25rem] backdrop-blur-md transition-all border border-white/20 active:scale-95 tap-highlight-transparent shadow-sm"
          >
            Riwayat Saldo
          </button>
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* SECTION 4: METRIK HARI INI (BENTO BOX LAYOUT)             */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="text-sm font-black text-slate-800 tracking-tight">Ringkasan Hari Ini</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5 rounded-[2rem] flex flex-col justify-center relative">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100 shadow-sm">
              <Package size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pesanan Selesai</p>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              {isLoadingHistory ? "-" : todayCount} <span className="text-xs font-bold text-slate-400 font-sans tracking-normal uppercase">Order</span>
            </p>
          </div>
          
          <div className="glass-card p-5 rounded-[2rem] flex flex-col justify-center relative">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100 shadow-sm">
              <TrendingUp size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tingkat Sukses</p>
            <p className="text-2xl font-black text-slate-900 mt-1 font-mono tracking-tight">
              100<span className="text-xs font-bold text-slate-400 font-sans tracking-normal uppercase">%</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* ========================================================= */}
      {/* SECTION 5: RIWAYAT TERBARU (LIVE)                         */}
      {/* ========================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-3 px-2 mt-6">
          <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
            <History className="text-[var(--brand-maroon)] w-4 h-4" /> Riwayat Terakhir
          </h3>
          <button className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-maroon)] bg-[#7A171D]/10 px-3 py-1.5 rounded-full hover:bg-[#7A171D]/20 transition-colors tap-highlight-transparent">
            Lihat Semua
          </button>
        </div>

        <div className="space-y-3">
          {isLoadingHistory ? (
            <div className="glass-card p-6 rounded-[1.5rem] text-center animate-pulse border-white/60">
              <p className="text-xs font-bold text-slate-400">Menarik riwayat server...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="glass-card p-8 rounded-[1.5rem] text-center border-dashed border-2 border-slate-200 bg-white/40">
              <p className="text-xs font-bold text-slate-500">Belum ada riwayat pengiriman.</p>
            </div>
          ) : (
            recentOrders.map((order, idx) => {
              const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
              const destAddr = destObj?.address || order.destination || "Alamat tidak diketahui";
              const earned = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
              
              let dateStr = "Hari ini";
              const tsMillis = getSafeMillis(order.updatedAt || order.createdAt);
              if (tsMillis > 0) {
                dateStr = new Date(tsMillis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
              }

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={order.id} 
                  className="glass-card p-4 rounded-[1.5rem] flex items-center justify-between gap-4 tap-highlight-transparent active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="bg-emerald-50/80 w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 border border-emerald-100/50 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-black text-slate-800 line-clamp-1 mb-1 tracking-tight">{destAddr}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[9px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-wider">#{order.id.substring(0,6)}</p>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> {dateStr}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-emerald-600 font-mono tracking-tight">+{formatRupiah(earned)}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>

    </div>
  );
}