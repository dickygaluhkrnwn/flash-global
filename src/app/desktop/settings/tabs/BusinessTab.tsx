"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Crown, ArrowRight, CheckCircle2, Building, 
  MapPin, User, Briefcase, TrendingUp, 
  FileCheck, ShieldAlert, MessageCircle 
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

const inputStyle = "w-full rounded-xl border-2 border-gray-200 bg-white outline-none text-gray-900 shadow-sm transition-all placeholder:text-gray-400 placeholder:font-normal font-semibold focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10";
const inputStyleGold = "w-full rounded-xl border-2 border-[#C5A059]/20 bg-white outline-none text-gray-900 shadow-sm transition-all placeholder:text-gray-400 placeholder:font-normal font-semibold focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/20";

const industryOptions = [
  "E-Commerce & Retail",
  "Food & Beverage (F&B)",
  "Manufacturing & Production",
  "Healthcare & Pharmaceuticals",
  "Automotive & Spareparts",
  "Technology & Electronics",
  "Fashion & Apparel",
  "Lainnya"
];

const volumeOptions = [
  "Mulai Usaha (< 100 pengiriman/bulan)",
  "Menengah (100 - 500 pengiriman/bulan)",
  "Tinggi (500 - 1,000 pengiriman/bulan)",
  "Enterprise (> 1,000 pengiriman/bulan)"
];

