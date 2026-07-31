"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Wallet, ArrowUpCircle, ArrowDownCircle,  
  UserCircle, Building2, ShieldAlert, 
  Activity, ArrowRight, Banknote, Landmark, ShieldCheck
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Emerald/Finance Accent)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

interface WalletStats {
  driverBalance: number;
  driverCount: number;
  b2bBalance: number;
  b2bCount: number;
  pendingTopups: number;
  pendingWithdrawals: number;
}

export default function AdminWalletHubPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [stats, setStats] = useState<WalletStats>({
    driverBalance: 0, driverCount: 0, b2bBalance: 0, b2bCount: 0, pendingTopups: 0, pendingWithdrawals: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHubStats = async () => {
      try {
        // 1. Fetch Driver Wallets
        const driverSnap = await getDocs(collection(db, "driver_wallets"));
        let dBal = 0, dCount = 0;
        driverSnap.forEach(d => {
          const data = d.data();
          if (data.partnerType !== "FleetVehicle" && data.partnerType !== "FleetDriver") {
            dCount++;
            dBal += (data.balance || 0);
          }
        });

        // 2. Fetch B2B Wallets
        const b2bQ = query(collection(db, "users"), where("role", "==", "b2b"));
        const b2bSnap = await getDocs(b2bQ);
        let bBal = 0;
        b2bSnap.forEach(d => {
          bBal += (d.data().depositBalance || 0);
        });

        // 3. Fetch Pending Withdrawals
        const withdrawQ = query(collection(db, "withdrawal_requests"), where("status", "==", "Pending"));
        const withdrawSnap = await getDocs(withdrawQ);

        // 4. Fetch Pending Topups
        const topupQ = query(collection(db, "deposit_requests"), where("status", "==", "Pending"));
        const topupSnap = await getDocs(topupQ);

        setStats({
          driverBalance: dBal,
          driverCount: dCount,
          b2bBalance: bBal,
          b2bCount: b2bSnap.size,
          pendingWithdrawals: withdrawSnap.size,
          pendingTopups: topupSnap.size
        });
      } catch (error) {
        console.error("Gagal menarik statistik hub dompet:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHubStats();
  }, []);

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  // RBAC GUARD
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Pusat Dompet & Kas ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-emerald-600 animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menghimpun Data Brankas...</p>
      </div>
    );
  }

  const totalAssets = stats.driverBalance + stats.b2bBalance;

  return (
    <div className="space-y-8 pb-20 font-sans max-w-7xl mx-auto">
      
      {/* 1. HERO SECTION (GLASSMORPHISM) */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <AdminBadge variant="success" className="mb-4 flex items-center gap-1.5 w-fit px-3 py-1 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" /> Finance & Treasury Panel
          </AdminBadge>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Landmark className="w-8 h-8 text-emerald-600" />
            Pusat Kas & E-Wallet
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl font-medium leading-relaxed">
            Sistem sentralisasi pengawasan dana mengendap (deposit klien & komisi mitra) serta jalur verifikasi lalu lintas dana masuk (Top-Up) dan keluar (Withdraw).
          </p>
        </div>
      </div>

      {/* 2. MAIN BENTO STATS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* TOTAL ASSETS CARD */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="md:col-span-12 lg:col-span-6 bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-950 rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col justify-center">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500 rounded-full blur-[80px] opacity-30 pointer-events-none" />
          <div className="relative z-10">
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" /> Total Dana Mengendap (Aset)
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white font-mono mt-2 drop-shadow-md">
              {formatRupiah(totalAssets)}
            </h2>
            
            <div className="flex items-center gap-6 mt-8 pt-6 border-t border-white/10">
              <div>
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Dompet Kemitraan</p>
                <p className="text-emerald-400 font-black text-lg font-mono">{formatRupiah(stats.driverBalance)}</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div>
                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-1">Deposit B2B</p>
                <p className="text-blue-400 font-black text-lg font-mono">{formatRupiah(stats.b2bBalance)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ALERTS BENTO */}
        <div className="md:col-span-12 lg:col-span-6 grid grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassPanel} rounded-[2rem] p-6 flex flex-col justify-between border-emerald-100/50 bg-gradient-to-b from-white to-emerald-50/30`}>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200 shadow-sm mb-4">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-emerald-600 font-mono tracking-tight">{stats.pendingTopups}</h3>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Antrean Validasi Top-Up</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassPanel} rounded-[2rem] p-6 flex flex-col justify-between border-red-100/50 bg-gradient-to-b from-white to-red-50/30`}>
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center border border-red-200 shadow-sm mb-4">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-red-600 font-mono tracking-tight">{stats.pendingWithdrawals}</h3>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Antrean Pencairan (WD)</p>
            </div>
          </motion.div>
        </div>

      </div>

      <div className="pt-4 border-t border-slate-200/60">
        <h3 className="text-lg font-black text-slate-900 mb-6 tracking-tight flex items-center gap-2">
          Pilih Modul Kas
        </h3>
      </div>

      {/* 3. NAVIGATION CARDS (THE 4 SUB-PAGES) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Dompet Mitra */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => router.push("/admin/wallet/drivers")}
          className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.1)] hover:border-emerald-200 transition-all duration-300 rounded-[2rem] p-6 cursor-pointer group flex flex-col justify-between min-h-[220px]"
        >
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                <UserCircle className="w-7 h-7" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors transform group-hover:translate-x-1" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Buku Kas Mitra (Sopir/Vendor)</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">Kelola saldo pengendapan dari hasil pengiriman, serta pemotongan komisi untuk armada.</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Akun Aktif</span>
            <span className="font-black text-slate-900">{stats.driverCount} Kemitraan</span>
          </div>
        </motion.div>

        {/* Card 2: Deposit B2B */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => router.push("/admin/wallet/clients")}
          className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.1)] hover:border-blue-200 transition-all duration-300 rounded-[2rem] p-6 cursor-pointer group flex flex-col justify-between min-h-[220px]"
        >
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors transform group-hover:translate-x-1" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Buku Deposit B2B (Korporat)</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">Pantau dana prabayar (Pre-Paid) milik Klien Perusahaan yang digunakan untuk pemotongan invoice otomatis.</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Akun Aktif</span>
            <span className="font-black text-slate-900">{stats.b2bCount} Perusahaan</span>
          </div>
        </motion.div>

        {/* Card 3: Validasi Top-Up */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => router.push("/admin/wallet/topups")}
          className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.1)] hover:border-emerald-200 transition-all duration-300 rounded-[2rem] p-6 cursor-pointer group flex flex-col justify-between min-h-[220px] relative overflow-hidden"
        >
          {stats.pendingTopups > 0 && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500 rounded-bl-[100px] flex items-start justify-end p-5">
               <span className="relative flex h-4 w-4 mr-1 mt-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-white text-emerald-600 items-center justify-center text-[9px] font-black">{stats.pendingTopups}</span>
              </span>
            </div>
          )}
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                <ArrowUpCircle className="w-7 h-7" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Validasi Top-Up Saldo</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">Verifikasi bukti transfer dari Klien atau Mitra, lalu setujui untuk menambah saldo dompet mereka.</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aksi & Eksekusi</span>
             <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 group-hover:underline">Buka Modul <ArrowRight className="w-3 h-3"/></span>
          </div>
        </motion.div>

        {/* Card 4: Pencairan Dana (Withdraw) */}
        <motion.div 
          whileHover={{ y: -5 }}
          onClick={() => router.push("/admin/wallet/withdrawals")}
          className="bg-white/80 backdrop-blur-xl border border-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_rgba(220,38,38,0.1)] hover:border-red-200 transition-all duration-300 rounded-[2rem] p-6 cursor-pointer group flex flex-col justify-between min-h-[220px] relative overflow-hidden"
        >
          {stats.pendingWithdrawals > 0 && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500 rounded-bl-[100px] flex items-start justify-end p-5">
               <span className="relative flex h-4 w-4 mr-1 mt-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-white text-red-600 items-center justify-center text-[9px] font-black">{stats.pendingWithdrawals}</span>
              </span>
            </div>
          )}
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 group-hover:scale-110 transition-transform">
                <ArrowDownCircle className="w-7 h-7" />
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Pencairan Dana (Withdrawal)</h3>
            <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">Tinjau antrean penarikan dana dari Sopir atau Vendor, transfer ke rekening mereka, dan setujui pemotongan saldo.</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aksi & Eksekusi</span>
             <span className="text-xs font-bold text-red-600 flex items-center gap-1 group-hover:underline">Buka Modul <ArrowRight className="w-3 h-3"/></span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}