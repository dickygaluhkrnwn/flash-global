"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle2, AlertCircle, 
  ShieldAlert, ArrowLeft, Banknote, 
  Upload, Building2, QrCode, Copy, X, Smartphone
} from "lucide-react";

import { db } from "@/lib/firebase";
// 🚀 FIX IMPORT: Tambahkan writeBatch dan increment
import { doc, collection, addDoc, serverTimestamp, query, where, onSnapshot, getDoc, writeBatch, increment } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getDriverUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('driver.flashglobalslogistik.com')) {
    let cleanPath = path.replace(/^\/driver\/mobile/, '');
    cleanPath = cleanPath.replace(/^\/driver/, '');
    return cleanPath || '/';
  }
  if (path.startsWith('/driver') && !path.startsWith('/driver/mobile')) {
    return path.replace('/driver', '/driver/mobile');
  }
  return path;
};

const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

// FUNGSI HELPER PENJINAK WAKTU TYPE-SAFE
const getSafeMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj.toDate === 'function') {
      const dateObj = obj.toDate() as Date;
      return dateObj.getTime();
    }
  }
  return new Date(String(ts)).getTime();
};

interface LedgerLog {
  id: string;
  type: "Withdrawal" | "TopUp" | "Income" | "Deduction";
  amount: number;
  status: "Pending" | "Processing" | "Disetujui" | "Ditolak" | "Success";
  timestamp: unknown; 
  description?: string;
}

interface PaymentMethod {
  bankName: string;
  accountNumber: string;
  accountName: string;
  color: string;
}

interface PaymentConfig {
  transferBank: PaymentMethod[];
  qrisImageUrl: string | null;
}

