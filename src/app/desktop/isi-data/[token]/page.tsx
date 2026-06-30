"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { User, MapPin, Phone, FileText, Upload, ShieldCheck, ArrowRight, CheckCircle } from "lucide-react";

export default function DynamicUserFormPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const token = params.token;

  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // --- CATATAN INTEGRASI DATABASE & CLOUDINARY ---
  // [TODO: Firestore] Saat komponen mount, kita bisa fetch data Lead berdasarkan 'token'
  // untuk menampilkan informasi awal (misal negara tujuan & berat yang sudah dihitung di awal).
  // [TODO: Cloudinary] Fungsi upload file nanti akan menembak SDK Cloudinary 
  // sebelum menyimpan secure_url-nya ke dokumen Firestore.
  // -----------------------------------------------

  const handleUploadSimulate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulasi proses simpan data dan lanjut ke halaman pembayaran
    setTimeout(() => {
      setIsLoading(false);
      // Pindah ke rute pembayaran dengan membawa token terkait
      router.push(`/pembayaran?token=${token}`);
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#7A171D]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#C5A059]/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-4xl mx-auto z-10 relative">
        
        {/* Header Seksi */}
        <div className="mb-10 text-center md:text-left">
          <span className="text-xs font-bold uppercase tracking-widest text-[#7A171D] bg-[#7A171D]/5 px-4 py-2 rounded-full border border-[#7A171D]/10 inline-block mb-3">
            Formulir Instruksi Pengiriman
          </span>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lengkapi Detail Pengiriman</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Mohon isi data di bawah dengan benar. Data ini akan digunakan secara resmi untuk manifes kepabeanan internasional.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SEKSI 1: DATA PENGIRIM */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <User className="w-5 h-5 text-[#7A171D]" /> 1. Data Pengirim (Asal)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nama Pengirim</label>
                <input type="text" placeholder="Masukkan nama lengkap Anda" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">No. Telepon / WhatsApp</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-sm font-bold text-gray-400">+62</div>
                  <input type="tel" placeholder="812345678" className="w-full pl-14 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50" required />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Alamat Lengkap Pengirim</label>
                <textarea rows={3} placeholder="Nama jalan, nomor rumah, kecamatan, kabupaten/kota, provinsi, kode pos" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50 resize-none" required></textarea>
              </div>
            </div>
          </motion.div>

          {/* SEKSI 2: DATA PENERIMA */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <MapPin className="w-5 h-5 text-[#C5A059]" /> 2. Data Penerima (Destinasi Luar Negeri)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nama Lengkap Penerima</label>
                <input type="text" placeholder="Masukkan nama lengkap di negara tujuan" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none transition-all bg-gray-50" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">No. Telp Internasional Penerima</label>
                <input type="tel" placeholder="Contoh: +65 9123 4567" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none transition-all bg-gray-50" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Alamat Lengkap & Zip Code Negara Tujuan</label>
                <textarea rows={3} placeholder="Tulis alamat sedetail mungkin termasuk Apartemen/Unit, State/Province, Negara, dan Postal Code" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none transition-all bg-gray-50 resize-none" required></textarea>
              </div>
            </div>
          </motion.div>

          {/* SEKSI 3: MANIFEST BARANG & UPLOAD DOKUMEN */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <FileText className="w-5 h-5 text-gray-500" /> 3. Deskripsi Paket & Berkas Pabean
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Deskripsi Rinci Isi Barang</label>
                <input type="text" placeholder="Contoh: 3 Kemeja Katun, 2 Sepatu Olahraga, 1 Pack Makanan Kering" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-2 focus:ring-[#7A171D]/20 outline-none transition-all bg-gray-50" required />
              </div>
            </div>

            {/* Custom File Upload Area (Cloudinary Mockup) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                <span>Unggah Foto KTP / Paspor Pengirim</span>
                <span className="text-xs text-[#7A171D] font-bold">*Wajib untuk regulasi ekspor</span>
              </label>
              
              <div className="border-2 border-dashed border-gray-200 hover:border-[#C5A059] rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-white transition-all cursor-pointer relative group">
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={handleUploadSimulate}
                  className="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-[#C5A059]" />
                  </div>
                  {fileName ? (
                    <div className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 px-4 py-1.5 rounded-full border border-green-200">
                      <CheckCircle className="w-4 h-4" /> {fileName}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-gray-700">Klik untuk unggah dokumen atau seret berkas ke sini</p>
                      <p className="text-xs text-gray-400 font-semibold">Format JPG, PNG, atau PDF (Maks. 5MB). Kompresi otomatis aktif.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tombol Aksi Akhir */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 pl-2">
              <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
              <span>Seluruh data dilindungi enkripsi SSL end-to-end Flash Global.</span>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-10 py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#7A171D]/20 disabled:opacity-70 group"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Menyimpan Data Manifes...
                </>
              ) : (
                <>
                  Lanjut ke Pembayaran <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}