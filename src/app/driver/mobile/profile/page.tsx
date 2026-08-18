"use client";

import { useEffect, useState, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, CreditCard, Car, CheckCircle, ChevronRight, 
  ShieldCheck, FileText, Clock, AlertTriangle, Camera, Building2, Truck 
} from "lucide-react";
import Image from "next/image";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
 
// --- IMPORT KOMPONEN KITA ---
import Header from "@/components/driver/Header";
import OnboardingWizard from "./components/OnboardingWizard";
import { Button } from "@/components/ui/Button";

export default function DriverProfilePage() {
  const { user, login } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [dbUser, setDbUser] = useState<Record<string, unknown> | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) setDbUser(userDoc.data());
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [user]);

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploadingFoto(true);
    try {
      const uploadedUrl = await uploadToCloudinary(file);
      await updateDoc(doc(db, "users", user.uid), { photoURL: uploadedUrl });
      await updateDoc(doc(db, "driver_wallets", user.uid), { fotoProfileUrl: uploadedUrl }).catch(()=> {});
      setDbUser((prev) => prev ? { ...prev, photoURL: uploadedUrl } : null);
      
      // Update Zustand state dengan type yang aman
      login({ ...user, photoURL: uploadedUrl } as typeof user); 
      
      showToast("Foto profil diperbarui!", "success");
    } catch {
      showToast("Gagal mengunggah foto profil.", "error");
    } finally {
      setIsUploadingFoto(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[var(--brand-maroon)] rounded-full animate-spin shadow-sm"></div>
      </div>
    );
  }

  const isProfileComplete = dbUser?.profileCompleted === true;
  const isPendingApproval = isProfileComplete && dbUser?.status === "Pending";
  const isVerified = isProfileComplete && dbUser?.status === "Active";
  const isVendor = dbUser?.partnerType === "Vendor";

  return (
    <div className="min-h-screen font-sans relative">
      
      {/* 🚀 TOAST NOTIFICATION APPLE STYLE */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -50, scale: 0.95 }} 
            className={cn(
              "fixed top-4 left-4 right-4 z-[99999] p-4 rounded-[1.25rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 border backdrop-blur-md",
              toast.type === "success" 
                ? "bg-emerald-500/90 border-emerald-400 text-white" 
                : "bg-red-500/90 border-red-400 text-white"
            )}
          >
            {toast.type === "success" ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            <p className="text-sm font-bold tracking-tight">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 ONBOARDING WIZARD OVERLAY */}
      {showWizard && (
        <OnboardingWizard 
          dbUser={dbUser} 
          onClose={() => setShowWizard(false)} 
          showToast={showToast} 
          onSuccess={(payload: Record<string, unknown>) => {
            setDbUser(prev => prev ? { ...prev, profileCompleted: true, ...payload } : null);
            if (user) {
               login({ 
                 ...user, 
                 city: String(payload.domisili || ""), 
                 partnerType: String(payload.partnerType || ""), 
                 status: String(payload.status || "Pending"), 
                 ...payload 
               } as typeof user);
            }
            setShowWizard(false);
            showToast("Verifikasi berhasil dikirim ke Admin!", "success");
          }} 
        />
      )}

      {/* 🚀 HEADER SMART KITA */}
      <Header 
        title="Akun Saya" 
        showBack={false} 
        partnerType={isVendor ? "Vendor" : "Individual"} 
      />

      {/* 
        🚀 HERO PROFILE SECTION (Glassmorphism & Gradient)
        Menggantikan div bg-[#7A171D] yang flat
      */}
      <div className={cn(
        "pt-28 pb-16 px-6 rounded-b-[3rem] text-center relative shadow-lg overflow-hidden",
        isVendor ? "bg-gradient-to-b from-blue-900 to-[#0F172A]" : "bg-gradient-to-b from-[#9A242B] to-[#5A0E13]"
      )}>
        {/* Dekorasi Cahaya */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-[50px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/20 rounded-full blur-[40px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="w-28 h-28 mx-auto mb-4 relative group">
            <div className={cn(
              "w-full h-full rounded-[1.5rem] overflow-hidden border-4 border-white/20 shadow-xl backdrop-blur-md",
              isVendor ? 'bg-blue-900/50' : 'bg-white/10'
            )}>
              {isUploadingFoto ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div> 
              ) : (
                <Image 
                  src={(dbUser?.photoURL as string) || `https://ui-avatars.com/api/?name=${String(dbUser?.companyName || dbUser?.displayName || "Mitra")}&background=${isVendor ? '1e3a8a' : '5A0E13'}&color=fff&size=200`} 
                  alt="Avatar" 
                  fill 
                  className="object-cover" 
                />
              )}
            </div>
            {/* Tombol Kamera Melayang ala iOS */}
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleProfilePhotoUpload} className="hidden" />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className={cn(
                "absolute -bottom-2 -right-2 p-2.5 text-white rounded-xl shadow-lg active:scale-90 transition-transform tap-highlight-transparent",
                isVendor ? "bg-blue-500 hover:bg-blue-600" : "bg-[#C5A059] hover:bg-[#A68345]"
              )}
            >
              <Camera size={16} strokeWidth={2.5} />
            </button>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
            {String(isVendor ? dbUser?.companyName || "Perusahaan" : dbUser?.displayName || "Sopir")}
          </h2>
          <p className="text-white/70 text-sm font-medium mb-4">{String(dbUser?.email)}</p>
          
          {/* Badge Status */}
          {isVerified ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-500/50 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
              <ShieldCheck size={14} /> Terverifikasi {isVendor ? 'Vendor' : 'Mandiri'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
              {isVendor ? <Building2 size={14}/> : <User size={14} />} Akun Dasar (Belum Verifikasi)
            </span>
          )}
        </div>
      </div>

      <main className="p-5 -mt-8 relative z-20 space-y-5">
        
        {/* ALERTS: Minta Lengkapi Pendaftaran */}
        {!isProfileComplete && (
          <div className="glass-card bg-amber-50/90 border border-amber-200/50 rounded-[1.5rem] p-5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-amber-200/40 rounded-full blur-[10px]"></div>
            <div className="flex gap-3 relative z-10">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-amber-200">
                <AlertTriangle className="text-amber-600" size={20} />
              </div>
              <div className="w-full">
                <h3 className="text-sm font-black text-amber-900 mb-0.5 tracking-tight">Lengkapi Pendaftaran</h3>
                <p className="text-xs text-amber-800/80 mb-3 font-medium">Tentukan entitas Pribadi atau Perusahaan Anda sekarang untuk mulai menerima order.</p>
                <Button 
                  onClick={() => setShowWizard(true)} 
                  variant="gold" 
                  size="md" 
                  className="w-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_10px_rgba(217,119,6,0.2)]"
                >
                  Mulai Verifikasi Akun
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ALERTS: Menunggu Persetujuan Admin */}
        {isPendingApproval && (
          <div className="glass-card bg-blue-50/90 border border-blue-200/50 rounded-[1.5rem] p-5 flex gap-3 shadow-md">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-blue-200">
              <Clock className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-blue-900 mb-0.5 tracking-tight">Menunggu Persetujuan Admin</h3>
              <p className="text-xs text-blue-800/80 font-medium">Dokumen Anda sedang diperiksa secara manual oleh Tim Kemitraan Flash Global.</p>
            </div>
          </div>
        )}

        {/* INFO KENDARAAN / ARMADA (Tampil kalau udah diisi) */}
        {isProfileComplete && (
          <div className="glass-card rounded-[1.5rem] p-5 border border-slate-100/80 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-transform tap-highlight-transparent cursor-pointer" onClick={() => setShowWizard(true)}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-[1rem] flex items-center justify-center shadow-sm border",
                isVendor ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/20'
              )}>
                {isVendor ? <Truck size={24} /> : <Car size={24} />}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{String(isVendor ? 'Manajemen Armada' : dbUser?.vehicleType || "Tipe Kendaraan")}</p>
                <p className="text-base font-black text-slate-800 tracking-tight">{String(isVendor ? 'Akses Portal Vendor' : dbUser?.licensePlate || "Belum ada plat")}</p>
              </div>
            </div>
            <button className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-sm border transition-colors",
              isVendor ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            )}>
              Edit
            </button>
          </div>
        )}

        {/* MENU LIST (Apple Settings UI Vibe) */}
        <div className="glass-card rounded-[1.5rem] border border-slate-100/80 shadow-sm overflow-hidden flex flex-col">
          <MenuRow 
            icon={isVendor ? <Building2/> : <User />} 
            title={isVendor ? "Informasi PT/CV" : "Informasi Pribadi"} 
            iconColor={isVendor ? "text-blue-500" : "text-[#7A171D]"}
            bgIcon={isVendor ? "bg-blue-50" : "bg-[#7A171D]/10"}
          />
          <MenuRow 
            icon={<CreditCard />} 
            title={isVendor ? "Rekening Perusahaan" : "Rekening & Pencairan"} 
            iconColor="text-emerald-500"
            bgIcon="bg-emerald-50"
          />
          <MenuRow 
            icon={<FileText />} 
            title="Dokumen Legalitas" 
            iconColor="text-amber-500"
            bgIcon="bg-amber-50"
          />
          <MenuRow 
            icon={<ShieldCheck />} 
            title="Pusat Bantuan & Tiket" 
            border={false} 
            iconColor="text-indigo-500"
            bgIcon="bg-indigo-50"
          />
        </div>
      </main>
    </div>
  );
}

// Komponen Sub-Menu yang Lebih Clean ala iOS
function MenuRow({ 
  icon, title, border = true, iconColor = "text-slate-500", bgIcon = "bg-slate-100" 
}: { 
  icon: React.ReactNode, title: string, border?: boolean, iconColor?: string, bgIcon?: string 
}) {
  return (
    <button className={cn(
      "w-full flex items-center justify-between p-4 bg-transparent hover:bg-slate-50/50 transition-colors tap-highlight-transparent active:bg-slate-100",
      border ? 'border-b border-slate-100/80' : ''
    )}>
      <div className="flex items-center gap-3.5">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border border-white shadow-sm", bgIcon, iconColor)}>
          {/* Resize icon sedikit agar pas di kotak */}
          <div className="scale-75">{icon}</div> 
        </div>
        <span className="text-sm font-bold text-slate-800">{title}</span>
      </div>
      <ChevronRight className="text-slate-300" size={18} />
    </button>
  );
}