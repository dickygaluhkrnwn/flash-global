import dynamic from "next/dynamic";
import { Building, Scale, ArrowRight, MapPinned } from "lucide-react";
import { DropDestination, DynamicVehicle } from "./types";

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex flex-col items-center justify-center rounded-[1.5rem]"><div className="w-8 h-8 border-4 border-slate-300 border-t-[#7A171D] rounded-full animate-spin mb-3"></div><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Menyiapkan Peta</p></div> 
});

interface Coordinate {
  lng: number;
  lat: number;
}

interface MapViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

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
  originCoords: Coordinate | null;
  routeData: unknown; // Lebih aman dari any, routeData dari Mapbox
  activeDraggable: string | null;
  handleMarkerDragEnd: (lng: number, lat: number, type: string) => void;
  formatRupiah: (val: number) => string;
}

export default function BookingReceipt({
  selectedVehicle, drops, totalWeight, isOverweight, baseDeliveryCost, finalInsuranceCost, porterCount,
  porterCost, tollFee, isB2BClient, b2bDiscountPercent, b2bDiscountAmount, grandTotal, isLoading,
  isFetchingData, routeDistanceKm, mapViewState, originCoords, routeData, activeDraggable, handleMarkerDragEnd, formatRupiah
}: Props) {

  return (
    <>
      {/* PETA RADAR */}
      <div className="w-full h-[300px] md:h-[400px] bg-slate-100 rounded-[2rem] p-2 shadow-xl shadow-slate-200/50 border border-slate-200 relative overflow-hidden group">
        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200 z-20 flex flex-col gap-1 shadow-sm pointer-events-none">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <span className="text-slate-900 text-[10px] font-black uppercase tracking-widest">Radar Aktif</span>
          </div>
          <p className="text-slate-500 text-[9px] font-bold uppercase">{routeDistanceKm > 0 ? `Jarak Tempuh: ${routeDistanceKm} KM` : "Menunggu Koordinat"}</p>
        </div>

        <div className="w-full h-full rounded-[1.5rem] relative overflow-hidden border border-slate-200/50">
          <MapBase
            longitude={mapViewState.longitude} 
            latitude={mapViewState.latitude}
            zoom={mapViewState.zoom}
            interactive={true}
            className="w-full h-full"
            originCoords={originCoords}
            // Type Casting yang aman untuk mengatasi konflik Index Signature antara DropDestination dan MapBase
            drops={drops as unknown as Array<{ id: string; lng?: number; lat?: number; [key: string]: unknown }>}
            routeData={routeData}
            activeDraggable={activeDraggable}
            onMarkerDragEnd={handleMarkerDragEnd}
          />

          {!originCoords && drops[0].address === "" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm z-10 pointer-events-none">
              <MapPinned className="w-8 h-8 text-[#7A171D] mb-3 animate-bounce" />
              <p className="text-slate-800 text-xs font-bold bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">Pilih lokasi di form</p>
            </div>
          )}
        </div>
      </div>

      {/* RINGKASAN BIAYA (RECEIPT) */}
      <div className="bg-slate-900 text-white rounded-[2rem] p-7 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>

        {isB2BClient && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-start gap-3">
            <Building className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-emerald-100 font-medium leading-relaxed">Potongan Harga Korporat aktif: {b2bDiscountPercent}%.</p>
          </div>
        )}

        <h3 className="text-lg font-black mb-6 flex items-center gap-3">
          Kalkulasi Final <div className="h-[2px] flex-1 bg-slate-800 rounded-full"></div>
        </h3>
        
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-medium">Kendaraan</span>
            <span className="font-bold text-white text-xs bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">{selectedVehicle?.name || "-"}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-medium">Total Rute</span>
            <span className="font-bold text-white text-xs">{drops.length} Lokasi</span>
          </div>

          <div className={`flex justify-between items-center p-3.5 rounded-xl border transition-colors ${isOverweight ? 'bg-red-950/30 border-red-500/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
            <span className={`text-xs font-bold ${isOverweight ? "text-red-400" : "text-slate-300"}`}><Scale className="w-3.5 h-3.5 inline mr-1.5 opacity-70"/> Estimasi Berat</span>
            <span className={`font-black text-xs ${isOverweight ? "text-red-400" : "text-[#C5A059]"}`}>
              {totalWeight.toFixed(1)} <span className="font-medium opacity-70">/ {selectedVehicle?.maxWeight} Kg</span>
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-700">
            <span className="text-slate-400 text-sm font-medium">Tarif Dasar Jarak</span>
            <span className="font-black text-white">{formatRupiah(baseDeliveryCost)}</span>
          </div>
          
          {(finalInsuranceCost > 0 || porterCount > 0 || tollFee > 0) && (
            <div className="pt-3 space-y-2.5">
              {finalInsuranceCost > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Asuransi Proteksi</span>
                  <span className="font-bold text-[#DFBE7B] text-[11px]">+ {formatRupiah(finalInsuranceCost)}</span>
                </div>
              )}
              {porterCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Porter ({porterCount}x)</span>
                  <span className="font-bold text-[#DFBE7B] text-[11px]">+ {formatRupiah(porterCost)}</span>
                </div>
              )}
              {tollFee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Deposit Tol & Parkir</span>
                  <span className="font-bold text-[#DFBE7B] text-[11px]">+ {formatRupiah(tollFee)}</span>
                </div>
              )}
            </div>
          )}
          
          {isB2BClient && b2bDiscountAmount > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <div className="flex justify-between items-center">
                <span className="text-emerald-400 text-[11px] font-bold">Diskon B2B ({b2bDiscountPercent}%)</span>
                <span className="font-black text-emerald-400 text-xs">- {formatRupiah(b2bDiscountAmount)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-[#C5A059]/20 to-transparent p-5 rounded-2xl border border-[#C5A059]/30 mb-6 relative overflow-hidden">
          <p className="text-[10px] text-[#C5A059] font-black uppercase tracking-widest mb-1">Total Tagihan Final</p>
          <p className="text-3xl font-black text-white tracking-tight">{formatRupiah(grandTotal)}</p>
        </div>

        <button 
          type="submit" 
          form="booking-form"
          disabled={isLoading || isOverweight || isFetchingData || routeDistanceKm === 0}
          className="w-full h-14 bg-[#7A171D] hover:bg-[#5A0E13] text-white font-black text-sm rounded-xl shadow-lg shadow-[#7A171D]/20 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
        >
          {isLoading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Memproses...</>
          ) : isOverweight ? (
            "Kapasitas Penuh"
          ) : routeDistanceKm === 0 ? (
            "Lengkapi Alamat"
          ) : (
            <>Lanjut Pembayaran <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </>
  );
}