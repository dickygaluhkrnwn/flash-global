"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Search, CheckCircle2, AlertCircle, Ban, 
  ShieldAlert, Activity, Eye, Trash2, 
  Clock, Filter, UserSquare2, Building2, MapPin, Phone
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
import { DriverData } from "@/types/admin";

type StatusFilterType = "All" | "Pending" | "Active" | "Suspended";

export default function FleetDriversPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [fleetDrivers, setFleetDrivers] = useState<DriverData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("All");

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // =========================================================================
  // CUSTOM STYLES: APPLE GLASSMORPHISM (Maroon Accent)
  // =========================================================================
  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
  const glassCard = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-[1.5rem]";

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "driver_wallets"), where("partnerType", "==", "FleetDriver"));
      const snap = await getDocs(q);
      
      const list = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      })) as DriverData[];
      
      const sortedList = list.sort((a, b) => {
        const getSeconds = (item: DriverData) => {
          if (!item.createdAt) return 0;
          const ts = item.createdAt as Record<string, unknown>;
          return typeof ts.seconds === 'number' ? ts.seconds : 0;
        };
        return getSeconds(b) - getSeconds(a);
      });

      setFleetDrivers(sortedList);
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memuat data sopir vendor (fleet).");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleApprove = async (partnerId: string) => {
    if (!confirm("Setujui legalitas sopir ini dan aktifkan akunnya di bawah naungan vendor?")) return;
    try {
      await updateDoc(doc(db, "driver_wallets", partnerId), { status: "Active", isSuspended: false });
      await updateDoc(doc(db, "users", partnerId), { status: "Active" });

      showToast("success", "Sopir fleet berhasil diverifikasi dan aktif.");
      setFleetDrivers(prev => prev.map(d => d.id === partnerId ? { ...d, status: "Active", isSuspended: false } : d));
    } catch (error) {
      console.error("Gagal verifikasi:", error);
      showToast("error", "Gagal memverifikasi sopir fleet.");
    }
  };

  const handleToggleSuspend = async (partnerId: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Yakin mengaktifkan kembali sopir ini?" : "Suspend sopir ini? Ia tidak akan bisa login ke aplikasi dan menjalankan armada vendor.")) return;
    try {
      await updateDoc(doc(db, "driver_wallets", partnerId), { isSuspended: !currentStatus });
      showToast("success", "Status operasional sopir diperbarui.");
      setFleetDrivers(prev => prev.map(d => d.id === partnerId ? { ...d, isSuspended: !currentStatus } : d));
    } catch {
      showToast("error", "Gagal merubah status.");
    }
  };

  const handleDelete = async (partnerId: string) => {
    if (!confirm("Hapus permanen sopir ini beserta rekam jejaknya?")) return;
    try {
      await deleteDoc(doc(db, "driver_wallets", partnerId));
      showToast("success", "Data sopir fleet berhasil dihapus permanen.");
      setFleetDrivers(prev => prev.filter(d => d.id !== partnerId));
    } catch (error) {
      console.error("Gagal menghapus data:", error);
      showToast("error", "Gagal menghapus sopir.");
    }
  };

  const processedData = useMemo(() => {
    let result = [...fleetDrivers];
    
    if (statusFilter === "Pending") {
      result = result.filter(d => d.status === "Pending");
    } else if (statusFilter === "Suspended") {
      result = result.filter(d => d.isSuspended === true);
    } else if (statusFilter === "Active") {
      result = result.filter(d => d.status !== "Pending" && !d.isSuspended);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => 
        String(d.name || "").toLowerCase().includes(q) || 
        String(d.vendorName || "").toLowerCase().includes(q) || 
        String(d.simNumber || "").toLowerCase().includes(q) ||
        String(d.phone || "").includes(q)
      );
    }
    return result;
  }, [fleetDrivers, statusFilter, searchQuery]);

  const stats = {
    total: fleetDrivers.length,
    active: fleetDrivers.filter(d => d.status !== "Pending" && !d.isSuspended).length,
    pending: fleetDrivers.filter(d => d.status === "Pending").length,
    suspended: fleetDrivers.filter(d => d.isSuspended).length
  };

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
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER (Glass Panel) */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-white/80`}>
        <div className="flex items-center gap-5 relative z-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(122,23,29,0.3)] border border-[#5A0E13]">
                <UserSquare2 className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              Database Sopir Vendor
            </h1>
            <p className="text-slate-500 text-sm mt-3 font-medium max-w-xl">
              Kelola data sopir fisik yang bekerja dan ditautkan di bawah naungan Mitra Perusahaan (Vendor/PT).
            </p>
          </div>
        </div>
      </div>

      {/* 2. STATS CARDS (Mini Bento Glass) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 cursor-pointer`} onClick={() => setStatusFilter("All")}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-slate-400 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Sopir Fleet</span>
            <div className="w-10 h-10 rounded-full bg-white/60 border border-white shadow-sm flex items-center justify-center"><UserSquare2 className="w-5 h-5 text-slate-700" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight">{stats.total}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 cursor-pointer border-[#7A171D]/30`} onClick={() => setStatusFilter("Active")}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#7A171D] rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-[#7A171D] uppercase tracking-widest">Aktif / Siap Jalan</span>
            <div className="w-10 h-10 rounded-full bg-[#7A171D]/10 border border-[#7A171D]/20 shadow-sm flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-[#7A171D]" /></div>
          </div>
          <p className="text-3xl font-black text-[#7A171D] mt-4 relative z-10 tracking-tight">{stats.active}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 cursor-pointer border-amber-200/50`} onClick={() => setStatusFilter("Pending")}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-amber-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">Antrean Verifikasi</span>
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 shadow-sm flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
          </div>
          <p className="text-3xl font-black text-amber-700 mt-4 relative z-10 tracking-tight">{stats.pending}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 cursor-pointer border-red-200/50`} onClick={() => setStatusFilter("Suspended")}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-red-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-widest">Akun Dibekukan</span>
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 shadow-sm flex items-center justify-center"><Ban className="w-5 h-5 text-red-600" /></div>
          </div>
          <p className="text-3xl font-black text-red-700 mt-4 relative z-10 tracking-tight">{stats.suspended}</p>
        </motion.div>
      </div>

      {/* 3. MAIN DATA: CARD-BASED LIST */}
      <div className="flex flex-col gap-6">
        
        {/* Filters & Search Bar */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="w-full lg:w-1/3">
            <AdminInput 
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="Cari nama sopir, PT, atau SIM..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          
          <div className="relative w-full lg:w-auto shrink-0">
            <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)} className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#7A171D] focus:ring-[3px] focus:ring-[#7A171D]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[240px]">
              <option value="All">Filter: Semua Status</option>
              <option value="Active">Hanya Aktif</option>
              <option value="Pending">Butuh Verifikasi</option>
              <option value="Suspended">Dibekukan</option>
            </select>
          </div>
        </div>

        {/* List Sopir Fleet - Card Layout Float */}
        <div className="space-y-4 min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-[#7A171D] animate-pulse" />
              <p>Memuat Database Sopir Vendor...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full`}>
              <UserSquare2 className="w-16 h-16 mb-4 opacity-20" />
              <p>Tidak ada data sopir vendor yang sesuai dengan filter.</p>
            </div>
          ) : (
            processedData.map((d, idx) => {
              let badgeVariant: "success"|"warning"|"danger"|"info"|"brand"|"default" = "success";
              if (d.status === "Pending") badgeVariant = "warning";
              else if (d.isSuspended) badgeVariant = "danger";

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  key={d.id} 
                  className={`${glassCard} p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center`}
                >
                  
                  {/* KOLOM 1: PROFIL SOPIR */}
                  <div className="lg:col-span-4 flex items-start gap-4">
                    <div className="relative w-14 h-14 rounded-2xl border border-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] shrink-0 overflow-hidden bg-[#7A171D]/10 flex items-center justify-center">
                       {d.fotoProfileUrl ? <Image src={String(d.fotoProfileUrl)} alt="Foto" fill className="object-cover" sizes="56px" /> : <UserSquare2 className="w-6 h-6 text-[#7A171D]" />}
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <p className="font-black text-slate-900 text-sm truncate max-w-[200px]" title={String(d.name || "Tanpa Nama")}>
                        {String(d.name || "Tanpa Nama")}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 font-medium">
                        <Phone className="w-3 h-3 shrink-0" /> <span className="font-mono">{String(d.phone || "-")}</span>
                      </div>
                      <span className="inline-block mt-1.5 text-[9px] font-black text-[#7A171D] bg-[#7A171D]/10 px-2 py-0.5 rounded-md border border-[#7A171D]/20 uppercase tracking-widest w-fit shadow-sm">
                        Sopir Fleet (Vendor)
                      </span>
                    </div>
                  </div>
                  
                  {/* KOLOM 2: AFILIASI VENDOR */}
                  <div className="lg:col-span-3 flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white/60 px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm w-full">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0"/> <span className="truncate">{String(d.vendorName || "Belum ada PT")}</span>
                    </div>
                    {d.vendorId && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-white/60 px-2.5 py-1 rounded-lg border border-slate-100 w-full uppercase tracking-widest">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0"/> <span className="font-mono truncate" title={d.vendorId}>ID: {String(d.vendorId).substring(0,8)}</span>
                      </div>
                    )}
                  </div>

                  {/* KOLOM 3: LEGALITAS DOKUMEN */}
                  <div className="lg:col-span-2">
                     <div className="flex flex-col gap-2">
                       {d.simNumber && (
                         <div className="flex items-center gap-2 bg-white/50 px-2 py-1 rounded-lg border border-white w-fit shadow-sm">
                           <AdminBadge variant="default" className="text-[9px] px-1.5 py-0 shrink-0 bg-slate-200 text-slate-700">SIM</AdminBadge>
                           <span className="text-[11px] font-mono font-bold text-slate-700 truncate max-w-[80px]" title={d.simNumber}>{d.simNumber}</span>
                         </div>
                       )}
                       <div className="flex flex-wrap gap-1.5">
                         {d.nik ? <AdminBadge variant="default" className="text-[9px] bg-slate-100 text-slate-600 border-slate-200">NIK Terdaftar</AdminBadge> : null}
                         {!d.simNumber && !d.nik && <span className="text-[10px] text-slate-400 italic">Data belum lengkap</span>}
                       </div>
                     </div>
                  </div>

                  {/* KOLOM 4: STATUS */}
                  <div className="lg:col-span-1 flex flex-col items-start gap-2">
                    <AdminBadge variant={badgeVariant} className="text-[9px] flex items-center gap-1.5">
                       {d.status === "Pending" ? <><Clock className="w-3 h-3"/> Pending</> : d.isSuspended ? "Suspended" : "Active"}
                    </AdminBadge>
                  </div>

                  {/* KOLOM 5: TINDAKAN */}
                  <div className="lg:col-span-2 flex items-center justify-end gap-2">
                    
                    {d.status === "Pending" && (
                      <button onClick={() => handleApprove(d.id)} className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center justify-center" title="Verifikasi Sopir & Aktifkan">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}

                    <button onClick={() => router.push(`/admin/users/drivers/${d.id}`)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm flex items-center justify-center" title="Lihat Profil Detail">
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {d.status !== "Pending" && (
                      <button onClick={() => handleToggleSuspend(d.id, d.isSuspended || false)} className={`w-10 h-10 rounded-xl border transition-all shadow-sm flex items-center justify-center ${d.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-orange-500 hover:text-white hover:border-orange-500'}`} title={d.isSuspended ? "Aktifkan Akun" : "Suspend Akun"}>
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button onClick={() => handleDelete(d.id)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all shadow-sm flex items-center justify-center" title="Hapus Permanen">
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>

                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}