export default function DriverWalletPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const topupFileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [vendorName, setVendorName] = useState<string>("");
  const [partnerType, setPartnerType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  // 🚀 STATE UNTUK LOGS
  const [withdrawLogs, setWithdrawLogs] = useState<LedgerLog[]>([]);
  const [topupLogs, setTopupLogs] = useState<LedgerLog[]>([]);
  const [mutationLogs, setMutationLogs] = useState<LedgerLog[]>([]);
  
  // Gabungkan semua riwayat dan urutkan dari yang terbaru
  const historyLogs = [...withdrawLogs, ...topupLogs, ...mutationLogs].sort((a, b) => getSafeMillis(b.timestamp) - getSafeMillis(a.timestamp));
  
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null); 
  
  // STATE MODALS
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false); 

  // 🚀 FASE 2: STATE BARU UNTUK METODE PENARIKAN (MANUAL VS DANA)
  const [withdrawMethod, setWithdrawMethod] = useState<"Manual_Bank" | "DANA_API">("Manual_Bank");
  const [withdrawAmount, setWithdrawAmount] = useState<number | "">("");
  const [wdBankName, setWdBankName] = useState("");
  const [wdAccountNumber, setWdAccountNumber] = useState("");
  const [wdAccountName, setWdAccountName] = useState("");

  const [topupAmount, setTopupAmount] = useState<number | "">("");
  const [topupFile, setTopupFile] = useState<File | null>(null);
  const [topupPreview, setTopupPreview] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!user) return;

    // 1. Tarik Saldo
    const walletRef = doc(db, "driver_wallets", user.uid);
    const unsubWallet = onSnapshot(walletRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance(data.balance || 0);
        setPartnerType(data.partnerType || "Individual");
        if (data.vendorName) setVendorName(data.vendorName);
      }
      setIsLoading(false);
    });

    // 2. Tarik Riwayat Pengajuan Penarikan
    const withdrawQ = query(collection(db, "withdrawal_requests"), where("driverId", "==", user.uid));
    const unsubWithdrawals = onSnapshot(withdrawQ, (snapshot) => {
      const logs: LedgerLog[] = snapshot.docs.map(doc => ({
        id: doc.id, type: "Withdrawal", description: "Pengajuan Penarikan Dana", ...doc.data()
      })) as LedgerLog[];
      setWithdrawLogs(logs);
    });

    // 3. Tarik Riwayat Pengajuan Top-up
    const topupQ = query(collection(db, "deposit_requests"), where("userId", "==", user.uid));
    const unsubTopups = onSnapshot(topupQ, (snapshot) => {
      const logs: LedgerLog[] = snapshot.docs.map(doc => ({
        id: doc.id, type: "TopUp", description: "Pengisian Saldo Dompet", ...doc.data()
      })) as LedgerLog[];
      setTopupLogs(logs);
    });

    // 4. Tarik Mutasi Asli dari Wallet Logs
    const logsQ = query(collection(db, "wallet_logs"), where("userId", "==", user.uid));
    const unsubLogs = onSnapshot(logsQ, (snapshot) => {
      const logs: LedgerLog[] = snapshot.docs.map(doc => {
        const data = doc.data();
        let uiType: LedgerLog["type"] = "Income";
        if (data.type === "deduction") uiType = "Deduction";
        else if (data.type === "deposit" || data.type === "credit_payment") uiType = "Income";

        return {
          id: doc.id,
          type: uiType,
          amount: data.amount,
          status: "Success",
          timestamp: data.createdAt,
          description: data.description || (uiType === "Income" ? "Pendapatan Order" : "Pemotongan Saldo")
        };
      });
      setMutationLogs(logs);
    });

    const fetchPaymentConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "payments"));
        if (snap.exists()) setPaymentConfig(snap.data() as PaymentConfig);
      } catch (error) {
        console.error("Gagal menarik metode pembayaran", error);
      }
    };

    fetchPaymentConfig();
    
    return () => {
      unsubWallet();
      unsubWithdrawals();
      unsubTopups();
      unsubLogs(); 
    };
  }, [user]);

  // 🚀 LOGIKA PENGAJUAN PENARIKAN DANA DENGAN METHOD & PEMOTONGAN SALDO
  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !withdrawAmount) return;

    const amount = Number(withdrawAmount);
    if (amount < 50000) return showToast("error", "Minimal penarikan adalah Rp 50.000");
    if (amount > balance) return showToast("error", "Saldo tidak mencukupi untuk nominal tersebut.");

    // Validasi ekstra berdasarkan metode
    if (withdrawMethod === "Manual_Bank") {
      if (!wdBankName.trim() || !wdAccountNumber.trim() || !wdAccountName.trim()) {
        return showToast("error", "Lengkapi data rekening bank Anda.");
      }
    } else {
      if (!wdAccountNumber.trim()) {
        return showToast("error", "Masukkan nomor HP DANA Anda.");
      }
      // DANA selalu pakai format nomor HP
      if (wdAccountNumber.length < 9) return showToast("error", "Nomor DANA tidak valid.");
    }

    setIsProcessing(true);
    try {
      const payload: Record<string, unknown> = {
        driverId: user.uid,
        amount: amount,
        status: "Pending",
        timestamp: serverTimestamp(),
        method: withdrawMethod,
        accountNumber: wdAccountNumber
      };

      if (withdrawMethod === "Manual_Bank") {
        payload.bankName = wdBankName;
        payload.accountName = wdAccountName;
      }

      // 🚀 SUB-ROADMAP LANGKAH 1: KUNCI SALDO (BATCH WRITE)
      const batch = writeBatch(db);
      
      // 1. Buat record request penarikan
      const newWithdrawRef = doc(collection(db, "withdrawal_requests"));
      batch.set(newWithdrawRef, payload);

      // 2. Langsung potong saldo dari driver_wallets
      const walletRef = doc(db, "driver_wallets", user.uid);
      batch.update(walletRef, {
        balance: increment(-amount),
        lastMutasi: serverTimestamp()
      });

      // Commit transaksinya!
      await batch.commit();

      showToast("success", "Pengajuan penarikan dana berhasil dikirim!");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setWdBankName("");
      setWdAccountNumber("");
      setWdAccountName("");
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal mengirim pengajuan penarikan.");
    } finally {
      setIsProcessing(false);
    }
  };

  // LOGIKA PENGAJUAN TOP-UP SALDO
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !topupAmount) return;
    if (!topupFile) return showToast("error", "Harap unggah bukti transfer/pembayaran.");
    
    const amount = Number(topupAmount);
    if (amount < 20000) return showToast("error", "Minimal Top-Up adalah Rp 20.000");

    setIsProcessing(true);
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
        userId: user.uid,
        clientName: user.displayName || "Sopir Flash Global",
        amount: amount,
        proofUrl: finalProofUrl,
        status: "Pending",
        createdAt: serverTimestamp() 
      });

      showToast("success", "Pengajuan Top-Up berhasil! Menunggu verifikasi tim Finance.");
      setTopupAmount("");
      setTopupFile(null);
      setTopupPreview(null);
      setShowTopupModal(false);
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memproses pengajuan Top-Up.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Disetujui" || status === "Success") return "bg-emerald-50 text-emerald-600 border-emerald-200";
    if (status === "Ditolak") return "bg-red-50 text-red-600 border-red-200";
    if (status === "Processing") return "bg-blue-50 text-blue-600 border-blue-200 animate-pulse";
    return "bg-amber-50 text-amber-600 border-amber-200";
  };

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin shadow-sm mb-3"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Menghubungkan Brankas...</p>
      </div>
    );
  }

  // 🚀 RENDER MODALS DI DALAM PORTAL (TUTUP BOTTOM BAR GLOBAL)
  const renderModals = () => {
    if (!mounted) return null;
    return createPortal(
      <>
        {/* ======================================================== */}
        {/* MODAL PENARIKAN DANA (BOTTOM SHEET)                      */}
        {/* ======================================================== */}
        <AnimatePresence>
          {showWithdrawModal && (
            <div className="fixed inset-0 z-[999999] flex items-end justify-center font-sans">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowWithdrawModal(false)}></motion.div>
              
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-white/90 backdrop-blur-2xl border-t border-white rounded-t-[2.5rem] w-full max-w-md relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] flex flex-col max-h-[85vh]"
              >
                <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 bg-slate-300/80 rounded-full" />
                </div>

                <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <ArrowDownCircle className={cn("w-5 h-5", partnerType === "Vendor" ? "text-blue-600" : "text-[#7A171D]")} /> Penarikan Dana
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Tarik Saldo ke Rekening</p>
                  </div>
                  <button onClick={() => setShowWithdrawModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors active:scale-90 tap-highlight-transparent"><X size={18} strokeWidth={2.5}/></button>
                </div>

                <div className="px-6 py-6 overflow-y-auto flex-1 no-scrollbar">
                  <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-200 mb-6 flex justify-between items-center shadow-inner">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Tersedia</span>
                    <span className="text-xl font-mono font-black text-slate-900 tracking-tight">
                      Rp {balance.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <form id="form-withdraw" onSubmit={handleWithdrawRequest} className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Nominal Penarikan (Rp)</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-black text-xl z-10">Rp</span>
                        <Input 
                          type="number" 
                          required 
                          min="50000"
                          max={balance}
                          value={withdrawAmount} 
                          onChange={(e) => setWithdrawAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                          className={cn(
                            "pl-14 font-mono font-black text-2xl h-16 rounded-[1.5rem] bg-white",
                            partnerType === "Vendor" ? "focus-visible:border-blue-600 focus-visible:ring-blue-600/20" : "focus-visible:border-[#7A171D] focus-visible:ring-[#7A171D]/20"
                          )}
                          placeholder="0" 
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest pl-2">Minimal penarikan Rp 50.000</p>
                    </div>

                    {partnerType === "FleetDriver" && vendorName ? (
                      <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 p-4 rounded-[1.25rem] flex gap-3 shadow-sm">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <p className="text-[10px] text-red-800 font-bold leading-relaxed">
                          Anda terdaftar sebagai <b className="font-black">Sopir Vendor PT {vendorName}</b>. Dana yang ditarik akan ditransfer ke rekening Perusahaan.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-slate-100/80 p-1 rounded-2xl flex relative shadow-inner mb-4">
                          <button 
                            type="button" 
                            onClick={() => setWithdrawMethod("Manual_Bank")}
                            className={cn("flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2", withdrawMethod === "Manual_Bank" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
                          >
                            <Building2 className="w-3.5 h-3.5" /> Transfer Bank
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setWithdrawMethod("DANA_API")}
                            className={cn("flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2", withdrawMethod === "DANA_API" ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" : "text-slate-500")}
                          >
                            <Smartphone className="w-3.5 h-3.5" /> Saldo DANA
                          </button>
                        </div>

                        <AnimatePresence mode="wait">
                          {withdrawMethod === "Manual_Bank" ? (
                            <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                              <div>
                                <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">Nama Bank</label>
                                <Input required placeholder="Cth: BCA / Mandiri / BNI" value={wdBankName} onChange={(e) => setWdBankName(e.target.value)} className="bg-white rounded-xl" />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">Nomor Rekening</label>
                                <Input required type="number" placeholder="Cth: 1234567890" value={wdAccountNumber} onChange={(e) => setWdAccountNumber(e.target.value)} className="bg-white rounded-xl font-mono font-bold tracking-widest" />
                              </div>
                              <div>
                                <label className="text-[10px] font-black text-slate-500 mb-1.5 block uppercase tracking-widest">Atas Nama (Sesuai Buku Tabungan)</label>
                                <Input required placeholder="Cth: Budi Santoso" value={wdAccountName} onChange={(e) => setWdAccountName(e.target.value.toUpperCase())} className="bg-white rounded-xl uppercase" />
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div key="dana" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                                <label className="text-[10px] font-black text-blue-800 mb-2 block uppercase tracking-widest flex items-center gap-1.5">
                                  <Smartphone className="w-3.5 h-3.5"/> Nomor HP Terdaftar di DANA
                                </label>
                                <Input required type="number" placeholder="Cth: 08123456789" value={wdAccountNumber} onChange={(e) => setWdAccountNumber(e.target.value)} className="bg-white rounded-xl font-mono font-black text-lg tracking-widest text-blue-900 border-blue-200 focus-visible:ring-blue-500/20" />
                                <p className="text-[9px] text-blue-600/70 font-bold mt-2 leading-relaxed">Dana akan ditransfer secara instan oleh sistem ke akun DANA Anda setelah disetujui.</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </form>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white/90 backdrop-blur-md pb-safe">
                  <Button 
                    type="submit" 
                    form="form-withdraw" 
                    disabled={isProcessing || !withdrawAmount || withdrawAmount > balance} 
                    variant="primary"
                    size="lg"
                    className={cn(
                      "w-full h-14 text-sm gap-2 shadow-lg",
                      partnerType === "Vendor" ? "bg-gradient-to-b from-blue-600 to-blue-700 border-blue-800 shadow-blue-600/30" : "bg-gradient-to-b from-[#9A242B] to-[#7A171D] border-[#5A0E13] shadow-[#7A171D]/30"
                    )}
                  >
                    {isProcessing ? "Memproses..." : "Ajukan Penarikan Dana"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* MODAL ISI SALDO (TOP-UP BOTTOM SHEET)                    */}
        {/* ======================================================== */}
        <AnimatePresence>
          {showTopupModal && (
            <div className="fixed inset-0 z-[999999] flex items-end justify-center font-sans">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowTopupModal(false)}></motion.div>
              
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-white/90 backdrop-blur-2xl border-t border-white rounded-t-[2.5rem] w-full max-w-md relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]"
              >
                <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 bg-slate-300/80 rounded-full" />
                </div>

                <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <ArrowUpCircle className="w-5 h-5 text-[#C5A059]" /> Isi Saldo (Top-Up)
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Deposit untuk Order COD</p>
                  </div>
                  <button onClick={() => setShowTopupModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors active:scale-90 tap-highlight-transparent"><X size={18} strokeWidth={2.5}/></button>
                </div>

                <div className="px-6 py-6 overflow-y-auto flex-1 no-scrollbar space-y-6">
                  
                  {/* METODE PEMBAYARAN DARI ADMIN */}
                  <div className="space-y-4">
                    {paymentConfig?.qrisImageUrl && (
                      <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 text-center shadow-inner">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <QrCode className="w-4 h-4 text-[#7A171D]"/>
                          <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Scan QRIS (Otomatis)</p>
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={paymentConfig.qrisImageUrl} alt="QRIS" className="w-48 h-48 object-contain mx-auto rounded-[1.25rem] border-2 border-white shadow-md bg-white p-2" />
                      </div>
                    )}

                    {paymentConfig?.transferBank && paymentConfig.transferBank.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 block uppercase tracking-widest">Transfer Bank Manual</label>
                        {paymentConfig.transferBank.map((bank, idx) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-[1.25rem] p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-start gap-3.5">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800 tracking-tight">{bank.bankName}</p>
                                <p className="text-sm font-mono font-black text-slate-600 my-0.5 tracking-tight">{bank.accountNumber}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">A.N: {bank.accountName}</p>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => {
                                navigator.clipboard.writeText(bank.accountNumber);
                                showToast("success", "Nomor rekening disalin!");
                              }}
                              className="p-2.5 bg-slate-50 text-slate-500 rounded-[1rem] hover:bg-slate-100 hover:text-blue-600 transition-colors border border-slate-200 active:scale-90"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <form id="form-topup" onSubmit={handleTopupSubmit} className="space-y-6 border-t border-slate-100 pt-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Masukkan Nominal Transfer (Rp)</label>
                      <Input 
                        type="number" 
                        required min="20000"
                        value={topupAmount} 
                        onChange={(e) => setTopupAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                        className="w-full text-2xl font-black font-mono text-center h-16 rounded-[1.5rem] bg-white focus-visible:ring-[#C5A059]/20 focus-visible:border-[#C5A059]" 
                        placeholder="0" 
                      />
                      <p className="text-[9px] text-amber-600 font-bold mt-2 text-center uppercase tracking-widest bg-amber-50 py-1.5 rounded-lg border border-amber-100">Minimal Top-Up adalah Rp 20.000</p>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Upload Bukti Transfer</label>
                      <label className={cn(
                        "border-2 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative overflow-hidden group min-h-[160px]",
                        topupPreview ? "border-[#C5A059]" : "border-slate-200 border-dashed bg-slate-50 hover:border-[#C5A059] hover:bg-[#C5A059]/5"
                      )}>
                        <input type="file" accept="image/*" ref={topupFileInputRef} onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setTopupFile(e.target.files[0]);
                            setTopupPreview(URL.createObjectURL(e.target.files[0]));
                          }
                        }} className="hidden" />
                        
                        {topupPreview ? (
                          <div className="absolute inset-0 bg-slate-900/80 p-2 flex items-center justify-center z-10 backdrop-blur-sm">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={topupPreview} alt="Bukti Topup" className="max-h-full rounded-xl object-contain shadow-lg border border-white/20" />
                          </div>
                        ) : (
                          <div className="space-y-2 relative z-10">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto border border-slate-200 shadow-sm group-hover:scale-110 transition-transform">
                              <Upload className="w-5 h-5 text-slate-400 group-hover:text-[#C5A059] transition-colors" />
                            </div>
                            <p className="text-xs font-black text-slate-600 tracking-tight">Ketuk untuk pilih foto bukti transfer</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </form>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white/90 backdrop-blur-md pb-safe">
                  <Button 
                    type="submit" 
                    form="form-topup" 
                    variant="gold"
                    size="lg"
                    disabled={isProcessing || !topupFile} 
                    className="w-full h-14 shadow-lg shadow-[#C5A059]/30"
                  >
                    {isProcessing ? "Mengirim..." : "Kirim Pengajuan Saldo"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>,
      document.body
    );
  };

  return (
    <div className="min-h-screen font-sans pb-28 flex flex-col relative tap-highlight-transparent">
      
      {/* 🚀 TOAST APPLE STYLE */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -50, scale: 0.95 }} className={cn(
            "fixed top-4 left-4 right-4 z-[99999] p-4 rounded-[1.25rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 backdrop-blur-md border",
            toast.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"
          )}>
            {toast.type === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <p className="text-sm font-bold tracking-tight">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER MODAL MELALUI PORTAL */}
      {renderModals()}

      {/* 🚀 HEADER & SALDO CARD (GLASSMORPHISM BLACK CARD) */}
      <div className={cn("px-5 pt-8 pb-12 text-white rounded-b-[3rem] shadow-xl relative overflow-hidden", "bg-slate-900")}>
        {/* Glow Effects */}
        <div className="absolute top-[-20px] right-[-20px] w-48 h-48 bg-[#C5A059] rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
        <div className={cn("absolute bottom-[-20px] left-[-20px] w-32 h-32 rounded-full blur-[60px] opacity-30 pointer-events-none", partnerType === "Vendor" ? "bg-blue-600" : "bg-[#7A171D]")}></div>

        <div className="flex items-center justify-between mb-8 relative z-10">
          <button onClick={() => router.push(getDriverUrl("/driver/dashboard"))} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-[1rem] hover:bg-white/20 transition-colors border border-white/10 shadow-sm active:scale-90">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <span className="font-mono text-[10px] font-black bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
            <Wallet className="w-3.5 h-3.5" /> Dompet Digital
          </span>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
            Total Saldo Tersedia
          </p>
          <h1 className="text-5xl font-black font-mono tracking-tight flex items-start gap-1 drop-shadow-md">
            <span className="text-2xl text-slate-400 mt-1.5 font-sans">Rp</span>
            {balance.toLocaleString('id-ID')}
          </h1>
          
          {partnerType === "FleetDriver" && vendorName && (
             <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-200 bg-amber-900/60 backdrop-blur-md border border-amber-700/50 px-3 py-1.5 rounded-full shadow-sm">
               <ShieldAlert className="w-3.5 h-3.5" /> Hak Akses di bawah naungan PT {vendorName}
             </div>
          )}
        </div>
      </div>

      {/* 🚀 ACTION BUTTONS (MELAYANG DI ANTARA HEADER & BODY) */}
      <div className="px-5 -mt-6 relative z-20 flex gap-4 max-w-sm mx-auto w-full">
        <button 
          onClick={() => setShowWithdrawModal(true)}
          className="flex-1 glass-card bg-white/90 backdrop-blur-xl border border-white hover:bg-white text-slate-800 font-black py-4 rounded-[1.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <ArrowDownCircle className={cn("w-6 h-6", partnerType === "Vendor" ? "text-blue-600" : "text-[#7A171D]")} strokeWidth={2.5} /> 
          <span className="text-xs tracking-tight">Tarik Tunai</span>
        </button>
        <button 
          onClick={() => setShowTopupModal(true)}
          className="flex-1 bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-white font-black py-4 rounded-[1.5rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_30px_rgba(197,160,89,0.3)] border border-[#A68345] flex flex-col items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <ArrowUpCircle className="w-6 h-6" strokeWidth={2.5} /> 
          <span className="text-xs tracking-tight">Isi Saldo</span>
        </button>
      </div>

      <main className="flex-1 p-5 mt-2 w-full max-w-md mx-auto relative z-10">
        
        {/* 🚀 RIWAYAT HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 px-1 mb-4">
          <h2 className="text-sm font-black text-slate-800 tracking-tight">Riwayat Transaksi</h2>
        </div>

        {/* 🚀 CONTENT AREA RIWAYAT */}
        <div className="space-y-3">
          {historyLogs.length === 0 ? (
            <div className="glass-card bg-white/40 border border-slate-200 border-dashed rounded-[2rem] p-10 text-center flex flex-col items-center mt-2">
              <div className="w-16 h-16 bg-slate-100 rounded-[1.25rem] flex items-center justify-center mb-4 border border-white shadow-sm">
                <Banknote className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-black text-slate-800 tracking-tight">Brankas Kosong</p>
              <p className="text-xs font-medium text-slate-500 mt-1 max-w-[200px] leading-relaxed">Belum ada riwayat penarikan maupun pengisian saldo.</p>
            </div>
          ) : (
            historyLogs.map((log) => {
              const millis = getSafeMillis(log.timestamp);
              const dateStr = millis > 0 ? new Date(millis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Baru saja";
              const isIncome = log.type === "TopUp" || log.type === "Income";

              return (
                <div key={log.id} className="glass-card bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center justify-between gap-3 relative overflow-hidden active:scale-[0.98] transition-transform cursor-default">
                  {/* Indikator Warna Status */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    log.status === 'Disetujui' || log.status === 'Success' ? 'bg-emerald-500' : 
                    log.status === 'Ditolak' ? 'bg-red-500' : 
                    log.status === 'Processing' ? 'bg-blue-500' : 'bg-amber-400'
                  )}></div>
                  
                  <div className="flex-1 pl-3">
                    <p className="text-sm font-black text-slate-800 flex items-center gap-1.5 tracking-tight mb-0.5 line-clamp-1">
                      {isIncome ? <ArrowUpCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <ArrowDownCircle className={cn("w-4 h-4 shrink-0", partnerType === "Vendor" ? "text-blue-600" : "text-[#7A171D]")} />}
                      {log.description || (isIncome ? 'Pendapatan Saldo' : 'Potongan Saldo')}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dateStr}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                    <p className={cn("text-sm font-black font-mono tracking-tight", isIncome ? 'text-emerald-600' : partnerType === "Vendor" ? 'text-blue-600' : 'text-[#7A171D]')}>
                      {isIncome ? '+' : '-'} {formatRupiah(log.amount)}
                    </p>
                    <span className={cn("px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-md", getStatusBadge(log.status))}>
                      {log.status === "Pending" ? "Menunggu" : log.status === "Processing" ? "Proses Bank" : log.status === "Success" ? "Selesai" : log.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}