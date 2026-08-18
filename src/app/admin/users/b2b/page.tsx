"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Search, CheckCircle2, AlertCircle, Activity, 
  Filter, ArrowUpDown, ArrowUpRight, ArrowDownRight, 
  Building2, FileText, CreditCard, ShieldAlert, Edit3, ShieldX,
  ArrowRight, Mail
} from "lucide-react"; 
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// IMPORT GLOBAL TYPES
import { User as UserType } from "@/types/user";

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getAdminUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
    return path.replace(/^\/admin/, '') || '/';
  }
  return path; 
};

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Corporate Indigo Accent)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-[1.5rem]";

export default function B2BManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 
  const [sortBy, setSortBy] = useState("name_asc");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        const allUsers = snap.docs.map(d => ({ ...d.data(), uid: d.id })) as UserType[];
        setUsers(allUsers.filter(u => u.role === "b2b" || (u.role as string) === "business" || u.npwp));
      } catch (error) {
        console.error(error);
        showToast("error", "Gagal memuat data Korporat B2B.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateContract = async (userId: string, status: "Approved" | "Rejected" | "Pending", limitVal: number) => {
    if (!userId) {
      showToast("error", "ID User tidak valid. Gagal memproses data.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", userId), {
        contractStatus: status,
        b2bLimit: limitVal,
        role: status === "Approved" ? "b2b" : "b2c",
        updatedAt: serverTimestamp() 
      });
      
      showToast("success", `Berkas kontrak dan limit berhasil diperbarui.`);
      setUsers(prevUsers => prevUsers.map(u => 
        u.uid === userId ? { ...u, contractStatus: status, b2bLimit: limitVal, role: status === "Approved" ? "b2b" : "b2c" } : u
      ));
    } catch (error) {
      console.error("Error updating B2B Contract:", error);
      showToast("error", "Gagal memproses validasi berkas B2B.");
    }
  };

  const processedData = useMemo(() => {
    return users
      .filter(u => {
        const clientName = u.companyName || u.displayName || (u as unknown as Record<string, unknown>).name as string || "";
        const matchSearch = clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (u.npwp || "").includes(searchQuery);
        const matchStatus = filterStatus === "all" ? true : (u.contractStatus || "Pending") === filterStatus;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const nameA = a.companyName || a.displayName || (a as unknown as Record<string, unknown>).name as string || "";
        const nameB = b.companyName || b.displayName || (b as unknown as Record<string, unknown>).name as string || "";
        
        if (sortBy === "name_asc") return nameA.localeCompare(nameB);
        if (sortBy === "name_desc") return nameB.localeCompare(nameA);
        if (sortBy === "limit_desc") return (b.b2bLimit || 0) - (a.b2bLimit || 0);
        return 0;
      });
  }, [users, searchQuery, filterStatus, sortBy]);

  const totalB2B = users.length;
  const approvedB2B = users.filter(u => u.contractStatus === "Approved").length;
  const pendingB2B = users.filter(u => u.contractStatus === "Pending" || !u.contractStatus).length;
  const rejectedB2B = users.filter(u => u.contractStatus === "Rejected").length;
  const totalLimit = users.reduce((sum, u) => sum + (u.contractStatus === "Approved" ? (u.b2bLimit || 0) : 0), 0);

  const approvedPct = totalB2B > 0 ? (approvedB2B / totalB2B) * 100 : 0;
  const pendingPct = totalB2B > 0 ? (pendingB2B / totalB2B) * 100 : 0;
  const rejectedPct = totalB2B > 0 ? (rejectedB2B / totalB2B) * 100 : 0;

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Validasi Korporat dan Limit Kredit ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER HALAMAN */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(79,70,229,0.3)] border border-indigo-800">
              <Building2 className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Manajemen Klien B2B
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium max-w-2xl">
            Verifikasi legalitas perusahaan, kelola limit plafon kredit (Piutang Net 30), dan integrasi peran operasional korporat.
          </p>
        </div>
      </div>

      {/* 2. ADVANCED STATISTIK & PORTFOLIO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Entitas Mengajukan</span>
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 shadow-sm flex items-center justify-center"><Building2 className="w-5 h-5 text-indigo-600" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight">{totalB2B}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 border-emerald-200/50`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-emerald-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">Kontrak Aktif</span>
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
          </div>
          <p className="text-3xl font-black text-emerald-700 mt-4 relative z-10 tracking-tight">{approvedB2B}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 border-amber-200/50`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-amber-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">Menunggu Review</span>
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 shadow-sm flex items-center justify-center"><FileText className="w-5 h-5 text-amber-600" /></div>
          </div>
          <p className="text-3xl font-black text-amber-700 mt-4 relative z-10 tracking-tight">{pendingB2B}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-950 rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(15,23,42,0.3)] relative overflow-hidden group hover:brightness-110 transition-all">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-slate-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Limit Terdistribusi</span>
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 shadow-sm flex items-center justify-center"><CreditCard className="w-5 h-5 text-white" /></div>
          </div>
          <p className="text-2xl font-black text-white mt-4 relative z-10 tracking-tight">Rp {(totalLimit / 1000000).toLocaleString('id-ID')} Jt</p>
        </motion.div>

        {/* Portfolio Health Bar spans full width on desktop */}
        <div className="lg:col-span-4 bg-white/60 backdrop-blur-md border border-white rounded-[1.5rem] p-6 flex flex-col md:flex-row gap-6 md:items-center shadow-sm">
          <div className="w-full md:w-1/4">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Portfolio Health</h3>
            <p className="text-xs text-slate-900 font-bold">Distribusi status kontrak B2B</p>
          </div>
          <div className="w-full md:w-3/4 space-y-3">
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${approvedPct}%` }} title="Approved"></div>
              <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${pendingPct}%` }} title="Pending"></div>
              <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${rejectedPct}%` }} title="Rejected"></div>
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-emerald-700 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm"></span> Approved</span>
              <span className="text-amber-700 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm"></span> Pending</span>
              <span className="text-red-700 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shadow-sm"></span> Rejected</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. WORKSPACE & CARD LIST */}
      <div className="flex flex-col gap-6">
        
        {/* Toolbar Pencarian & Filter */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="w-full lg:w-1/3">
            <AdminInput 
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="Cari entitas, NPWP, atau email..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[160px]">
                <option value="all">Semua Status</option>
                <option value="Approved">Disetujui</option>
                <option value="Pending">Menunggu Review</option>
                <option value="Rejected">Ditolak</option>
              </select>
            </div>
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[180px]">
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
                <option value="limit_desc">Limit Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        {/* LIST DATA */}
        <div className="space-y-4 min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-indigo-600 animate-pulse" />
              <p>Memuat Database Korporat...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full`}>
              <Building2 className="w-16 h-16 mb-4 opacity-20" />
              <p>Tidak ada entitas B2B yang cocok dengan filter pencarian.</p>
            </div>
          ) : (
            processedData.map(u => <B2BCardItem key={u.uid} user={u} onUpdate={handleUpdateContract} />)
          )}
        </div>
      </div>
    </div>
  );
}

