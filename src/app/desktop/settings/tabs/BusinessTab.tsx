"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Crown, ArrowRight, Building, 
  MapPin, User, Briefcase, TrendingUp, 
  FileCheck, ShieldAlert, MessageCircle, 
  Clock, CreditCard, Mail, Phone,
  CheckCircle2, ChevronDown, Check
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
  
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [contractStatus, setContractStatus] = useState<"Pending" | "Approved" | "Rejected" | null>(null);
  const [b2bLimit, setB2bLimit] = useState<number>(0);

  // State Profil Standar
  const [formData, setFormData] = useState({ 
    companyName: "", 
    defaultAddress: "" 
  });

  // State Form B2B
  const [b2bData, setB2bData] = useState({
    picName: "",
    legalCompanyName: "",
    npwp: "",
    companyPhone: "",
    companyEmail: "",
    industry: "",
    volume: ""
  });

  // State untuk Custom Dropdown
  const [openIndustry, setOpenIndustry] = useState(false);
  const [openVolume, setOpenVolume] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      setB2bData(prev => ({ ...prev, picName: user.displayName || "" }));
      
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            
            const profileComplete = Boolean(data.displayName && data.phone);
            setIsProfileComplete(profileComplete);

            setFormData({
              companyName: data.companyName || "",
              defaultAddress: data.defaultAddress || ""
            });
            setB2bData({
              picName: data.picName || user.displayName || "",
              legalCompanyName: data.companyName || "",
              npwp: data.npwp || "",
              companyPhone: data.companyPhone || "", 
              companyEmail: data.companyEmail || "", 
              industry: data.industry || "",
              volume: data.monthlyVolume || ""
            });
            setContractStatus(data.contractStatus || null);
            setB2bLimit(data.b2bLimit || 0);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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

  const handleSubmitB2B = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    // Validasi Custom Select
    if (!b2bData.industry || !b2bData.volume) {
      alert("Harap pilih Industri dan Estimasi Volume.");
      return;
    }

    setIsSaving(true);

    try {
      await setDoc(doc(db, "users", user.uid), {
        picName: b2bData.picName,
        companyName: b2bData.legalCompanyName, 
        npwp: b2bData.npwp,
        companyPhone: b2bData.companyPhone,
        companyEmail: b2bData.companyEmail,
        industry: b2bData.industry,
        monthlyVolume: b2bData.volume,
        contractStatus: "Pending", 
        b2bRequestedAt: serverTimestamp()
      }, { merge: true });

      setContractStatus("Pending");
      setShowB2BForm(false);

      const adminWhatsApp = "6281234567890"; 
      const message = `Halo Tim Kemitraan Flash Global,\n\nSaya tertarik untuk *Upgrade Akun Corporate (B2B)*. Berikut profil bisnis saya:\n\n👤 *Nama PIC:* ${b2bData.picName}\n🏢 *Nama PT/Entitas:* ${b2bData.legalCompanyName}\n📞 *No. Telp Perusahaan:* ${b2bData.companyPhone}\n✉️ *Email Perusahaan:* ${b2bData.companyEmail}\n📄 *NPWP:* ${b2bData.npwp || "-"}\n🏭 *Industri:* ${b2bData.industry}\n📦 *Estimasi Volume:* ${b2bData.volume}\n\nMohon informasi terkait dokumen legalitas lanjutan dan penawaran harga grosirnya. Terima kasih.`;
      
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
    return <div className="h-64 flex flex-col items-center justify-center text-slate-400 font-black tracking-widest text-xs uppercase animate-pulse">Memuat Profil Bisnis...</div>;
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* ====================================================== */}
      {/* 1. PROFIL BISNIS STANDAR (GLASS CARD) */}
      {/* ====================================================== */}
      <div className="glass-card rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white overflow-hidden relative transition-all duration-300">
        <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-slate-200/50 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="p-6 md:p-8 border-b border-white/60 flex flex-col sm:flex-row justify-between sm:items-center gap-5 bg-white/40 backdrop-blur-md relative z-10 shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)]">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Profil Cabang & Gudang</h2>
            <p className="text-slate-500 text-xs md:text-sm mt-1.5 font-medium leading-relaxed">Kelola identitas cabang dan titik penjemputan default untuk mempercepat proses pembuatan resi.</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="glass" className="h-12 text-sm font-black w-full sm:w-auto shadow-sm active:scale-95 border border-white">
              Edit Data Cabang
            </Button>
          ) : (
            <Button onClick={handleSaveCompany} disabled={isSaving} variant="primary" className="h-12 text-sm font-black w-full sm:w-auto shadow-md">
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          )}
        </div>

        <div className="p-6 md:p-8 space-y-6 relative z-10 bg-white/20">
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Cabang / Toko</label>
            <div className="relative">
              <Building className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                type="text" 
                disabled={!isEditing} 
                value={formData.companyName} 
                onChange={(e) => setFormData({...formData, companyName: e.target.value})} 
                className={cn("pl-12 h-14 font-black transition-all", !isEditing && "opacity-70 bg-slate-50 cursor-not-allowed")} 
                placeholder="Cth: Toko Flash Global Pusat" 
              />
            </div>
          </div>
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Alamat Penjemputan Default</label>
            <div className="relative">
              <MapPin className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
              <textarea 
                disabled={!isEditing} 
                value={formData.defaultAddress} 
                onChange={(e) => setFormData({...formData, defaultAddress: e.target.value})} 
                rows={3} 
                className={cn("flex w-full rounded-[1.25rem] border border-white bg-white/60 backdrop-blur-md px-5 py-4 pl-12 text-sm font-bold text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#7A171D]/15 focus-visible:border-[#7A171D]/50 resize-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]", !isEditing && "opacity-70 bg-slate-50 cursor-not-allowed")} 
                placeholder="Alamat lengkap pergudangan..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* 2. CORPORATE B2B UPGRADE SECTION (3D PREMIUM CARDS) */}
      {/* ====================================================== */}
      <div className={cn(
        "rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.2)] border transition-all duration-500",
        contractStatus === "Approved" 
          ? "bg-gradient-to-br from-[#7A171D] via-[#5A0E13] to-[#3a060a] border-[#9A242B]/30" 
          : "bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800"
      )}>
        
        {/* Dekorasi Background 3D */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none z-0" />
        {contractStatus === "Approved" && (
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-red-500 rounded-full blur-[120px] opacity-30 pointer-events-none z-0" />
        )}
        
        {/* --- STATUS: APPROVED (KARTU VIP) --- */}
        {contractStatus === "Approved" ? (
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#EAD098] via-[#C5A059] to-[#A68345] rounded-[1.5rem] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_10px_20px_rgba(197,160,89,0.4)] mb-6 border border-white/40">
              <Crown className="w-10 h-10 text-[#5A0E13] drop-shadow-sm" />
            </div>
            <h2 className="text-3xl font-black mb-3 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#DFBE7B] via-[#C5A059] to-[#DFBE7B]">Verified Corporate Partner</h2>
            <p className="text-white/80 text-sm font-medium mb-10 max-w-md mx-auto leading-relaxed">Akun bisnis Anda telah tervalidasi. Anda sekarang berhak mendapatkan diskon khusus dan fitur bypass pembayaran (Piutang Net 30).</p>
            
            {/* Kartu Limit Kredit */}
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-[2rem] p-8 border border-white/20 text-left shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_20px_40px_rgba(0,0,0,0.3)] relative overflow-hidden group hover:bg-white/15 transition-colors duration-300">
              <div className="absolute top-[-20%] right-[-10%] p-6 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500"><CreditCard className="w-32 h-32 text-white"/></div>
              
              <div className="relative z-10">
                <p className="text-[10px] text-[#DFBE7B] font-black uppercase tracking-widest mb-2 flex items-center gap-2 drop-shadow-md">
                  <ShieldAlert className="w-4 h-4" /> Plafon Kredit Tersedia
                </p>
                <p className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg">Rp {(b2bLimit / 1000000).toLocaleString('id-ID')} Jt</p>
                
                <div className="mt-8 pt-6 border-t border-white/20 flex items-center justify-between text-xs text-white/80 font-bold">
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Status Aktif</span>
                  <span className="font-mono bg-black/40 px-3 py-1.5 rounded-lg text-[#DFBE7B] shadow-inner">{b2bData.npwp || "B2B-VIP"}</span>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-white/50 mt-6 max-w-sm font-bold uppercase tracking-widest leading-relaxed">Rincian penggunaan limit dan sisa saldo hutang dapat dipantau melalui portal Finance Anda.</p>
          </div>

        ) : contractStatus === "Pending" ? (
          
          /* --- STATUS: PENDING REVIEW --- */
          <div className="relative z-10 flex flex-col items-center text-center py-10">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[1.5rem] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_10px_20px_rgba(217,119,6,0.3)] mb-6 border border-amber-300">
              <Clock className="w-10 h-10 text-white drop-shadow-sm" />
            </div>
            <h2 className="text-3xl font-black mb-4 text-white tracking-tight">Pengajuan Sedang Ditinjau</h2>
            <p className="text-slate-400 text-sm font-medium max-w-md mx-auto leading-relaxed mb-10">
              Tim Kemitraan kami sedang memvalidasi data perusahaan Anda. Proses ini biasanya memakan waktu 1-2 hari kerja. Tim kami akan segera menghubungi Anda via WhatsApp.
            </p>
            <div className="px-6 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black text-amber-400 tracking-widest uppercase shadow-sm">
              Mohon Kesediaannya Menunggu
            </div>
          </div>

        ) : (
          
          /* --- STATUS: BELUM MENGAJUKAN ATAU REJECTED --- */
          <>
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative z-10 border-b border-slate-700/50 pb-8 mb-8">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#DFBE7B] to-[#A68345] rounded-[1.25rem] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),0_8px_16px_rgba(197,160,89,0.3)] shrink-0 border border-white/20">
                  <Crown className="w-7 h-7 md:w-8 md:h-8 text-[#5A0E13] drop-shadow-sm" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black mb-1 tracking-tight text-white">B2B Corporate Account</h2>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">Daftarkan entitas bisnis Anda untuk mendapatkan fitur pembayaran tempo (Net 30).</p>
                </div>
              </div>
              
              {!isProfileComplete ? (
                <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/30 p-4 rounded-[1.25rem] flex items-start gap-3 w-full md:w-auto shadow-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-amber-400 tracking-tight">Profil Belum Lengkap</p>
                    <p className="text-xs text-amber-200/80 mt-1 font-medium">Lengkapi Nama & No. HP di tab Profil sebelum mengajukan.</p>
                  </div>
                </div>
              ) : (
                !showB2BForm && (
                  <Button onClick={() => setShowB2BForm(true)} variant="gold" className="w-full md:w-auto h-14 rounded-[1.25rem] shadow-[0_8px_20px_rgba(197,160,89,0.3)] whitespace-nowrap px-8 text-sm active:scale-95">
                    Ajukan Kemitraan <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )
              )}
            </div>

            {contractStatus === "Rejected" && !showB2BForm && (
              <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 p-5 rounded-[1.5rem] flex items-start gap-4 mb-8 relative z-10 shadow-sm">
                 <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
                 <div>
                   <p className="text-base font-black text-red-400 tracking-tight">Pengajuan Sebelumnya Ditolak</p>
                   <p className="text-sm text-red-200/80 mt-1.5 font-medium leading-relaxed">Dokumen atau legalitas perusahaan Anda mungkin tidak sesuai. Silakan ajukan ulang dengan data yang benar.</p>
                 </div>
              </div>
            )}

            <AnimatePresence>
              {showB2BForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative z-10 overflow-visible">
                  
                  <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-[2rem] p-6 md:p-8 mb-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)]">
                    <h3 className="text-[#C5A059] font-black text-lg md:text-xl mb-8 flex items-center gap-2 tracking-tight">
                      <Briefcase className="w-5 h-5" /> Informasi Profil Bisnis
                    </h3>
                    
                    <form onSubmit={handleSubmitB2B} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Nama PIC */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Representative Name (PIC)</label>
                          <div className="relative">
                            <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input type="text" value={b2bData.picName} onChange={(e) => setB2bData({...b2bData, picName: e.target.value})} className="pl-12 h-14 bg-slate-900/60 border-slate-700 text-white font-bold focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/20 shadow-inner" placeholder="Full Name" required />
                          </div>
                        </div>

                        {/* Legal Company Name */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Company Name (PT/CV)</label>
                          <div className="relative">
                            <Building className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input type="text" value={b2bData.legalCompanyName} onChange={(e) => setB2bData({...b2bData, legalCompanyName: e.target.value})} className="pl-12 h-14 bg-slate-900/60 border-slate-700 text-white font-bold focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/20 shadow-inner" placeholder="PT. Logistik Super Nusantara" required />
                          </div>
                        </div>
                        
                        {/* Company Phone */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Company Phone / No Telp</label>
                          <div className="relative">
                            <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input type="tel" value={b2bData.companyPhone} onChange={(e) => setB2bData({...b2bData, companyPhone: e.target.value})} className="pl-12 h-14 bg-slate-900/60 border-slate-700 text-white font-bold focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/20 shadow-inner" placeholder="+6281234567890" required />
                          </div>
                        </div>

                        {/* Company Email */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Company Email</label>
                          <div className="relative">
                            <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input type="email" value={b2bData.companyEmail} onChange={(e) => setB2bData({...b2bData, companyEmail: e.target.value})} className="pl-12 h-14 bg-slate-900/60 border-slate-700 text-white font-bold focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/20 shadow-inner" placeholder="finance@perusahaan.com" required />
                          </div>
                        </div>

                        {/* Tax ID / NPWP */}
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tax ID / Nomor NPWP <span className="text-slate-500 normal-case font-bold">(Wajib)</span></label>
                          <div className="relative">
                            <FileCheck className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <Input type="text" value={b2bData.npwp} onChange={(e) => setB2bData({...b2bData, npwp: e.target.value})} className="pl-12 h-14 bg-slate-900/60 border-slate-700 text-white font-bold focus-visible:border-[#C5A059] focus-visible:ring-[#C5A059]/20 font-mono tracking-wider shadow-inner" placeholder="00.000.000.0-000.000" required />
                          </div>
                        </div>

                        {/* ======================================================== */}
                        {/* CUSTOM DROPDOWN: INDUSTRY */}
                        {/* ======================================================== */}
                        <div className="space-y-2 relative">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Industry</label>
                          
                          {/* Invisible Backdrop to close dropdown when clicking outside */}
                          {openIndustry && <div className="fixed inset-0 z-30" onClick={() => setOpenIndustry(false)} />}
                          
                          <div className="relative z-40">
                            <button 
                              type="button" 
                              onClick={() => { setOpenIndustry(!openIndustry); setOpenVolume(false); }}
                              className={cn(
                                "w-full flex items-center justify-between pl-12 pr-5 h-14 rounded-2xl border transition-all text-sm font-bold shadow-inner outline-none",
                                openIndustry ? "border-[#C5A059] bg-slate-900 ring-4 ring-[#C5A059]/20 text-white" : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                              )}
                            >
                              <Building className="w-5 h-5 absolute left-4 text-slate-500" />
                              <span className="truncate">{b2bData.industry || "Pilih sektor industri..."}</span>
                              <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openIndustry && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                              {openIndustry && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                  transition={{ duration: 0.2 }}
                                  className="absolute top-[calc(100%+8px)] left-0 w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden py-2"
                                >
                                  {industryOptions.map(opt => (
                                    <div 
                                      key={opt} 
                                      onClick={() => { setB2bData({...b2bData, industry: opt}); setOpenIndustry(false); }}
                                      className={cn(
                                        "px-5 py-3.5 text-sm font-bold cursor-pointer transition-colors flex items-center justify-between group",
                                        b2bData.industry === opt ? "text-[#DFBE7B] bg-white/5" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                      )}
                                    >
                                      {opt}
                                      {b2bData.industry === opt && <Check className="w-4 h-4 text-[#DFBE7B]" />}
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* ======================================================== */}
                        {/* CUSTOM DROPDOWN: VOLUME */}
                        {/* ======================================================== */}
                        <div className="space-y-2 relative">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Est. Monthly Delivery Volume</label>
                          
                          {openVolume && <div className="fixed inset-0 z-30" onClick={() => setOpenVolume(false)} />}
                          
                          <div className="relative z-40">
                            <button 
                              type="button" 
                              onClick={() => { setOpenVolume(!openVolume); setOpenIndustry(false); }}
                              className={cn(
                                "w-full flex items-center justify-between pl-12 pr-5 h-14 rounded-2xl border transition-all text-sm font-bold shadow-inner outline-none",
                                openVolume ? "border-[#C5A059] bg-slate-900 ring-4 ring-[#C5A059]/20 text-white" : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500"
                              )}
                            >
                              <TrendingUp className="w-5 h-5 absolute left-4 text-slate-500" />
                              <span className="truncate">{b2bData.volume || "Pilih estimasi volume..."}</span>
                              <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openVolume && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                              {openVolume && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                  transition={{ duration: 0.2 }}
                                  className="absolute top-[calc(100%+8px)] left-0 w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden py-2"
                                >
                                  {volumeOptions.map(opt => (
                                    <div 
                                      key={opt} 
                                      onClick={() => { setB2bData({...b2bData, volume: opt}); setOpenVolume(false); }}
                                      className={cn(
                                        "px-5 py-3.5 text-sm font-bold cursor-pointer transition-colors flex items-center justify-between group",
                                        b2bData.volume === opt ? "text-[#DFBE7B] bg-white/5" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                      )}
                                    >
                                      {opt}
                                      {b2bData.volume === opt && <Check className="w-4 h-4 text-[#DFBE7B]" />}
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                      </div>

                      {/* Form Actions */}
                      <div className="pt-8 flex flex-col-reverse md:flex-row items-center justify-end gap-4 border-t border-slate-700/50 mt-8">
                        <Button type="button" variant="ghost" onClick={() => setShowB2BForm(false)} className="w-full md:w-auto h-14 text-slate-400 hover:text-white hover:bg-slate-800 font-bold rounded-2xl">
                          Batalkan
                        </Button>
                        <Button type="submit" disabled={isSaving} variant="gold" className="w-full md:w-auto h-14 px-10 shadow-[0_10px_20px_rgba(197,160,89,0.3)] font-black text-sm rounded-2xl active:scale-95">
                          {isSaving ? "Memproses Data..." : <><MessageCircle className="w-5 h-5 mr-2" /> Ajukan Kemitraan B2B</>}
                        </Button>
                      </div>
                    </form>

                  </div>
                  
                  <div className="flex gap-4 text-xs text-slate-400 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/50 mt-4 font-medium leading-relaxed shadow-inner">
                    <ShieldAlert className="w-6 h-6 text-amber-500/70 shrink-0" />
                    <p>Dokumen legalitas fisik (SIUP / NIB / KTP Direktur) akan diminta oleh tim representatif kami setelah validasi profil bisnis awal ini disetujui.</p>
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