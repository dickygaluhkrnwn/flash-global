import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { CheckCircle, Shield, Users, Minus, Plus, DollarSign, Info } from "lucide-react";
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
  selectedVehicle, 
  addInsurance, 
  setAddInsurance, 
  porterCount, 
  setPorterCount, 
  tarifPerPorter, 
  tollFee, 
  setTollFee, 
  handleInfoClick 
}: Props) {
  
  const showInsurance = !selectedVehicle?.isMotor && selectedVehicle?.insurancePercent !== undefined;

  return (
    <Card className="shadow-sm border-slate-200 relative overflow-hidden">
      <CardHeader className="p-6 md:p-8 pb-0 flex flex-row justify-between items-center space-y-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm">4</div>
          <h3 className="text-xl font-bold text-slate-900">Layanan Ekstra</h3>
        </div>
        <button type="button" onClick={() => handleInfoClick("Layanan Ekstra", "Centang opsi asuransi untuk menggaransi paket. Tambahkan porter jika butuh kuli angkut.")} className="text-slate-400 hover:text-[#7A171D] transition-colors">
          <Info className="w-5 h-5" />
        </button>
      </CardHeader>

      <CardContent className="p-6 md:p-8 pt-6 space-y-5">
        
        {/* Grid dinamis: Akan melebar penuh jika Asuransi di-hide (misal pada motor) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Asuransi Box */}
          {showInsurance && (
            <div 
              className={cn("col-span-1 relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-start gap-4", addInsurance ? "border-[#C5A059] bg-[#C5A059]/5 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-slate-300")}
              onClick={() => setAddInsurance(!addInsurance)}
            >
              <div className="pt-0.5 z-10">
                <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors", addInsurance ? "bg-[#C5A059] border-[#C5A059]" : "border-slate-300 bg-white")}>
                  {addInsurance && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
              </div>
              <div className="flex-1 z-10">
                <h4 className={cn("font-bold text-sm", addInsurance ? "text-[#A68345]" : "text-slate-900")}>Proteksi Asuransi</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">Lindungi barang ({selectedVehicle.insurancePercent}%)</p>
              </div>
              <Shield className={cn("w-16 h-16 absolute right-4 top-1/2 -translate-y-1/2 transition-all pointer-events-none", addInsurance ? "text-[#C5A059] opacity-10 scale-110" : "text-slate-300 opacity-20")} />
            </div>
          )}

          {/* Porter Box (Melebar jadi 2 kolom jika asuransi tidak ada) */}
          <div className={cn("relative p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between gap-4", showInsurance ? "col-span-1" : "md:col-span-2", porterCount > 0 ? "border-[#C5A059] bg-[#C5A059]/5 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-slate-300")}>
            <div className="flex items-start gap-4 z-10">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className={cn("font-bold text-sm", porterCount > 0 ? "text-[#A68345]" : "text-slate-900")}>Tenaga Porter</h4>
                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">+Rp {tarifPerPorter.toLocaleString("id-ID")}/org</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-1.5 w-fit z-10 shadow-sm">
              <button type="button" onClick={() => setPorterCount(Math.max(0, porterCount - 1))} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors">
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-black w-6 text-center text-slate-900">{porterCount}</span>
              <button type="button" onClick={() => setPorterCount(porterCount + 1)} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-[#C5A059] hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <Users className={cn("w-14 h-14 absolute right-4 top-1/2 -translate-y-1/2 transition-all pointer-events-none", porterCount > 0 ? "text-[#C5A059] opacity-10 scale-110" : "text-slate-300 opacity-20")} />
          </div>
        </div>

        {/* Deposit Tol */}
        <div className="flex items-center justify-between p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 focus-within:border-[#C5A059] focus-within:ring-4 focus-within:ring-[#C5A059]/10 transition-all shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Deposit Tol & Parkir</h4>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Biaya tambahan opsional</p>
            </div>
          </div>
          <div className="relative w-32 md:w-40">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">Rp</span>
            <Input type="number" value={tollFee || ""} onChange={(e) => setTollFee(Number(e.target.value))} className="pl-10 font-mono font-bold text-right bg-white border-slate-200 focus-visible:border-[#C5A059]" />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}