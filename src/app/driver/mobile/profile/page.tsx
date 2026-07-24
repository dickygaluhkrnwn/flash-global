"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import Header from "@/components/driver/Header";
import { motion, AnimatePresence } from "framer-motion";
import { User, CreditCard, Car, CheckCircle, ChevronRight, LogOut, ShieldCheck, FileText, Clock, AlertTriangle, Camera, Building2, Truck } from "lucide-react";
import Image from "next/image";
import { uploadToCloudinary } from "@/lib/cloudinary";
import OnboardingWizard from "./components/OnboardingWizard";

export default function DriverProfilePage() {
  const router = useRouter();
  const { user, login, logout } = useAuthStore();
  
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

  const handleLogout = async () => {
    await signOut(auth);
    logout();
    router.replace("/driver/login");
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploadingFoto(true);
    try {
      const uploadedUrl = await uploadToCloudinary(file);
      await updateDoc(doc(db, "users", user.uid), { photoURL: uploadedUrl });
      await updateDoc(doc(db, "driver_wallets", user.uid), { fotoProfileUrl: uploadedUrl }).catch(()=> {});
      setDbUser((prev) => prev ? { ...prev, photoURL: uploadedUrl } : null);
      
      // 🚀 KUNCI PERBAIKAN: Hilangkan cast any, sebutkan tipe yang jelas
      login({ ...user, photoURL: uploadedUrl } as typeof user); 
      
      showToast("Foto profil diperbarui!", "success");
    } catch {
      showToast("Gagal mengunggah foto profil.", "error");
    } finally {
      setIsUploadingFoto(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center"><div className="w-10 h-10 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin"></div></div>;
  }

  const isProfileComplete = dbUser?.profileCompleted === true;
  const isPendingApproval = isProfileComplete && dbUser?.status === "Pending";
  const isVerified = isProfileComplete && dbUser?.status === "Active";
  const isVendor = dbUser?.partnerType === "Vendor";

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 relative">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className={`fixed top-4 left-4 right-4 z-[99999] p-4 rounded-2xl shadow-xl flex items-center gap-3 border ${toast.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"}`}>
            {toast.type === "success" ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            <p className="text-sm font-bold leading-tight">{toast.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER WIZARD OVERLAY KALAU DIBUKA */}
      {showWizard && (
        <OnboardingWizard 
          dbUser={dbUser} 
          onClose={() => setShowWizard(false)} 
          showToast={showToast} 
          onSuccess={(payload: Record<string, unknown>) => {
            setDbUser(prev => prev ? { ...prev, profileCompleted: true, ...payload } : null);
            
            // 🚀 PERBAIKAN: Cast eksplisit ke typeof user
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

      {/* TAMPILAN PROFIL UTAMA (RENDER TERUS DI BELAKANG WIZARD) */}
      <Header title="Profil Kemitraan" rightNode={<button onClick={handleLogout} className="text-[#7A171D] p-2 bg-red-50 rounded-full"><LogOut size={18} /></button>} />

      <div className="bg-[#7A171D] pt-6 pb-14 px-6 rounded-b-[2.5rem] text-center relative shadow-md">
        <div className="relative z-10">
          <div className="w-24 h-24 mx-auto mb-3 relative">
            <div className={`w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg ${isVendor ? 'bg-blue-100' : 'bg-slate-200'}`}>
              {isUploadingFoto ? <div className="absolute inset-0 flex items-center justify-center bg-slate-200/80"><div className="w-6 h-6 border-2 border-[#7A171D] border-t-transparent rounded-full animate-spin"></div></div> 
              : <Image src={(dbUser?.photoURL as string) || `https://ui-avatars.com/api/?name=${String(dbUser?.companyName || dbUser?.displayName || "Mitra")}&background=${isVendor ? '2563eb' : 'C5A059'}&color=fff&size=150`} alt="Avatar" fill className="object-cover" />}
            </div>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleProfilePhotoUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2 bg-[#C5A059] text-white rounded-full border-2 border-white"><Camera size={14} /></button>
          </div>
          <h2 className="text-xl font-black text-white">{String(isVendor ? dbUser?.companyName : dbUser?.displayName)}</h2>
          <p className="text-white/70 text-sm font-medium mb-3">{String(dbUser?.email)}</p>
          
          {isVerified ? (
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase"><ShieldCheck size={14} /> Terverifikasi {isVendor ? 'Vendor' : 'Mandiri'}</span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-white/20 text-white border border-white/30 px-3 py-1 rounded-full text-xs font-bold uppercase">{isVendor ? <Building2 size={14}/> : <User size={14} />} Akun Dasar</span>
          )}
        </div>
      </div>

      <main className="p-5 -mt-8 relative z-20 space-y-5">
        {!isProfileComplete && (
          <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex gap-3 relative z-10">
              <AlertTriangle className="text-amber-500 mt-0.5" size={24} />
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-1">Lengkapi Pendaftaran</h3>
                <p className="text-xs text-slate-500 mb-4">Tentukan entitas Pribadi atau Perusahaan Anda sekarang.</p>
                <button onClick={() => setShowWizard(true)} className="w-full bg-amber-500 text-white text-sm font-bold py-3 rounded-xl">Mulai Verifikasi Akun</button>
              </div>
            </div>
          </div>
        )}

        {isPendingApproval && (
          <div className="bg-white border border-blue-200 rounded-2xl p-5 flex gap-3">
            <Clock className="text-blue-500 mt-0.5" size={24} />
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Menunggu Persetujuan Admin</h3>
              <p className="text-xs text-slate-500">Dokumen Anda sedang diperiksa oleh Tim Fleet Management.</p>
            </div>
          </div>
        )}

        {isProfileComplete && (
          <div className="glass-card rounded-2xl p-5 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isVendor ? 'bg-blue-50 text-blue-600' : 'bg-[#C5A059]/10 text-[#C5A059]'}`}>
                {isVendor ? <Truck size={24} /> : <Car size={24} />}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">{String(isVendor ? 'Manajemen Armada' : dbUser?.vehicleType || "Tipe Kendaraan")}</p>
                <p className="text-base font-black text-slate-800">{String(isVendor ? 'Akses Portal Vendor' : dbUser?.licensePlate || "Belum ada plat")}</p>
              </div>
            </div>
            <button onClick={() => setShowWizard(true)} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${isVendor ? 'bg-blue-50 text-blue-600' : 'bg-[#7A171D]/10 text-[#7A171D]'}`}>Ubah</button>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <MenuRow icon={isVendor ? <Building2/> : <User />} title={isVendor ? "Informasi PT/CV" : "Informasi Pribadi"} />
          <MenuRow icon={<CreditCard />} title={isVendor ? "Rekening Perusahaan" : "Rekening & Pencairan"} />
          <MenuRow icon={<FileText />} title="Dokumen Legalitas" />
          <MenuRow icon={<ShieldCheck />} title="Pusat Bantuan & Tiket" border={false} />
        </div>
      </main>
    </div>
  );
}

function MenuRow({ icon, title, border = true }: { icon: React.ReactNode, title: string, border?: boolean }) {
  return (
    <button className={`w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 ${border ? 'border-b border-slate-100' : ''}`}>
      <div className="flex items-center gap-3"><div className="text-slate-400">{icon}</div><span className="text-sm font-bold text-slate-700">{title}</span></div>
      <ChevronRight className="text-slate-300" size={18} />
    </button>
  );
}