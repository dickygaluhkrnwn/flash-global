"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  MapPin, Box, ArrowRight, ChevronDown, 
  Check, Minus, Plus, Star, Shield, Globe2, Calculator, MessageCircle
} from "lucide-react";

// Data Destinasi Dummy dengan Harga Per Kg (Untuk Presentasi)
const destinations = [
  { id: "SG", name: "Singapura", flag: "🇸🇬", pricePerKg: 125000 },
  { id: "MY", name: "Malaysia", flag: "🇲🇾", pricePerKg: 140000 },
  { id: "TW", name: "Taiwan", flag: "🇹🇼", pricePerKg: 210000 },
  { id: "AU", name: "Australia", flag: "🇦🇺", pricePerKg: 350000 },
  { id: "US", name: "Amerika Serikat", flag: "🇺🇸", pricePerKg: 480000 },
];

export default function DesktopLandingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [estimate, setEstimate] = useState<number | null>(null);
  
  // Custom State untuk Form
  const [isDestOpen, setIsDestOpen] = useState(false);
  const [selectedDest, setSelectedDest] = useState(destinations[0]);
  const [weight, setWeight] = useState<number>(5);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Menutup dropdown jika klik di luar area
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDestOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fungsi Kalkulasi Harga
  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setEstimate(null); // Reset estimasi sebelumnya

    // Simulasi loading kalkulasi API
    setTimeout(() => {
      const calculatedPrice = selectedDest.pricePerKg * weight;
      setEstimate(calculatedPrice);
      setIsLoading(false);
    }, 1000);
  };

  // Fungsi Stepper Berat
  const handleWeightChange = (type: "min" | "plus") => {
    if (type === "min" && weight > 1) {
      setWeight(weight - 1);
      setEstimate(null); // Sembunyikan hasil jika berat diubah
    }
    if (type === "plus") {
      setWeight(weight + 1);
      setEstimate(null); // Sembunyikan hasil jika berat diubah
    }
  };

  // Fungsi Redirect ke WA Admin
  const handleWhatsApp = () => {
    const adminWA = "6285177886877"; // 0851-7788-6877 format internasional
    const text = `Halo Admin Flash Global, saya ingin tanya estimasi pengiriman:%0A- Tujuan: ${selectedDest.name}%0A- Berat: ${weight} Kg%0A- Estimasi Web: ${formatRupiah(estimate || 0)}%0A%0AMohon info lebih lanjut, terima kasih.`;
    window.open(`https://wa.me/${adminWA}?text=${text}`, "_blank");
  };

  // Format ke Rupiah
  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(number);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden py-20">
      {/* Background Elements (Maroon & Gold Accents) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[120px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#C5A059] rounded-full blur-[100px] opacity-15 pointer-events-none" />

      <div className="max-w-7xl w-full px-6 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center z-10">
        
        {/* Kiri: Headline & Marketing Message */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Social Proof Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <div className="flex items-center gap-1 text-[#C5A059]">
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
              <Star className="w-4 h-4 fill-current" />
            </div>
            <span className="text-xs font-bold text-gray-700">Dipercaya 1000+ Klien B2B</span>
          </div>

          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1] mb-6">
            Kirim Paket ke Luar Negeri <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Lebih Cepat & Aman.</span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-lg leading-relaxed">
            Solusi ekspedisi forwarder terpercaya. Hitung tarif Anda sekarang dan tim ahli kami akan langsung mengurus bea cukai hingga sampai di tujuan.
          </p>
          
          <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-gray-700">
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-[#7A171D]/10 flex items-center justify-center">
                <Globe2 className="text-[#7A171D] w-4 h-4" />
              </div>
              <span>Jangkauan Global</span>
            </div>
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-[#C5A059]/10 flex items-center justify-center">
                <Shield className="text-[#C5A059] w-4 h-4" />
              </div>
              <span>Asuransi Penuh</span>
            </div>
          </div>
        </motion.div>

        {/* Kanan: Interactive Booking Widget */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl shadow-[#7A171D]/10 p-8 md:p-10 border border-gray-100 relative"
        >
          <div className="mb-8 border-b border-gray-100 pb-6">
            <h2 className="text-2xl font-black text-gray-900">Kalkulator Pengiriman</h2>
            <p className="text-gray-500 text-sm mt-1 font-medium">Dapatkan penawaran tarif instan hari ini.</p>
          </div>

          <form onSubmit={handleCalculate} className="space-y-6 relative">
            
            {/* Input Negara Asal (Static/Read-only style) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#7A171D]" /> Negara Asal
              </label>
              <div className="w-full px-5 py-4 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-3 opacity-70 cursor-not-allowed">
                <span className="text-xl">🇮🇩</span>
                <span className="font-bold text-gray-900">Indonesia</span>
              </div>
            </div>

            {/* Custom Dropdown Negara Tujuan */}
            <div className="space-y-2 relative" ref={dropdownRef}>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#C5A059]" /> Negara Tujuan
              </label>
              
              <button
                type="button"
                onClick={() => setIsDestOpen(!isDestOpen)}
                className={`w-full px-5 py-4 rounded-xl border ${isDestOpen ? 'border-[#C5A059] ring-4 ring-[#C5A059]/10 bg-white' : 'border-gray-200 bg-gray-50 hover:bg-white'} flex items-center justify-between transition-all outline-none`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{selectedDest.flag}</span>
                  <span className="font-bold text-gray-900">{selectedDest.name}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isDestOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isDestOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-40 top-[105%] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-xl shadow-[#7A171D]/10 overflow-hidden py-2"
                  >
                    {destinations.map((dest) => (
                      <div
                        key={dest.id}
                        onClick={() => {
                          setSelectedDest(dest);
                          setEstimate(null); // Reset estimasi saat tujuan diubah
                          setIsDestOpen(false);
                        }}
                        className="px-5 py-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{dest.flag}</span>
                          <span className={`font-bold ${selectedDest.id === dest.id ? 'text-[#7A171D]' : 'text-gray-700'}`}>
                            {dest.name}
                          </span>
                        </div>
                        {selectedDest.id === dest.id && (
                          <Check className="w-4 h-4 text-[#7A171D]" />
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Custom Input Berat (Stepper) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Box className="w-3.5 h-3.5 text-gray-400" /> Berat Barang (Kg)
              </label>
              
              <div className="flex items-center gap-4">
                <button 
                  type="button" 
                  onClick={() => handleWeightChange("min")}
                  className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center hover:bg-[#7A171D] hover:border-[#7A171D] hover:text-white transition-all text-gray-600 active:scale-95"
                >
                  <Minus className="w-5 h-5" />
                </button>
                
                <div className="flex-1 relative">
                  <input 
                    type="number" 
                    min="1"
                    value={weight}
                    onChange={(e) => {
                      setWeight(Number(e.target.value) || 1);
                      setEstimate(null);
                    }}
                    className="w-full px-5 py-4 text-center rounded-xl border-2 border-gray-200 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none transition-all bg-white font-black text-2xl text-gray-900"
                    required
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">Kg</span>
                </div>

                <button 
                  type="button" 
                  onClick={() => handleWeightChange("plus")}
                  className="w-14 h-14 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center hover:bg-[#7A171D] hover:border-[#7A171D] hover:text-white transition-all text-gray-600 active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Submit Button (Hitung Estimasi) */}
            {!estimate && (
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-5 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#7A171D]/30 disabled:opacity-70 disabled:cursor-not-allowed mt-8 group text-lg"
              >
                {isLoading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Menghitung...
                  </>
                ) : (
                  <>
                    <Calculator className="w-5 h-5" /> Hitung Estimasi Biaya
                  </>
                )}
              </button>
            )}
          </form>

          {/* Hasi Estimasi & Action Buttons (Muncul setelah tombol hitung diklik) */}
          <AnimatePresence>
            {estimate !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-slate-50 border border-[#C5A059]/30 rounded-2xl p-6 relative">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Estimasi Biaya Pengiriman</p>
                  <h3 className="text-3xl font-black text-[#7A171D] mb-6">{formatRupiah(estimate)}</h3>
                  
                  <div className="flex flex-col gap-3">
                    {/* Primary Action - Lanjut Booking */}
                    <button 
                      onClick={() => router.push(`/isi-data/TOKEN-MOCKUP-${Date.now()}`)}
                      className="w-full bg-[#C5A059] hover:bg-[#DFBE7B] text-gray-900 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#C5A059]/20 group"
                    >
                      Lanjut Isi Data Booking <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    {/* Secondary Action - Tanya WA */}
                    <button 
                      onClick={handleWhatsApp}
                      className="w-full bg-white hover:bg-green-50 text-green-600 border border-green-200 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                      <MessageCircle className="w-5 h-5" /> Tanya via WhatsApp
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </main>
  );
}