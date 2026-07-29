"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Wallet, Receipt, ArrowUpRight, ArrowDownRight, 
  Building2, QrCode, Copy, Upload, CheckCircle2, 
  AlertCircle, Activity, Plus, ShieldCheck, History,
  X
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp, addDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/Badge";
import { OrderDetail } from "@/types/order";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// --- INTERFACES ---
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

// ==============================================================
// HELPER: EKSTRAKSI TIMESTAMP AMAN (TYPE-SAFE)
// Mengatasi Error TS "Cannot invoke an object which is possibly undefined"
// ==============================================================
const getTimestampValue = (tsVal: unknown): number => {
  if (!tsVal) return 0;
  // Casting secara eksplisit ke bentuk objek yang kita harapkan
  const obj = tsVal as { toMillis?: () => number; seconds?: number };
  
  // Verifikasi tipe datanya secara spesifik sebelum digunakan
  if (typeof obj.toMillis === "function") return obj.toMillis();
  if (typeof obj.seconds === "number") return obj.seconds * 1000;
  
  // Fallback untuk format Date String / Number biasa
  return new Date(tsVal as string | number).getTime();
};

export default function MobileFinancePortal() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  const topupFileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // MODAL STATES
  const [activeModal, setActiveModal] = useState<"topup" | "pay_debt" | null>(null);

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
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const d = userDoc.data();
        setB2bLimit(d.b2bLimit || 0);
        setDepositBalance(d.depositBalance || 0);
      }

      const qDebt = query(collection(db, "orders"), where("userId", "==", user.uid), where("isB2BApplied", "==", true));
      const debtSnap = await getDocs(qDebt);
      
      let calculatedDebt = 0;
      const unpaidList: OrderDetail[] = [];

      debtSnap.forEach(d => {
        const oData = d.data() as OrderDetail;
        if (oData.paymentStatus === "Piutang B2B" || oData.paymentStatus === "Belum Bayar" || oData.paymentStatus === "Ditolak") {
          const amount = oData.finalGrandTotal || oData.breakdown?.grandTotal || oData.totalCost || 0;
          calculatedDebt += amount;
          unpaidList.push({ ...oData, id: d.id });
        }
      });

      // Menggunakan Helper Aman
      unpaidList.sort((a, b) => getTimestampValue(a.createdAt) - getTimestampValue(b.createdAt));

      setTotalDebt(calculatedDebt);
      setUnpaidOrders(unpaidList);

      const ledgerArray: LedgerItem[] = [];
      const qLogs = query(collection(db, "wallet_logs"), where("entityId", "==", user.uid));
      const logsSnap = await getDocs(qLogs);
      logsSnap.forEach(d => {
        const lData = d.data();
        const ts = getTimestampValue(lData.timestamp);
        ledgerArray.push({
          id: d.id,
          type: lData.type || "unknown",
          amount: lData.amount || 0,
          status: "Success",
          timestamp: ts,
          dateStr: new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          note: lData.adminNote || lData.description || "Mutasi Saldo"
        });
      });

      const qReq = query(collection(db, "deposit_requests"), where("userId", "==", user.uid));
      const reqSnap = await getDocs(qReq);
      reqSnap.forEach(d => {
        const rData = d.data();
        const ts = getTimestampValue(rData.createdAt);
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
      showToast("error", "Unggah bukti transfer terlebih dahulu.");
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
          throw new Error("Gagal mengunggah bukti.");
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

      showToast("success", "Pembayaran massal diajukan!");
      setUnpaidOrders([]);
      setTotalDebt(0);
      setReceiptFile(null);
      setReceiptPreview(null);
      setActiveModal(null);
      fetchAllFinanceData();
    } catch (error) {
      console.error(error);
      showToast("error", "Kesalahan saat memproses pembayaran.");
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupFile) {
      showToast("error", "Unggah bukti Top-Up.");
      return;
    }
    if (!topupAmount || topupAmount <= 0) {
      showToast("error", "Nominal tidak valid.");
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
        else throw new Error("Gagal mengunggah bukti.");
      }

      await addDoc(collection(db, "deposit_requests"), {
        userId: user?.uid,
        clientName: user?.companyName || user?.displayName || "Klien B2B",
        amount: Number(topupAmount),
        proofUrl: finalProofUrl,
        status: "Pending",
        createdAt: serverTimestamp()
      });

      showToast("success", "Top-Up diajukan!");
      setTopupAmount("");
      setTopupFile(null);
      setTopupPreview(null);
      setActiveModal(null);
      fetchAllFinanceData();

    } catch (error) {
      console.error(error);
      showToast("error", "Kesalahan saat Top-Up.");
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  if (!isHydrated || !user || user.role !== "b2b") return null;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center font-sans">
        <Activity className="w-10 h-10 text-[#7A171D] animate-pulse mb-3" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Menyiapkan Dompet Digital...</p>
      </div>
    );
  }

  const limitUsedPercent = b2bLimit > 0 ? Math.min((totalDebt / b2bLimit) * 100, 100) : 0;

  return (
    <div className="flex flex-col space-y-6 px-4 pb-28 pt-2 w-full relative font-sans">
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} 
            className={cn("fixed top-16 left-4 right-4 z-[250] p-3.5 rounded-2xl font-bold text-xs border flex items-center gap-3 shadow-xl backdrop-blur-md", toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' : 'bg-red-50/95 border-red-200 text-red-800')}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> : <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />}
            <span className="leading-relaxed">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER DOMPET DIGITAL */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <Badge variant="brand" className="px-2.5 py-0.5 shadow-none bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-max mb-1">
            <Building2 className="w-3 h-3" /> Flash Pay B2B
          </Badge>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Rekening B2B</h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Perusahaan</p>
          <p className="text-xs font-black text-slate-800 truncate max-w-[140px]">{user.companyName || user.displayName}</p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 💳 MAIN E-WALLET CARD (SHOPEEPAY / GOPAY STYLE) */}
      {/* ============================================================== */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-[#7A171D] via-[#5A0E13] to-slate-900 text-white rounded-[2rem] p-6 shadow-xl border border-[#9A242B]/30 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-44 h-44 bg-[#C5A059] rounded-full blur-[80px] opacity-20 pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-44 h-44 bg-blue-500 rounded-full blur-[80px] opacity-15 pointer-events-none" />

        <div className="relative z-10 space-y-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-[#DFBE7B] uppercase tracking-widest mb-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5" /> Saldo Deposit Prabayar
              </p>
              <h2 className="text-3xl font-black tracking-tighter text-white drop-shadow-md">
                {formatRupiah(depositBalance)}
              </h2>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-black text-emerald-400 tracking-widest uppercase shadow-inner">
              Aktif
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button 
              onClick={() => setActiveModal("topup")}
              className="h-12 bg-white/10 hover:bg-white/20 active:scale-95 transition-all backdrop-blur-md border border-white/20 rounded-2xl font-black text-xs text-white flex items-center justify-center gap-2 shadow-sm tap-highlight-transparent"
            >
              <Plus className="w-4 h-4 text-[#DFBE7B]" /> Isi Saldo Deposit
            </button>
            <button 
              onClick={() => setActiveModal("pay_debt")}
              className="h-12 bg-[#C5A059] active:scale-95 transition-all text-[#5A0E13] rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md tap-highlight-transparent"
            >
              <Receipt className="w-4 h-4" /> Pelunasan Piutang
            </button>
          </div>
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 📊 E-CREDIT LIMIT BENTO CARD (PIUTANG NET 30 STATUS) */}
      {/* ============================================================== */}
      <div className="bg-white rounded-[2rem] p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 tracking-tight">Fasilitas Kredit Net 30</h3>
              <p className="text-[9px] font-bold text-slate-400">Plafon khusus mitra B2B</p>
            </div>
          </div>
          <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
            {limitUsedPercent.toFixed(0)}% Terpakai
          </span>
        </div>

        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60 p-0.5">
          <motion.div 
            initial={{ width: 0 }} animate={{ width: `${limitUsedPercent}%` }} transition={{ duration: 0.8 }}
            className={cn("h-full rounded-full", limitUsedPercent > 80 ? "bg-red-500" : "bg-gradient-to-r from-indigo-500 to-blue-600")} 
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sisa Limit</p>
            <p className="font-black text-indigo-700 tracking-tight">{formatRupiah(b2bLimit - totalDebt)}</p>
          </div>
          <div className="bg-red-50/60 p-3 rounded-xl border border-red-100">
            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-0.5">Piutang Berjalan</p>
            <p className="font-black text-red-700 tracking-tight">{formatRupiah(totalDebt)}</p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 📃 RINCIAN PIUTANG BERJALAN & LOG MUTASI (LIVE STREAM) */}
      {/* ============================================================== */}
      <div className="space-y-4">
        
        {/* SEKSI UNPAID ORDERS */}
        {unpaidOrders.length > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-red-500" /> Tagihan Belum Lunas ({unpaidOrders.length})
              </h3>
              <button onClick={() => setActiveModal("pay_debt")} className="text-[10px] font-black text-[#7A171D] hover:underline">Bayar Semua</button>
            </div>

            <div className="space-y-2">
              {unpaidOrders.map(order => {
                const amount = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
                
                // Ekstraksi origin dan destination dengan aman
                const originStr = typeof order.origin === 'string' ? order.origin : (order.origin as {address?: string})?.address || "Lokasi Awal";
                const originCity = String(originStr).split(",")[0];

                const destStr = (order.destinations && order.destinations.length > 1) 
                  ? `${order.destinations.length} Tujuan` 
                  : ((order.destinations?.[0] as {address?: string})?.address || order.destination || "Tujuan Akhir");
                const destCity = String(destStr).split(",")[0];

                // MENGGUNAKAN HELPER AMAN UNTUK TANGGAL
                let formattedDate = "Diproses";
                if (order.createdAt) {
                  const ts = getTimestampValue(order.createdAt);
                  if (ts > 0) {
                    formattedDate = new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                  }
                }

                return (
                  <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-black text-[#7A171D] text-[11px] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                          #{String(order.resi || order.id.substring(0,8))}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">{formattedDate}</span>
                      </div>
                      <p className="text-xs font-black text-slate-800 truncate">{originCity} ➔ {destCity}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-red-600">{formatRupiah(amount)}</p>
                      <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {String(order.paymentStatus || "Belum Bayar")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SEKSI MUTASI TRANSAKSI (E-WALLET MUTATION STREAM) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-500" /> Mutasi & Riwayat Transaksi
            </h3>
            <span className="text-[9px] font-bold text-slate-400">Real-time Log</span>
          </div>

          {ledgerLogs.length === 0 ? (
            <div className="bg-white p-8 rounded-[2rem] text-center border border-slate-200 flex flex-col items-center">
              <History className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-400">Belum ada riwayat mutasi keuangan.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {ledgerLogs.map((log) => {
                const isIncome = log.type.includes('topup') || log.type === 'deposit';
                return (
                  <div key={log.id} className="p-4 flex items-center justify-between gap-3 active:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm", isIncome ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100")}>
                        {isIncome ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-900 capitalize truncate">{log.type.replace('_', ' ')}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{log.note}</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{log.dateStr}</p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className={cn("text-xs font-black tracking-tight", isIncome ? "text-emerald-600" : "text-slate-900")}>
                        {isIncome ? "+" : "-"}{formatRupiah(log.amount)}
                      </p>
                      <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border inline-block mt-0.5",
                        log.status === 'Success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        log.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-red-50 text-red-600 border-red-200'
                      )}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ============================================================== */}
      {/* 📱 NATIVE BOTTOM SHEET: TOP-UP DEPOSIT */}
      {/* ============================================================== */}
      <AnimatePresence>
        {activeModal === "topup" && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full bg-[#f8fafc] rounded-t-[2.5rem] p-6 pb-safe shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6" />

              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Isi Saldo Deposit</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Metode QRIS / Bank Transfer</p>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-200/50 rounded-full text-slate-500 active:scale-90 tap-highlight-transparent"><X className="w-5 h-5"/></button>
              </div>

              {/* QRIS / Rekening Info */}
              <div className="space-y-4 mb-6">
                {paymentConfig?.qrisImageUrl && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-center gap-1"><QrCode className="w-4 h-4 text-emerald-600"/> Scan QRIS All Payment</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={paymentConfig.qrisImageUrl} alt="QRIS" className="w-36 h-36 object-contain mx-auto rounded-xl border border-slate-100 p-1" />
                  </div>
                )}

                {paymentConfig?.transferBank && paymentConfig.transferBank.map((bank, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black text-slate-900">{bank.bankName}</p>
                        <p className="text-xs font-mono font-black text-emerald-700">{bank.accountNumber}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(bank.accountNumber); showToast("success", "Nomor rekening disalin!"); }} className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 active:scale-90 tap-highlight-transparent">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Form Input Nominal & Upload */}
              <form onSubmit={handleTopupSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Nominal Top-Up (Rp)</label>
                  <input type="number" required min="50000" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-2xl px-4 h-14 text-slate-900 text-lg font-black outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-sm" placeholder="Min. 50.000" />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Bukti Transfer</label>
                  <label className={cn("border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[110px] relative overflow-hidden tap-highlight-transparent", !topupFile ? "border-slate-300 bg-white" : "border-emerald-500 bg-emerald-50/50")}>
                    <input type="file" accept="image/*" ref={topupFileInputRef} onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setTopupFile(e.target.files[0]);
                        setTopupPreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }} className="hidden" />
                    
                    {topupPreview ? (
                      <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs"><CheckCircle2 className="w-5 h-5 text-emerald-600"/> Bukti terlampir (Ganti)</div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-5 h-5 text-emerald-600 mx-auto" />
                        <p className="text-[10px] font-black uppercase text-slate-500">Unggah Foto Bukti Transfer</p>
                      </div>
                    )}
                  </label>
                </div>

                <Button type="submit" disabled={isSubmittingTopup || !topupFile} variant="primary" className="w-full h-14 rounded-2xl font-black text-sm !bg-gradient-to-b !from-emerald-600 !to-emerald-700 active:scale-95 tap-highlight-transparent shadow-md border-emerald-800">
                  {isSubmittingTopup ? "Mengirim Pengajuan..." : "Konfirmasi Top-Up"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* 📱 NATIVE BOTTOM SHEET: PELUNASAN PIUTANG B2B */}
      {/* ============================================================== */}
      <AnimatePresence>
        {activeModal === "pay_debt" && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end font-sans">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActiveModal(null)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
            
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10 w-full bg-[#f8fafc] rounded-t-[2.5rem] p-6 pb-safe shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6" />

              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-sm">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Pelunasan Massal</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total: {formatRupiah(totalDebt)}</p>
                  </div>
                </div>
                <button onClick={() => setActiveModal(null)} className="p-2 bg-slate-200/50 rounded-full text-slate-500 active:scale-90 tap-highlight-transparent"><X className="w-5 h-5"/></button>
              </div>

              {unpaidOrders.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-2xl border border-slate-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-black text-slate-800">Tidak ada tagihan tertunda saat ini.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Rekening Tujuan Transfer */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Transfer ke Rekening Perusahaan</label>
                    {paymentConfig?.transferBank && paymentConfig.transferBank.map((bank, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black text-slate-900">{bank.bankName}</p>
                            <p className="text-xs font-mono font-black text-indigo-700">{bank.accountNumber}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(bank.accountNumber); showToast("success", "Rekening disalin!"); }} className="p-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 active:scale-90 tap-highlight-transparent">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Upload Bukti Bayar Massal */}
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Bukti Transfer Pelunasan</label>
                    <label className={cn("border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[110px] relative overflow-hidden tap-highlight-transparent", !receiptFile ? "border-slate-300 bg-white" : "border-emerald-500 bg-emerald-50/50")}>
                      <input type="file" accept="image/*" onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setReceiptFile(e.target.files[0]);
                          setReceiptPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }} className="hidden" />
                      
                      {receiptPreview ? (
                        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs"><CheckCircle2 className="w-5 h-5 text-emerald-600"/> Bukti terlampir (Ganti)</div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-5 h-5 text-indigo-600 mx-auto" />
                          <p className="text-[10px] font-black uppercase text-slate-500">Unggah Bukti Pelunasan Massal</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <Button onClick={handleBulkPayment} disabled={isUploadingBulk || !receiptFile} variant="primary" className="w-full h-14 rounded-2xl font-black text-sm bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white active:scale-95 tap-highlight-transparent shadow-md border-[#5A0E13]">
                    {isUploadingBulk ? "Memproses..." : "Konfirmasi Pembayaran Massal"}
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}