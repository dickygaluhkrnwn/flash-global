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
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="glass-card rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white overflow-hidden font-sans relative"
    >
      
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#7A171D]/5 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#C5A059]/5 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* Header Sticky */}
      <div className="p-8 md:p-10 border-b border-white/60 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white/40 backdrop-blur-xl sticky top-0 z-20 shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Syarat & Kebijakan</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Syarat, ketentuan, dan komitmen kami terhadap privasi data logistik Anda.</p>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-6 relative z-10">
        
        {/* ======================================================== */}
        {/* DOCUMENT 1: TERMS AND CONDITIONS */}
        {/* ======================================================== */}
        <div className={cn(
          "rounded-[1.5rem] overflow-hidden transition-all duration-300 group bg-white/60 backdrop-blur-md border", 
          expandedDoc === "terms" 
            ? "border-[#7A171D]/30 shadow-[0_10px_30px_rgba(122,23,29,0.08)] bg-white/90" 
            : "border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] hover:border-[#7A171D]/20 hover:bg-white/80 hover:shadow-md"
        )}>
          <div 
            onClick={() => toggleDoc("terms")}
            className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 cursor-pointer"
          >
            <div className="flex items-start sm:items-center gap-5">
              <div className={cn(
                "w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 border shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] transition-all duration-300", 
                expandedDoc === "terms" 
                  ? "bg-gradient-to-br from-[#9A242B] to-[#7A171D] border-[#5A0E13] text-white shadow-[0_8px_16px_rgba(122,23,29,0.2)]" 
                  : "bg-gradient-to-br from-slate-100 to-slate-200 border-white text-slate-500 group-hover:text-[#7A171D] group-hover:scale-105"
              )}>
                <Scale className="w-7 h-7 drop-shadow-sm" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg md:text-xl tracking-tight">Terms and Conditions</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed max-w-sm">Syarat dan aturan saat menggunakan layanan Flash Global.</p>
              </div>
            </div>
            
            <button className={cn(
              "font-bold text-xs flex items-center justify-center gap-2 px-5 py-3 rounded-xl border transition-all w-full sm:w-auto active:scale-95 shadow-sm",
              expandedDoc === "terms"
                ? "bg-[#7A171D]/5 text-[#7A171D] border-[#7A171D]/20 hover:bg-[#7A171D]/10"
                : "bg-white border-slate-200 text-slate-600 hover:text-[#7A171D] hover:border-[#7A171D]/30"
            )}>
              {expandedDoc === "terms" ? (
                <>Tutup Dokumen <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Baca Dokumen <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          </div>

          <AnimatePresence>
            {expandedDoc === "terms" && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="border-t border-[#7A171D]/10"
              >
                <div className="p-6 md:p-8 bg-white/50 max-h-[500px] overflow-y-auto client-scrollbar text-sm text-slate-600 space-y-6">
                  
                  <div>
                    <h4 className="font-black text-slate-900 text-base mb-2 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#7A171D]/10 flex items-center justify-center text-[#7A171D] text-xs shadow-sm border border-[#7A171D]/20">1</span> 
                      Ketentuan Layanan Pengiriman
                    </h4>
                    <p className="leading-relaxed font-medium pl-10 text-slate-500">PT Flash Global Logistik (&quot;Flash Global&quot;) bertindak sebagai perantara dan penyedia layanan pengiriman kargo dan logistik. Dengan menggunakan layanan kami, Anda (&quot;Pengguna&quot;) setuju untuk tunduk pada seluruh syarat dan ketentuan ini.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-black text-slate-900 text-base mb-2 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#7A171D]/10 flex items-center justify-center text-[#7A171D] text-xs shadow-sm border border-[#7A171D]/20">2</span> 
                      Barang yang Dilarang (Prohibited Items)
                    </h4>
                    <p className="leading-relaxed font-medium pl-10 text-slate-500 mb-2">Pengguna dilarang keras mengirimkan barang-barang berikut melalui jaringan Flash Global:</p>
                    <ul className="list-disc pl-14 space-y-1.5 font-medium text-slate-500">
                      <li>Narkotika, psikotropika, dan obat-obatan terlarang.</li>
                      <li>Barang mudah meledak, terbakar, atau beracun (Dangerous Goods tanpa deklarasi resmi).</li>
                      <li>Uang tunai, surat berharga, atau perhiasan berharga tanpa perlindungan asuransi khusus.</li>
                      <li>Barang selundupan atau barang ilegal menurut hukum yang berlaku di Republik Indonesia.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-base mb-2 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#7A171D]/10 flex items-center justify-center text-[#7A171D] text-xs shadow-sm border border-[#7A171D]/20">3</span> 
                      Asuransi dan Ganti Rugi
                    </h4>
                    <p className="leading-relaxed font-medium pl-10 text-slate-500">Flash Global hanya bertanggung jawab atas kerusakan atau kehilangan kargo maksimum senilai 10x lipat dari ongkos kirim dasar, kecuali Pengguna telah membayar biaya premi Asuransi Tambahan saat proses booking. Ganti rugi asuransi tunduk pada investigasi tim legal kami maksimal 14 hari kerja.</p>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-base mb-2 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#7A171D]/10 flex items-center justify-center text-[#7A171D] text-xs shadow-sm border border-[#7A171D]/20">4</span> 
                      Pembatalan dan Pengembalian Dana (Refund)
                    </h4>
                    <p className="leading-relaxed font-medium pl-10 text-slate-500">Pembatalan pesanan hanya dapat dilakukan sebelum armada dikerahkan ke titik penjemputan. Pembatalan setelah armada dalam perjalanan akan dikenakan biaya penalti sebesar 50% dari total tarif dasar.</p>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-slate-200/60 flex justify-center">
                    <button className="flex items-center gap-2 text-[#7A171D] font-black bg-white border border-slate-200 px-8 py-4 rounded-xl hover:bg-[#7A171D]/5 hover:border-[#7A171D]/30 hover:shadow-md transition-all text-sm active:scale-95">
                      <Download className="w-4 h-4" /> Unduh Dokumen PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ======================================================== */}
        {/* DOCUMENT 2: PRIVACY POLICY */}
        {/* ======================================================== */}
        <div className={cn(
          "rounded-[1.5rem] overflow-hidden transition-all duration-300 group bg-white/60 backdrop-blur-md border", 
          expandedDoc === "privacy" 
            ? "border-[#C5A059]/40 shadow-[0_10px_30px_rgba(197,160,89,0.08)] bg-white/90" 
            : "border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] hover:border-[#C5A059]/30 hover:bg-white/80 hover:shadow-md"
        )}>
          <div 
            onClick={() => toggleDoc("privacy")}
            className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 cursor-pointer"
          >
            <div className="flex items-start sm:items-center gap-5">
              <div className={cn(
                "w-14 h-14 rounded-[1.25rem] flex items-center justify-center shrink-0 border shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] transition-all duration-300", 
                expandedDoc === "privacy" 
                  ? "bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] border-[#A68345] text-white shadow-[0_8px_16px_rgba(197,160,89,0.3)]" 
                  : "bg-gradient-to-br from-slate-100 to-slate-200 border-white text-slate-500 group-hover:text-[#C5A059] group-hover:scale-105"
              )}>
                <ShieldCheck className="w-7 h-7 drop-shadow-sm" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg md:text-xl tracking-tight">Privacy Policy</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed max-w-sm">Informasi yang kami kumpulkan dan perlindungannya.</p>
              </div>
            </div>
            
            <button className={cn(
              "font-bold text-xs flex items-center justify-center gap-2 px-5 py-3 rounded-xl border transition-all w-full sm:w-auto active:scale-95 shadow-sm",
              expandedDoc === "privacy"
                ? "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/30 hover:bg-[#C5A059]/20"
                : "bg-white border-slate-200 text-slate-600 hover:text-[#C5A059] hover:border-[#C5A059]/40"
            )}>
              {expandedDoc === "privacy" ? (
                <>Tutup Dokumen <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Baca Dokumen <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          </div>

          <AnimatePresence>
            {expandedDoc === "privacy" && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="border-t border-[#C5A059]/20"
              >
                <div className="p-6 md:p-8 bg-white/50 max-h-[500px] overflow-y-auto client-scrollbar text-sm text-slate-600 space-y-6">
                  
                  <div>
                    <h4 className="font-black text-slate-900 text-base mb-2 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#C5A059]/10 flex items-center justify-center text-[#A68345] text-xs shadow-sm border border-[#C5A059]/20">1</span> 
                      Pengumpulan Data Informasi
                    </h4>
                    <p className="leading-relaxed font-medium pl-10 text-slate-500">Untuk mengoperasikan layanan logistik secara efisien, kami mengumpulkan informasi identitas (Nama, Nomor Telepon, Email) serta informasi operasional (Alamat penjemputan, Alamat tujuan, Detail Manifes Kargo) milik Anda maupun pihak penerima barang.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-black text-slate-900 text-base mb-2 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#C5A059]/10 flex items-center justify-center text-[#A68345] text-xs shadow-sm border border-[#C5A059]/20">2</span> 
                      Penggunaan Data
                    </h4>
                    <p className="leading-relaxed font-medium pl-10 text-slate-500 mb-2">Informasi yang kami kumpulkan akan digunakan secara eksklusif untuk keperluan:</p>
                    <ul className="list-disc pl-14 space-y-1.5 font-medium text-slate-500">
                      <li>Koordinasi penjemputan dan pengiriman barang oleh kurir/mitra armada.</li>
                      <li>Mengirimkan notifikasi tagihan, struk (e-receipt), dan status pelacakan (tracking).</li>
                      <li>Audit internal, keamanan sistem, dan peningkatan algoritma rute logistik kami.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-base mb-2 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#C5A059]/10 flex items-center justify-center text-[#A68345] text-xs shadow-sm border border-[#C5A059]/20">3</span> 
                      Perlindungan & Keamanan Data
                    </h4>
                    <p className="leading-relaxed font-medium pl-10 text-slate-500">Seluruh data Anda dienkripsi and disimpan menggunakan infrastruktur server berstandar internasional. Kami <strong className="text-slate-900">tidak pernah menjual</strong> atau menyewakan data operasional maupun data pribadi pelanggan kepada pihak ketiga untuk tujuan pemasaran eksternal.</p>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-base mb-2 flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#C5A059]/10 flex items-center justify-center text-[#A68345] text-xs shadow-sm border border-[#C5A059]/20">4</span> 
                      Pembagian Data Kepada Pihak Ketiga
                    </h4>
                    <p className="leading-relaxed font-medium pl-10 text-slate-500">Kami hanya membagikan informasi spesifik (seperti alamat dan nomor telepon penerima) secara terbatas kepada Mitra Pengemudi (Driver) semata-mata demi keberhasilan pengiriman kargo Anda ke tujuan.</p>
                  </div>
                  
                  <div className="mt-8 pt-8 border-t border-slate-200/60 flex justify-center">
                    <button className="flex items-center gap-2 text-[#A68345] font-black bg-white border border-slate-200 px-8 py-4 rounded-xl hover:bg-[#C5A059]/10 hover:border-[#C5A059]/40 hover:shadow-md transition-all text-sm active:scale-95">
                      <Download className="w-4 h-4" /> Unduh Kebijakan Privasi
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
} 