"use client";

import dynamic from "next/dynamic";
import { MapPin, User, Phone } from "lucide-react";
import { FieldLabel } from "./FieldLabel";
import { cn } from "@/lib/utils";
import { OriginData, Coordinates } from "@/types/order";

const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-14 w-full bg-slate-100 rounded-[1.25rem] animate-pulse flex items-center px-4 text-xs font-bold text-slate-400">Menyinkronkan satelit...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
// Const input untuk memastikan konsistensi border dan fokus ala iOS
const inputGlass = "bg-white/60 backdrop-blur-md border border-white focus-within:bg-white focus-within:ring-2 focus-within:ring-[#7A171D]/20 focus-within:border-[#7A171D]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";

interface Props {
  originData: OriginData;
  setOriginData: React.Dispatch<React.SetStateAction<OriginData>>;
  setOriginCoords: React.Dispatch<React.SetStateAction<Coordinates | null>>;
  handleOriginChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleInfoClick: (t: string, text: string) => void;
}

export default function OriginForm({ originData, setOriginData, setOriginCoords, handleOriginChange, handleInfoClick }: Props) {
  return (
    <div className="w-full space-y-5">
      
      {/* Search Alamat (Z-Index diatur agar dropdown Mapbox melayang bebas) */}
      <div className="relative z-50">
        <FieldLabel label="Pencarian Alamat Penjemputan" infoTitle="Lokasi Jemput" infoText="Ketik jalan atau gedung. Pilih dari saran yang muncul agar sistem mengunci titik koordinat GPS kurir." onInfoClick={handleInfoClick} />
        <div className={cn("relative group flex items-center rounded-[1.25rem] h-14 transition-all duration-300 w-full", inputGlass)}>
          <div className="pl-4 flex items-center pointer-events-none">
            <MapPin className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
          </div>
          {/* HILANGKAN overflow-hidden DI SINI AGAR DROPDOWN TIDAK TERPOTONG */}
          <div className="flex-1 relative">
            <SearchBox
              accessToken={MAPBOX_TOKEN}
              options={{ language: 'id', country: 'ID' }}
              value={originData.address}
              placeholder="Ketik lokasi jemput..."
              onRetrieve={(res) => {
                const feature = res.features[0];
                setOriginData((prev: OriginData) => ({ 
                  ...prev, 
                  address: feature.properties.full_address || feature.properties.name 
                }));
                setOriginCoords({ 
                  lng: feature.geometry.coordinates[0], 
                  lat: feature.geometry.coordinates[1] 
                });
              }}
              theme={{ variables: { boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: 'none', colorBackground: '#ffffff', padding: '14px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '700' } }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-40">
        <FieldLabel label="Detail Patokan (Opsional)" />
        <div className="relative group">
          <textarea 
            name="detail" 
            value={originData.detail} 
            onChange={handleOriginChange} 
            rows={2} 
            placeholder="Cth: Pagar hitam, sebelah warung..." 
            className={cn("flex w-full rounded-[1.25rem] px-4 py-3.5 pl-11 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none resize-none transition-all duration-300", inputGlass)}
          ></textarea>
          <MapPin className="w-5 h-5 absolute left-4 top-[14px] text-slate-400 group-focus-within:text-[#7A171D] transition-colors pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 relative z-30">
        <div>
          <FieldLabel label="Nama Pengirim" />
          <div className={cn("relative group flex items-center rounded-[1.25rem] h-14 transition-all duration-300", inputGlass)}>
            <User className="w-5 h-5 absolute left-4 text-slate-400 group-focus-within:text-[#7A171D] transition-colors pointer-events-none" />
            <input name="senderName" value={originData.senderName} onChange={handleOriginChange} placeholder="Nama Lengkap" className="w-full h-full bg-transparent border-none outline-none pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
          </div>
        </div>
        <div>
          <FieldLabel label="No. Handphone" />
          <div className={cn("relative group flex items-center rounded-[1.25rem] h-14 transition-all duration-300", inputGlass)}>
            <Phone className="w-5 h-5 absolute left-4 text-slate-400 group-focus-within:text-[#7A171D] transition-colors pointer-events-none" />
            <input type="tel" name="senderPhone" value={originData.senderPhone} onChange={handleOriginChange} placeholder="08..." className="w-full h-full bg-transparent border-none outline-none pl-11 pr-4 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
          </div>
        </div>
      </div>

    </div>
  );
}