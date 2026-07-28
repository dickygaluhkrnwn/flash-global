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

  // State untuk Custom Dropdown
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

      login({
        ...user,
        regional: formData
      });

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: unknown) { 
      if (error instanceof Error) {
        setErrorMsg("Gagal menyimpan ke server: " + error.message);
      } else {
        setErrorMsg("Gagal menyimpan ke server karena kesalahan yang tidak diketahui.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="glass-card rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white overflow-hidden font-sans relative transition-all duration-300"
    >
      {/* --- Background Ambient Glow --- */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#C5A059]/10 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-[#7A171D]/10 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* --- HEADER STICKY --- */}
      <div className="p-6 md:p-8 border-b border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white/40 backdrop-blur-xl sticky top-0 z-20 shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Regional & Preferensi</h2>
          <p className="text-slate-500 text-sm mt-1.5 font-medium leading-relaxed">Atur preferensi lokasi untuk personalisasi operasional Anda.</p>
        </div>
        <Button 
          onClick={handleSaveRegional} 
          disabled={isLoading} 
          variant="primary"
          className="w-full sm:w-auto h-12 px-8 shadow-[0_8px_20px_rgba(122,23,29,0.2)] active:scale-95"
        >
          {isLoading ? "Menyinkronkan..." : <><Save className="w-4 h-4 mr-2" /> Simpan Konfigurasi</>}
        </Button>
      </div>

      <div className="p-6 md:p-8 space-y-10 relative z-10">
        
        {/* --- TOAST NOTIFICATIONS (IN-CARD) --- */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-emerald-50/80 backdrop-blur-md text-emerald-700 rounded-[1.25rem] font-bold text-sm border border-emerald-200 shadow-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500"/> Pengaturan regional berhasil disinkronkan secara global!
              </div>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-red-50/80 backdrop-blur-md text-red-600 rounded-[1.25rem] font-bold text-sm border border-red-200 shadow-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500"/> {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- SEKSI 1: LOKASI AKTIF --- */}
        <div>
          <div className="flex items-center gap-3 mb-6 border-b border-white pb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9A242B] to-[#7A171D] flex items-center justify-center border border-[#5A0E13] shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)] shrink-0">
               <Globe className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Pengaturan Lokasi</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Custom Dropdown: Negara */}
            <div className="space-y-2.5 relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Negara Domisili</label>
              
              {/* Invisible Backdrop to close dropdown */}
              {openCountry && <div className="fixed inset-0 z-30" onClick={() => setOpenCountry(false)} />}
              
              <div className="relative z-40">
                <button 
                  type="button" 
                  onClick={() => setOpenCountry(!openCountry)}
                  className={cn(
                    "w-full flex items-center justify-between pl-12 pr-5 h-14 rounded-[1.25rem] border transition-all text-sm font-bold shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] outline-none",
                    openCountry 
                      ? "border-[#7A171D]/50 bg-white ring-[3px] ring-[#7A171D]/15 text-slate-900" 
                      : "border-white bg-white/60 backdrop-blur-md text-slate-900 hover:border-slate-300"
                  )}
                >
                  <Globe className="w-5 h-5 absolute left-4 text-slate-400" />
                  <span className="truncate">{formData.country || "Pilih negara..."}</span>
                  <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openCountry && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {openCountry && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                      animate={{ opacity: 1, y: 0, scale: 1 }} 
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-[calc(100%+8px)] left-0 w-full bg-white/90 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden py-2"
                    >
                      {countryOptions.map(opt => (
                        <div 
                          key={opt} 
                          onClick={() => { setFormData({...formData, country: opt}); setOpenCountry(false); }}
                          className={cn(
                            "px-5 py-3.5 text-sm font-bold cursor-pointer transition-colors flex items-center justify-between group",
                            formData.country === opt ? "text-[#7A171D] bg-[#7A171D]/5" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          )}
                        >
                          {opt}
                          {formData.country === opt && <Check className="w-4 h-4 text-[#7A171D]" />}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Input: Kota */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Kota Basis</label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="text" 
                  value={formData.city} 
                  onChange={(e) => setFormData({...formData, city: e.target.value})} 
                  placeholder="Jakarta, Surabaya, dsb..." 
                  className="pl-12 h-14 font-black" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- SEKSI 2: STANDAR & FORMAT (LOCKED) --- */}
        <div className="pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-white pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] flex items-center justify-center border border-[#A68345] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] shrink-0">
                <Languages className="w-5 h-5 text-[#5A0E13]" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Standar & Format</h3>
            </div>
            <Badge variant="warning" className="animate-pulse shadow-sm px-4 py-1.5 bg-amber-50 border-amber-200 text-amber-700">
               <Hammer className="w-3.5 h-3.5 mr-1.5" /> System Maintenance
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Locked Item 1: Bahasa */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex justify-between">
                Bahasa Sistem <span className="text-[10px] text-amber-500">Coming Soon</span>
              </label>
              <div className="relative flex items-center w-full pl-12 pr-5 h-14 rounded-[1.25rem] border border-white bg-slate-50/60 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] cursor-not-allowed">
                <Languages className="w-5 h-5 absolute left-4 text-slate-300" />
                <span className="text-sm font-bold text-slate-400 select-none">Bahasa Indonesia (ID)</span>
                <Lock className="w-4 h-4 absolute right-5 text-slate-300" />
              </div>
            </div>

            {/* Locked Item 2: Zona Waktu */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex justify-between">
                Zona Waktu <span className="text-[10px] text-amber-500">Under Review</span>
              </label>
              <div className="relative flex items-center w-full pl-12 pr-5 h-14 rounded-[1.25rem] border border-white bg-slate-50/60 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] cursor-not-allowed">
                <Clock className="w-5 h-5 absolute left-4 text-slate-300" />
                <span className="text-sm font-bold text-slate-400 select-none">WIB - Asia/Jakarta</span>
                <Lock className="w-4 h-4 absolute right-5 text-slate-300" />
              </div>
            </div>

            {/* Locked Item 3: Mata Uang */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mata Uang Transaksi</label>
              <div className="relative flex items-center w-full pl-12 pr-5 h-14 rounded-[1.25rem] border border-white bg-slate-50/60 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] cursor-not-allowed">
                <Coins className="w-5 h-5 absolute left-4 text-slate-300" />
                <span className="text-sm font-bold text-slate-400 select-none">Indonesian Rupiah (IDR)</span>
                <Lock className="w-4 h-4 absolute right-5 text-slate-300" />
              </div>
            </div>

            {/* Locked Item 4: Satuan */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 flex justify-between">
                Satuan Ukur <span className="text-[10px] text-amber-500">Adjustment</span>
              </label>
              <div className="relative flex items-center w-full pl-12 pr-5 h-14 rounded-[1.25rem] border border-white bg-slate-50/60 backdrop-blur-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] cursor-not-allowed">
                <Scale className="w-5 h-5 absolute left-4 text-slate-300" />
                <span className="text-sm font-bold text-slate-400 select-none">Metrik (Kg, Cm)</span>
                <Lock className="w-4 h-4 absolute right-5 text-slate-300" />
              </div>
            </div>

          </div>
          
          {/* Info Banner 3D */}
          <div className="mt-8 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 p-5 rounded-[1.5rem] flex items-start gap-4 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none" />
             <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200 shadow-sm relative z-10">
               <Info className="w-5 h-5 text-amber-600" />
             </div>
             <div className="relative z-10">
               <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">Informasi Sinkronisasi</h4>
               <p className="text-amber-700/80 text-xs font-semibold leading-relaxed">
                 Beberapa fitur standarisasi regional saat ini sedang dalam proses sinkronisasi dengan mitra maskapai internasional dan vendor API. Perubahan bahasa dan zona waktu akan diaktifkan secara bertahap pada pembaruan versi berikutnya.
               </p>
             </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}