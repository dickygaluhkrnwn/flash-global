"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, Wallet, History, CheckCircle2, AlertCircle, Activity, PlusCircle, CreditCard, X, ArrowUpRight
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp, addDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { OrderDetail, FirebaseTimestamp } from "@/types/order";

// Import Custom Components
import PiutangTab from "./components/PiutangTab";
import DepositTab from "./components/DepositTab";
import LedgerTab from "./components/LedgerTab";

// --- EXPORT SHARED INTERFACES ---
export interface LedgerItem {
  id: string;
  type: string;
  amount: number;
  status: string;
  timestamp: number;
  dateStr: string;
  note: string;
}

export interface PaymentMethod {
  bankName: string;
  accountNumber: string;
  accountName: string;
  color: string;
}

export interface PaymentConfig {
  transferBank: PaymentMethod[];
  qrisImageUrl: string | null;
}

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

export default function CorporateFinancePortal() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  
  const topupFileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // 🚀 MODAL STATES
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showPiutangModal, setShowPiutangModal] = useState(false);

  // PIUTANG STATES
  const [b2bLimit, setB2bLimit] = useState(0);
  const [unpaidOrders, setUnpaidOrders] = useState<OrderDetail[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // DEPOSIT STATES
  const [depositBalance, setDepositBalance] = useState(0);
  const [topupAmount, setTopupAmount] = useState<number | "">("");
  const [topupFile, setTopupFile] = useState<File | null>(null);
  const [topupPreview, setTopupPreview] = useState<string | null>(null);
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);

  // LEDGER STATES
  const [ledgerLogs, setLedgerLogs] = useState<LedgerItem[]>([]);

  useEffect(() => {
    if (isHydrated && (!user || user.role !== "b2b")) {
      router.push("/dashboard");
    }
  }, [user, isHydrated, router]);

  const fetchAllFinanceData = async () => {
    if (!user?.uid) return;
    setIsLoading(true);

    try {
      // 1. Ambil Profil User
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const d = userDoc.data();
        setB2bLimit(d.b2bLimit || 0);
        setDepositBalance(d.depositBalance || 0);
      }

      // 2. Ambil Tagihan Utang B2B
      const qDebt = query(collection(db, "orders"), where("userId", "==", user.uid), where("isB2BApplied", "==", true));
      const debtSnap = await getDocs(qDebt);
      
      let calculatedDebt = 0;
      const unpaidList: OrderDetail[] = [];

      debtSnap.forEach(d => {
        const oData = d.data() as OrderDetail;
        
        // 🚀 FILTER POSITIF: Ambil MURNI Utang saja, filter orderan Batal/Refund/Potong Saldo
        const isTrueDebt = 
          oData.paymentStatus === "Piutang B2B" || 
          oData.paymentStatus === "Menunggu Verifikasi Finance" || 
          oData.paymentStatus === "Ditolak";
          
        const isNotCancelled = oData.status !== "Dibatalkan" && oData.paymentStatus !== "Dibatalkan" && oData.paymentStatus !== "Refund Selesai";

        if (isTrueDebt && isNotCancelled) {
          const amount = oData.finalGrandTotal || oData.breakdown?.grandTotal || oData.totalCost || 0;
          calculatedDebt += amount;
          unpaidList.push({ ...oData, id: d.id });
        }
      });

      unpaidList.sort((a, b) => {
        const getTs = (ts?: FirebaseTimestamp) => {
          if (!ts) return 0;
          if (typeof ts === 'object' && 'toMillis' in ts && typeof ts.toMillis === 'function') return ts.toMillis();
          if (typeof ts === 'object' && 'seconds' in ts && typeof ts.seconds === 'number') return ts.seconds * 1000;
          return new Date(ts as string | number).getTime();
        };
        return getTs(a.createdAt) - getTs(b.createdAt);
      });

      setTotalDebt(calculatedDebt);
      setUnpaidOrders(unpaidList);

      // 3. Ambil Riwayat Buku Kas (Wallet Logs)
      const ledgerArray: LedgerItem[] = [];
      const qLogs = query(collection(db, "wallet_logs"), where("userId", "==", user.uid));
      const logsSnap = await getDocs(qLogs);
      
      logsSnap.forEach(d => {
        const lData = d.data();
        const ts = lData.createdAt?.toMillis ? lData.createdAt.toMillis() : new Date(lData.createdAt || lData.timestamp).getTime();
        ledgerArray.push({
          id: d.id,
          type: lData.type || "unknown",
          amount: lData.amount || 0,
          status: "Success",
          timestamp: ts,
          dateStr: new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          note: lData.description || lData.adminNote || "Mutasi Saldo"
        });
      });

      // 4. Ambil Riwayat Pengajuan Top-Up (Deposit Requests)
      const qReq = query(collection(db, "deposit_requests"), where("userId", "==", user.uid));
      const reqSnap = await getDocs(qReq);
      
      reqSnap.forEach(d => {
        const rData = d.data();
        const ts = rData.createdAt?.toMillis ? rData.createdAt.toMillis() : new Date(rData.createdAt).getTime();
        ledgerArray.push({
          id: d.id,
          type: "topup_request",
          amount: rData.amount || 0,
          status: rData.status || "Pending",
          timestamp: ts,
          dateStr: new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          note: `Pengajuan Top-Up Deposit`
        });
      });

      // Urutkan Riwayat dari yang Terbaru
      ledgerArray.sort((a, b) => b.timestamp - a.timestamp);
      setLedgerLogs(ledgerArray);

    } catch (error) {
      console.error("Gagal menarik data finance B2B:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchPaymentConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "payments"));
        if (snap.exists()) setPaymentConfig(snap.data() as PaymentConfig);
      } catch (error) {
        console.error("Gagal menarik metode pembayaran", error);
      }
    };

    if (user?.role === "b2b") {
      fetchAllFinanceData();
      fetchPaymentConfig();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  const handleBulkPayment = async () => {
    if (!receiptFile) {
      showToast("error", "Harap unggah bukti transfer/pembayaran terlebih dahulu.");
      return;
    }
    if (unpaidOrders.length === 0) return;

    setIsUploadingBulk(true);
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      let finalReceiptUrl = "";

      if (cloudName && uploadPreset) {
        const imageFormData = new FormData();
        imageFormData.append("file", receiptFile);
        imageFormData.append("upload_preset", uploadPreset);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST", body: imageFormData,
        });

        const cloudData = await cloudinaryRes.json();
        if (cloudData.secure_url) {
          finalReceiptUrl = cloudData.secure_url;
        } else {
          throw new Error("Gagal mengunggah bukti transfer.");
        }
      }

      const batch = writeBatch(db);
      unpaidOrders.forEach(order => {
        const orderRef = doc(db, "orders", order.id);
        batch.update(orderRef, {
          paymentStatus: "Menunggu Verifikasi Finance",
          paymentMethod: "Transfer Bank Manual (Bulk B2B)",
          receiptUrl: finalReceiptUrl,
          paidAt: serverTimestamp()
        });
      });

      await batch.commit();

      showToast("success", "Pembayaran massal berhasil diajukan! Menunggu verifikasi tim Finance.");
      setUnpaidOrders([]);
      setTotalDebt(0);
      setReceiptFile(null);
      setReceiptPreview(null);
      setShowPiutangModal(false); // Tutup Modal
      fetchAllFinanceData();
    } catch (error) {
      console.error(error);
      showToast("error", "Terjadi kesalahan sistem saat memproses pembayaran.");
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupFile) {
      showToast("error", "Harap unggah bukti transfer Top-Up.");
      return;
    }
    if (!topupAmount || topupAmount <= 0) {
      showToast("error", "Nominal Top-Up tidak valid.");
      return;
    }

    setIsSubmittingTopup(true);
    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
      let finalProofUrl = "";

      if (cloudName && uploadPreset) {
        const imageFormData = new FormData();
        imageFormData.append("file", topupFile);
        imageFormData.append("upload_preset", uploadPreset);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST", body: imageFormData,
        });

        const cloudData = await cloudinaryRes.json();
        if (cloudData.secure_url) finalProofUrl = cloudData.secure_url;
        else throw new Error("Gagal mengunggah bukti ke server.");
      }

      await addDoc(collection(db, "deposit_requests"), {
        userId: user?.uid,
        clientName: user?.companyName || user?.displayName || "Klien B2B",
        amount: Number(topupAmount),
        proofUrl: finalProofUrl,
        status: "Menunggu Verifikasi",
        createdAt: serverTimestamp()
      });

      showToast("success", "Pengajuan Top-Up berhasil dikirim! Saldo akan bertambah setelah divalidasi.");
      setTopupAmount("");
      setTopupFile(null);
      setTopupPreview(null);
      setShowDepositModal(false); // Tutup modal
      fetchAllFinanceData();

    } catch (error) {
      console.error(error);
      showToast("error", "Terjadi kesalahan saat memproses Top-Up.");
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  if (!isHydrated || !user || user.role !== "b2b") return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-indigo-600 animate-pulse mb-6" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Menyiapkan Enkripsi E-Wallet...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] py-10 lg:py-16 px-4 sm:px-6 relative overflow-hidden font-sans pb-32 z-0">
      {/* --- AMBIENT GLOWING BACKGROUND --- */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[50vh] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[50vh] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1200px] mx-auto z-10 relative space-y-10">
        
        {/* TOAST NOTIFICATION */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} 
              className={`fixed top-10 right-10 z-[200] p-4 rounded-2xl font-bold text-sm border flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.1)] backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 'bg-red-50/90 border-red-200 text-red-800'}`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 🚀 HEADER USER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Keuangan <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Corporate</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium max-w-xl leading-relaxed flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Kelola saldo prabayar dan tagihan net Anda.
            </p>
          </div>
          <div className="bg-white/60 backdrop-blur-md px-5 py-3.5 rounded-[1.5rem] border border-white shadow-[0_4px_15px_rgba(0,0,0,0.02),inset_0_2px_4px_rgba(255,255,255,0.8)] flex items-center gap-4 shrink-0">
             <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center border border-indigo-700 text-white font-black uppercase shadow-inner">
               {user.companyName?.charAt(0) || user.displayName?.charAt(0)}
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Korporat (B2B)</p>
               <p className="text-sm font-black text-slate-900 truncate max-w-[150px]">{user.companyName || user.displayName}</p>
             </div>
          </div>
        </div>

        {/* 🚀 2. HERO E-WALLET CARD (APPLE STYLE) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 sm:p-10 rounded-[2.5rem] border border-slate-700 shadow-[0_30px_60px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] relative overflow-hidden"
        >
          {/* Ornamen Latar Apple Wallet */}
          <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-30 pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-6 relative z-10">
            
            {/* Bagian Saldo Prabayar (Kiri) */}
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-emerald-400" /> Saldo Prabayar (Deposit)
                </p>
                <p className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                  {formatRupiah(depositBalance)}
                </p>
              </div>
              <button 
                onClick={() => setShowDepositModal(true)}
                className="w-full sm:w-auto px-8 h-12 bg-white/10 hover:bg-white border border-white/20 hover:border-white text-white hover:text-slate-900 rounded-2xl font-bold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" /> Top Up Saldo
              </button>
            </div>

            <div className="hidden md:block w-px bg-slate-700/80 my-2 absolute left-1/2 top-0 bottom-0 transform -translate-x-1/2"></div>

            {/* Bagian Tagihan Piutang (Kanan) */}
            <div className="space-y-6 pt-8 md:pt-0 border-t border-slate-700/80 md:border-t-0 md:pl-10 flex flex-col items-start md:items-end md:text-right">
              <div className="w-full">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center md:justify-end gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-amber-400" /> Tagihan Belum Dibayar
                </p>
                <p className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-tighter">
                  {formatRupiah(totalDebt)}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Sisa Limit Tagihan: {formatRupiah(b2bLimit - totalDebt)}</p>
              </div>
              <button 
                onClick={() => setShowPiutangModal(true)}
                className="w-full sm:w-auto px-8 h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white border border-orange-600 rounded-2xl font-bold text-sm tracking-wide shadow-[0_10px_25px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <ArrowUpRight className="w-4 h-4" /> Bayar Tagihan
              </button>
            </div>

          </div>
        </motion.div>

        {/* 🚀 3. KONTEN UTAMA: BUKU BESAR TRANSAKSI (LEDGER) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-6 ml-2">
            <History className="w-4 h-4" /> Riwayat Transaksi Terakhir
          </h2>
          <div className={`${glassPanel} rounded-[2rem] p-4 sm:p-8 min-h-[400px]`}>
             <LedgerTab ledgerLogs={ledgerLogs} formatRupiah={formatRupiah} />
          </div>
        </motion.div>

      </div>

      {/* ================================================================= */}
      {/* 🚀 MODAL: TOP UP DEPOSIT */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isSubmittingTopup && setShowDepositModal(false)}></motion.div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-4xl bg-[#f8fafc] rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white"
            >
              <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-6 flex items-center justify-between shrink-0 relative z-10 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Wallet className="w-6 h-6 text-emerald-600" /> Top Up Saldo Deposit</h2>
                <button onClick={() => !isSubmittingTopup && setShowDepositModal(false)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors flex items-center justify-center shadow-sm"><X className="w-5 h-5" /></button>
              </div>
              <div className="overflow-y-auto p-2 sm:p-6 custom-scrollbar bg-slate-50/50">
                <DepositTab 
                  paymentConfig={paymentConfig} topupAmount={topupAmount} setTopupAmount={setTopupAmount}
                  topupFileInputRef={topupFileInputRef} topupFile={topupFile} setTopupFile={setTopupFile}
                  topupPreview={topupPreview} setTopupPreview={setTopupPreview} handleTopupSubmit={handleTopupSubmit}
                  isSubmittingTopup={isSubmittingTopup} showToast={showToast} formatRupiah={formatRupiah}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* 🚀 MODAL: BAYAR TAGIHAN PIUTANG */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showPiutangModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isUploadingBulk && setShowPiutangModal(false)}></motion.div>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-5xl bg-[#f8fafc] rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white"
            >
              <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-6 flex items-center justify-between shrink-0 relative z-10 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><CreditCard className="w-6 h-6 text-amber-600" /> Pembayaran Tagihan B2B</h2>
                <button onClick={() => !isUploadingBulk && setShowPiutangModal(false)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors flex items-center justify-center shadow-sm"><X className="w-5 h-5" /></button>
              </div>
              <div className="overflow-y-auto p-2 sm:p-6 custom-scrollbar bg-slate-50/50">
                <PiutangTab 
                  b2bLimit={b2bLimit} totalDebt={totalDebt} unpaidOrders={unpaidOrders} paymentConfig={paymentConfig}
                  receiptFile={receiptFile} setReceiptFile={setReceiptFile} receiptPreview={receiptPreview}
                  setReceiptPreview={setReceiptPreview} handleBulkPayment={handleBulkPayment} isUploadingBulk={isUploadingBulk}
                  showToast={showToast} formatRupiah={formatRupiah}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}