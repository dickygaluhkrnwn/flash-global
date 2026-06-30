"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Building2, MessageCircle, CreditCard, Lock, 
  ArrowRight, ShieldCheck, FileText, QrCode
} from "lucide-react";

export default function PaymentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "wa">("bank");

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulasi proses verifikasi pembayaran
    setTimeout(() => {
      setIsLoading(false);
      // Redirect ke halaman dashboard setelah pembayaran berhasil/dikonfirmasi
      router.push("/dashboard");
    }, 1500);
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
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pilih Metode Pembayaran</h1>
          <p className="text-gray-500 mt-2 text-sm max-w-lg mx-auto">
            Selesaikan pembayaran Anda untuk segera mendapatkan Nomor Resi (AWB) dan memproses pengiriman ke luar negeri.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Kolom Kiri: Rincian Pesanan (Order Summary) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full lg:w-1/3"
          >
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 border border-gray-100 sticky top-28">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-4 border-gray-100">
                <FileText className="w-5 h-5 text-gray-400" /> Ringkasan Order
              </h3>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Destinasi</span>
                  <span className="font-bold text-gray-900 text-right">Singapura (SG)</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Berat Kargo</span>
                  <span className="font-bold text-gray-900">5 Kg</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Layanan</span>
                  <span className="font-bold text-gray-900">Kargo Udara (Reguler)</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Asuransi Dasar</span>
                  <span className="font-bold text-green-600">Termasuk</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-6 mb-6">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-gray-500">Total Tagihan</span>
                  <span className="text-2xl font-black text-[#7A171D]">Rp 625.000</span>
                </div>
                <p className="text-[10px] text-gray-400 text-right mt-1">*Sudah termasuk pajak PPN & Pabean Dasar</p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
                <span>Transaksi dijamin aman dan terverifikasi oleh sistem Flash Global.</span>
              </div>
            </div>
          </motion.div>

          {/* Kolom Kanan: Pilihan Metode Pembayaran */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full lg:w-2/3"
          >
            <form onSubmit={handlePayment} className="space-y-6">
              
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Metode Tersedia</h3>
                
                <div className="space-y-4">
                  {/* Opsi 1: Transfer Bank Manual */}
                  <label className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "bank" ? "border-[#7A171D] bg-[#7A171D]/5" : "border-gray-200 hover:border-[#C5A059]/50"
                  }`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="bank"
                      checked={paymentMethod === "bank"}
                      onChange={() => setPaymentMethod("bank")}
                      className="mt-1 w-5 h-5 accent-[#7A171D]"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-bold ${paymentMethod === "bank" ? "text-[#7A171D]" : "text-gray-900"}`}>
                            Transfer Rekening Perusahaan
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">Transfer manual ke rekening resmi Flash Global (BCA, Mandiri, BNI). Bukti transfer diunggah setelah ini.</p>
                        </div>
                        <Building2 className={`w-6 h-6 ${paymentMethod === "bank" ? "text-[#7A171D]" : "text-gray-400"}`} />
                      </div>
                    </div>
                  </label>

                  {/* Opsi 2: WhatsApp Admin */}
                  <label className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === "wa" ? "border-[#7A171D] bg-[#7A171D]/5" : "border-gray-200 hover:border-[#C5A059]/50"
                  }`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="wa"
                      checked={paymentMethod === "wa"}
                      onChange={() => setPaymentMethod("wa")}
                      className="mt-1 w-5 h-5 accent-[#7A171D]"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className={`font-bold ${paymentMethod === "wa" ? "text-[#7A171D]" : "text-gray-900"}`}>
                            Konfirmasi via WhatsApp CS
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">Lakukan pembayaran dan kirimkan bukti transfer langsung melalui chat WhatsApp dengan Admin kami.</p>
                        </div>
                        <MessageCircle className={`w-6 h-6 ${paymentMethod === "wa" ? "text-[#7A171D]" : "text-gray-400"}`} />
                      </div>
                    </div>
                  </label>

                  {/* Opsi 3: Midtrans (Terkunci untuk Web) */}
                  <div className="relative flex items-start gap-4 p-5 rounded-2xl border-2 border-gray-100 bg-gray-50 opacity-70 grayscale cursor-not-allowed">
                    {/* Badge Terkunci */}
                    <div className="absolute -top-3 -right-2 bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md z-10">
                      <Lock className="w-3 h-3" /> EKSKLUSIF APLIKASI
                    </div>

                    <input type="radio" disabled className="mt-1 w-5 h-5" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-gray-700">
                            Otomatis (Virtual Account & QRIS)
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">Verifikasi instan via Midtrans (BCA VA, QRIS, Kartu Kredit). <br/> <span className="text-xs font-semibold text-slate-800 bg-slate-200 px-2 py-0.5 rounded mt-1 inline-block">Fitur ini hanya tersedia di Aplikasi Mobile Flash Global.</span></p>
                        </div>
                        <div className="flex gap-2">
                          <QrCode className="w-6 h-6 text-gray-400" />
                          <CreditCard className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
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
                    Memproses...
                  </>
                ) : (
                  <>
                    Konfirmasi Pembayaran <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </main>
  );
}