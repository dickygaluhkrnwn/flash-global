"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Camera, CheckCircle2, Lock, KeyRound, Trash2, Save, MailCheck, Shield, Building2, Phone } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ProfileTab() {
  const { user, login } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [isPasswordSent, setIsPasswordSent] = useState(false);
  const [isSendingPassword, setIsSendingPassword] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: ""
  });

  useEffect(() => {
    if (user) {
      const nameParts = (user.displayName || "").split(" ");
      const fName = nameParts[0] || "";
      const lName = nameParts.slice(1).join(" ") || "";

      setFormData(prev => ({ ...prev, firstName: fName, lastName: lName, email: user.email || "" }));
      setAvatarPreview(user.photoURL || null);

      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setFormData(prev => ({ ...prev, phone: userDoc.data().phone || "" }));
          }
        } catch (error) {
          console.error("Gagal menarik data user:", error);
        }
      };
      fetchUserData();
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file)); 
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      let finalPhotoURL = user.photoURL || "";
      
      if (selectedFile) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        
        if (!cloudName || !uploadPreset) {
           throw new Error("Konfigurasi Cloudinary belum disetup.");
        }

        const imageFormData = new FormData();
        imageFormData.append("file", selectedFile);
        imageFormData.append("upload_preset", uploadPreset);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST", body: imageFormData,
        });
        const cloudData = await cloudinaryRes.json();
        if (cloudData.secure_url) finalPhotoURL = cloudData.secure_url;
      }

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: fullName, photoURL: finalPhotoURL });
      }

      await setDoc(doc(db, "users", user.uid), {
        displayName: fullName,
        name: fullName, 
        phone: formData.phone, 
        photoURL: finalPhotoURL, 
        updatedAt: serverTimestamp()
      }, { merge: true });

      login({ ...user, displayName: fullName, photoURL: finalPhotoURL });

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Gagal menyimpan profil.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async () => {
    if (!user?.email) return;
    setIsSendingPassword(true);
    setErrorMsg("");
    
    try {
      await sendPasswordResetEmail(auth, user.email);
      setIsPasswordSent(true);
      setTimeout(() => setIsPasswordSent(false), 5000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Gagal mengirim link password.");
      }
    } finally {
      setIsSendingPassword(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="glass-card rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white overflow-hidden font-sans relative transition-all duration-300"
    >
      {/* --- Background Ambient Glow --- */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#7A171D]/10 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-[#C5A059]/10 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* --- HEADER STICKY --- */}
      <div className="p-6 md:p-8 border-b border-white/60 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-5 bg-white/40 backdrop-blur-xl sticky top-0 z-20 shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Profil & Keamanan</h2>
          <p className="text-slate-500 text-sm mt-1.5 font-medium leading-relaxed">Kelola informasi pribadi dan tingkatkan keamanan akun Anda.</p>
        </div>
        <Button 
          onClick={handleSaveProfile} 
          disabled={isLoading} 
          variant="primary"
          className="w-full sm:w-auto h-12 px-8 shadow-[0_8px_20px_rgba(122,23,29,0.2)] active:scale-95"
        >
          {isLoading ? "Menyimpan..." : <><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</>}
        </Button>
      </div>

      <div className="p-6 md:p-8 space-y-10 relative z-10">
        
        {/* --- TOAST NOTIFICATIONS (IN-CARD) --- */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-emerald-50/80 backdrop-blur-md text-emerald-700 rounded-[1.25rem] font-bold text-sm border border-emerald-200 shadow-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500"/> Profil berhasil diperbarui!
              </div>
            </motion.div>
          )}
          {isPasswordSent && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-blue-50/80 backdrop-blur-md text-blue-700 rounded-[1.25rem] font-bold text-sm border border-blue-200 shadow-sm flex items-center gap-3">
                <MailCheck className="w-5 h-5 shrink-0 text-blue-500"/> Tautan pembuatan/reset kata sandi telah dikirim ke email Anda!
              </div>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-red-50/80 backdrop-blur-md text-red-600 rounded-[1.25rem] font-bold text-sm border border-red-200 shadow-sm flex items-center gap-3">
                <Shield className="w-5 h-5 shrink-0 text-red-500"/> {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- FOTO PROFIL --- */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-4">
          <div className="relative group shrink-0">
            {/* Foto Profil dengan Glass Frame */}
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-[0_8px_16px_rgba(0,0,0,0.08)] overflow-hidden bg-slate-50 flex items-center justify-center relative z-10">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-slate-300" />
              )}
            </div>
            
            {/* Tombol Kamera Mengambang */}
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 rounded-full border-2 border-white flex items-center justify-center text-white hover:bg-[#7A171D] hover:scale-110 transition-all shadow-md z-20"
              title="Ubah Foto Profil"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
          </div>
          
          <div className="flex flex-col gap-2">
            <div>
              <h4 className="font-black text-slate-900 text-lg">Foto Profil</h4>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">Format: JPG, PNG. Maksimal 2MB.</p>
            </div>
            {/* Badge Role yang Modern */}
            {user?.role && (
              <div className="flex items-center gap-1.5 w-max px-3.5 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg mt-1">
                {user.role === 'b2b' ? (
                  <Building2 className="w-3.5 h-3.5 text-[#C5A059]" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span className="text-[10px] font-black tracking-widest text-slate-700 uppercase">
                  {user.role === 'b2b' ? 'Corporate Partner' : 'Regular User'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* --- FORM IDENTITAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-white/60">
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Depan</label>
            <Input 
              type="text" 
              value={formData.firstName} 
              onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
              className="h-14 font-black" 
              placeholder="Cth: Budi"
            />
          </div>
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Belakang</label>
            <Input 
              type="text" 
              value={formData.lastName} 
              onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
              className="h-14 font-black" 
              placeholder="Cth: Santoso"
            />
          </div>
        </div>

        {/* --- KONTAK & EMAIL --- */}
        <div className="grid grid-cols-1 gap-8 pt-8 border-t border-white/60">
          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nomor Telepon <span className="text-red-500">*</span></label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative w-full sm:w-1/2">
                <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="tel" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  className="pl-12 h-14 font-black" 
                  placeholder="Cth: 081234567890" 
                />
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 bg-white/60 backdrop-blur-md px-4 py-2.5 rounded-[1rem] border border-white shadow-sm">
                <Shield className="w-4 h-4 text-emerald-500 shrink-0"/> Dibutuhkan untuk OTP & Info Kurir
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Login</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative w-full sm:w-1/2 opacity-70">
                <MailCheck className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  type="email" 
                  value={formData.email} 
                  disabled 
                  className="pl-12 h-14 font-black cursor-not-allowed bg-slate-50" 
                />
              </div>
              <span className="text-[10px] text-amber-600 font-bold uppercase tracking-widest flex items-center gap-2 bg-amber-50/80 backdrop-blur-md px-4 py-2.5 rounded-[1rem] border border-amber-200 shadow-sm">
                <Lock className="w-4 h-4 shrink-0"/> Hubungi Support untuk ubah
              </span>
            </div>
          </div>
        </div>

        {/* --- SECURITY / KATA SANDI --- */}
        <div className="border-t border-white/60 pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-white mt-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
          <div>
            <h4 className="font-black text-slate-900 text-lg tracking-tight">Kata Sandi Akun</h4>
            <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed max-w-sm">Amankan akun Anda atau atur ulang kata sandi (terutama jika Anda mendaftar melalui Google).</p>
          </div>
          <Button 
            onClick={handleSetPassword}
            disabled={isSendingPassword}
            variant="outline"
            className="h-12 border-slate-300 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 hover:border-slate-400 shadow-sm active:scale-95 shrink-0"
          >
            <KeyRound className="w-4 h-4 mr-2 text-slate-500" /> 
            {isSendingPassword ? "Mengirim Tautan..." : "Atur / Reset Kata Sandi"}
          </Button>
        </div>

        {/* --- DANGER ZONE --- */}
        <div className="pt-2">
          <div className="bg-red-50/60 backdrop-blur-sm p-6 md:p-8 rounded-[2rem] border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-red-500/20 transition-colors" />
            
            <div className="relative z-10">
              <h4 className="font-black text-red-700 text-lg tracking-tight">Hapus Akun</h4>
              <p className="text-xs text-red-600/80 mt-1.5 font-bold leading-relaxed max-w-md">
                Tindakan ini permanen. Semua data pelacakan, riwayat transaksi, dan saldo deposit Anda akan dihapus selamanya.
              </p>
            </div>
            <Button variant="danger" className="h-12 bg-red-600 hover:bg-red-700 shadow-[0_8px_16px_rgba(220,38,38,0.2)] whitespace-nowrap shrink-0 relative z-10">
              <Trash2 className="w-4 h-4 mr-2" /> Hapus Permanen
            </Button>
          </div>
        </div>

      </div>
    </motion.div>
  );
} 