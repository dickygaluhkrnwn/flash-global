"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Search, CheckCircle2, AlertCircle, Ban, Truck, 
  Plus, User, Building2, UserSquare2, 
  ShieldAlert, Activity, Eye, Trash2, Clock, Filter,
  Users2, UserMinus, FileText
} from "lucide-react"; 

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
import { DriverData } from "@/types/admin";

type StatusFilterType = "All" | "Basic" | "Pending" | "Active" | "Suspended";

export default function FleetManagementDashboard() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [partners, setPartners] = useState<DriverData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("All");

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // =========================================================================
  // CUSTOM STYLES: APPLE GLASSMORPHISM
  // =========================================================================
  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
  const glassCard = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-[1.5rem]";

  // =========================================================================
  // LOGIC AREA
  // =========================================================================
  
  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const usersQuery = query(collection(db, "users"), where("role", "==", "driver"));
      
      const [usersSnap, walletsSnap] = await Promise.all([
        getDocs(usersQuery),
        getDocs(collection(db, "driver_wallets"))
      ]);
      
      const dataMap = new Map<string, DriverData>();

      usersSnap.docs.forEach(d => {
        dataMap.set(d.id, { id: d.id, ...d.data() } as DriverData);
      });

      walletsSnap.docs.forEach(d => {
        const existing = dataMap.get(d.id) || {};
        dataMap.set(d.id, { ...existing, id: d.id, ...d.data() } as DriverData);
      });

      const list = Array.from(dataMap.values());
      
      const sortedList = list.sort((a, b) => {
        const getSeconds = (item: DriverData) => {
          if (!item.createdAt) return 0;
          const ts = item.createdAt as Record<string, unknown>;
          return typeof ts.seconds === 'number' ? ts.seconds : 0;
        };
        return getSeconds(b) - getSeconds(a);
      });

      setPartners(sortedList);
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memuat ekosistem mitra.");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (partnerId: string) => {
    if (!confirm("Setujui pendaftaran dan aktifkan entitas mitra ini?")) return;
    try {
      await updateDoc(doc(db, "driver_wallets", partnerId), { status: "Active", isSuspended: false });
      const targetPartner = partners.find(p => p.id === partnerId);
      if (targetPartner && targetPartner.email) {
        await updateDoc(doc(db, "users", partnerId), { status: "Active" }).catch(()=> {});
      }
      showToast("success", "Mitra berhasil diverifikasi dan aktif.");
      setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, status: "Active", isSuspended: false } : p));
    } catch (error) {
      console.error("Gagal verifikasi:", error);
      showToast("error", "Gagal memverifikasi mitra.");
    }
  };

  const handleToggleSuspend = async (partnerId: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Yakin ingin mengaktifkan kembali entitas ini?" : "PERINGATAN! Entitas yang di-suspend tidak akan bisa menerima order. Yakin suspend?")) return;
    try {
      await updateDoc(doc(db, "driver_wallets", partnerId), { isSuspended: !currentStatus });
      showToast("success", "Status operasional diperbarui.");
      setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, isSuspended: !currentStatus } : p));
    } catch {
      showToast("error", "Gagal merubah status.");
    }
  };

  const handleDelete = async (partnerId: string) => {
    if (!confirm("Tindakan ini sangat fatal! Menghapus mitra akan menghilangkan seluruh rekam jejak. Anda yakin?")) return;
    try {
      await deleteDoc(doc(db, "driver_wallets", partnerId)).catch(() => {});
      await deleteDoc(doc(db, "users", partnerId)).catch(() => {});
      
      showToast("success", "Data mitra berhasil dihapus permanen.");
      setPartners(prev => prev.filter(p => p.id !== partnerId));
    } catch (error) {
      console.error("Gagal menghapus data:", error);
      showToast("error", "Gagal menghapus mitra.");
    }
  };

  const processedData = useMemo(() => {
    let result = [...partners];
    
    if (statusFilter === "Basic") {
      result = result.filter(p => !p.partnerType); 
    } else if (statusFilter === "Pending") {
      result = result.filter(p => p.partnerType && p.status === "Pending");
    } else if (statusFilter === "Suspended") {
      result = result.filter(p => p.isSuspended === true);
    } else if (statusFilter === "Active") {
      result = result.filter(p => p.partnerType && p.status !== "Pending" && !p.isSuspended);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        String(p.name || "").toLowerCase().includes(q) || 
        String(p.companyName || "").toLowerCase().includes(q) ||
        String(p.phone || "").includes(q) ||
        String(p.licensePlate || "").toLowerCase().includes(q) ||
        String(p.email || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [partners, statusFilter, searchQuery]);

  const stats = {
    totalEntities: partners.length,
    basicAccounts: partners.filter(p => !p.partnerType).length, 
    individu: partners.filter(p => p.partnerType === "Individual").length,
    vendor: partners.filter(p => p.partnerType === "Vendor").length,
    supirTruk: partners.filter(p => p.partnerType === "FleetDriver").length,
    armadaTruk: partners.filter(p => p.partnerType === "FleetVehicle").length,
    pending: partners.filter(p => p.partnerType && p.status === "Pending").length
  };

  // =========================================================================
  // UI AREA
  // =========================================================================
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
      
      {/* GLOBAL TOAST NOTIFICATIONS */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-white/80`}>
        <div className="relative z-10 space-y-3">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(122,23,29,0.3)] border border-[#5A0E13]">
              <Users2 className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Verifikasi & Ekosistem
          </h1>
          <p className="text-slate-500 text-sm max-w-xl font-medium mt-2">
            Dashboard utama untuk memantau pendaftar baru dan merangkum seluruh ekosistem mitra pengemudi & armada vendor.
          </p>
        </div>
        <AdminButton onClick={() => router.push("/admin/users/drivers/add")} className="h-12 shadow-[0_8px_20px_rgba(122,23,29,0.25)]">
          <Plus className="w-4 h-4 mr-2" /> Pendaftaran Manual
        </AdminButton>
      </div>

      {/* 2. STATISTIK HELICOPTER VIEW TERLENGKAP (Mini Bento Glass) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        
        <div className={`${glassPanel} p-5 relative overflow-hidden group cursor-pointer hover:border-slate-400 hover:bg-white`} onClick={() => setStatusFilter("Basic")}>
          <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-slate-400 rounded-full blur-[60px] opacity-20" />
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest relative z-10 flex items-center gap-1.5"><UserMinus className="w-3.5 h-3.5"/> Akun Dasar</span>
          <p className="text-2xl font-black text-slate-800 mt-2 relative z-10">{stats.basicAccounts}</p>
        </div>

        <div className={`${glassPanel} p-5 relative overflow-hidden group hover:border-[#C5A059] hover:bg-white cursor-pointer`} onClick={() => router.push('/admin/users/drivers/individual')}>
          <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-[#C5A059] rounded-full blur-[60px] opacity-20" />
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest relative z-10 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-[#C5A059]"/> Mitra Individu</span>
          <p className="text-2xl font-black text-slate-900 mt-2 relative z-10">{stats.individu}</p>
        </div>

        <div className={`${glassPanel} p-5 relative overflow-hidden group hover:border-blue-500 hover:bg-white cursor-pointer`} onClick={() => router.push('/admin/users/drivers/vendor')}>
          <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-blue-500 rounded-full blur-[60px] opacity-20" />
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest relative z-10 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-blue-500"/> Vendor PT</span>
          <p className="text-2xl font-black text-slate-900 mt-2 relative z-10">{stats.vendor}</p>
        </div>

        <div className={`${glassPanel} p-5 relative overflow-hidden group hover:border-[#7A171D] hover:bg-white cursor-pointer`} onClick={() => router.push('/admin/users/drivers/fleet-drivers')}>
          <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-[#7A171D] rounded-full blur-[60px] opacity-20" />
          <span className="#7A171D text-[10px] font-bold uppercase tracking-widest relative z-10 flex items-center gap-1.5 text-[#7A171D]"><UserSquare2 className="w-3.5 h-3.5"/> Sopir Vendor</span>
          <p className="text-2xl font-black text-[#7A171D] mt-2 relative z-10">{stats.supirTruk}</p>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-950 rounded-[1.5rem] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_20px_rgba(15,23,42,0.3)] relative overflow-hidden group hover:brightness-110 cursor-pointer transition-all" onClick={() => router.push('/admin/users/drivers/fleet-vehicles')}>
          <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-slate-500 rounded-full blur-[60px] opacity-20" />
          <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest relative z-10 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-white"/> Armada Truk</span>
          <p className="text-2xl font-black text-white mt-2 relative z-10">{stats.armadaTruk}</p>
        </div>

        <div className={`${glassPanel} p-5 relative overflow-hidden group cursor-pointer border-amber-200/50 hover:bg-amber-50/50`} onClick={() => setStatusFilter("Pending")}>
          <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-amber-500 rounded-full blur-[60px] opacity-20" />
          <span className="text-amber-700 text-[10px] font-bold uppercase tracking-widest relative z-10 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Verifikasi</span>
          <p className="text-2xl font-black text-amber-700 mt-2 relative z-10">{stats.pending}</p>
        </div>
      </div>

      {/* 3. MAIN DATA: CARD-BASED LIST */}
      <div className="flex flex-col gap-6">
        
        {/* Filters & Search Bar */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="w-full lg:w-1/3">
            <AdminInput 
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="Cari nama, PT, plat nomor, email..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          
          <div className="relative w-full lg:w-auto shrink-0">
            <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)} className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#7A171D] focus:ring-[3px] focus:ring-[#7A171D]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[240px]">
              <option value="All">Semua Kondisi & Status</option>
              <option value="Basic">Akun Dasar (Pre-Onboard)</option>
              <option value="Pending">Menunggu Verifikasi</option>
              <option value="Active">Aktif / Berjalan</option>
              <option value="Suspended">Dibekukan (Suspend)</option>
            </select>
          </div>
        </div>

        {/* Card Layout Float */}
        <div className="space-y-4 min-h-[500px]">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-[#7A171D] animate-pulse" />
              <p>Menyelaraskan Ekosistem Database...</p>
            </div>
          ) : processedData.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full`}>
              <Users2 className="w-16 h-16 mb-4 opacity-20" />
              <p>Tidak ada entitas mitra yang sesuai dengan filter.</p>
            </div>
          ) : (
            processedData.map((p, idx) => {
              const isBasic = !p.partnerType;

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  key={p.id} 
                  className={`${glassCard} p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center ${isBasic ? 'opacity-70 hover:opacity-100' : ''}`}
                >
                  
                  {/* KOLOM 1: PROFIL & ENTITAS */}
                  <div className="lg:col-span-4 flex items-start gap-4">
                    <div className="relative w-14 h-14 rounded-2xl border border-white shadow-[0_4px_10px_rgba(0,0,0,0.05)] shrink-0 overflow-hidden bg-white/60 flex items-center justify-center">
                       {p.fotoProfileUrl ? <Image src={String(p.fotoProfileUrl)} alt="Foto" fill className="object-cover" sizes="56px" /> : 
                        isBasic ? <UserMinus className="w-6 h-6 text-slate-300" /> :
                        p.partnerType === "Vendor" ? <Building2 className="w-6 h-6 text-[#7A171D]" /> :
                        p.partnerType === "FleetVehicle" ? <Truck className="w-6 h-6 text-slate-400" /> :
                        <User className="w-6 h-6 text-[#C5A059]" />
                       }
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      <p className="font-black text-slate-900 text-sm truncate max-w-[200px]" title={String(p.companyName || p.name || "Pendaftar Baru")}>
                        {String(p.companyName || p.name || "Pendaftar Baru")}
                      </p>
                      {(p.phone || p.email || p.licensePlate) && (
                        <p className="text-[11px] text-slate-500 font-mono font-medium truncate max-w-[200px]">
                          {String(p.phone || p.email || p.licensePlate)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* KOLOM 2: KATEGORI MITRA */}
                  <div className="lg:col-span-2 flex flex-col items-start gap-2">
                    {isBasic ? (
                      <AdminBadge variant="outline" className="text-[9px]">Belum Pilih Jalur</AdminBadge>
                    ) : p.partnerType === "Vendor" ? (
                      <span className="text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg shadow-sm">PT / VENDOR</span>
                    ) : p.partnerType === "Individual" ? (
                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded w-fit font-bold uppercase tracking-widest flex items-center gap-1.5"><Truck className="w-3 h-3 text-slate-400"/> {String(p.vehicleType || "Armada")}</span>
                        <span className="text-[10px] font-black text-[#C5A059] uppercase tracking-widest">Sopir Pribadi</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5 w-full">
                        {p.vehicleType && <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded w-fit font-bold uppercase tracking-widest flex items-center gap-1.5"><Truck className="w-3 h-3 text-slate-400"/> {String(p.vehicleType)}</span>}
                        <span className="text-[9px] bg-white border border-[#C5A059]/30 text-[#A68345] px-2 py-1 rounded font-bold truncate max-w-[150px] shadow-sm" title={String(p.vendorName || "Vendor")}>PT: {String(p.vendorName || "Unknown")}</span>
                      </div>
                    )}
                  </div>

                  {/* KOLOM 3: KELENGKAPAN DATA */}
                  <div className="lg:col-span-2">
                    {isBasic ? (
                       <span className="text-[10px] text-slate-400 italic font-medium">Pra-Onboarding...</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {p.nik ? <AdminBadge variant="default" className="text-[9px]">NIK</AdminBadge> : null}
                        {p.simNumber ? <AdminBadge variant="default" className="text-[9px]">SIM</AdminBadge> : null}
                        {p.npwp ? <AdminBadge variant="warning" className="text-[9px]">NPWP</AdminBadge> : null}
                        {p.stnkUrl ? <AdminBadge variant="info" className="text-[9px] flex items-center gap-1"><FileText className="w-2.5 h-2.5"/> STNK</AdminBadge> : null}
                        {p.kirUrl ? <AdminBadge variant="success" className="text-[9px]">KIR</AdminBadge> : null}
                        {!p.nik && !p.simNumber && !p.npwp && !p.stnkUrl && !p.kirUrl ? <span className="text-[10px] text-slate-400 italic">Data kosong</span> : null}
                      </div>
                    )}
                  </div>

                  {/* KOLOM 4: STATUS */}
                  <div className="lg:col-span-2 flex flex-col items-start gap-2">
                    {isBasic ? (
                      <AdminBadge variant="outline" className="text-[9px]">PRE-ONBOARD</AdminBadge>
                    ) : p.status === "Pending" ? (
                      <AdminBadge variant="warning" className="text-[9px] flex items-center gap-1.5"><Clock className="w-3 h-3"/> PERLU CEK</AdminBadge>
                    ) : p.isSuspended ? (
                      <AdminBadge variant="danger" className="text-[9px]">SUSPENDED</AdminBadge>
                    ) : (
                      <AdminBadge variant="success" className="text-[9px]">ACTIVE VERIFIED</AdminBadge>
                    )}
                  </div>

                  {/* KOLOM 5: TINDAKAN */}
                  <div className="lg:col-span-2 flex items-center justify-end gap-2">
                    
                    {/* Tombol Approval Khusus Pending */}
                    {!isBasic && p.status === "Pending" && (
                      <button onClick={() => handleApprove(p.id)} className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm flex items-center justify-center" title="Setujui Kemitraan">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    )}

                    <button onClick={() => router.push(`/admin/users/drivers/${p.id}`)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm flex items-center justify-center" title="Lihat Detail Entitas">
                      <Eye className="w-4 h-4" />
                    </button>
                    
                    {!isBasic && p.status !== "Pending" && (
                      <button onClick={() => handleToggleSuspend(p.id, p.isSuspended || false)} className={`w-10 h-10 rounded-xl border transition-all shadow-sm flex items-center justify-center ${p.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-amber-500 hover:text-white hover:border-amber-500'}`} title={p.isSuspended ? "Aktifkan Kembali" : "Suspend Entitas"}>
                        <Ban className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button onClick={() => handleDelete(p.id)} className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all shadow-sm flex items-center justify-center" title="Hapus Permanen">
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