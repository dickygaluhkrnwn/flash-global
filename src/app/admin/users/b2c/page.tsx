"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Search, CheckCircle2, AlertCircle, Ban, 
  KeyRound, Activity, Filter, ArrowUpDown, 
  Users, UserCheck, UserX, ShieldAlert, ArrowRight, User
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
import { User as UserType } from "@/types/user";

export default function B2CManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 
  const [sortBy, setSortBy] = useState("name_asc"); 
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // =========================================================================
  // CUSTOM STYLES: APPLE GLASSMORPHISM (Indigo/Violet Accent for B2C)
  // =========================================================================
  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
  const glassCard = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-[1.5rem]";

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        
        const allUsers = snap.docs.map(d => {
          const data = d.data();
          return {
            uid: d.id,
            ...data,
            displayName: data.displayName || data.name || "Klien",
            phoneNumber: data.phoneNumber || data.phone || "-"
          } as UserType;
        });

        // Filter users dengan role b2c atau legacy role 'user'
        setUsers(allUsers.filter(u => u.role === "b2c" || (u.role as string) === "user"));
      } catch (error) {
        console.error(error);
        showToast("error", "Gagal memuat data B2C.");
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

  const handleToggleSuspend = async (userId: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Yakin ingin mengaktifkan akun klien ini?" : "Suspend akun klien ini? Mereka tidak akan bisa login atau membuat order baru.")) return;
    try {
      await updateDoc(doc(db, "users", userId), { isSuspended: !currentStatus });
      showToast("success", "Status pengguna diperbarui.");
      setUsers(prevUsers => prevUsers.map(u => 
        u.uid === userId ? { ...u, isSuspended: !currentStatus } : u
      ));
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

  const processedData = users
    .filter(u => {
      const matchSearch = (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) || (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === "all" ? true : filterStatus === "suspended" ? u.isSuspended : !u.isSuspended;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      const nameA = a.displayName || "";
      const nameB = b.displayName || "";
      if (sortBy === "name_asc") return nameA.localeCompare(nameB);
      if (sortBy === "name_desc") return nameB.localeCompare(nameA);
      return 0;
    });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => !u.isSuspended).length;
  const suspendedUsers = users.filter(u => u.isSuspended).length;
  const activeRatio = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-10">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER (Glass Panel) */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-white/80`}>
        <div className="relative z-10 space-y-3">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_16px_rgba(79,70,229,0.3)] border border-indigo-700">
              <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Klien Personal (B2C)
          </h1>
          <p className="text-slate-500 text-sm max-w-xl font-medium mt-2">
            Kelola data klien reguler, pantau status akun, dan amankan akses pengguna (User Management).
          </p>
        </div>
      </div>

      {/* 2. ADVANCED STATISTIK (Mini Bento Glass) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Klien Terdaftar</span>
            <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 shadow-sm flex items-center justify-center"><Users className="w-5 h-5 text-indigo-600" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight">{totalUsers}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 border-emerald-200/50`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-emerald-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest">Klien Aktif</span>
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm flex items-center justify-center"><UserCheck className="w-5 h-5 text-emerald-600" /></div>
          </div>
          <p className="text-3xl font-black text-emerald-700 mt-4 relative z-10 tracking-tight">{activeUsers}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 border-red-200/50`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-red-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-widest">Akun Diblokir (Suspend)</span>
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 shadow-sm flex items-center justify-center"><UserX className="w-5 h-5 text-red-600" /></div>
          </div>
          <p className="text-3xl font-black text-red-700 mt-4 relative z-10 tracking-tight">{suspendedUsers}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Rasio Keaktifan</span>
          <div className="flex flex-col mt-4">
            <p className="text-3xl font-black text-slate-900 mb-2">{activeRatio}%</p>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
              <div className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 rounded-full" style={{ width: `${activeRatio}%` }}></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. WORKSPACE & CARD LIST */}
      <div className="flex flex-col gap-6">
        
        {/* TOOLBAR FILTER & SEARCH */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="w-full lg:w-1/3">
            <AdminInput 
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="Cari nama atau email klien..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[160px]">
                <option value="all">Semua Status</option>
                <option value="active">Node Aktif</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-indigo-600 focus:ring-[3px] focus:ring-indigo-600/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[160px]">
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* LIST DATA */}
        <div className="space-y-4 min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-indigo-600 animate-pulse" />
              <p>Memuat Database Klien B2C...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full`}>
              <Users className="w-16 h-16 mb-4 opacity-20" />
              <p>Tidak ada data klien yang cocok dengan pencarian.</p>
            </div>
          ) : (
            processedData.map((u, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                key={u.uid} 
                className={`${glassCard} p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center group`}
              >
                
                {/* KOLOM 1: PROFIL KLIEN */}
                <div className="lg:col-span-5 flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full border border-slate-200 shadow-sm shrink-0 overflow-hidden bg-indigo-50 flex items-center justify-center">
                    {u.photoURL ? (
                      <Image src={u.photoURL} alt="Foto" fill className="object-cover" sizes="48px" />
                    ) : (
                      <User className="w-6 h-6 text-indigo-300" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1 w-full overflow-hidden">
                    <p className="font-black text-slate-900 text-sm truncate">{u.displayName}</p>
                    <p className="text-[11px] font-medium text-slate-500 truncate">{u.email}</p>
                  </div>
                </div>
                
                {/* KOLOM 2: KONTAK & STATUS */}
                <div className="lg:col-span-3 flex flex-col items-start gap-2">
                  <div className="bg-white/60 px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm w-fit">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Nomor HP</span>
                    <span className="text-xs font-bold text-slate-700 font-mono">{u.phoneNumber || "-"}</span>
                  </div>
                </div>

                <div className="lg:col-span-2 flex items-center">
                  <AdminBadge variant={u.isSuspended ? "danger" : "success"} className="text-[10px]">
                    {u.isSuspended ? "SUSPENDED" : "ACTIVE NODE"}
                  </AdminBadge>
                </div>

                {/* KOLOM 3: TINDAKAN */}
                <div className="lg:col-span-2 flex items-center justify-end gap-2">
                  
                  <AdminButton 
                    size="icon" 
                    variant="outline" 
                    onClick={() => handleResetPassword(u.email || "")} 
                    className="bg-white border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 shadow-sm rounded-xl h-10 w-10 shrink-0" 
                    title="Kirim Email Reset Password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </AdminButton>

                  <AdminButton 
                    size="icon" 
                    variant="outline" 
                    onClick={() => handleToggleSuspend(u.uid, u.isSuspended || false)} 
                    className={`shadow-sm rounded-xl h-10 w-10 shrink-0 ${u.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-red-500 hover:text-white hover:border-red-500'}`} 
                    title={u.isSuspended ? "Unban Klien" : "Suspend Klien"}
                  >
                    <Ban className="w-4 h-4" />
                  </AdminButton>
                  
                  <AdminButton 
                    variant="secondary" 
                    onClick={() => router.push(`/admin/users/b2c/${u.uid}`)} 
                    className="h-10 text-[10px] px-4 shrink-0 shadow-sm"
                  >
                    Buka Detail <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </AdminButton>

                </div>

              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}