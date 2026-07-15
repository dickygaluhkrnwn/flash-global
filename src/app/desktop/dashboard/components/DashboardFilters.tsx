import { motion } from "framer-motion";
import { SlidersHorizontal, ArrowDownWideNarrow, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

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

export default function DashboardFilters({
  sortBy, setSortBy, filterCategory, setFilterCategory,
  filterService, setFilterService, dateStart, setDateStart,
  dateEnd, setDateEnd, resetFilters, onClose
}: FilterProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, height: 0, y: -10 }} 
      animate={{ opacity: 1, height: "auto", y: 0 }} 
      exit={{ opacity: 0, height: 0, y: -10 }}
      className="mb-8 overflow-hidden"
    >
      <div className="bg-white border border-slate-200 shadow-sm p-6 md:p-8 rounded-[2rem] relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-red-500 transition-colors p-1.5 bg-slate-50 rounded-full hover:bg-red-50 border border-slate-200">
          <X className="w-4 h-4" />
        </button>
        
        <h3 className="text-base font-black text-slate-900 mb-6 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[#C5A059]" /> Filter & Urutkan Lanjutan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
          {/* Sorting */}
          <div className="space-y-2 md:col-span-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Urutkan Berdasarkan</label>
            <div className="relative">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-semibold text-slate-700 appearance-none focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 transition-all">
                <option value="date_desc">Tanggal Terbaru</option>
                <option value="date_asc">Tanggal Terlama</option>
                <option value="price_desc">Tagihan Tertinggi</option>
                <option value="price_asc">Tagihan Terendah</option>
                <option value="weight_desc">Berat Paling Maksimal</option>
              </select>
              <ArrowDownWideNarrow className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Kategori */}
          <div className="space-y-2 md:col-span-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kategori Area</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-semibold text-slate-700 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 transition-all">
              <option value="Semua">Semua Area</option>
              <option value="Domestik">Domestik</option>
              <option value="Internasional">Internasional</option>
            </select>
          </div>

          {/* Layanan */}
          <div className="space-y-2 md:col-span-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Jenis Layanan</label>
            <select value={filterService} onChange={(e) => setFilterService(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-semibold text-slate-700 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 transition-all">
              <option value="Semua">Semua Layanan</option>
              <option value="Instan">Instan</option>
              <option value="Sameday">Sameday</option>
              <option value="Reguler">Reguler / Kargo</option>
            </select>
          </div>

          {/* Tanggal Start */}
          <div className="space-y-2 md:col-span-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dari Tanggal</label>
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-semibold text-slate-700 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 transition-all" />
          </div>

          {/* Tanggal End */}
          <div className="space-y-2 md:col-span-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hingga Tanggal</label>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none text-sm font-semibold text-slate-700 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 transition-all" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={resetFilters} variant="ghost" size="sm" className="text-[#7A171D] hover:bg-[#7A171D]/10 hover:text-[#5A0E13]">
            Reset Semua Filter
          </Button>
        </div>
      </div>
    </motion.div>
  );
}