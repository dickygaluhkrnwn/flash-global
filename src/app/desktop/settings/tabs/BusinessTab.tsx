"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Crown, ArrowRight, Building, 
  MapPin, User, Briefcase, TrendingUp, 
  FileCheck, ShieldAlert, MessageCircle, 
  CheckCircle2, AlertCircle, Clock, CreditCard
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

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
  const { user, login } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [showB2BForm, setShowB2BForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Status Kemitraan dari Database
  const [contractStatus, setContractStatus] = useState<"Pending" | "Approved" | "Rejected" | null>(null);
  const [b2bLimit, setB2bLimit] = useState<number>(0);

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
      setB2bData(prev => ({ ...prev, picName: user.displayName || "" }));
      
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData({
              companyName: data.companyName || "",
              defaultAddress: data.defaultAddress || ""
            });
            setB2bData({
              picName: data.picName || user.displayName || "",
              legalCompanyName: data.companyName || "",
              npwp: data.npwp || "",
              industry: data.industry || "",
              volume: data.monthlyVolume || ""
            });
            setContractStatus(data.contractStatus || null);
            setB2bLimit(data.b2bLimit || 0);

            // Jika role di database sudah b2b tapi di zustand belum, update zustand otomatis
            if (data.role === "b2b" && user.role !== "b2b") {
              login({ ...user, role: "b2b" });
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserData();
    }
  }, [user, login]);

  const handleSaveCompany = async () => {
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), { 
        companyName: formData.companyName,
        defaultAddress: formData.defaultAddress,
        updatedAt: serverTimestamp() 
      }, { merge: true });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving company data:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // LOGIKA CERDAS: SINKRONISASI KE TABEL ADMIN B2B
  const handleSubmitB2B = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setIsSaving(true);

    try {
      // 1. Simpan langsung ke profil user agar terbaca oleh Admin B2B
      await setDoc(doc(db, "users", user.uid), {
        picName: b2bData.picName,
        companyName: b2bData.legalCompanyName, // Samakan nama entitas
        npwp: b2bData.npwp,
        industry: b2bData.industry,
        monthlyVolume: b2bData.volume,
        contractStatus: "Pending", // Status awal wajib Pending
        b2bRequestedAt: serverTimestamp()
      }, { merge: true });

      setContractStatus("Pending");
      setShowB2BForm(false);

      // 2. Generate Pesan WA ke Tim Sales/Kemitraan
      const adminWhatsApp = "6281234567890"; 
      const message = `Halo Tim Kemitraan Flash Global,\n\nSaya tertarik untuk *Upgrade Akun Corporate (B2B)*. Berikut profil bisnis saya:\n\n👤 *Nama PIC:* ${b2bData.picName}\n🏢 *Nama PT/Entitas:* ${b2bData.legalCompanyName}\n📄 *NPWP:* ${b2bData.npwp || "-"}\n🏭 *Industri:* ${b2bData.industry}\n📦 *Estimasi Volume:* ${b2bData.volume}\n✉️ *Email Terdaftar:* ${user.email}\n\nMohon informasi terkait dokumen legalitas lanjutan dan penawaran harga grosirnya. Terima kasih.`;
      
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${adminWhatsApp}?text=${encodedMessage}`, "_blank");

    } catch (error) {
      console.error("Gagal mengajukan B2B:", error);
      alert("Terjadi kesalahan. Pastikan koneksi internet Anda stabil.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center text-slate-400 font-bold text-sm animate-pulse">Memuat Profil Bisnis...</div>;
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. PROFIL BISNIS STANDAR (Untuk Form Booking) */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900">Profil Cabang Gudang</h2>
            <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">Kelola nama entitas dan lokasi gudang default untuk mempercepat form penjemputan.</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="h-10 text-xs font-bold w-full sm:w-auto border-slate-300">
              Edit Data Cabang
            </Button>
          ) : (
            <Button onClick={handleSaveCompany} disabled={isSaving} variant="primary" className="h-10 text-xs font-bold w-full sm:w-auto shadow-md">
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          )}
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Cabang / Toko</label>
            <div className="relative">
              <Building className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                type="text" 
                disabled={!isEditing} 
                value={formData.companyName} 
                onChange={(e) => setFormData({...formData, companyName: e.target.value})} 
                className="pl-11 disabled:bg-slate-50 disabled:text-slate-500 font-bold focus-visible:border-[#7A171D]" 
                placeholder="Cth: Toko Flash Global Pusat" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alamat Penjemputan Default</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-4 top-4 text-slate-400" />
              <textarea 
                disabled={!isEditing} 
                value={formData.defaultAddress} 
                onChange={(e) => setFormData({...formData, defaultAddress: e.target.value})} 
                rows={3} 
                className="flex w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-11 text-sm font-bold text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:border-[#7A171D] disabled:bg-slate-50 disabled:text-slate-500 resize-none shadow-sm" 
                placeholder="Alamat lengkap pergudangan..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CORPORATE B2B UPGRADE SECTION */}
      <div className={cn(
        "rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-xl border transition-all",
        contractStatus === "Approved" 
          ? "bg-gradient-to-br from-[#7A171D] via-[#5A0E13] to-[#4A0A10] border-red-500/20" 
          : "bg-slate-900 border-slate-800"
      )}>
        
        {/* Dekorasi Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none" />
        {contractStatus === "Approved" && (
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-red-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        )}
        
        {/* Konten Tergantung Status */}
        {contractStatus === "Approved" ? (
          // UI JIKA SUDAH APPROVED (KARTU VIP B2B ENTERPRISE)
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#C5A059] to-[#DFBE7B] rounded-2xl flex items-center justify-center shadow-lg mb-5 border border-white/20">
              <Crown className="w-8 h-8 text-[#7A171D]" />
            </div>
            <h2 className="text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#DFBE7B] to-[#C5A059]">Verified Corporate Partner</h2>
            <p className="text-white/80 text-sm font-medium mb-8 max-w-md mx-auto">Akun bisnis Anda telah tervalidasi. Anda sekarang berhak mendapatkan diskon khusus dan fitur bypass pembayaran (Piutang Net 30).</p>
            
            <div className="w-full max-w-md bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-left shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10"><CreditCard className="w-16 h-16 text-white"/></div>
              
              <div className="relative z-10">
                <p className="text-[10px] text-[#DFBE7B] font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5" /> Plafon Kredit Tersedia
                </p>
                <p className="text-3xl md:text-4xl font-black text-white tracking-tight">Rp {(b2bLimit / 1000000).toLocaleString('id-ID')} Juta</p>
                
                <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-white/70 font-medium">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Status Kontrak Aktif</span>
                  <span className="font-mono bg-white/10 px-2 py-1 rounded text-white">{b2bData.npwp || "B2B-VIP"}</span>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-white/50 mt-4 max-w-xs font-medium">Rincian penggunaan limit dan sisa saldo hutang (Outstanding) dapat dipantau melalui portal Finance bulanan Anda.</p>
          </div>
        ) : contractStatus === "Pending" ? (
          // UI JIKA PENDING REVIEW (KUNCI UI AGAR TIDAK SPAM)
          <div className="relative z-10 flex flex-col items-center text-center py-8">
            <div className="w-20 h-20 bg-amber-500/20 rounded-[2rem] flex items-center justify-center shadow-lg mb-6 border border-amber-500/30">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-2xl font-black mb-2 text-white">Pengajuan Sedang Ditinjau</h2>
            <p className="text-slate-400 text-sm font-medium max-w-md mx-auto leading-relaxed">
              Tim Kemitraan kami sedang memvalidasi data perusahaan Anda. Proses ini biasanya memakan waktu 1-2 hari kerja. Tim kami akan segera menghubungi Anda via WhatsApp.
            </p>
            <div className="mt-8 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/60 tracking-widest uppercase">
              Mohon Kesediaannya Menunggu
            </div>
          </div>
        ) : (
          // UI AWAL (BELUM MENGAJUKAN ATAU REJECTED)
          <>
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10 border-b border-slate-700/50 pb-6 mb-6">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-[#C5A059] to-[#DFBE7B] rounded-2xl flex items-center justify-center shadow-lg shrink-0 border border-white/10">
                  <Crown className="w-6 h-6 md:w-7 md:h-7 text-slate-900" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black mb-1">B2B Corporate Account</h2>
                  <p className="text-slate-400 text-xs md:text-sm font-medium">Daftarkan entitas bisnis Anda untuk mendapatkan fitur pembayaran tempo (Net 30).</p>
                </div>
              </div>
              {!showB2BForm && (
                <Button onClick={() => setShowB2BForm(true)} variant="gold" className="w-full md:w-auto h-12 shadow-lg whitespace-nowrap px-6">
                  Apply for Partnership <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>

            {contractStatus === "Rejected" && !showB2BForm && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 mb-6 relative z-10">
                 <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                 <div>
                   <p className="text-sm font-bold text-red-400">Pengajuan Sebelumnya Ditolak</p>
                   <p className="text-xs text-red-200 mt-1">Dokumen atau legalitas perusahaan Anda mungkin tidak sesuai. Silakan ajukan ulang dengan data yang benar.</p>
                 </div>
              </div>
            )}

            <AnimatePresence>
              {showB2BForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative z-10 overflow-hidden">
                  
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-2 backdrop-blur-sm">
                    <h3 className="text-[#C5A059] font-bold text-base md:text-lg mb-5 flex items-center gap-2">
                      <Briefcase className="w-5 h-5" /> Informasi Profil Bisnis
                    </h3>
                    
                    <form onSubmit={handleSubmitB2B} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Nama PIC */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Representative Name (PIC)</label>
                          <div className="relative">
                            <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input type="text" value={b2bData.picName} onChange={(e) => setB2bData({...b2bData, picName: e.target.value})} className="pl-11 bg-slate-900/50 border-slate-700 text-white focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/20" placeholder="Full Name" required />
                          </div>
                        </div>

                        {/* Legal Company Name */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Company Name (PT/CV)</label>
                          <div className="relative">
                            <Building className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input type="text" value={b2bData.legalCompanyName} onChange={(e) => setB2bData({...b2bData, legalCompanyName: e.target.value})} className="pl-11 bg-slate-900/50 border-slate-700 text-white focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/20" placeholder="PT. Logistik Super Nusantara" required />
                          </div>
                        </div>

                        {/* Tax ID / NPWP */}
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tax ID / Nomor NPWP <span className="text-slate-500 normal-case font-medium">(Wajib)</span></label>
                          <div className="relative">
                            <FileCheck className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input type="text" value={b2bData.npwp} onChange={(e) => setB2bData({...b2bData, npwp: e.target.value})} className="pl-11 bg-slate-900/50 border-slate-700 text-white focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/20 font-mono tracking-wider" placeholder="00.000.000.0-000.000" required />
                          </div>
                        </div>

                        {/* Industry Dropdown */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Industry</label>
                          <div className="relative">
                            <Building className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select value={b2bData.industry} onChange={(e) => setB2bData({...b2bData, industry: e.target.value})} className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900/50 text-white outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/20 transition-all font-semibold appearance-none" required>
                              <option value="" disabled className="text-slate-500">Pilih sektor industri...</option>
                              {industryOptions.map(opt => <option key={opt} value={opt} className="bg-slate-800 text-white">{opt}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Delivery Volume Dropdown */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Est. Monthly Delivery Volume</label>
                          <div className="relative">
                            <TrendingUp className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <select value={b2bData.volume} onChange={(e) => setB2bData({...b2bData, volume: e.target.value})} className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900/50 text-white outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/20 transition-all font-semibold appearance-none" required>
                              <option value="" disabled className="text-slate-500">Pilih estimasi volume...</option>
                              {volumeOptions.map(opt => <option key={opt} value={opt} className="bg-slate-800 text-white">{opt}</option>)}
                            </select>
                          </div>
                        </div>

                      </div>

                      <div className="pt-6 flex flex-col-reverse md:flex-row items-center justify-end gap-3 border-t border-white/10 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setShowB2BForm(false)} className="w-full md:w-auto h-12 text-slate-400 hover:text-white hover:bg-white/10 font-bold">
                          Batalkan
                        </Button>
                        <Button type="submit" disabled={isSaving} variant="gold" className="w-full md:w-auto h-12 px-8 shadow-lg font-bold">
                          {isSaving ? "Memproses..." : <><MessageCircle className="w-4 h-4 mr-2" /> Ajukan Kemitraan B2B</>}
                        </Button>
                      </div>
                    </form>

                  </div>
                  
                  <div className="flex gap-3 text-[11px] text-slate-400 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 mt-4 font-medium leading-relaxed shadow-inner">
                    <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                    <p>Dokumen legalitas fisik (SIUP/NIB/KTP Direktur) akan diminta oleh tim representatif kami setelah validasi profil bisnis awal ini disetujui.</p>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}