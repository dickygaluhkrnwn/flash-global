"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, Lock, ArrowRight, 
  ShieldCheck, FileText, QrCode, Upload, Copy, CheckCircle
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// Mendefinisikan tipe data secara tegas untuk menggantikan 'any'
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
  
  // State Data Order Nyata dari Firestore menggunakan tipe OrderSummary
  const [currentOrder, setCurrentOrder] = useState<OrderSummary | null>(null);
  const [isFetchingOrder, setIsFetchingOrder] = useState(true);

  // State Input Bukti Transfer
  const [uploadReceipt, setUploadReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

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
          weight: docData.weight || 0,
          vehicle: docData.selectedVehicle || "Blind Van",
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

  // PROSES UPDATE STATUS & SUBMIT PEMBAYARAN KE FIRESTORE
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uploadReceipt) {
      setErrorMsg("Harap unggah gambar bukti transfer Anda terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      if (currentOrder?.id) {
        // Update status dokumen secara langsung di Firestore
        const orderRef = doc(db, "orders", currentOrder.id);
        await updateDoc(orderRef, {
          status: "Sedang Diproses",
          paymentStatus: "Sedang Diverifikasi Finance",
          paymentMethod: "Transfer Bank Manual",
          paidAt: new Date().toISOString()
          // Catatan: Pada fase produksi berikutnya, file gambar bukti transfer 
          // akan diunggah ke Firebase Storage untuk menghasilkan public URL-nya.
        });
      }

      // Alihkan halaman kembali ke dasbor
      router.push("/dashboard");
    } catch (error) {
      console.error("Gagal memproses pembayaran:", error);
      setErrorMsg("Gagal mengonfirmasi transaksi. Silakan coba lagi.");
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
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-15 pointer-events-none" />

      <div className="max-w-5xl mx-auto z-10 relative">
        
        {/* Header Seksi */}
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[#7A171D] bg-[#7A171D]/5 px-4 py-2 rounded-full border border-[#7A171D]/10 inline-block mb-3">
            Langkah Terakhir
          </span>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Selesaikan Pembayaran</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-lg mx-auto">
            Selesaikan transfer ke rekening resmi Flash Global untuk segera menerbitkan manifes dan memproses penjemputan kurir.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Kolom Kiri: Rincian Pesanan (Order Summary Nyata) */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 border border-gray-100 sticky top-28">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-4 border-gray-100">
                <FileText className="w-5 h-5 text-gray-400" /> Ringkasan Order
              </h3>
              
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
                      <span className="font-bold text-gray-900 text-right truncate max-w-[120px]">{currentOrder.destination}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Berat Kargo</span>
                      <span className="font-bold text-gray-900">{currentOrder.weight} Kg</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Layanan Armada</span>
                      <span className="font-bold text-gray-900">{currentOrder.vehicle}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Proteksi</span>
                      <span className="font-bold text-green-600">Terdaftar</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-gray-200 pt-6 mb-6">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-bold text-gray-500">Total Tagihan</span>
                      <span className="text-2xl font-black text-[#7A171D]">{formatRupiah(currentOrder.totalCost)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 text-right mt-1">*Sudah termasuk PPN & Admin</p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-center text-gray-400 py-6">Tidak ada data order aktif.</p>
              )}

              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                <span>Transaksi dijamin aman dan terverifikasi otomatis ke Dasbor Anda.</span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Detail Rekening Perusahaan & Upload Bukti */}
          <div className="w-full lg:w-2/3">
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              
              {/* Seksi Detail Rekening Bank */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#7A171D]" /> 1. Rekening Resmi Perusahaan
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { bank: "BCA", norek: "8720516839", nama: "PT FLASH GLOBAL LOGISTIK" },
                    { bank: "MANDIRI", norek: "1320087451296", nama: "PT FLASH GLOBAL LOGISTIK" }
                  ].map((rek) => (
                    <div key={rek.bank} className="p-5 border border-gray-100 rounded-2xl bg-gray-50 flex items-center justify-between group">
                      <div className="space-y-1">
                        <span className="inline-block bg-gray-900 text-white font-black px-2 py-0.5 rounded text-[10px] tracking-wide">{rek.bank}</span>
                        <p className="font-mono font-black text-gray-900 text-lg tracking-wider mt-1">{rek.norek}</p>
                        <p className="text-xs text-gray-400 font-bold uppercase">{rek.nama}</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleCopyText(rek.norek, rek.bank)}
                        className="p-2.5 rounded-xl border border-gray-200 bg-white hover:border-[#7A171D] text-gray-400 hover:text-[#7A171D] transition-colors relative"
                      >
                        {copiedText === rek.bank ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
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
                    <p className="text-gray-500 mt-0.5">Verifikasi otomatis tanpa kirim bukti transfer saat ini eksklusif hanya tersedia pada Aplikasi Mobile.</p>
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
                <label className="border-2 border-dashed border-gray-200 hover:border-[#7A171D] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-gray-50 min-h-[180px] relative overflow-hidden group">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  
                  <AnimatePresence mode="wait">
                    {receiptPreview ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptPreview} alt="Pratinjau Bukti" className="w-full h-full object-contain rounded-xl border" />
                        <div className="absolute bottom-4 left-1/2 -translate-y-1/2 -translate-x-1/2 bg-gray-900/80 backdrop-blur text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">Ganti Gambar</div>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center mx-auto text-gray-400 group-hover:text-[#7A171D] transition-colors">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">Pilih file gambar bukti transfer</p>
                        <p className="text-xs text-gray-400">Mendukung format JPG, JPEG, PNG (Maksimal 5MB)</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </label>

                {/* Custom Error Msg */}
                <AnimatePresence>
                  {errorMsg && (
                    <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl">
                      {errorMsg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Button */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#7A171D]/30 disabled:opacity-70 disabled:cursor-not-allowed group text-lg"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Memvalidasi Data...
                  </>
                ) : (
                  <>
                    Konfirmasi & Kirim Bukti <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}