"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  MapPin, Box, ArrowRight, Maximize, 
  Star, Globe2, Calculator, Truck, Lock, X, FastForward, ChevronDown, User
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function DesktopLandingPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // State untuk Toggle Kalkulator vs Direct Booking
  const [showCalculator, setShowCalculator] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"domestik" | "internasional">("domestik");
  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    weight: "",
    length: "",
    width: "",
    height: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setEstimate(null);
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setEstimate(null);

    setTimeout(() => {
      const basePrice = activeTab === "domestik" ? 15000 : 150000;
      const calcWeight = Number(formData.weight) || 1;
      setEstimate(basePrice * calcWeight);
      setIsLoading(false);
    }, 1200);
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(number);
  };

  const getNextRouteWithData = () => {
    const params = new URLSearchParams({
      origin: formData.origin,
      destination: formData.destination,
      weight: formData.weight.toString(),
      l: formData.length.toString(),
      w: formData.width.toString(),
      h: formData.height.toString()
    }).toString();

    return activeTab === "domestik" ? `/delivery/booking?${params}` : `/forwarding/quote?${params}`;
  };

  const handleDirectBooking = (type: "domestik" | "internasional") => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    router.push(type === "domestik" ? "/delivery/booking" : "/forwarding/quote");
  };

  const handleProceed = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    router.push(getNextRouteWithData());
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden py-20">
      
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[120px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#C5A059] rounded-full blur-[100px] opacity-15 pointer-events-none" />

      <div className="max-w-7xl w-full px-6 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center z-10">
        
        {/* Kiri: Headline */}
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center gap-1 text-[#C5A059]">
              <Star className="w-4 h-4 fill-current"/>
              <Star className="w-4 h-4 fill-current"/>
              <Star className="w-4 h-4 fill-current"/>
              <Star className="w-4 h-4 fill-current"/>
              <Star className="w-4 h-4 fill-current"/>
            </div>
            <span className="text-xs font-bold text-gray-700">Dipercaya 1000+ Klien B2B</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6">
            Solusi Logistik <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Domestik & Global.</span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-lg leading-relaxed">
            Dari pengiriman dalam kota hingga ekspor antar benua. Pesan layanan kurir instan atau dapatkan penawaran kargo global tanpa ribet.
          </p>
          
          <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-gray-700">
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-[#7A171D]/10 flex items-center justify-center">
                <Truck className="text-[#7A171D] w-4 h-4"/>
              </div>
              <span>Pengiriman Lokal</span>
            </div>
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
                <Globe2 className="text-[#C5A059] w-4 h-4"/>
              </div>
              <span>Freight Forwarding</span>
            </div>
          </div>
        </motion.div>

        {/* Kanan: Widget Interaktif */}
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="bg-white rounded-3xl shadow-2xl shadow-[#7A171D]/10 border border-gray-100 relative overflow-hidden flex flex-col">
          
          {/* FAST TRACK PANEL */}
          <div className="p-8 md:p-10 border-b border-gray-100 bg-gradient-to-b from-white to-slate-50/50">
            <div className="flex items-center gap-3 mb-6">
              <FastForward className="w-6 h-6 text-[#7A171D]" />
              <h2 className="text-xl font-black text-gray-900">Pesan Langsung</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => handleDirectBooking("domestik")}
                className="group relative overflow-hidden bg-white hover:bg-red-50 border-2 border-gray-100 hover:border-[#7A171D] p-5 rounded-2xl transition-all text-left flex flex-col items-start gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-[#7A171D]/10 flex items-center justify-center text-[#7A171D] group-hover:scale-110 transition-transform">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Delivery Domestik</h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Kurir & Darat Lokal</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#7A171D] absolute right-4 top-1/2 -translate-y-1/2 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={() => handleDirectBooking("internasional")}
                className="group relative overflow-hidden bg-white hover:bg-amber-50 border-2 border-gray-100 hover:border-[#C5A059] p-5 rounded-2xl transition-all text-left flex flex-col items-start gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] group-hover:scale-110 transition-transform">
                  <Globe2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Freight Forwarding</h4>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Kargo Internasional</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-[#C5A059] absolute right-4 top-1/2 -translate-y-1/2 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          {/* KALKULATOR PANEL */}
          <div className="bg-white">
            <button 
              onClick={() => setShowCalculator(!showCalculator)}
              className="w-full flex items-center justify-between p-6 md:px-10 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calculator className="w-5 h-5 text-gray-400" />
                <span className="font-bold text-gray-700 text-sm">Cek Estimasi Harga Dulu (Opsional)</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showCalculator ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showCalculator && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 md:p-10 pt-0 border-t border-gray-100">
                    
                    {/* Tab Kalkulator */}
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-6 mt-4 relative">
                      <button 
                        type="button" 
                        onClick={() => { setActiveTab("domestik"); setEstimate(null); }} 
                        className={`flex-1 py-3 text-xs font-bold transition-all rounded-lg relative z-10 ${activeTab === "domestik" ? "text-[#7A171D]" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Lokal (Domestik)
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { setActiveTab("internasional"); setEstimate(null); }} 
                        className={`flex-1 py-3 text-xs font-bold transition-all rounded-lg relative z-10 ${activeTab === "internasional" ? "text-[#C5A059]" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Global (Internasional)
                      </button>
                      
                      {/* Animasi Background Tab */}
                      <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ${activeTab === "domestik" ? "left-1" : "left-[calc(50%+2px)]"}`}></div>
                    </div>

                    <form onSubmit={handleCalculate} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                            <MapPin className="w-3 h-3"/> Asal
                          </label>
                          <input 
                            type="text" 
                            name="origin" 
                            value={formData.origin} 
                            onChange={handleInputChange} 
                            // PERBAIKAN: Placeholder Dinamis
                            placeholder={activeTab === "domestik" ? "Cth: Jakarta Selatan" : "Negara / Kota Asal"} 
                            className={`w-full px-3 py-3 rounded-xl border border-gray-200 outline-none text-sm font-semibold bg-gray-50 transition-colors ${activeTab === "domestik" ? "focus:border-[#7A171D]" : "focus:border-[#C5A059]"}`} 
                            required 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                            <MapPin className={`w-3 h-3 ${activeTab === "domestik" ? "text-[#7A171D]" : "text-[#C5A059]"}`}/> Tujuan
                          </label>
                          <input 
                            type="text" 
                            name="destination" 
                            value={formData.destination} 
                            onChange={handleInputChange} 
                            // PERBAIKAN: Placeholder Dinamis
                            placeholder={activeTab === "domestik" ? "Cth: Surabaya" : "Negara / Kota Tujuan"} 
                            className={`w-full px-3 py-3 rounded-xl border border-gray-200 outline-none text-sm font-semibold bg-gray-50 transition-colors ${activeTab === "domestik" ? "focus:border-[#7A171D]" : "focus:border-[#C5A059]"}`} 
                            required 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                            <Box className="w-3 h-3"/> Berat (Kg)
                          </label>
                          <input 
                            type="number" 
                            name="weight" 
                            min="1" 
                            value={formData.weight} 
                            onChange={handleInputChange} 
                            placeholder="0" 
                            className={`w-full px-3 py-3 rounded-xl border border-gray-200 outline-none text-sm font-bold text-center bg-gray-50 transition-colors ${activeTab === "domestik" ? "focus:border-[#7A171D]" : "focus:border-[#C5A059]"}`} 
                            required 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                            <Maximize className="w-3 h-3"/> PxLxT (cm)
                          </label>
                          <div className="flex gap-1">
                            <input type="number" name="length" placeholder="P" value={formData.length} onChange={handleInputChange} required className={`w-full px-1 py-3 text-center rounded-xl border border-gray-200 outline-none font-bold text-xs bg-gray-50 transition-colors ${activeTab === "domestik" ? "focus:border-[#7A171D]" : "focus:border-[#C5A059]"}`} />
                            <input type="number" name="width" placeholder="L" value={formData.width} onChange={handleInputChange} required className={`w-full px-1 py-3 text-center rounded-xl border border-gray-200 outline-none font-bold text-xs bg-gray-50 transition-colors ${activeTab === "domestik" ? "focus:border-[#7A171D]" : "focus:border-[#C5A059]"}`} />
                            <input type="number" name="height" placeholder="T" value={formData.height} onChange={handleInputChange} required className={`w-full px-1 py-3 text-center rounded-xl border border-gray-200 outline-none font-bold text-xs bg-gray-50 transition-colors ${activeTab === "domestik" ? "focus:border-[#7A171D]" : "focus:border-[#C5A059]"}`} />
                          </div>
                        </div>
                      </div>

                      {!estimate && (
                        <button 
                          type="submit" 
                          disabled={isLoading} 
                          className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-4 text-sm transition-all disabled:opacity-70"
                        >
                          {isLoading ? <span className="animate-pulse">Menghitung...</span> : "Hitung Estimasi"}
                        </button>
                      )}
                    </form>

                    <AnimatePresence>
                      {estimate !== null && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-5 bg-slate-50 border border-gray-200 rounded-2xl text-center">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            {activeTab === "domestik" ? "Estimasi Tarif Dasar" : "Estimasi Kasar (Belum Pajak)"}
                          </p>
                          <h3 className={`text-2xl font-black mb-4 ${activeTab === "domestik" ? "text-[#7A171D]" : "text-[#C5A059]"}`}>
                            {formatRupiah(estimate)}
                          </h3>
                          <button 
                            onClick={handleProceed} 
                            // PERBAIKAN: Tombol Lanjut berubah Emas jika tab Internasional
                            className={`w-full text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-all ${activeTab === "domestik" ? "bg-[#7A171D] hover:bg-[#5A0E13]" : "bg-[#C5A059] hover:bg-[#b08d4a]"}`}
                          >
                            {activeTab === "domestik" ? "Lanjut Pesan Kurir" : "Lengkapi Data Forwarding"} <ArrowRight className="w-4 h-4"/>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* CUSTOM AUTH MODAL (Pengganti Alert) */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAuthModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
            
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#7A171D] to-[#C5A059]" />
              <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-700 transition-colors"><X className="w-6 h-6" /></button>

              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-[#7A171D]" />
              </div>
              
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Akses Terbatas</h3>
              <p className="text-gray-500 leading-relaxed mb-8 text-sm">
                Data dan riwayat pesanan sangat penting. Silakan masuk atau daftar akun Flash Global terlebih dahulu untuk melanjutkan pesanan.
              </p>
              
              <div className="flex gap-4">
                <button onClick={() => setShowAuthModal(false)} className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
                  Batal
                </button>
                <button onClick={() => router.push("/login")} className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-[#7A171D] hover:bg-[#5A0E13] shadow-lg shadow-[#7A171D]/20 transition-all flex items-center justify-center gap-2">
                  <User className="w-4 h-4" /> Login
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}