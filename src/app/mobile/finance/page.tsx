"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, Receipt, Wallet, History, CheckCircle2, AlertCircle, Activity 
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp, addDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/Badge";
import { OrderDetail, FirebaseTimestamp } from "@/types/order";
import { cn } from "@/lib/utils";

// Import Tabs Components (Nanti akan kita buat versi mobile-nya)
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

export default function MobileFinancePortal() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  
  const topupFileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"piutang" | "deposit" | "riwayat">("piutang");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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

      const ledgerArray: LedgerItem[] = [];
      const qLogs = query(collection(db, "wallet_logs"), where("entityId", "==", user.uid));
      const logsSnap = await getDocs(qLogs);
      logsSnap.forEach(d => {
        const lData = d.data();
        const ts = lData.timestamp?.toMillis ? lData.timestamp.toMillis() : new Date(lData.timestamp).getTime();
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
      setActiveTab("riwayat");
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
        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px] animate-pulse">Menarik Data Keuangan...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 px-4 pb-28 pt-4 w-full relative">
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} 
            className={cn("fixed top-20 left-4 right-4 z-[200] p-3 rounded-2xl font-bold text-xs border flex items-center gap-3 shadow-lg backdrop-blur-md", toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 'bg-red-50/90 border-red-200 text-red-800')}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="leading-relaxed">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER B2B */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center flex flex-col items-center pt-2">
        <Badge variant="brand" className="mb-3 px-3 py-1 shadow-sm bg-indigo-50/80 text-indigo-700 border-indigo-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" /> Corporate B2B
        </Badge>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-2">
          Keuangan <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Perusahaan.</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium px-4 leading-relaxed">
          Kelola tagihan piutang dan saldo prabayar Anda.
        </p>
      </motion.div>

      {/* HORIZONTAL SWIPEABLE TABS */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="w-full relative z-20 sticky top-[70px]">
        <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto no-scrollbar snap-x snap-mandatory tap-highlight-transparent">
          
          <button 
            onClick={() => setActiveTab("piutang")} 
            className={cn("snap-center shrink-0 w-32 py-2.5 text-xs font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-1.5", activeTab === "piutang" ? "text-indigo-700 bg-white shadow-sm border border-indigo-100" : "text-slate-500")}
          >
            <Receipt className="w-3.5 h-3.5"/> Tagihan
          </button>

          <button 
            onClick={() => setActiveTab("deposit")} 
            className={cn("snap-center shrink-0 w-32 py-2.5 text-xs font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-1.5", activeTab === "deposit" ? "text-emerald-700 bg-white shadow-sm border border-emerald-100" : "text-slate-500")}
          >
            <Wallet className="w-3.5 h-3.5"/> Deposit
          </button>

          <button 
            onClick={() => setActiveTab("riwayat")} 
            className={cn("snap-center shrink-0 w-32 py-2.5 text-xs font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-1.5", activeTab === "riwayat" ? "text-slate-900 bg-white shadow-sm border border-slate-200" : "text-slate-500")}
          >
            <History className="w-3.5 h-3.5"/> Riwayat
          </button>

        </div>
      </motion.div>

      {/* WORKSPACE AREA DINAMIS */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === "piutang" && (
            <motion.div key="piutang" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
              <PiutangTab 
                b2bLimit={b2bLimit} totalDebt={totalDebt} unpaidOrders={unpaidOrders} 
                paymentConfig={paymentConfig} receiptFile={receiptFile} setReceiptFile={setReceiptFile}
                receiptPreview={receiptPreview} setReceiptPreview={setReceiptPreview} handleBulkPayment={handleBulkPayment}
                isUploadingBulk={isUploadingBulk} showToast={showToast} formatRupiah={formatRupiah}
              />
            </motion.div>
          )}

          {activeTab === "deposit" && (
            <motion.div key="deposit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <DepositTab 
                depositBalance={depositBalance} paymentConfig={paymentConfig} topupAmount={topupAmount}
                setTopupAmount={setTopupAmount} topupFileInputRef={topupFileInputRef} topupFile={topupFile}
                setTopupFile={setTopupFile} topupPreview={topupPreview} setTopupPreview={setTopupPreview}
                handleTopupSubmit={handleTopupSubmit} isSubmittingTopup={isSubmittingTopup} showToast={showToast}
                formatRupiah={formatRupiah}
              />
            </motion.div>
          )}

          {activeTab === "riwayat" && (
            <motion.div key="riwayat" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <LedgerTab ledgerLogs={ledgerLogs} formatRupiah={formatRupiah} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}