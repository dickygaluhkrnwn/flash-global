"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, Car, ChevronDown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DynamicVehicle } from "@/types/order";
import { FieldLabel } from "./FieldLabel";
import { Badge } from "@/components/ui/Badge";

// EXTEND TYPE UNTUK MENGAKOMODASI imageUrl SEMENTARA (Sama seperti showcase)
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

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fungsi untuk mendapatkan gambar armada
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
    <div className="space-y-8">
      
      {/* 1. KOTAK PILIHAN LAYANAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div 
          className={cn(
            "relative p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300", 
            selectedService === "Instan" 
              ? "border-[#7A171D] bg-[#7A171D]/5 shadow-[inset_0_2px_4px_rgba(122,23,29,0.05)]" 
              : "border-slate-200 bg-white/50 hover:bg-white hover:border-slate-300"
          )}
          onClick={() => setSelectedService("Instan")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn("font-black text-base tracking-tight", selectedService === "Instan" ? "text-[#7A171D]" : "text-slate-700")}>Pengiriman Instan</span>
            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", selectedService === "Instan" ? "border-[#7A171D]" : "border-slate-300")}>
              {selectedService === "Instan" && <div className="w-3 h-3 bg-[#7A171D] rounded-full"></div>}
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">Pencarian kurir tercepat, langsung dikirim ke tujuan tanpa mampir.</p>
        </div>

        <div 
          className={cn(
            "relative p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300", 
            selectedService === "Sameday" 
              ? "border-[#C5A059] bg-[#C5A059]/5 shadow-[inset_0_2px_4px_rgba(197,160,89,0.05)]" 
              : "border-slate-200 bg-white/50 hover:bg-white hover:border-slate-300"
          )}
          onClick={() => setSelectedService("Sameday")}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn("font-black text-base tracking-tight", selectedService === "Sameday" ? "text-[#C5A059]" : "text-slate-700")}>Sameday Delivery</span>
            <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", selectedService === "Sameday" ? "border-[#C5A059]" : "border-slate-300")}>
              {selectedService === "Sameday" && <div className="w-3 h-3 bg-[#C5A059] rounded-full"></div>}
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">Lebih hemat. Kurir akan mengambil dan mengirim beberapa paket searah.</p>
        </div>
      </div>

      {/* 2. CUSTOM DROPDOWN & GAMBAR ARMADA (VERSI VERTIKAL) */}
      <div>
        <FieldLabel label="Pilih Tipe Kendaraan" infoTitle="Auto-Select Kendaraan" infoText="Sistem secara cerdas memblokir kendaraan yang kapasitasnya tidak mencukupi berat total barang Anda dari seluruh titik rute." onInfoClick={handleInfoClick}/>
        
        {isFetchingData ? (
          <div className="h-16 w-full bg-slate-100 rounded-2xl animate-pulse flex items-center px-6 text-sm font-bold text-slate-400">Sinkronisasi Armada...</div>
        ) : (
          <div className="flex flex-col gap-5"> {/* Ubah jadi flex-col dan beri gap */}
            
            {/* Bagian Dropdown Kustom (Di Atas) */}
            <div className="w-full relative z-20" ref={dropdownRef}>
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={cn(
                  "w-full h-[60px] bg-white/80 backdrop-blur-md border border-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-[1.25rem] flex items-center justify-between px-5 cursor-pointer transition-all focus-within:ring-[3px]",
                  isDropdownOpen ? "ring-[3px] ring-[#7A171D]/20 border-[#7A171D]/50" : "hover:bg-white hover:shadow-md hover:border-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7A171D]/10 text-[#7A171D] flex items-center justify-center shrink-0 border border-[#7A171D]/20">
                    {selectedVehicle?.category === "Motor" || selectedVehicle?.isMotor ? <Truck className="w-4 h-4"/> : <Car className="w-4 h-4"/>}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm tracking-tight">{selectedVehicle?.name || "Pilih Armada"}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kapasitas Maksimal {selectedVehicle?.maxWeight} Kg</p>
                  </div>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
              </div>

              {/* Opsi Dropdown */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-[72px] left-0 right-0 bg-white/95 backdrop-blur-xl border border-white shadow-[0_20px_60px_rgba(0,0,0,0.1)] rounded-3xl overflow-hidden z-50 py-2 max-h-[300px] overflow-y-auto client-scrollbar"
                  >
                    {vehicles.map((v) => {
                      const isOverCapacity = totalWeight > v.maxWeight;
                      const isSelected = selectedVehicle?.id === v.id;
                      
                      return (
                        <div 
                          key={v.id}
                          onClick={() => {
                            if (!isOverCapacity) {
                              setSelectedVehicle(v);
                              setIsDropdownOpen(false);
                            }
                          }}
                          className={cn(
                            "px-5 py-3.5 flex items-center justify-between transition-colors",
                            isOverCapacity ? "opacity-50 cursor-not-allowed bg-slate-50" : "cursor-pointer hover:bg-slate-50",
                            isSelected && "bg-[#7A171D]/5"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm", isSelected ? "bg-[#7A171D] text-white" : "bg-white border border-slate-200 text-slate-500")}>
                              {v.category === "Motor" || v.isMotor ? <Truck className="w-4 h-4"/> : <Car className="w-4 h-4"/>}
                            </div>
                            <div>
                              <p className={cn("text-sm font-bold", isSelected ? "text-[#7A171D]" : "text-slate-700")}>{v.name}</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Mulai dari {formatRupiah(v.baseFare)}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            {isOverCapacity ? (
                              <Badge variant="danger" className="text-[9px]">Overload</Badge>
                            ) : (
                              <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{v.maxWeight} Kg</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bagian Gambar Kendaraan (Di Bawah & Dibesarkan) */}
            <div className="w-full h-[280px] md:h-[350px] rounded-[2rem] bg-slate-100 relative overflow-hidden border border-white/50 shadow-[inset_0_2px_15px_rgba(0,0,0,0.05)] group z-10">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedVehicle?.id}
                  src={getImageUrl(selectedVehicle as ExtendedVehicle)}
                  alt={selectedVehicle?.name}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent"></div>
              
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <div>
                  <span className="text-white text-xl font-black tracking-tight drop-shadow-md">{selectedVehicle?.name}</span>
                  <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mt-1">Armada Pilihan Anda</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 backdrop-blur-md flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 drop-shadow-md" />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}