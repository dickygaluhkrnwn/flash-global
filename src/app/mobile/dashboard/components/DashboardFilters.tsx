"use client";

import { motion } from "framer-motion";
import { SlidersHorizontal, ArrowDownWideNarrow, X, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";

// 👇 INI FIX-NYA BRO: Import fungsi cn yang tadi kelupaan
import { cn } from "@/lib/utils"; 

interface FilterProps {
  sortBy: string; setSortBy: (v: string) => void;
  filterCategory: string; setFilterCategory: (v: string) => void;
  filterService: string; setFilterService: (v: string) => void;
  dateStart: string; setDateStart: (v: string) => void;
  dateEnd: string; setDateEnd: (v: string) => void;
  resetFilters: () => void;
  onClose: () => void;
}

const SORT_OPTIONS = [
  { value: "date_desc", label: "Tgl Terbaru" },
  { value: "date_asc", label: "Tgl Terlama" },
  { value: "price_desc", label: "Harga Tertinggi" },
  { value: "price_asc", label: "Harga Terendah" },
  { value: "weight_desc", label: "Berat Maksimal" }
];

const CATEGORY_OPTIONS = ["Semua", "Domestik", "Internasional"];

export default function DashboardFilters(props: FilterProps) {
  return (
    // NATIVE BOTTOM SHEET BACKDROP
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      {/* Background Dimmer */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={props.onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Bottom Sheet Card */}
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-10 w-full bg-[#f8fafc] rounded-t-[2.5rem] p-6 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)] max-h-[85vh] overflow-y-auto"
      >
        {/* iOS Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] flex items-center justify-center text-white shadow-sm">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Filter</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kustomisasi Pencarian</p>
            </div>
          </div>
          <button onClick={props.onClose} className="p-2 bg-slate-200/50 rounded-full text-slate-500 active:scale-90 tap-highlight-transparent">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 pb-20">
          {/* Karena di Mobile native select lebih nyaman dan tidak menabrak z-index, kita gunakan select bawaan yang di style */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5"><ArrowDownWideNarrow className="w-3 h-3"/> Urutkan Berdasarkan</label>
            <select value={props.sortBy} onChange={(e) => props.setSortBy(e.target.value)} className="w-full h-14 px-4 bg-white border border-slate-200 rounded-[1.25rem] text-sm font-bold outline-none shadow-sm appearance-none">
              {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5"><Filter className="w-3 h-3"/> Area Pengiriman</label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 tap-highlight-transparent">
              {CATEGORY_OPTIONS.map(opt => (
                <button key={opt} onClick={() => props.setFilterCategory(opt)} className={cn("px-4 h-10 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0", props.filterCategory === opt ? "bg-[#7A171D] text-white border-[#5A0E13]" : "bg-white text-slate-600 border-slate-200")}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5"><Calendar className="w-3 h-3"/> Dari</label>
              <input type="date" value={props.dateStart} onChange={(e) => props.setDateStart(e.target.value)} className="w-full h-14 px-4 bg-white border border-slate-200 rounded-[1.25rem] text-xs font-bold outline-none shadow-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1.5"><Calendar className="w-3 h-3"/> Hingga</label>
              <input type="date" value={props.dateEnd} onChange={(e) => props.setDateEnd(e.target.value)} className="w-full h-14 px-4 bg-white border border-slate-200 rounded-[1.25rem] text-xs font-bold outline-none shadow-sm" />
            </div>
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-100 flex gap-3 pb-safe">
          <Button onClick={props.resetFilters} variant="outline" className="h-12 px-4 rounded-xl text-xs">Reset</Button>
          <Button onClick={props.onClose} variant="primary" className="flex-1 h-12 rounded-xl text-xs">Terapkan Filter</Button>
        </div>
      </motion.div>
    </div>
  );
}