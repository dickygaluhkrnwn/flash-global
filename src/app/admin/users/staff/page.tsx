"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Search, CheckCircle2, AlertCircle, Ban, Activity, Filter, 
  Plus, Save, Mail, ShieldAlert, ShieldCheck, ArrowRight, User, X
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";

// IMPORT GLOBAL TYPES
import { User as UserType, Role } from "@/types/user";

export default function StaffManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all"); 
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", phone: "", role: "staff" as Role });

  // =========================================================================
  // CUSTOM STYLES: APPLE GLASSMORPHISM (Crimson/Maroon Accent)
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
          let userRole = data.role as string;
          if (userRole === "admin_ops") userRole = "admin_operational";
          if (userRole === "admin_cs") userRole = "staff";

          return { 
            uid: d.id, 
            ...data, 
            role: userRole as Role,
            displayName: data.displayName || data.name || "Staf Baru",
            phoneNumber: data.phoneNumber || data.phone || "-"
          } as UserType;
        });

        const adminRoles: Role[] = ["superadmin", "admin_finance", "admin_operational", "staff"];
        setUsers(allUsers.filter(u => adminRoles.includes(u.role)));
      } catch (error) {
        console.error(error);
        showToast("error", "Gagal memuat data Staf Internal.");
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
    if (userId === currentUser?.uid) {
      showToast("error", "Tindakan dilarang. Anda tidak bisa menyuspend diri sendiri.");
      return;
    }
    try {
      await updateDoc(doc(db, "users", userId), { isSuspended: !currentStatus });
      showToast("success", "Status otorisasi staf diperbarui.");
      
      setUsers(prevUsers => prevUsers.map(u => 
        u.uid === userId ? { ...u, isSuspended: !currentStatus } : u
      ));
    } catch {
      showToast("error", "Gagal merubah status staf.");
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const staffMockId = `STF-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const newStaffData = {
        displayName: newStaff.name,
        name: newStaff.name, 
        email: newStaff.email,
        phoneNumber: newStaff.phone,
        phone: newStaff.phone,
        role: newStaff.role,
        isSuspended: false,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, "users", staffMockId), newStaffData);
      showToast("success", `Hak akses internal staf ${newStaff.name} berhasil didaftarkan.`);
      
      // KODE DIBERSIHKAN: Menambahkan type as UserType dengan fallback property yang wajib
      const createdStaff = { 
        uid: staffMockId, 
        ...newStaffData, 
        createdAt: new Date(),
        role: newStaff.role as Role
      } as unknown as UserType;
      
      setUsers(prev => [createdStaff, ...prev]);
      
      setNewStaff({ name: "", email: "", phone: "", role: "staff" });
      setIsAddModalOpen(false); // Tutup modal setelah sukses
    } catch {
      showToast("error", "Gagal menyimpan entitas staf baru.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processedData = users.filter(u => {
    const matchSearch = (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = filterRole === "all" ? true : u.role === filterRole;
    return matchSearch && matchRole;
  });

  const totalStaff = users.length;
  const opsStaff = users.filter(u => u.role === "admin_operational").length;
  const csStaff = users.filter(u => u.role === "staff").length;
  const adminStaff = users.filter(u => u.role === "admin_finance" || u.role === "superadmin").length;

  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak (Otoritas Rendah)</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Halaman Manajemen Staf dan Hak Akses Node Server ini hanya dapat dibuka dan dikelola oleh Super Administrator.</p>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-10">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL POP-UP TAMBAH STAF */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white/90 backdrop-blur-xl border border-white shadow-[0_20px_60px_rgba(0,0,0,0.1)] rounded-[2rem] w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className="p-6 md:p-8 flex justify-between items-center border-b border-white/60 bg-white/40">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 tracking-tight">
                  <Plus className="w-5 h-5 text-[#7A171D]"/> Mendaftarkan Akun Staf
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200/50 text-slate-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="p-6 md:p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama Lengkap</label>
                  <AdminInput type="text" required value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} placeholder="Cth: Satria Admin" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nomor Handphone</label>
                  <AdminInput type="tel" required value={newStaff.phone} onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})} placeholder="Cth: 08123456789" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Perusahaan</label>
                  <AdminInput type="email" required value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} placeholder="staf@flashglobal.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Otoritas Divisi (Role)</label>
                  <select value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value as Role})} className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl px-4 py-3 text-slate-900 text-sm font-bold outline-none focus:border-[#7A171D] focus:ring-[3px] focus:ring-[#7A171D]/15 shadow-sm appearance-none transition-all cursor-pointer">
                    <option value="staff">Customer Service (CS / Staff)</option>
                    <option value="admin_operational">Operational Admin</option>
                    <option value="admin_finance">Finance Admin</option>
                    <option value="superadmin">Super Admin (Direksi)</option>
                  </select>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <AdminButton type="button" onClick={() => setIsAddModalOpen(false)} variant="outline" className="w-full">
                    Batal
                  </AdminButton>
                  <AdminButton type="submit" disabled={isProcessing} variant="primary" className="w-full shadow-lg">
                    <Save className="w-4 h-4 mr-2" /> {isProcessing ? "Mendaftarkan..." : "Otorisasikan"}
                  </AdminButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. HEADER HALAMAN */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#7A171D] rounded-full blur-[100px] opacity-10 pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(122,23,29,0.3)] border border-[#5A0E13]">
              <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Manajemen Staf Internal
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium max-w-2xl">
            Tambah staf baru, kelola otoritas divisi (RBAC), serta kendalikan izin akses ke dalam sistem Flash Global.
          </p>
        </div>

        <AdminButton onClick={() => setIsAddModalOpen(true)} variant="primary" className="h-12 px-6 shadow-lg whitespace-nowrap shrink-0 relative z-10 w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Tambah Staf Baru
        </AdminButton>
      </div>

      {/* 2. ADVANCED STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-gradient-to-br from-[#9A242B] to-[#7A171D] border border-[#5A0E13] rounded-2xl p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(122,23,29,0.3)] relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-[40px] opacity-50 group-hover:opacity-100 transition-opacity" />
          <span className="text-white/70 text-[11px] font-bold uppercase tracking-widest relative z-10">Total Personel Inti</span>
          <div className="flex items-center justify-between mt-4 relative z-10">
            <p className="text-4xl font-black text-white tracking-tight">{totalStaff}</p>
            <ShieldCheck className="w-8 h-8 text-white/30" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">Tim Operasional</span>
          <div className="flex flex-col mt-4">
            <p className="text-3xl font-black text-slate-900 mb-2">{opsStaff}</p>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(opsStaff/totalStaff)*100}%` }}></div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">Tim Customer Service</span>
          <div className="flex flex-col mt-4">
            <p className="text-3xl font-black text-slate-900 mb-2">{csStaff}</p>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(csStaff/totalStaff)*100}%` }}></div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <span className="text-slate-500 text-[11px] font-bold uppercase tracking-widest">Superadmin & Finance</span>
          <div className="flex flex-col mt-4">
            <p className="text-3xl font-black text-slate-900 mb-2">{adminStaff}</p>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(adminStaff/totalStaff)*100}%` }}></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. WORKSPACE & LIST STAF FULL WIDTH */}
      <div className="flex flex-col gap-6">
        
        {/* Toolbar Pencarian & Filter */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col sm:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="w-full lg:w-1/3">
            <AdminInput 
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="Cari nama staf atau email..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          <div className="relative w-full sm:w-auto shrink-0">
            <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#7A171D] focus:ring-[3px] focus:ring-[#7A171D]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[200px]">
              <option value="all">Semua Departemen</option>
              <option value="superadmin">Direksi (Superadmin)</option>
              <option value="admin_finance">Divisi Finance</option>
              <option value="admin_operational">Divisi Operasional</option>
              <option value="staff">Customer Service</option>
            </select>
          </div>
        </div>

        {/* List Staf - Card Layout Float */}
        <div className="space-y-4 min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-[#7A171D] animate-pulse" />
              <p>Sinkronisasi Node Staf...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full`}>
              <ShieldAlert className="w-16 h-16 mb-4 opacity-20" />
              <p>Tidak ada data staf yang sesuai dengan filter.</p>
            </div>
          ) : (
            processedData.map((s, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                key={s.uid} 
                className={`${glassCard} p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center`}
              >
                
                {/* Kolom 1: Info Personel */}
                <div className="md:col-span-5 flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full border border-slate-200 shadow-sm shrink-0 overflow-hidden bg-slate-100 flex items-center justify-center">
                     {s.photoURL ? (
                       <Image src={s.photoURL} alt="Foto" fill className="object-cover" sizes="48px" />
                     ) : (
                       <User className="w-5 h-5 text-slate-400" />
                     )}
                  </div>
                  <div className="flex flex-col gap-1 w-full overflow-hidden">
                    <p className="font-black text-slate-900 text-sm truncate">{s.displayName}</p>
                    <p className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1.5"><Mail className="w-3 h-3"/> {s.email}</p>
                  </div>
                </div>

                {/* Kolom 2: Divisi */}
                <div className="md:col-span-4 flex justify-start md:justify-center">
                  <span className="px-3 py-1.5 bg-white/60 border border-slate-200 rounded-lg text-slate-700 font-bold uppercase tracking-widest text-[10px] shadow-sm w-fit text-center">
                    {s.role.replace("admin_", "")}
                  </span>
                </div>

                {/* Kolom 3: Aksi */}
                <div className="md:col-span-3 flex items-center justify-end gap-2">
                  <AdminButton 
                    size="icon" 
                    variant="outline" 
                    onClick={() => router.push(`/admin/users/staff/${s.uid}`)} 
                    className="bg-white border-slate-200 text-slate-500 hover:text-[#7A171D] hover:border-[#7A171D]/30 shadow-sm shrink-0" 
                    title="Lihat Profil Detail"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </AdminButton>
                  
                  <AdminButton 
                    size="icon" 
                    variant="outline" 
                    onClick={() => handleToggleSuspend(s.uid, s.isSuspended || false)} 
                    className={`shadow-sm shrink-0 ${s.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-red-600 hover:text-white hover:border-red-600'}`} 
                    title={s.isSuspended ? "Unban" : "Suspend (Cabut Akses)"}
                  >
                    <Ban className="w-4 h-4" />
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