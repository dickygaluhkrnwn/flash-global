"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, ArrowDownCircle, ArrowUpCircle, CheckCircle2, AlertCircle, 
  ShieldAlert, ArrowLeft, RefreshCw, Banknote, 
  Upload, PlusCircle, Building2, QrCode, Copy
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDocs, collection, addDoc, serverTimestamp, query, where, onSnapshot, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

// 🚀 FUNGSI HELPER PENJINAK WAKTU TYPE-SAFE
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
  type: "Withdrawal" | "TopUp";
  amount: number;
  status: "Pending" | "Disetujui" | "Ditolak";
  timestamp: unknown; // 🚀 Ganti any ke unknown
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

  const [balance, setBalance] = useState<number>(0);
  const [vendorName, setVendorName] = useState<string>("");
  const [partnerType, setPartnerType] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  
  const [historyLogs, setHistoryLogs] = useState<LedgerLog[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null); // 🚀 State Data Pembayaran
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"riwayat" | "topup">("riwayat");

  // Withdrawal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number | "">("");
  
  // Topup State
  const [topupAmount, setTopupAmount] = useState<number | "">("");
  const [topupFile, setTopupFile] = useState<File | null>(null);
  const [topupPreview, setTopupPreview] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!user) return;

    // 1. Live Listener untuk Saldo Dompet
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

    // 2. Fetch Riwayat Transaksi
    const fetchHistory = async () => {
      try {
        const combinedLogs: LedgerLog[] = [];

        // Fetch Withdrawals
        const wSnap = await getDocs(query(collection(db, "withdrawal_requests"), where("driverId", "==", user.uid)));
        wSnap.forEach(d => {
          combinedLogs.push({ id: d.id, type: "Withdrawal", ...d.data() } as LedgerLog);
        });

        // Fetch TopUps (Deposit Requests)
        const tSnap = await getDocs(query(collection(db, "deposit_requests"), where("userId", "==", user.uid)));
        tSnap.forEach(d => {
          combinedLogs.push({ id: d.id, type: "TopUp", ...d.data() } as LedgerLog);
        });

        // Sorting: Terbaru ke terlama menggunakan helper penjinak
        combinedLogs.sort((a, b) => getSafeMillis(b.timestamp) - getSafeMillis(a.timestamp));
        setHistoryLogs(combinedLogs);
      } catch (e) {
        console.error("Gagal menarik riwayat transaksi:", e);
      }
    };

    // 3. 🚀 Fetch Data Metode Pembayaran dari Admin
    const fetchPaymentConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "payments"));
        if (snap.exists()) setPaymentConfig(snap.data() as PaymentConfig);
      } catch (error) {
        console.error("Gagal menarik metode pembayaran", error);
      }
    };

    fetchHistory();
    fetchPaymentConfig();
    
    return () => unsubWallet();
  }, [user]);

  // =======================================================================
  // LOGIKA PENGAJUAN PENARIKAN DANA
  // =======================================================================
  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !withdrawAmount) return;

    const amount = Number(withdrawAmount);
    if (amount < 50000) {
      showToast("error", "Minimal penarikan adalah Rp 50.000");
      return;
    }
    if (amount > balance) {
      showToast("error", "Saldo tidak mencukupi untuk nominal tersebut.");
      return;
    }

    setIsProcessing(true);
    try {
      await addDoc(collection(db, "withdrawal_requests"), {
        driverId: user.uid,
        amount: amount,
        status: "Pending",
        timestamp: serverTimestamp()
      });

      setHistoryLogs(prev => [
        { id: "temp-" + Date.now(), type: "Withdrawal", amount: amount, status: "Pending", timestamp: new Date() },
        ...prev
      ]);

      showToast("success", "Pengajuan penarikan dana berhasil dikirim ke Admin!");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal mengirim pengajuan penarikan.");
    } finally {
      setIsProcessing(false);
    }
  };

  // =======================================================================
  // LOGIKA PENGAJUAN TOP-UP SALDO
  // =======================================================================
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !topupAmount) return;

    if (!topupFile) {
      showToast("error", "Harap unggah bukti transfer/pembayaran.");
      return;
    }
    
    const amount = Number(topupAmount);
    if (amount < 20000) {
      showToast("error", "Minimal Top-Up adalah Rp 20.000");
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Upload Gambar ke Cloudinary
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

      // 2. Simpan Request ke Firebase (deposit_requests)
      await addDoc(collection(db, "deposit_requests"), {
        userId: user.uid,
        clientName: user.displayName || "Sopir Flash Global",
        amount: amount,
        proofUrl: finalProofUrl,
        status: "Pending",
        createdAt: serverTimestamp() 
      });

      // Optimistic UI Update
      setHistoryLogs(prev => [
        { id: "temp-topup-" + Date.now(), type: "TopUp", amount: amount, status: "Pending", timestamp: new Date() },
        ...prev
      ]);

      showToast("success", "Pengajuan Top-Up berhasil! Menunggu verifikasi tim Finance.");
      setTopupAmount("");
      setTopupFile(null);
      setTopupPreview(null);
      setActiveTab("riwayat");
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memproses pengajuan Top-Up.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: "Pending" | "Disetujui" | "Ditolak") => {
    if (status === "Disetujui") return "bg-emerald-50 text-emerald-600 border-emerald-200";
    if (status === "Ditolak") return "bg-red-50 text-red-600 border-red-200";
    return "bg-amber-50 text-amber-600 border-amber-200 animate-pulse";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#7A171D] animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Menghubungkan Brankas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans pb-28 flex flex-col relative">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-4 left-4 right-4 z-[99999] p-4 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md border ${toast.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"}`}>
            {toast.type === "success" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <p className="text-sm font-bold leading-tight">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER & SALDO CARD */}
      <div className="bg-slate-900 px-5 pt-8 pb-10 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059] rounded-full blur-[80px] opacity-20"></div>
        <div className="absolute bottom-[-20px] left-[-20px] w-32 h-32 bg-[#7A171D] rounded-full blur-[60px] opacity-40"></div>

        <div className="flex items-center justify-between mb-8 relative z-10">
          <button onClick={() => router.push("/driver/dashboard")} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="font-mono text-[10px] font-black bg-white/10 border border-white/20 px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1.5">
            <Wallet className="w-3 h-3" /> E-Wallet
          </span>
        </div>

        <div className="relative z-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
            Total Saldo Tersedia
          </p>
          <h1 className="text-4xl font-black font-mono tracking-tight flex items-start gap-1">
            <span className="text-xl text-slate-400 mt-1">Rp</span>
            {balance.toLocaleString('id-ID')}
          </h1>
          
          {partnerType === "FleetDriver" && vendorName && (
             <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-300 bg-amber-900/40 border border-amber-700/50 px-2.5 py-1 rounded-md">
               <ShieldAlert className="w-3 h-3" /> Akun di bawah naungan PT {vendorName}
             </div>
          )}
        </div>
      </div>

      {/* ACTION BUTTONS (SPLIT 50:50) */}
      <div className="px-5 -mt-6 relative z-20 flex gap-3">
        <button 
          onClick={() => setShowWithdrawModal(true)}
          className="flex-1 bg-white hover:bg-slate-50 text-slate-800 font-black py-4 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-1.5 transition-transform active:scale-95 border border-slate-200"
        >
          <ArrowDownCircle className="w-5 h-5 text-[#7A171D]" /> 
          <span className="text-xs">Tarik Tunai</span>
        </button>
        <button 
          onClick={() => setActiveTab("topup")}
          className="flex-1 bg-[#C5A059] hover:bg-[#A68345] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#C5A059]/30 flex flex-col items-center justify-center gap-1.5 transition-transform active:scale-95 border border-[#C5A059]/50"
        >
          <ArrowUpCircle className="w-5 h-5" /> 
          <span className="text-xs">Isi Saldo</span>
        </button>
      </div>

      <main className="flex-1 p-5 space-y-6 mt-2">
        
        {/* TAB NAVIGATION LOKAL */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-full relative">
          <button onClick={() => setActiveTab("riwayat")} className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg relative z-10 flex items-center justify-center gap-2 ${activeTab === "riwayat" ? "text-white" : "text-slate-500"}`}>
            Riwayat
          </button>
          <button onClick={() => setActiveTab("topup")} className={`flex-1 py-2 text-xs font-bold transition-all rounded-lg relative z-10 flex items-center justify-center gap-2 ${activeTab === "topup" ? "text-white" : "text-slate-500"}`}>
            Top-Up Saldo
          </button>
          <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-800 rounded-lg shadow-sm transition-all duration-300 ease-out ${activeTab === "riwayat" ? "left-1" : "left-[calc(50%+3px)]"}`}></div>
        </div>

        {/* CONTENT AREA */}
        <AnimatePresence mode="wait">
          {activeTab === "riwayat" ? (
            <motion.div key="riwayat" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
              <div className="space-y-3">
                {historyLogs.length === 0 ? (
                  <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-8 text-center shadow-sm flex flex-col items-center mt-4">
                    <Banknote className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">Belum Ada Transaksi</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Anda belum memiliki riwayat penarikan maupun pengisian saldo.</p>
                  </div>
                ) : (
                  historyLogs.map((log) => {
                    const millis = getSafeMillis(log.timestamp);
                    const dateStr = millis > 0 ? new Date(millis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Baru saja";
                    const isTopup = log.type === "TopUp";

                    return (
                      <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${log.status === 'Disetujui' ? 'bg-emerald-500' : log.status === 'Ditolak' ? 'bg-red-500' : 'bg-amber-400'}`}></div>
                        
                        <div className="flex-1 pl-2">
                          <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                            {isTopup ? <ArrowUpCircle className="w-4 h-4 text-emerald-500" /> : <ArrowDownCircle className="w-4 h-4 text-[#7A171D]" />}
                            {isTopup ? 'Top Up Deposit' : 'Tarik Tunai'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{dateStr}</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <p className={`text-sm font-black ${isTopup ? 'text-emerald-600' : 'text-[#7A171D]'}`}>
                            {isTopup ? '+' : '-'} {formatRupiah(log.amount)}
                          </p>
                          <span className={`mt-1 px-2 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-md ${getStatusBadge(log.status)}`}>
                            {log.status === "Pending" ? "Menunggu" : log.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          ) : (
            // ==========================================
            // FORM PENGISIAN SALDO (TOP-UP)
            // ==========================================
            <motion.div key="topup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mt-4">
              <div className="border-b border-slate-100 pb-4 mb-5 flex items-center gap-3">
                <PlusCircle className="w-5 h-5 text-[#C5A059]" />
                <h2 className="text-base font-black text-slate-900">Formulir Isi Saldo</h2>
              </div>

              {/* 🚀 MENAMPILKAN METODE PEMBAYARAN DARI ADMIN */}
              <div className="space-y-4 mb-6">
                {paymentConfig?.qrisImageUrl && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <QrCode className="w-4 h-4 text-[#7A171D]"/>
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Scan QRIS</p>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={paymentConfig.qrisImageUrl} alt="QRIS" className="w-48 h-48 object-contain mx-auto rounded-xl border border-slate-200 shadow-sm bg-white p-2" />
                  </div>
                )}

                {paymentConfig?.transferBank && paymentConfig.transferBank.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase tracking-widest mt-2">Transfer Bank Manual</label>
                    {paymentConfig.transferBank.map((bank, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">{bank.bankName}</p>
                            <p className="text-sm font-mono font-bold text-slate-600 my-0.5">{bank.accountNumber}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">A.N: {bank.accountName}</p>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            navigator.clipboard.writeText(bank.accountNumber);
                            showToast("success", "Nomor rekening disalin!");
                          }}
                          className="p-2 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleTopupSubmit} className="space-y-6 pt-5 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-2 block uppercase tracking-widest">Masukkan Nominal Transfer (Rp)</label>
                  <input 
                    type="number" 
                    required min="20000"
                    value={topupAmount} 
                    onChange={(e) => setTopupAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-4 text-slate-900 text-2xl font-black outline-none transition-all text-center focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/20" 
                    placeholder="0" 
                  />
                  <p className="text-[9px] text-slate-400 font-bold mt-2 text-center">Minimal Top-Up adalah Rp 20.000</p>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-2 block uppercase tracking-widest">Upload Bukti Transfer</label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-[#C5A059] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 hover:bg-[#C5A059]/5 min-h-[150px] relative overflow-hidden group">
                    <input type="file" accept="image/*" ref={topupFileInputRef} onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setTopupFile(e.target.files[0]);
                        setTopupPreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }} className="hidden" />
                    
                    {topupPreview ? (
                      <div className="absolute inset-0 bg-slate-900 p-2 flex items-center justify-center z-10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={topupPreview} alt="Bukti Topup" className="max-h-full rounded-lg object-contain shadow-md" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-6 h-6 text-slate-400 mx-auto group-hover:text-[#C5A059] transition-colors" />
                        <p className="text-xs font-bold text-slate-600">Ketuk untuk pilih foto</p>
                      </div>
                    )}
                  </label>
                </div>

                <Button type="submit" disabled={isProcessing || !topupFile} className="w-full h-14 bg-[#C5A059] hover:bg-[#A68345] text-white font-black text-sm rounded-xl shadow-lg shadow-[#C5A059]/20 active:scale-[0.98] transition-all">
                  {isProcessing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin"/> Mengirim...</> : "Kirim Pengajuan Saldo"}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* MODAL PENARIKAN DANA */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowWithdrawModal(false)}></motion.div>
            
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="bg-white border-t border-slate-200 rounded-t-[2rem] w-full max-w-md relative z-10 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <ArrowDownCircle className="w-5 h-5 text-[#7A171D]"/> Penarikan Dana
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Tarik Saldo ke Rekening</p>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 flex justify-between items-center shadow-inner">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saldo Tersedia</span>
                  <span className="text-lg font-black text-slate-900">
                    Rp {balance.toLocaleString('id-ID')}
                  </span>
                </div>

                <form id="form-withdraw" onSubmit={handleWithdrawRequest} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-2 block uppercase tracking-widest">Nominal Penarikan (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">Rp</span>
                      <Input 
                        type="number" 
                        required 
                        min="50000"
                        value={withdrawAmount} 
                        onChange={(e) => setWithdrawAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                        className="pl-12 font-mono font-black text-xl h-14 border-slate-200 bg-white focus-visible:border-[#7A171D] focus-visible:ring-4 focus-visible:ring-[#7A171D]/10 rounded-xl" 
                        placeholder="0" 
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold mt-2">Minimal penarikan Rp 50.000</p>
                  </div>
                  
                  {partnerType === "FleetDriver" && (
                    <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <p className="text-[10px] text-red-800 font-bold leading-relaxed">
                        Anda terdaftar sebagai <b>Sopir Vendor PT {vendorName}</b>. Dana yang Anda tarik akan ditransfer ke rekening PT, bukan ke rekening pribadi Anda.
                      </p>
                    </div>
                  )}
                </form>
              </div>

              <div className="p-5 border-t border-slate-100 bg-white">
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowWithdrawModal(false)} className="flex-1 py-3.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors shadow-sm">Batal</button>
                  <button type="submit" form="form-withdraw" disabled={isProcessing || !withdrawAmount || withdrawAmount > balance} className="flex-1 py-3.5 text-white rounded-xl font-black text-xs transition-all disabled:opacity-50 flex items-center justify-center shadow-lg active:scale-95 bg-[#7A171D] hover:bg-[#5A0E13] shadow-[#7A171D]/20">
                    {isProcessing ? "Memproses..." : "Ajukan Penarikan"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}