"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, CheckCircle2, AlertCircle, Ban, Activity, Filter, ArrowUpDown, Truck, Wallet } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

interface DriverSystemData {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  balance: number;
  isSuspended?: boolean;
}

export default function DriversManagementPage() {
  const [drivers, setDrivers] = useState<DriverSystemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); 
  const [sortBy, setSortBy] = useState("name_asc");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "driver_wallets"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as DriverSystemData[];
      setDrivers(list);
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memuat data Driver.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleSuspend = async (driverId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "driver_wallets", driverId), { isSuspended: !currentStatus });
      showToast("success", "Status operasional armada diperbarui.");
      loadData();
    } catch {
      showToast("error", "Gagal merubah status armada.");
    }
  };

  const processedData = drivers
    .filter(d => {
      const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.phone.includes(searchQuery) || d.vehicleType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === "all" ? true : filterStatus === "suspended" ? d.isSuspended : !d.isSuspended;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (sortBy === "balance_desc") return b.balance - a.balance;
      return 0;
    });

  // Kalkulasi Statistik Powerful
  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter(d => !d.isSuspended).length;
  const suspendedDrivers = drivers.filter(d => d.isSuspended).length;
  const totalWalletBalance = drivers.reduce((sum, d) => sum + (d.balance || 0), 0);

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
            <Truck className="w-7 h-7 text-[#7A171D]" /> Mitra Sopir & Armada
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Manajemen armada pengiriman, pantau dompet sopir, dan status operasional kurir.</p>
        </div>
      </div>

      {/* ADVANCED STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Truck className="w-16 h-16 text-indigo-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Armada Aktif</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{totalDrivers}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle2 className="w-16 h-16 text-emerald-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Siap Beroperasi</span>
          <p className="text-3xl font-black text-emerald-600 mt-2">{activeDrivers}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Ban className="w-16 h-16 text-red-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Dalam Hukuman</span>
          <p className="text-3xl font-black text-red-600 mt-2">{suspendedDrivers}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Wallet className="w-16 h-16 text-emerald-600"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Dana Titipan (Dompet)</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">Rp {(totalWalletBalance / 1000000).toLocaleString('id-ID')} Juta</p>
        </div>
      </div>

      {/* WORKSPACE & TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari armada, nama atau telepon..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-[#7A171D] transition-all shadow-sm" />
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[140px]">
                <option value="all">Semua Status</option>
                <option value="active">Siap Operasi</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[170px]">
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
                <option value="balance_desc">Saldo Terbanyak</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-500"><Activity className="w-8 h-8 text-[#7A171D] animate-pulse" /> Memuat Data Armada...</div>
          ) : processedData.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada data pengemudi yang cocok.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-xs">
                  <th className="p-5 pl-6">Mitra Kurir</th>
                  <th className="p-5">Armada Kendaraan</th>
                  <th className="p-5">Saldo Dompet</th>
                  <th className="p-5">Status Jalan</th>
                  <th className="p-5 pr-6 text-right">Tindakan Khusus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedData.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 pl-6">
                      <p className="font-bold text-slate-900">{d.name}</p>
                      <p className="text-slate-500 mt-0.5">{d.phone}</p>
                    </td>
                    <td className="p-5 text-slate-700 font-medium">{d.vehicleType}</td>
                    <td className="p-5 font-black text-emerald-600">Rp {d.balance.toLocaleString('id-ID')}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-lg font-bold text-xs ${d.isSuspended ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {d.isSuspended ? "SUSPENDED" : "READY DISPATCH"}
                      </span>
                    </td>
                    <td className="p-5 pr-6 flex justify-end">
                      <button onClick={() => handleToggleSuspend(d.id, d.isSuspended || false)} className={`p-2.5 rounded-xl border transition-all shadow-sm ${d.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-600 hover:text-white'}`} title={d.isSuspended ? "Unban" : "Suspend"}>
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