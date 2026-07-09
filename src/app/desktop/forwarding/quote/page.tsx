"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  User, Phone, Mail, MapPin, Box, 
  Globe2, ArrowRight, ShieldCheck, 
  MessageCircle, Info, FileText, CheckCircle2, ChevronRight, Zap
} from "lucide-react";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// --- IMPORT UI KIT ---
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// ======================================================================
// PENGGUNAAN DYNAMIC IMPORT SSR: FALSE (UNTUK MAPBOX INDEPENDEN)
// ======================================================================
const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-12 w-full bg-gray-50/80 rounded-xl border animate-pulse flex items-center px-4 text-xs text-gray-400">Loading satelit Mapbox...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSmartMapChange = (name: string, value: string) => {
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
        serviceType: "Internasional Forwarding",
        status: "Menunggu Follow Up",
        createdAt: serverTimestamp(),
      });

      const adminWA = "6285177886877"; 
      const waText = `Halo Admin Flash Global, saya ingin request quotation pengiriman Freight Forwarding (Internasional).%0A%0A*ID Quotation:* ${quoteId}%0A*Nama:* ${formData.name}%0A*No. WA:* ${formData.phone}%0A%0A*📌 Rute Pengiriman:*%0A- Dari: ${formData.origin}%0A- Tujuan: ${formData.destination}%0A%0A*📦 Detail Kargo:*%0A- Jenis Barang: ${formData.itemType}%0A- Berat Est: ${formData.weight} Kg%0A- Dimensi: ${formData.length}x${formData.width}x${formData.height} cm%0A%0AMohon dibantu perhitungan harga final (Freight, Duty & Tax). Terima kasih.`;
      
      window.open(`https://wa.me/${adminWA}?text=${waText}`, "_blank");
      router.push("/dashboard");

    } catch (error) {
      console.error("Gagal menyimpan quote:", error);
      setErrorMsg("Gagal memproses request. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 relative z-10 items-start">
      
      {/* ========================================================= */}
      {/* KOLOM KIRI: FORM SCROLLABLE PREMIUM                       */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[60%] xl:w-[65%] pb-20">
        
        <div className="mb-10">
          <Badge variant="default" className="mb-4 bg-brand-gold/10 text-brand-gold border-brand-gold/20 flex items-center w-fit gap-2">
            <Globe2 className="w-3.5 h-3.5"/> Kargo Internasional
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
            Minta Penawaran <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-yellow-600">Global Forwarding</span>
          </h1>
          <p className="text-gray-500 mt-2 text-base max-w-xl">Lengkapi data kargo Anda. Tim ahli bea cukai dan ekspor-impor kami akan memberikan penawaran harga (Quotation) terbaik.</p>
        </div>

        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-2xl flex items-center gap-3 shadow-sm">
              <Info className="w-5 h-5 shrink-0"/> {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <form id="quote-form" onSubmit={handleSubmit} className="space-y-8">
          
          {/* SEKSI 1: Rute Internasional Cerdas */}
          <Card className="shadow-premium border-gray-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-gold"></div>
            <CardContent className="p-8 pl-10">
              <div className="flex items-center gap-4 mb-6 border-b pb-4 border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center font-black">1</div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Globe2 className="w-5 h-5 text-gray-400"/> Rute Pengiriman Internasional</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Asal Mapbox */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Kota/Pelabuhan Asal</label>
                  <div className="border-2 border-gray-100 focus-within:border-brand-gold/40 focus-within:ring-4 focus-within:ring-brand-gold/10 rounded-xl transition-all bg-gray-50 overflow-hidden">
                    <SearchBox
                      accessToken={MAPBOX_TOKEN}
                      options={{ language: 'id' }}
                      value={formData.origin}
                      placeholder="Cari lokasi asal..."
                      onRetrieve={(res) => {
                        const feature = res.features[0];
                        handleSmartMapChange("origin", feature.properties.full_address || feature.properties.name);
                      }}
                      theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '14px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '600' } }}
                    />
                  </div>
                </div>

                {/* Tujuan Mapbox */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Kota/Negara Tujuan</label>
                  <div className="border-2 border-gray-100 focus-within:border-brand-gold/40 focus-within:ring-4 focus-within:ring-brand-gold/10 rounded-xl transition-all bg-gray-50 overflow-hidden">
                    <SearchBox
                      accessToken={MAPBOX_TOKEN}
                      options={{ language: 'en' }}
                      value={formData.destination}
                      placeholder="Cari negara/kota tujuan..."
                      onRetrieve={(res) => {
                        const feature = res.features[0];
                        handleSmartMapChange("destination", feature.properties.full_address || feature.properties.name);
                      }}
                      theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '14px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '600' } }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEKSI 2: Spesifikasi Kargo */}
          <Card className="shadow-premium border-gray-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
            <CardContent className="p-8 pl-10">
              <div className="flex items-center gap-4 mb-6 border-b pb-4 border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">2</div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Box className="w-5 h-5 text-gray-400"/> Spesifikasi Kargo Utama</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2 md:col-span-3">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Deskripsi Barang (Krusial untuk Cukai)</label>
                  <Input type="text" name="itemType" value={formData.itemType} onChange={handleChange} placeholder="Cth: Mesin Kopi Bekas, Pakaian Katun, Dokumen Legal" className="h-12 border-gray-200 focus-visible:border-brand-gold focus-visible:ring-brand-gold/10 font-bold" required />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Estimasi Berat (Kg)</label>
                  <Input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="0" className="h-12 text-center font-black text-lg border-gray-200 focus-visible:border-brand-gold focus-visible:ring-brand-gold/10" required />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Dimensi Total (P x L x T) cm</label>
                  <div className="flex gap-2">
                    <Input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="P" className="h-12 text-center font-bold border-gray-200 focus-visible:border-brand-gold focus-visible:ring-brand-gold/10" required />
                    <Input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="L" className="h-12 text-center font-bold border-gray-200 focus-visible:border-brand-gold focus-visible:ring-brand-gold/10" required />
                    <Input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="T" className="h-12 text-center font-bold border-gray-200 focus-visible:border-brand-gold focus-visible:ring-brand-gold/10" required />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-brand-gold/5 rounded-xl border border-brand-gold/20 flex items-start gap-3">
                <Info className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong className="block mb-1 text-gray-900">Validasi Dimensi & Berat</strong>
                  Untuk pengiriman kargo internasional, sistem maskapai dan pelayaran menghitung tarif berdasarkan <b>Berat Aktual</b> atau <b>Berat Volumetrik</b>, mengambil nilai yang paling besar.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SEKSI 3: Data Kontak */}
          <Card className="shadow-premium border-gray-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
            <CardContent className="p-8 pl-10">
              <div className="flex items-center gap-4 mb-6 border-b pb-4 border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">3</div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2"><User className="w-5 h-5 text-gray-400"/> Informasi Kontak PIC</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nama Lengkap / Instansi</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nama Anda atau Perusahaan" className="pl-12 h-12 border-gray-200 font-bold" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">WhatsApp Aktif</label>
                  <div className="relative">
                    <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="0812xxxxxx" className="pl-12 h-12 border-gray-200 font-bold" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email Utama</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@domain.com" className="pl-12 h-12 border-gray-200 font-bold" required />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </form>
      </div>

      {/* ========================================================= */}
      {/* KOLOM KANAN: PANEL PROSEDUR & SUBMIT (STICKY)             */}
      {/* ========================================================= */}
      <div className="w-full lg:w-[40%] xl:w-[35%] lg:sticky lg:top-8 space-y-6">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
          
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20">
            <Zap className="w-7 h-7 text-brand-gold" />
          </div>

          <h3 className="text-2xl font-black mb-3 text-white">
            Prosedur Cerdas Forwarding
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-8">
            Pengiriman antar negara memerlukan analisis kustom terkait regulasi negara, <i>Duty & Tax</i>, dan pemilihan moda angkut terbaik.
          </p>

          <div className="space-y-5 mb-8">
            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-brand-gold text-slate-900 flex items-center justify-center text-xs font-black shrink-0 shadow-[0_0_10px_rgba(197,160,89,0.4)]">1</div>
              <p className="text-sm text-slate-300 font-medium pt-0.5">Isi spesifikasi lengkap kargo di formulir.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 shrink-0 border border-slate-700">2</div>
              <p className="text-sm text-slate-300 font-medium pt-0.5">Sistem akan menyinkronkan data Anda ke CS Cukai kami via WhatsApp.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 shrink-0 border border-slate-700">3</div>
              <p className="text-sm text-slate-300 font-medium pt-0.5">Pakar kami menghitung penawaran harga final (Quotation) untuk Anda.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-8 bg-emerald-950/30 p-4 rounded-xl border border-emerald-900/50">
            <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
            <span className="text-xs font-bold text-emerald-400">Pakar logistik membalas dalam 10 - 15 Menit di jam kerja.</span>
          </div>

          <Button 
            type="submit" 
            form="quote-form"
            disabled={isLoading}
            variant="gold"
            className="w-full py-6 text-sm font-black shadow-[0_10px_25px_rgba(197,160,89,0.3)] transition-transform hover:-translate-y-1 rounded-xl"
          >
            {isLoading ? (
              <><div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mr-2"></div> Menghubungkan ke Tim Pakar...</>
            ) : (
              <><MessageCircle className="w-5 h-5 mr-2" /> Minta Kuotasi Resmi via WA <ArrowRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </motion.div>
      </div>

    </div>
  );
}

export default function DesktopForwardingQuotePage() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] py-16 px-6 relative overflow-hidden selection:bg-brand-gold selection:text-white">
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-brand-gold/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-brand-maroon/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>
      
      <Suspense fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center z-10 relative">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-brand-gold rounded-full animate-spin mb-4 shadow-lg"></div>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs animate-pulse">Menyiapkan Enkripsi Global...</p>
        </div>
      }>
        <QuoteForm />
      </Suspense>
    </main>
  );
}