"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, CheckCircle2, Globe, MapPin, 
  Clock, Languages, Coins, Scale, AlertCircle, 
  Info, Lock, Hammer, ChevronDown, Check
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const countryOptions = ["Indonesia", "Malaysia", "Singapore"];

export default function LocationLanguageTab() {
  const { user, login } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    country: "Indonesia",
    city: "",
    timezone: "Asia/Jakarta", 
    language: "id",
    currency: "IDR",
    measurement: "metric"
  });

  const [openCountry, setOpenCountry] = useState(false);

  useEffect(() => {
    if (user?.regional) {
      setFormData({
        country: user.regional.country || "Indonesia",
        city: user.regional.city || "",
        timezone: user.regional.timezone || "Asia/Jakarta",
        language: user.regional.language || "id",
        currency: user.regional.currency || "IDR",
        measurement: user.regional.measurement || "metric"
      });
    }
  }, [user]);

  const handleSaveRegional = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      await setDoc(doc(db, "users", user.uid), {
        regional: formData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      login({ ...user, regional: formData });

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: unknown) { 
      if (error instanceof Error) setErrorMsg("Gagal menyimpan ke server: " + error.message);
      else setErrorMsg("Gagal menyimpan ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 relative z-10">
      
      {/* TOAST NOTIFICATIONS */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-[1.25rem] font-bold text-xs border border-emerald-200 shadow-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5"/> <span>Pengaturan regional berhasil disinkronkan secara global!</span>
            </div>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
            <div className="p-3 bg-red-50 text-red-600 rounded-[1.25rem] font-bold text-xs border border-red-200 shadow-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5"/> <span>{errorMsg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEKSI 1: LOKASI AKTIF */}
      <div className="glass-card rounded-[2rem] p-5 shadow-sm border border-slate-100 bg-white relative">
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9A242B] to-[#7A171D] flex items-center justify-center border border-[#5A0E13] shadow-sm shrink-0">
             <Globe className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">Lokasi Operasional</h3>
        </div>
        
        <div className="space-y-4">
          
          {/* Custom Dropdown: Negara */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Negara Domisili</label>
            {openCountry && <div className="fixed inset-0 z-30" onClick={() => setOpenCountry(false)} />}
            
            <div className="relative z-40">
              <button 
                type="button" 
                onClick={() => setOpenCountry(!openCountry)}
                className={cn(
                  "w-full flex items-center justify-between pl-10 pr-4 h-12 rounded-xl border transition-all text-xs font-bold outline-none shadow-sm tap-highlight-transparent",
                  openCountry 
                    ? "border-blue-500 bg-white ring-2 ring-blue-500/20 text-slate-900" 
                    : "border-slate-200 bg-slate-50 text-slate-900"
                )}
              >
                <Globe className="w-4 h-4 absolute left-3 text-slate-400" />
                <span className="truncate">{formData.country || "Pilih negara..."}</span>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openCountry && "rotate-180")} />
              </button>

              <AnimatePresence>
                {openCountry && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                    className="absolute top-[calc(100%+8px)] left-0 w-full bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-2 z-50"
                  >
                    {countryOptions.map(opt => (
                      <div 
                        key={opt} onClick={() => { setFormData({...formData, country: opt}); setOpenCountry(false); }}
                        className={cn("px-4 py-3 text-xs font-bold cursor-pointer transition-colors flex items-center justify-between tap-highlight-transparent", formData.country === opt ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-50")}
                      >
                        {opt} {formData.country === opt && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Input: Kota */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Kota Basis</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                type="text" 
                value={formData.city} 
                onChange={(e) => setFormData({...formData, city: e.target.value})} 
                placeholder="Jakarta, Surabaya, dsb..." 
                className="pl-10 h-12 text-xs font-bold rounded-xl" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEKSI 2: STANDAR & FORMAT (LOCKED) */}
      <div className="glass-card rounded-[2rem] p-5 shadow-sm border border-slate-100 bg-slate-50/50">
        <div className="flex flex-col gap-3 mb-5 border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                <Languages className="w-4 h-4 text-slate-500" />
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Format Regional</h3>
            </div>
            <Badge variant="warning" className="px-2 py-0.5 text-[8px] bg-amber-100 border-amber-200 text-amber-700 uppercase tracking-widest flex items-center gap-1 shadow-sm">
               <Hammer className="w-2.5 h-2.5" /> Maintenance
            </Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Locked Item 1: Bahasa */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 flex justify-between">
              Bahasa Sistem
            </label>
            <div className="relative flex items-center w-full pl-10 pr-4 h-12 rounded-xl border border-slate-200 bg-slate-100/80 cursor-not-allowed shadow-inner">
              <Languages className="w-4 h-4 absolute left-3 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 select-none">Bahasa Indonesia (ID)</span>
              <Lock className="w-3.5 h-3.5 absolute right-4 text-slate-400" />
            </div>
          </div>

          {/* Locked Item 2: Zona Waktu */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 flex justify-between">
              Zona Waktu
            </label>
            <div className="relative flex items-center w-full pl-10 pr-4 h-12 rounded-xl border border-slate-200 bg-slate-100/80 cursor-not-allowed shadow-inner">
              <Clock className="w-4 h-4 absolute left-3 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 select-none">WIB - Asia/Jakarta</span>
              <Lock className="w-3.5 h-3.5 absolute right-4 text-slate-400" />
            </div>
          </div>

          {/* Locked Item 3: Mata Uang */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Mata Uang Transaksi</label>
            <div className="relative flex items-center w-full pl-10 pr-4 h-12 rounded-xl border border-slate-200 bg-slate-100/80 cursor-not-allowed shadow-inner">
              <Coins className="w-4 h-4 absolute left-3 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 select-none">Indonesian Rupiah (IDR)</span>
              <Lock className="w-3.5 h-3.5 absolute right-4 text-slate-400" />
            </div>
          </div>

          {/* Locked Item 4: Satuan */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1 flex justify-between">
              Satuan Ukur
            </label>
            <div className="relative flex items-center w-full pl-10 pr-4 h-12 rounded-xl border border-slate-200 bg-slate-100/80 cursor-not-allowed shadow-inner">
              <Scale className="w-4 h-4 absolute left-3 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 select-none">Metrik (Kg, Cm)</span>
              <Lock className="w-3.5 h-3.5 absolute right-4 text-slate-400" />
            </div>
          </div>
        </div>
        
        {/* Info Banner */}
        <div className="mt-5 bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-amber-700/80 text-[10px] font-bold leading-relaxed">
            Perubahan bahasa, zona waktu, mata uang, dan metrik ukuran akan diaktifkan secara bertahap seiring perluasan layanan Flash Global di Asia Tenggara.
          </p>
        </div>
      </div>

      {/* BOTTOM ACTION BAR (STICKY) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <Button 
          onClick={handleSaveRegional} 
          disabled={isLoading} 
          className="w-full h-14 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white rounded-[1.25rem] font-black shadow-md flex items-center justify-center gap-2 active:scale-95 tap-highlight-transparent border border-[#5A0E13] text-sm"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <><Save className="w-4 h-4" /> Simpan Konfigurasi</>
          )}
        </Button>
      </div>
      
    </div>
  );
}