export default function BusinessTab() {
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showB2BForm, setShowB2BForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk Profil Bisnis Standar
  const [formData, setFormData] = useState({ 
    companyName: "", 
    defaultAddress: "" 
  });

  // State untuk Pengajuan B2B / Corporate
  const [b2bData, setB2bData] = useState({
    picName: "",
    legalCompanyName: "",
    npwp: "",
    industry: "",
    volume: ""
  });

  useEffect(() => {
    if (user?.uid) {
      setB2bData(prev => ({ ...prev, picName: user.name || "" }));
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData({
              companyName: data.companyName || "",
              defaultAddress: data.defaultAddress || ""
            });
            setB2bData(prev => ({ 
              ...prev, 
              legalCompanyName: data.companyName || "" 
            }));
          }
        } catch (error) {}
      };
      fetchUserData();
    }
  }, [user]);

  const handleSaveCompany = async () => {
    if (!user?.uid) return;
    try {
      await setDoc(doc(db, "users", user.uid), { ...formData, updatedAt: serverTimestamp() }, { merge: true });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmitB2B = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setIsLoading(true);

    try {
      // 1. Simpan pengajuan ke Firestore
      await setDoc(doc(db, "b2b_requests", user.uid), {
        userId: user.uid,
        email: user.email,
        picName: b2bData.picName,
        legalCompanyName: b2bData.legalCompanyName,
        npwp: b2bData.npwp,
        industry: b2bData.industry,
        monthlyVolume: b2bData.volume,
        status: "Menunggu Peninjauan",
        requestedAt: serverTimestamp()
      });

      // 2. Generate Pesan WA
      const adminWhatsApp = "6281234567890"; 
      const message = `Halo Tim Kemitraan Flash Global,\n\nSaya tertarik untuk *Upgrade Akun Corporate (B2B)*. Berikut profil bisnis saya:\n\n👤 *Nama PIC:* ${b2bData.picName}\n🏢 *Nama PT/Entitas:* ${b2bData.legalCompanyName}\n📄 *NPWP:* ${b2bData.npwp || "-"}\n🏭 *Industri:* ${b2bData.industry}\n📦 *Estimasi Volume:* ${b2bData.volume}\n✉️ *Email Terdaftar:* ${user.email}\n\nMohon informasi terkait dokumen legalitas lanjutan dan penawaran harga grosirnya. Terima kasih.`;
      
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${adminWhatsApp}?text=${encodedMessage}`, "_blank");

    } catch (error) {
      console.error("Gagal mengajukan B2B:", error);
      alert("Terjadi kesalahan. Pastikan koneksi internet Anda stabil.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. PROFIL BISNIS STANDAR (Untuk Form Booking) */}
      <div className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 border border-gray-100 overflow-hidden p-8">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">Store / Branch Profile</h2>
            <p className="text-gray-500 text-sm mt-1">Kelola nama entitas dan lokasi gudang default untuk penjemputan.</p>
          </div>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="bg-gray-50 hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-xl font-bold text-sm transition-all border border-gray-200">
              Edit Details
            </button>
          ) : (
            <button onClick={handleSaveCompany} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white px-5 py-2 rounded-xl font-bold text-sm transition-all">
              Save
            </button>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Display Name / Branch</label>
            <div className="relative">
              <Building className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" disabled={!isEditing} value={formData.companyName} onChange={(e) => setFormData({...formData, companyName: e.target.value})} className={`${inputStyle} pl-11 pr-4 py-3 disabled:bg-gray-50 disabled:text-gray-500`} placeholder="Toko Flash Global Pusat" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Default Warehouse Address</label>
            <div className="relative">
              <MapPin className="w-5 h-5 absolute left-4 top-4 text-gray-400" />
              <textarea disabled={!isEditing} value={formData.defaultAddress} onChange={(e) => setFormData({...formData, defaultAddress: e.target.value})} rows={3} className={`${inputStyle} pl-11 pr-4 py-3 disabled:bg-gray-50 disabled:text-gray-500 resize-none`} placeholder="Alamat lengkap pergudangan..."></textarea>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CORPORATE B2B UPGRADE SECTION */}
      <div className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-gray-800 transition-all">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10 border-b border-gray-700 pb-6 mb-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-[#C5A059] to-[#DFBE7B] rounded-2xl flex items-center justify-center shadow-lg shrink-0">
              <Crown className="w-7 h-7 text-gray-900" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-1">Corporate Account</h2>
              <p className="text-gray-400 text-sm">Tell us more about your business to unlock B2B perks.</p>
            </div>
          </div>
          {!showB2BForm && (
            <button onClick={() => setShowB2BForm(true)} className="bg-gradient-to-r from-[#C5A059] to-[#DFBE7B] hover:from-[#b08d4a] hover:to-[#C5A059] text-gray-900 font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg whitespace-nowrap">
              Apply for Partnership <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {showB2BForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative z-10 overflow-hidden">
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
                <h3 className="text-[#DFBE7B] font-bold text-lg mb-5 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" /> Business Information
                </h3>
                
                <form onSubmit={handleSubmitB2B} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Nama PIC */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Representative Name (PIC)</label>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input type="text" value={b2bData.picName} onChange={(e) => setB2bData({...b2bData, picName: e.target.value})} className={`${inputStyleGold} pl-11 pr-4 py-3 bg-gray-900/50 text-white`} placeholder="Full Name" required />
                      </div>
                    </div>

                    {/* Legal Company Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Company Name (NPWP/NIB)</label>
                      <div className="relative">
                        <Building className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input type="text" value={b2bData.legalCompanyName} onChange={(e) => setB2bData({...b2bData, legalCompanyName: e.target.value})} className={`${inputStyleGold} pl-11 pr-4 py-3 bg-gray-900/50 text-white`} placeholder="PT. Logistik Super Nusantara" required />
                      </div>
                    </div>

                    {/* Tax ID / NPWP */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tax ID / Nomor NPWP <span className="text-gray-500 normal-case">(Opsional saat ini)</span></label>
                      <div className="relative">
                        <FileCheck className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input type="text" value={b2bData.npwp} onChange={(e) => setB2bData({...b2bData, npwp: e.target.value})} className={`${inputStyleGold} pl-11 pr-4 py-3 bg-gray-900/50 text-white`} placeholder="00.000.000.0-000.000" />
                      </div>
                    </div>

                    {/* Industry Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Industry</label>
                      <div className="relative">
                        <Building className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <select value={b2bData.industry} onChange={(e) => setB2bData({...b2bData, industry: e.target.value})} className={`${inputStyleGold} pl-11 pr-4 py-3 bg-gray-900/50 text-white appearance-none`} required>
                          <option value="" disabled className="text-gray-500">Select an industry...</option>
                          {industryOptions.map(opt => <option key={opt} value={opt} className="bg-gray-800 text-white">{opt}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Delivery Volume Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Est. Monthly Delivery Volume</label>
                      <div className="relative">
                        <TrendingUp className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <select value={b2bData.volume} onChange={(e) => setB2bData({...b2bData, volume: e.target.value})} className={`${inputStyleGold} pl-11 pr-4 py-3 bg-gray-900/50 text-white appearance-none`} required>
                          <option value="" disabled className="text-gray-500">Select delivery volume...</option>
                          {volumeOptions.map(opt => <option key={opt} value={opt} className="bg-gray-800 text-white">{opt}</option>)}
                        </select>
                      </div>
                    </div>

                  </div>

                  <div className="pt-6 flex flex-col-reverse md:flex-row items-center justify-end gap-3">
                    <button type="button" onClick={() => setShowB2BForm(false)} className="w-full md:w-auto px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                      Batal
                    </button>
                    <button type="submit" disabled={isLoading} className="w-full md:w-auto bg-[#C5A059] hover:bg-[#b08d4a] text-gray-900 font-bold px-8 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#C5A059]/20 disabled:opacity-70">
                      {isLoading ? "Mengirim..." : <><MessageCircle className="w-5 h-5" /> Submit via WhatsApp</>}
                    </button>
                  </div>
                </form>

              </div>
              
              <div className="flex gap-3 text-[11px] text-gray-400 bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                <p>Data Anda aman bersama kami. Dokumen legalitas fisik (SIUP/NIB/KTP Direktur) akan diminta oleh tim representatif kami setelah validasi data awal ini disetujui.</p>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}