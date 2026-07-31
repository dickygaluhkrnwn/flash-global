"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, ArrowDownCircle, 
  UserCircle, CheckCircle2, AlertCircle, ShieldAlert, 
  Activity, Check, X, Clock, CalendarDays, Banknote,
  Search
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, serverTimestamp, increment, query, where, writeBatch } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// --- IMPORT GLOBAL TYPES ---
import { DriverData } from "@/types/admin";
import { WithdrawalRequest } from "@/types/finance"; // <-- KODE DIBERSIHKAN: Import dari SSOT
import { FirebaseTimestamp } from "@/types/order";

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

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Red Accent untuk Withdrawal)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(220,38,38,0.15)] transition-all duration-300 rounded-2xl";

export default function AdminWalletWithdrawalsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");

  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Tarik Data Wallets untuk Mapping Identitas
      const driverSnap = await getDocs(collection(db, "driver_wallets"));
      // KODE DIBERSIHKAN: Safe Extraction untuk array Driver
      const allWallets: DriverData[] = driverSnap.docs.map(d => {
        return { id: d.id, ...(d.data() as Record<string, unknown>) } as unknown as DriverData;
      });

      // 2. Tarik Antrean Withdrawal
      const withdrawQ = query(collection(db, "withdrawal_requests"), where("status", "==", "Pending"));
      const withdrawSnap = await getDocs(withdrawQ);
      
      const withdrawList: WithdrawalRequest[] = withdrawSnap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        const driverInfo = allWallets.find(driver => driver.id === data.driverId);
        return {
          id: d.id,
          ...data,
          driverName: driverInfo?.name || "Sopir Tidak Diketahui",
          driverPhone: driverInfo?.phone || "-",
          partnerType: driverInfo?.partnerType || "Individual"
        } as unknown as WithdrawalRequest;
      });

      // KODE DIBERSIHKAN: Sortir dari yang terlama ke terbaru menggunakan getMillis
      withdrawList.sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));
      
      setWithdrawals(withdrawList);
    } catch (error) {
      console.error("Gagal menarik data pencairan:", error);
      showToast("error", "Gagal memuat antrean pencairan dana dari database.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReviewWithdrawal = async (reqId: string, driverId: string, amount: number, action: "Disetujui" | "Ditolak") => {
    if (!confirm(`Yakin menandai pengajuan pencairan Rp ${amount.toLocaleString('id-ID')} ini sebagai ${action}? \n\nPastikan Anda sudah benar-benar men-transfer dana ke rekening tujuan jika Disetujui.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);

      const reqRef = doc(db, "withdrawal_requests", reqId);
      batch.update(reqRef, { 
        status: action, 
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.uid || "Admin"
      });

      // Jika disetujui, potong saldo wallet
      if (action === "Disetujui") {
        const walletRef = doc(db, "driver_wallets", driverId);
        
        // Verifikasi Ulang Saldo Terakhir agar tidak minus
        const wSnap = await getDocs(query(collection(db, "driver_wallets")));
        // KODE DIBERSIHKAN: Safe typing
        const currentDriverRaw = wSnap.docs.find(d => d.id === driverId)?.data() as Record<string, unknown> | undefined;
        const currentDriverBalance = currentDriverRaw ? Number(currentDriverRaw.balance) : 0;
        const currentDriverName = currentDriverRaw ? String(currentDriverRaw.name) : "Sopir";
        
        if (!currentDriverRaw || currentDriverBalance < amount) {
           showToast("error", "Otorisasi Gagal! Saldo dompet sopir tidak mencukupi untuk penarikan ini.");
           setIsProcessing(false);
           return;
        }

        batch.update(walletRef, {
          balance: increment(-Math.abs(amount)),
          lastMutasi: serverTimestamp()
        });

        const logRef = doc(collection(db, "wallet_logs"));
        batch.set(logRef, {
          entityId: driverId,
          entityName: currentDriverName,
          entityType: "Driver",
          type: "withdraw",
          amount: amount,
          timestamp: serverTimestamp(),
          adminNote: `Pencairan Dana (Disetujui) via Finance Hub`
        });
      }

      await batch.commit();

      showToast("success", `Pengajuan berhasil ${action}!`);
      setWithdrawals(prev => prev.filter(w => w.id !== reqId));

    } catch (error) {
      console.error("Gagal review withdrawal:", error);
      showToast("error", "Terjadi kesalahan sistem saat menyetujui pengajuan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processedData = withdrawals.filter(item => 
    (item.driverName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.driverPhone || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmountPending = withdrawals.reduce((sum, item) => sum + item.amount, 0);

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
        <Activity className="w-12 h-12 text-red-600 animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menghimpun Antrean Pencairan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-sans max-w-7xl mx-auto">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER NAV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin/wallet")} className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-white transition-all shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Pencairan Dana (Withdrawals)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 font-medium flex items-center gap-2">
              Eksekusi penarikan saldo mitra. <AdminBadge variant="danger" className="bg-red-100 text-red-700 border-red-200">Prioritas</AdminBadge>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* KIRI: STATS & SEARCH (Sticky Column) */}
        <div className="xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
            <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2 relative z-10 flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Antrean Transfer
            </p>
            <h2 className="text-5xl font-black tracking-tight text-white font-mono mt-2 drop-shadow-md relative z-10 flex items-center gap-3">
              {withdrawals.length} <span className="text-lg font-sans text-slate-400 font-bold uppercase tracking-widest mt-3">Sopir</span>
            </h2>
            <div className="mt-6 pt-6 border-t border-white/10 flex flex-col relative z-10 space-y-2">
              <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest">Estimasi Kebutuhan Dana Cair:</p>
              <p className="text-white font-black text-2xl font-mono">{formatRupiah(totalAmountPending)}</p>
            </div>
          </div>

          <div className={`${glassPanel} rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col gap-4`}>
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <input 
                type="text" 
                placeholder="Cari nama pemohon / nomor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-[3px] focus:ring-red-500/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium"
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 shadow-inner">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                Pastikan Anda melakukan transfer dana ke rekening pemohon <b>sebelum</b> menekan tombol <b className="text-amber-800">Verifikasi & Transfer</b> di sistem.
              </p>
            </div>
          </div>
        </div>

        {/* KANAN: LIST PENGAJUAN (ROW LAYOUT) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="min-h-[500px] flex flex-col gap-4">
            {processedData.length === 0 ? (
              <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
                <CheckCircle2 className="w-16 h-16 mb-4 opacity-30 text-red-600" />
                <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Tidak Ada Antrean!</h4>
                <p className="font-medium text-slate-500 text-center">Belum ada pengajuan pencairan dana dari mitra saat ini.</p>
              </div>
            ) : (
              <AnimatePresence>
                {processedData.map((req, idx) => {
                  const millis = getMillis(req.timestamp);
                  const ts = millis ? new Date(millis) : new Date();
                  const dateStr = ts.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
                  const timeStr = ts.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <motion.div 
                      key={req.id} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}
                      className={`${glassRow} p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group border border-white shadow-md`}
                    >
                      <div className="flex items-start gap-4 w-full lg:w-[45%]">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm bg-slate-100 text-slate-500 border-slate-200">
                          <UserCircle className="w-6 h-6" />
                        </div>
                        <div className="overflow-hidden">
                          <h2 className="text-sm font-black text-slate-900 truncate tracking-tight">{req.driverName}</h2>
                          <p className="text-xs text-slate-500 font-bold font-mono mt-0.5">{req.driverPhone}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-1.5">
                            <AdminBadge variant={req.partnerType === 'FleetDriver' ? 'warning' : 'info'} className="text-[9px] tracking-widest uppercase">
                              {req.partnerType === 'FleetDriver' ? 'Sopir Vendor' : req.partnerType === 'Vendor' ? 'Vendor Fleet' : 'Sopir Mandiri'}
                            </AdminBadge>
                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><CalendarDays className="w-3 h-3"/> {dateStr} <Clock className="w-3 h-3 ml-1"/> {timeStr}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full lg:w-[55%] flex flex-col items-start lg:items-end gap-3 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0">
                        <div className="text-left lg:text-right w-full flex lg:flex-col justify-between items-center lg:items-end">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nominal Penarikan</p>
                          <p className="text-2xl font-black tracking-tight font-mono text-red-600 flex items-center gap-2">
                            <ArrowDownCircle className="w-5 h-5 text-red-400"/> -{formatRupiah(req.amount)}
                          </p>
                        </div>
                        
                        <div className="flex w-full justify-end gap-2 mt-2">
                          <AdminButton 
                            size="icon" variant="outline" 
                            onClick={() => handleReviewWithdrawal(req.id, req.driverId, req.amount, "Ditolak")}
                            disabled={isProcessing}
                            className="h-10 w-10 shrink-0 text-slate-400 hover:text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                            title="Tolak Pengajuan"
                          >
                            <X className="w-5 h-5" />
                          </AdminButton>
                          <AdminButton 
                            variant="primary" 
                            onClick={() => handleReviewWithdrawal(req.id, req.driverId, req.amount, "Disetujui")}
                            disabled={isProcessing}
                            className="h-10 bg-slate-900 hover:bg-slate-800 border-slate-950 shadow-slate-900/30 text-white font-bold flex-1 lg:flex-none px-6 shadow-md transition-all disabled:opacity-50"
                          >
                            <Check className="w-4 h-4 mr-1.5 text-emerald-400" /> Transfer & Setuju
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