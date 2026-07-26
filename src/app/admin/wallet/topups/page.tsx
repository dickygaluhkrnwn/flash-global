"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, Search, ArrowUpCircle, 
  CheckCircle2, AlertCircle, ShieldAlert, 
  Activity, Eye, Check, X, Clock, Building2, CalendarDays,
  UserCircle
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, serverTimestamp, increment, query, where, writeBatch } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { DriverData } from "@/types/admin";

interface TopupRequest {
  id: string;
  userId: string;
  clientName: string;
  amount: number;
  proofUrl: string;
  status: "Pending" | "Disetujui" | "Ditolak";
  createdAt: unknown; 
  userType?: "Driver" | "B2B";
}

// 🚀 FUNGSI HELPER PENJINAK UNKNOWN TIMESTAMP (TANPA ANY)
function parseUnknownDate(val: unknown): Date {
  if (!val) return new Date();
  
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    const obj = val as { toDate?: unknown };
    if (typeof obj.toDate === 'function') {
      return (val as { toDate: () => Date }).toDate();
    }
  }
  
  if (val instanceof Date) return val;
  if (typeof val === 'number' || typeof val === 'string') return new Date(val as string | number);
  
  return new Date();
}

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Teal Accent untuk Top-Up)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(16,185,129,0.15)] transition-all duration-300 rounded-2xl";

