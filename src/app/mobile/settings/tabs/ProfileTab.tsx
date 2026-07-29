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
    <div className="space-y-6 pb-6">
      
      {/* --- TOAST NOTIFICATIONS --- */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-[1.25rem] font-bold text-xs border border-emerald-200 shadow-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500"/> Profil diperbarui!
            </div>
          </motion.div>
        )}
        {isPasswordSent && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-[1.25rem] font-bold text-xs border border-blue-200 shadow-sm flex items-start gap-2">
              <MailCheck className="w-5 h-5 shrink-0 text-blue-500 mt-0.5"/> <span>Tautan pengaturan sandi dikirim ke email.</span>
            </div>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
            <div className="p-3 bg-red-50 text-red-600 rounded-[1.25rem] font-bold text-xs border border-red-200 shadow-sm flex items-center gap-2">
              <Shield className="w-5 h-5 shrink-0 text-red-500"/> {errorMsg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FOTO PROFIL --- */}
      <div className="glass-card rounded-[2rem] p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
        <div className="relative group mb-3">
          <div className="w-20 h-20 rounded-full border-4 border-white shadow-sm overflow-hidden bg-slate-50 flex items-center justify-center relative z-10">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-slate-300" />
            )}
          </div>
          
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="absolute bottom-0 right-0 w-7 h-7 bg-slate-900 rounded-full border-2 border-white flex items-center justify-center text-white active:bg-[#7A171D] active:scale-95 transition-all shadow-sm z-20 tap-highlight-transparent"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
        </div>
        
        <h4 className="font-black text-slate-900 text-base">{user?.displayName}</h4>
        
        {user?.role && (
          <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-white border border-slate-200 shadow-sm rounded-lg mt-2">
            {user.role === 'b2b' ? (
              <Building2 className="w-3 h-3 text-[#C5A059]" />
            ) : (
              <User className="w-3 h-3 text-slate-500" />
            )}
            <span className="text-[9px] font-black tracking-widest text-slate-700 uppercase">
              {user.role === 'b2b' ? 'Corporate' : 'Regular'}
            </span>
          </div>
        )}
      </div>

      {/* --- FORM IDENTITAS --- */}
      <div className="glass-card rounded-[2rem] p-5 shadow-sm border border-slate-100 space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Depan</label>
          <Input 
            type="text" 
            value={formData.firstName} 
            onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
            className="h-12 text-sm font-black rounded-xl" 
            placeholder="Cth: Budi"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nama Belakang</label>
          <Input 
            type="text" 
            value={formData.lastName} 
            onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
            className="h-12 text-sm font-black rounded-xl" 
            placeholder="Cth: Santoso"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nomor Telepon</label>
          <div className="relative">
            <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              type="tel" 
              value={formData.phone} 
              onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              className="pl-9 h-12 text-sm font-black rounded-xl" 
              placeholder="081234567890" 
            />
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest pl-1">Wajib untuk OTP & Kurir</p>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Login</label>
          <div className="relative opacity-70">
            <MailCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              type="email" 
              value={formData.email} 
              disabled 
              className="pl-9 h-12 text-sm font-black rounded-xl cursor-not-allowed bg-slate-50" 
            />
          </div>
          <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest pl-1"><Lock className="w-3 h-3 inline mr-0.5"/> Kontak CS untuk ubah</p>
        </div>
      </div>

      {/* --- KATA SANDI --- */}
      <div className="bg-slate-50 rounded-[2rem] border border-slate-200 p-5 flex flex-col gap-4 shadow-sm">
        <div>
          <h4 className="font-black text-slate-900 text-sm tracking-tight">Kata Sandi Akun</h4>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Atur ulang kata sandi melalui tautan yang dikirim ke email Anda.</p>
        </div>
        <Button 
          onClick={handleSetPassword}
          disabled={isSendingPassword}
          variant="outline"
          className="h-12 rounded-xl border-slate-300 text-slate-700 bg-white active:scale-95 w-full text-xs tap-highlight-transparent shadow-sm"
        >
          <KeyRound className="w-4 h-4 mr-2 text-slate-500" /> 
          {isSendingPassword ? "Mengirim..." : "Reset Kata Sandi"}
        </Button>
      </div>

      {/* --- DANGER ZONE --- */}
      <div className="bg-red-50/60 p-5 rounded-[2rem] border border-red-200 flex flex-col gap-4 shadow-sm">
        <div>
          <h4 className="font-black text-red-700 text-sm tracking-tight">Hapus Akun</h4>
          <p className="text-[11px] text-red-600/80 mt-1 font-bold leading-relaxed">
            Tindakan ini permanen. Semua data akan dihapus.
          </p>
        </div>
        <Button variant="danger" className="h-12 bg-red-600 active:bg-red-700 rounded-xl text-xs w-full active:scale-95 shadow-sm tap-highlight-transparent">
          <Trash2 className="w-4 h-4 mr-2" /> Hapus Permanen
        </Button>
      </div>

      {/* BOTTOM ACTION BAR (STICKY) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)] bg-white/90">
        <Button 
          onClick={handleSaveProfile} 
          disabled={isLoading} 
          className="w-full h-14 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white rounded-[1.25rem] font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 tap-highlight-transparent border border-[#5A0E13] text-sm"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <><Save className="w-5 h-5" /> Simpan Profil</>
          )}
        </Button>
      </div>
      
    </div>
  );
}