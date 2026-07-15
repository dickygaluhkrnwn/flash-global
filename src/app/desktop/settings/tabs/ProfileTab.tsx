"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Camera, CheckCircle2, Lock, KeyRound, Trash2, Save, MailCheck, Shield, Building2 } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";

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
      // PERBAIKAN: Menggunakan displayName dari Global Type
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
      
      // Upload ke Cloudinary jika ada file baru
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

      // Update Firebase Auth Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: fullName, photoURL: finalPhotoURL });
      }

      // Update Firestore Database (Pastikan 'displayName' digunakan bukan 'name' jika mengikuti standar, tapi kita update dua-duanya untuk backward compatibility DB)
      await setDoc(doc(db, "users", user.uid), {
        displayName: fullName,
        name: fullName, 
        phone: formData.phone, 
        photoURL: finalPhotoURL, 
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update Zustand Store (Pastikan role terbawa & menggunakan displayName)
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden font-sans">
      {/* Header Sticky */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Profile Settings</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your personal information and security.</p>
        </div>
        <button 
          onClick={handleSaveProfile} 
          disabled={isLoading} 
          className="bg-[#7A171D] hover:bg-[#5A0E13] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-[#7A171D]/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Save className="w-4 h-4"/> Save Changes</>
          )}
        </button>
      </div>

      <div className="p-6 md:p-8 space-y-10">
        {/* Notifikasi Alerts */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl font-medium text-sm border border-emerald-100 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0"/> Profile updated successfully!
              </div>
            </motion.div>
          )}
          {isPasswordSent && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-4 bg-blue-50 text-blue-700 rounded-xl font-medium text-sm border border-blue-100 flex items-center gap-3">
                <MailCheck className="w-5 h-5 shrink-0"/> Link pembuatan/reset password telah dikirim ke email Anda!
              </div>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-4 bg-red-50 text-red-600 rounded-xl font-medium text-sm border border-red-100 flex items-center gap-3">
                <Shield className="w-5 h-5 shrink-0"/> {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section 1: Photo & Role */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-2">
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-50 flex items-center justify-center">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-slate-300" />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 rounded-full border-2 border-white flex items-center justify-center text-white hover:bg-[#7A171D] transition-colors shadow-md"
              title="Change Photo"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
          </div>
          
          <div className="flex flex-col gap-2">
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Profile Photo</h4>
              <p className="text-sm text-slate-500">Recommended format: JPG, PNG. Max size 2MB.</p>
            </div>
            {/* Role Badge (PERBAIKAN: Check 'b2b' role) */}
            {user?.role && (
              <div className="flex items-center gap-1.5 w-max px-3 py-1 bg-slate-100 border border-slate-200 rounded-full">
                {user.role === 'b2b' ? (
                  <Building2 className="w-3.5 h-3.5 text-[#C5A059]" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span className="text-xs font-semibold text-slate-700 capitalize">
                  {user.role === 'b2b' ? 'Corporate Partner' : 'Regular User'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Personal Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">First Name</label>
            <input 
              type="text" 
              value={formData.firstName} 
              onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none font-medium text-slate-900 bg-slate-50/50 transition-all" 
              placeholder="e.g. John"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Last Name</label>
            <input 
              type="text" 
              value={formData.lastName} 
              onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none font-medium text-slate-900 bg-slate-50/50 transition-all" 
              placeholder="e.g. Doe"
            />
          </div>
        </div>

        {/* Section 3: Contact Info */}
        <div className="grid grid-cols-1 gap-6 pt-6 border-t border-slate-100">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Phone Number</label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input 
                type="tel" 
                value={formData.phone} 
                disabled 
                className="w-full sm:w-1/2 px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium cursor-not-allowed" 
                placeholder="+62..." 
              />
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <Lock className="w-3.5 h-3.5"/> Number is locked for security.
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Login Email</label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input 
                type="email" 
                value={formData.email} 
                disabled 
                className="w-full sm:w-1/2 px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium cursor-not-allowed" 
              />
              <span className="text-xs text-amber-600 font-medium flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <Lock className="w-3.5 h-3.5"/> Contact support to change email.
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Security */}
        <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-slate-900">Account Password</h4>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">Secure your account or reset your password if you logged in via Google.</p>
          </div>
          <button 
            onClick={handleSetPassword}
            disabled={isSendingPassword}
            className="bg-white border border-slate-300 hover:border-slate-800 hover:bg-slate-50 text-slate-800 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 shrink-0"
          >
            <KeyRound className="w-4 h-4" /> 
            {isSendingPassword ? "Mengirim Email..." : "Set / Reset Password"}
          </button>
        </div>

        {/* Section 5: Danger Zone */}
        <div className="border-t border-slate-100 pt-8 mt-4">
          <div className="bg-red-50/50 p-6 md:p-8 rounded-2xl border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <h4 className="font-bold text-red-700">Delete Account</h4>
              <p className="text-sm text-red-600/80 mt-1 max-w-md leading-relaxed">
                Once you delete your account, there is no going back. All your active tracking data and history will be permanently wiped.
              </p>
            </div>
            <button className="bg-white border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 text-red-600 px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap shrink-0">
              <Trash2 className="w-4 h-4" /> Delete Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}