"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  User, Phone, Mail, MapPin, Box, 
  Globe2, ArrowRight, ShieldCheck, 
  MessageCircle, Info, FileText, HelpCircle
} from "lucide-react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// Komponen Utama Form (Membutuhkan Suspense karena membaca URL Params)
function QuoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // State Data Order
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    origin: searchParams.get("origin") || "",
    destination: searchParams.get("destination") || "",
    itemType: "",
    weight: searchParams.get("weight") || "",
    length: searchParams.get("l") || "",
    width: searchParams.get("w") || "",
    height: searchParams.get("h") || "",
  });

  // State untuk Debounce Map (Mencegah patah-patah saat ngetik)
  const [debouncedOrigin, setDebouncedOrigin] = useState(formData.origin);
  const [debouncedDestination, setDebouncedDestination] = useState(formData.destination);

  // Efek Jeda (Debounce) agar peta tidak me-load berulang kali saat user masih mengetik
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedOrigin(formData.origin);
      setDebouncedDestination(formData.destination);
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData.origin, formData.destination]);

  // Fungsi Parser Otomatis saat user melakukan Paste teks/link Google Maps
  const handleSmartPaste = (text: string, type: "origin" | "destination") => {
    let cleanAddress = text.trim();
    if (cleanAddress.includes("maps.google") || cleanAddress.includes("goo.gl/maps")) {
      cleanAddress = `Lokasi Tersemat via Tautan Google Maps: ${cleanAddress.slice(0, 45)}...`;
    }
    setFormData(prev => ({ ...prev, [type]: cleanAddress }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const quoteId = `FFW-${Date.now().toString().slice(-6)}`;
      
      await addDoc(collection(db, "quotes"), {
        ...formData,
        quoteId,
        userId: user?.uid || "guest",
        status: "Menunggu Follow Up",
        createdAt: serverTimestamp(),
      });

      const adminWA = "6285177886877"; 
      const waText = `Halo Admin Flash Global, saya ingin request quotation pengiriman Freight Forwarding (Internasional).%0A%0A*ID Quotation:* ${quoteId}%0A*Nama:* ${formData.name}%0A*No. WA:* ${formData.phone}%0A%0A*📌 Rute Pengiriman:*%0A- Dari: ${formData.origin}%0A- Tujuan: ${formData.destination}%0A%0A*📦 Detail Barang:*%0A- Jenis: ${formData.itemType}%0A- Berat: ${formData.weight} Kg%0A- Dimensi: ${formData.length} x ${formData.width} x ${formData.height} cm%0A%0AMohon dibantu perhitungan harga final beserta pajaknya. Terima kasih.`;
      
      window.open(`https://wa.me/${adminWA}?text=${waText}`, "_blank");
      router.push("/dashboard");

    } catch (error) {
      console.error("Gagal menyimpan quote:", error);
      setErrorMsg("Gagal memproses request. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  // Komponen Pintar untuk me-render Peta Gratis tanpa API Key
  const renderMapPreview = (value: string, type: "origin" | "destination") => {
    if (!value || value.length < 5) return null;

    const isLink = value.includes("http") || value.includes("maps.app");
    const borderColor = type === "origin" ? "border-[#7A171D]/30" : "border-[#C5A059]/30";
    const bgColor = type === "origin" ? "bg-[#7A171D]/5" : "bg-[#C5A059]/5";
    const iconColor = type === "origin" ? "text-[#7A171D]" : "text-[#C5A059]";

    if (isLink) {
      return (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 p-4 ${bgColor} border ${borderColor} rounded-xl flex items-start gap-3`}>
          <MapPin className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
          <div className="text-xs">
            <p className="font-bold text-gray-900 mb-0.5">Tautan Peta Terdeteksi</p>
            <p className="text-gray-600 truncate max-w-[250px]">{value}</p>
            <p className={`mt-1 font-semibold ${iconColor}`}>Tim Forwarding akan menggunakan tautan ini untuk verifikasi koordinat port/alamat.</p>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`mt-3 w-full h-48 rounded-xl overflow-hidden border-2 ${borderColor} shadow-inner relative bg-gray-100`}>
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0 }}
          src={`https://maps.google.com/maps?q=${encodeURIComponent(value)}&output=embed`}
          allowFullScreen
        ></iframe>
      </motion.div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 relative z-10">
      
      {/* Kolom Kiri: Form Input Utama */}
      <div className="w-full lg:w-2/3">
        <div className="mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C5A059] bg-[#C5A059]/10 px-4 py-2 rounded-full border border-[#C5A059]/20 inline-block mb-3">
            Freight Forwarding
          </span>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Request Quotation (Global)</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Lengkapi data di bawah ini. Tim ahli kami akan menghitung rincian biaya, termasuk Duty & Tax untuk destinasi negara tujuan Anda.
          </p>
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-2xl">
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <form id="quote-form" onSubmit={handleSubmit} className="space-y-8">
          
          {/* SEKSI 1: Data Kontak */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <User className="w-5 h-5 text-[#C5A059]" /> 1. Data Kontak (PIC)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Nama Lengkap / Instansi</label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nama PIC atau Perusahaan" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none transition-all text-gray-900 bg-gray-50 font-semibold placeholder:font-normal placeholder:text-gray-400" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Nomor WhatsApp Aktif</label>
                <div className="relative">
                  <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="0812345678" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none transition-all text-gray-900 bg-gray-50 font-semibold placeholder:font-normal placeholder:text-gray-400" required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Email Utama</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@perusahaan.com" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none transition-all text-gray-900 bg-gray-50 font-semibold placeholder:font-normal placeholder:text-gray-400" required />
                </div>
              </div>
            </div>
          </motion.div>

          {/* SEKSI 2: Rute Internasional dengan Smart Map */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <Globe2 className="w-5 h-5 text-[#7A171D]" /> 2. Rute Pengiriman Internasional
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Asal */}
              <div className="space-y-3 relative">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Kota & Negara Asal</label>
                  <div className="relative">
                    <button type="button" onMouseEnter={() => setActiveTooltip("origin")} onMouseLeave={() => setActiveTooltip(null)} className="text-gray-400 hover:text-[#7A171D] transition-colors p-1">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {activeTooltip === "origin" && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 bottom-7 w-64 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 leading-relaxed border border-slate-800">
                          <strong>Fitur Smart Map:</strong> Ketik alamat port/bandara/kota asal atau paste link Google Maps. Peta akan otomatis muncul.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
                  <input type="text" name="origin" value={formData.origin} onChange={handleChange} onPaste={(e) => handleSmartPaste(e.clipboardData.getData("text"), "origin")} placeholder="Cth: Jakarta, Indonesia" className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none transition-all text-gray-900 bg-gray-50 font-semibold placeholder:font-normal placeholder:text-gray-400" required />
                </div>
                {renderMapPreview(debouncedOrigin, "origin")}
              </div>

              {/* Tujuan */}
              <div className="space-y-3 relative">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Kota & Negara Tujuan</label>
                  <div className="relative">
                    <button type="button" onMouseEnter={() => setActiveTooltip("dest")} onMouseLeave={() => setActiveTooltip(null)} className="text-gray-400 hover:text-[#C5A059] transition-colors p-1">
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {activeTooltip === "dest" && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 bottom-7 w-64 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl z-50 leading-relaxed border border-slate-800">
                          <strong>Fitur Smart Map:</strong> Ketik alamat penerima/pelabuhan negara tujuan atau paste link Google Maps untuk pratinjau lokasi.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-4 top-4 text-[#7A171D]" />
                  <input type="text" name="destination" value={formData.destination} onChange={handleChange} onPaste={(e) => handleSmartPaste(e.clipboardData.getData("text"), "destination")} placeholder="Cth: London, United Kingdom" className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none transition-all text-gray-900 bg-gray-50 font-semibold placeholder:font-normal placeholder:text-gray-400" required />
                </div>
                {renderMapPreview(debouncedDestination, "destination")}
              </div>

            </div>
          </motion.div>

          {/* SEKSI 3: Spesifikasi Barang */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-3 border-gray-100">
              <Box className="w-5 h-5 text-gray-600" /> 3. Spesifikasi Kargo Utama
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2 md:col-span-3">
                <label className="text-sm font-semibold text-gray-700">Deskripsi Barang (Sangat Penting untuk Bea Cukai)</label>
                <input type="text" name="itemType" value={formData.itemType} onChange={handleChange} placeholder="Cth: Mesin Kopi Bekas, Pakaian Katun, Dokumen Legal" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none transition-all text-gray-900 bg-gray-50 font-semibold placeholder:font-normal placeholder:text-gray-400" required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Estimasi Berat (Kg)</label>
                <input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="0" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none text-center text-gray-900 bg-gray-50 font-bold placeholder:font-normal placeholder:text-gray-400 transition-all" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Dimensi (P x L x T) cm</label>
                <div className="flex gap-2">
                  <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="P" className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 text-center text-gray-900 bg-gray-50 font-bold placeholder:font-normal placeholder:text-gray-400 outline-none transition-all" required />
                  <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="L" className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 text-center text-gray-900 bg-gray-50 font-bold placeholder:font-normal placeholder:text-gray-400 outline-none transition-all" required />
                  <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="T" className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 text-center text-gray-900 bg-gray-50 font-bold placeholder:font-normal placeholder:text-gray-400 outline-none transition-all" required />
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong className="block mb-1">Kenapa Dimensi Penting?</strong>
                Untuk pengiriman udara/laut internasional, tarif dihitung berdasarkan <b>Berat Aktual</b> atau <b>Berat Volumetrik</b> (P x L x T / 5000), diambil nilai yang paling besar.
              </p>
            </div>
          </motion.div>

        </form>
      </div>

      {/* Kolom Kanan: Info Panel (Sticky) */}
      <div className="w-full lg:w-1/3">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 sticky top-28">
          
          <div className="w-16 h-16 bg-[#C5A059]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#C5A059]/20">
            <FileText className="w-8 h-8 text-[#C5A059]" />
          </div>

          <h3 className="text-xl font-black text-gray-900 mb-2">
            Prosedur Forwarding
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Pengiriman antar negara memerlukan analisis kustom terkait regulasi negara tujuan, pajak, dan pemilihan moda transportasi terbaik.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">1</div>
              <p className="text-sm text-gray-700 font-medium">Anda mengisi formulir request ini.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">2</div>
              <p className="text-sm text-gray-700 font-medium">Sistem meneruskan detail ini ke WhatsApp CS kami.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">3</div>
              <p className="text-sm text-gray-700 font-medium">CS memberikan penawaran harga final (Quotation).</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">4</div>
              <p className="text-sm text-gray-700 font-medium">Jika setuju, CS akan melengkapi data di Dasbor Anda.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6 text-xs font-bold text-green-600 bg-green-50 p-3 rounded-xl border border-green-100">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>Respon Cepat CS dalam 10-15 Menit.</span>
          </div>

          <button 
            type="submit" 
            form="quote-form"
            disabled={isLoading}
            className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#25D366]/30 disabled:opacity-70 group text-sm"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Menghubungkan ke WA...
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5" /> Minta Kuotasi ke WA <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </motion.div>
      </div>

    </div>
  );
}

// Wrapper Utama dengan Suspense untuk Next.js App Router Compatibility
export default function DesktopForwardingQuotePage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#C5A059]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#7A171D]/5 rounded-full blur-[150px] pointer-events-none" />
      
      <Suspense fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center z-10 relative">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#C5A059] rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold animate-pulse">Memuat Formulir Global...</p>
        </div>
      }>
        <QuoteForm />
      </Suspense>
    </main>
  );
}