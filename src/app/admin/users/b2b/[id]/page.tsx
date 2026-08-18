"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, CheckCircle2, AlertCircle, 
  Building2, Mail, Phone, 
  ShieldAlert, Activity, CreditCard, 
  FileCheck, ShieldCheck, MapPin, Briefcase, User
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";

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

export default function B2BDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const { user: currentUser } = useAuthStore();

  const [clientData, setClientData] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // =========================================================================
  // CUSTOM STYLES: APPLE GLASSMORPHISM (Corporate Indigo Accent)
  // =========================================================================
  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          showToast("error", "Data klien korporat tidak ditemukan.");
          setTimeout(() => router.push(getAdminUrl("/admin/users/b2b")), 2000);
          return;
        }

        const data = docSnap.data();
        setClientData({
          uid: docSnap.id,
          ...data,
          displayName: data.displayName || data.name || "Klien B2B",
          phoneNumber: data.phoneNumber || data.phone || "-" // <-- Handling legacy data
        } as UserType);

      } catch (error) {
        console.error(error);
        showToast("error", "Gagal memuat detail klien korporat.");
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

  const formatRupiah = (val: number | undefined) => {
    const safeVal = typeof val === 'number' ? val : 0;
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(safeVal);
  };

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
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
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Menarik Data Korporat...</p>
      </div>
    );
  }

  if (!clientData) return null;

  const displayCompanyName = clientData.companyName || clientData.legalCompanyName || clientData.displayName || "Klien Korporat";
  const isApproved = clientData.contractStatus === "Approved";
  const isRejected = clientData.contractStatus === "Rejected";

  return (
    <div className="space-y-6 font-sans pb-10 max-w-6xl mx-auto">
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
          <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white shadow-sm flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-white transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              Detail Korporat B2B
            </h1>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">ID: {clientData.uid}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KIRI: PROFILE SUMMARY CARD */}
        <div className="lg:col-span-5 space-y-6">
          <div className={`${glassPanel} rounded-[2rem] p-8 relative overflow-hidden flex flex-col items-center text-center`}>
            <div className={`absolute top-0 right-0 w-full h-40 opacity-20 pointer-events-none bg-gradient-to-b from-indigo-500 to-transparent`} />
            
            <div className="relative w-28 h-28 rounded-[1.5rem] border-4 border-white shadow-lg overflow-hidden bg-indigo-50 flex items-center justify-center mb-5 z-10">
              <Building2 className="w-10 h-10 text-indigo-400" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 tracking-tight relative z-10">{displayCompanyName}</h2>
            <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest bg-indigo-100 px-3 py-1 rounded-md mt-2 mb-5 relative z-10 border border-indigo-200 shadow-sm flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5"/> VIP PARTNER (B2B)
            </p>

            <div className="w-full space-y-3 pt-6 border-t border-slate-100 relative z-10">
              <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white shadow-sm text-left">
                <User className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Manager / PIC Name</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{clientData.picName || clientData.displayName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white shadow-sm text-left">
                <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email Bisnis</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{clientData.companyEmail || clientData.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/60 p-3 rounded-xl border border-white shadow-sm text-left">
                <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">No. Telp Perusahaan</p>
                  <p className="text-sm font-mono font-bold text-slate-700 truncate">{clientData.companyPhone || clientData.phoneNumber || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Deposit Balance Card */}
          {clientData.depositBalance !== undefined && (
            <div className={`${glassPanel} rounded-[2rem] p-8 text-center`}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Saldo Prabayar (Deposit)</p>
              <p className="text-3xl font-black text-emerald-600 tracking-tight">
                {formatRupiah(clientData.depositBalance)}
              </p>
            </div>
          )}
        </div>

        {/* KANAN: FINANCIAL & LEGALITY DATA */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Status Kontrak B2B */}
          <div className={isApproved ? "bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(79,70,229,0.3)] text-white border border-indigo-900 relative overflow-hidden" : `${glassPanel} rounded-[2rem] p-8`}>
             {isApproved && <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none" />}
             
             <h3 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 border-b pb-4 ${isApproved ? "text-indigo-200 border-indigo-500/50" : "text-slate-800 border-white/60"}`}>
               <CreditCard className={`w-4 h-4 ${isApproved ? "text-indigo-300" : "text-indigo-600"}`}/> Limit Kredit & Status Kontrak
             </h3>

             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
               <div>
                 <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isApproved ? "text-indigo-300" : "text-slate-500"}`}>Plafon Kredit (Piutang) Tersedia</p>
                 <p className={`text-4xl font-black tracking-tight ${isApproved ? "text-white" : "text-slate-900"}`}>
                   {formatRupiah(clientData.b2bLimit)}
                 </p>
               </div>
               
               <div className="flex flex-col items-start sm:items-end gap-2">
                 <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border shadow-sm flex items-center gap-2 ${
                   isApproved ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                   isRejected ? "bg-red-50 text-red-700 border-red-200" :
                   "bg-amber-50 text-amber-700 border-amber-200"
                 }`}>
                   {isApproved ? <CheckCircle2 className="w-4 h-4" /> : isRejected ? <ShieldAlert className="w-4 h-4" /> : <Activity className="w-4 h-4 animate-pulse" />}
                   {clientData.contractStatus || "PENDING REVIEW"}
                 </span>
                 <p className={`text-[10px] font-medium ${isApproved ? "text-indigo-300" : "text-slate-400"}`}>
                   Update: {formatDate(clientData.updatedAt || clientData.b2bRequestedAt)}
                 </p>
               </div>
             </div>
          </div>

          {/* Business Profile Details */}
          <div className={`${glassPanel} rounded-[2rem] p-8`}>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/60 pb-4">
               <Briefcase className="w-4 h-4 text-indigo-600"/> Data Legalitas & Operasional
             </h3>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5"/> Nomor NPWP PT/CV</p>
                 <p className="text-sm font-bold font-mono text-slate-800 bg-white/60 px-3 py-2 rounded-lg border border-slate-100 shadow-sm w-fit">
                   {clientData.npwp || "Belum Input NPWP"}
                 </p>
               </div>
               <div className="space-y-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Sektor Industri</p>
                 <p className="text-sm font-bold text-slate-800 bg-white/60 px-3 py-2 rounded-lg border border-slate-100 shadow-sm w-fit">
                   {clientData.industry || "Umum"}
                 </p>
               </div>
               <div className="space-y-1 sm:col-span-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> Estimasi Volume Bulanan</p>
                 <p className="text-sm font-bold text-slate-800 bg-white/60 px-3 py-2 rounded-lg border border-slate-100 shadow-sm w-fit">
                   {clientData.monthlyVolume || "Tidak disebutkan"}
                 </p>
               </div>
               <div className="space-y-1 sm:col-span-2">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Gudang / Alamat Default</p>
                 <p className="text-sm font-bold text-slate-800 bg-white/60 px-4 py-3 rounded-xl border border-slate-100 shadow-sm leading-relaxed">
                   {clientData.defaultAddress || "Lokasi pergudangan belum diatur."}
                 </p>
               </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}