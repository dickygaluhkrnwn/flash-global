"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, AlertCircle, Activity, Filter, ArrowUpDown, ArrowUpRight, ArrowDownRight, Building2, FileText, CreditCard } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

interface UserSystemData {
  id: string;
  name: string;
  email: string;
  role: string;
  npwp?: string;
  b2bLimit?: number;
  contractStatus?: "Pending" | "Approved" | "Rejected";
}

export default function B2BManagementPage() {
  const [users, setUsers] = useState<UserSystemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 
  const [sortBy, setSortBy] = useState("name_asc");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() })) as UserSystemData[];
      setUsers(allUsers.filter(u => u.role === "business" || u.npwp));
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memuat data Korporat B2B.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateContract = async (userId: string, status: "Approved" | "Rejected", limitVal: number) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        contractStatus: status,
        b2bLimit: limitVal,
        role: status === "Approved" ? "business" : "user"
      });
      showToast("success", `Berkas kontrak perusahaan berhasil diperbarui.`);
      loadData();
    } catch {
      showToast("error", "Gagal memproses validasi berkas B2B.");
    }
  };

  const processedData = users
    .filter(u => {
      const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || (u.npwp || "").includes(searchQuery);
      const matchStatus = filterStatus === "all" ? true : (u.contractStatus || "Pending") === filterStatus;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (sortBy === "limit_desc") return (b.b2bLimit || 0) - (a.b2bLimit || 0);
      return 0;
    });

  // Kalkulasi Statistik Powerful
  const totalB2B = users.length;
  const approvedB2B = users.filter(u => u.contractStatus === "Approved").length;
  const pendingB2B = users.filter(u => u.contractStatus === "Pending" || !u.contractStatus).length;
  const totalLimit = users.reduce((sum, u) => sum + (u.contractStatus === "Approved" ? (u.b2bLimit || 0) : 0), 0);

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
            <Building2 className="w-7 h-7 text-[#7A171D]" /> Klien Korporat (B2B)
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Verifikasi legalitas perusahaan dan kelola limit piutang invoice korporat.</p>
        </div>
      </div>

      {/* ADVANCED STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Building2 className="w-16 h-16 text-purple-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Entitas Bisnis</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalB2B}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle2 className="w-16 h-16 text-emerald-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Kontrak Aktif</span>
          <p className="text-3xl font-black text-emerald-600 mt-2">{approvedB2B}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><FileText className="w-16 h-16 text-amber-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Menunggu Review</span>
          <p className="text-3xl font-black text-amber-600 mt-2">{pendingB2B}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CreditCard className="w-16 h-16 text-white"/></div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Limit Terdistribusi</span>
          <p className="text-2xl font-black text-white mt-2">Rp {(totalLimit / 1000000).toLocaleString('id-ID')} Juta</p>
        </div>
      </div>

      {/* WORKSPACE & TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari perusahaan atau NPWP..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-[#7A171D] transition-all shadow-sm" />
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[150px]">
                <option value="all">Semua Status</option>
                <option value="Approved">Disetujui</option>
                <option value="Pending">Menunggu Review</option>
                <option value="Rejected">Ditolak</option>
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[160px]">
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
                <option value="limit_desc">Limit Tertinggi</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-500"><Activity className="w-8 h-8 text-[#7A171D] animate-pulse" /> Memuat Data Korporat...</div>
          ) : processedData.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada entitas B2B yang cocok dengan filter pencarian.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-xs">
                  <th className="p-5 pl-6">Badan Perusahaan</th>
                  <th className="p-5">Legal Pajak (NPWP)</th>
                  <th className="p-5">Limit Invoice Piutang</th>
                  <th className="p-5">Status Kontrak</th>
                  <th className="p-5 pr-6 text-right">Aksi Konfirmasi Berkas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedData.map(u => <B2BRowKey key={u.id} user={u} onUpdate={handleUpdateContract} />)}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function B2BRowKey({ user, onUpdate }: { user: UserSystemData; onUpdate: (id: string, status: "Approved" | "Rejected", limitVal: number) => void }) {
  const [localLimit, setLocalLimit] = useState<number | "">(user.b2bLimit || 0);

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="p-5 pl-6">
        <p className="font-bold text-slate-900">{user.name}</p>
        <p className="text-slate-500 mt-0.5">{user.email}</p>
      </td>
      <td className="p-5 font-bold text-slate-600">{user.npwp || "Belum Input"}</td>
      <td className="p-5">
        <div className="relative w-40">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
          <input 
            type="number" 
            value={localLimit}
            onChange={(e) => setLocalLimit(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 outline-none focus:border-[#7A171D] focus:bg-white font-bold text-right transition-all shadow-inner"
          />
        </div>
      </td>
      <td className="p-5">
        <span className={`px-3 py-1.5 rounded-lg font-bold uppercase text-xs ${
          user.contractStatus === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
          user.contractStatus === "Rejected" ? "bg-red-50 text-red-700 border border-red-200" :
          "bg-amber-50 text-amber-700 border border-amber-200"
        }`}>
          {user.contractStatus || "Pending"}
        </span>
      </td>
      <td className="p-5 pr-6 flex justify-end gap-2 pt-6">
        <button onClick={() => onUpdate(user.id, "Approved", Number(localLimit) || 0)} className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5">
          <ArrowUpRight className="w-4 h-4" /> Approve
        </button>
        <button onClick={() => onUpdate(user.id, "Rejected", 0)} className="px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 font-bold text-xs rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5">
          <ArrowDownRight className="w-4 h-4" /> Reject
        </button>
      </td>
    </tr>
  );
}