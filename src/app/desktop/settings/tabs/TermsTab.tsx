"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, ChevronDown, 
  ChevronUp, Scale, Download 
} from "lucide-react";

export default function TermsTab() {
  const [expandedDoc, setExpandedDoc] = useState<"terms" | "privacy" | null>(null);

  const toggleDoc = (docType: "terms" | "privacy") => {
    setExpandedDoc(expandedDoc === docType ? null : docType);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Terms and Policies</h2>
          <p className="text-gray-500 text-sm mt-1">Syarat, ketentuan, dan komitmen kami terhadap privasi data Anda.</p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        
        {/* DOCUMENT 1: TERMS AND CONDITIONS */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden transition-all bg-white shadow-sm hover:border-[#C5A059]/50">
          <div 
            onClick={() => toggleDoc("terms")}
            className="p-6 flex items-center justify-between cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200 text-[#7A171D] shadow-sm">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Terms and Conditions</h3>
                <p className="text-sm text-gray-500 mt-0.5">Syarat dan aturan yang Anda setujui saat menggunakan layanan Flash Global.</p>
              </div>
            </div>
            <button className="text-[#C5A059] font-bold text-sm flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-[#C5A059]/10 transition-colors">
              {expandedDoc === "terms" ? (
                <>Tutup <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Baca Selengkapnya <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          </div>

          <AnimatePresence>
            {expandedDoc === "terms" && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200"
              >
                <div className="p-6 md:p-8 bg-white max-h-[400px] overflow-y-auto custom-scrollbar text-sm text-gray-600 space-y-4">
                  <h4 className="font-black text-gray-900 text-base mb-2">1. Ketentuan Layanan Pengiriman</h4>
                  <p>PT Flash Global Logistik (&quot;Flash Global&quot;) bertindak sebagai perantara dan penyedia layanan pengiriman kargo dan logistik. Dengan menggunakan layanan kami, Anda (&quot;Pengguna&quot;) setuju untuk tunduk pada seluruh syarat dan ketentuan ini.</p>
                  
                  <h4 className="font-black text-gray-900 text-base mt-4 mb-2">2. Barang yang Dilarang (Prohibited Items)</h4>
                  <p>Pengguna dilarang keras mengirimkan barang-barang berikut melalui jaringan Flash Global:</p>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Narkotika, psikotropika, dan obat-obatan terlarang.</li>
                    <li>Barang mudah meledak, terbakar, atau beracun (Dangerous Goods tanpa deklarasi resmi).</li>
                    <li>Uang tunai, surat berharga, atau perhiasan berharga tanpa perlindungan asuransi khusus.</li>
                    <li>Barang selundupan atau barang ilegal menurut hukum yang berlaku di Republik Indonesia.</li>
                  </ul>

                  <h4 className="font-black text-gray-900 text-base mt-4 mb-2">3. Asuransi dan Ganti Rugi</h4>
                  <p>Flash Global hanya bertanggung jawab atas kerusakan atau kehilangan kargo maksimum senilai 10x lipat dari ongkos kirim dasar, kecuali Pengguna telah membayar biaya premi Asuransi Tambahan saat proses booking. Ganti rugi asuransi tunduk pada investigasi tim legal kami maksimal 14 hari kerja.</p>

                  <h4 className="font-black text-gray-900 text-base mt-4 mb-2">4. Pembatalan dan Pengembalian Dana (Refund)</h4>
                  <p>Pembatalan pesanan hanya dapat dilakukan sebelum armada dikerahkan ke titik penjemputan. Pembatalan setelah armada dalam perjalanan akan dikenakan biaya penalti sebesar 50% dari total tarif dasar.</p>
                  
                  <div className="mt-8 flex justify-center">
                    <button className="flex items-center gap-2 text-[#7A171D] font-bold bg-[#7A171D]/10 px-6 py-3 rounded-xl hover:bg-[#7A171D]/20 transition-colors">
                      <Download className="w-4 h-4" /> Unduh Dokumen PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DOCUMENT 2: PRIVACY POLICY */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden transition-all bg-white shadow-sm hover:border-[#C5A059]/50">
          <div 
            onClick={() => toggleDoc("privacy")}
            className="p-6 flex items-center justify-between cursor-pointer bg-gray-50/50 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200 text-[#C5A059] shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Privacy Policy</h3>
                <p className="text-sm text-gray-500 mt-0.5">Informasi yang kami kumpulkan dan bagaimana kami melindunginya.</p>
              </div>
            </div>
            <button className="text-[#C5A059] font-bold text-sm flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-[#C5A059]/10 transition-colors">
              {expandedDoc === "privacy" ? (
                <>Tutup <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Baca Selengkapnya <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          </div>

          <AnimatePresence>
            {expandedDoc === "privacy" && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200"
              >
                <div className="p-6 md:p-8 bg-white max-h-[400px] overflow-y-auto custom-scrollbar text-sm text-gray-600 space-y-4">
                  <h4 className="font-black text-gray-900 text-base mb-2">1. Pengumpulan Data Informasi</h4>
                  <p>Untuk mengoperasikan layanan logistik secara efisien, kami mengumpulkan informasi identitas (Nama, Nomor Telepon, Email) serta informasi operasional (Alamat penjemputan, Alamat tujuan, Detail Manifes Kargo) milik Anda maupun pihak penerima barang.</p>
                  
                  <h4 className="font-black text-gray-900 text-base mt-4 mb-2">2. Penggunaan Data</h4>
                  <p>Informasi yang kami kumpulkan akan digunakan secara eksklusif untuk keperluan:</p>
                  <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Koordinasi penjemputan dan pengiriman barang oleh kurir/mitra armada.</li>
                    <li>Mengirimkan notifikasi tagihan, struk (e-receipt), dan status pelacakan (tracking).</li>
                    <li>Audit internal, keamanan sistem, dan peningkatan algoritma rute logistik kami.</li>
                  </ul>

                  <h4 className="font-black text-gray-900 text-base mt-4 mb-2">3. Perlindungan & Keamanan Data</h4>
                  <p>Seluruh data Anda dienkripsi and disimpan menggunakan infrastruktur server berstandar internasional. Kami <strong>tidak pernah menjual</strong> atau menyewakan data operasional maupun data pribadi pelanggan kepada pihak ketiga untuk tujuan pemasaran eksternal.</p>

                  <h4 className="font-black text-gray-900 text-base mt-4 mb-2">4. Pembagian Data Kepada Pihak Ketiga</h4>
                  <p>Kami hanya membagikan informasi spesifik (seperti alamat dan nomor telepon penerima) secara terbatas kepada Mitra Pengemudi (Driver) semata-mata demi keberhasilan pengiriman kargo Anda ke tujuan.</p>
                  
                  <div className="mt-8 flex justify-center">
                    <button className="flex items-center gap-2 text-[#C5A059] font-bold bg-[#C5A059]/10 px-6 py-3 rounded-xl hover:bg-[#C5A059]/20 transition-colors">
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