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
} from "lucide-react"; // GLOBE2 SUDAH DIHAPUS DARI SINI
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
  loading: () => <div className="h-[56px] w-full bg-white/60 backdrop-blur-md rounded-2xl border border-white animate-pulse flex items-center px-5 text-sm font-bold text-slate-400">Synchronizing global satellites...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// Custom Style untuk Input Glass (Aksen Gold)
const inputGlassGold = "bg-white/60 backdrop-blur-md border border-white focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#C5A059]/20 focus-within:border-[#C5A059]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";

// Helper Component for Labels - Didefinisikan dengan Tipe yang Aman & Styling Apple
const FieldLabel = ({ label, icon: Icon, infoText }: { label: string, icon?: React.ElementType, infoText?: string }) => (
  <div className="flex items-center justify-between px-1 mb-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-[#C5A059]" />} {label}
    </label>
    {infoText && (
      <div className="group relative cursor-pointer">
        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-[#C5A059] transition-colors" />
        <div className="absolute right-0 bottom-6 w-48 p-2 bg-slate-900 text-white text-[10px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
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

  // Function to extract Country from Mapbox address (usually after the last comma)
  const extractCountry = (fullAddress: string) => {
    if (!fullAddress) return "-";
    const parts = fullAddress.split(",");
    return parts[parts.length - 1].trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.origin || !formData.destination) {
      setErrorMsg("Origin and destination locations are required.");
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
        originCountry: extractCountry(formData.origin),
        destination: formData.destination,
        destCountry: extractCountry(formData.destination),
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
      const waText = `Hello Flash Global Expert Team, I would like to request a quotation for international forwarding.%0A%0A*🧾 Quotation ID:* ${quoteId}%0A*👤 PIC Name:* ${formData.name}%0A%0A*📌 Routing:*%0A- Origin: ${extractCountry(formData.origin)} (${formData.origin})%0A- Destination: ${extractCountry(formData.destination)} (${formData.destination})%0A%0A*📦 Cargo Specifications:*%0A- Description: ${formData.itemType}%0A- Actual Weight: ${formData.weight} Kg%0A- Dimensions: ${formData.length}x${formData.width}x${formData.height} cm%0A%0APlease assist with the estimated Freight, Duty & Tax (Landed Cost). Thank you.`;
      
      window.open(`https://wa.me/${adminWA}?text=${waText}`, "_blank");
      router.push("/dashboard");

    } catch (error) {
      console.error("Failed to save quote:", error);
      setErrorMsg("Failed to process your request. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative z-10 pb-20 font-sans">
      
      {/* GLOBAL CSS INJECTION TO HACK MAPBOX SEARCH BOX UI TO APPLE GLASS */}
      <style dangerouslySetInnerHTML={{__html: `
        mapbox-search-listbox {
          z-index: 99999 !important;
          border-radius: 20px !important;
          box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.1), inset 0 1px 1px rgba(255, 255, 255, 1) !important;
          border: 1px solid rgba(255, 255, 255, 0.8) !important;
          margin-top: 12px !important;
          background-color: rgba(255, 255, 255, 0.95) !important;
          backdrop-filter: blur(20px) !important;
          overflow: hidden !important;
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
            Pindah ke Domestik
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
          <form id="quote-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* SECTION 1: Routing */}
            <div className="glass-card rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/10 blur-[50px] rounded-full pointer-events-none"></div>
              
              <div className="flex items-center gap-4 mb-8 border-b pb-4 border-slate-100/60 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-white border border-[#C5A059]/30 text-[#C5A059] flex items-center justify-center font-black shadow-sm">1</div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Rute Internasional</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {/* Mapbox Origin */}
                <div className="relative z-[60]">
                  <FieldLabel label="Lokasi Asal (Origin)" icon={Anchor} infoText="Pilih dari daftar dropdown yang muncul agar negara asal dapat terekam." />
                  <div className={cn("relative group flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                    <div className="flex-1 overflow-hidden">
                      <SearchBox
                        accessToken={MAPBOX_TOKEN} options={{ language: 'en' }} value={formData.origin} placeholder="Search origin port/country..."
                        onRetrieve={(res) => {
                          const feature = res.features[0];
                          handleSmartMapChange("origin", feature.properties.full_address || feature.properties.name);
                        }}
                        theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '16px 20px', fontFamily: 'inherit', unit: '14px', fontWeight: '700' } }}
                      />
                    </div>
                  </div>
                </div>

                {/* Mapbox Destination */}
                <div className="relative z-[50]">
                  <FieldLabel label="Lokasi Tujuan (Destination)" icon={Plane} infoText="Pilih dari daftar dropdown yang muncul agar negara tujuan dapat terekam."/>
                  <div className={cn("relative group flex items-center rounded-2xl h-[56px] transition-all w-full", inputGlassGold)}>
                    <div className="flex-1 overflow-hidden">
                      <SearchBox
                        accessToken={MAPBOX_TOKEN} options={{ language: 'en' }} value={formData.destination} placeholder="Search destination port/country..."
                        onRetrieve={(res) => {
                          const feature = res.features[0];
                          handleSmartMapChange("destination", feature.properties.full_address || feature.properties.name);
                        }}
                        theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '16px 20px', fontFamily: 'inherit', unit: '14px', fontWeight: '700' } }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: Cargo Specs */}
            <div className="glass-card rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden">
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
              
              <div className="mt-8 p-4 bg-amber-50/80 backdrop-blur-md rounded-2xl border border-amber-200 flex items-start gap-3 shadow-sm relative z-10">
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed font-bold">
                  <strong className="block mb-1 text-amber-900 text-xs tracking-tight">Kebijakan Volumetrik Internasional</strong>
                  Sistem kami akan membandingkan <b>Berat Aktual</b> dengan <b>Berat Volumetrik (P x L x T / 5000)</b>, dan menggunakan nilai yang lebih tinggi untuk kalkulasi harga akhir.
                </p>
              </div>
            </div>

            {/* SECTION 3: Contact */}
            <div className="glass-card rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden">
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
        {/* KANAN: PROCEDURE PANEL & SUBMIT (STICKY & DARK)           */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[40%] xl:w-[35%] lg:sticky lg:top-28 z-20">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[2.5rem] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.3)] relative overflow-hidden text-white">
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

            <div className="flex items-start gap-3 mb-10 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 shadow-inner relative z-10">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-emerald-200 leading-relaxed">
                Quotation kami dijamin transparan tanpa biaya tersembunyi (No Hidden Fees).
              </span>
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