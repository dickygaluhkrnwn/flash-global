"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Car, ChevronDown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DynamicVehicle } from "@/types/order";
import { FieldLabel } from "./FieldLabel";
import { Badge } from "@/components/ui/Badge";

type ExtendedVehicle = DynamicVehicle & { imageUrl?: string };

interface Props {
  selectedService: "Instan" | "Sameday";
  setSelectedService: (v: "Instan" | "Sameday") => void;
  vehicles: ExtendedVehicle[];
  selectedVehicle: ExtendedVehicle | null;
  setSelectedVehicle: (v: DynamicVehicle) => void;
  isFetchingData: boolean;
  totalWeight: number;
  handleInfoClick: (t: string, text: string) => void;
}

export default function ServiceVehicleSelector({ 
  selectedService, setSelectedService, 
  vehicles, selectedVehicle, setSelectedVehicle, 
  isFetchingData, totalWeight, handleInfoClick 
}: Props) {
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getImageUrl = (vehicle: ExtendedVehicle | null) => {
    if (!vehicle) return "";
    if (vehicle.imageUrl) return vehicle.imageUrl;
    
    const isMobil = vehicle.category === "Mobil";
    const isMotor = vehicle.category === "Motor" || vehicle.isMotor;
    
    if (isMotor) return "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop";
    if (isMobil) return "https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=1200&auto=format&fit=crop";
    return "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=1200&auto=format&fit=crop";
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      
      {/* 1. KOTAK PILIHAN LAYANAN (GRID 2 KOLOM RAMPING) */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          className={cn("relative p-4 rounded-[1.25rem] border-2 transition-all duration-300 active:scale-95 tap-highlight-transparent flex flex-col justify-between", selectedService === "Instan" ? "border-[#7A171D] bg-[#7A171D]/5" : "border-slate-200 bg-white/50")}
          onClick={() => setSelectedService("Instan")}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={cn("font-black text-sm tracking-tight", selectedService === "Instan" ? "text-[#7A171D]" : "text-slate-700")}>Instan</span>
            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", selectedService === "Instan" ? "border-[#7A171D]" : "border-slate-300")}>
              {selectedService === "Instan" && <div className="w-2.5 h-2.5 bg-[#7A171D] rounded-full"></div>}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-bold leading-tight">Langsung kirim.</p>
        </div>

        <div 
          className={cn("relative p-4 rounded-[1.25rem] border-2 transition-all duration-300 active:scale-95 tap-highlight-transparent flex flex-col justify-between", selectedService === "Sameday" ? "border-[#C5A059] bg-[#C5A059]/5" : "border-slate-200 bg-white/50")}
          onClick={() => setSelectedService("Sameday")}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={cn("font-black text-sm tracking-tight", selectedService === "Sameday" ? "text-[#C5A059]" : "text-slate-700")}>Sameday</span>
            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", selectedService === "Sameday" ? "border-[#C5A059]" : "border-slate-300")}>
              {selectedService === "Sameday" && <div className="w-2.5 h-2.5 bg-[#C5A059] rounded-full"></div>}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 font-bold leading-tight">Lebih hemat.</p>
        </div>
      </div>

      {/* 2. DROPDOWN ARMADA */}
      <div className="relative z-50">
        <FieldLabel label="Pilih Tipe Kendaraan" infoTitle="Auto-Select" infoText="Sistem memblokir kendaraan yang kekecilan." onInfoClick={handleInfoClick}/>
        
        {isFetchingData ? (
          <div className="h-14 w-full bg-slate-100 rounded-2xl animate-pulse flex items-center px-4 text-xs font-bold text-slate-400">Sinkronisasi Armada...</div>
        ) : (
          <div className="relative w-full z-50" ref={dropdownRef}>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn("w-full h-14 bg-white/80 backdrop-blur-md border rounded-[1.25rem] flex items-center justify-between px-4 tap-highlight-transparent active:scale-[0.98] transition-all", isDropdownOpen ? "border-[#7A171D]/50 ring-2 ring-[#7A171D]/20" : "border-slate-200")}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#7A171D]/10 text-[#7A171D] flex items-center justify-center shrink-0">
                  {selectedVehicle?.category === "Motor" || selectedVehicle?.isMotor ? <Truck className="w-4 h-4"/> : <Car className="w-4 h-4"/>}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm tracking-tight leading-tight">{selectedVehicle?.name || "Pilih"}</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Maks {selectedVehicle?.maxWeight} Kg</p>
                </div>
              </div>
              <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
            </div>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}
                  className="absolute top-[64px] left-0 right-0 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-2xl overflow-hidden z-[100] py-2 max-h-[250px] overflow-y-auto"
                >
                  {vehicles.map((v) => {
                    const isOverCapacity = totalWeight > v.maxWeight;
                    const isSelected = selectedVehicle?.id === v.id;
                    
                    return (
                      <div 
                        key={v.id}
                        onClick={() => { if (!isOverCapacity) { setSelectedVehicle(v); setIsDropdownOpen(false); } }}
                        className={cn("px-4 py-3 flex items-center justify-between transition-colors tap-highlight-transparent", isOverCapacity ? "opacity-50 bg-slate-50" : "active:bg-slate-100", isSelected && "bg-[#7A171D]/5")}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isSelected ? "bg-[#7A171D] text-white" : "bg-slate-100 text-slate-500")}>
                            {v.category === "Motor" || v.isMotor ? <Truck className="w-4 h-4"/> : <Car className="w-4 h-4"/>}
                          </div>
                          <div>
                            <p className={cn("text-xs font-bold", isSelected ? "text-[#7A171D]" : "text-slate-700")}>{v.name}</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{formatRupiah(v.baseFare)}</p>
                          </div>
                        </div>
                        {isOverCapacity ? <Badge variant="danger" className="text-[8px] px-1.5 py-0.5">Overload</Badge> : <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{v.maxWeight} Kg</span>}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 3. GAMBAR ARMADA */}
      <div className="w-full h-[180px] rounded-[1.5rem] bg-slate-100 relative overflow-hidden shadow-inner group z-10">
        <AnimatePresence mode="wait">
          <motion.img key={selectedVehicle?.id} src={getImageUrl(selectedVehicle as ExtendedVehicle)} alt={selectedVehicle?.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 w-full h-full object-cover" />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <div>
            <span className="text-white text-lg font-black tracking-tight">{selectedVehicle?.name}</span>
            <p className="text-white/80 text-[9px] font-bold uppercase tracking-widest">Armada Pilihan</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 backdrop-blur-md flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

    </div>
  );
}