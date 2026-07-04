"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, Lock, ArrowRight, 
  QrCode, Upload, Copy, 
  CheckCircle, MessageCircle, AlertCircle, ReceiptText
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

interface OrderSummary {
  id: string;
  destination: string;
  weight: number | string;
  vehicle: string;
  totalCost: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  const [currentOrder, setCurrentOrder] = useState<OrderSummary | null>(null);
  const [isFetchingOrder, setIsFetchingOrder] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // State Input Bukti Transfer
  const [uploadReceipt, setUploadReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // FETCH ORDER TERAKHIR USER SECARA REAL-TIME
  useEffect(() => {
    if (!user?.email) {
      setIsFetchingOrder(false);
      return;
    }

    const q = query(
      collection(db, "orders"),
      where("email", "==", user.email),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setCurrentOrder({
          id: snapshot.docs[0].id,
          destination: docData.destination || "Tujuan",
          weight: docData.totalWeight || docData.weight || 0,
          vehicle: docData.selectedVehicle || "Armada",
          totalCost: docData.totalCost || 0
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

  // Fungsi Handle Pilih Gambar Bukti Transfer
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadReceipt(file);
      setReceiptPreview(URL.createObjectURL(file));
      setErrorMsg("");
    }
  };

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

      // 1. Upload Gambar ke Cloudinary
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

      // 2. Update status pesanan di Firestore
      const orderRef = doc(db, "orders", currentOrder.id);
      await updateDoc(orderRef, {
        status: "Sedang Diproses", 
        paymentStatus: "Menunggu Verifikasi Finance",
        paymentMethod: "Transfer Bank Manual",
        receiptUrl: receiptUrl,
        paidAt: new Date().toISOString()
      });

      // 3. Generate Pesan WhatsApp & Redirect
      const adminWhatsApp = "6281234567890"; // Ganti dengan nomor WA Admin/Finance
      const message = `Halo Tim Finance Flash Global,\n\nSaya telah melakukan pembayaran untuk pesanan saya:\n\n🧾 *ID Pesanan:* ${currentOrder.id}\n💰 *Total Tagihan:* ${formatRupiah(currentOrder.totalCost)}\n\nBukti transfer telah saya unggah di sistem web. Mohon segera diverifikasi agar pesanan dapat diproses.\n\nTerima kasih.`;
      
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${adminWhatsApp}?text=${encodedMessage}`, "_blank");

      // 4. Alihkan halaman web kembali ke dasbor
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

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-5 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <div className="max-w-5xl mx-auto z-10 relative">
        
        {/* Header Seksi */}
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#7A171D] bg-[#7A171D]/5 px-4 py-2 rounded-full border border-[#7A171D]/10 inline-block mb-3">
            Tahap Akhir
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Selesaikan Pembayaran</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-lg mx-auto leading-relaxed">
            Transfer tagihan ke rekening resmi Flash Global dan konfirmasikan bukti pembayaran Anda secara instan melalui WhatsApp.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* KOLOM KIRI: INVOICE TAGIHAN */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-[#7A171D]/5 border border-gray-200 sticky top-28">
              <div className="bg-[#7A171D] p-6 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none -translate-y-10 translate-x-10" />
                <ReceiptText className="w-10 h-10 mx-auto mb-3 opacity-90" />
                <h3 className="text-lg font-bold tracking-wider">INVOICE TAGIHAN</h3>
                <p className="text-[#DFBE7B] text-xs font-mono mt-1 font-bold tracking-widest">{currentOrder?.id || "Memuat ID..."}</p>
              </div>
              
              <div className="p-6 md:p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-white">
                {isFetchingOrder ? (
                  <div className="space-y-4 py-4 animate-pulse">
                    <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                    <div className="h-10 bg-gray-200 rounded-xl mt-6"></div>
                  </div>
                ) : currentOrder ? (
                  <>
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Destinasi</span>
                        <span className="font-bold text-gray-900 text-right truncate max-w-[120px]" title={currentOrder.destination}>{currentOrder.destination}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Berat Total</span>
                        <span className="font-bold text-gray-900">{currentOrder.weight} Kg</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 font-medium">Layanan Armada</span>
                        <span className="font-bold text-gray-900 text-right">{currentOrder.vehicle}</span>
                      </div>
                    </div>

                    <div className="border-t-2 border-dashed border-gray-200 pt-6 mb-2">
                      <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Total Harus Dibayar</p>
                      <p className="text-3xl font-black text-[#7A171D]">{formatRupiah(currentOrder.totalCost)}</p>
                      <p className="text-[10px] text-gray-400 mt-1.5">*Nominal sudah termasuk PPN & Biaya Layanan Tambahan</p>
                    </div>
                  </>
                ) : (
                  <div className="py-8 flex flex-col items-center text-center">
                    <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                    <p className="text-sm font-bold text-gray-900">Pesanan Tidak Ditemukan</p>
                    <p className="text-xs text-gray-500 mt-1">Sistem gagal menarik data order terakhir Anda.</p>
                  </div>
                )}
              </div>
              
              {/* Gerigi Bawah Ala Struk */}
              <div className="h-4 w-full bg-[radial-gradient(circle,transparent_4px,#ffffff_5px)] bg-[length:12px_12px] -mt-2"></div>
            </div>
          </div>

          {/* KOLOM KANAN: INSTRUKSI & KONFIRMASI */}
          <div className="w-full lg:w-2/3">
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              
              {/* Seksi Detail Rekening Bank */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#C5A059]" /> 1. Lakukan Transfer Bank
                </h3>
                <p className="text-sm text-gray-500 mb-6">Silakan transfer sesuai dengan <b className="text-gray-800">Total Harus Dibayar</b> ke salah satu rekening resmi kami di bawah ini:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { bank: "BCA", norek: "8720516839", nama: "PT FLASH GLOBAL LOGISTIK", color: "bg-blue-600" },
                    { bank: "MANDIRI", norek: "1320087451296", nama: "PT FLASH GLOBAL LOGISTIK", color: "bg-amber-500" }
                  ].map((rek) => (
                    <div key={rek.bank} className="p-5 border border-gray-200 rounded-2xl bg-white shadow-sm flex items-center justify-between group hover:border-[#C5A059] transition-all">
                      <div className="space-y-1">
                        <span className={`inline-block text-white font-black px-2.5 py-0.5 rounded text-[10px] tracking-wide ${rek.color}`}>{rek.bank}</span>
                        <p className="font-mono font-black text-gray-900 text-lg tracking-wider mt-1">{rek.norek}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{rek.nama}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleCopyText(rek.norek, rek.bank)}
                        className="p-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-[#C5A059]/10 hover:border-[#C5A059] hover:text-[#C5A059] text-gray-400 transition-all focus:outline-none focus:ring-4 focus:ring-[#C5A059]/20"
                        title="Salin Rekening"
                      >
                        {copiedText === rek.bank ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Info Midtrans Dikunci */}
                <div className="mt-6 relative flex items-start gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-gray-50 opacity-60 grayscale cursor-not-allowed overflow-hidden">
                  <div className="absolute -top-3 -right-2 bg-slate-800 text-white text-[9px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md z-10">
                    <Lock className="w-2.5 h-3" /> EKSKLUSIF APPS
                  </div>
                  <QrCode className="w-6 h-6 text-gray-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-bold text-gray-700">Otomatis Instan (QRIS & Virtual Account)</h4>
                    <p className="text-gray-500 mt-0.5">Verifikasi otomatis tanpa kirim bukti transfer eksklusif hanya tersedia pada Aplikasi Mobile Flash Global.</p>
                  </div>
                </div>
              </div>

              {/* Seksi Upload Bukti Transfer */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#C5A059]" /> 2. Unggah Bukti Pembayaran
                </h3>
                <p className="text-gray-400 text-xs mb-6 font-medium">Pastikan gambar bukti transfer memperlihatkan Nominal, Tanggal, dan Status Berhasil.</p>

                {/* Kotak Drag & Drop Area */}
                <label className="border-2 border-dashed border-gray-200 hover:border-[#7A171D] rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-gray-50 min-h-[220px] relative overflow-hidden group">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  
                  <AnimatePresence mode="wait">
                    {receiptPreview ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-slate-900 p-2 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptPreview} alt="Pratinjau Bukti" className="max-w-full max-h-full object-contain rounded-2xl" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white text-gray-900 font-bold px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
                            <Upload className="w-4 h-4" /> Ganti Gambar
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mx-auto text-gray-400 group-hover:text-[#7A171D] group-hover:scale-110 transition-all duration-300">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-gray-700">Pilih file gambar bukti transfer</p>
                          <p className="text-xs text-gray-400 mt-1">Mendukung format JPG, JPEG, PNG (Maksimal 5MB)</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </label>

                {/* Custom Error Msg */}
                <AnimatePresence>
                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-2xl flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0" /> {errorMsg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Button */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#25D366]/10 border border-[#25D366]/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#25D366] rounded-full blur-[100px] opacity-10 pointer-events-none" />
                
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" /> 3. Konfirmasi Pesanan
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Sistem akan mengunggah bukti Anda dan langsung mengarahkan Anda ke WhatsApp CS Finance untuk verifikasi instan.
                </p>

                <button 
                  type="submit" 
                  disabled={isLoading || !currentOrder}
                  className="w-full bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#25D366]/30 disabled:opacity-60 disabled:cursor-not-allowed group text-lg relative z-10"
                >
                  {isLoading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Memproses Data...
                    </>
                  ) : (
                    <>
                      Kirim Bukti & Konfirmasi WA <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}