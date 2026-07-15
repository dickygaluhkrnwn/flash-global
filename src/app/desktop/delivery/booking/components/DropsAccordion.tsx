import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FieldLabel } from "./FieldLabel";
// IMPORT DARI GLOBAL TYPES (Menghapus import lokal "./types")
import { DropDestination, DynamicVehicle, DeliveryItem } from "@/types/order";
import { cn } from "@/lib/utils";
import { User, Phone, MapPin, PackageOpen, Plus, Trash2, MapPinned, ChevronDown, Download, Upload, Info } from "lucide-react";

const SearchBox = dynamic(() => import("@mapbox/search-js-react").then((mod) => mod.SearchBox), { 
  ssr: false, 
  loading: () => <div className="h-[52px] w-full bg-slate-50 rounded-xl border border-slate-200 animate-pulse flex items-center px-4 text-xs font-semibold text-slate-400">Sinkronisasi satelit...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const inputGold = "focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/10";

// Tipe spesifik untuk pengaturan motor
interface MotorSettings {
  weightSmall?: number;
  weightMedium?: number;
  [key: string]: unknown;
}

interface Props {
  drops: DropDestination[];
  setDrops: React.Dispatch<React.SetStateAction<DropDestination[]>>;
  selectedService: string;
  selectedVehicle: DynamicVehicle | null;
  motorSettings: MotorSettings | null; 
  activeDropId: string | null;
  setActiveDropId: (id: string | null) => void;
  activeDraggable: string | null;
  setActiveDraggable: (id: string | null) => void;
  handleInfoClick: (t: string, text: string) => void;
  setErrorMsg: (msg: string) => void;
}

export default function DropsAccordion({
  drops, setDrops, selectedService, selectedVehicle, motorSettings,
  activeDropId, setActiveDropId, activeDraggable, setActiveDraggable, handleInfoClick, setErrorMsg
}: Props) {

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addDrop = () => {
    if (drops.length >= 24) {
      setErrorMsg("Maksimal titik tujuan adalah 24 lokasi dalam sekali pengiriman.");
      return;
    }
    const newId = `DROP-${Math.floor(1000 + Math.random() * 9000)}`;
    setDrops(prev => [...prev, { id: newId, address: "", detail: "", receiverName: "", receiverPhone: "", receiverEmail: "", items: [{ id: `ITM-1`, name: "", weightType: "Kecil", dimType: "S", weightVal: 0, length: 0, width: 0, height: 0, value: 0 }] }]);
    setExpandedDrop(newId);
  };

  const removeDrop = (index: number) => setDrops(prev => prev.filter((_, i) => i !== index));
  
  const updateDropField = (dIndex: number, field: keyof DropDestination, val: string) => setDrops(prev => { const newDrops = [...prev]; newDrops[dIndex] = { ...newDrops[dIndex], [field]: val }; return newDrops; });
  
  const updateDropFieldsMulti = (dIndex: number, updates: Partial<DropDestination>) => setDrops(prev => { const newDrops = [...prev]; newDrops[dIndex] = { ...newDrops[dIndex], ...updates }; return newDrops; });
  const addItemToDrop = (dIndex: number) => setDrops(prev => { const newDrops = [...prev]; newDrops[dIndex].items.push({ id: `ITM-${Math.floor(1000 + Math.random() * 9000)}`, name: "", weightType: "Kecil", dimType: "S", weightVal: 0, length: 0, width: 0, height: 0, value: 0 }); return newDrops; });
  const removeItemFromDrop = (dIndex: number, iIndex: number) => setDrops(prev => { const newDrops = [...prev]; if (newDrops[dIndex].items.length > 1) { newDrops[dIndex].items = newDrops[dIndex].items.filter((_, i) => i !== iIndex); } return newDrops; });
  const updateItemField = (dIndex: number, iIndex: number, field: keyof DeliveryItem, val: string | number) => setDrops(prev => { const newDrops = [...prev]; const newItems = [...newDrops[dIndex].items]; newItems[iIndex] = { ...newItems[iIndex], [field]: val }; newDrops[dIndex] = { ...newDrops[dIndex], items: newItems }; return newDrops; });

  const setExpandedDrop = (id: string) => {
    setActiveDraggable(null);
    setActiveDropId(activeDropId === id ? null : id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const rows = text.split("\n").filter(row => row.trim().length > 0);
        const parsedDrops = rows.slice(1).map((row, idx) => {
          const cols = row.split(",");
          return {
            id: `DROP-CSV-${Date.now()}-${idx}`,
            address: cols[0]?.trim() || "",
            receiverName: cols[1]?.trim() || "",
            receiverPhone: cols[2]?.trim() || "",
            detail: cols[3]?.trim() || "",
            receiverEmail: "",
            items: [{ 
              id: `ITM-${Date.now()}`, 
              name: cols[4]?.trim() || "Paket CSV", 
              weightType: "Sedang" as const, dimType: "M" as const, 
              weightVal: Number(cols[5]) || 1, length: Number(cols[6]) || 10, width: Number(cols[7]) || 10, height: Number(cols[8]) || 10, value: Number(cols[9]) || 0 
            }]
          };
        }) as DropDestination[];
        
        if (parsedDrops.length > 0) {
          if (parsedDrops.length > 24) {
             setErrorMsg("Maksimal titik tujuan dari CSV adalah 24. Sistem hanya akan memuat 24 data pertama demi kestabilan radar.");
             setDrops(parsedDrops.slice(0, 24));
          } else {
             setDrops(parsedDrops);
          }
          setActiveDropId(parsedDrops[0].id); 
        } else {
          setErrorMsg("Format CSV kosong atau tidak valid.");
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    const header = "AlamatLengkap,NamaPenerima,NoHP,DetailPatokan,NamaBarang,BeratKg,Panjang,Lebar,Tinggi,NilaiBarang\n";
    const example = '"Jl. Sudirman No 1 Jakarta","Budi Santoso","08123456789","Rumah Pagar Hitam","Baju Kemeja",2,20,20,10,150000\n';
    const blob = new Blob([header + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Bulk_FlashGlobal.csv';
    a.click();
  };

  return (
    <Card className="shadow-sm border-slate-200 relative overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C5A059]"></div>
      
      <CardHeader className="p-6 md:p-8 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-sm">3</div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Tujuan & Paket</h3>
            <p className="text-xs text-slate-500 mt-1">Total {drops.length} Lokasi Pengiriman</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedService === "Sameday" && (
            <>
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <Button type="button" variant="outline" size="sm" onClick={() => handleInfoClick("Cara Upload CSV", "Unduh template CSV, isi sesuai format (Alamat, Nama, NoHP, Patokan, NamaBarang, Berat, P, L, T, Nilai). Lalu klik Upload Bulk CSV.")} className="text-slate-400 border-transparent hover:bg-slate-100 h-9 w-9 p-0 rounded-lg">
                <Info className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleDownloadTemplate} className="text-xs h-9 hidden md:flex">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Template
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs h-9 border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-white">
                <Upload className="w-3.5 h-3.5 mr-1.5" /> Bulk CSV
              </Button>
              <Button type="button" variant="gold" size="sm" onClick={addDrop} className="text-xs h-9">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Tambah Rute
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <div className="max-h-[600px] overflow-y-auto custom-scrollbar p-6 md:p-8 bg-slate-50/30">
        
        {/* Warning Mapbox Limit Khusus Sameday/CSV */}
        {selectedService === "Sameday" && (
          <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 items-start shadow-sm">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-blue-800 text-xs leading-relaxed">
                  <strong className="block mb-1 text-sm">Catatan Penting: Panduan Bulk CSV & Limit Peta Mapbox</strong>
                  Format CSV: <b>Alamat Lengkap, Nama Penerima, No HP, Patokan, Nama Barang, Berat(Kg), P, L, T, Harga(Rp)</b> tanpa koma ekstra. Untuk kestabilan *routing* satelit Mapbox, sistem membatasi maksimal <b>24 rute tujuan</b> dalam satu order agar aplikasi tidak crash.
              </div>
          </div>
        )}

        <div className="relative">
          {drops.length > 1 && <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-200 z-0 hidden lg:block"></div>}

          <div className="space-y-4 relative z-10">
            <AnimatePresence>
              {drops.map((drop, dIndex) => {
                const isExpanded = activeDropId === drop.id;

                return (
                  <motion.div key={drop.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="relative">
                    
                    <div className="absolute -left-[54px] top-4 w-8 h-8 rounded-full bg-white border-[3px] border-[#C5A059] hidden lg:flex items-center justify-center z-10 shadow-sm text-xs font-black text-[#A68345]">{dIndex + 1}</div>

                    <div className={cn("bg-white border transition-colors shadow-sm rounded-2xl overflow-hidden", isExpanded ? "border-[#C5A059]/40" : "border-slate-200 hover:border-[#C5A059]/30 cursor-pointer")}>
                      
                      {/* Accordion Header */}
                      <div 
                        className="p-5 flex justify-between items-center select-none"
                        onClick={() => setExpandedDrop(drop.id)}
                      >
                        <h4 className="font-bold text-slate-800 uppercase text-sm flex items-center gap-2 tracking-wider truncate pr-4">
                          <span className="w-6 h-6 rounded-full bg-[#C5A059] text-white flex shrink-0 items-center justify-center text-[10px] lg:hidden">{dIndex + 1}</span>
                          <span className="truncate">Rute {dIndex + 1} {drop.receiverName ? <span className="text-slate-400 capitalize normal-case font-semibold">- {drop.receiverName}</span> : ''}</span>
                        </h4>
                        
                        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                          {isExpanded && drop.lng && drop.lat && (
                            <Button 
                              type="button" 
                              variant={activeDraggable === drop.id ? "gold" : "outline"}
                              size="sm"
                              onClick={() => setActiveDraggable(activeDraggable === drop.id ? null : drop.id)}
                              className={`h-8 text-xs ${activeDraggable === drop.id ? "animate-pulse border-none shadow-none" : "border-slate-200 text-slate-500 hover:text-[#C5A059] hover:bg-[#C5A059]/10"}`}
                            >
                              <MapPinned className="w-3.5 h-3.5 mr-1.5" />
                              {activeDraggable === drop.id ? `Geser Pin` : "Edit Pin"}
                            </Button>
                          )}
                          {drops.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeDrop(dIndex)} className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                          )}
                          <div className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-500 border border-slate-100 hover:bg-slate-100 transition-colors ml-1 cursor-pointer" onClick={() => setExpandedDrop(drop.id)}>
                            <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded ? "rotate-180" : "")} />
                          </div>
                        </div>
                      </div>

                      {/* Accordion Body */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: "auto", opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="border-t border-slate-100"
                          >
                            <div className="p-5 md:p-6 space-y-6">
                              <div className="space-y-5">
                                <div>
                                  <FieldLabel label="Pencarian Alamat Tujuan" infoTitle="Alamat Tujuan" infoText="Pastikan alamat lengkap. Ketik perlahan dan pilih alamat yang tepat dari saran yang muncul agar koordinat akurat." onInfoClick={handleInfoClick}/>
                                  <div className={cn("border-2 border-transparent rounded-xl transition-all bg-slate-50 overflow-hidden h-12 w-full", inputGold)}>
                                    <SearchBox
                                      accessToken={MAPBOX_TOKEN}
                                      options={{ language: 'id', country: 'ID' }}
                                      value={drop.address}
                                      placeholder="Ketik alamat pengiriman..."
                                      onRetrieve={(res) => {
                                        const feature = res.features[0];
                                        updateDropFieldsMulti(dIndex, {
                                          address: feature.properties.full_address || feature.properties.name,
                                          lng: feature.geometry.coordinates[0],
                                          lat: feature.geometry.coordinates[1]
                                        });
                                      }}
                                      theme={{ variables: { boxShadow: 'none', border: 'none', colorBackground: 'transparent', padding: '10px 16px', fontFamily: 'inherit', unit: '14px', fontWeight: '500' } }}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <FieldLabel label="Detail Patokan" />
                                  <div className="relative">
                                    <MapPin className="w-4 h-4 absolute left-4 top-[14px] text-slate-400" />
                                    <textarea value={drop.detail} onChange={(e) => updateDropField(dIndex, "detail", e.target.value)} rows={2} placeholder="Cth: Pagar cat hitam..." className={cn("flex w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pl-11 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:bg-white transition-all resize-none shadow-sm", inputGold)} required></textarea>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <FieldLabel label="Nama Penerima" />
                                    <div className="relative">
                                      <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <Input value={drop.receiverName} onChange={(e) => updateDropField(dIndex, "receiverName", e.target.value)} placeholder="Nama" className={cn("pl-11", inputGold)} required />
                                    </div>
                                  </div>
                                  <div>
                                    <FieldLabel label="No. Handphone" />
                                    <div className="relative">
                                      <Phone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <Input type="tel" value={drop.receiverPhone} onChange={(e) => updateDropField(dIndex, "receiverPhone", e.target.value)} placeholder="08..." className={cn("pl-11", inputGold)} required />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* DATA BARANG PER DROP */}
                              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 shadow-inner mt-6">
                                <div className="flex justify-between items-center mb-4">
                                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2"><PackageOpen className="w-4 h-4 text-[#C5A059]"/> Detail Paket</h5>
                                  <Button type="button" variant="outline" size="sm" onClick={() => addItemToDrop(dIndex)} className="h-7 px-3 text-[10px] text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white transition-colors">
                                    <Plus className="w-3 h-3 mr-1"/> Tambah
                                  </Button>
                                </div>

                                <div className="space-y-4">
                                  {drop.items.map((item, iIndex) => (
                                    <div key={item.id} className="relative bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                                      {drop.items.length > 1 && (
                                        <button type="button" onClick={() => removeItemFromDrop(dIndex, iIndex)} className="absolute right-3 top-3 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                      )}
                                      
                                      <div>
                                        <FieldLabel label="Isi Paket" infoTitle="Deskripsi Barang" infoText="Sebutkan isi paket agar kurir bisa berhati-hati. Contoh: 'Dokumen', 'Pecah Belah'." onInfoClick={handleInfoClick}/>
                                        <Input value={item.name} onChange={(e) => updateItemField(dIndex, iIndex, "name", e.target.value)} placeholder="Cth: Baju / Dokumen" className={cn("h-10 text-sm", inputGold)} required />
                                      </div>

                                      <div>
                                        <FieldLabel label="Spesifikasi & Asuransi" infoTitle="Spesifikasi" infoText="Isi nilai barang (Rp) untuk fitur asuransi." onInfoClick={handleInfoClick}/>
                                        {selectedVehicle?.isMotor ? (
                                          <div className="grid grid-cols-3 gap-3">
                                            <select value={item.weightType} onChange={(e) => updateItemField(dIndex, iIndex, "weightType", e.target.value)} className={cn("flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:bg-white transition-all shadow-sm", inputGold)}>
                                              <option value="Kecil">Kecil (&lt; {motorSettings?.weightSmall || 5}Kg)</option>
                                              <option value="Sedang">Sedang (&lt; {motorSettings?.weightMedium || 20}Kg)</option>
                                            </select>
                                            <select value={item.dimType} onChange={(e) => updateItemField(dIndex, iIndex, "dimType", e.target.value)} className={cn("flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:bg-white transition-all shadow-sm", inputGold)}>
                                              <option value="S">Size S</option>
                                              <option value="M">Size M</option>
                                              <option value="L">Size L</option>
                                            </select>
                                            <Input type="number" value={item.value || ""} onChange={(e) => updateItemField(dIndex, iIndex, "value", Number(e.target.value))} placeholder="Nilai (Rp)" className={cn("h-10 text-xs font-mono font-bold", inputGold)} />
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                            <Input type="number" value={item.weightVal || ""} onChange={(e) => updateItemField(dIndex, iIndex, "weightVal", Number(e.target.value))} placeholder="Berat (Kg)" className={cn("h-10 text-sm font-bold text-center", inputGold)} required />
                                            <div className="sm:col-span-2 flex gap-1 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-4 focus-within:border-[#C5A059]/50 focus-within:ring-[#C5A059]/10 transition-all shadow-sm">
                                              <input type="number" value={item.length || ""} onChange={(e) => updateItemField(dIndex, iIndex, "length", Number(e.target.value))} placeholder="P" className="w-1/3 h-10 px-2 text-xs font-bold text-center border-r border-slate-200 bg-transparent outline-none" required/>
                                              <input type="number" value={item.width || ""} onChange={(e) => updateItemField(dIndex, iIndex, "width", Number(e.target.value))} placeholder="L" className="w-1/3 h-10 px-2 text-xs font-bold text-center border-r border-slate-200 bg-transparent outline-none" required/>
                                              <input type="number" value={item.height || ""} onChange={(e) => updateItemField(dIndex, iIndex, "height", Number(e.target.value))} placeholder="T" className="w-1/3 h-10 px-2 text-xs font-bold text-center bg-transparent outline-none" required/>
                                            </div>
                                            <Input type="number" value={item.value || ""} onChange={(e) => updateItemField(dIndex, iIndex, "value", Number(e.target.value))} placeholder="Harga (Rp)" className={cn("h-10 text-xs font-mono font-bold", inputGold)} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Card>
  );
}