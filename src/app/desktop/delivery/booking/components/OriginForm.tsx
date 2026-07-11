import dynamic from "next/dynamic";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { MapPin, User, Phone } from "lucide-react";
import { FieldLabel } from "./FieldLabel";
import { cn } from "@/lib/utils";

const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-[52px] w-full bg-slate-50 rounded-xl border border-slate-200 animate-pulse flex items-center px-4 text-xs font-semibold text-slate-400">Sinkronisasi satelit...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const inputRed = "focus-visible:border-[#7A171D] focus-visible:ring-[#7A171D]/10";

interface Props {
  originData: any;
  setOriginData: React.Dispatch<React.SetStateAction<any>>;
  setOriginCoords: React.Dispatch<React.SetStateAction<any>>;
  handleOriginChange: (e: any) => void;
  handleInfoClick: (t: string, text: string) => void;
}

export default function OriginForm({ originData, setOriginData, setOriginCoords, handleOriginChange, handleInfoClick }: Props) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="p-6 md:p-8 pb-0 flex flex-row justify-between items-center space-y-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm">2</div>
          <h3 className="text-xl font-bold text-slate-900">Titik Penjemputan</h3>
        </div>
      </CardHeader>
      <CardContent className="p-6 md:p-8 pt-6 space-y-5">
        
        <div>
          <FieldLabel label="Pencarian Alamat Asal" infoTitle="Lokasi Jemput" infoText="Ketik nama jalan atau gedung, lalu pilih dari saran yang muncul agar sistem dapat mengunci koordinat GPS." onInfoClick={handleInfoClick} />
          <div className={cn("border-2 border-transparent rounded-xl transition-all bg-slate-50 overflow-hidden h-12 w-full", inputRed)}>
            <SearchBox
              accessToken={MAPBOX_TOKEN}
              options={{ language: 'id', country: 'ID' }}
              value={originData.address}
              placeholder="Ketik alamat jemput..."
              onRetrieve={(res) => {
                const feature = res.features[0];
                setOriginData((prev: any) => ({ ...prev, address: feature.properties.full_address || feature.properties.name }));
                setOriginCoords({ lng: feature.geometry.coordinates[0], lat: feature.geometry.coordinates[1] });
              }}
              theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '10px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '500' } }}
            />
          </div>
        </div>

        <div>
          <FieldLabel label="Detail Patokan (Opsional)" />
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-4 top-[14px] text-slate-400" />
            <textarea name="detail" value={originData.detail} onChange={handleOriginChange} rows={2} placeholder="Cth: Rumah cat putih pagar hitam, sebelah warung..." className={cn("flex w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:bg-white transition-all resize-none shadow-sm", inputRed)}></textarea>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel label="Nama Pengirim" />
            <div className="relative">
              <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input name="senderName" value={originData.senderName} onChange={handleOriginChange} placeholder="Nama Anda" className={cn("pl-11", inputRed)} required />
            </div>
          </div>
          <div>
            <FieldLabel label="No. Handphone" />
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input type="tel" name="senderPhone" value={originData.senderPhone} onChange={handleOriginChange} placeholder="08..." className={cn("pl-11", inputRed)} required />
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}