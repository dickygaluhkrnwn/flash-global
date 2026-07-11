"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, CheckCircle2, Globe, MapPin, 
  Clock, Languages, Coins, Scale, AlertCircle, Info, Lock, Hammer
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
    } catch (error: any) {
      setErrorMsg("Gagal menyimpan ke server: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden font-sans">
      
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Regional & Preferences</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Atur preferensi lokasi untuk personalisasi layanan Anda.</p>
        </div>
        <Button 
          onClick={handleSaveRegional} 
          disabled={isLoading} 
          variant="primary"
          className="w-full sm:w-auto px-6 shadow-md"
        >
          {isLoading ? "Sinkronisasi..." : <><Save className="w-4 h-4 mr-2" /> Simpan Konfigurasi</>}
        </Button>
      </div>

      <div className="p-6 md:p-8 space-y-10">
        
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0 }} className="overflow-hidden">
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm border border-emerald-100 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0"/> Pengaturan regional berhasil disinkronkan secara global!
              </div>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm border border-red-100 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0"/> {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
            <Globe className="w-4 h-4 text-[#7A171D]" /> Pengaturan Lokasi (Aktif)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Negara Domisili</label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  value={formData.country} 
                  onChange={(e) => setFormData({...formData, country: e.target.value})} 
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none text-sm font-semibold text-slate-900 shadow-sm appearance-none transition-all"
                >
                  <option value="Indonesia">Indonesia</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Singapore">Singapore</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kota Basis</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="text" 
                  value={formData.city} 
                  onChange={(e) => setFormData({...formData, city: e.target.value})} 
                  placeholder="Jakarta, Surabaya, dsb..." 
                  className="pl-11 focus-visible:border-[#7A171D]" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 opacity-70">
          <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
              <Languages className="w-4 h-4 text-[#C5A059]" /> Standar & Format
            </h3>
            {/* VARIANT DIPERBAIKI MENJADI 'warning' */}
            <Badge variant="warning" className="animate-pulse flex items-center gap-1.5 px-3 py-1">
               <Hammer className="w-3.5 h-3.5" /> System Maintenance
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 group cursor-not-allowed">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                Bahasa Sistem <span className="text-[10px] text-amber-500">Coming Soon</span>
              </label>
              <div className="relative">
                <Languages className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <select disabled className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 outline-none text-sm font-medium appearance-none cursor-not-allowed">
                  <option value="id">Bahasa Indonesia (ID)</option>
                </select>
                <Lock className="w-3.5 h-3.5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
            </div>

            <div className="space-y-2 cursor-not-allowed">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                Zona Waktu <span className="text-[10px] text-amber-500">Under Review</span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <select disabled className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 outline-none text-sm font-medium appearance-none cursor-not-allowed">
                  <option value="Asia/Jakarta">WIB - Asia/Jakarta</option>
                </select>
                <Lock className="w-3.5 h-3.5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
            </div>

            <div className="space-y-2 cursor-not-allowed">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mata Uang Transaksi</label>
              <div className="relative">
                <Coins className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <select disabled className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 outline-none text-sm font-medium appearance-none cursor-not-allowed">
                  <option value="IDR">Indonesian Rupiah (IDR)</option>
                </select>
                <Lock className="w-3.5 h-3.5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
            </div>

            <div className="space-y-2 cursor-not-allowed">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                Satuan Ukur <span className="text-[10px] text-amber-500">Adjustment</span>
              </label>
              <div className="relative">
                <Scale className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <select disabled className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 outline-none text-sm font-medium appearance-none cursor-not-allowed">
                  <option value="metric">Metrik (Kg, Cm)</option>
                </select>
                <Lock className="w-3.5 h-3.5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
             <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
             <p className="text-amber-800 text-[11px] font-medium leading-relaxed">
               Beberapa fitur standarisasi regional saat ini sedang dalam proses sinkronisasi dengan mitra maskapai internasional dan vendor API. Perubahan bahasa dan zona waktu akan diaktifkan secara bertahap pada pembaruan versi berikutnya.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}