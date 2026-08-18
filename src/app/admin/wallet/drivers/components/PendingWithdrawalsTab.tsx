"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownCircle, Check, X, Search, Zap, RefreshCw, Building2, Smartphone, CheckCircle2, Activity, CalendarDays, Clock, Banknote, AlertTriangle } from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, serverTimestamp, query, where, updateDoc, addDoc, increment } from "firebase/firestore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { cn } from "@/lib/utils";

import { DriverData } from "@/types/admin";
import { WithdrawalRequest } from "@/types/finance";
import { FirebaseTimestamp } from "@/types/order";

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

const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(220,38,38,0.15)] transition-all duration-300 rounded-2xl";

interface PendingWithdrawalsTabProps {
  currentUser: { uid?: string; role?: string; [key: string]: unknown } | null;
  showToast: (type: "success" | "error", msg: string) => void;
}

export default function PendingWithdrawalsTab({ currentUser, showToast }: PendingWithdrawalsTabProps) {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // 🚀 CUSTOM MODAL STATE
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    type: "approve" | "reject" | "dana";
    onConfirm: () => void;
  }>({
    isOpen: false, title: "", message: "", type: "approve", onConfirm: () => {}
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const driverSnap = await getDocs(collection(db, "driver_wallets"));
      const allWallets: DriverData[] = driverSnap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as unknown as DriverData));

      const withdrawQ = query(collection(db, "withdrawal_requests"), where("status", "in", ["Pending", "Processing"]));
      const withdrawSnap = await getDocs(withdrawQ);
      
      const withdrawList: WithdrawalRequest[] = withdrawSnap.docs.map(d => {
        const data = d.data() as Record<string, unknown>;
        const driverInfo = allWallets.find(driver => driver.id === data.driverId);
        return {
          id: d.id, ...data,
          driverName: driverInfo?.name || "Sopir Tidak Diketahui",
          driverPhone: driverInfo?.phone || "-",
          partnerType: driverInfo?.partnerType || "Individual",
          // PROTEKSI NILAI KOSONG AGAR TIDAK ERROR DI UI
          method: data.method || "Manual_Bank",
          bankName: data.bankName || "Tidak Ada Data Bank",
          accountNumber: data.accountNumber || "Tidak Ada Nomor",
          accountName: data.accountName || "Tidak Ada Nama"
        } as unknown as WithdrawalRequest;
      });

      withdrawList.sort((a, b) => getMillis(a.timestamp) - getMillis(b.timestamp));
      setWithdrawals(withdrawList);
    } catch (error) { 
      console.error("Gagal menarik data:", error); 
    } finally { 
      setIsLoading(false); 
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckStatus = async (req: WithdrawalRequest) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/dana/check-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: req.id, driverId: req.driverId, amount: req.amount })
      });
      const result = await response.json();
      if (response.ok && result.success) { showToast("success", result.message); fetchData(); } 
      else { showToast("error", `Gagal cek status: ${result.message}`); }
    } catch { 
      showToast("error", "Terjadi kesalahan jaringan."); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  // ==================================================================================
  // 🚀 FUNGSI EKSEKUTOR (ANTI-UNDEFINED & ANTI-CRASH)
  // ==================================================================================
  const executeReject = async (req: WithdrawalRequest) => {
    setIsProcessing(true);
    try {
      if (!req.driverId) throw new Error("ID Pengemudi tidak valid.");

      const reqRef = doc(db, "withdrawal_requests", req.id);
      const walletRef = doc(db, "driver_wallets", req.driverId);
      
      // 1. Kembalikan saldo secara aman (Number)
      await updateDoc(walletRef, { balance: increment(Number(req.amount)) });
      
      // 2. Update status ke Ditolak (Aman dari undefined)
      await updateDoc(reqRef, { 
        status: "Ditolak", 
        reviewedAt: serverTimestamp(), 
        reviewedBy: currentUser?.uid || "Admin" 
      });
      
      // 3. Catat di log untuk riwayat sopir
      await addDoc(collection(db, "wallet_logs"), {
        userId: req.driverId, 
        amount: Number(req.amount), 
        type: "refund",
        description: `Pengembalian dana penarikan (Ditolak Admin)`, 
        createdAt: serverTimestamp(),
        recordedBy: currentUser?.uid || "Admin"
      });
      
      showToast("success", "Pengajuan ditolak, dana dikembalikan.");
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      setWithdrawals(prev => prev.filter(w => w.id !== req.id));
    } catch (error) { 
      console.error(error); 
      showToast("error", "Gagal menolak pengajuan."); 
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } finally { 
      setIsProcessing(false); 
    }
  };

  const executeManualApprove = async (req: WithdrawalRequest) => {
    setIsProcessing(true);
    try {
      if (!req.driverId) throw new Error("ID Pengemudi tidak valid.");

      const reqRef = doc(db, "withdrawal_requests", req.id);
      
      // 1. Setujui request (Aman dari undefined)
      await updateDoc(reqRef, { 
        status: "Disetujui", 
        reviewedAt: serverTimestamp(), 
        reviewedBy: currentUser?.uid || "Admin" 
      });
      
      // 2. Masukkan ke riwayat pembukuan kas
      await addDoc(collection(db, "wallet_logs"), {
        userId: req.driverId, 
        amount: Number(req.amount), 
        type: "deduction",
        description: `Pencairan Dana Berhasil (Manual Bank)`, 
        createdAt: serverTimestamp(), 
        recordedBy: currentUser?.uid || "Admin"
      });
      
      showToast("success", "Pencairan Manual disetujui!");
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      setWithdrawals(prev => prev.filter(w => w.id !== req.id));
    } catch (error) { 
      console.error(error); 
      showToast("error", "Gagal menyetujui pengajuan manual."); 
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } finally { 
      setIsProcessing(false); 
    }
  };

  const executeDanaAPI = async (req: WithdrawalRequest, customerName: string) => {
    setIsProcessing(true);
    try {
      const balanceRes = await fetch('/api/dana/check-balance');
      const balanceData = await balanceRes.json();
      if (balanceData.balance < req.amount) { 
        showToast("error", `Saldo DANA Merchant (Rp ${formatRupiah(balanceData.balance)}) tidak cukup!`); 
        setIsProcessing(false); 
        return; 
      }

      const response = await fetch('/api/dana/topup', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ withdrawalId: req.id, driverId: req.driverId, amount: req.amount, driverPhone: req.accountNumber || req.driverPhone }) 
      });
      const result = await response.json();
      
      if (response.ok) {
        if (result.message.includes("Pending")) { 
          showToast("success", "Status DANA: Pending."); 
          fetchData(); 
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } else { 
          showToast("success", `Sukses cair ke DANA (${customerName})!`);
          
          await updateDoc(doc(db, "withdrawal_requests", req.id), { 
            status: "Disetujui", 
            reviewedAt: serverTimestamp(), 
            reviewedBy: currentUser?.uid || "Admin" 
          });
          
          await addDoc(collection(db, "wallet_logs"), {
            userId: req.driverId, 
            amount: Number(req.amount), 
            type: "deduction",
            description: `Pencairan Dana Berhasil (DANA API Otomatis)`, 
            createdAt: serverTimestamp(), 
            recordedBy: "System_API"
          });
          
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          setWithdrawals(prev => prev.filter(w => w.id !== req.id)); 
        }
      } else { 
        showToast("error", `Gagal API: ${result.message}`); 
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    } catch (error) { 
      console.error(error); 
      showToast("error", "Error Jaringan saat TopUp DANA."); 
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    } finally { 
      setIsProcessing(false); 
    }
  };

  // ==================================================================================
  // TRIGGER MODAL KONFIRMASI PINTAR
  // ==================================================================================
  const handleReviewWithdrawal = async (req: WithdrawalRequest, action: "Disetujui" | "Ditolak") => {
    if (action === "Ditolak") {
      setConfirmModal({
        isOpen: true, type: "reject",
        title: "Tolak Pengajuan?",
        message: `Anda akan menolak pengajuan pencairan Rp ${formatRupiah(req.amount)} milik ${req.driverName}. Dana akan dikembalikan utuh ke Dompet Mitra. Lanjutkan?`,
        onConfirm: () => executeReject(req)
      });
      return;
    }

    if (req.method === "Manual_Bank") {
      setConfirmModal({
        isOpen: true, type: "approve",
        title: "Tandai Selesai (Manual)",
        message: (
          <div className="space-y-3">
            <p>Pastikan Anda <b>TELAH MENTRANSFER</b> sejumlah <b>Rp {formatRupiah(req.amount)}</b> ke rekening berikut:</p>
            <div className="bg-slate-50 p-3 rounded-lg border text-left">
              <p className="text-[10px] font-bold text-slate-500 uppercase">{req.bankName}</p>
              <p className="font-mono font-black text-slate-800 text-lg">{req.accountNumber}</p>
              <p className="text-xs font-bold text-slate-600">A.n {req.accountName}</p>
            </div>
            <p className="text-xs text-red-500 font-bold mt-2 flex gap-1"><AlertTriangle className="w-4 h-4"/> Tindakan ini tidak bisa dibatalkan.</p>
          </div>
        ),
        onConfirm: () => executeManualApprove(req)
      });
    } else {
      setIsProcessing(true);
      try {
        const inquiryRes = await fetch('/api/dana/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partnerReferenceNo: req.id, customerNumber: req.accountNumber || req.driverPhone, amount: req.amount }) });
        const inquiryData = await inquiryRes.json();
        if (!inquiryRes.ok || !inquiryData.success) { showToast("error", `Validasi DANA Gagal: ${inquiryData.message}`); setIsProcessing(false); return; }

        setConfirmModal({
          isOpen: true, type: "dana",
          title: "Konfirmasi DANA API",
          message: (
            <div className="space-y-3 text-left">
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0"/>
                <div>
                  <p className="text-[10px] font-bold text-blue-500 uppercase">Akun Ditemukan</p>
                  <p className="font-black text-slate-800 text-sm mt-0.5">{inquiryData.customerName}</p>
                  <p className="font-mono text-slate-600 text-xs">{req.accountNumber || req.driverPhone}</p>
                </div>
              </div>
              <p className="text-sm mt-2 text-center">Transfer otomatis sejumlah <b>Rp {formatRupiah(req.amount)}</b> sekarang?</p>
            </div>
          ),
          onConfirm: () => executeDanaAPI(req, inquiryData.customerName)
        });
      } catch (error) { 
        showToast("error", "Error Jaringan saat Inquiry DANA."); 
        console.error(error); 
      } finally { 
        setIsProcessing(false); 
      }
    }
  };

  const processedData = withdrawals.filter(item => 
    (item.driverName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.accountNumber || item.driverPhone || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start relative z-10">
        <div className="xl:col-span-4 space-y-6 lg:sticky lg:top-24">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.15)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2 relative z-10 flex items-center gap-2">
              <Banknote className="w-4 h-4" /> Antrean Pending
            </p>
            <h2 className="text-5xl font-black tracking-tight text-white font-mono mt-2 drop-shadow-md relative z-10">
              {withdrawals.length} <span className="text-lg font-sans text-slate-400 font-bold uppercase tracking-widest mt-3">Sopir</span>
            </h2>
          </div>
          <div className={`${glassPanel} rounded-[2rem] p-6 border border-slate-200 shadow-sm flex flex-col gap-4`}>
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <input type="text" placeholder="Cari nama pemohon..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white" />
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 shadow-inner">
              <Zap className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-800 font-medium leading-relaxed"><b>DANA API:</b> Otomatis instan. <br/><b>Bank Manual:</b> Admin transfer sendiri lalu setujui di sini.</p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="min-h-[500px] flex flex-col gap-4">
            {isLoading ? (
              <div className="p-20 text-center"><Activity className="w-8 h-8 mx-auto text-blue-500 animate-spin" /></div>
            ) : processedData.length === 0 ? (
              <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
                <CheckCircle2 className="w-16 h-16 mb-4 opacity-30 text-blue-600" />
                <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Semua Bersih!</h4>
                <p className="font-medium text-slate-500 text-center">Tidak ada antrean pencairan dana dari mitra saat ini.</p>
              </div>
            ) : (
              <AnimatePresence>
                {processedData.map((req, idx) => {
                  const ts = getMillis(req.timestamp) ? new Date(getMillis(req.timestamp)) : new Date();
                  const isManual = req.method === "Manual_Bank";

                  return (
                    <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }} className={`${glassRow} p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group border border-white relative overflow-hidden`}>
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", isManual ? "bg-slate-400" : "bg-blue-500")}></div>

                      <div className="flex items-start gap-4 w-full lg:w-[45%] pl-2">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm", isManual ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-blue-50 text-blue-600 border-blue-100")}>
                          {isManual ? <Building2 className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                        </div>
                        <div className="overflow-hidden">
                          <h2 className="text-sm font-black text-slate-900 truncate tracking-tight">{req.driverName}</h2>
                          {isManual ? (
                            <div className="mt-1 bg-slate-50 border border-slate-100 px-2 py-1.5 rounded-md w-fit">
                              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{req.bankName}</p>
                              <p className="text-xs font-mono font-bold text-slate-800">{req.accountNumber}</p>
                              <p className="text-[9px] text-slate-500 font-bold uppercase truncate max-w-[150px]">A.N: {req.accountName}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 font-bold font-mono mt-0.5"><span className="text-blue-500 font-black">DANA:</span> {req.accountNumber || req.driverPhone}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap mt-1.5">
                            <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><CalendarDays className="w-3 h-3"/> {ts.toLocaleDateString("id-ID")} <Clock className="w-3 h-3 ml-1"/> {ts.toLocaleTimeString("id-ID", {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full lg:w-[55%] flex flex-col items-start lg:items-end gap-3 border-t border-slate-100 pt-4 lg:pt-0 lg:border-t-0">
                        <div className="text-left lg:text-right w-full flex lg:flex-col justify-between items-center lg:items-end">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nominal Penarikan</p>
                          <p className="text-2xl font-black tracking-tight font-mono text-slate-800 flex items-center gap-2">
                            <ArrowDownCircle className="w-5 h-5 text-blue-500"/> {formatRupiah(req.amount)}
                          </p>
                        </div>
                        
                        <div className="flex w-full justify-end gap-2 mt-2">
                          {req.status === "Processing" ? (
                            <AdminButton variant="outline" onClick={() => handleCheckStatus(req)} disabled={isProcessing} className="h-10 border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl">
                              {isProcessing ? <><Activity className="w-4 h-4 mr-1.5 animate-spin" /> Sinkron...</> : <><RefreshCw className="w-4 h-4 mr-1.5" /> Sinkron DANA</>}
                            </AdminButton>
                          ) : (
                            <>
                              <AdminButton size="icon" variant="outline" onClick={() => handleReviewWithdrawal(req, "Ditolak")} disabled={isProcessing} className="h-10 w-10 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl" title="Tolak (Refund)">
                                <X className="w-5 h-5" />
                              </AdminButton>
                              <AdminButton variant="primary" onClick={() => handleReviewWithdrawal(req, "Disetujui")} disabled={isProcessing} className={cn("h-10 text-white font-bold flex-1 lg:flex-none px-6 shadow-md disabled:opacity-50", isManual ? "bg-slate-700 hover:bg-slate-800 border-slate-800" : "bg-blue-600 hover:bg-blue-700 border-blue-700")}>
                                {isProcessing ? <><Activity className="w-4 h-4 mr-1.5 animate-spin" /> Memproses...</> : <><Check className="w-4 h-4 mr-1.5" /> {isManual ? "Tandai Disetujui" : "Transfer DANA API"}</>}
                              </AdminButton>
                            </>
                          )}
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

      {/* 🚀 CUSTOM CONFIRMATION MODAL */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isProcessing && setConfirmModal(prev => ({ ...prev, isOpen: false }))}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 overflow-hidden text-center p-8">
              
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center border shadow-inner bg-slate-50 border-slate-100">
                {confirmModal.type === 'reject' ? <X className="w-8 h-8 text-red-500" /> : confirmModal.type === 'dana' ? <Smartphone className="w-8 h-8 text-blue-500" /> : <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
              </div>
              
              <h2 className="text-xl font-black text-slate-900 mb-2">{confirmModal.title}</h2>
              <div className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                {confirmModal.message}
              </div>

              <div className="flex gap-3 w-full">
                <AdminButton variant="outline" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} disabled={isProcessing} className="flex-1 h-12 rounded-xl bg-slate-50 text-slate-600 border-slate-200">Batal</AdminButton>
                <AdminButton 
                  variant="primary" 
                  onClick={confirmModal.onConfirm} 
                  disabled={isProcessing} 
                  className={cn("flex-1 h-12 rounded-xl text-white shadow-md transition-all border-none", confirmModal.type === 'reject' ? "bg-red-600 hover:bg-red-700 shadow-red-600/30" : confirmModal.type === 'dana' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/30" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30")}
                >
                  {isProcessing ? <Activity className="w-5 h-5 animate-spin mx-auto"/> : "Ya, Lanjutkan"}
                </AdminButton>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
} 