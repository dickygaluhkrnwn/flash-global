"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Ban, 
  KeyRound, User, Mail, Phone, Calendar, 
  ShieldAlert, Activity, ShieldCheck, Save, Edit2, MapPin
} from "lucide-react";

import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
import { User as UserType } from "@/types/user";

export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user: currentUser } = useAuthStore();

  const [staffData, setStaffData] = useState<UserType | null>(null);
  const [formData, setFormData] = useState<{ phone: string, address: string, employeeId: string }>({ phone: "", address: "", employeeId: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // =========================================================================
  // CUSTOM STYLES: APPLE GLASSMORPHISM (Crimson/Maroon Accent)
  // =========================================================================
  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          showToast("error", "Data staf tidak ditemukan.");
          setTimeout(() => router.push("/admin/users/staff"), 2000);
          return;
        }

        const data = docSnap.data();
        setStaffData({
          uid: docSnap.id,
          ...data,
          displayName: data.displayName || data.name || "Staf Internal",
        } as UserType);

        setFormData({
          phone: data.phoneNumber || data.phone || "",
          address: data.defaultAddress || data.address || "",
          employeeId: data.employeeId || data.nik || ""
        });

      } catch (error) {
        console.error(error);
        showToast("error", "Gagal memuat detail staf.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) loadData();
  }, [userId, router]);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        phoneNumber: formData.phone,
        phone: formData.phone,
        defaultAddress: formData.address,
        address: formData.address,
        employeeId: formData.employeeId
      });
      
      setStaffData(prev => prev ? { ...prev, phoneNumber: formData.phone, defaultAddress: formData.address, employeeId: formData.employeeId } as any : null);
      setIsEditing(false);
      showToast("success", "Detail staf berhasil diperbarui.");
    } catch {
      showToast("error", "Gagal menyimpan perubahan staf.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleSuspend = async (currentStatus: boolean) => {
    if (userId === currentUser?.uid) {
      showToast("error", "Tindakan dilarang. Anda tidak bisa menyuspend diri sendiri.");
      return;
    }
    if (!confirm(currentStatus ? "Pulihkan akses staf ini ke sistem?" : "Cabut izin akses staf ini secara paksa?")) return;
    try {
      await updateDoc(doc(db, "users", userId), { isSuspended: !currentStatus });
      showToast("success", "Status otorisasi staf diperbarui.");
      setStaffData(prev => prev ? { ...prev, isSuspended: !currentStatus } : null);
    } catch {
      showToast("error", "Gagal merubah status staf.");
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email || !confirm(`Kirim instruksi reset password ke ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("success", `Email reset terkirim ke: ${email}`);
    } catch {
      showToast("error", "Gagal kirim email reset password.");
    }
  };

  const formatDate = (dateInput: any) => {
    if (!dateInput) return "-";
    if (dateInput.toDate) {
      return dateInput.toDate().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    return new Date(dateInput).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak (Otoritas Rendah)</h2>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-[#7A171D] animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menarik Data Personel...</p>
      </div>
    );
  }

  if (!staffData) return null;

  return (
    <div className="space-y-6 font-sans pb-10 max-w-5xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER NAV */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-[#7A171D] hover:bg-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              Detail Personel Staf
            </h1>
            <p className="text-[10px] font-bold text-[#7A171D] uppercase tracking-widest">ID: {staffData.uid}</p>
          </div>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-2">
            <AdminButton onClick={() => setIsEditing(false)} disabled={isSaving} variant="outline" className="h-10 text-xs">Batal</AdminButton>
            <AdminButton onClick={handleSaveProfile} disabled={isSaving} variant="primary" className="h-10 text-xs shadow-md"><Save className="w-3.5 h-3.5 mr-1.5"/> Simpan</AdminButton>
          </div>
        ) : (
          <AdminButton onClick={() => setIsEditing(true)} variant="gold" className="h-10 text-xs shadow-md"><Edit2 className="w-3.5 h-3.5 mr-1.5"/> Lengkapi Data Diri</AdminButton>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KIRI: PROFILE SUMMARY CARD */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`${glassPanel} rounded-[2rem] p-8 relative overflow-hidden flex flex-col items-center text-center`}>
            <div className={`absolute top-0 right-0 w-full h-32 opacity-20 pointer-events-none bg-gradient-to-b from-[#7A171D] to-transparent`} />
            
            <div className="relative w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100 flex items-center justify-center mb-5 z-10">
              {staffData.photoURL ? (
                <Image src={staffData.photoURL} alt="Profile" fill className="object-cover" sizes="112px" />
              ) : (
                <User className="w-10 h-10 text-slate-300" />
              )}
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 tracking-tight relative z-10">{staffData.displayName}</h2>
            <p className="text-xs font-bold text-[#7A171D] uppercase tracking-widest bg-[#7A171D]/10 px-3 py-1 rounded-md mt-2 mb-4 relative z-10 border border-[#7A171D]/20 shadow-sm flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5"/> {staffData.role.replace("admin_", "")}
            </p>

            <AdminBadge variant={staffData.isSuspended ? "danger" : "success"} className="mb-6 relative z-10 px-4 py-1.5 text-[11px]">
              {staffData.isSuspended ? "AKSES DIBEKUKAN (REVOKED)" : "AKSES AKTIF (GRANTED)"}
            </AdminBadge>

            <div className="w-full space-y-3 pt-6 border-t border-slate-100 relative z-10">
              <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white shadow-sm text-left">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email Karyawan</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{staffData.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white shadow-sm text-left">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tanggal Bergabung</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{formatDate(staffData.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KANAN: DATA KARYAWAN & SECURITY */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className={`${glassPanel} rounded-[2rem] p-8`}>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/60 pb-4">
               <User className="w-4 h-4 text-[#C5A059]"/> Data Diri & Domisili
             </h3>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
               <div className="space-y-1.5 sm:col-span-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Induk Karyawan (NIK / ID)</label>
                 {isEditing ? (
                   <AdminInput value={formData.employeeId} onChange={(e) => setFormData({...formData, employeeId: e.target.value})} placeholder="ID Staf (Opsional)" className="font-mono" />
                 ) : (
                   <div className="bg-white/60 border border-white px-4 py-3 rounded-xl shadow-sm text-sm font-bold text-slate-800 font-mono">
                     {formData.employeeId || <span className="italic text-slate-400 font-sans">Belum diinput</span>}
                   </div>
                 )}
               </div>
               
               <div className="space-y-1.5 sm:col-span-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Handphone</label>
                 {isEditing ? (
                   <AdminInput type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="08123456789" className="font-mono" />
                 ) : (
                   <div className="bg-white/60 border border-white px-4 py-3 rounded-xl shadow-sm text-sm font-bold text-slate-800 flex items-center gap-2 font-mono">
                     <Phone className="w-4 h-4 text-slate-400"/> {formData.phone || <span className="italic text-slate-400 font-sans">Belum diinput</span>}
                   </div>
                 )}
               </div>

               <div className="space-y-1.5 sm:col-span-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Alamat Tinggal Sesuai KTP</label>
                 {isEditing ? (
                   <textarea 
                     value={formData.address} 
                     onChange={(e) => setFormData({...formData, address: e.target.value})} 
                     className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none transition-all shadow-sm resize-none"
                     rows={3}
                     placeholder="Alamat domisili lengkap..."
                   />
                 ) : (
                   <div className="bg-white/60 border border-white px-4 py-3 rounded-xl shadow-sm text-sm font-bold text-slate-800 flex items-start gap-2 leading-relaxed min-h-[80px]">
                     <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0"/> {formData.address || <span className="italic text-slate-400">Belum diinput</span>}
                   </div>
                 )}
               </div>
             </div>
          </div>

          <div className={`${glassPanel} rounded-[2rem] p-8`}>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/60 pb-4">
               <ShieldAlert className="w-4 h-4 text-[#7A171D]"/> Security & Tindakan
             </h3>

             <div className="space-y-4">
               {/* Reset Password Action */}
               <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                   <h4 className="font-bold text-slate-800 flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-400"/> Reset Password</h4>
                   <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-sm">Kirim email pemulihan sandi jika staf lupa cara mengakses sistem.</p>
                 </div>
                 <AdminButton onClick={() => handleResetPassword(staffData.email || "")} variant="outline" className="shrink-0 bg-white border-slate-200 text-slate-600 hover:text-[#7A171D] hover:border-[#7A171D]/30 shadow-sm">
                   Kirim Link Reset
                 </AdminButton>
               </div>

               {/* Suspend Action */}
               <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                   <h4 className="font-bold text-red-700 flex items-center gap-2"><Ban className="w-4 h-4 text-red-500"/> Cabut Izin Akses (Suspend)</h4>
                   <p className="text-xs text-red-600/70 font-medium mt-1 leading-relaxed max-w-sm">Cabut sementara otorisasi staf ini. Mereka akan langsung *logged out* dari sistem operasional.</p>
                 </div>
                 <AdminButton onClick={() => handleToggleSuspend(staffData.isSuspended || false)} variant={staffData.isSuspended ? "outline" : "danger"} className={`shrink-0 shadow-sm ${staffData.isSuspended ? 'bg-white border-slate-200 text-emerald-600 hover:border-emerald-300' : ''}`}>
                   {staffData.isSuspended ? "Pulihkan Akses (Unban)" : "Suspend Staf"}
                 </AdminButton>
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}