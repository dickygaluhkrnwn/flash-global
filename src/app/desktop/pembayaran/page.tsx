"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, ArrowRight, 
  QrCode, Upload, Copy, 
  CheckCircle, AlertCircle, 
  ReceiptText, CreditCard, 
  Clock, TicketPercent, X, Check, ShieldCheck
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

export default function PaymentPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  const [currentOrder, setCurrentOrder] = useState<OrderSummary | null>(null);
  const [isFetchingOrder, setIsFetchingOrder] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

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

      // Validasi Berlapis
      if (!pData.isActive) throw new Error("Voucher ini sudah dinonaktifkan.");
      if (new Date(pData.expiresAt as string) < now) throw new Error("Masa berlaku voucher sudah habis.");
      if (pData.usedCount >= pData.quota) throw new Error("Kuota pemakaian voucher telah habis.");
      if (pData.targetUser && pData.targetUser !== "all" && pData.targetUser !== user?.email) {
        throw new Error("Voucher ini tidak berlaku untuk akun Anda.");
      }

      // Hitung diskon (Cegah nilai diskon lebih besar dari total tagihan)
      let discount = 0;
      if (pData.type === "percentage") {
        discount = (pData.value / 100) * currentOrder.totalCost;
      } else {
        discount = pData.value;
      }

      if (discount > currentOrder.totalCost) discount = currentOrder.totalCost;

      setDiscountAmount(discount);
      setAppliedPromo(code);
    } catch (err: unknown) { 
      if (err instanceof Error) {
        setPromoError(err.message);
      } else {
        setPromoError("Terjadi kesalahan saat memvalidasi kode voucher.");
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

      // 1. Update status pesanan di Firestore
      const orderRef = doc(db, "orders", currentOrder.id);
      await updateDoc(orderRef, {
        status: "Sedang Diproses", 
        paymentStatus: "Menunggu Verifikasi Finance",
        paymentMethod: activeTab === "qris" ? "QRIS" : "Transfer Bank Manual",
        receiptUrl: receiptUrl,
        paidAt: new Date().toISOString(),
        appliedPromoCode: appliedPromo || null,
        discountPromoAmount: discountAmount || 0,
        finalGrandTotal: finalTotal // Timpa harga final jika pakai promo
      });

      // 2. Generate Pesan WhatsApp (Mengirimkan info bahwa user sudah bayar via Web)
      const adminWhatsApp = "6281234567890"; 
      let message = `Halo Tim Finance Flash Global,\n\nSaya telah melakukan pembayaran untuk pesanan saya:\n\n🧾 *ID Pesanan:* ${currentOrder.id}\n💳 *Metode:* ${activeTab === 'qris' ? 'QRIS' : 'Transfer Bank'}\n`;
      
      if (appliedPromo) {
        message += `🎟️ *Voucher Pakai:* ${appliedPromo}\n💰 *Total Bayar:* ${formatRupiah(finalTotal)}\n\n`;
      } else {
        message += `💰 *Total Bayar:* ${formatRupiah(currentOrder.totalCost)}\n\n`;
      }

      message += `Bukti transfer telah saya unggah di sistem web. Mohon segera diverifikasi agar pesanan dapat diproses.\n\nTerima kasih.`;
      
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${adminWhatsApp}?text=${encodedMessage}`, "_blank");

      router.push("/dashboard");

    } catch (error: unknown) {
      console.error("Gagal memproses pembayaran:", error);
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Gagal mengonfirmasi transaksi. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayLater = () => {
    router.push("/dashboard");
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] py-12 lg:py-20 px-6 relative overflow-hidden font-sans z-0">
      
      {/* === AMBIENT GLOWING BACKGROUND === */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[0%] right-[-10%] w-[50vw] h-[50vh] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[50vh] bg-[#C5A059]/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1200px] mx-auto z-10 relative">
        
        {/* ==========================================
            MAIN CONTENT GRID (Dihilangkan Hero Section)
            ========================================== */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start pt-4">
          
          {/* --------------------------------------
              KOLOM KIRI: INVOICE TAGIHAN & PROMO
              -------------------------------------- */}
          <div className="w-full lg:w-1/3 space-y-6">
            <div className="glass-card rounded-[2.5rem] overflow-hidden lg:sticky lg:top-10 relative shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              
              {/* Tagihan Header (Dark 3D Style) */}
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-8 text-white text-center relative overflow-hidden shadow-[0_10px_20px_rgba(15,23,42,0.3)] border-b border-slate-800">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#C5A059]/20 rounded-full blur-[60px] pointer-events-none" />
                
                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-[1.25rem] flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)]">
                   <ReceiptText className="w-8 h-8 text-emerald-400 drop-shadow-sm" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-300 relative z-10 mb-1">Total Tagihan</h3>
                <p className="text-xs text-[#DFBE7B] font-mono font-bold tracking-widest relative z-10 bg-black/20 inline-block px-3 py-1 rounded-md border border-white/10">{currentOrder?.id || "Memuat ID..."}</p>
              </div>
              
              {/* Tagihan Body (Receipt Paper Style) */}
              <div className="p-8 bg-white/80 relative">
                {isFetchingOrder ? (
                  <div className="space-y-5 py-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-10 bg-slate-200 rounded-xl mt-8"></div>
                  </div>
                ) : currentOrder ? (
                  <>
                    <div className="space-y-5 mb-8">
                      <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-4">
                        <span className="text-slate-500 font-bold">Destinasi</span>
                        <span className="font-black text-slate-900 text-right truncate max-w-[140px]" title={currentOrder.destination}>{currentOrder.destination}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-4">
                        <span className="text-slate-500 font-bold">Berat Estimasi</span>
                        <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{currentOrder.weight} Kg</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-4">
                        <span className="text-slate-500 font-bold">Armada</span>
                        <span className="font-black text-slate-900 text-right">{currentOrder.vehicle}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-2">
                        <span className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Subtotal Biaya</span>
                        <span className="font-black text-slate-900 text-base">{formatRupiah(currentOrder.totalCost)}</span>
                      </div>
                    </div>

                    {/* INPUT KODE PROMO */}
                    <div className="bg-slate-50/80 p-5 rounded-[1.5rem] border border-slate-200 mb-8 shadow-sm">
                      {!appliedPromo ? (
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><TicketPercent className="w-4 h-4 text-[#C5A059]" /> Voucher Diskon</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="Masukkan kode..."
                              className="w-full bg-white border border-slate-200 pl-4 pr-24 py-4 rounded-xl focus:bg-white focus:ring-4 focus:ring-[#C5A059]/15 focus:border-[#C5A059] outline-none text-sm font-bold uppercase transition-all shadow-sm placeholder:text-slate-300"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                            />
                            <button 
                              type="button"
                              onClick={handleApplyPromo}
                              disabled={isApplyingPromo || !promoCode.trim()}
                              className="absolute right-2 top-2 bottom-2 bg-gradient-to-b from-slate-800 to-slate-900 text-white px-5 rounded-lg text-xs font-black hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm disabled:opacity-50 active:scale-95 border border-slate-950"
                            >
                              {isApplyingPromo ? "Cek..." : "Klaim"}
                            </button>
                          </div>
                          {promoError && (
                            <p className="text-[11px] text-red-500 font-bold mt-2 flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-100"><AlertCircle className="w-3.5 h-3.5 shrink-0"/> {promoError}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl shadow-sm">
                            <div className="flex items-center gap-3 text-emerald-700">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200 shrink-0"><Check className="w-4 h-4 text-emerald-600" /></div>
                              <div>
                                <span className="text-sm font-black uppercase tracking-wider block leading-none">{appliedPromo}</span>
                                <span className="text-[10px] font-bold text-emerald-600/80 mt-1 block">Voucher Terpasang</span>
                              </div>
                            </div>
                            <button onClick={removePromo} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-emerald-100 text-emerald-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex justify-between items-center text-sm px-1 pt-1">
                            <span className="text-emerald-600 font-black text-xs uppercase tracking-widest">Potongan Diskon</span>
                            <span className="font-black text-emerald-600 text-base">- {formatRupiah(discountAmount)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t-2 border-dashed border-slate-200 pt-6">
                      <p className="text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Total Harus Dibayar</p>
                      <div className="flex flex-col">
                        {appliedPromo && (
                          <p className="text-sm font-bold text-slate-400 line-through decoration-red-400 decoration-2 mb-1">{formatRupiah(currentOrder.totalCost)}</p>
                        )}
                        <p className="text-4xl font-black text-[#7A171D] tracking-tighter">{formatRupiah(finalTotal)}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-4 font-bold leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 inline mr-1 mb-0.5" /> Nominal final sudah termasuk asuransi (jika dipilih) dan potongan voucher.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="py-12 flex flex-col items-center text-center">
                    <AlertCircle className="w-10 h-10 text-amber-500 mb-3 opacity-50" />
                    <p className="text-base font-black text-slate-900">Pesanan Tidak Ditemukan</p>
                    <p className="text-xs text-slate-500 mt-2 font-medium">Sistem gagal menarik data order terakhir Anda. Silakan kembali ke dashboard.</p>
                  </div>
                )}
              </div>
              
              {/* Gerigi Bawah Ala Struk */}
              <div className="h-5 w-full bg-[radial-gradient(circle,transparent_5px,#ffffff_6px)] bg-[length:16px_16px] -mt-2.5 relative z-10 drop-shadow-sm"></div>
            </div>
          </div>

          {/* --------------------------------------
              KOLOM KANAN: INSTRUKSI & KONFIRMASI
              -------------------------------------- */}
          <div className="w-full lg:w-2/3">
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              
              {/* SEKSI 1: METODE PEMBAYARAN (GLASS BENTO) */}
              <div className="glass-card rounded-[2.5rem] p-6 md:p-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8 border-b border-white pb-6">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                    <CreditCard className="w-6 h-6 text-indigo-600" /> 1. Metode Pembayaran
                  </h3>
                  
                  {/* Glass Pill Tabs */}
                  <div className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-[1.25rem] relative border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] w-full sm:w-auto">
                    <button type="button" onClick={() => setActiveTab("transfer")} className={cn("flex-1 sm:w-36 py-2.5 text-xs font-black transition-all rounded-[1rem] relative z-10 flex items-center justify-center gap-2", activeTab === "transfer" ? "text-indigo-700" : "text-slate-500 hover:text-slate-800")}>
                      <Building2 className="w-4 h-4"/> Transfer Bank
                    </button>
                    <button type="button" onClick={() => setActiveTab("qris")} className={cn("flex-1 sm:w-36 py-2.5 text-xs font-black transition-all rounded-[1rem] relative z-10 flex items-center justify-center gap-2", activeTab === "qris" ? "text-indigo-700" : "text-slate-500 hover:text-slate-800")}>
                      <QrCode className="w-4 h-4"/> QRIS
                    </button>
                    <div className={cn("absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-[1rem] shadow-sm transition-all duration-300 ease-out", activeTab === "transfer" ? "left-1.5" : "left-[calc(50%+4px)]")}></div>
                  </div>
                </div>
                
                <AnimatePresence mode="wait">
                  {activeTab === "transfer" ? (
                    <motion.div key="transfer" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                      <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">Silakan transfer sesuai dengan <b className="text-slate-800">Total Harus Dibayar</b> ke salah satu rekening resmi kami di bawah ini:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paymentConfig.transferBank.map((rek, idx) => (
                          <div key={idx} className="p-6 border border-white bg-white/60 backdrop-blur-md rounded-[1.5rem] shadow-sm flex flex-col justify-between group hover:shadow-md hover:bg-white transition-all cursor-default">
                            <div className="flex justify-between items-start mb-6">
                               <span className={`inline-block text-white font-black px-3 py-1 rounded-md text-[10px] tracking-widest shadow-sm ${rek.color}`}>{rek.bankName}</span>
                               <button 
                                type="button" 
                                onClick={() => handleCopyText(rek.accountNumber, rek.bankName)}
                                className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-slate-400 transition-all shadow-sm active:scale-95"
                                title="Salin Rekening"
                              >
                                {copiedText === rek.bankName ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Nomor Rekening</p>
                              <p className="font-mono font-black text-slate-900 text-xl tracking-wider">{rek.accountNumber}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pt-1">A.N: {rek.accountName}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="qris" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col items-center justify-center py-6 bg-white/50 backdrop-blur-md border border-white rounded-[2rem] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
                      <p className="text-sm text-slate-500 mb-8 text-center font-medium max-w-sm">Pindai kode QR di bawah ini menggunakan aplikasi M-Banking atau E-Wallet pilihan Anda.</p>
                      <div className="w-64 h-64 bg-white border border-slate-200 rounded-[2rem] p-4 flex items-center justify-center relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                        {paymentConfig.qrisImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={paymentConfig.qrisImageUrl} alt="QRIS Flash Global" className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-center">
                            <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-xs font-black text-slate-400 tracking-widest uppercase">QRIS Belum Tersedia</p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      </div>
                      <div className="mt-8 flex items-center gap-4 opacity-50 grayscale">
                        <div className="w-10 h-6 bg-slate-300 rounded"></div>
                        <div className="w-10 h-6 bg-slate-300 rounded"></div>
                        <div className="w-10 h-6 bg-slate-300 rounded"></div>
                        <div className="w-10 h-6 bg-slate-300 rounded"></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SEKSI 2: UPLOAD BUKTI (GLASS BENTO) */}
              <div className="glass-card rounded-[2.5rem] p-6 md:p-10">
                <div className="border-b border-white pb-5 mb-8">
                   <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2 tracking-tight">
                     <Upload className="w-6 h-6 text-emerald-600" /> 2. Konfirmasi Pembayaran
                   </h3>
                   <p className="text-slate-500 text-sm font-medium leading-relaxed pl-8">Pastikan bukti transfer memperlihatkan Nama Penerima, Nominal, dan Status Berhasil.</p>
                </div>

                {/* Drag & Drop Upload Area */}
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/40 hover:bg-emerald-50/50 min-h-[250px] relative overflow-hidden group shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  
                  <AnimatePresence mode="wait">
                    {receiptPreview ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-slate-900 p-3 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptPreview} alt="Pratinjau Bukti" className="max-w-full max-h-full object-contain rounded-2xl shadow-xl" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <span className="bg-white text-slate-900 font-black px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 transform group-hover:scale-105 transition-transform text-sm">
                            <Upload className="w-5 h-5" /> Ganti Gambar
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        <div className="w-20 h-20 rounded-[1.5rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-emerald-600 group-hover:scale-110 transition-all duration-500 group-hover:rotate-3">
                          <Upload className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-800">Pilih file gambar bukti transfer</p>
                          <p className="text-xs text-slate-400 mt-2 font-bold uppercase tracking-widest">Format: JPG, PNG (Maks 5MB)</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </label>

                {/* Error Upload */}
                <AnimatePresence>
                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-[1.25rem] flex items-start gap-3 shadow-sm">
                      <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" /> <span className="leading-relaxed">{errorMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* SEKSI 3: ACTION BUTTONS (FLOATING STYLE) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 pt-4">
                
                {/* Tombol Tunda */}
                <div className="sm:col-span-5 md:col-span-4">
                  <Button 
                    type="button" 
                    onClick={handlePayLater}
                    variant="outline" 
                    disabled={isLoading || !currentOrder}
                    className="w-full h-16 bg-white/80 backdrop-blur-md border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] text-slate-600 hover:text-slate-900 hover:bg-white font-black text-sm rounded-[1.25rem] flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Clock className="w-5 h-5 text-slate-400" /> Bayar Nanti
                  </Button>
                </div>

                {/* Tombol Submit Utama - Diperbaiki UI/Teks sesuai permintaan */}
                <div className="sm:col-span-7 md:col-span-8 relative">
                  <button 
                    type="submit" 
                    disabled={isLoading || !currentOrder}
                    className="w-full h-16 bg-gradient-to-b from-[#25D366] to-[#1DA851] hover:from-[#21bd5a] hover:to-[#178f44] text-white font-black text-sm md:text-base rounded-[1.25rem] flex items-center justify-center gap-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed relative z-10 active:scale-[0.98] border border-[#178f44] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_10px_20px_rgba(37,211,102,0.3)]"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 fill-current opacity-90" />
                        Konfirmasi Pembayaran <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                      </>
                    )}
                  </button>
                </div>

              </div>

            </form>
          </div>

        </div>
      </div>
    </main>
  );
} 