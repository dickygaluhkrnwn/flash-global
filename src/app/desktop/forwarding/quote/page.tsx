"use client";

import { useState, Suspense, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  User, Phone, Mail, Box, 
  ShieldCheck, 
  MessageCircle, Info, Maximize, Zap,
  Anchor, Plane, ArrowRight
} from "lucide-react"; 
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp, FieldValue } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { Quote } from "@/types/order";

// --- IMPORT UI KIT ---
import { Badge } from "@/components/ui/Badge";

// ======================================================================
// DYNAMIC IMPORT SSR: FALSE (FOR INDEPENDENT MAPBOX)
// ======================================================================
const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-[56px] w-full bg-white/60 backdrop-blur-md rounded-2xl border border-white animate-pulse flex items-center px-5 text-sm font-bold text-slate-400">Menyiapkan satelit global...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// Custom Style untuk Input Glass (Aksen Gold)
const inputGlassGold = "bg-white/60 backdrop-blur-md border border-white focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#C5A059]/20 focus-within:border-[#C5A059]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";

// Helper Component for Labels - Didefinisikan dengan Tipe yang Aman & Styling Apple
const FieldLabel = ({ label, icon: Icon, infoText }: { label: string, icon?: React.ElementType, infoText?: string }) => (
  <div className="flex items-center justify-between px-1 mb-2 relative z-50">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-[#C5A059]" />} {label}
    </label>
    {infoText && (
      <div className="group relative cursor-pointer">
        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-[#C5A059] transition-colors" />
        <div className="absolute right-0 bottom-6 w-56 p-3 bg-slate-900 text-white text-[11px] leading-relaxed font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] shadow-xl">
          {infoText}
        </div>
      </div>
    )}
  </div>
);

function QuoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isHydrated } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  // Order Data State (Auto-filled from URL if exists)
  const [formData, setFormData] = useState({
    name: user?.displayName || "", 
    email: user?.email || "",
    phone: "",
    originCountry: "",
    originCity: "",
    origin: searchParams.get("origin") || "",
    originDetail: "",
    destCountry: "",
    destCity: "",
    destination: searchParams.get("destination") || "",
    destDetail: "",
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
    if (!formData.originCountry || !formData.originCity || !formData.destCountry || !formData.destCity) {
      setErrorMsg("Negara dan Kota asal maupun tujuan wajib diisi.");
      return;
    }
    if (!formData.origin || !formData.destination) {
      setErrorMsg("Pencarian titik peta lokasi tidak boleh kosong.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const quoteId = `FFW-${Date.now().toString().slice(-6)}`;
      
      // TYPE-SAFE PAYLOAD
      const quotePayload: Omit<Quote, 'createdAt'> & { createdAt: FieldValue } = {
        id: quoteId,
        userId: user?.uid || "guest",
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        origin: formData.origin,
        originCountry: formData.originCountry,
        originCity: formData.originCity,
        originDetail: formData.originDetail,
        destination: formData.destination,
        destCountry: formData.destCountry,
        destCity: formData.destCity,
        destDetail: formData.destDetail,
        itemType: formData.itemType,
        weight: Number(formData.weight) || 0,
        length: Number(formData.length) || 0,
        width: Number(formData.width) || 0,
        height: Number(formData.height) || 0,
        serviceType: "Global Cargo", 
        status: "Pending CS Quote",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "quotes"), quotePayload);

      // WhatsApp Message Template
      const adminWA = "6281234567890"; 
      const waText = `Halo Tim Ahli Flash Global, saya ingin mengajukan penawaran untuk pengiriman luar negeri (Forwarding).%0A%0A*🧾 ID Penawaran:* ${quoteId}%0A*👤 PIC:* ${formData.name}%0A%0A*📍 Titik Asal:*%0A- Negara: ${formData.originCountry}%0A- Kota: ${formData.originCity}%0A- Map: ${formData.origin}%0A- Detail: ${formData.originDetail || "-"}%0A%0A*📍 Titik Tujuan:*%0A- Negara: ${formData.destCountry}%0A- Kota: ${formData.destCity}%0A- Map: ${formData.destination}%0A- Detail: ${formData.destDetail || "-"}%0A%0A*📦 Spesifikasi Kargo:*%0A- Deskripsi Barang: ${formData.itemType}%0A- Berat Rill: ${formData.weight} Kg%0A- Dimensi (PxLxT): ${formData.length}x${formData.width}x${formData.height} cm%0A%0AMohon bantuannya untuk estimasi Biaya Pengiriman & Pajak (Landed Cost). Terima kasih.`;
      
      window.open(`https://wa.me/${adminWA}?text=${waText}`, "_blank");
      router.push("/dashboard");

    } catch (error) {
      console.error("Failed to save quote:", error);
      setErrorMsg("Gagal memproses permintaan Anda. Periksa koneksi dan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative z-10 pb-20 font-sans">
      
      {/* GLOBAL CSS INJECTION TO HACK MAPBOX SEARCH BOX UI TO APPLE GLASS */}
      {/* BUG FIX: Memaksa overflow terlihat dan layer tertinggi */}
      <style dangerouslySetInnerHTML={{__html: `
        mapbox-search-listbox {
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 999999 !important;
          border-radius: 1.25rem !important;
          box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 1) !important;
          border: 1px solid rgba(255, 255, 255, 0.8) !important;
          margin-top: 8px !important;
          background-color: rgba(255, 255, 255, 0.98) !important;
          backdrop-filter: blur(25px) !important;
          font-family: inherit !important;
        }
        mapbox-search-box {
          --focus-box-shadow: none;
          --border-radius: 16px;
          --box-shadow: none;
        }
      `}} />

      {/* HEADER TITLE (Premium Gold Vibe) */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 mb-10 mt-12 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <Badge variant="gold" className="mb-4 shadow-sm inline-flex items-center gap-1.5 px-3 py-1 bg-white/80 backdrop-blur-md border border-white">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse"></span>
            Export & Import
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Penawaran <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFBE7B] to-[#C5A059]">Kargo Global.</span>
          </h1>
          <p className="text-slate-500 mt-2 text-base font-medium max-w-xl leading-relaxed">
            Lengkapi spesifikasi kargo internasional Anda. Tim ahli kepabeanan kami akan mengkalkulasi Landed Cost (Freight, Duty & Tax) terbaik untuk Anda.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={() => router.push("/delivery/booking")} className="h-12 px-6 rounded-2xl border border-white bg-white/60 backdrop-blur-md shadow-sm text-xs font-bold text-slate-600 hover:text-[#7A171D] hover:bg-white transition-colors w-full md:w-auto flex items-center justify-center">
            Pindah ke Instan
          </button>
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="max-w-[1400px] mx-auto px-4 md:px-8 mb-8">
            <div className="p-4 bg-red-50/80 backdrop-blur-md border border-red-200 text-red-700 text-sm font-bold rounded-2xl flex items-center gap-3 shadow-sm">
              <Info className="w-5 h-5 shrink-0"/> {errorMsg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 lg:gap-10 px-4 md:px-8 items-start">
        
        {/* ========================================================= */}
        {/* KIRI: PREMIUM CARGO DATA FORM (GLASSMORPHISM)             */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[60%] xl:w-[65%] space-y-6">
          <form id="quote-form" onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
            
            {/* SECTION 1: Routing Terperinci */}
            {/* BUG FIX: Membuang overflow-hidden dari card form agar listbox tidak terpotong */}
            <div className="glass-card rounded-[2.5rem] p-6 md:p-8 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/10 blur-[50px] rounded-full pointer-events-none z-0"></div>
              
              <div className="flex items-center gap-4 mb-8 border-b pb-4 border-slate-100/60 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center font-black shadow-sm">1</div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Rute Internasional</h3>
              </div>
              
              <div className="space-y-8 relative z-10">
                
                {/* LOKASI ASAL (Z-Index 60 agar Mapbox Dropdown melayang di atas form lainnya) */}
                <div className="relative z-[60] bg-white/40 border border-[#C5A059]/20 rounded-3xl p-6 md:p-8 space-y-5">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2"><Anchor className="w-5 h-5 text-[#C5A059]"/> Titik Asal Kargo (Origin)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Negara Asal</label>
                      <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                        <input type="text" name="originCountry" value={formData.originCountry} onChange={handleChange} placeholder="Cth: Indonesia" className="w-full bg-transparent border-none outline-none px-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Kota Asal</label>
                      <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                        <input type="text" name="originCity" value={formData.originCity} onChange={handleChange} placeholder="Cth: Jakarta" className="w-full bg-transparent border-none outline-none px-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-50">
                    <FieldLabel label="Pencarian Alamat Satelit" infoText="Ketik jalan atau lokasi, sistem kami akan menyimpan koordinat global untuk presisi rute kapal/pesawat." />
                    <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                      {/* BUG FIX: Membiarkan overflow default (visible) */}
                      <div className="flex-1 w-full relative">
                        <SearchBox
                          accessToken={MAPBOX_TOKEN} options={{ language: 'en' }} value={formData.origin} placeholder="Ketik nama jalan / gedung..."
                          onRetrieve={(res) => {
                            const feature = res.features[0];
                            handleSmartMapChange("origin", feature.properties.full_address || feature.properties.name);
                          }}
                          theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '16px 20px', fontFamily: 'inherit', unit: '14px', fontWeight: '700' } }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Detail Patokan (Opsional)</label>
                    <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                      <input type="text" name="originDetail" value={formData.originDetail} onChange={handleChange} placeholder="Cth: Gudang pintu biru di sebelah minimarket..." className="w-full bg-transparent border-none outline-none px-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* LOKASI TUJUAN (Z-Index 50 agar dropdownnya berada di atas elemen bawah, tapi kalah dari origin) */}
                <div className="relative z-[50] bg-white/40 border border-[#C5A059]/20 rounded-3xl p-6 md:p-8 space-y-5">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1 flex items-center gap-2"><Plane className="w-5 h-5 text-[#C5A059]"/> Titik Tujuan Kargo (Destination)</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Negara Tujuan</label>
                      <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                        <input type="text" name="destCountry" value={formData.destCountry} onChange={handleChange} placeholder="Cth: Singapore" className="w-full bg-transparent border-none outline-none px-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Kota Tujuan</label>
                      <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                        <input type="text" name="destCity" value={formData.destCity} onChange={handleChange} placeholder="Cth: Changi" className="w-full bg-transparent border-none outline-none px-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-40">
                    <FieldLabel label="Pencarian Alamat Satelit" infoText="Ketik jalan atau pelabuhan tujuan, sistem kami akan menyimpan koordinat global untuk presisi perhitungan bea pelabuhan." />
                    <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                      <div className="flex-1 w-full relative">
                        <SearchBox
                          accessToken={MAPBOX_TOKEN} options={{ language: 'en' }} value={formData.destination} placeholder="Ketik nama jalan / pelabuhan..."
                          onRetrieve={(res) => {
                            const feature = res.features[0];
                            handleSmartMapChange("destination", feature.properties.full_address || feature.properties.name);
                          }}
                          theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '16px 20px', fontFamily: 'inherit', unit: '14px', fontWeight: '700' } }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Detail Patokan (Opsional)</label>
                    <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                      <input type="text" name="destDetail" value={formData.destDetail} onChange={handleChange} placeholder="Cth: Lantai 3, Gedung Utama..." className="w-full bg-transparent border-none outline-none px-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 2: Cargo Specs */}
            <div className="glass-card rounded-[2.5rem] p-6 md:p-8 relative z-30">
              <div className="flex items-center gap-4 mb-8 border-b pb-4 border-slate-100/60 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center font-black shadow-sm">2</div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Spesifikasi Kargo Utama</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                <div className="md:col-span-3">
                  <FieldLabel label="Deskripsi Barang (HS Code Basis)" icon={Box} infoText="Sebutkan jenis barang sejelas mungkin untuk klasifikasi bea cukai. Contoh: Used Coffee Machine, Cotton Clothes."/>
                  <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all", inputGlassGold)}>
                    <input type="text" name="itemType" value={formData.itemType} onChange={handleChange} placeholder="e.g., Used Coffee Machine, Cotton Clothes..." className="w-full bg-transparent border-none outline-none px-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                  </div>
                </div>

                <div>
                  <FieldLabel label="Berat Aktual Total" />
                  <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all", inputGlassGold)}>
                    <input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="0" className="w-full bg-transparent border-none outline-none pl-5 pr-12 text-lg font-black text-slate-900 placeholder:text-slate-400 text-center" required />
                    <span className="absolute right-5 font-bold text-slate-400 text-sm">KG</span>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <FieldLabel label="Dimensi Muatan (P x L x T)" icon={Maximize} />
                  <div className={cn("flex rounded-2xl overflow-hidden transition-all h-[56px]", inputGlassGold)}>
                    <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="P" className="w-1/3 px-2 text-center font-bold text-sm bg-transparent outline-none border-r border-white/50 placeholder:text-slate-400" required />
                    <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="L" className="w-1/3 px-2 text-center font-bold text-sm bg-transparent outline-none border-r border-white/50 placeholder:text-slate-400" required />
                    <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="T" className="w-1/3 px-2 text-center font-bold text-sm bg-transparent outline-none placeholder:text-slate-400" required />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: Contact */}
            <div className="glass-card rounded-[2.5rem] p-6 md:p-8 relative z-20">
              <div className="flex items-center gap-4 mb-8 border-b pb-4 border-slate-100/60 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center font-black shadow-sm">3</div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Informasi Kontak PIC</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="md:col-span-2">
                  <FieldLabel label="Nama Lengkap / Perusahaan" icon={User} />
                  <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all", inputGlassGold)}>
                    <User className="w-5 h-5 absolute left-5 text-slate-400" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nama Perwakilan" className="w-full bg-transparent border-none outline-none pl-12 pr-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                  </div>
                </div>
                <div>
                  <FieldLabel label="WhatsApp Aktif" icon={Phone} />
                  <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all", inputGlassGold)}>
                    <Phone className="w-5 h-5 absolute left-5 text-slate-400" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+62812xxxxxx" className="w-full bg-transparent border-none outline-none pl-12 pr-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                  </div>
                </div>
                <div>
                  <FieldLabel label="Email Korespondensi" icon={Mail} />
                  <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all", inputGlassGold)}>
                    <Mail className="w-5 h-5 absolute left-5 text-slate-400" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@company.com" className="w-full bg-transparent border-none outline-none pl-12 pr-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* ========================================================= */}
        {/* KANAN: PROCEDURE PANEL & INFO CARDS (FLEX COLUMN GROW)    */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[40%] xl:w-[35%] flex flex-col gap-6 lg:sticky lg:top-28 z-10 h-full">
          
          {/* Card Prosedur & Tombol Submit */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2.5rem] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.3)] relative overflow-hidden text-white shrink-0">
            <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
            
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20 shadow-inner relative z-10">
              <Zap className="w-6 h-6 text-[#DFBE7B]" />
            </div>

            <h3 className="text-2xl font-black mb-3 text-white tracking-tight relative z-10">
              Prosedur Forwarding
            </h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8 relative z-10">
              Pengiriman kargo lintas negara memerlukan penanganan khusus terkait regulasi bea cukai, HS Codes, dan pemilihan moda transportasi yang paling efisien.
            </p>

            <div className="space-y-6 mb-8 relative z-10">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-slate-900 flex items-center justify-center text-xs font-black shrink-0 shadow-[0_0_15px_rgba(197,160,89,0.3)]">1</div>
                <p className="text-[13px] text-slate-300 font-bold leading-relaxed pt-1">Isi spesifikasi kargo dan koordinat negara tujuan pada formulir.</p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 shrink-0 border border-slate-700">2</div>
                <p className="text-[13px] text-slate-300 font-bold leading-relaxed pt-1">Kirim permintaan. Sistem akan menyinkronkan data Anda ke portal admin Forwarding.</p>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 shrink-0 border border-slate-700">3</div>
                <p className="text-[13px] text-slate-300 font-bold leading-relaxed pt-1">Pakar logistik kami akan menganalisis dan merilis Quotation Resmi untuk Anda setujui.</p>
              </div>
            </div>

            <button 
              type="submit" 
              form="quote-form"
              disabled={isLoading}
              className="w-full h-16 bg-gradient-to-b from-[#DFBE7B] to-[#C5A059] hover:from-[#EAD098] hover:to-[#D2B270] text-slate-900 font-black text-sm shadow-[0_10px_25px_rgba(197,160,89,0.2)] transition-all active:scale-[0.98] rounded-2xl flex items-center justify-center gap-2 border border-[#A68345] relative z-10 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <><div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> Mengenkripsi Data...</>
              ) : (
                <><MessageCircle className="w-5 h-5 fill-slate-900/20" /> Hubungi Pakar Bea Cukai <ArrowRight className="w-4 h-4 ml-1"/></>
              )}
            </button>
          </motion.div>

          {/* Edukasi Kalkulator - Card Elastis (Flex Grow) mengisi sisa tinggi form di kiri */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 md:p-8 rounded-[2.5rem] border border-white/60 shadow-sm flex-grow flex flex-col justify-center relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/10 blur-[40px] rounded-full pointer-events-none z-0"></div>
            <div className="relative z-10">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#C5A059]" /> Catatan & Garansi Layanan
              </h4>
              
              <ul className="space-y-5 text-sm font-medium text-slate-500">
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="pt-0.5">
                    <p className="font-black text-slate-800 leading-tight mb-1">Transparansi Harga</p>
                    <p className="text-xs leading-relaxed">Quotation kami dijamin transparan tanpa biaya tersembunyi (No Hidden Fees) di pelabuhan tujuan.</p>
                  </div>
                </li>
                
                <li className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                    <Box className="w-5 h-5" />
                  </div>
                  <div className="pt-0.5">
                    <p className="font-black text-slate-800 leading-tight mb-1">Kebijakan Volumetrik</p>
                    <p className="text-xs leading-relaxed">Penerbangan global menerapkan standar CBM. Sistem membandingkan Berat Aktual vs Volumetrik (PxLxT / 5000).</p>
                  </div>
                </li>
              </ul>
            </div>
          </motion.div>

        </div>

      </div>
    </div>
  );
}

export default function DesktopForwardingQuotePage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] py-16 relative overflow-hidden font-sans selection:bg-[#C5A059]/20 selection:text-[#C5A059]">
      {/* Ambient Backgrounds */}
      <div className="absolute top-0 right-[-10%] w-[500px] h-[500px] bg-[#C5A059]/20 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-[-10%] w-[600px] h-[600px] bg-slate-400/20 rounded-full blur-[150px] pointer-events-none z-0" />
      
      <Suspense fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center z-10 relative font-sans">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin mb-4 shadow-sm"></div>
          <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Menyiapkan Satelit Global...</p>
        </div>
      }>
        <QuoteForm />
      </Suspense>
    </main>
  );
}