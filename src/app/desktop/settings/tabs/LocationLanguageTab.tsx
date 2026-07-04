"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, CheckCircle2, Globe, MapPin, 
  Clock, Languages, Coins, Scale 
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

export default function LocationLanguageTab() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    country: "Indonesia",
    city: "",
    timezone: "Asia/Jakarta", // Default WIB
    language: "id",
    currency: "IDR",
    measurement: "metric"
  });

  // Tarik data regional preferensi user dari Firestore
  useEffect(() => {
    if (user?.uid) {
      const fetchRegionalData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Kita juga bisa menarik city dari defaultAddress jika belum diatur secara spesifik
            let defaultCity = "";
            if (data.defaultAddress && typeof data.defaultAddress === 'string') {
              // Asumsi sederhana: tarik kata terakhir atau biarkan user isi sendiri
              defaultCity = data.regional?.city || "";
            }

            if (data.regional) {
              setFormData({
                country: data.regional.country || "Indonesia",
                city: data.regional.city || defaultCity,
                timezone: data.regional.timezone || "Asia/Jakarta",
                language: data.regional.language || "id",
                currency: data.regional.currency || "IDR",
                measurement: data.regional.measurement || "metric"
              });
            }
          }
        } catch (error) {
          console.error("Gagal menarik pengaturan regional:", error);
        }
      };
      fetchRegionalData();
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

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Gagal menyimpan pengaturan regional.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Location & Language</h2>
          <p className="text-gray-500 text-sm mt-1">Sesuaikan zona waktu, bahasa, dan format regional Anda.</p>
        </div>
        <button onClick={handleSaveRegional} disabled={isLoading} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2">
          {isLoading ? "Menyimpan..." : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      <div className="p-8 space-y-10">
        <AnimatePresence>
          {isSuccess && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-green-50 text-green-700 rounded-xl font-bold text-sm border border-green-200 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Pengaturan regional berhasil diperbarui!</motion.div>}
          {errorMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm border border-red-200">{errorMsg}</motion.div>}
        </AnimatePresence>

        {/* SECTION 1: LOCATION & TIME */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2 uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-[#7A171D]" /> Regional & Lokasi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Negara / Wilayah Operasional</label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#7A171D] outline-none text-sm font-semibold text-gray-900 shadow-sm appearance-none">
                  <option value="Indonesia">Indonesia</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Singapore">Singapore</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kota Basis Operasional</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="Contoh: Jakarta Selatan" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none text-sm font-semibold text-gray-900 bg-white shadow-sm" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Kota ini akan dijadikan preferensi awal saat pencarian kargo armada.</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Zona Waktu Sistem (Time Zone)</label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={formData.timezone} onChange={(e) => setFormData({...formData, timezone: e.target.value})} className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#7A171D] outline-none text-sm font-semibold text-gray-900 shadow-sm appearance-none">
                  <option value="Asia/Jakarta">Waktu Indonesia Barat (WIB) - Asia/Jakarta</option>
                  <option value="Asia/Makassar">Waktu Indonesia Tengah (WITA) - Asia/Makassar</option>
                  <option value="Asia/Jayapura">Waktu Indonesia Timur (WIT) - Asia/Jayapura</option>
                </select>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Akan digunakan untuk menyesuaikan tampilan waktu resi (Tracking Manifest) dan riwayat order.</p>
            </div>
          </div>
        </div>

        {/* SECTION 2: FORMATTING & STANDARDS */}
        <div className="border-t border-gray-100 pt-8">
          <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2 uppercase tracking-wider">
            <Languages className="w-4 h-4 text-[#C5A059]" /> Bahasa & Standar Format
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bahasa Antarmuka</label>
              <div className="relative">
                <Languages className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={formData.language} onChange={(e) => setFormData({...formData, language: e.target.value})} className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#C5A059] outline-none text-sm font-semibold text-gray-900 shadow-sm appearance-none">
                  <option value="id">Bahasa Indonesia (ID)</option>
                  <option value="en">English (US)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Format Mata Uang</label>
              <div className="relative">
                <Coins className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={formData.currency} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 outline-none text-sm font-semibold shadow-sm appearance-none cursor-not-allowed" disabled>
                  <option value="IDR">Indonesian Rupiah (IDR)</option>
                </select>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Saat ini transaksi hanya mendukung Rupiah.</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Satuan Ukuran Kargo (Measurement)</label>
              <div className="relative">
                <Scale className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={formData.measurement} onChange={(e) => setFormData({...formData, measurement: e.target.value})} className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-[#C5A059] outline-none text-sm font-semibold text-gray-900 shadow-sm appearance-none">
                  <option value="metric">Metrik (Kilogram, Centimeter)</option>
                  <option value="imperial">Imperial (Pounds, Inches)</option>
                </select>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}