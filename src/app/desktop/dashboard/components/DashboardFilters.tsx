"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, ArrowDownWideNarrow, X, ChevronDown, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface FilterProps {
  sortBy: string;
  setSortBy: (v: string) => void;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  filterService: string;
  setFilterService: (v: string) => void;
  dateStart: string;
  setDateStart: (v: string) => void;
  dateEnd: string;
  setDateEnd: (v: string) => void;
  resetFilters: () => void;
  onClose: () => void;
}

// Opsi untuk Custom Dropdowns
const SORT_OPTIONS = [
  { value: "date_desc", label: "Tanggal Terbaru" },
  { value: "date_asc", label: "Tanggal Terlama" },
  { value: "price_desc", label: "Tagihan Tertinggi" },
  { value: "price_asc", label: "Tagihan Terendah" },
  { value: "weight_desc", label: "Berat Maksimal" }
];

const CATEGORY_OPTIONS = [
  { value: "Semua", label: "Semua Area" },
  { value: "Domestik", label: "Domestik" },
  { value: "Internasional", label: "Internasional" }
];

const SERVICE_OPTIONS = [
  { value: "Semua", label: "Semua Layanan" },
  { value: "Instan", label: "Pengiriman Instan" },
  { value: "Sameday", label: "Sameday Delivery" },
  { value: "Reguler", label: "Kargo Reguler" }
];

// --- CUSTOM DROPDOWN COMPONENT (Apple Style) ---
function CustomSelect({ 
  value, 
  options, 
  onChange, 
  icon: Icon 
}: { 
  value: string; 
  options: { value: string, label: string }[]; 
  onChange: (val: string) => void;
  icon?: React.ElementType;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cari label dari value saat ini
  const activeLabel = options.find(opt => opt.value === value)?.label || "Pilih opsi";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    // Tambahkan z-index dinamis: Jika buka, pastikan dia di atas elemen lain
    <div className={cn("relative", isOpen ? "z-[60]" : "z-10")} ref={dropdownRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-[52px] bg-white/70 backdrop-blur-md border rounded-2xl flex items-center justify-between px-4 cursor-pointer transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]",
          isOpen ? "border-[#C5A059]/50 ring-[3px] ring-[#C5A059]/20 bg-white" : "border-white hover:bg-white hover:border-slate-200"
        )}
      >
        <div className="flex items-center gap-3 w-full overflow-hidden">
          {Icon && <Icon className={cn("w-4 h-4 shrink-0 transition-colors", isOpen ? "text-[#C5A059]" : "text-slate-400")} />}
          <span className="text-sm font-bold text-slate-700 truncate">{activeLabel}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300", isOpen && "rotate-180")} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[60px] left-0 right-0 bg-white/95 backdrop-blur-xl border border-white shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-2xl py-2 overflow-hidden"
          >
            {options.map((opt) => (
              <div 
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={cn(
                  "px-5 py-3 text-sm font-bold cursor-pointer transition-colors flex items-center justify-between",
                  value === opt.value ? "bg-[#C5A059]/10 text-[#A68345]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {opt.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================================
// MAIN FILTER COMPONENT
// ==========================================================
export default function DashboardFilters({
  sortBy, setSortBy, filterCategory, setFilterCategory,
  filterService, setFilterService, dateStart, setDateStart,
  dateEnd, setDateEnd, resetFilters, onClose
}: FilterProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, height: 0, y: -20 }} 
      animate={{ opacity: 1, height: "auto", y: 0 }} 
      exit={{ opacity: 0, height: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      // REMOVED overflow-hidden here and INCREASED z-index to overlap stats cards below
      className="mb-8 relative z-50"
    >
      {/* REMOVED overflow-hidden from this card container */}
      <div className="glass-card bg-white/50 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-6 md:p-8 rounded-[2.5rem] relative">
        
        {/* WRAPPER KHUSUS GLOW BACKGROUND agar tidak bocor meski card utama tidak overflow-hidden */}
        <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] pointer-events-none -z-10">
          <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-[#C5A059]/20 rounded-full blur-[80px] pointer-events-none"></div>
        </div>

        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors bg-white/80 backdrop-blur-md rounded-xl hover:bg-red-50 border border-white shadow-sm active:scale-95 z-20"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] flex items-center justify-center shadow-md shadow-[#C5A059]/20 border border-[#A68345]">
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Kustomisasi Pencarian</h3>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-0.5">Filter Lanjutan & Urutan Data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
          
          {/* Sorting */}
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Urutkan</label>
            <CustomSelect value={sortBy} options={SORT_OPTIONS} onChange={setSortBy} icon={ArrowDownWideNarrow} />
          </div>

          {/* Kategori Area */}
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Area</label>
            <CustomSelect value={filterCategory} options={CATEGORY_OPTIONS} onChange={setFilterCategory} icon={Filter} />
          </div>

          {/* Layanan */}
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Layanan</label>
            <CustomSelect value={filterService} options={SERVICE_OPTIONS} onChange={setFilterService} icon={Filter} />
          </div>

          {/* Tanggal Start (Custom Glass Input Date) */}
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Dari Tanggal</label>
            <div className="relative group z-10">
              <input 
                type="date" 
                value={dateStart} 
                onChange={(e) => setDateStart(e.target.value)} 
                className="w-full pl-11 pr-4 h-[52px] rounded-2xl border border-white bg-white/70 backdrop-blur-md outline-none text-sm font-bold text-slate-700 focus:border-[#C5A059]/50 focus:ring-[3px] focus:ring-[#C5A059]/20 focus:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] appearance-none cursor-pointer" 
              />
              <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#C5A059] transition-colors pointer-events-none" />
            </div>
          </div>

          {/* Tanggal End (Custom Glass Input Date) */}
          <div className="space-y-2 lg:col-span-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hingga Tanggal</label>
            <div className="relative group z-10">
              <input 
                type="date" 
                value={dateEnd} 
                onChange={(e) => setDateEnd(e.target.value)} 
                className="w-full pl-11 pr-4 h-[52px] rounded-2xl border border-white bg-white/70 backdrop-blur-md outline-none text-sm font-bold text-slate-700 focus:border-[#C5A059]/50 focus:ring-[3px] focus:ring-[#C5A059]/20 focus:bg-white transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] appearance-none cursor-pointer" 
              />
              <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#C5A059] transition-colors pointer-events-none" />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-5 border-t border-slate-200/50 flex justify-end relative z-10">
          <Button 
            onClick={resetFilters} 
            variant="ghost" 
            className="h-11 px-6 rounded-xl bg-white/80 border border-slate-200 text-[#C5A059] hover:bg-[#C5A059] hover:text-white hover:border-[#C5A059] transition-all font-bold text-xs shadow-sm active:scale-95"
          >
            Bersihkan Filter
          </Button>
        </div>
        
      </div>
    </motion.div>
  ); 
}