// KOMPONEN CARD TERPISAH UNTUK MANAJEMEN STATE LOKAL TIAP KLIEN
function B2BCardItem({ user, onUpdate }: { user: UserType; onUpdate: (id: string, status: "Approved" | "Rejected" | "Pending", limitVal: number) => void; }) {
  const router = useRouter();
  const [localLimit, setLocalLimit] = useState<number | "">(user.b2bLimit || 0);

  const displayCompanyName = user.companyName || user.displayName || (user as unknown as Record<string, unknown>).name as string || "Klien Korporat";
  const isPending = user.contractStatus === "Pending" || !user.contractStatus;
  const isApproved = user.contractStatus === "Approved";
  const isRejected = user.contractStatus === "Rejected";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center group",
        glassRow
      )}
    >
      
      {/* KOLOM 1: PROFIL PERUSAHAAN */}
      <div className="lg:col-span-3 flex items-start gap-4">
        <div className="relative w-12 h-12 rounded-xl border border-indigo-200 shadow-sm shrink-0 overflow-hidden bg-indigo-50 flex items-center justify-center">
           <Building2 className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="flex flex-col gap-1 w-full overflow-hidden">
          <p className="font-black text-slate-900 text-sm truncate">{displayCompanyName}</p>
          <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1.5"><Mail className="w-3 h-3"/> {user.email}</p>
          {user.role === 'b2b' && <span className="inline-block mt-1 text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 uppercase tracking-widest w-fit shadow-sm">Verified B2B</span>}
        </div>
      </div>

      {/* KOLOM 2: LEGALITAS */}
      <div className="lg:col-span-2 flex flex-col items-start gap-2">
        <div className="bg-white/60 px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm w-full">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Nomor NPWP</span>
          <span className="text-[11px] font-bold text-slate-700 font-mono truncate">{user.npwp || "Belum Input"}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <Activity className="w-3.5 h-3.5"/> {user.industry || "Industri Umum"}
        </div>
      </div>

      {/* KOLOM 3: LIMIT KREDIT (INPUT) */}
      <div className="lg:col-span-3 flex flex-col items-start gap-1">
        <div className="relative w-full max-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm z-10">Rp</span>
          <input 
            type="number" 
            value={localLimit}
            onChange={(e) => setLocalLimit(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full bg-white/50 backdrop-blur-md border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-bold text-right transition-all shadow-sm"
            placeholder="0"
          />
        </div>
        {isApproved && (
          <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 w-full max-w-[200px] justify-end pr-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3"/> Plafon Aktif
          </p>
        )}
      </div>

      {/* KOLOM 4: STATUS */}
      <div className="lg:col-span-1">
        <AdminBadge variant={isApproved ? "success" : isRejected ? "danger" : "warning"} className="text-[9px] flex items-center gap-1 w-fit">
          {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : isRejected ? <ShieldX className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5 animate-pulse" />}
          {user.contractStatus || "Pending"}
        </AdminBadge>
      </div>

      {/* KOLOM 5: TINDAKAN */}
      <div className="lg:col-span-3 flex items-center justify-end gap-2 flex-wrap">
        
        {isPending && (
          <>
            <AdminButton size="sm" variant="success" onClick={() => onUpdate(user.uid, "Approved", Number(localLimit) || 0)} className="text-[10px] h-9 px-3 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
            </AdminButton>
            <AdminButton size="sm" variant="danger" onClick={() => onUpdate(user.uid, "Rejected", 0)} className="text-[10px] h-9 px-3 shadow-sm">
              <ShieldX className="w-3.5 h-3.5 mr-1" /> Reject
            </AdminButton>
          </>
        )}

        {isApproved && (
          <>
            <AdminButton size="sm" variant="primary" onClick={() => onUpdate(user.uid, "Approved", Number(localLimit) || 0)} className="text-[10px] h-9 px-3 shadow-sm bg-indigo-600 hover:bg-indigo-700" title="Perbarui Plafon Kredit">
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Update Limit
            </AdminButton>
            <AdminButton size="icon" variant="outline" onClick={() => onUpdate(user.uid, "Rejected", 0)} className="h-9 w-9 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 shadow-sm" title="Cabut Akses B2B">
              <ArrowDownRight className="w-4 h-4" />
            </AdminButton>
          </>
        )}

        {isRejected && (
          <AdminButton size="sm" variant="outline" onClick={() => onUpdate(user.uid, "Approved", Number(localLimit) || 0)} className="text-[10px] h-9 px-3 shadow-sm border-emerald-200 text-emerald-600 hover:bg-emerald-50">
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> Re-Approve
          </AdminButton>
        )}

        {/* Tombol Detail User - Halaman [id] */}
        <AdminButton size="icon" variant="outline" onClick={() => router.push(getAdminUrl(`/admin/users/b2b/${user.uid}`))} className="h-9 w-9 bg-white border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 shadow-sm" title="Buka Detail Perusahaan">
          <ArrowRight className="w-4 h-4" />
        </AdminButton>

      </div>

    </motion.div>
  );
}