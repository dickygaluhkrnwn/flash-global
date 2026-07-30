"use client";

import { useState, Suspense, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  User, Phone, Mail, Box, 
  ShieldCheck, ArrowLeft,
  Info, Maximize, Zap,
  Anchor, Plane, ArrowRight, Truck, AlertCircle
} from "lucide-react"; 
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp, FieldValue } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { Quote } from "@/types/order";
import { Button } from "@/components/ui/Button";

// ======================================================================
// DYNAMIC IMPORT SSR: FALSE (FOR MAPBOX)
// ======================================================================
const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-14 w-full bg-slate-100 rounded-[1.25rem] animate-pulse flex items-center px-5 text-xs font-bold text-slate-400">Sinkronisasi satelit...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// Custom Style untuk Input Glass (Aksen Gold)
const inputGlassGold = "bg-white border border-slate-200 focus-within:ring-[3px] focus-within:ring-[#C5A059]/20 focus-within:border-[#C5A059]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all";

// ======================================================================
// MAIN FORM COMPONENT
// ======================================================================
function MobileQuoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isHydrated } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeInfo, setActiveInfo] = useState<{ title: string; text: string } | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  // Order Data State
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

      const adminWA = "6281234567890"; 
      const waText = `Halo Tim Flash Global Expert,\n\nSaya ingin meminta Quotation untuk pengiriman kargo internasional.\n\n🧾 *ID Quotation:* ${quoteId}\n👤 *Nama PIC:* ${formData.name}\n\n*📍 Titik Asal:*\n- Negara: ${formData.originCountry}\n- Kota: ${formData.originCity}\n- Peta: ${formData.origin}\n- Detail: ${formData.originDetail || "-"}\n\n*📍 Titik Tujuan:*\n- Negara: ${formData.destCountry}\n- Kota: ${formData.destCity}\n- Peta: ${formData.destination}\n- Detail: ${formData.destDetail || "-"}\n\n*📦 Spesifikasi Kargo:*\n- Deskripsi: ${formData.itemType}\n- Berat Aktual: ${formData.weight} Kg\n- Dimensi: ${formData.length}x${formData.width}x${formData.height} cm\n\nMohon bantuannya untuk estimasi Biaya Pengiriman (Freight, Duty & Tax). Terima kasih.`;
      
      window.open(`https://wa.me/${adminWA}?text=${encodeURIComponent(waText)}`, "_blank");
      router.push("/dashboard");

    } catch (error) {
      console.error("Failed to save quote:", error);
      setErrorMsg("Gagal memproses permintaan. Periksa koneksi Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper untuk Field Label khusus Mobile
  const FieldLabel = ({ label, icon: Icon, infoText }: { label: string, icon?: React.ElementType, infoText?: string }) => (
    <div className="flex items-center justify-between px-1 mb-2">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-[#C5A059]" />} {label}
      </label>
      {infoText && (
        <button 
          type="button" 
          onClick={() => setActiveInfo({ title: label, text: infoText })}
          className="text-slate-400 active:text-[#C5A059] transition-all bg-slate-100/50 active:bg-slate-200 p-1.5 rounded-full shadow-sm border border-transparent tap-highlight-transparent active:scale-90"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  return (
    // =========================================================================
    // 🚀 NATIVE PUSH VIEW ARCHITECTURE
    // =========================================================================
    <div className="fixed inset-0 z-[150] bg-[#f8fafc] flex justify-center font-sans overflow-hidden">
      
      {/* GLOBAL CSS INJECTION MAPBOX UI - BUG FIX: DROPDOWN OVERLAY ABSOLUTE */}
      <style dangerouslySetInnerHTML={{__html: `
        mapbox-search-listbox {
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 999999 !important;
          border-radius: 1.25rem !important;
          box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 1) !important;
          border: 1px solid rgba(226, 232, 240, 1) !important;
          margin-top: 8px !important;
          background-color: rgba(255, 255, 255, 0.98) !important;
          backdrop-filter: blur(25px) !important;
          font-family: inherit !important;
        }
        mapbox-search-box {
          --focus-box-shadow: none;
          --box-shadow: none;
        }
      `}} />

      <div className="w-full max-w-md relative flex flex-col h-[100dvh] bg-[#f8fafc] shadow-2xl">
        
        {/* AMBIENT GLOW LOKAL */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-5%] left-[-10%] w-[60vw] h-[30vh] rounded-full bg-[#C5A059]/20 blur-[100px]" />
          <div className="absolute bottom-[-5%] right-[-10%] w-[60vw] h-[30vh] rounded-full bg-slate-400/20 blur-[100px]" />
        </div>

        {/* 1. APP BAR (NATIVE HEADER) */}
        <div className="flex-none bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm pt-safe relative z-[100]">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-slate-700 bg-slate-100 rounded-full active:scale-90 tap-highlight-transparent transition-transform border border-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Kargo Global</h2>
              <p className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest">Penawaran Harga</p>
            </div>
            <button onClick={() => router.push("/delivery/booking")} className="w-10 h-10 flex items-center justify-center text-[#7A171D] bg-red-50 rounded-full active:scale-90 tap-highlight-transparent border border-red-100" title="Ke Domestik">
              <Truck className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ERROR MESSAGE TOAST */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute top-[70px] left-4 right-4 z-[90]">
              <div className="p-3 bg-red-50/90 backdrop-blur-md border border-red-200 text-red-700 text-xs font-bold rounded-2xl shadow-lg flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. SCROLLABLE CONTENT */}
        <main className="flex-grow overflow-y-auto overflow-x-hidden p-4 pb-[110px] relative z-10 no-scrollbar">
          <form id="quote-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECTION 1: Rute Internasional (Z-Index diurutkan menurun agar Dropdown Listbox tidak tenggelam) */}
            {/* BUG FIX: Membuang overflow-hidden agar listbox bisa melayang bebas */}
            <div className="glass-card rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white relative z-50">
              <div className="flex items-center gap-3 mb-5 border-b pb-4 border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center font-black shadow-sm">1</div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Rute Pengiriman</h3>
              </div>
              
              <div className="space-y-6">
                
                {/* LOKASI ASAL (Z-Index Tertinggi: 60) */}
                <div className="relative z-[60] bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-200 space-y-4">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Anchor className="w-4 h-4 text-[#C5A059]"/> Titik Asal Kargo</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Negara Asal</label>
                      <div className={cn("relative flex items-center rounded-2xl h-12 transition-all w-full", inputGlassGold)}>
                        <input type="text" name="originCountry" value={formData.originCountry} onChange={handleChange} placeholder="Cth: ID" className="w-full bg-transparent border-none outline-none px-4 text-xs font-bold text-slate-900 placeholder:text-slate-400" required />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Kota Asal</label>
                      <div className={cn("relative flex items-center rounded-2xl h-12 transition-all w-full", inputGlassGold)}>
                        <input type="text" name="originCity" value={formData.originCity} onChange={handleChange} placeholder="Cth: Jakarta" className="w-full bg-transparent border-none outline-none px-4 text-xs font-bold text-slate-900 placeholder:text-slate-400" required />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-50">
                    <FieldLabel label="Pencarian Map Satelit" infoText="Cari alamat lengkap pada peta agar koordinat tersimpan di sistem kami." />
                    <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                      {/* BUG FIX: Relative parent to contain absolute dropdown listbox */}
                      <div className="flex-1 w-full relative">
                        <SearchBox
                          accessToken={MAPBOX_TOKEN} options={{ language: 'en' }} value={formData.origin} placeholder="Jalan / Gedung..."
                          onRetrieve={(res) => {
                            const feature = res.features[0];
                            handleSmartMapChange("origin", feature.properties.full_address || feature.properties.name);
                          }}
                          theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '16px 20px', fontFamily: 'inherit', unit: '13px', fontWeight: '700' } }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Detail Patokan (Opsional)</label>
                    <div className={cn("relative flex items-center rounded-2xl h-12 transition-all w-full", inputGlassGold)}>
                      <input type="text" name="originDetail" value={formData.originDetail} onChange={handleChange} placeholder="Cth: Gudang pintu biru..." className="w-full bg-transparent border-none outline-none px-4 text-xs font-bold text-slate-900 placeholder:text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* LOKASI TUJUAN (Z-Index Menengah: 50) */}
                <div className="relative z-[50] bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-200 space-y-4">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Plane className="w-4 h-4 text-[#C5A059]"/> Titik Tujuan Kargo</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Negara Tujuan</label>
                      <div className={cn("relative flex items-center rounded-2xl h-12 transition-all w-full", inputGlassGold)}>
                        <input type="text" name="destCountry" value={formData.destCountry} onChange={handleChange} placeholder="Cth: SG" className="w-full bg-transparent border-none outline-none px-4 text-xs font-bold text-slate-900 placeholder:text-slate-400" required />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Kota Tujuan</label>
                      <div className={cn("relative flex items-center rounded-2xl h-12 transition-all w-full", inputGlassGold)}>
                        <input type="text" name="destCity" value={formData.destCity} onChange={handleChange} placeholder="Cth: Changi" className="w-full bg-transparent border-none outline-none px-4 text-xs font-bold text-slate-900 placeholder:text-slate-400" required />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-40">
                    <FieldLabel label="Pencarian Map Satelit" infoText="Cari alamat lengkap pada peta agar koordinat tersimpan di sistem kami." />
                    <div className={cn("relative flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                      <div className="flex-1 w-full relative">
                        <SearchBox
                          accessToken={MAPBOX_TOKEN} options={{ language: 'en' }} value={formData.destination} placeholder="Jalan / Pelabuhan..."
                          onRetrieve={(res) => {
                            const feature = res.features[0];
                            handleSmartMapChange("destination", feature.properties.full_address || feature.properties.name);
                          }}
                          theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '16px 20px', fontFamily: 'inherit', unit: '13px', fontWeight: '700' } }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Detail Patokan (Opsional)</label>
                    <div className={cn("relative flex items-center rounded-2xl h-12 transition-all w-full", inputGlassGold)}>
                      <input type="text" name="destDetail" value={formData.destDetail} onChange={handleChange} placeholder="Cth: Lantai 3, Gedung Utama..." className="w-full bg-transparent border-none outline-none px-4 text-xs font-bold text-slate-900 placeholder:text-slate-400" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* SECTION 2: Spesifikasi Kargo (Z-Index Bawah: 30) */}
            <div className="glass-card rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white relative z-30 overflow-hidden">
              <div className="flex items-center gap-3 mb-5 border-b pb-4 border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center font-black shadow-sm">2</div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Kargo Utama</h3>
              </div>

              <div className="space-y-5">
                <div>
                  <FieldLabel label="HS Code / Deskripsi" icon={Box} infoText="Sebutkan jenis barang sejelas mungkin untuk klasifikasi bea cukai. Contoh: Mesin Kopi, Pakaian."/>
                  <div className={cn("relative flex items-center rounded-[1.25rem] h-14", inputGlassGold)}>
                    <input type="text" name="itemType" value={formData.itemType} onChange={handleChange} placeholder="Cth: Pakaian Katun..." className="w-full h-full bg-transparent border-none outline-none px-4 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Berat Aktual Total" />
                    <div className={cn("relative flex items-center rounded-[1.25rem] h-14", inputGlassGold)}>
                      <input type="number" name="weight" value={formData.weight} onChange={handleChange} placeholder="0" className="w-full h-full bg-transparent border-none outline-none pl-4 pr-10 text-base font-black text-slate-900 placeholder:text-slate-400" required />
                      <span className="absolute right-4 font-bold text-slate-400 text-xs">KG</span>
                    </div>
                  </div>
                  
                  <div>
                    <FieldLabel label="Dimensi (PxLxT)" icon={Maximize} />
                    <div className={cn("flex rounded-[1.25rem] overflow-hidden h-14", inputGlassGold)}>
                      <input type="number" name="length" value={formData.length} onChange={handleChange} placeholder="P" className="w-1/3 px-1 text-center font-bold text-xs bg-transparent outline-none border-r border-slate-200 placeholder:text-slate-400" required />
                      <input type="number" name="width" value={formData.width} onChange={handleChange} placeholder="L" className="w-1/3 px-1 text-center font-bold text-xs bg-transparent outline-none border-r border-slate-200 placeholder:text-slate-400" required />
                      <input type="number" name="height" value={formData.height} onChange={handleChange} placeholder="T" className="w-1/3 px-1 text-center font-bold text-xs bg-transparent outline-none placeholder:text-slate-400" required />
                    </div>
                  </div>
                </div>
                
                {/* Note Box */}
                <div className="mt-2 p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex items-start gap-2.5 shadow-sm">
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 leading-relaxed font-bold">
                    Sistem membandingkan <b>Berat Aktual</b> vs <b>Volumetrik (PxLxT/5000)</b> untuk penentuan tarif Freight.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 3: Kontak (Z-Index Dasar: 20) */}
            <div className="glass-card rounded-[2rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white relative z-20 overflow-hidden">
              <div className="flex items-center gap-3 mb-5 border-b pb-4 border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center font-black shadow-sm">3</div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Kontak PIC</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <FieldLabel label="Nama Perusahaan/PIC" icon={User} />
                  <div className={cn("relative flex items-center rounded-[1.25rem] h-14", inputGlassGold)}>
                    <User className="w-4 h-4 absolute left-4 text-slate-400" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nama Anda" className="w-full h-full bg-transparent border-none outline-none pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                  </div>
                </div>
                <div>
                  <FieldLabel label="WhatsApp Aktif" icon={Phone} />
                  <div className={cn("relative flex items-center rounded-[1.25rem] h-14", inputGlassGold)}>
                    <Phone className="w-4 h-4 absolute left-4 text-slate-400" />
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+62812xxxx" className="w-full h-full bg-transparent border-none outline-none pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                  </div>
                </div>
                <div>
                  <FieldLabel label="Email Resmi" icon={Mail} />
                  <div className={cn("relative flex items-center rounded-[1.25rem] h-14", inputGlassGold)}>
                    <Mail className="w-4 h-4 absolute left-4 text-slate-400" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@company.com" className="w-full h-full bg-transparent border-none outline-none pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
                  </div>
                </div>
              </div>
            </div>

            {/* PROCEDURE PANEL (Dark Mode) */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden text-white mt-8 z-10">
              <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-[#C5A059] rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
              
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-5 border border-white/20 shadow-inner relative z-10">
                <Zap className="w-5 h-5 text-[#DFBE7B]" />
              </div>

              <h3 className="text-lg font-black mb-2 text-white tracking-tight relative z-10">
                Prosedur Pengajuan
              </h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6 relative z-10">
                Pakar kepabeanan kami akan menganalisis HS Code dan merilis Quotation Resmi (Freight & Duty Tax) ke WhatsApp/Email Anda.
              </p>

              <div className="flex items-start gap-2 mb-2 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 shadow-inner relative z-10">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[10px] font-bold text-emerald-200 leading-relaxed">
                  Kami menjamin transparansi tanpa biaya tersembunyi (No Hidden Fees).
                </span>
              </div>
            </div>

          </form>
        </main>

        {/* 3. ACTION BAR (FOOTER NATIVE) */}
        <div className="absolute bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)] bg-white/90">
          <button 
            type="submit" 
            form="quote-form"
            disabled={isLoading}
            className="w-full h-14 bg-gradient-to-b from-[#DFBE7B] to-[#C5A059] text-slate-900 font-black text-sm shadow-lg transition-all active:scale-95 rounded-[1.25rem] flex items-center justify-center gap-2 border border-[#A68345] disabled:opacity-60 tap-highlight-transparent"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>Minta Penawaran Harga <ArrowRight className="w-5 h-5"/></>
            )}
          </button>
        </div>

      </div>

      {/* MODAL INFO POPUP */}
      <AnimatePresence>
        {activeInfo && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveInfo(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-[2rem] p-6 shadow-2xl border border-white">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 border border-amber-100 shadow-sm">
                 <Info className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-2 leading-tight tracking-tight">{activeInfo.title}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">{activeInfo.text}</p>
              <Button onClick={() => setActiveInfo(null)} variant="gold" className="w-full h-12 rounded-xl text-sm font-black shadow-none border-none">Mengerti</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default function MobileForwardingQuotePage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[150] min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin mb-4 shadow-sm"></div>
        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Menyiapkan Satelit Global...</p>
      </div>
    }>
      <MobileQuoteForm />
    </Suspense>
  );
}