"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DynamicVehicle } from "@/types/order";
import { ChevronLeft, ChevronRight, Truck, Car, Zap, CheckCircle2, Box, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// EXTEND TYPE UNTUK MENGAKOMODASI imageUrl
type ExtendedVehicle = DynamicVehicle & { imageUrl?: string };

interface VehicleShowcaseProps {
  vehicles: ExtendedVehicle[];
  selectedVehicleId: string;
  onSelect: (id: string) => void;
}

export default function VehicleShowcase({ vehicles, selectedVehicleId, onSelect }: VehicleShowcaseProps) {
  // Bikin object AI Auto yang PATUH 100% dengan tipe ExtendedVehicle
  const autoItem: ExtendedVehicle = {
    id: "auto",
    name: "AI Auto Recommender",
    isMotor: false,
    maxWeight: 0, // Placeholder
    baseFare: 0,  // Placeholder
    minKm: 0,
    perKm: 0
  };

  const sliderItems: ExtendedVehicle[] = [autoItem, ...vehicles];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  // Sync index dengan dropdown luar
  useEffect(() => {
    const idx = sliderItems.findIndex(v => v.id === selectedVehicleId);
    if (idx !== -1 && idx !== currentIndex) {
      setDirection(idx > currentIndex ? 1 : -1);
      setCurrentIndex(idx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId, vehicles]);

  const handleNext = () => {
    setDirection(1);
    const nextIdx = currentIndex === sliderItems.length - 1 ? 0 : currentIndex + 1;
    onSelect(sliderItems[nextIdx].id);
  };

  const handlePrev = () => {
    setDirection(-1);
    const prevIdx = currentIndex === 0 ? sliderItems.length - 1 : currentIndex - 1;
    onSelect(sliderItems[prevIdx].id);
  };

  const activeItem = sliderItems[currentIndex];
  const isAuto = activeItem.id === "auto";
  const isMobil = activeItem.category === "Mobil";
  const isMotor = activeItem.category === "Motor" || activeItem.isMotor;

  // Render Gambar: Cek imageUrl dari admin dulu, kalau kosong pakai fallback Unsplash
  const getImageUrl = () => {
    if (activeItem.imageUrl) return activeItem.imageUrl; // Gambar dari Admin

    if (isAuto) return "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop"; // Abstract Tech
    if (isMotor) return "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop"; // Scooter
    if (isMobil) return "https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=1200&auto=format&fit=crop"; // Van / Mobil
    return "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop"; // Truk
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  return (
    <div className="w-full relative">
      {/* Pills Navigation di atas Slider */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-6 pb-2 px-1">
        {sliderItems.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => {
              setDirection(idx > currentIndex ? 1 : -1);
              onSelect(item.id);
            }}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 shadow-sm border",
              currentIndex === idx 
                ? "bg-slate-900 text-white border-slate-900 shadow-md scale-105" 
                : "bg-white text-slate-500 border-white hover:bg-slate-100 hover:text-slate-800"
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-[3rem] p-3 md:p-4 flex flex-col lg:flex-row gap-4 relative overflow-hidden h-auto min-h-[400px]">
        
        {/* Gambar Area */}
        <div className="w-full lg:w-1/2 h-[250px] lg:h-auto rounded-[2.5rem] bg-slate-100 relative overflow-hidden flex-shrink-0 border border-white/50 shadow-inner">
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.img
              key={activeItem.id}
              src={getImageUrl()}
              alt={activeItem.name}
              initial={{ x: direction * 50, opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: direction * -50, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "circOut" }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          {/* Overlay Gradient for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent"></div>
          
          <div className="absolute bottom-6 left-6 flex items-center gap-3">
            <button onClick={handlePrev} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-slate-900 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={handleNext} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-slate-900 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Area */}
        <div className="w-full lg:w-1/2 p-6 md:p-8 flex flex-col justify-center relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm border", 
                isAuto ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-400" :
                isMobil ? "bg-blue-50 text-blue-600 border-blue-100" : 
                isMotor ? "bg-amber-50 text-amber-600 border-amber-100" : 
                "bg-[#7A171D]/10 text-[#7A171D] border-[#7A171D]/20"
              )}>
                {isAuto ? <Sparkles className="w-7 h-7" /> : isMobil ? <Car className="w-7 h-7" /> : <Truck className="w-7 h-7" />}
              </div>

              <h3 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight leading-none text-balance">{activeItem.name}</h3>
              
              {isAuto ? (
                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                  Sistem cerdas kami akan otomatis menyeleksi armada dengan harga termurah dan efisiensi ruang terbaik berdasarkan dimensi serta berat kargo Anda.
                </p>
              ) : (
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <p className="text-slate-700 font-medium">Beban Maksimal: <b className="text-slate-900">{activeItem.maxWeight} Kg</b></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Box className="w-5 h-5 text-emerald-500" />
                    {/* Menggunakan Optional Chaining dengan Fallback yang aman */}
                    <p className="text-slate-700 font-medium">Dimensi Muatan: <b className="text-slate-900">{activeItem.dimM?.p ?? 0}x{activeItem.dimM?.l ?? 0}x{activeItem.dimM?.t ?? 0} cm</b></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-emerald-500" />
                    <p className="text-slate-700 font-medium">Asuransi Premium Tersedia</p>
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6 border-t border-slate-200/60">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mulai Dari (Base Fare)</p>
                <h4 className="text-2xl font-black text-slate-900">
                  {isAuto ? "Dihitung Otomatis" : formatRupiah(activeItem.baseFare || 0)}
                </h4>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}