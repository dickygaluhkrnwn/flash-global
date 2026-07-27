import dynamic from "next/dynamic";
import { Building, Scale, ArrowRight, MapPinned } from "lucide-react";
// IMPORT DARI GLOBAL TYPES
import { DropDestination, DynamicVehicle, Coordinates, MapViewState, MapDropItem } from "@/types/order";

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100/50 backdrop-blur-md animate-pulse flex flex-col items-center justify-center rounded-[2rem]"><div className="w-10 h-10 border-4 border-slate-300 border-t-[#7A171D] rounded-full animate-spin mb-3"></div><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Menyiapkan Peta</p></div> 
});

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
  routeDistanceKm: number;
  mapViewState: MapViewState;
  originCoords: Coordinates | null; 
  routeData: unknown; 
  activeDraggable: string | null;
  handleMarkerDragEnd: (lng: number, lat: number, type: string) => void;
  formatRupiah: (val: number) => string;
  children?: React.ReactNode; 
}

export default function BookingReceipt({
  selectedVehicle, drops, totalWeight, isOverweight, baseDeliveryCost, finalInsuranceCost, porterCount,
  porterCost, tollFee, isB2BClient, b2bDiscountPercent, b2bDiscountAmount, grandTotal, isLoading,
  isFetchingData, routeDistanceKm, mapViewState, originCoords, routeData, activeDraggable, handleMarkerDragEnd, formatRupiah,
  children
}: Props) {

  // Lakukan mapping agar sesuai persis dengan kebutuhan MapBase (Type-Safe 100%)
  const dropsForMap: MapDropItem[] = drops.map(drop => ({
    id: drop.id,
    lng: drop.lng || 0,
    lat: drop.lat || 0,
    address: drop.address
  }));

  return (
    <>
      {/* PETA RADAR (KOTAK KACA) */}
      <div className="w-full h-[300px] md:h-[400px] glass-card p-2 rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-white z-20 flex flex-col gap-1.5 shadow-sm pointer-events-none">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute"></div>
              <div className="w-2 h-2 bg-emerald-500 rounded-full relative z-10"></div>
            </div>
            <span className="text-slate-900 text-[10px] font-black uppercase tracking-widest">Satelit Radar</span>
          </div>
          <p className="text-slate-500 text-[9px] font-bold uppercase">{routeDistanceKm > 0 ? `Jarak Tempuh: ${routeDistanceKm} KM` : "Menunggu Koordinat"}</p>
        </div>

        <div className="w-full h-full rounded-[2rem] relative overflow-hidden border border-white/50 bg-slate-100">
          <MapBase
            longitude={mapViewState.longitude} 
            latitude={mapViewState.latitude}
            zoom={mapViewState.zoom}
            interactive={true}
            className="w-full h-full"
            originCoords={originCoords}
            drops={dropsForMap} 
            routeData={routeData}
            activeDraggable={activeDraggable}
            onMarkerDragEnd={handleMarkerDragEnd}
          />

          {!originCoords && drops[0].address === "" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-md z-10 pointer-events-none">
              <div className="bg-white/90 p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-white flex flex-col items-center">
                <MapPinned className="w-8 h-8 text-[#7A171D] mb-3 animate-bounce" />
                <p className="text-slate-800 text-sm font-black tracking-wide">Pilih lokasi di form</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RENDER CHILDREN DI SINI (PANEL B2B) */}
      {children}

      {/* RINGKASAN BIAYA (RECEIPT DARK MODE) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-[2.5rem] p-8 shadow-[0_20px_60px_rgba(15,23,42,0.3)] border border-slate-800 relative overflow-hidden mt-6">
        {/* Ambient Glow Emas */}
        <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-15 pointer-events-none"></div>

        {isB2BClient && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3 backdrop-blur-sm">
            <Building className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-100 font-bold leading-relaxed">Potongan Harga Korporat aktif: <span className="text-white">{b2bDiscountPercent}%</span>.</p>
          </div>
        )}

        <h3 className="text-xl font-black mb-6 flex items-center gap-4 tracking-tight">
          Kalkulasi Final <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-700 to-transparent"></div>
        </h3>
        
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-bold">Kendaraan</span>
            <span className="font-bold text-white text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 shadow-inner">{selectedVehicle?.name || "-"}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-bold">Total Rute</span>
            <span className="font-bold text-white text-xs">{drops.length} Lokasi</span>
          </div>

          <div className={`flex justify-between items-center p-4 rounded-2xl border transition-colors duration-300 ${isOverweight ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
            <span className={`text-xs font-bold ${isOverweight ? "text-red-400" : "text-slate-300"}`}><Scale className="w-4 h-4 inline mr-1.5 opacity-70"/> Estimasi Berat</span>
            <span className={`font-black text-sm tracking-tight ${isOverweight ? "text-red-400" : "text-[#C5A059]"}`}>
              {totalWeight.toFixed(1)} <span className="font-bold text-xs opacity-70">/ {selectedVehicle?.maxWeight} Kg</span>
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-4 border-t border-dashed border-slate-700">
            <span className="text-slate-400 text-sm font-bold">Tarif Dasar Jarak</span>
            <span className="font-black text-white text-lg tracking-tight">{formatRupiah(baseDeliveryCost)}</span>
          </div>
          
          {(finalInsuranceCost > 0 || porterCount > 0 || tollFee > 0) && (
            <div className="pt-2 space-y-3">
              {finalInsuranceCost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold">Asuransi Proteksi</span>
                  <span className="font-black text-[#DFBE7B] text-xs tracking-wide">+ {formatRupiah(finalInsuranceCost)}</span>
                </div>
              )}
              {porterCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold">Porter ({porterCount}x)</span>
                  <span className="font-black text-[#DFBE7B] text-xs tracking-wide">+ {formatRupiah(porterCost)}</span>
                </div>
              )}
              {tollFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold">Deposit Tol & Parkir</span>
                  <span className="font-black text-[#DFBE7B] text-xs tracking-wide">+ {formatRupiah(tollFee)}</span>
                </div>
              )}
            </div>
          )}
          
          {isB2BClient && b2bDiscountAmount > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">Diskon B2B ({b2bDiscountPercent}%)</span>
                <span className="font-black text-emerald-400 text-sm tracking-tight">- {formatRupiah(b2bDiscountAmount)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Harga Final Area */}
        <div className="bg-gradient-to-br from-[#C5A059]/20 to-transparent p-6 rounded-3xl border border-[#C5A059]/30 mb-8 relative overflow-hidden shadow-inner">
          <p className="text-[10px] text-[#C5A059] font-black uppercase tracking-widest mb-1.5">Total Tagihan Final</p>
          <p className="text-4xl font-black text-white tracking-tighter">{formatRupiah(grandTotal)}</p>
        </div>

        <button 
          type="submit" 
          form="booking-form"
          disabled={isLoading || isOverweight || isFetchingData || routeDistanceKm === 0}
          className="w-full h-16 bg-gradient-to-b from-[#9A242B] to-[#7A171D] hover:from-[#A82B33] hover:to-[#8B1A21] text-white font-black text-sm rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_20px_rgba(122,23,29,0.3)] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 transition-all border border-[#5A0E13]"
        >
          {isLoading ? (
            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Memproses...</>
          ) : isOverweight ? (
            "Kapasitas Penuh"
          ) : routeDistanceKm === 0 ? (
            "Lengkapi Alamat"
          ) : (
            <>Pesan & Bayar Sekarang <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </>
  );
}