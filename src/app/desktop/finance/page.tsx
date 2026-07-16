"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, CreditCard, Receipt, 
  Upload, ShieldCheck, CheckCircle2, 
  AlertCircle, Activity, FileSpreadsheet, 
  MapPin, Clock, ArrowRight, Wallet, 
  History, PlusCircle, ArrowDownCircle, ArrowUpCircle, XCircle
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp, addDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

import { OrderDetail, LocationDetail } from "@/types/order";

// Tipe Data untuk Ledger / Buku Besar
interface LedgerItem {
  id: string;
  type: string; // 'deposit', 'withdraw', 'topup', 'payment'
  amount: number;
  status: string; // 'Success', 'Pending', 'Rejected'
  timestamp: number;
  dateStr: string;
  note: string;
}

export default function CorporateFinancePortal() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topupFileInputRef = useRef<HTMLInputElement>(null);

  // General States
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"piutang" | "deposit" | "riwayat">("piutang");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // ==========================================
  // STATE: B2B LIMIT & OUTSTANDING (PIUTANG)
  // ==========================================
  const [b2bLimit, setB2bLimit] = useState(0);
  const [unpaidOrders, setUnpaidOrders] = useState<OrderDetail[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // ==========================================
  // STATE: DEPOSIT & TOP UP
  // ==========================================
  const [depositBalance, setDepositBalance] = useState(0);
  const [topupAmount, setTopupAmount] = useState<number | "">("");
  const [topupFile, setTopupFile] = useState<File | null>(null);
  const [topupPreview, setTopupPreview] = useState<string | null>(null);
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);

  // ==========================================
  // STATE: RIWAYAT TRANSAKSI (LEDGER)
  // ==========================================
  const [ledgerLogs, setLedgerLogs] = useState<LedgerItem[]>([]);

  // Middleware Bypass Guard
  useEffect(() => {
    if (isHydrated && (!user || user.role !== "b2b")) {
      router.push("/dashboard");
    }
  }, [user, isHydrated, router]);

  // Fetch Data Induk (Finance Data & Logs)
  const fetchAllFinanceData = async () => {
    if (!user?.uid) return;
    setIsLoading(true);

    try {
      // 1. Tarik Limit & Saldo dari User Profile
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const d = userDoc.data();
        setB2bLimit(d.b2bLimit || 0);
        setDepositBalance(d.depositBalance || 0);
      }

      // 2. Tarik Tagihan yang Belum Lunas (Piutang)
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
        const tA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : new Date(a.createdAt as any).getTime();
        const tB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : new Date(b.createdAt as any).getTime();
        return tA - tB;
      });

      setTotalDebt(calculatedDebt);
      setUnpaidOrders(unpaidList);

      // 3. Tarik Riwayat Buku Besar (Ledger) dari Wallet Logs & Deposit Requests
      const ledgerArray: LedgerItem[] = [];

      // A. Wallet Logs (Mutasi Sukses)
      const qLogs = query(collection(db, "wallet_logs"), where("entityId", "==", user.uid));
      const logsSnap = await getDocs(qLogs);
      logsSnap.forEach(d => {
        const lData = d.data();
        const ts = lData.timestamp?.toMillis ? lData.timestamp.toMillis() : new Date(lData.timestamp).getTime();
        ledgerArray.push({
          id: d.id,
          type: lData.type || "unknown",
          amount: lData.amount || 0,
          status: "Success", // Wallet logs biasanya sudah success
          timestamp: ts,
          dateStr: new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          note: lData.adminNote || lData.description || "Mutasi Saldo"
        });
      });

      // B. Deposit Requests (Top Up yang masih Pending/Rejected)
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

      // Sort Ledger terbaru di atas
      ledgerArray.sort((a, b) => b.timestamp - a.timestamp);
      setLedgerLogs(ledgerArray);

    } catch (error) {
      console.error("Gagal menarik data finance B2B:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "b2b") fetchAllFinanceData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  // =======================================================================
  // HANDLERS: BULK PAYMENT (PIUTANG)
  // =======================================================================
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
          throw new Error("Gagal mengunggah bukti transfer ke server.");
        }
      }

      // Firebase BATCH WRITE
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

      showToast("success", "Pembayaran massal berhasil diajukan! Menunggu verifikasi tim Finance kami.");
      setUnpaidOrders([]);
      setTotalDebt(0);
      setReceiptFile(null);
      setReceiptPreview(null);
      fetchAllFinanceData();
    } catch (error) {
      console.error(error);
      showToast("error", "Terjadi kesalahan sistem saat memproses pembayaran bulk.");
    } finally {
      setIsUploadingBulk(false);
    }
  };

  // =======================================================================
  // HANDLERS: TOP-UP DEPOSIT (PRABAYAR)
  // =======================================================================
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

      // Simpan ke request
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
      setActiveTab("riwayat"); // Lempar ke tab riwayat agar user bisa pantau
      fetchAllFinanceData();

    } catch (error) {
      console.error(error);
      showToast("error", "Terjadi kesalahan saat memproses Top-Up.");
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  // Kalkulasi Limits
  const limitUsedPercent = b2bLimit > 0 ? Math.min((totalDebt / b2bLimit) * 100, 100) : 0;
  const isLimitWarning = limitUsedPercent > 80; 

  if (!isHydrated || !user || user.role !== "b2b") return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-indigo-600 animate-pulse mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Menyiapkan Ruang Kerja Keuangan...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 lg:py-16 px-6 relative overflow-hidden font-sans pb-24">
      {/* Background Ornamen Premium */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto z-10 relative space-y-8">
        
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-24 right-10 z-[100] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-4">
          <div>
            <Badge variant="brand" className="mb-4 shadow-sm inline-flex items-center gap-1.5 px-3 py-1 text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
              <Building2 className="w-3.5 h-3.5" /> Corporate B2B Area
            </Badge>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              Portal Tagihan & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">Deposit</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm md:text-base font-medium max-w-xl">
              Kelola pembayaran piutang berjalan (Net 30) Anda atau isi saldo prabayar untuk kemudahan transaksi otomatis.
            </p>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 shrink-0">
             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-500 font-bold uppercase">{user.displayName?.charAt(0)}</div>
             <div>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Akun Korporat</p>
               <p className="text-sm font-black text-slate-900 truncate max-w-[150px]">{user.companyName || user.displayName}</p>
             </div>
          </div>
        </div>

        {/* 3 TABS NAVIGATION CERDAS */}
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-full max-w-2xl relative">
          <button onClick={() => setActiveTab("piutang")} className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "piutang" ? "text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}>
            <Receipt className="w-4 h-4"/> Tagihan Piutang
          </button>
          <button onClick={() => setActiveTab("deposit")} className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "deposit" ? "text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}>
            <Wallet className="w-4 h-4"/> Saldo Deposit
          </button>
          <button onClick={() => setActiveTab("riwayat")} className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "riwayat" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
            <History className="w-4 h-4"/> Buku Besar
          </button>
          
          <div className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] rounded-xl shadow-sm transition-all duration-300 ease-out ${
            activeTab === "piutang" ? "left-1.5 bg-indigo-50 border border-indigo-100" : 
            activeTab === "deposit" ? "left-[calc(33.33%+2px)] bg-emerald-50 border border-emerald-100" : 
            "left-[calc(66.66%-1.5px)] bg-slate-100 border border-slate-200"
          }`}></div>
        </div>

        {/* ========================================================= */}
        {/* WORKSPACE AREA DINAMIS                                    */}
        {/* ========================================================= */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: PIUTANG / B2B CREDIT */}
          {activeTab === "piutang" && (
            <motion.div key="piutang" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
              
              {/* METRIK KEUANGAN & LIMIT KREDIT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 text-white p-6 md:p-8 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden md:col-span-2 flex flex-col justify-center">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500 rounded-full blur-[80px] opacity-20 pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Penggunaan Plafon Kredit
                        </p>
                        <span className="text-xs font-bold text-slate-400">{limitUsedPercent.toFixed(1)}% Terpakai</span>
                      </div>
                      <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden mb-4 border border-slate-700/50 shadow-inner">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${limitUsedPercent}%` }} transition={{ duration: 1, ease: "easeOut" }} className={cn("h-full rounded-full", isLimitWarning ? "bg-red-500" : "bg-indigo-500")} />
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold mb-1">Total Limit (Net 30)</p>
                          <p className="text-xl font-black text-slate-200">{formatRupiah(b2bLimit)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold mb-1">Sisa Limit Tersedia</p>
                          <p className={cn("text-2xl md:text-3xl font-black", isLimitWarning ? "text-red-400" : "text-indigo-400")}>
                            {formatRupiah(b2bLimit - totalDebt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-red-50 rounded-full blur-[40px] pointer-events-none group-hover:bg-red-100 transition-colors" />
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center border border-red-100 mb-4">
                      <Receipt className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Piutang Berjalan</p>
                    <h3 className="text-3xl md:text-4xl font-black text-red-600 tracking-tight">{formatRupiah(totalDebt)}</h3>
                    <p className="text-xs text-slate-500 mt-2 font-medium">Dari {unpaidOrders.length} manifes tertunda.</p>
                  </div>
                </div>
              </div>

              {/* TABEL PIUTANG & UPLOAD BULK */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
                  <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Rincian Tagihan Tertunda
                      </h2>
                    </div>
                  </div>
                  <div className="overflow-x-auto flex-1 custom-scrollbar bg-white">
                    {unpaidOrders.length === 0 ? (
                      <div className="p-20 text-center flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800">Tidak Ada Tagihan Tertunda</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm">Anda telah melunasi semua invoice atau belum ada pesanan baru yang ditagihkan.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-sm">
                        <thead className="sticky top-0 bg-white shadow-sm z-10">
                          <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                            <th className="p-5 pl-8">No. Resi AWB</th>
                            <th className="p-5">Rute (Asal & Tujuan)</th>
                            <th className="p-5 pr-8 text-right">Nominal Tagihan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {unpaidOrders.map(order => {
                            const originObj = typeof order.origin === 'object' && order.origin !== null ? (order.origin as LocationDetail) : null;
                            const originAddress = originObj?.address || (typeof order.origin === 'string' ? order.origin : "-");
                            let destAddress = order.destination || "-";
                            if (order.destinations && order.destinations.length > 0) destAddress = order.destinations.length > 1 ? `${order.destinations.length} Titik Tujuan` : (order.destinations[0].address || "Tujuan");
                            const amount = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;

                            return (
                              <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-5 pl-8 align-top">
                                  <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-100">{order.resi || order.id.substring(0,8)}</span>
                                </td>
                                <td className="p-5 align-top max-w-[200px]">
                                  <div className="space-y-1.5 text-xs font-bold text-slate-600">
                                    <p className="truncate flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0"/> {originAddress}</p>
                                    <p className="truncate flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0"/> {destAddress}</p>
                                  </div>
                                </td>
                                <td className="p-5 pr-8 align-top text-right">
                                  <span className="text-sm font-black text-slate-900">{formatRupiah(amount)}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm lg:sticky lg:top-28 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600" /> Pelunasan Massal</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">Lunasi seluruh tagihan tertunda dengan mengunggah satu bukti transfer.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-inner">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Harus Dibayar</span>
                    <span className="text-xl font-black text-red-600">{formatRupiah(totalDebt)}</span>
                  </div>

                  <label className={cn("border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors min-h-[200px] relative overflow-hidden group", unpaidOrders.length === 0 ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed" : "border-slate-300 hover:border-indigo-500 bg-slate-50 cursor-pointer hover:bg-indigo-50/30")}>
                    <input type="file" accept="image/*" disabled={unpaidOrders.length === 0} onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReceiptFile(e.target.files[0]);
                        setReceiptPreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }} className="hidden" />
                    
                    <AnimatePresence mode="wait">
                      {receiptPreview ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-slate-900 p-2 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={receiptPreview} alt="Pratinjau" className="max-w-full max-h-full object-contain rounded-xl" />
                        </motion.div>
                      ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                          <Upload className="w-8 h-8 text-slate-400 mx-auto group-hover:text-indigo-600 transition-colors" />
                          <p className="text-xs font-bold text-slate-700">Pilih file bukti transfer (Maks 5MB)</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </label>

                  <Button onClick={handleBulkPayment} disabled={isUploadingBulk || unpaidOrders.length === 0 || !receiptFile} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/20 text-sm rounded-xl transition-all">
                    {isUploadingBulk ? "Memproses..." : "Konfirmasi Pembayaran"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: DEPOSIT (PRABAYAR) */}
          {activeTab === "deposit" && (
            <motion.div key="deposit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Info Saldo Deposit Card */}
              <div className="bg-gradient-to-br from-[#10b981] to-[#047857] text-white p-8 md:p-10 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[300px]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Saldo Prabayar Tersedia</p>
                      <p className="text-sm font-medium text-emerald-50">Dapat digunakan untuk bayar instan.</p>
                    </div>
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-md">
                    {formatRupiah(depositBalance)}
                  </h3>
                </div>
              </div>

              {/* Form Pengajuan Top Up */}
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm">
                <div className="border-b border-slate-100 pb-5 mb-6 flex items-center gap-3">
                  <PlusCircle className="w-6 h-6 text-emerald-600" />
                  <h2 className="text-xl font-black text-slate-900">Isi Saldo (Top-Up)</h2>
                </div>

                <form onSubmit={handleTopupSubmit} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">Masukkan Nominal (Rp)</label>
                    <input 
                      type="number" 
                      required min="50000"
                      value={topupAmount} 
                      onChange={(e) => setTopupAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-4 text-slate-900 text-2xl font-black outline-none transition-all text-center focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50" 
                      placeholder="0" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-widest">Unggah Bukti Transfer</label>
                    <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 hover:bg-emerald-50/50 min-h-[150px] relative overflow-hidden">
                      <input type="file" accept="image/*" ref={topupFileInputRef} onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setTopupFile(e.target.files[0]);
                          setTopupPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }} className="hidden" />
                      
                      {topupPreview ? (
                        <div className="absolute inset-0 bg-slate-900 p-2 flex items-center justify-center z-10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={topupPreview} alt="Bukti Topup" className="max-h-full rounded-lg object-contain" />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                          <p className="text-xs font-bold text-slate-600">Klik untuk upload bukti</p>
                        </div>
                      )}
                    </label>
                  </div>

                  <Button type="submit" disabled={isSubmittingTopup || !topupFile} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all">
                    {isSubmittingTopup ? "Mengajukan Top-Up..." : "Ajukan Top-Up Saldo"}
                  </Button>
                </form>
              </div>

            </motion.div>
          )}

          {/* TAB 3: BUKU BESAR (LEDGER / RIWAYAT) */}
          {activeTab === "riwayat" && (
            <motion.div key="riwayat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden min-h-[500px]">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-600" /> Buku Besar Transaksi (Ledger)
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-medium">Riwayat mutasi saldo deposit dan pergerakan finansial Anda.</p>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                {ledgerLogs.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                    <Activity className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Belum ada riwayat transaksi finansial pada akun Anda.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                        <th className="p-5 pl-8">Tanggal & Waktu</th>
                        <th className="p-5">Deskripsi Mutasi</th>
                        <th className="p-5">Status</th>
                        <th className="p-5 pr-8 text-right">Nominal (IDR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerLogs.map((log) => {
                        const isIncome = log.type.includes('topup') || log.type === 'deposit';
                        
                        return (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-5 pl-8 align-top text-xs font-bold text-slate-600">
                              {log.dateStr}
                            </td>
                            <td className="p-5 align-top max-w-[250px]">
                              <p className="font-bold text-slate-900 text-sm mb-1 capitalize flex items-center gap-2">
                                {isIncome ? <ArrowDownCircle className="w-4 h-4 text-emerald-500" /> : <ArrowUpCircle className="w-4 h-4 text-red-500" />}
                                {log.type.replace('_', ' ')}
                              </p>
                              <p className="text-xs text-slate-500 leading-relaxed truncate">{log.note}</p>
                            </td>
                            <td className="p-5 align-top">
                              <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-1 ${
                                log.status === 'Success' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                log.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                'bg-red-50 text-red-600 border-red-200'
                              }`}>
                                {log.status === 'Success' && <CheckCircle2 className="w-3 h-3" />}
                                {log.status === 'Pending' && <Clock className="w-3 h-3" />}
                                {log.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                                {log.status}
                              </span>
                            </td>
                            <td className="p-5 pr-8 align-top text-right">
                              <span className={`text-base font-black ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isIncome ? '+' : '-'}{formatRupiah(log.amount)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </main>
  );
}