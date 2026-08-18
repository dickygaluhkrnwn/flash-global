"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, Wallet, Search, Filter, ArrowUpDown, 
  Activity, ShieldAlert, ArrowLeft, ArrowRight,
  AlertCircle, CalendarClock, Building2
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// KODE DIBERSIHKAN: Import murni dari order.ts
import { FirebaseTimestamp } from "@/types/order";

export interface DepositRequest {
  id: string;
  userId: string;
  clientName: string;
  amount: number;
  proofUrl: string;
  status: string; // "Menunggu Verifikasi" | "Disetujui" | "Ditolak"
  createdAt: FirebaseTimestamp;
  reviewedAt?: FirebaseTimestamp;
  reviewedBy?: string;
}

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getAdminUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
    return path.replace(/^\/admin/, '') || '/';
  }
  return path; 
};

// =========================================================================
// UTILS LOKAL (Type-Safe Timestamp Extractor)
// =========================================================================
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

const getMillis = (timestamp: FirebaseTimestamp | Date | string | number | null | undefined) => {
  if (!timestamp) return 0;
  if (timestamp instanceof Date) return timestamp.getTime();
  if (typeof timestamp === 'object' && timestamp !== null) {
    const ts = timestamp as Extract<FirebaseTimestamp, object>;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  }
  return new Date(timestamp as string | number).getTime();
};

