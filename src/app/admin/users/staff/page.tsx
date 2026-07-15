"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, AlertCircle, Ban, Activity, Filter, Plus, Save, Mail, ShieldAlert, ShieldCheck } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// IMPORT GLOBAL TYPES
import { User, Role } from "@/types/user";

export default function StaffManagementPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all"); 
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "staff" as Role });

  useEffect(() => {
    // MENDAPATKAN DATA (Dibungkus dalam useEffect agar aman dari dependensi loop linter)
    const loadData = async () => {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        
        // Memetakan ID dan memfilter role khusus Admin/Staff
        const allUsers = snap.docs.map(d => {
          const data = d.data();
          // Fallback legacy roles jika masih ada di DB
          let userRole = data.role as string;
          if (userRole === "admin_ops") userRole = "admin_operational";
          if (userRole === "admin_cs") userRole = "staff";

          return { 
            uid: d.id, 
            ...data, 
            role: userRole as Role,
            displayName: data.displayName || data.name || "Staf Baru" // Safe Fallback
          } as User;
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

  // RBAC GUARD
  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak (Otoritas Rendah)</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Halaman Manajemen Staf dan Hak Akses Node Server ini hanya dapat dibuka dan dikelola oleh Super Administrator.</p>
      </div>
    );
  }

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleSuspend = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUser.uid) {
      showToast("error", "Tindakan dilarang. Anda tidak bisa menyuspend diri sendiri.");
      return;
    }
    try {
      await updateDoc(doc(db, "users", userId), { isSuspended: !currentStatus });
      showToast("success", "Status otorisasi staf diperbarui.");
      
      // Update state React lokal untuk menghindari fetch ulang (Optimization)
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
        name: newStaff.name, // Untuk backward compatibility
        email: newStaff.email,
        role: newStaff.role,
        isSuspended: false,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, "users", staffMockId), newStaffData);
      showToast("success", `Hak akses internal staf ${newStaff.name} berhasil didaftarkan.`);
      
      // Update tabel secara lokal dengan data baru tanpa query ulang ke Firebase
      const createdStaff = { uid: staffMockId, ...newStaffData, createdAt: new Date() } as User;
      setUsers(prev => [createdStaff, ...prev]);
      
      setNewStaff({ name: "", email: "", role: "staff" });
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

  // Kalkulasi Statistik Staf
  const totalStaff = users.length;
  const opsStaff = users.filter(u => u.role === "admin_operational").length;
  const csStaff = users.filter(u => u.role === "staff").length;
  const adminStaff = users.filter(u => u.role === "admin_finance" || u.role === "superadmin").length;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER HALAMAN */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#7A171D]" /> Manajemen Staf Internal
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Tambah staf baru, kelola otoritas role (RBAC), dan cabut akses pegawai.</p>
        </div>
      </div>

      {/* ADVANCED STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#7A171D] to-[#5A0E13] rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ShieldCheck className="w-16 h-16 text-white"/></div>
          <span className="text-red-100 text-xs font-bold uppercase tracking-wider">Total Personel Inti</span>
          <p className="text-3xl font-black text-white mt-2">{totalStaff}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tim Operasional</span>
          <div className="flex items-end gap-3 mt-2">
            <p className="text-3xl font-black text-slate-900">{opsStaff}</p>
            <div className="flex-1 mb-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(opsStaff/totalStaff)*100}%` }}></div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tim Customer Service</span>
          <div className="flex items-end gap-3 mt-2">
            <p className="text-3xl font-black text-slate-900">{csStaff}</p>
            <div className="flex-1 mb-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(csStaff/totalStaff)*100}%` }}></div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Superadmin & Finance</span>
          <div className="flex items-end gap-3 mt-2">
            <p className="text-3xl font-black text-slate-900">{adminStaff}</p>
            <div className="flex-1 mb-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(adminStaff/totalStaff)*100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Kiri: Form Register Staf */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-6 rounded-2xl space-y-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#7A171D]"/> Tambah Akun Staf
          </h3>
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Nama Staf</label>
              <input type="text" required value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-sm font-semibold outline-none focus:border-[#7A171D] focus:bg-white transition-all shadow-inner" placeholder="Nama..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Email Login</label>
              <input type="email" required value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-sm font-semibold outline-none focus:border-[#7A171D] focus:bg-white transition-all shadow-inner" placeholder="staf@flashglobal.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Otoritas Role</label>
              <select value={newStaff.role} onChange={(e) => setNewStaff({...newStaff, role: e.target.value as Role})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 text-sm font-semibold outline-none focus:border-[#7A171D] focus:bg-white transition-all shadow-inner">
                <option value="staff">Customer Service (CS / Staff)</option>
                <option value="admin_operational">Operational Admin</option>
                <option value="admin_finance">Finance Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
            <button type="submit" disabled={isProcessing} className="w-full mt-2 bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-4 rounded-xl text-sm transition-all shadow-lg shadow-[#7A171D]/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {isProcessing ? "Menyimpan Data..." : "Otorisasikan Staf"}
            </button>
          </form>
        </div>

        {/* Kanan: List Staf & Filter */}
        <div className="lg:col-span-8 space-y-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          <div className="flex flex-col sm:flex-row gap-4 bg-slate-50/50 p-4 border-b border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Cari personel..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-[#7A171D] shadow-sm transition-all" />
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[170px]">
                <option value="all">Semua Departemen</option>
                <option value="superadmin">Direksi (Superadmin)</option>
                <option value="admin_finance">Finance</option>
                <option value="admin_operational">Operasional</option>
                <option value="staff">Customer Service</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-20 flex flex-col items-center gap-4 text-slate-500"><Activity className="w-8 h-8 text-[#7A171D] animate-pulse" /> Sinkronisasi Node Staf...</div>
            ) : processedData.length === 0 ? (
              <div className="p-20 text-center text-slate-500 font-medium">Tidak ada data staf yang sesuai filter.</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-white text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-xs">
                    <th className="p-5 pl-6">Nama Personel</th>
                    <th className="p-5">Hak Jabatan / Divisi</th>
                    <th className="p-5 pr-6 text-right">Tindakan Keamanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {processedData.map(s => (
                    <tr key={s.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 pl-6">
                        <p className="font-bold text-slate-900">{s.displayName}</p>
                        <p className="text-slate-500 mt-0.5 flex items-center gap-1.5 text-xs"><Mail className="w-3.5 h-3.5"/> {s.email}</p>
                      </td>
                      <td className="p-5">
                        <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                          {s.role.replace("admin_", "")}
                        </span>
                      </td>
                      <td className="p-5 pr-6 flex justify-end">
                        <button 
                          onClick={() => handleToggleSuspend(s.uid, s.isSuspended || false)} 
                          className={`p-2.5 rounded-xl border transition-all shadow-sm ${s.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-600 hover:text-white'}`} 
                          title={s.isSuspended ? "Unban" : "Suspend (Cabut Akses)"}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}