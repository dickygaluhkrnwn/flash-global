import { CheckCircle2, Shield, Users, Minus, Plus, DollarSign, Info } from "lucide-react";
import { cn } from "@/lib/utils";
// MENGGUNAKAN GLOBAL TYPES BUKAN ./types
import { DynamicVehicle } from "@/types/order";

interface Props {
  selectedVehicle: DynamicVehicle | null;
  addInsurance: boolean;
  setAddInsurance: (v: boolean) => void;
  porterCount: number;
  setPorterCount: (v: number) => void;
  tarifPerPorter: number;
  tollFee: number;
  setTollFee: (v: number) => void;
  handleInfoClick: (t: string, text: string) => void;
}

export default function ExtraServices({ 
  selectedVehicle, addInsurance, setAddInsurance, 
  porterCount, setPorterCount, tarifPerPorter, 
  tollFee, setTollFee, handleInfoClick 
}: Props) {
  
  const showInsurance = !selectedVehicle?.isMotor && selectedVehicle?.insurancePercent !== undefined;

  return (
    <div className="w-full space-y-6">
      
      {/* Asuransi & Porter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Asuransi Box */}
        {showInsurance && (
          <div 
            className={cn(
              "relative p-6 rounded-3xl border-2 cursor-pointer transition-all duration-500 flex items-start gap-4 overflow-hidden group", 
              addInsurance ? "border-[#C5A059] bg-[#C5A059]/10 shadow-sm" : "border-white bg-white/50 backdrop-blur-md hover:bg-white hover:border-[#C5A059]/40"
            )}
            onClick={() => setAddInsurance(!addInsurance)}
          >
            <div className="relative z-10 mt-0.5">
              <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300", addInsurance ? "bg-[#C5A059] border-[#C5A059]" : "border-slate-300 bg-white")}>
                {addInsurance && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </div>
            <div className="flex-1 z-10">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={cn("font-black text-base tracking-tight transition-colors", addInsurance ? "text-[#A68345]" : "text-slate-900")}>Proteksi Asuransi</h4>
                <button 
                  type="button" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleInfoClick("Proteksi Asuransi", `Garansi perlindungan barang dengan premi ${selectedVehicle.insurancePercent}% dari total nilai barang yang Anda masukkan.`); 
                  }} 
                  className="text-slate-400 hover:text-[#C5A059] transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Asuransi kerusakan atau kehilangan senilai {selectedVehicle.insurancePercent}% dari total harga barang.</p>
            </div>
            <Shield className={cn("w-24 h-24 absolute -right-6 -bottom-6 transition-all duration-700 pointer-events-none", addInsurance ? "text-[#C5A059] opacity-15 scale-110 rotate-12" : "text-slate-300 opacity-20 group-hover:scale-110")} />
          </div>
        )}

        {/* Porter Box */}
        <div className={cn(
          "relative p-6 rounded-3xl border-2 transition-all duration-500 flex flex-col justify-between gap-5 overflow-hidden group", 
          showInsurance ? "col-span-1" : "md:col-span-2", 
          porterCount > 0 ? "border-[#C5A059] bg-[#C5A059]/10 shadow-sm" : "border-white bg-white/50 backdrop-blur-md hover:bg-white hover:border-[#C5A059]/40"
        )}>
          <div className="flex items-start gap-4 z-10">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-[#C5A059] shrink-0 flex items-center justify-center shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={cn("font-black text-base tracking-tight transition-colors", porterCount > 0 ? "text-[#A68345]" : "text-slate-900")}>Tenaga Porter</h4>
                <button 
                  type="button" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleInfoClick("Tenaga Porter", "Tambahkan kuli angkut ekstra jika lokasi penjemputan/pengiriman sulit dijangkau (misal: apartemen lantai atas, kargo sangat berat)."); 
                  }} 
                  className="text-slate-400 hover:text-[#C5A059] transition-colors"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">+Rp {tarifPerPorter.toLocaleString("id-ID")}/org</p>
            </div>
          </div>
          <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl p-2 w-full z-10 shadow-sm">
            <button type="button" onClick={() => setPorterCount(Math.max(0, porterCount - 1))} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 border border-transparent hover:border-red-100">
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-xl font-black w-10 text-center text-slate-900">{porterCount}</span>
            <button type="button" onClick={() => setPorterCount(porterCount + 1)} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#C5A059] hover:bg-[#C5A059] hover:text-white transition-all active:scale-95 border border-transparent hover:border-[#C5A059]/30">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <Users className={cn("w-28 h-28 absolute -right-6 -bottom-6 transition-all duration-700 pointer-events-none", porterCount > 0 ? "text-[#C5A059] opacity-15 scale-110 rotate-[-10deg]" : "text-slate-300 opacity-20 group-hover:scale-110")} />
        </div>
      </div>

      {/* Deposit Tol */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-3xl border-2 border-white bg-white/60 backdrop-blur-md focus-within:border-[#C5A059] focus-within:ring-[3px] focus-within:ring-[#C5A059]/20 transition-all duration-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] hover:bg-white gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 text-emerald-500 shrink-0 flex items-center justify-center shadow-sm">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-base text-slate-900 tracking-tight">Deposit Tol & Parkir</h4>
              <button 
                type="button" 
                onClick={() => handleInfoClick("Deposit Tol & Parkir", "Tambahkan uang saku ekstra ke kurir untuk meng-cover biaya tol atau parkir. Sifatnya opsional sesuai rute Anda.")} 
                className="text-slate-400 hover:text-emerald-500 transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Biaya tambahan opsional</p>
          </div>
        </div>
        <div className="relative w-full sm:w-56">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">Rp</span>
          <input 
            type="number" 
            value={tollFee || ""} 
            onChange={(e) => setTollFee(Number(e.target.value))} 
            className="w-full pl-14 pr-5 h-14 rounded-2xl font-mono font-black text-lg text-right bg-white border border-slate-200 outline-none focus:border-[#C5A059] transition-colors shadow-sm" 
            placeholder="0" 
          />
        </div>
      </div>

    </div>
  );
}