const formatDate = (timestamp: FirebaseTimestamp) => {
  const millis = getMillis(timestamp);
  if (!millis) return "-";
  return new Date(millis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(59,130,246,0.1)] transition-all duration-300 rounded-[1.5rem]";

export default function VerifyDepositPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Menunggu Verifikasi"); 
  const [sortOrder, setSortOrder] = useState("newest");
  
  useEffect(() => {
    const qDeposits = query(collection(db, "deposit_requests"), orderBy("createdAt", "desc"));
    const unsubDeposits = onSnapshot(qDeposits, 
      (snapshot) => {
        setDeposits(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DepositRequest)));
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching deposits:", error);
        setIsLoading(false);
      }
    );
    return () => unsubDeposits();
  }, []);

  const processedDeposits = useMemo(() => {
    let result = [...deposits];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.clientName.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
    }
    
    if (filterStatus !== "All") result = result.filter(d => d.status === filterStatus);
    
    result.sort((a, b) => {
      const tA = getMillis(a.createdAt);
      const tB = getMillis(b.createdAt);
      const cA = a.amount;
      const cB = b.amount;
      if (sortOrder === "newest") return tB - tA;
      if (sortOrder === "oldest") return tA - tB;
      if (sortOrder === "highest_value") return cB - cA;
      return 0;
    });
    return result;
  }, [deposits, searchQuery, filterStatus, sortOrder]);

  const pendingCount = deposits.filter(d => d.status === "Menunggu Verifikasi").length;

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans h-screen">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Validasi Keuangan ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8 border-slate-300">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto px-4 sm:px-0">
      
      {/* 🚀 HERO SECTION (GABUNGAN HEADER & STATS BENTO) */}
      <div className="bg-gradient-to-br from-blue-900 via-slate-800 to-slate-950 p-8 sm:p-10 rounded-[2.5rem] border border-blue-600/30 shadow-[0_30px_60px_rgba(30,58,138,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] text-white relative overflow-hidden mt-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        
        {/* Header Title */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6 mb-10 border-b border-blue-600/30 pb-8">
          <div className="flex items-center gap-5">
            <button onClick={() => router.push(getAdminUrl("/admin/finance/verification"))} className="w-12 h-12 rounded-[1.25rem] bg-white/10 backdrop-blur-md border border-white/20 shadow-sm flex items-center justify-center text-blue-100 hover:text-white hover:bg-white/20 transition-all active:scale-90">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-3xl sm:text-4xl font-black text-white flex items-center gap-3 tracking-tight drop-shadow-md">
                <Wallet className="w-8 h-8 text-blue-400 hidden sm:block" />
                Verifikasi Deposit
              </h1>
              <p className="text-blue-400 text-xs sm:text-sm mt-1.5 uppercase tracking-widest font-bold">
                Client Corporate (B2B)
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid inside Hero */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8">
          {/* Main Stat: Menunggu Verifikasi */}
          <div className="md:col-span-4 border-r-0 md:border-r border-blue-600/30 pr-0 md:pr-8 flex flex-col justify-center">
            <span className="text-blue-300 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
              <AlertCircle className="w-3.5 h-3.5" /> Antrean Validasi Top-Up
            </span>
            <p className="text-4xl sm:text-6xl font-black text-white tracking-tighter font-mono drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              {pendingCount} <span className="text-sm font-sans font-bold opacity-70 uppercase tracking-widest ml-1">Tiket</span>
            </p>
          </div>

          {/* SOP Banner */}
          <div className="md:col-span-8 flex flex-col justify-center">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400"/> SOP Verifikasi Deposit B2B</h3>
            <p className="text-sm text-blue-100 font-medium leading-relaxed max-w-3xl">
              Setoran yang disetujui (Approve) akan otomatis menambahkan saldo ke dompet <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded border border-white/20">Prabayar (Deposit)</span> entitas Corporate B2B terkait tanpa batasan minimum.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* TOOLBAR FILTER & SEARCH */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari ID Top-Up atau Entitas..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
            <div className="relative w-full sm:w-auto">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full sm:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-3 text-sm outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[220px]">
                <option value="All">Semua Status Deposit</option>
                <option value="Menunggu Verifikasi">Menunggu Cek Bank (Pending)</option>
                <option value="Disetujui">Saldo Masuk (Approved)</option>
                <option value="Ditolak">Setoran Ditolak (Rejected)</option>
              </select>
            </div>
            <div className="relative w-full sm:w-auto">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full sm:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-3 text-sm outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
                <option value="newest">Pengajuan Terbaru</option>
                <option value="oldest">Pengajuan Terlama</option>
                <option value="highest_value">Nominal Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* DAFTAR DEPOSIT (LIST / ROW LAYOUT) */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-blue-600 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Membaca Jurnal Keuangan...</p>
            </div>
          ) : processedDeposits.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <CheckCircle2 className="w-16 h-16 mb-4 opacity-20 text-blue-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Semua Setoran Beres!</h4>
              <p className="font-medium text-slate-500">Tidak ada pengajuan deposit yang membutuhkan verifikasi.</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Header Kolom (Desktop Only) */}
              <div className="hidden lg:grid grid-cols-12 gap-6 px-8 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <div className="col-span-4">ID Transaksi & Info Entitas B2B</div>
                <div className="col-span-3">Status Setoran</div>
                <div className="col-span-5 text-right">Nominal Top-Up</div>
              </div>

              <AnimatePresence>
                {processedDeposits.map((d, idx) => {
                  const isApproved = d.status === "Disetujui";
                  const isRejected = d.status === "Ditolak";
                  const isPending = d.status === "Menunggu Verifikasi";

                  return (
                    <motion.div 
                      key={d.id} 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      transition={{ delay: idx * 0.02 }} 
                      // 🚀 REDIRECT KE HALAMAN DETAIL BARU
                      onClick={() => router.push(getAdminUrl(`/admin/finance/verification/deposit/${d.id}`))}
                      className={`${glassRow} p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center cursor-pointer group`}
                    >
                      
                      {/* KOLOM 1: Info Klien & ID */}
                      <div className="lg:col-span-4 flex items-center gap-4">
                        <div className={cn("w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 shadow-sm border", isApproved ? "bg-emerald-50 text-emerald-600 border-emerald-200" : isRejected ? "bg-red-50 text-red-600 border-red-200" : "bg-amber-50 text-amber-600 border-amber-200")}>
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="overflow-hidden space-y-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AdminBadge variant="brand" className="text-[9px] px-2 py-0.5 shadow-sm bg-blue-100 text-blue-700 border-blue-200">#{d.id.substring(0,8)}</AdminBadge>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><CalendarClock className="w-3 h-3"/> {formatDate(d.createdAt)}</span>
                          </div>
                          <h2 className="text-sm font-black text-slate-900 truncate" title={d.clientName}>{d.clientName}</h2>
                        </div>
                      </div>

                      {/* KOLOM 2: Status */}
                      <div className="lg:col-span-3 flex flex-col items-start lg:items-center gap-2 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0 pl-0 lg:pl-4">
                        <AdminBadge variant={isApproved ? "success" : isRejected ? "danger" : "warning"} className="text-[10px] px-4 py-1.5 shadow-sm">
                          {isPending ? "Pending Review" : d.status}
                        </AdminBadge>
                      </div>

                      {/* KOLOM 3: Nominal & Action */}
                      <div className="lg:col-span-5 flex items-center justify-between lg:justify-end gap-5">
                        <div className="text-left lg:text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Setoran Mutasi</p>
                          <p className="text-xl sm:text-2xl font-black tracking-tight font-mono text-blue-600">
                            +{formatRupiah(d.amount)}
                          </p>
                        </div>
                        <div className="h-10 w-10 shrink-0 bg-white border border-slate-200 text-slate-400 group-hover:text-blue-600 group-hover:border-blue-300 group-hover:bg-blue-50 rounded-xl flex items-center justify-center transition-all shadow-sm">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}