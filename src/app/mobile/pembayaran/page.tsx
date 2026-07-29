"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, ArrowLeft,
  QrCode, Upload, Copy, 
  CheckCircle, AlertCircle, 
  ReceiptText, CreditCard, 
  TicketPercent, X, Check
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { OrderSummary } from "@/types/order";
import { PaymentMethod, PaymentConfig } from "@/types/finance";

export default function MobilePaymentPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  const [currentOrder, setCurrentOrder] = useState<OrderSummary | null>(null);
  const [isFetchingOrder, setIsFetchingOrder] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Payment Options State
  const [activeTab, setActiveTab] = useState<"transfer" | "qris">("transfer");
  
  // FALLBACK DEFAULT: Agar halaman tidak crash jika data admin kosong
  const defaultTransferBank: PaymentMethod[] = [
    { bankName: "BCA", accountNumber: "8720516839", accountName: "PT FLASH GLOBAL LOGISTIK", color: "bg-blue-600" },
    { bankName: "MANDIRI", accountNumber: "1320087451296", accountName: "PT FLASH GLOBAL LOGISTIK", color: "bg-amber-500" }
  ];

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    transferBank: defaultTransferBank,
    qrisImageUrl: null
  });

  // State Input Bukti Transfer
  const [uploadReceipt, setUploadReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // --- STATE PROMO VOUCHER ---
  const [promoCode, setPromoCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState("");

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Proteksi Auth
  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  // FETCH MASTER PAYMENT SETTINGS DARI ADMIN
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "payments"));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPaymentConfig({
            transferBank: data.transferBank && data.transferBank.length > 0 ? data.transferBank : defaultTransferBank,
            qrisImageUrl: data.qrisImageUrl || null
          });
        }
      } catch (err) {
        console.error("Gagal menarik konfigurasi pembayaran:", err);
      }
    };
    fetchPaymentSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FETCH ORDER TERAKHIR USER SECARA REAL-TIME
  useEffect(() => {
    if (!user?.uid) {
      setIsFetchingOrder(false);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        
        let primaryDest = "Multi Tujuan";
        if (docData.destinations && docData.destinations.length === 1) {
            primaryDest = docData.destinations[0].address || "Tujuan";
        }

        setCurrentOrder({
          id: snapshot.docs[0].id,
          destination: primaryDest,
          weight: docData.totalWeight || 0,
          vehicle: docData.vehicleName || "Armada",
          totalCost: docData.breakdown?.grandTotal || docData.totalCost || 0
        });
      }
      setIsFetchingOrder(false);
    }, (error) => {
      console.error("Gagal sinkronisasi data order:", error);
      setIsFetchingOrder(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fungsi Copy Salin No Rekening
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadReceipt(file);
      setReceiptPreview(URL.createObjectURL(file));
      setErrorMsg("");
    }
  };

  // =======================================================================
  // LOGIKA VALIDASI PROMO CERDAS
  // =======================================================================
  const handleApplyPromo = async () => {
    if (!promoCode.trim() || !currentOrder) return;
    setIsApplyingPromo(true);
    setPromoError("");

    try {
      const code = promoCode.trim().toUpperCase();
      const promoRef = doc(db, "promos", code);
      const promoSnap = await getDoc(promoRef);

      if (!promoSnap.exists()) {
        throw new Error("Kode voucher tidak ditemukan.");
      }

      const pData = promoSnap.data();
      const now = new Date();

      if (!pData.isActive) throw new Error("Voucher ini dinonaktifkan.");
      if (new Date(pData.expiresAt as string) < now) throw new Error("Masa berlaku voucher habis.");
      if (pData.usedCount >= pData.quota) throw new Error("Kuota voucher telah habis.");
      if (pData.targetUser && pData.targetUser !== "all" && pData.targetUser !== user?.email) {
        throw new Error("Voucher tidak berlaku untuk akun Anda.");
      }

      let discount = 0;
      if (pData.type === "percentage") {
        discount = (pData.value / 100) * currentOrder.totalCost;
      } else {
        discount = pData.value;
      }

      if (discount > currentOrder.totalCost) discount = currentOrder.totalCost;

      setDiscountAmount(discount);
      setAppliedPromo(code);
      showToast("success", "Voucher berhasil dipasang!");
    } catch (err: unknown) { 
      if (err instanceof Error) {
        setPromoError(err.message);
      } else {
        setPromoError("Kesalahan saat memvalidasi voucher.");
      }
      setDiscountAmount(0);
      setAppliedPromo(null);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setDiscountAmount(0);
    setPromoCode("");
    setPromoError("");
  };

  const finalTotal = currentOrder ? Math.max(0, currentOrder.totalCost - discountAmount) : 0;

  // PROSES UPLOAD CLOUDINARY, UPDATE FIRESTORE & KONFIRMASI WA
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadReceipt) {
      setErrorMsg("Harap unggah gambar bukti transfer Anda terlebih dahulu.");
      return;
    }
    if (!currentOrder) {
      setErrorMsg("Data pesanan tidak ditemukan.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      let receiptUrl = "";
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (cloudName && uploadPreset) {
        const imageFormData = new FormData();
        imageFormData.append("file", uploadReceipt);
        imageFormData.append("upload_preset", uploadPreset);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: imageFormData,
        });

        const cloudData = await cloudinaryRes.json();
        if (cloudData.secure_url) {
          receiptUrl = cloudData.secure_url;
        } else {
          throw new Error(cloudData.error?.message || "Gagal mengunggah bukti ke server.");
        }
      }

      const orderRef = doc(db, "orders", currentOrder.id);
      await updateDoc(orderRef, {
        status: "Sedang Diproses", 
        paymentStatus: "Menunggu Verifikasi Finance",
        paymentMethod: activeTab === "qris" ? "QRIS" : "Transfer Bank Manual",
        receiptUrl: receiptUrl,
        paidAt: new Date().toISOString(),
        appliedPromoCode: appliedPromo || null,
        discountPromoAmount: discountAmount || 0,
        finalGrandTotal: finalTotal 
      });

      const adminWhatsApp = "6281234567890"; 
      let message = `Halo Tim Finance Flash Global,\n\nSaya telah melakukan pembayaran:\n\n🧾 *ID Pesanan:* ${currentOrder.id}\n💳 *Metode:* ${activeTab === 'qris' ? 'QRIS' : 'Transfer Bank'}\n`;
      if (appliedPromo) {
        message += `🎟️ *Voucher Pakai:* ${appliedPromo}\n💰 *Total Bayar:* ${formatRupiah(finalTotal)}\n\n`;
      } else {
        message += `💰 *Total Bayar:* ${formatRupiah(currentOrder.totalCost)}\n\n`;
      }
      message += `Bukti telah saya unggah di sistem web. Mohon verifikasi.\n\nTerima kasih.`;
      
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${adminWhatsApp}?text=${encodedMessage}`, "_blank");

      router.push("/dashboard");

    } catch (error: unknown) {
      console.error("Gagal memproses pembayaran:", error);
      if (error instanceof Error) setErrorMsg(error.message);
      else setErrorMsg("Gagal mengonfirmasi transaksi. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayLater = () => router.push("/dashboard");
  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  if (isFetchingOrder || !isHydrated) {
    return (
      <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Memuat Tagihan...</p>
      </div>
    );
  }

  if (!currentOrder) {
    return (
      <div className="fixed inset-0 z-[150] bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4 opacity-80" />
        <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Tidak Ada Tagihan</h2>
        <p className="text-xs text-slate-500 mb-6">Kami tidak menemukan pesanan yang belum dibayar.</p>
        <button onClick={() => router.push("/dashboard")} className="bg-white border border-slate-200 px-6 py-3 rounded-[1.25rem] font-bold text-sm shadow-sm active:scale-95 transition-transform">
          Ke Dashboard
        </button>
      </div>
    );
  }

  return (
    // FULL OVERLAY (Native Push View)
    <div className="fixed inset-0 z-[150] bg-slate-50 flex justify-center font-sans overflow-hidden">
      <div className="w-full max-w-md relative flex flex-col h-[100dvh] bg-slate-50 shadow-2xl">
        
        {/* AMBIENT GLOW LOKAL */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[0%] right-[-10%] w-[60vw] h-[40vh] bg-emerald-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[40vh] bg-[#C5A059]/10 rounded-full blur-[100px]" />
        </div>

        {/* TOAST NOTIFICATION */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} 
              className={cn("absolute top-20 left-4 right-4 z-[200] p-3 rounded-2xl font-bold text-xs border flex items-center gap-3 shadow-lg backdrop-blur-md", toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 'bg-red-50/90 border-red-200 text-red-800')}>
              {toast.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />} {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==============================================================
            1. APP BAR (NATIVE HEADER)
            ============================================================== */}
        <div className="flex-none bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm pt-safe relative z-30">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-slate-700 bg-slate-100 rounded-full active:scale-90 tap-highlight-transparent transition-transform">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Selesaikan Pembayaran</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID: {currentOrder.id.slice(-6)}</p>
            </div>
            <div className="w-10 h-10"></div>
          </div>
        </div>

        {/* ERROR MESSAGE (Melayang di bawah header) */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute top-[70px] left-4 right-4 z-40">
              <div className="p-3 bg-red-50/90 backdrop-blur-md border border-red-200 text-red-700 text-xs font-bold rounded-2xl shadow-lg flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==============================================================
            2. SCROLLABLE WIZARD CONTENT
            ============================================================== */}
        <main className="flex-grow overflow-y-auto overflow-x-hidden p-4 pb-[110px] space-y-5 relative z-10 no-scrollbar">
          
          {/* TAGIHAN (RECEIPT DARK BENTO) */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-[2rem] overflow-hidden shadow-lg border border-slate-800 relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="p-6 relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                   <ReceiptText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Tagihan</h3>
                  <p className="text-[#DFBE7B] font-mono font-bold text-xs tracking-widest">{currentOrder.id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Destinasi</span>
                  <span className="font-black text-white truncate max-w-[140px] text-right">{currentOrder.destination}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold">Berat & Armada</span>
                  <span className="font-black text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">{currentOrder.weight} Kg • {currentOrder.vehicle}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white/5 relative z-10 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Subtotal Biaya</span>
                <span className={cn("font-black text-lg", appliedPromo ? "text-slate-400 line-through decoration-red-500 decoration-2" : "text-white")}>
                  {formatRupiah(currentOrder.totalCost)}
                </span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-emerald-400 font-black uppercase tracking-widest text-[10px]">Total Setelah Diskon</span>
                  <span className="font-black text-emerald-400 text-2xl">{formatRupiah(finalTotal)}</span>
                </div>
              )}
            </div>
          </div>

          {/* VOUCHER PROMO */}
          <div className="glass-card bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            {!appliedPromo ? (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><TicketPercent className="w-4 h-4 text-[#C5A059]" /> Voucher Diskon</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Masukkan kode..."
                    className="w-full bg-slate-50 border border-slate-200 pl-4 pr-24 h-14 rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#C5A059]/20 focus:border-[#C5A059] outline-none text-sm font-bold uppercase transition-all shadow-inner placeholder:text-slate-300"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  />
                  <button 
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={isApplyingPromo || !promoCode.trim()}
                    className="absolute right-2 top-2 bottom-2 bg-gradient-to-b from-slate-800 to-slate-900 text-white px-5 rounded-xl text-xs font-black active:scale-95 transition-all shadow-sm border border-slate-950 disabled:opacity-50"
                  >
                    {isApplyingPromo ? "Cek..." : "Klaim"}
                  </button>
                </div>
                {promoError && <p className="text-[10px] text-red-500 font-bold mt-1 pl-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {promoError}</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3 text-emerald-700">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center border border-emerald-200 shrink-0"><Check className="w-5 h-5 text-emerald-600" /></div>
                  <div>
                    <span className="text-sm font-black uppercase tracking-wider block leading-none">{appliedPromo}</span>
                    <span className="text-[10px] font-bold text-emerald-600/80 mt-1 block">Potongan: {formatRupiah(discountAmount)}</span>
                  </div>
                </div>
                <button onClick={removePromo} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-emerald-100 text-emerald-600 active:scale-90 active:bg-red-50 active:text-red-500 active:border-red-200 transition-colors shadow-sm tap-highlight-transparent">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* METODE PEMBAYARAN */}
          <div className="glass-card bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-5">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <CreditCard className="w-4 h-4 text-indigo-600" /> Metode Pembayaran
            </h3>
            
            {/* Toggle Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] relative shadow-inner">
              <button type="button" onClick={() => setActiveTab("transfer")} className={cn("flex-1 h-10 text-xs font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-1.5 tap-highlight-transparent", activeTab === "transfer" ? "text-indigo-700" : "text-slate-500")}>
                <Building2 className="w-4 h-4"/> Transfer
              </button>
              <button type="button" onClick={() => setActiveTab("qris")} className={cn("flex-1 h-10 text-xs font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-1.5 tap-highlight-transparent", activeTab === "qris" ? "text-indigo-700" : "text-slate-500")}>
                <QrCode className="w-4 h-4"/> QRIS
              </button>
              <div className={cn("absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out border border-slate-200", activeTab === "transfer" ? "left-1.5" : "left-[calc(50%+4px)]")}></div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "transfer" ? (
                <motion.div key="transfer" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3 pt-2">
                  {paymentConfig.transferBank.map((rek, idx) => (
                    <div key={idx} className="p-4 border border-slate-200 bg-slate-50 rounded-2xl flex flex-col justify-between shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <span className={cn("inline-block text-white font-black px-3 py-1 rounded-md text-[9px] tracking-widest shadow-sm", rek.color)}>{rek.bankName}</span>
                        <button 
                          type="button" 
                          onClick={() => handleCopyText(rek.accountNumber, rek.bankName)}
                          className="p-2 rounded-lg border border-slate-200 bg-white active:bg-indigo-50 text-slate-400 active:scale-90 transition-all shadow-sm tap-highlight-transparent"
                        >
                          {copiedText === rek.bankName ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Nomor Rekening</p>
                        <p className="font-mono font-black text-slate-900 text-lg tracking-wider">{rek.accountNumber}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">A.N: {rek.accountName}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : (
                <motion.div key="qris" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="pt-2 flex flex-col items-center">
                  <div className="w-full aspect-square max-w-[240px] bg-slate-50 border border-slate-200 rounded-3xl p-4 flex items-center justify-center overflow-hidden shadow-inner mx-auto">
                    {paymentConfig.qrisImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={paymentConfig.qrisImageUrl} alt="QRIS" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <div className="text-center">
                        <QrCode className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-[10px] font-black text-slate-400 uppercase">Belum Tersedia</p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 text-center font-medium mt-4">Pindai kode QR menggunakan M-Banking/E-Wallet.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* UPLOAD BUKTI (DRAG & DROP) */}
          <div className="glass-card bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 tracking-tight mb-4">
              <Upload className="w-4 h-4 text-emerald-600" /> Bukti Pembayaran
            </h3>
            
            <label className="border-2 border-dashed border-slate-300 active:border-emerald-500 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50 active:bg-emerald-50 min-h-[180px] relative overflow-hidden tap-highlight-transparent">
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              
              <AnimatePresence mode="wait">
                {receiptPreview ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-slate-900 p-2 flex items-center justify-center group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={receiptPreview} alt="Pratinjau Bukti" className="w-full h-full object-cover rounded-xl shadow-xl opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-white/90 backdrop-blur-md text-slate-900 font-black px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs border border-white">
                        <Upload className="w-4 h-4" /> Ganti Foto
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-slate-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">Sentuh untuk upload</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">JPG, PNG (Maks 5MB)</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </label>
          </div>
        </main>

        {/* ==============================================================
            3. ACTION BAR (FOOTER NATIVE)
            ============================================================== */}
        <div className="absolute bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)] bg-white/90">
          <form onSubmit={handlePaymentSubmit} className="flex gap-3">
            <Button 
              type="button" 
              onClick={handlePayLater}
              variant="outline" 
              disabled={isLoading || !currentOrder}
              className="flex-1 h-14 bg-white border border-slate-200 text-slate-600 font-black text-xs rounded-[1.25rem] active:scale-95 shadow-sm tap-highlight-transparent"
            >
              Bayar Nanti
            </Button>

            <button 
              type="submit" 
              disabled={isLoading || !currentOrder}
              className="flex-[1.5] h-14 bg-gradient-to-b from-[#25D366] to-[#1DA851] text-white font-black text-xs rounded-[1.25rem] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 border border-[#178f44] shadow-lg tap-highlight-transparent"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Konfirmasi <CheckCircle className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}