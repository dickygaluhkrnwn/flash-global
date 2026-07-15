"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, AlertCircle, Ban, KeyRound, Activity, Filter, ArrowUpDown, Users, UserCheck, UserX } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";

// IMPORT GLOBAL TYPES
import { User } from "@/types/user";

export default function B2CManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 
  const [sortBy, setSortBy] = useState("name_asc"); 
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // MENDAPATKAN DATA (Dibungkus dalam useEffect agar aman dari dependensi loop linter)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const snap = await getDocs(collection(db, "users"));
        
        // Memetakan id menjadi uid, dan melakukan fallback aman untuk data legacy (name & phone)
        const allUsers = snap.docs.map(d => {
          const data = d.data();
          return {
            uid: d.id,
            ...data,
            displayName: data.displayName || data.name || "Klien",
            phoneNumber: data.phoneNumber || data.phone || "-"
          } as User;
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
    try {
      await updateDoc(doc(db, "users", userId), { isSuspended: !currentStatus });
      showToast("success", "Status pengguna diperbarui.");
      
      // Update state React lokal untuk menghindari fetch ulang yang berat
      setUsers(prevUsers => prevUsers.map(u => 
        u.uid === userId ? { ...u, isSuspended: !currentStatus } : u
      ));
    } catch {
      showToast("error", "Gagal merubah status suspensi.");
    }
  };

  const handleResetPassword = async (email: string) => {
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

  // Kalkulasi Statistik
  const totalUsers = users.length;
  const activeUsers = users.filter(u => !u.isSuspended).length;
  const suspendedUsers = users.filter(u => u.isSuspended).length;
  const activeRatio = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

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
            <Users className="w-7 h-7 text-[#7A171D]" /> Klien Personal (B2C)
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Kelola data klien reguler, pantau status akun, dan amankan akses pengguna.</p>
        </div>
      </div>

      {/* ADVANCED STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Users className="w-16 h-16 text-blue-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Klien Terdaftar</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalUsers}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><UserCheck className="w-16 h-16 text-emerald-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Klien Aktif</span>
          <p className="text-3xl font-black text-emerald-600 mt-2">{activeUsers}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><UserX className="w-16 h-16 text-red-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Akun Diblokir</span>
          <p className="text-3xl font-black text-red-600 mt-2">{suspendedUsers}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Rasio Keaktifan</span>
          <div className="flex items-end gap-3 mt-2">
            <p className="text-3xl font-black text-slate-900">{activeRatio}%</p>
            <div className="flex-1 mb-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${activeRatio}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* WORKSPACE & TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        {/* TOOLBAR FILTER & SEARCH */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari nama atau email klien..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-[#7A171D] transition-all shadow-sm" />
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[140px]">
                <option value="all">Semua Status</option>
                <option value="active">Node Aktif</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[160px]">
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABEL DATA */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-500"><Activity className="w-8 h-8 text-[#7A171D] animate-pulse" /> Memuat Data Klien...</div>
          ) : processedData.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada data klien yang cocok dengan filter pencarian.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-xs">
                  <th className="p-5 pl-6">Profil Klien</th>
                  <th className="p-5">Kontak Telefon</th>
                  <th className="p-5">Status Pengenal</th>
                  <th className="p-5 pr-6 text-right">Tindakan Khusus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedData.map(u => (
                  <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 pl-6">
                      <p className="font-bold text-slate-900">{u.displayName}</p>
                      <p className="text-slate-500 mt-0.5">{u.email}</p>
                    </td>
                    <td className="p-5 text-slate-600 font-medium">{u.phoneNumber || "-"}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-lg font-bold text-xs ${u.isSuspended ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                        {u.isSuspended ? "SUSPENDED" : "ACTIVE NODE"}
                      </span>
                    </td>
                    <td className="p-5 pr-6 flex justify-end gap-2 pt-6">
                      <button onClick={() => handleResetPassword(u.email)} className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:border-[#C5A059] hover:text-[#C5A059] transition-all shadow-sm" title="Reset Password">
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggleSuspend(u.uid, u.isSuspended || false)} className={`p-2.5 rounded-xl border transition-all shadow-sm ${u.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-600 hover:text-white'}`} title={u.isSuspended ? "Unban" : "Suspend"}>
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
  );
}