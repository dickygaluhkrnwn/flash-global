"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, ChevronDown, 
  ChevronUp, Scale, Download 
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TermsTab() {
  const [expandedDoc, setExpandedDoc] = useState<"terms" | "privacy" | null>(null);

  const toggleDoc = (docType: "terms" | "privacy") => {
    setExpandedDoc(expandedDoc === docType ? null : docType);
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden font-sans relative">
      
      {/* Header Sticky */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Syarat & Kebijakan</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Syarat, ketentuan, dan komitmen kami terhadap privasi data logistik Anda.</p>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        
        {/* DOCUMENT 1: TERMS AND CONDITIONS */}
        <div className={cn("border rounded-2xl overflow-hidden transition-all shadow-sm group", expandedDoc === "terms" ? "border-[#7A171D]/30 shadow-md" : "border-slate-200 hover:border-[#7A171D]/30")}>
          <div 
            onClick={() => toggleDoc("terms")}
            className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 bg-white rounded-xl flex items-center justify-center border shadow-sm transition-colors shrink-0", expandedDoc === "terms" ? "border-[#7A171D]/30 text-[#7A171D]" : "border-slate-200 text-slate-400 group-hover:text-[#7A171D]")}>
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base md:text-lg">Terms and Conditions</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed max-w-sm">Syarat dan aturan saat menggunakan layanan Flash Global.</p>
              </div>
            </div>
            <button className="text-[#7A171D] font-bold text-xs flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-[#7A171D]/5 hover:border-[#7A171D]/30 transition-colors w-full sm:w-auto">
              {expandedDoc === "terms" ? (
                <>Tutup <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Baca <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          </div>

          <AnimatePresence>
            {expandedDoc === "terms" && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-200"
              >
                <div className="p-6 md:p-8 bg-white max-h-[400px] overflow-y-auto custom-scrollbar text-sm text-slate-600 space-y-4">
                  <h4 className="font-black text-slate-900 text-base mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 text-xs">1</span> Ketentuan Layanan Pengiriman
                  </h4>
                  <p className="leading-relaxed font-medium pl-8">PT Flash Global Logistik (&quot;Flash Global&quot;) bertindak sebagai perantara dan penyedia layanan pengiriman kargo dan logistik. Dengan menggunakan layanan kami, Anda (&quot;Pengguna&quot;) setuju untuk tunduk pada seluruh syarat dan ketentuan ini.</p>
                  
                  <h4 className="font-black text-slate-900 text-base mt-6 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 text-xs">2</span> Barang yang Dilarang (Prohibited Items)
                  </h4>
                  <p className="leading-relaxed font-medium pl-8">Pengguna dilarang keras mengirimkan barang-barang berikut melalui jaringan Flash Global:</p>
                  <ul className="list-disc pl-12 space-y-2 mt-3 font-medium">
                    <li>Narkotika, psikotropika, dan obat-obatan terlarang.</li>
                    <li>Barang mudah meledak, terbakar, atau beracun (Dangerous Goods tanpa deklarasi resmi).</li>
                    <li>Uang tunai, surat berharga, atau perhiasan berharga tanpa perlindungan asuransi khusus.</li>
                    <li>Barang selundupan atau barang ilegal menurut hukum yang berlaku di Republik Indonesia.</li>
                  </ul>

                  <h4 className="font-black text-slate-900 text-base mt-6 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 text-xs">3</span> Asuransi dan Ganti Rugi
                  </h4>
                  <p className="leading-relaxed font-medium pl-8">Flash Global hanya bertanggung jawab atas kerusakan atau kehilangan kargo maksimum senilai 10x lipat dari ongkos kirim dasar, kecuali Pengguna telah membayar biaya premi Asuransi Tambahan saat proses booking. Ganti rugi asuransi tunduk pada investigasi tim legal kami maksimal 14 hari kerja.</p>

                  <h4 className="font-black text-slate-900 text-base mt-6 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 text-xs">4</span> Pembatalan dan Pengembalian Dana (Refund)
                  </h4>
                  <p className="leading-relaxed font-medium pl-8">Pembatalan pesanan hanya dapat dilakukan sebelum armada dikerahkan ke titik penjemputan. Pembatalan setelah armada dalam perjalanan akan dikenakan biaya penalti sebesar 50% dari total tarif dasar.</p>
                  
                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                    <button className="flex items-center gap-2 text-[#7A171D] font-bold bg-[#7A171D]/5 border border-[#7A171D]/20 px-6 py-3 rounded-xl hover:bg-[#7A171D]/10 hover:shadow-sm transition-all text-sm active:scale-95">
                      <Download className="w-4 h-4" /> Unduh Dokumen PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DOCUMENT 2: PRIVACY POLICY */}
        <div className={cn("border rounded-2xl overflow-hidden transition-all shadow-sm group", expandedDoc === "privacy" ? "border-[#C5A059]/40 shadow-md" : "border-slate-200 hover:border-[#C5A059]/40")}>
          <div 
            onClick={() => toggleDoc("privacy")}
            className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 bg-white rounded-xl flex items-center justify-center border shadow-sm transition-colors shrink-0", expandedDoc === "privacy" ? "border-[#C5A059]/40 text-[#C5A059]" : "border-slate-200 text-slate-400 group-hover:text-[#C5A059]")}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base md:text-lg">Privacy Policy</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed max-w-sm">Informasi yang kami kumpulkan dan perlindungannya.</p>
              </div>
            </div>
            <button className="text-[#C5A059] font-bold text-xs flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-[#C5A059]/5 hover:border-[#C5A059]/30 transition-colors w-full sm:w-auto">
              {expandedDoc === "privacy" ? (
                <>Tutup <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Baca <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          </div>

          <AnimatePresence>
            {expandedDoc === "privacy" && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-200"
              >
                <div className="p-6 md:p-8 bg-white max-h-[400px] overflow-y-auto custom-scrollbar text-sm text-slate-600 space-y-4">
                  <h4 className="font-black text-slate-900 text-base mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 text-xs">1</span> Pengumpulan Data Informasi
                  </h4>
                  <p className="leading-relaxed font-medium pl-8">Untuk mengoperasikan layanan logistik secara efisien, kami mengumpulkan informasi identitas (Nama, Nomor Telepon, Email) serta informasi operasional (Alamat penjemputan, Alamat tujuan, Detail Manifes Kargo) milik Anda maupun pihak penerima barang.</p>
                  
                  <h4 className="font-black text-slate-900 text-base mt-6 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 text-xs">2</span> Penggunaan Data
                  </h4>
                  <p className="leading-relaxed font-medium pl-8">Informasi yang kami kumpulkan akan digunakan secara eksklusif untuk keperluan:</p>
                  <ul className="list-disc pl-12 space-y-2 mt-3 font-medium">
                    <li>Koordinasi penjemputan dan pengiriman barang oleh kurir/mitra armada.</li>
                    <li>Mengirimkan notifikasi tagihan, struk (e-receipt), dan status pelacakan (tracking).</li>
                    <li>Audit internal, keamanan sistem, dan peningkatan algoritma rute logistik kami.</li>
                  </ul>

                  <h4 className="font-black text-slate-900 text-base mt-6 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 text-xs">3</span> Perlindungan & Keamanan Data
                  </h4>
                  <p className="leading-relaxed font-medium pl-8">Seluruh data Anda dienkripsi and disimpan menggunakan infrastruktur server berstandar internasional. Kami <strong>tidak pernah menjual</strong> atau menyewakan data operasional maupun data pribadi pelanggan kepada pihak ketiga untuk tujuan pemasaran eksternal.</p>

                  <h4 className="font-black text-slate-900 text-base mt-6 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 text-xs">4</span> Pembagian Data Kepada Pihak Ketiga
                  </h4>
                  <p className="leading-relaxed font-medium pl-8">Kami hanya membagikan informasi spesifik (seperti alamat dan nomor telepon penerima) secara terbatas kepada Mitra Pengemudi (Driver) semata-mata demi keberhasilan pengiriman kargo Anda ke tujuan.</p>
                  
                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                    <button className="flex items-center gap-2 text-[#C5A059] font-bold bg-[#C5A059]/10 px-6 py-3 rounded-xl hover:bg-[#C5A059]/20 transition-colors text-sm active:scale-95">
                      <Download className="w-4 h-4" /> Unduh Kebijakan Privasi
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}