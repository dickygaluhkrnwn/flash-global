"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Ban, 
  KeyRound, User, Mail, Phone, Calendar, 
  ShieldAlert, Activity, Users
} from "lucide-react";

import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
import { User as UserType } from "@/types/user";
import { FirebaseTimestamp } from "@/types/order"; // <-- IMPORT TIPE FIREBASE TIMESTAMP

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getAdminUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
    return path.replace(/^\/admin/, '') || '/';
  }
  return path; 
};

export default function B2CDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user: currentUser } = useAuthStore();

  const [clientData, setClientData] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // =========================================================================
  // CUSTOM STYLES: APPLE GLASSMORPHISM (Indigo Accent)
  // =========================================================================
  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          showToast("error", "Data klien tidak ditemukan.");
          setTimeout(() => router.push(getAdminUrl("/admin/users/b2c")), 2000);
          return;
        }

        const data = docSnap.data();
        setClientData({
          uid: docSnap.id,
          ...data,
          displayName: data.displayName || data.name || "Klien",
          phoneNumber: data.phoneNumber || data.phone || "-"
        } as UserType);

      } catch (error) {
        console.error(error);
        showToast("error", "Gagal memuat detail klien.");
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

  const handleToggleSuspend = async (currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Yakin ingin mengaktifkan akun klien ini?" : "Suspend akun klien ini? Mereka tidak akan bisa login atau membuat order baru.")) return;
    try {
      await updateDoc(doc(db, "users", userId), { isSuspended: !currentStatus });
      showToast("success", "Status pengguna diperbarui.");
      setClientData(prev => prev ? { ...prev, isSuspended: !currentStatus } : null);
    } catch {
      showToast("error", "Gagal merubah status suspensi.");
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email || !confirm(`Kirim link reset password ke ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      showToast("success", `Email reset terkirim ke: ${email}`);
    } catch {
      showToast("error", "Gagal kirim email reset password.");
    }
  };

  // KODE DIBERSIHKAN: Menggunakan FirebaseTimestamp dari global types
  const formatDate = (dateInput: FirebaseTimestamp | unknown) => {
    if (!dateInput) return "-";
    
    if (typeof dateInput === 'object' && dateInput !== null) {
      const ts = dateInput as Extract<FirebaseTimestamp, object>;
      if (typeof ts.toDate === 'function') {
        return ts.toDate().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      }
      if (typeof ts.seconds === 'number') {
        return new Date(ts.seconds * 1000).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      }
    }
    
    return new Date(dateInput as string | number).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-indigo-600 animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menarik Data Klien...</p>
      </div>
    );
  }

  if (!clientData) return null;

  return (
    <div className="space-y-6 font-sans pb-10 max-w-5xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER NAV */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              Detail Klien Personal
            </h1>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">ID: {clientData.uid}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KIRI: PROFILE SUMMARY CARD */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`${glassPanel} rounded-[2rem] p-8 relative overflow-hidden flex flex-col items-center text-center`}>
            <div className={`absolute top-0 right-0 w-full h-32 opacity-20 pointer-events-none bg-gradient-to-b from-indigo-500 to-transparent`} />
            
            <div className="relative w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-indigo-50 flex items-center justify-center mb-5 z-10">
              {clientData.photoURL ? (
                <Image src={clientData.photoURL} alt="Profile" fill className="object-cover" sizes="112px" />
              ) : (
                <User className="w-10 h-10 text-indigo-300" />
              )}
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 tracking-tight relative z-10">{clientData.displayName}</h2>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-md mt-2 mb-4 relative z-10 border border-indigo-100 shadow-sm">
              REGULAR USER (B2C)
            </p>

            <AdminBadge variant={clientData.isSuspended ? "danger" : "success"} className="mb-6 relative z-10 px-4 py-1.5 text-[11px]">
              {clientData.isSuspended ? "AKUN DIBEKUKAN (SUSPENDED)" : "AKUN AKTIF (VERIFIED)"}
            </AdminBadge>

            <div className="w-full space-y-3 pt-6 border-t border-slate-100 relative z-10">
              <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white shadow-sm text-left">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Alamat Email</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{clientData.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white shadow-sm text-left">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nomor Handphone</p>
                  <p className="text-sm font-mono font-bold text-slate-700 truncate">{clientData.phoneNumber || "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white shadow-sm text-left">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tanggal Bergabung</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{formatDate(clientData.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KANAN: ACTIONS & STATS */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className={`${glassPanel} rounded-[2rem] p-8`}>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/60 pb-4">
               <ShieldAlert className="w-4 h-4 text-indigo-600"/> Security & Tindakan
             </h3>

             <div className="space-y-4">
               
               {/* Reset Password Action */}
               <div className="bg-white/60 p-5 rounded-2xl border border-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                   <h4 className="font-bold text-slate-800 flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-400"/> Reset Password</h4>
                   <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-sm">Kirim email pemulihan sandi jika pengguna lupa atau kehilangan akses ke akun mereka.</p>
                 </div>
                 <AdminButton onClick={() => handleResetPassword(clientData.email || "")} variant="outline" className="shrink-0 bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300">
                   Kirim Link Reset
                 </AdminButton>
               </div>

               {/* Suspend Action */}
               <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                   <h4 className="font-bold text-red-700 flex items-center gap-2"><Ban className="w-4 h-4 text-red-500"/> Suspend Akun Klien</h4>
                   <p className="text-xs text-red-600/70 font-medium mt-1 leading-relaxed max-w-sm">Blokir pengguna ini dari membuat pesanan baru atau mengakses layanan sistem.</p>
                 </div>
                 <AdminButton onClick={() => handleToggleSuspend(clientData.isSuspended || false)} variant={clientData.isSuspended ? "outline" : "danger"} className={`shrink-0 ${clientData.isSuspended ? 'bg-white border-slate-200 text-emerald-600 hover:border-emerald-300' : ''}`}>
                   {clientData.isSuspended ? "Pulihkan Akun (Unban)" : "Suspend Pengguna"}
                 </AdminButton>
               </div>

             </div>
          </div>

          <div className={`${glassPanel} rounded-[2rem] p-8`}>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/60 pb-4">
               <Activity className="w-4 h-4 text-indigo-600"/> Ringkasan Operasional (Log)
             </h3>
             <div className="bg-slate-50/50 border border-slate-200 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center">
               <Users className="w-10 h-10 text-slate-300 mb-3" />
               <p className="text-sm font-bold text-slate-500">Log riwayat pesanan (order history) klien ini belum tersedia di versi ini.</p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}