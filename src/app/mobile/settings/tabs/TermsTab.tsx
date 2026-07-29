"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ChevronDown, ChevronUp, Scale, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TermsTab() {
  const [expandedDoc, setExpandedDoc] = useState<"terms" | "privacy" | null>(null);

  const toggleDoc = (docType: "terms" | "privacy") => {
    setExpandedDoc(expandedDoc === docType ? null : docType);
  };

  return (
    <div className="space-y-6 pb-6 relative z-10">

      <div className="space-y-4">
        
        {/* ======================================================== */}
        {/* DOCUMENT 1: TERMS AND CONDITIONS */}
        {/* ======================================================== */}
        <div className={cn(
          "rounded-[2rem] overflow-hidden transition-all duration-300 shadow-sm border", 
          expandedDoc === "terms" 
            ? "border-[#7A171D]/30 bg-white" 
            : "border-slate-200 bg-slate-50"
        )}>
          <div onClick={() => toggleDoc("terms")} className="p-5 flex items-center justify-between gap-4 cursor-pointer tap-highlight-transparent">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300", 
                expandedDoc === "terms" 
                  ? "bg-gradient-to-br from-[#9A242B] to-[#7A171D] border-[#5A0E13] text-white shadow-sm" 
                  : "bg-white border-slate-200 text-slate-500 shadow-sm"
              )}>
                <Scale className="w-5 h-5 drop-shadow-sm" />
              </div>
              <div className="min-w-0 pr-2">
                <h3 className="font-black text-slate-900 text-xs tracking-tight">Terms & Conditions</h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium truncate">Syarat penggunaan layanan.</p>
              </div>
            </div>
            
            <button className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 outline-none shadow-sm border tap-highlight-transparent",
              expandedDoc === "terms"
                ? "bg-[#7A171D] text-white border-[#5A0E13]"
                : "bg-white border-slate-200 text-slate-500"
            )}>
              {expandedDoc === "terms" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {expandedDoc === "terms" && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                className="border-t border-[#7A171D]/10"
              >
                <div className="p-5 bg-slate-50/50 max-h-[350px] overflow-y-auto no-scrollbar text-sm space-y-5">
                  
                  <div>
                    <h4 className="font-black text-slate-900 text-[11px] mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-[6px] bg-[#7A171D]/10 flex items-center justify-center text-[#7A171D] text-[9px] shadow-sm border border-[#7A171D]/20">1</span> 
                      Ketentuan Layanan
                    </h4>
                    <p className="leading-relaxed font-medium pl-7 text-[10px] text-slate-500">PT Flash Global Logistik (&quot;Flash Global&quot;) bertindak sebagai penyedia layanan pengiriman. Dengan menggunakan layanan kami, Anda setuju untuk tunduk pada seluruh syarat ini.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-black text-slate-900 text-[11px] mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-[6px] bg-[#7A171D]/10 flex items-center justify-center text-[#7A171D] text-[9px] shadow-sm border border-[#7A171D]/20">2</span> 
                      Barang Terlarang
                    </h4>
                    <p className="leading-relaxed font-medium pl-7 text-[10px] text-slate-500 mb-1.5">Pengguna dilarang mengirimkan:</p>
                    <ul className="list-disc pl-11 space-y-1 font-medium text-[10px] text-slate-500">
                      <li>Narkotika & obat terlarang.</li>
                      <li>Barang mudah meledak/terbakar.</li>
                      <li>Uang tunai & perhiasan tanpa asuransi.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-[11px] mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-[6px] bg-[#7A171D]/10 flex items-center justify-center text-[#7A171D] text-[9px] shadow-sm border border-[#7A171D]/20">3</span> 
                      Asuransi
                    </h4>
                    <p className="leading-relaxed font-medium pl-7 text-[10px] text-slate-500">Flash Global bertanggung jawab maksimal 10x lipat ongkir, kecuali Pengguna menggunakan Asuransi Tambahan.</p>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-[11px] mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-[6px] bg-[#7A171D]/10 flex items-center justify-center text-[#7A171D] text-[9px] shadow-sm border border-[#7A171D]/20">4</span> 
                      Pembatalan
                    </h4>
                    <p className="leading-relaxed font-medium pl-7 text-[10px] text-slate-500">Pembatalan setelah armada dalam perjalanan dikenakan penalti 50% dari tarif dasar.</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-center">
                    <button className="flex items-center gap-1.5 text-white font-black bg-[#7A171D] active:bg-[#5A0E13] px-6 py-3 rounded-xl shadow-sm transition-all text-[10px] uppercase tracking-widest tap-highlight-transparent">
                      <Download className="w-3.5 h-3.5" /> Unduh PDF
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
          "rounded-[2rem] overflow-hidden transition-all duration-300 shadow-sm border", 
          expandedDoc === "privacy" 
            ? "border-[#C5A059]/40 bg-white" 
            : "border-slate-200 bg-slate-50"
        )}>
          <div onClick={() => toggleDoc("privacy")} className="p-5 flex items-center justify-between gap-4 cursor-pointer tap-highlight-transparent">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300", 
                expandedDoc === "privacy" 
                  ? "bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] border-[#A68345] text-white shadow-sm" 
                  : "bg-white border-slate-200 text-slate-500 shadow-sm"
              )}>
                <ShieldCheck className="w-5 h-5 drop-shadow-sm" />
              </div>
              <div className="min-w-0 pr-2">
                <h3 className="font-black text-slate-900 text-xs tracking-tight">Privacy Policy</h3>
                <p className="text-[10px] text-slate-500 mt-0.5 font-medium truncate">Pengumpulan & perlindungan data.</p>
              </div>
            </div>
            
            <button className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 outline-none shadow-sm border tap-highlight-transparent",
              expandedDoc === "privacy"
                ? "bg-[#C5A059] text-white border-[#a88645]"
                : "bg-white border-slate-200 text-slate-500"
            )}>
              {expandedDoc === "privacy" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {expandedDoc === "privacy" && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                className="border-t border-[#C5A059]/20"
              >
                <div className="p-5 bg-slate-50/50 max-h-[350px] overflow-y-auto no-scrollbar text-sm space-y-5">
                  
                  <div>
                    <h4 className="font-black text-slate-900 text-[11px] mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-[6px] bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] text-[9px] shadow-sm border border-[#C5A059]/20">1</span> 
                      Pengumpulan Data
                    </h4>
                    <p className="leading-relaxed font-medium pl-7 text-[10px] text-slate-500">Kami mengumpulkan informasi identitas (Nama, No HP, Email) dan lokasi untuk efisiensi logistik.</p>
                  </div>
                  
                  <div>
                    <h4 className="font-black text-slate-900 text-[11px] mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-[6px] bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] text-[9px] shadow-sm border border-[#C5A059]/20">2</span> 
                      Penggunaan Data
                    </h4>
                    <p className="leading-relaxed font-medium pl-7 text-[10px] text-slate-500 mb-1.5">Informasi digunakan untuk:</p>
                    <ul className="list-disc pl-11 space-y-1 font-medium text-[10px] text-slate-500">
                      <li>Koordinasi penjemputan/pengiriman.</li>
                      <li>Notifikasi resi dan tracking.</li>
                      <li>Keamanan sistem.</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 text-[11px] mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-[6px] bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] text-[9px] shadow-sm border border-[#C5A059]/20">3</span> 
                      Keamanan Data
                    </h4>
                    <p className="leading-relaxed font-medium pl-7 text-[10px] text-slate-500">Data Anda dienkripsi. Kami <strong className="text-slate-900">tidak menjual</strong> data Anda ke pihak ketiga.</p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-center">
                    <button className="flex items-center gap-1.5 text-white font-black bg-[#C5A059] active:bg-[#a88645] px-6 py-3 rounded-xl shadow-sm transition-all text-[10px] uppercase tracking-widest tap-highlight-transparent">
                      <Download className="w-3.5 h-3.5" /> Unduh Privasi
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