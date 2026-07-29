"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Crown, ArrowRight, Building, 
  MapPin, User, Briefcase, TrendingUp, 
  FileCheck, ShieldAlert, MessageCircle, 
  Clock, Mail, Phone,
  ChevronDown, Check, Save,
  CheckCircle2
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

  const [formData, setFormData] = useState({ 
    companyName: "", 
    defaultAddress: "" 
  });

  const [b2bData, setB2bData] = useState({
    picName: "",
    legalCompanyName: "",
    npwp: "",
    companyPhone: "",
    companyEmail: "",
    industry: "",
    volume: ""
  });

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

  const handleSubmitB2B = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.uid) return;
    
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
      
      window.open(`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`, "_blank");

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
    <div className="space-y-6 font-sans pb-10">
      
      {/* ====================================================== */}
      {/* 1. PROFIL BISNIS STANDAR (GLASS CARD) */}
      {/* ====================================================== */}
      <div className="glass-card rounded-[2rem] shadow-sm border border-slate-200 bg-white relative transition-all duration-300">
        
        <div className="p-5 border-b border-slate-100 flex flex-col justify-between gap-3 bg-slate-50/50 rounded-t-[2rem]">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Cabang & Gudang</h2>
            <p className="text-slate-500 text-[10px] mt-1 font-medium leading-relaxed">Kelola identitas cabang dan titik penjemputan default.</p>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="h-10 text-xs font-black w-full border-slate-300 shadow-sm active:scale-95 text-slate-700">
              Edit Data Cabang
            </Button>
          )}
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Cabang / Toko</label>
            <div className="relative">
              <Building className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                type="text" 
                disabled={!isEditing} 
                value={formData.companyName} 
                onChange={(e) => setFormData({...formData, companyName: e.target.value})} 
                className={cn("pl-11 h-12 text-sm font-black transition-all", !isEditing && "opacity-70 bg-slate-50 cursor-not-allowed")} 
                placeholder="Cth: Toko Flash Global" 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Alamat Penjemputan Default</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-4 top-4 text-slate-400" />
              <textarea 
                disabled={!isEditing} 
                value={formData.defaultAddress} 
                onChange={(e) => setFormData({...formData, defaultAddress: e.target.value})} 
                rows={3} 
                className={cn("flex w-full rounded-2xl border border-slate-200 px-4 py-3 pl-11 text-sm font-bold text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 resize-none shadow-sm", !isEditing && "opacity-70 bg-slate-50 cursor-not-allowed")} 
                placeholder="Alamat lengkap pergudangan..."
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================== */}
      {/* 2. CORPORATE B2B UPGRADE SECTION */}
      {/* ====================================================== */}
      <div className={cn(
        "rounded-[2rem] p-6 text-white relative overflow-hidden shadow-lg border transition-all duration-500",
        contractStatus === "Approved" 
          ? "bg-gradient-to-br from-[#7A171D] via-[#5A0E13] to-[#3a060a] border-[#9A242B]/30" 
          : "bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800"
      )}>
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-20 pointer-events-none z-0" />
        
        {/* --- STATUS: APPROVED (KARTU VIP) --- */}
        {contractStatus === "Approved" ? (
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-[#EAD098] via-[#C5A059] to-[#A68345] rounded-[1.25rem] flex items-center justify-center shadow-md mb-4 border border-white/40">
              <Crown className="w-6 h-6 text-[#5A0E13]" />
            </div>
            <h2 className="text-xl font-black mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#DFBE7B] to-[#EAD098]">Verified Corporate</h2>
            <p className="text-white/80 text-[10px] font-medium mb-6 leading-relaxed">Diskon khusus dan fitur pembayaran tempo (Net 30) telah aktif untuk akun Anda.</p>
            
            <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-left shadow-inner">
              <p className="text-[9px] text-[#DFBE7B] font-black uppercase tracking-widest mb-1 flex items-center gap-1.5 drop-shadow-sm">
                <ShieldAlert className="w-3.5 h-3.5" /> Plafon Kredit Tersedia
              </p>
              <p className="text-3xl font-black text-white tracking-tighter drop-shadow-md">Rp {(b2bLimit / 1000000).toLocaleString('id-ID')} Jt</p>
              
              <div className="mt-4 pt-3 border-t border-white/20 flex justify-between items-center text-[10px] font-bold text-emerald-400">
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Status Aktif</span>
                <span className="font-mono bg-black/40 px-2 py-1 rounded text-[#DFBE7B]">{b2bData.npwp || "B2B-VIP"}</span>
              </div>
            </div>
          </div>

        ) : contractStatus === "Pending" ? (
          
          /* --- STATUS: PENDING REVIEW --- */
          <div className="relative z-10 flex flex-col items-center text-center py-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[1.25rem] flex items-center justify-center shadow-sm mb-4 border border-amber-300">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-lg font-black mb-2 text-white tracking-tight">Sedang Ditinjau</h2>
            <p className="text-slate-400 text-[11px] font-medium leading-relaxed mb-6">
              Tim Kemitraan sedang memvalidasi data Anda. Proses memakan waktu 1-2 hari kerja.
            </p>
            <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-[9px] font-black text-amber-400 tracking-widest uppercase shadow-sm">
              Mohon Kesediaannya Menunggu
            </div>
          </div>

        ) : (
          
          /* --- STATUS: BELUM MENGAJUKAN ATAU REJECTED --- */
          <>
            <div className="flex items-center gap-4 relative z-10 border-b border-slate-700/50 pb-5 mb-5">
              <div className="w-12 h-12 bg-gradient-to-br from-[#DFBE7B] to-[#A68345] rounded-[1rem] flex items-center justify-center shadow-sm shrink-0 border border-white/20">
                <Crown className="w-6 h-6 text-[#5A0E13]" />
              </div>
              <div>
                <h2 className="text-lg font-black mb-0.5 tracking-tight text-white">B2B Corporate Account</h2>
                <p className="text-slate-400 text-[10px] font-medium leading-relaxed">Dapatkan fitur pembayaran tempo (Net 30).</p>
              </div>
            </div>
            
            <div className="relative z-10">
              {!isProfileComplete ? (
                <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/30 p-4 rounded-[1rem] flex items-start gap-3 shadow-sm">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-amber-400 tracking-tight mb-1">Profil Belum Lengkap</p>
                    <p className="text-[10px] text-amber-200/80 font-medium">Lengkapi Nama & No. HP di tab Profil terlebih dahulu.</p>
                  </div>
                </div>
              ) : (
                !showB2BForm && (
                  <Button onClick={() => setShowB2BForm(true)} variant="gold" className="w-full h-12 rounded-[1rem] shadow-sm text-sm active:scale-95 text-[#5A0E13] font-black">
                    Ajukan Kemitraan <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                )
              )}

              {contractStatus === "Rejected" && !showB2BForm && (
                <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 p-4 rounded-[1rem] flex items-start gap-3 mt-4 shadow-sm">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-red-400 tracking-tight">Pengajuan Ditolak</p>
                    <p className="text-[10px] text-red-200/80 mt-1 font-medium leading-relaxed">Dokumen tidak sesuai. Silakan ajukan ulang.</p>
                  </div>
                </div>
              )}
            </div>

            {/* FORM PENGAJUAN B2B MUNCUL DI SINI */}
            <AnimatePresence>
              {showB2BForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="relative z-10 overflow-visible mt-6">
                  
                  <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-[1.5rem] p-5 shadow-inner">
                    <h3 className="text-[#C5A059] font-black text-sm mb-5 flex items-center gap-2 tracking-tight">
                      <Briefcase className="w-4 h-4" /> Informasi Bisnis
                    </h3>
                    
                    <form id="b2b-form" onSubmit={handleSubmitB2B} className="space-y-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Representative Name (PIC)</label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input type="text" value={b2bData.picName} onChange={(e) => setB2bData({...b2bData, picName: e.target.value})} className="pl-10 h-12 bg-slate-900/60 border-slate-700 text-white font-bold text-xs" placeholder="Full Name" required />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Company Name (PT/CV)</label>
                        <div className="relative">
                          <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input type="text" value={b2bData.legalCompanyName} onChange={(e) => setB2bData({...b2bData, legalCompanyName: e.target.value})} className="pl-10 h-12 bg-slate-900/60 border-slate-700 text-white font-bold text-xs" placeholder="PT. Logistik Super" required />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Company Phone</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input type="tel" value={b2bData.companyPhone} onChange={(e) => setB2bData({...b2bData, companyPhone: e.target.value})} className="pl-10 h-12 bg-slate-900/60 border-slate-700 text-white font-bold text-xs" placeholder="+6281234567890" required />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Company Email</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input type="email" value={b2bData.companyEmail} onChange={(e) => setB2bData({...b2bData, companyEmail: e.target.value})} className="pl-10 h-12 bg-slate-900/60 border-slate-700 text-white font-bold text-xs" placeholder="finance@perusahaan.com" required />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Nomor NPWP (Wajib)</label>
                        <div className="relative">
                          <FileCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                          <Input type="text" value={b2bData.npwp} onChange={(e) => setB2bData({...b2bData, npwp: e.target.value})} className="pl-10 h-12 bg-slate-900/60 border-slate-700 text-white font-bold font-mono tracking-wider text-xs" placeholder="00.000.000.0-000.000" required />
                        </div>
                      </div>

                      {/* DROPDOWN CUSTOM: INDUSTRY */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Industry</label>
                        {openIndustry && <div className="fixed inset-0 z-30" onClick={() => setOpenIndustry(false)} />}
                        <div className="relative z-40">
                          <button type="button" onClick={() => { setOpenIndustry(!openIndustry); setOpenVolume(false); }} className={cn("w-full flex items-center justify-between pl-10 pr-4 h-12 rounded-xl border transition-all text-xs font-bold outline-none", openIndustry ? "border-[#C5A059] bg-slate-900 ring-2 ring-[#C5A059]/20 text-white" : "border-slate-700 bg-slate-900/60 text-slate-300")}>
                            <Building className="w-4 h-4 absolute left-3 text-slate-500" />
                            <span className="truncate">{b2bData.industry || "Pilih industri..."}</span>
                            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openIndustry && "rotate-180")} />
                          </button>
                          <AnimatePresence>
                            {openIndustry && (
                              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute bottom-full mb-2 left-0 w-full bg-slate-800/95 backdrop-blur-xl border border-slate-600 rounded-xl shadow-2xl overflow-hidden py-2">
                                {industryOptions.map(opt => (
                                  <div key={opt} onClick={() => { setB2bData({...b2bData, industry: opt}); setOpenIndustry(false); }} className={cn("px-4 py-3 text-xs font-bold cursor-pointer flex justify-between", b2bData.industry === opt ? "text-[#DFBE7B] bg-white/5" : "text-slate-300 hover:bg-slate-700")}>
                                    {opt} {b2bData.industry === opt && <Check className="w-3.5 h-3.5 text-[#DFBE7B]" />}
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {/* DROPDOWN CUSTOM: VOLUME */}
                      <div className="space-y-1.5 relative">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Est. Volume / Bulan</label>
                        {openVolume && <div className="fixed inset-0 z-30" onClick={() => setOpenVolume(false)} />}
                        <div className="relative z-40">
                          <button type="button" onClick={() => { setOpenVolume(!openVolume); setOpenIndustry(false); }} className={cn("w-full flex items-center justify-between pl-10 pr-4 h-12 rounded-xl border transition-all text-xs font-bold outline-none", openVolume ? "border-[#C5A059] bg-slate-900 ring-2 ring-[#C5A059]/20 text-white" : "border-slate-700 bg-slate-900/60 text-slate-300")}>
                            <TrendingUp className="w-4 h-4 absolute left-3 text-slate-500" />
                            <span className="truncate">{b2bData.volume || "Pilih volume..."}</span>
                            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openVolume && "rotate-180")} />
                          </button>
                          <AnimatePresence>
                            {openVolume && (
                              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute bottom-full mb-2 left-0 w-full bg-slate-800/95 backdrop-blur-xl border border-slate-600 rounded-xl shadow-2xl overflow-hidden py-2">
                                {volumeOptions.map(opt => (
                                  <div key={opt} onClick={() => { setB2bData({...b2bData, volume: opt}); setOpenVolume(false); }} className={cn("px-4 py-3 text-[10px] font-bold cursor-pointer flex justify-between", b2bData.volume === opt ? "text-[#DFBE7B] bg-white/5" : "text-slate-300 hover:bg-slate-700")}>
                                    {opt} {b2bData.volume === opt && <Check className="w-3.5 h-3.5 text-[#DFBE7B]" />}
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                    </form>
                  </div>
                  
                  <div className="flex gap-3 text-[10px] text-slate-400 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50 mt-4 font-medium leading-relaxed">
                    <ShieldAlert className="w-4 h-4 text-amber-500/70 shrink-0" />
                    <p>Dokumen legalitas fisik (SIUP/NIB/KTP) akan diminta oleh tim CS setelah profil divalidasi.</p>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* BOTTOM ACTION BAR (STICKY) */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        {isEditing ? (
           <Button onClick={handleSaveCompany} disabled={isSaving} variant="primary" className="w-full h-14 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white rounded-[1.25rem] font-black shadow-md border border-[#5A0E13] text-sm">
             {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Save className="w-5 h-5 mr-2" /> Simpan Cabang</>}
           </Button>
        ) : showB2BForm ? (
           <div className="flex gap-3">
             <Button type="button" variant="outline" onClick={() => setShowB2BForm(false)} className="w-24 h-14 text-slate-500 font-black rounded-2xl">Batal</Button>
             <Button type="submit" form="b2b-form" disabled={isSaving} variant="gold" className="flex-1 h-14 font-black text-sm rounded-2xl text-[#5A0E13]">
               {isSaving ? "Mengirim..." : <><MessageCircle className="w-4 h-4 mr-2" /> Ajukan B2B</>}
             </Button>
           </div>
        ) : (
           <Button onClick={() => window.history.back()} variant="outline" className="w-full h-14 text-slate-600 border-slate-200 bg-white font-black rounded-[1.25rem] text-sm shadow-sm">
             Tutup Pengaturan
           </Button>
        )}
      </div>
      
    </div>
  );
}