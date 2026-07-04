"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Camera, CheckCircle2, Lock, KeyRound, Trash2, Save } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfileTab() {
  const { user, login } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
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
      const nameParts = (user.name || "").split(" ");
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
        } catch (error) {}
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
        const imageFormData = new FormData();
        imageFormData.append("file", selectedFile);
        imageFormData.append("upload_preset", uploadPreset!);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST", body: imageFormData,
        });
        const cloudData = await cloudinaryRes.json();
        if (cloudData.secure_url) finalPhotoURL = cloudData.secure_url;
      }

      const fullName = `${formData.firstName} ${formData.lastName}`.trim();

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: fullName, photoURL: finalPhotoURL });
        login({ ...user, name: fullName, photoURL: finalPhotoURL });
      }

      await setDoc(doc(db, "users", user.uid), {
        name: fullName, phone: formData.phone, photoURL: finalPhotoURL, updatedAt: serverTimestamp()
      }, { merge: true });

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: any) {
      setErrorMsg(error.message || "Gagal menyimpan profil.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Profile Settings</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your personal information and security.</p>
        </div>
        <button onClick={handleSaveProfile} disabled={isLoading} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2">
          {isLoading ? "Saving..." : <><Save className="w-4 h-4"/> Save Changes</>}
        </button>
      </div>

      <div className="p-8 space-y-10">
        <AnimatePresence>
          {isSuccess && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-green-50 text-green-700 rounded-xl font-bold text-sm border border-green-200 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Profile updated successfully!</motion.div>}
          {errorMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm border border-red-200">{errorMsg}</motion.div>}
        </AnimatePresence>

        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 flex items-center justify-center">
              {avatarPreview ? <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-gray-400" />}
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 rounded-full border-2 border-white flex items-center justify-center text-white hover:bg-[#7A171D] transition-colors shadow">
              <Camera className="w-4 h-4" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">Profile Photo</h4>
            <p className="text-xs text-gray-500 mt-1">Recommended size: 500x500px. Max 2MB.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">First Name</label>
            <input type="text" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none font-semibold text-gray-900 bg-white shadow-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Last Name</label>
            <input type="text" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none font-semibold text-gray-900 bg-white shadow-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-gray-100 pt-8">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Phone Number</label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input type="tel" value={formData.phone} disabled className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 font-medium cursor-not-allowed" placeholder="+62..." />
              <span className="text-xs text-amber-600 font-semibold flex items-center gap-1.5"><Lock className="w-3.5 h-3.5"/> Set a password before changing your phone number.</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Login Email</label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input type="email" value={formData.email} disabled className="w-full sm:w-1/2 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-gray-500 font-medium cursor-not-allowed" />
              <span className="text-xs text-amber-600 font-semibold flex items-center gap-1.5"><Lock className="w-3.5 h-3.5"/> Set a password before changing your email.</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-gray-900">Password</h4>
            <p className="text-xs text-gray-500 mt-1">Secure your account with a strong password.</p>
          </div>
          <button className="bg-white border border-gray-200 hover:border-gray-900 text-gray-900 px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm">
            <KeyRound className="w-4 h-4" /> Set Password
          </button>
        </div>

        <div className="border-t border-gray-100 pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-red-50/50 p-6 rounded-2xl border-red-100">
          <div>
            <h4 className="font-bold text-red-700">Delete Account</h4>
            <p className="text-xs text-red-500/80 mt-1 max-w-sm">Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <button className="bg-white border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 text-red-600 px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap">
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}