"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DynamicVehicle } from "@/types/order";
import { ChevronLeft, ChevronRight, Truck, Car, Zap, CheckCircle2, Box, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type ExtendedVehicle = DynamicVehicle & { imageUrl?: string };

interface VehicleShowcaseProps {
  vehicles: ExtendedVehicle[];
  selectedVehicleId: string;
  onSelect: (id: string) => void;
}

export default function VehicleShowcase({ vehicles, selectedVehicleId, onSelect }: VehicleShowcaseProps) {
  const autoItem: ExtendedVehicle = {
    id: "auto",
    name: "AI Auto Recommender",
    isMotor: false,
    maxWeight: 0,
    baseFare: 0, 
    minKm: 0,
    perKm: 0
  };

  const sliderItems: ExtendedVehicle[] = [autoItem, ...vehicles];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

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

  const getImageUrl = () => {
    if (activeItem.imageUrl) return activeItem.imageUrl;
    if (isAuto) return "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop"; 
    if (isMotor) return "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop"; 
    if (isMobil) return "https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=1200&auto=format&fit=crop"; 
    return "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop"; 
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  return (
    <div className="w-full relative space-y-4 font-sans">
      
      {/* NATIVE MOBILE PILLS NAVIGATION */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 px-1 tap-highlight-transparent">
        {sliderItems.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => {
              setDirection(idx > currentIndex ? 1 : -1);
              onSelect(item.id);
            }}
            className={cn(
              "px-4 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all duration-300 shadow-sm border shrink-0",
              currentIndex === idx 
                ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                : "bg-white/80 backdrop-blur-sm text-slate-500 border-white"
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      {/* STACKED CARD */}
      <div className="glass-card rounded-[2rem] overflow-hidden border border-white shadow-sm bg-white/40 flex flex-col">
        
        {/* Gambar Area */}
        <div className="w-full h-[220px] bg-slate-100 relative overflow-hidden flex-shrink-0">
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.img
              key={activeItem.id}
              src={getImageUrl()}
              alt={activeItem.name}
              initial={{ x: direction * 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -100, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent z-10"></div>
          
          {/* Controls */}
          <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 flex justify-between z-20 pointer-events-none">
            <button onClick={handlePrev} className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md border border-white/30 text-white flex items-center justify-center active:bg-white active:text-slate-900 transition-colors pointer-events-auto tap-highlight-transparent shadow-md">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={handleNext} className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md border border-white/30 text-white flex items-center justify-center active:bg-white active:text-slate-900 transition-colors pointer-events-auto tap-highlight-transparent shadow-md">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Area */}
        <div className="p-5 flex flex-col relative z-20 bg-white/60 backdrop-blur-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col h-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border shrink-0", 
                  isAuto ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-400" :
                  isMobil ? "bg-blue-50 text-blue-600 border-blue-100" : 
                  isMotor ? "bg-amber-50 text-amber-600 border-amber-100" : 
                  "bg-[#7A171D]/10 text-[#7A171D] border-[#7A171D]/20"
                )}>
                  {isAuto ? <Sparkles className="w-5 h-5" /> : isMobil ? <Car className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{activeItem.name}</h3>
              </div>
              
              {isAuto ? (
                <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                  Sistem cerdas akan menyeleksi armada dengan harga termurah dan efisiensi ruang terbaik.
                </p>
              ) : (
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-slate-600 text-xs font-bold">Beban Maksimal: <b className="text-slate-900">{activeItem.maxWeight} Kg</b></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-slate-600 text-xs font-bold">Dimensi: <b className="text-slate-900">{activeItem.dimM?.p ?? 0}x{activeItem.dimM?.l ?? 0}x{activeItem.dimM?.t ?? 0} cm</b></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-slate-600 text-xs font-bold">Asuransi Premium Tersedia</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200/60 flex items-end justify-between">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mulai Dari (Base)</p>
                <h4 className="text-lg font-black text-slate-900 tracking-tight">
                  {isAuto ? "Otomatis" : formatRupiah(activeItem.baseFare || 0)}
                </h4>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

    </div>
  );
}