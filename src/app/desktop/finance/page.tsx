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

// Import Tabs Components
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

export default function CorporateFinancePortal() {
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
        status: "Pending",
        createdAt: serverTimestamp()
      });

      showToast("success", "Pengajuan Top-Up berhasil dikirim! Saldo akan bertambah setelah divalidasi.");
      setTopupAmount("");
      setTopupFile(null);
      setTopupPreview(null);
      setActiveTab("riwayat");
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
        <Activity className="w-12 h-12 text-[#7A171D] animate-pulse mb-4" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Menyiapkan Ruang Kerja Keuangan...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] py-10 lg:py-16 px-6 relative overflow-hidden font-sans pb-32 z-0">
      {/* --- AMBIENT GLOWING BACKGROUND --- */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[50vh] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[50vh] bg-[#C5A059]/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1200px] mx-auto z-10 relative space-y-8">
        
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

        {/* HEADER (APPLE GLASS BENTO STYLE) */}
        <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-white/40 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <Badge variant="brand" className="mb-4 shadow-sm inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/80 text-indigo-700 border-indigo-200">
              <Building2 className="w-3.5 h-3.5" /> Corporate B2B Area
            </Badge>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Portal Tagihan & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Deposit</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium max-w-xl leading-relaxed">
              Kelola pembayaran piutang berjalan (Net 30) Anda atau isi saldo prabayar untuk kemudahan transaksi otomatis.
            </p>
          </div>
          
          <div className="bg-white/60 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] flex items-center gap-4 shrink-0 relative z-10">
             <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border border-white text-slate-500 font-black uppercase shadow-sm">
               {user.displayName?.charAt(0)}
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Korporat</p>
               <p className="text-sm font-black text-slate-900 truncate max-w-[150px]">{user.companyName || user.displayName}</p>
             </div>
          </div>
        </div>

        {/* 3 TABS NAVIGATION (IOS PILL STYLE) */}
        <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-[1.5rem] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] border border-white w-full max-w-2xl relative z-20">
          <button onClick={() => setActiveTab("piutang")} className={`flex-1 py-3 text-sm font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "piutang" ? "text-indigo-700" : "text-slate-500 hover:text-slate-800"}`}>
            <Receipt className="w-4 h-4"/> Tagihan Piutang
          </button>
          <button onClick={() => setActiveTab("deposit")} className={`flex-1 py-3 text-sm font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "deposit" ? "text-emerald-700" : "text-slate-500 hover:text-slate-800"}`}>
            <Wallet className="w-4 h-4"/> Saldo Deposit
          </button>
          <button onClick={() => setActiveTab("riwayat")} className={`flex-1 py-3 text-sm font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "riwayat" ? "text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>
            <History className="w-4 h-4"/> Buku Besar
          </button>
          
          <div className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] rounded-xl shadow-md transition-all duration-300 ease-out z-0 ${
            activeTab === "piutang" ? "left-1.5 bg-white border border-indigo-100" : 
            activeTab === "deposit" ? "left-[calc(33.33%+2px)] bg-white border border-emerald-100" : 
            "left-[calc(66.66%-1.5px)] bg-white border border-slate-200"
          }`}></div>
        </div>

        {/* WORKSPACE AREA DINAMIS */}
        <AnimatePresence mode="wait">
          {activeTab === "piutang" && (
            <PiutangTab 
              key="piutang"
              b2bLimit={b2bLimit} 
              totalDebt={totalDebt} 
              unpaidOrders={unpaidOrders} 
              paymentConfig={paymentConfig}
              receiptFile={receiptFile}
              setReceiptFile={setReceiptFile}
              receiptPreview={receiptPreview}
              setReceiptPreview={setReceiptPreview}
              handleBulkPayment={handleBulkPayment}
              isUploadingBulk={isUploadingBulk}
              showToast={showToast}
              formatRupiah={formatRupiah}
            />
          )}

          {activeTab === "deposit" && (
            <DepositTab 
              key="deposit"
              depositBalance={depositBalance}
              paymentConfig={paymentConfig}
              topupAmount={topupAmount}
              setTopupAmount={setTopupAmount}
              topupFileInputRef={topupFileInputRef}
              topupFile={topupFile}
              setTopupFile={setTopupFile}
              topupPreview={topupPreview}
              setTopupPreview={setTopupPreview}
              handleTopupSubmit={handleTopupSubmit}
              isSubmittingTopup={isSubmittingTopup}
              showToast={showToast}
              formatRupiah={formatRupiah}
            />
          )}

          {activeTab === "riwayat" && (
            <LedgerTab 
              key="riwayat"
              ledgerLogs={ledgerLogs}
              formatRupiah={formatRupiah}
            />
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}