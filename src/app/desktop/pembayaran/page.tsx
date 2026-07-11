"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, ArrowRight, 
  QrCode, Upload, Copy, 
  CheckCircle, MessageCircle, AlertCircle, 
  ReceiptText, ChevronLeft, CreditCard, 
  Clock, TicketPercent, X, Check, ShieldCheck
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface OrderSummary {
  id: string;
  destination: string;
  weight: number | string;
  vehicle: string;
  totalCost: number;
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
  const defaultTransferBank = [
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
      if (new Date(pData.expiresAt) < now) throw new Error("Masa berlaku voucher sudah habis.");
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
    } catch (err: unknown) { // Perbaikan Linter Error di sini
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
    <main className="min-h-screen bg-slate-50 py-12 lg:py-16 px-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />

      <div className="max-w-6xl mx-auto z-10 relative">
        
        {/* Header Seksi */}
        <div className="mb-10 text-center relative">
          <button 
            onClick={() => router.back()} 
            className="absolute left-0 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 text-slate-500 hover:text-[#7A171D] font-bold text-sm transition-colors"
          >
            <ChevronLeft className="w-5 h-5" /> Kembali
          </button>

          <span className="text-xs font-bold uppercase tracking-widest text-[#7A171D] bg-[#7A171D]/10 px-4 py-1.5 rounded-full border border-[#7A171D]/20 inline-block mb-3">
            Tahap Akhir
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Selesaikan Pembayaran</h1>
          <p className="text-slate-500 mt-2 text-sm max-w-lg mx-auto leading-relaxed font-medium">
            Pilih metode pembayaran, selesaikan tagihan Anda, dan konfirmasikan bukti transfer agar pesanan segera diproses.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
          
          {/* KOLOM KIRI: INVOICE TAGIHAN */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-200 lg:sticky lg:top-28">
              <div className="bg-[#7A171D] p-6 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none -translate-y-10 translate-x-10" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/20 rounded-full blur-2xl pointer-events-none translate-y-10 -translate-x-10" />
                
                <ReceiptText className="w-10 h-10 mx-auto mb-3 opacity-90 relative z-10" />
                <h3 className="text-lg font-black tracking-widest relative z-10">INVOICE TAGIHAN</h3>
                <p className="text-[#DFBE7B] text-xs font-mono mt-1 font-bold tracking-widest relative z-10">{currentOrder?.id || "Memuat ID..."}</p>
              </div>
              
              <div className="p-6 md:p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-white">
                {isFetchingOrder ? (
                  <div className="space-y-4 py-4 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                    <div className="h-10 bg-slate-200 rounded-xl mt-6"></div>
                  </div>
                ) : currentOrder ? (
                  <>
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Destinasi Rute</span>
                        <span className="font-bold text-slate-900 text-right truncate max-w-[140px]" title={currentOrder.destination}>{currentOrder.destination}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Berat Estimasi</span>
                        <span className="font-bold text-slate-900">{currentOrder.weight} Kg</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Layanan Armada</span>
                        <span className="font-bold text-slate-900 text-right">{currentOrder.vehicle}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-100">
                        <span className="text-slate-500 font-medium">Subtotal</span>
                        <span className="font-bold text-slate-900">{formatRupiah(currentOrder.totalCost)}</span>
                      </div>
                    </div>

                    {/* INPUT KODE PROMO */}
                    <div className="pt-2 pb-6">
                      {!appliedPromo ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><TicketPercent className="w-3 h-3 text-[#C5A059]" /> Punya Kode Voucher?</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="Masukkan kode..."
                              className="w-full pl-4 pr-24 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-[#C5A059]/10 focus:border-[#C5A059] outline-none text-sm font-bold uppercase transition-all shadow-sm"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                            />
                            <button 
                              type="button"
                              onClick={handleApplyPromo}
                              disabled={isApplyingPromo || !promoCode.trim()}
                              className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-4 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
                            >
                              {isApplyingPromo ? "Cek..." : "Gunakan"}
                            </button>
                          </div>
                          {promoError && (
                            <p className="text-xs text-red-500 font-semibold mt-1.5 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> {promoError}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl shadow-sm">
                            <div className="flex items-center gap-2 text-emerald-700">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center"><Check className="w-3.5 h-3.5" /></div>
                              <div>
                                <span className="text-xs font-black uppercase block leading-none">{appliedPromo}</span>
                                <span className="text-[10px] font-medium leading-none">Voucher Berhasil Dipakai</span>
                              </div>
                            </div>
                            <button onClick={removePromo} className="w-8 h-8 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-100 hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex justify-between items-center text-sm px-1">
                            <span className="text-emerald-600 font-bold">Potongan Diskon</span>
                            <span className="font-black text-emerald-600">- {formatRupiah(discountAmount)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="border-t-2 border-dashed border-slate-200 pt-6 mb-2">
                      <p className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Total Harus Dibayar</p>
                      <div className="flex flex-col">
                        {appliedPromo && (
                          <p className="text-sm font-bold text-slate-400 line-through decoration-red-400 decoration-2 mb-1">{formatRupiah(currentOrder.totalCost)}</p>
                        )}
                        <p className="text-3xl font-black text-[#7A171D] tracking-tight">{formatRupiah(finalTotal)}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 font-medium leading-relaxed">*Nominal final sudah termasuk asuransi dan potongan voucher (jika ada).</p>
                    </div>
                  </>
                ) : (
                  <div className="py-8 flex flex-col items-center text-center">
                    <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                    <p className="text-sm font-bold text-slate-900">Pesanan Tidak Ditemukan</p>
                    <p className="text-xs text-slate-500 mt-1">Sistem gagal menarik data order terakhir Anda.</p>
                  </div>
                )}
              </div>
              
              {/* Gerigi Bawah Ala Struk */}
              <div className="h-4 w-full bg-[radial-gradient(circle,transparent_4px,#ffffff_5px)] bg-[length:12px_12px] -mt-2 relative z-10"></div>
            </div>
          </div>

          {/* KOLOM KANAN: INSTRUKSI & KONFIRMASI */}
          <div className="w-full lg:w-2/3">
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              
              {/* Seksi Detail Rekening Bank / QRIS */}
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-6">
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#C5A059]" /> 1. Pilih Metode Pembayaran
                  </h3>
                  
                  {/* Tab Pilihan Pembayaran */}
                  <div className="flex bg-slate-100 p-1.5 rounded-xl relative border border-slate-200 w-full sm:w-auto">
                    <button type="button" onClick={() => setActiveTab("transfer")} className={cn("flex-1 sm:w-32 py-2 text-xs font-bold transition-all rounded-lg relative z-10 flex items-center justify-center gap-2", activeTab === "transfer" ? "text-slate-900" : "text-slate-500 hover:text-slate-700")}>
                      <Building2 className="w-3.5 h-3.5"/> Transfer Bank
                    </button>
                    <button type="button" onClick={() => setActiveTab("qris")} className={cn("flex-1 sm:w-32 py-2 text-xs font-bold transition-all rounded-lg relative z-10 flex items-center justify-center gap-2", activeTab === "qris" ? "text-slate-900" : "text-slate-500 hover:text-slate-700")}>
                      <QrCode className="w-3.5 h-3.5"/> QRIS
                    </button>
                    <div className={cn("absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out", activeTab === "transfer" ? "left-1.5" : "left-[calc(50%+4px)]")}></div>
                  </div>
                </div>
                
                <AnimatePresence mode="wait">
                  {activeTab === "transfer" ? (
                    <motion.div key="transfer" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                      <p className="text-sm text-slate-500 mb-6 font-medium">Silakan transfer sesuai dengan <b className="text-slate-800">Total Harus Dibayar</b> ke salah satu rekening resmi kami di bawah ini:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paymentConfig.transferBank.map((rek, idx) => (
                          <div key={idx} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 shadow-sm flex items-center justify-between group hover:border-[#C5A059] hover:bg-white transition-all">
                            <div className="space-y-1">
                              <span className={`inline-block text-white font-black px-2.5 py-0.5 rounded text-[10px] tracking-wide ${rek.color}`}>{rek.bankName}</span>
                              <p className="font-mono font-black text-slate-900 text-lg tracking-wider mt-1">{rek.accountNumber}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{rek.accountName}</p>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleCopyText(rek.accountNumber, rek.bankName)}
                              className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-[#C5A059]/10 hover:border-[#C5A059] hover:text-[#C5A059] text-slate-400 transition-all focus:outline-none focus:ring-4 focus:ring-[#C5A059]/20 shadow-sm"
                              title="Salin Rekening"
                            >
                              {copiedText === rek.bankName ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="qris" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col items-center justify-center py-4">
                      <p className="text-sm text-slate-500 mb-6 text-center font-medium">Pindai kode QR di bawah ini menggunakan aplikasi M-Banking atau E-Wallet Anda.</p>
                      <div className="w-64 h-64 bg-slate-50 border-2 border-slate-200 rounded-3xl p-4 flex items-center justify-center relative overflow-hidden group">
                        {paymentConfig.qrisImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={paymentConfig.qrisImageUrl} alt="QRIS Flash Global" className="w-full h-full object-contain" />
                        ) : (
                          <div className="text-center">
                            <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-400">QRIS Belum Tersedia</p>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-[#C5A059]/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">Didukung oleh seluruh metode pembayaran</p>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Seksi Upload Bukti Transfer */}
              <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-200">
                <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#C5A059]" /> 2. Unggah Bukti Pembayaran
                </h3>
                <p className="text-slate-500 text-xs mb-6 font-medium leading-relaxed">Pastikan gambar bukti transfer memperlihatkan Nominal, Tanggal, dan Status Berhasil.</p>

                {/* Kotak Drag & Drop Area */}
                <label className="border-2 border-dashed border-slate-200 hover:border-[#7A171D] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 hover:bg-slate-50/50 min-h-[220px] relative overflow-hidden group">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  
                  <AnimatePresence mode="wait">
                    {receiptPreview ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-slate-900 p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptPreview} alt="Pratinjau Bukti" className="max-w-full max-h-full object-contain rounded-2xl" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <span className="bg-white text-slate-900 font-bold px-5 py-2.5 rounded-xl shadow-xl flex items-center gap-2 transform group-hover:scale-105 transition-transform">
                            <Upload className="w-4 h-4" /> Ganti Gambar
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-[#7A171D] group-hover:scale-110 transition-all duration-300">
                          <Upload className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">Pilih file gambar bukti transfer</p>
                          <p className="text-xs text-slate-400 mt-1.5 font-medium">Mendukung format JPG, JPEG, PNG (Maks 5MB)</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </label>

                {/* Custom Error Msg */}
                <AnimatePresence>
                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl flex items-start gap-3 shadow-sm">
                      <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" /> <span className="leading-relaxed">{errorMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons (Submit & Pay Later) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                
                {/* Tombol Tunda Pembayaran (Kiri, proporsional) */}
                <div className="sm:col-span-5 md:col-span-4">
                  <Button 
                    type="button" 
                    onClick={handlePayLater}
                    variant="outline" 
                    disabled={isLoading || !currentOrder}
                    className="w-full h-16 bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Clock className="w-4 h-4 text-slate-400" /> Bayar Nanti
                  </Button>
                </div>

                {/* Tombol Submit Utama (Kanan, mendominasi) */}
                <div className="sm:col-span-7 md:col-span-8 bg-white rounded-2xl shadow-xl shadow-[#25D366]/20 border border-[#25D366]/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#25D366] rounded-full blur-[80px] opacity-10 pointer-events-none" />
                  
                  <button 
                    type="submit" 
                    disabled={isLoading || !currentOrder}
                    className="w-full h-16 bg-[#25D366] hover:bg-[#1DA851] text-white font-black text-sm md:text-base rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed group relative z-10 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-5 h-5 fill-current opacity-90" />
                        Konfirmasi ke WhatsApp <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
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