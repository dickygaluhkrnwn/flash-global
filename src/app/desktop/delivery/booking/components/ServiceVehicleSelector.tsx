import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Truck, Car, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DynamicVehicle } from "./types";
import { FieldLabel } from "./FieldLabel";

interface Props {
  selectedService: "Instan" | "Sameday";
  setSelectedService: (v: "Instan" | "Sameday") => void;
  vehicles: DynamicVehicle[];
  selectedVehicle: DynamicVehicle | null;
  setSelectedVehicle: (v: DynamicVehicle) => void;
  isFetchingData: boolean;
  totalWeight: number;
  handleInfoClick: (t: string, text: string) => void;
}

export default function ServiceVehicleSelector({ selectedService, setSelectedService, vehicles, selectedVehicle, setSelectedVehicle, isFetchingData, totalWeight, handleInfoClick }: Props) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="p-6 md:p-8 pb-0 flex flex-row justify-between items-center space-y-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm">1</div>
          <h3 className="text-xl font-bold text-slate-900">Layanan & Armada</h3>
        </div>
      </CardHeader>
      <CardContent className="p-6 md:p-8 pt-6">
        
        {/* Pilihan Layanan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div 
            className={cn("relative p-4 rounded-xl border-2 cursor-pointer transition-all", selectedService === "Instan" ? "border-[#7A171D] bg-[#7A171D]/5" : "border-slate-200 bg-white hover:border-slate-300")}
            onClick={() => setSelectedService("Instan")}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn("font-bold text-sm", selectedService === "Instan" ? "text-[#7A171D]" : "text-slate-700")}>Pengiriman Instan</span>
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", selectedService === "Instan" ? "border-[#7A171D]" : "border-slate-300")}>
                {selectedService === "Instan" && <div className="w-2.5 h-2.5 bg-[#7A171D] rounded-full"></div>}
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Pencarian kurir tercepat, langsung dikirim ke tujuan tanpa mampir.</p>
          </div>

          <div 
            className={cn("relative p-4 rounded-xl border-2 cursor-pointer transition-all", selectedService === "Sameday" ? "border-[#C5A059] bg-[#C5A059]/5" : "border-slate-200 bg-white hover:border-slate-300")}
            onClick={() => setSelectedService("Sameday")}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={cn("font-bold text-sm", selectedService === "Sameday" ? "text-[#C5A059]" : "text-slate-700")}>Sameday Delivery</span>
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", selectedService === "Sameday" ? "border-[#C5A059]" : "border-slate-300")}>
                {selectedService === "Sameday" && <div className="w-2.5 h-2.5 bg-[#C5A059] rounded-full"></div>}
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Lebih hemat. Kurir akan mengambil dan mengirim beberapa paket searah.</p>
          </div>
        </div>

        {/* Pilihan Armada Berbasis Berat Otomatis */}
        <FieldLabel label="Pilih Tipe Kendaraan" infoTitle="Auto-Select Kendaraan" infoText="Sistem secara cerdas memblokir kendaraan yang kapasitasnya tidak mencukupi berat total barang Anda dari seluruh titik rute." onInfoClick={handleInfoClick}/>
        {isFetchingData ? (
          <div className="h-24 w-full bg-slate-100 rounded-xl border border-slate-200 animate-pulse flex items-center justify-center text-sm font-semibold text-slate-400">Sinkronisasi Armada...</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {vehicles.map((v) => {
              const isOverCapacity = totalWeight > v.maxWeight;
              return (
                <div 
                  key={v.id}
                  className={cn(
                    "relative p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center justify-center gap-2", 
                    isOverCapacity ? "opacity-40 cursor-not-allowed border-slate-200 bg-slate-100 grayscale" : "cursor-pointer",
                    selectedVehicle?.id === v.id ? "border-[#7A171D] bg-[#7A171D]/5" : (!isOverCapacity && "border-slate-200 bg-white hover:border-slate-300")
                  )}
                  onClick={() => { if (!isOverCapacity) setSelectedVehicle(v); }}
                >
                  {v.isMotor ? <Truck className={cn("w-6 h-6", selectedVehicle?.id === v.id ? "text-[#7A171D]" : "text-slate-400")} /> : <Car className={cn("w-6 h-6", selectedVehicle?.id === v.id ? "text-[#7A171D]" : "text-slate-400")} />}
                  <div>
                    <p className={cn("text-xs font-bold", selectedVehicle?.id === v.id ? "text-[#7A171D]" : "text-slate-700")}>{v.name}</p>
                    <p className={cn("text-[10px] font-semibold mt-0.5", isOverCapacity ? "text-red-500" : "text-slate-500")}>Maks {v.maxWeight}Kg</p>
                  </div>
                  {isOverCapacity && (
                    <div className="absolute top-2 right-2" title="Berat melebihi kapasitas"><AlertCircle className="w-4 h-4 text-red-500" /></div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </CardContent>
    </Card>
  );
}