export default function AdminWalletTopupsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [topups, setTopups] = useState<TopupRequest[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Perlu ambil data wallets untuk identifikasi apakah user ini Driver atau B2B
      const driverSnap = await getDocs(collection(db, "driver_wallets"));
      const allWallets = driverSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DriverData[];

      const topupQ = query(collection(db, "deposit_requests"), where("status", "==", "Pending"));
      const topupSnap = await getDocs(topupQ);
      
      const topupList = topupSnap.docs.map(d => {
        const data = d.data();
        const isDriver = allWallets.some(driver => driver.id === data.userId);
        return {
          id: d.id,
          ...data,
          userType: isDriver ? "Driver" : "B2B"
        } as TopupRequest;
      });

      // Sort by latest Date
      topupList.sort((a, b) => parseUnknownDate(b.createdAt).getTime() - parseUnknownDate(a.createdAt).getTime());
      
      setTopups(topupList);
    } catch (error) {
      console.error("Gagal menarik data topup:", error);
      showToast("error", "Gagal memuat antrean top-up dari database.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReviewTopup = async (req: TopupRequest, action: "Disetujui" | "Ditolak") => {
    if (!confirm(`Yakin ingin menandai Top-Up sejumlah Rp ${req.amount.toLocaleString('id-ID')} ini sebagai ${action}?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);

      const reqRef = doc(db, "deposit_requests", req.id);
      batch.update(reqRef, { 
        status: action, 
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.uid || "Admin"
      });

      if (action === "Disetujui") {
        const collectionName = req.userType === "Driver" ? "driver_wallets" : "users";
        const balanceField = req.userType === "Driver" ? "balance" : "depositBalance";
        const entityRef = doc(db, collectionName, req.userId);

        batch.update(entityRef, {
          [balanceField]: increment(req.amount),
          lastMutasi: serverTimestamp()
        });

        const logRef = doc(collection(db, "wallet_logs"));
        batch.set(logRef, {
          entityId: req.userId,
          entityName: req.clientName,
          entityType: req.userType,
          type: "topup",
          amount: req.amount,
          timestamp: serverTimestamp(),
          adminNote: `Verifikasi Top-Up Transfer Online`
        });
      }

      await batch.commit();

      showToast("success", `Pengajuan Top-Up berhasil ${action}!`);
      setTopups(prev => prev.filter(t => t.id !== req.id)); 
    } catch (error) {
      console.error("Gagal review topup:", error);
      showToast("error", "Terjadi kesalahan sistem saat menyetujui Top-Up.");
    } finally {
      setIsProcessing(false);
      setProofModalUrl(null); 
    }
  };

  const processedData = topups.filter(item => 
    (item.clientName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-teal-600 animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menghimpun Antrean Top-Up...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-sans max-w-7xl mx-auto">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 MODAL PREVIEW BUKTI TRANSFER (FULLSCREEN) */}
      <AnimatePresence>
        {proofModalUrl && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setProofModalUrl(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 max-w-3xl w-full flex flex-col items-center">
              <button onClick={() => setProofModalUrl(null)} className="absolute -top-14 right-0 bg-white/10 border border-white/20 text-white rounded-full p-2 hover:bg-white/30 transition-colors">
                <X className="w-6 h-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proofModalUrl} alt="Bukti Transfer Top Up" className="rounded-2xl max-h-[85vh] w-auto shadow-2xl border border-white/10 object-contain" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER NAV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin/wallet")} className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-teal-600 hover:bg-white transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Validasi Top-Up Saldo
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 font-medium flex items-center gap-2">
              Verifikasi bukti transfer dari Mitra & Klien. <AdminBadge variant="success" className="bg-teal-100 text-teal-700 border-teal-200">Pending Action</AdminBadge>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* KIRI: STATS & SEARCH (Sticky Column) */}
        <div className="xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
            <p className="text-teal-400 text-xs font-bold uppercase tracking-widest mb-2 relative z-10 flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4" /> Antrean Validasi Masuk
            </p>
            <h2 className="text-5xl font-black tracking-tight text-white font-mono mt-2 drop-shadow-md relative z-10 flex items-center gap-3">
              {topups.length} <span className="text-lg font-sans text-slate-400 font-bold uppercase tracking-widest mt-3">Tiket</span>
            </h2>
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center relative z-10">
              <p className="text-white/50 text-[11px] leading-relaxed">
                Pastikan nominal di bukti transfer cocok dengan pengajuan sebelum menekan tombol <b className="text-teal-400">Verifikasi & Tambah Saldo</b>.
              </p>
            </div>
          </div>

          <div className={`${glassPanel} rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col gap-4`}>
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <input 
                type="text" 
                placeholder="Cari nama penyetor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-[3px] focus:ring-teal-500/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
              />
            </div>
          </div>
        </div>

        {/* KANAN: LIST PENGAJUAN (ROW LAYOUT) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="min-h-[500px] flex flex-col gap-4">
            {processedData.length === 0 ? (
              <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
                <CheckCircle2 className="w-16 h-16 mb-4 opacity-30 text-teal-600" />
                <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Semua Beres!</h4>
                <p className="font-medium text-slate-500 text-center">Tidak ada antrean top-up saldo dari Driver maupun Klien B2B saat ini.</p>
              </div>
            ) : (
              <AnimatePresence>
                {processedData.map((req, idx) => {
                  const ts = parseUnknownDate(req.createdAt);
                  const dateStr = ts.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
                  const timeStr = ts.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <motion.div 
                      key={req.id} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}
                      className={`${glassRow} p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group border border-white shadow-md`}
                    >
                      <div className="flex items-start gap-4 w-full lg:w-[40%]">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm", req.userType === 'B2B' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-emerald-50 text-emerald-600 border-emerald-200")}>
                          {req.userType === 'B2B' ? <Building2 className="w-6 h-6" /> : <UserCircle className="w-6 h-6" />}
                        </div>
                        <div className="overflow-hidden">
                          <h2 className="text-sm font-black text-slate-900 truncate tracking-tight mb-1">{req.clientName}</h2>
                          <div className="flex items-center gap-2 flex-wrap">
                            <AdminBadge variant={req.userType === 'B2B' ? 'info' : 'success'} className="text-[9px] tracking-widest">
                              {req.userType === 'B2B' ? 'Klien Korporat' : 'Dompet Mitra'}
                            </AdminBadge>
                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><CalendarDays className="w-3 h-3"/> {dateStr} <Clock className="w-3 h-3 ml-1"/> {timeStr}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full lg:w-[25%] flex flex-col items-start lg:items-center gap-2 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0 lg:border-l lg:pl-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Bukti Transfer</p>
                        {req.proofUrl ? (
                          <button 
                            onClick={() => setProofModalUrl(req.proofUrl)}
                            className="flex items-center gap-1.5 text-xs font-bold text-teal-600 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-600 hover:text-white transition-colors w-full justify-center"
                          >
                            <Eye className="w-4 h-4" /> Lihat Resi
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg w-full text-center">Tanpa Lampiran</span>
                        )}
                      </div>

                      <div className="w-full lg:w-[35%] flex flex-col items-start lg:items-end gap-3 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0">
                        <div className="text-left lg:text-right w-full">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nominal Pengajuan</p>
                          <p className="text-xl font-black tracking-tight font-mono text-teal-600">
                            +{formatRupiah(req.amount)}
                          </p>
                        </div>
                        
                        <div className="flex w-full justify-end gap-2 mt-1">
                          <AdminButton 
                            size="icon" variant="outline" 
                            onClick={() => handleReviewTopup(req, "Ditolak")}
                            disabled={isProcessing}
                            className="h-10 w-10 shrink-0 text-red-400 hover:text-red-600 border-red-200 hover:bg-red-50 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                            title="Tolak Pengajuan"
                          >
                            <X className="w-5 h-5" />
                          </AdminButton>
                          <AdminButton 
                            variant="primary" 
                            onClick={() => handleReviewTopup(req, "Disetujui")}
                            disabled={isProcessing}
                            className="h-10 bg-teal-600 hover:bg-teal-700 border-teal-700 shadow-teal-600/30 text-white font-bold flex-1 lg:flex-none px-4 shadow-md transition-all disabled:opacity-50"
                          >
                            <Check className="w-4 h-4 mr-1.5" /> Verifikasi & Setujui
                          </AdminButton>
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}