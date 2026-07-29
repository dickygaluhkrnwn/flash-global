import { Building, Scale } from "lucide-react";
import { DropDestination, DynamicVehicle } from "@/types/order";
import { cn } from "@/lib/utils";

interface Props {
  selectedVehicle: DynamicVehicle | null;
  drops: DropDestination[];
  totalWeight: number;
  isOverweight: boolean;
  baseDeliveryCost: number;
  finalInsuranceCost: number;
  porterCount: number;
  porterCost: number;
  tollFee: number;
  isB2BClient: boolean;
  b2bDiscountPercent: number;
  b2bDiscountAmount: number;
  grandTotal: number;
  isLoading: boolean;
  isFetchingData: boolean;
  formatRupiah: (val: number) => string;
  children?: React.ReactNode; 
}

export default function BookingReceipt({
  selectedVehicle, drops, totalWeight, isOverweight, baseDeliveryCost, finalInsuranceCost, porterCount,
  porterCost, tollFee, isB2BClient, b2bDiscountPercent, b2bDiscountAmount, grandTotal, 
  formatRupiah, children
}: Props) {

  return (
    <div className="space-y-6 w-full">
      
      {/* 1. RENDER CHILDREN DI SINI (WARNING PANEL B2B DARI PAGE.TSX JIKA ADA) */}
      {children}

      {/* 2. RINGKASAN BIAYA (RECEIPT DARK BENTO) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-[2.5rem] p-6 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Ambient Glow Emas di dalam kartu */}
        <div className="absolute top-[-30%] right-[-20%] w-64 h-64 bg-[#C5A059] rounded-full blur-[80px] opacity-15 pointer-events-none z-0"></div>

        {isB2BClient && (
          <div className="mb-5 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-2xl flex items-start gap-3 backdrop-blur-sm relative z-10">
            <Building className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-emerald-100 font-bold leading-relaxed">Potongan Harga Korporat aktif: <span className="text-white font-black">{b2bDiscountPercent}%</span>.</p>
          </div>
        )}

        <div className="relative z-10">
          <h3 className="text-sm font-black mb-5 flex items-center gap-3 tracking-tight text-slate-100">
            Detail Biaya <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-700 to-transparent"></div>
          </h3>
          
          <div className="space-y-3.5 mb-6 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">Armada</span>
              <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 shadow-inner text-[10px] uppercase tracking-wider">{selectedVehicle?.name || "-"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">Total Titik Tujuan</span>
              <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 shadow-inner text-[10px] uppercase tracking-wider">{drops.length} Lokasi</span>
            </div>

            <div className={cn("flex justify-between items-center p-3 rounded-xl border transition-colors duration-300", isOverweight ? "bg-red-500/10 border-red-500/30" : "bg-slate-800/50 border-slate-700")}>
              <span className={cn("font-bold flex items-center gap-1.5", isOverweight ? "text-red-400" : "text-slate-300")}>
                <Scale className="w-3.5 h-3.5 opacity-70"/> Estimasi Berat
              </span>
              <span className={cn("font-black tracking-tight", isOverweight ? "text-red-400" : "text-[#C5A059]")}>
                {totalWeight.toFixed(1)} <span className="font-bold text-[10px] opacity-70">/ {selectedVehicle?.maxWeight} Kg</span>
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-700">
              <span className="text-slate-400 font-bold">Tarif Dasar Jarak</span>
              <span className="font-black text-white text-sm tracking-tight">{formatRupiah(baseDeliveryCost)}</span>
            </div>
            
            {(finalInsuranceCost > 0 || porterCount > 0 || tollFee > 0) && (
              <div className="pt-1.5 space-y-2.5">
                {finalInsuranceCost > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Asuransi Proteksi</span>
                    <span className="font-bold text-emerald-400">+ {formatRupiah(finalInsuranceCost)}</span>
                  </div>
                )}
                {porterCount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Porter ({porterCount}x)</span>
                    <span className="font-bold text-amber-400">+ {formatRupiah(porterCost)}</span>
                  </div>
                )}
                {tollFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold">Deposit Tol/Parkir</span>
                    <span className="font-bold text-amber-400">+ {formatRupiah(tollFee)}</span>
                  </div>
                )}
              </div>
            )}
            
            {isB2BClient && b2bDiscountAmount > 0 && (
              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Diskon B2B ({b2bDiscountPercent}%)</span>
                  <span className="font-black text-emerald-400 text-sm tracking-tight">- {formatRupiah(b2bDiscountAmount)}</span>
                </div>
              </div>
            )}
          </div>

          {/* HARGA FINAL */}
          <div className="bg-gradient-to-br from-[#C5A059]/20 to-transparent p-5 rounded-2xl border border-[#C5A059]/30 relative overflow-hidden shadow-inner">
            <p className="text-[9px] text-[#C5A059] font-black uppercase tracking-widest mb-1">Total Tagihan Final</p>
            <p className="text-3xl font-black text-white tracking-tighter">{formatRupiah(grandTotal)}</p>
          </div>
        </div>
      </div>
      
    </div>
  );
}