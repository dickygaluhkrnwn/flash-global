import { CheckCircle2, Shield, Users, Minus, Plus, DollarSign, Info } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className="w-full space-y-4">
      
      {/* Asuransi Box */}
      {showInsurance && (
        <div 
          className={cn(
            "relative p-5 rounded-3xl border transition-all duration-300 flex items-start gap-3 overflow-hidden group cursor-pointer tap-highlight-transparent active:scale-95", 
            addInsurance ? "border-[#C5A059] bg-[#C5A059]/10 shadow-sm" : "border-slate-200 bg-white/60 hover:bg-white"
          )}
          onClick={() => setAddInsurance(!addInsurance)}
        >
          <div className="relative z-10 mt-1">
            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors", addInsurance ? "bg-[#C5A059] border-[#C5A059]" : "border-slate-300 bg-white")}>
              {addInsurance && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
          </div>
          <div className="flex-1 z-10">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={cn("font-black text-sm tracking-tight", addInsurance ? "text-[#A68345]" : "text-slate-900")}>Proteksi Asuransi</h4>
              <button type="button" onClick={(e) => { e.stopPropagation(); handleInfoClick("Asuransi", `Premi ${selectedVehicle.insurancePercent}% dari nilai barang.`); }} className="text-slate-400 hover:text-[#C5A059] p-1"><Info className="w-3.5 h-3.5" /></button>
            </div>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">Lindungi kargo Anda senilai {selectedVehicle.insurancePercent}% dari total harga barang.</p>
          </div>
          <Shield className={cn("w-20 h-20 absolute -right-4 -bottom-4 transition-all duration-500 pointer-events-none", addInsurance ? "text-[#C5A059] opacity-20 scale-110 rotate-12" : "text-slate-300 opacity-10")} />
        </div>
      )}

      {/* Porter Box */}
      <div className={cn(
        "relative p-5 rounded-3xl border transition-all duration-300 flex flex-col gap-4 overflow-hidden group", 
        porterCount > 0 ? "border-[#C5A059] bg-[#C5A059]/10 shadow-sm" : "border-slate-200 bg-white/60 hover:bg-white"
      )}>
        <div className="flex items-start gap-4 z-10">
          <div className="w-10 h-10 rounded-[1.25rem] bg-white border border-slate-100 text-[#C5A059] shrink-0 flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className={cn("font-black text-sm tracking-tight", porterCount > 0 ? "text-[#A68345]" : "text-slate-900")}>Tenaga Porter</h4>
              <button type="button" onClick={(e) => { e.stopPropagation(); handleInfoClick("Porter", "Tambahkan kuli angkut jika lokasi sulit dijangkau."); }} className="text-slate-400 p-1"><Info className="w-3.5 h-3.5" /></button>
            </div>
            <p className="text-[10px] font-black text-[#A68345] uppercase tracking-widest">+Rp {(tarifPerPorter/1000)}k/org</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-[1.25rem] p-1.5 w-full z-10 shadow-sm">
          <button type="button" onClick={() => setPorterCount(Math.max(0, porterCount - 1))} className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 active:bg-slate-200 active:scale-90 transition-all tap-highlight-transparent">
            <Minus className="w-5 h-5" />
          </button>
          <span className="text-xl font-black text-slate-900 w-12 text-center">{porterCount}</span>
          <button type="button" onClick={() => setPorterCount(porterCount + 1)} className="w-12 h-12 rounded-xl bg-[#C5A059] flex items-center justify-center text-white active:bg-[#A68345] active:scale-90 transition-all tap-highlight-transparent shadow-md">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <Users className={cn("w-24 h-24 absolute -right-6 -bottom-6 transition-all duration-500 pointer-events-none", porterCount > 0 ? "text-[#C5A059] opacity-20 scale-110 rotate-[-10deg]" : "text-slate-300 opacity-10")} />
      </div>

      {/* Deposit Tol */}
      <div className="flex flex-col p-5 rounded-3xl border border-slate-200 bg-white/60 focus-within:border-[#C5A059] focus-within:ring-2 focus-within:ring-[#C5A059]/20 transition-all shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[1.25rem] bg-white border border-slate-100 text-emerald-500 shrink-0 flex items-center justify-center shadow-sm">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-black text-sm text-slate-900 tracking-tight">Deposit Tol/Parkir</h4>
              <button type="button" onClick={() => handleInfoClick("Tol & Parkir", "Uang saku opsional untuk kurir.")} className="text-slate-400 p-1"><Info className="w-3.5 h-3.5" /></button>
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Opsional</p>
          </div>
        </div>
        <div className="relative w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">Rp</span>
          <input 
            type="number" 
            value={tollFee || ""} 
            onChange={(e) => setTollFee(Number(e.target.value))} 
            className="w-full pl-12 pr-4 h-14 rounded-2xl font-mono font-black text-lg text-right bg-white border border-slate-200 outline-none focus:border-[#C5A059] transition-colors shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]" 
            placeholder="0" 
          />
        </div>
      </div>

    </div>
  );
}