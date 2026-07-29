import dynamic from "next/dynamic";
import { MapPin, User, Phone } from "lucide-react";
import { FieldLabel } from "./FieldLabel";
import { cn } from "@/lib/utils";
// IMPORT DARI GLOBAL TYPES
import { OriginData, Coordinates } from "@/types/order";

const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-[56px] w-full bg-white/60 rounded-2xl border border-white animate-pulse flex items-center px-4 text-xs font-bold text-slate-400">Sinkronisasi satelit...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const inputGlass = "bg-white/60 backdrop-blur-md border border-white focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#7A171D]/20 focus-within:border-[#7A171D]/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]";

interface Props {
  originData: OriginData;
  setOriginData: React.Dispatch<React.SetStateAction<OriginData>>;
  setOriginCoords: React.Dispatch<React.SetStateAction<Coordinates | null>>;
  handleOriginChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleInfoClick: (t: string, text: string) => void;
}

export default function OriginForm({ originData, setOriginData, setOriginCoords, handleOriginChange, handleInfoClick }: Props) {
  return (
    <div className="w-full space-y-6">
      
      <div>
        <FieldLabel label="Pencarian Alamat Asal" infoTitle="Lokasi Jemput" infoText="Ketik nama jalan atau gedung, lalu pilih dari saran yang muncul agar sistem dapat mengunci koordinat GPS." onInfoClick={handleInfoClick} />
        <div className={cn("relative group flex items-center rounded-2xl h-[56px] transition-all duration-300 w-full", inputGlass)}>
          <div className="pl-5 flex items-center pointer-events-none">
            <MapPin className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
          </div>
          <div className="flex-1 overflow-hidden">
            <SearchBox
              accessToken={MAPBOX_TOKEN}
              options={{ language: 'id', country: 'ID' }}
              value={originData.address}
              placeholder="Ketik alamat jemput..."
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
              theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '16px 20px', fontFamily: 'inherit', unit: '14px', fontWeight: '700' } }}
            />
          </div>
        </div>
      </div>

      <div>
        <FieldLabel label="Detail Patokan (Opsional)" />
        <div className="relative group">
          <textarea 
            name="detail" 
            value={originData.detail} 
            onChange={handleOriginChange} 
            rows={2} 
            placeholder="Cth: Rumah cat putih pagar hitam, sebelah warung..." 
            className={cn("flex w-full rounded-2xl px-5 py-4 pl-12 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none resize-none transition-all duration-300", inputGlass)}
          ></textarea>
          <MapPin className="w-5 h-5 absolute left-5 top-[18px] text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <FieldLabel label="Nama Pengirim" />
          <div className={cn("relative group flex items-center rounded-2xl h-[56px] transition-all duration-300", inputGlass)}>
            <User className="w-5 h-5 absolute left-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
            <input name="senderName" value={originData.senderName} onChange={handleOriginChange} placeholder="Nama Anda" className="w-full bg-transparent border-none outline-none pl-12 pr-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
          </div>
        </div>
        <div>
          <FieldLabel label="No. Handphone" />
          <div className={cn("relative group flex items-center rounded-2xl h-[56px] transition-all duration-300", inputGlass)}>
            <Phone className="w-5 h-5 absolute left-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
            <input type="tel" name="senderPhone" value={originData.senderPhone} onChange={handleOriginChange} placeholder="08..." className="w-full bg-transparent border-none outline-none pl-12 pr-5 text-sm font-bold text-slate-900 placeholder:text-slate-400" required />
          </div>
        </div>
      </div>

    </div>
  );
} 