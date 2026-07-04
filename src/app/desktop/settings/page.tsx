"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Shield, Save, Building, MapPin, 
  Mail, Camera, Crown, CheckCircle2, 
  ArrowRight, Lock, Edit3, X, Phone, ArrowLeft
} from "lucide-react";
import Link from "next/link";

// --- IMPORT FIREBASE CORE ---
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";

export default function DesktopSettingsPage() {
  const { user, login } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState("profil");
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [showB2bForm, setShowB2bForm] = useState(false); // State baru untuk kontrol form B2B

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Form Data Profil & Perusahaan
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    companyName: "",
    defaultAddress: "",
  });

  // State Form Khusus Pengajuan B2B
  const [b2bForm, setB2bForm] = useState({
    usaha: "",
    pic: "",
    hp: "",
    email: ""
  });

  // State Foto Profil & File Cloudinary
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (user?.uid) {
      setFormData(prev => ({ ...prev, name: user.name || "" }));
      setB2bForm(prev => ({ ...prev, pic: user.name || "", email: user.email || "" }));
      setAvatarPreview(user.photoURL || null);

      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData(prev => ({
              ...prev,
              phone: data.phone || "",
              companyName: data.companyName || "",
              defaultAddress: data.defaultAddress || ""
            }));
            // Auto-fill B2B form dari data yang ada di database
            setB2bForm(prev => ({
              ...prev,
              usaha: data.companyName || "",
              hp: data.phone || ""
            }));
          }
        } catch (error) {
          console.error("Gagal menarik data profil:", error);
        }
      };
      fetchUserData();
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleB2bInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setB2bForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle Pilih Foto Profil
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file)); 
    }
  };

  // PROSES SIMPAN KE CLOUDINARY & FIREBASE
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      let finalPhotoURL = user.photoURL || "";

      if (selectedFile) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
          throw new Error("Konfigurasi Cloudinary tidak ditemukan di environment variables.");
        }

        const imageFormData = new FormData();
        imageFormData.append("file", selectedFile);
        imageFormData.append("upload_preset", uploadPreset);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: imageFormData,
        });

        const cloudData = await cloudinaryRes.json();
        
        if (cloudData.secure_url) {
          finalPhotoURL = cloudData.secure_url;
        } else {
          throw new Error(cloudData.error?.message || "Gagal mengunggah gambar ke Cloudinary.");
        }
      }

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.name,
          photoURL: finalPhotoURL || auth.currentUser.photoURL,
        });

        login({
          ...user,
          name: formData.name,
          photoURL: finalPhotoURL || user.photoURL,
        });
      }

      await setDoc(doc(db, "users", user.uid), {
        name: formData.name,
        phone: formData.phone,
        photoURL: finalPhotoURL,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setIsSuccess(true);
      setIsEditingProfile(false); 
      setSelectedFile(null);
      setTimeout(() => setIsSuccess(false), 4000);
      
    } catch (error: unknown) {
      console.error("Gagal menyimpan profil:", error);
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Terjadi kesalahan sistem. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      await setDoc(doc(db, "users", user.uid), {
        companyName: formData.companyName,
        defaultAddress: formData.defaultAddress,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setIsSuccess(true);
      setIsEditingCompany(false); 
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (error: unknown) {
      console.error("Gagal menyimpan data perusahaan:", error);
      setErrorMsg("Terjadi kesalahan saat menyimpan data bisnis.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi Request Kemitraan B2B (Firestore + Direct WA)
  const handleUpgradeB2B = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      await setDoc(doc(db, "b2b_requests", user.uid), {
        userId: user.uid,
        email: b2bForm.email,
        name: b2bForm.pic,
        companyName: b2bForm.usaha,
        phone: b2bForm.hp,
        status: "Menunggu Peninjauan",
        requestedAt: serverTimestamp()
      });

      const adminWhatsApp = "6281234567890"; 
      const message = `Halo Tim Legal Flash Global,\n\nSaya tertarik untuk melakukan *Upgrade Akun Kemitraan Bisnis (B2B)*. Berikut adalah data awal usaha saya:\n\n🏢 *Nama Usaha:* ${b2bForm.usaha}\n👤 *Nama PIC:* ${b2bForm.pic}\n📱 *No. HP:* ${b2bForm.hp}\n✉️ *Email:* ${b2bForm.email}\n\nMohon panduannya untuk proses verifikasi dokumen legalitas lebih lanjut.\n\nTerima kasih.`;
      
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/${adminWhatsApp}?text=${encodedMessage}`, "_blank");

    } catch (error: unknown) {
      console.error("Gagal mengajukan B2B:", error);
      setErrorMsg("Gagal mengirim pengajuan. Pastikan koneksi internet Anda stabil.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-5 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <div className="max-w-6xl mx-auto z-10 relative">
        
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-[#7A171D] transition-colors font-semibold flex items-center gap-2 mb-4 w-fit">
              &larr; Kembali ke Dasbor
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900">Pengaturan Akun</h1>
            <p className="text-gray-500 mt-1 text-sm">Kelola informasi identitas, detail perusahaan, dan fitur korporat Anda.</p>
          </div>

          <AnimatePresence>
            {isSuccess && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-2xl flex items-center gap-2 font-bold text-sm shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-green-600" /> Data berhasil diperbarui!
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sidebar Tabs */}
          <div className="w-full lg:w-1/4 shrink-0">
            <div className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 p-4 border border-gray-100 flex flex-col space-y-2 sticky top-24">
              <button onClick={() => { setActiveTab("profil"); setIsEditingProfile(false); }} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === "profil" ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" : "text-gray-600 hover:bg-slate-50"}`}>
                <User className="w-5 h-5" /> Profil Pribadi
              </button>
              <button onClick={() => { setActiveTab("perusahaan"); setIsEditingCompany(false); }} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === "perusahaan" ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" : "text-gray-600 hover:bg-slate-50"}`}>
                <Building className="w-5 h-5" /> Data Perusahaan
              </button>
              <button onClick={() => { setActiveTab("b2b"); setShowB2bForm(false); }} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === "b2b" ? "bg-gradient-to-r from-[#C5A059] to-[#DFBE7B] text-gray-900 shadow-md shadow-[#C5A059]/30" : "text-gray-600 hover:bg-slate-50"}`}>
                <Crown className="w-5 h-5" /> Kemitraan Bisnis
              </button>
              <div className="my-2 border-t border-gray-100"></div>
              <button onClick={() => setActiveTab("keamanan")} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${activeTab === "keamanan" ? "bg-gray-900 text-white shadow-md" : "text-gray-600 hover:bg-slate-50"}`}>
                <Shield className="w-5 h-5" /> Keamanan Akun
              </button>
            </div>
          </div>

          {/* Area Konten Dinamis */}
          <div className="w-full lg:w-3/4">
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-2xl flex items-center gap-2">
                  <Shield className="w-5 h-5 shrink-0" /> {errorMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 p-6 md:p-10 border border-gray-100">
              
              {/* KONTEN TAB: PROFIL PRIBADI */}
              {activeTab === "profil" && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b pb-5 border-gray-100">
                    <div>
                      <h2 className="text-xl font-black text-gray-900">Informasi Pribadi</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Identitas akun dan nomor kontak utama Anda.</p>
                    </div>
                    {!isEditingProfile && (
                      <button onClick={() => setIsEditingProfile(true)} className="bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors">
                        <Edit3 className="w-4 h-4 text-[#7A171D]" /> Edit Profil Pribadi
                      </button>
                    )}
                  </div>

                  {!isEditingProfile ? (
                    <div className="space-y-8">
                      <div className="flex items-center gap-6 p-6 bg-slate-50/70 rounded-2xl border border-gray-100">
                        <div className="w-20 h-20 rounded-full border-2 border-white shadow-md overflow-hidden bg-white shrink-0">
                          {avatarPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#7A171D]/10 text-[#7A171D]">
                              <User className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-gray-900">{formData.name || user?.name || "Pengguna Flash Global"}</h3>
                          <p className="text-xs font-semibold text-gray-400 mt-1 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" /> {user?.email}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 rounded-2xl border border-gray-100 space-y-1 bg-white shadow-sm">
                          <span className="text-xs font-bold text-gray-400 uppercase">Nama Lengkap</span>
                          <p className="font-extrabold text-gray-900 text-base">{formData.name || "-"}</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-gray-100 space-y-1 bg-white shadow-sm">
                          <span className="text-xs font-bold text-gray-400 uppercase">Email Utama</span>
                          <p className="font-extrabold text-gray-900 text-base">{user?.email || "-"}</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-gray-100 space-y-1 bg-white shadow-sm md:col-span-2">
                          <span className="text-xs font-bold text-gray-400 uppercase">Nomor WhatsApp</span>
                          <p className="font-extrabold text-gray-900 text-base">{formData.phone || "Belum ditambahkan"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveProfile} className="space-y-6 animate-fadeIn">
                      <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-amber-50/50 rounded-2xl border border-amber-100">
                        <div className="relative group">
                          <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100">
                            {avatarPreview ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#7A171D]/5 text-[#7A171D]">
                                <User className="w-10 h-10" />
                              </div>
                            )}
                          </div>
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-[#C5A059] rounded-full border-2 border-white flex items-center justify-center text-white hover:bg-[#b08d4a] transition-colors shadow">
                            <Camera className="w-4 h-4" />
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">Ubah Foto Profil</h4>
                          <p className="text-xs text-gray-500 mt-1">Sistem otomatis menyimpan foto ke server Cloudinary. Maksimal 2MB.</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-semibold text-gray-700">Nama Lengkap</label>
                          <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nama Lengkap Anda" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none font-semibold text-gray-900 bg-gray-50" required />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Email Utama (Terkunci)</label>
                          <input type="email" value={user?.email || ""} readOnly className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-100 text-gray-500 cursor-not-allowed outline-none font-medium text-sm" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Nomor WhatsApp Aktif</label>
                          <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="08123456789" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none font-semibold text-gray-900 bg-gray-50" />
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                        <button type="button" onClick={() => { setIsEditingProfile(false); setSelectedFile(null); }} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors">
                          <X className="w-4 h-4" /> Batal
                        </button>
                        <button type="submit" disabled={isLoading} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md disabled:opacity-70">
                          {isLoading ? "Mengunggah..." : <><Save className="w-4 h-4" /> Simpan Profil & Foto</>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* KONTEN TAB: DATA PERUSAHAAN */}
              {activeTab === "perusahaan" && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b pb-5 border-gray-100">
                    <div>
                      <h2 className="text-xl font-black text-gray-900">Profil Bisnis / Entitas</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Informasi perusahaan dan titik penjemputan utama kargo Anda.</p>
                    </div>
                    {!isEditingCompany && (
                      <button onClick={() => setIsEditingCompany(true)} className="bg-slate-100 hover:bg-slate-200 text-gray-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors">
                        <Edit3 className="w-4 h-4 text-[#7A171D]" /> Edit Data Bisnis
                      </button>
                    )}
                  </div>
                  
                  {!isEditingCompany ? (
                    <div className="grid grid-cols-1 gap-6">
                      <div className="p-6 rounded-2xl border border-gray-100 space-y-1 bg-slate-50/60 shadow-sm flex items-start gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100 text-[#7A171D] shrink-0"><Building className="w-6 h-6" /></div>
                        <div>
                          <span className="text-xs font-bold text-gray-400 uppercase">Nama Perusahaan / Toko</span>
                          <h3 className="font-black text-gray-900 text-lg mt-0.5">{formData.companyName || "Belum didaftarkan"}</h3>
                        </div>
                      </div>
                      <div className="p-6 rounded-2xl border border-gray-100 space-y-2 bg-slate-50/60 shadow-sm flex items-start gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100 text-[#C5A059] shrink-0"><MapPin className="w-6 h-6" /></div>
                        <div className="flex-1">
                          <span className="text-xs font-bold text-gray-400 uppercase">Alamat Gudang / Penjemputan Default</span>
                          <p className="font-bold text-gray-800 text-sm mt-1 leading-relaxed whitespace-pre-line">{formData.defaultAddress || "Belum ada alamat penjemputan utama yang diatur."}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveCompany} className="space-y-6 animate-fadeIn">
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Nama Perusahaan / Toko</label>
                          <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} placeholder="Contoh: PT. Ekspor Impor Maju" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none font-semibold text-gray-900 bg-gray-50" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700 flex justify-between">
                            Alamat Penjemputan / Gudang Default <span className="text-xs text-gray-400 font-normal">Akan otomatis terisi di form booking</span>
                          </label>
                          <textarea name="defaultAddress" value={formData.defaultAddress} onChange={handleInputChange} rows={4} placeholder="Tuliskan alamat lengkap pergudangan atau lokasi penjemputan utama Anda..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none resize-none font-medium text-gray-900 bg-gray-50 leading-relaxed"></textarea>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
                        <button type="button" onClick={() => setIsEditingCompany(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-colors">
                          <X className="w-4 h-4" /> Batal
                        </button>
                        <button type="submit" disabled={isLoading} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-6 py-3 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md disabled:opacity-70">
                          {isLoading ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan Data Bisnis</>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* KONTEN TAB: MODE BISNIS (UPGRADE B2B) */}
              {activeTab === "b2b" && (
                <div className="space-y-6">
                  <AnimatePresence mode="wait">
                    {!showB2bForm ? (
                      /* MODE VIEW: PENAWARAN & TOMBOL MENUJU FORM */
                      <motion.div key="offer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-gradient-to-br from-gray-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none" />
                        
                        <div className="w-16 h-16 bg-gradient-to-br from-[#C5A059] to-[#DFBE7B] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#C5A059]/20 relative z-10">
                          <Crown className="w-8 h-8 text-gray-900" />
                        </div>
                        
                        <h2 className="text-3xl font-black mb-3 relative z-10">Upgrade ke Akun Korporat</h2>
                        <p className="text-gray-300 leading-relaxed max-w-xl relative z-10 mb-8">
                          Tingkatkan kapabilitas logistik bisnis Anda. Nikmati fitur eksklusif B2B yang dirancang khusus untuk pengiriman volume besar dan rutin.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 mb-8">
                          <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-[#C5A059] shrink-0" /><span className="text-sm font-medium">Pembayaran Tempo (Sistem Invoice)</span></div>
                          <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-[#C5A059] shrink-0" /><span className="text-sm font-medium">Harga Grosir / Diskon Volume Khusus</span></div>
                          <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-[#C5A059] shrink-0" /><span className="text-sm font-medium">Prioritas Armada & Customer Service</span></div>
                          <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-[#C5A059] shrink-0" /><span className="text-sm font-medium">Laporan Manifes & Analitik Bulanan</span></div>
                        </div>

                        <button 
                          type="button" 
                          onClick={() => setShowB2bForm(true)} 
                          className="bg-gradient-to-r from-[#C5A059] to-[#DFBE7B] hover:from-[#b08d4a] hover:to-[#C5A059] text-gray-900 font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#C5A059]/20 relative z-10"
                        >
                          Ajukan Kemitraan Sekarang <ArrowRight className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ) : (
                      /* MODE FORM: PENGISIAN DATA */
                      <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                          <button type="button" onClick={() => setShowB2bForm(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Formulir Pengajuan Cepat</h3>
                            <p className="text-xs text-gray-500">Lengkapi data awal untuk verifikasi via WhatsApp.</p>
                          </div>
                        </div>

                        <form onSubmit={handleUpgradeB2B} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-gray-700">Nama Usaha / PT</label>
                              <div className="relative">
                                <Building className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" name="usaha" value={b2bForm.usaha} onChange={handleB2bInputChange} placeholder="PT. Logistik Maju" className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#7A171D] text-gray-900 font-semibold" required />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-gray-700">Nama Penanggung Jawab (PIC)</label>
                              <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" name="pic" value={b2bForm.pic} onChange={handleB2bInputChange} placeholder="Nama Anda" className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#7A171D] text-gray-900 font-semibold" required />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-gray-700">Nomor WhatsApp PIC</label>
                              <div className="relative">
                                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="tel" name="hp" value={b2bForm.hp} onChange={handleB2bInputChange} placeholder="0812..." className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#7A171D] text-gray-900 font-semibold" required />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-gray-700">Email Perusahaan</label>
                              <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="email" name="email" value={b2bForm.email} onChange={handleB2bInputChange} placeholder="email@perusahaan.com" className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#7A171D] text-gray-900 font-semibold" required />
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 flex items-center justify-end gap-3">
                            <button type="button" onClick={() => setShowB2bForm(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                              Batal
                            </button>
                            <button type="submit" disabled={isLoading} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-all shadow-md disabled:opacity-70">
                              {isLoading ? "Memproses Data..." : (
                                <>Kirim via WhatsApp <ArrowRight className="w-5 h-5" /></>
                              )}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-amber-800 text-xs leading-relaxed flex gap-3">
                    <Shield className="w-5 h-5 shrink-0" />
                    <p><strong>Verifikasi Dokumen:</strong> Setelah form dikirim via WhatsApp, tim Legal Flash Global akan membalas pesan Anda untuk meminta kelengkapan dokumen legalitas (NIB, NPWP, Akta).</p>
                  </div>
                </div>
              )}

              {/* KONTEN TAB: KEAMANAN */}
              {activeTab === "keamanan" && (
                <div className="py-16 text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <Lock className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Keamanan Akun Terkelola</h3>
                  <p className="text-gray-500 text-sm max-w-md mx-auto">
                    Sandi dan autentikasi akun Anda dikelola langsung dengan aman oleh infrastruktur Google Identity & Firebase Auth.
                  </p>
                </div>
              )}

            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}