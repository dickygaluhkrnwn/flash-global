"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Search, CheckCircle2, AlertCircle, Ban, Truck, 
  Plus, User, Building2, UserSquare2, 
  ShieldAlert, Activity, Eye, Trash2, Clock, Filter,
  Users2, UserMinus
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// IMPORT GLOBAL TYPES
import { DriverData } from "@/types/admin";

export default function FleetManagementDashboard() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [partners, setPartners] = useState<DriverData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Basic" | "Pending" | "Active" | "Suspended">("All");

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 🚀 THE ULTIMATE MERGE: Menarik data dari 'users' dan 'driver_wallets'
      const usersQuery = query(collection(db, "users"), where("role", "==", "driver"));
      
      const [usersSnap, walletsSnap] = await Promise.all([
        getDocs(usersQuery),
        getDocs(collection(db, "driver_wallets"))
      ]);
      
      const dataMap = new Map<string, DriverData>();

      // 1. Masukkan data dari tabel users (Akun Dasar yang baru daftar)
      usersSnap.docs.forEach(d => {
        dataMap.set(d.id, { id: d.id, ...d.data() } as DriverData);
      });

      // 2. Timpa & Lengkapi dengan data dari tabel driver_wallets (Data Valid & Armada)
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
    if (!confirm("Setujui pendaftaran dan aktifkan entitas mitra ini?")) return;
    
    try {
      await updateDoc(doc(db, "driver_wallets", partnerId), { status: "Active", isSuspended: false });
      
      // Update di tabel users jika akun memiliki login
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
      result = result.filter(p => !p.partnerType); // FIX: Hanya yang belum punya PartnerType
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
    basicAccounts: partners.filter(p => !p.partnerType).length, // FIX: Belum pilih kemitraan
    individu: partners.filter(p => p.partnerType === "Individual").length,
    vendor: partners.filter(p => p.partnerType === "Vendor").length,
    supirTruk: partners.filter(p => p.partnerType === "FleetDriver").length,
    armadaTruk: partners.filter(p => p.partnerType === "FleetVehicle").length,
    pending: partners.filter(p => p.partnerType && p.status === "Pending").length
  };

  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-10">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Users2 className="w-7 h-7 text-[#7A171D]" /> Pusat Verifikasi & Ekosistem
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Dashboard utama untuk memantau pendaftar baru dan merangkum seluruh ekosistem mitra.</p>
        </div>
        <Button onClick={() => router.push("/admin/users/drivers/add")} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white shadow-md shadow-[#7A171D]/20 font-bold h-12 px-6">
          <Plus className="w-4 h-4 mr-2" /> Pendaftaran Manual
        </Button>
      </div>

      {/* STATISTIK HELICOPTER VIEW TERLENGKAP */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm relative overflow-hidden group cursor-pointer hover:border-slate-400 transition-colors" onClick={() => setStatusFilter("Basic")}>
          <div className="absolute top-0 right-0 p-2 opacity-5"><UserMinus className="w-10 h-10 text-slate-600"/></div>
          <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Akun Dasar</span>
          <p className="text-xl font-black text-slate-700 mt-1">{stats.basicAccounts}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative overflow-hidden group hover:border-[#C5A059] transition-colors cursor-pointer" onClick={() => router.push('/admin/users/drivers/individual')}>
          <div className="absolute top-0 right-0 p-2 opacity-10"><User className="w-10 h-10 text-[#C5A059]"/></div>
          <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Mitra Individu</span>
          <p className="text-xl font-black text-slate-900 mt-1">{stats.individu}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative overflow-hidden group hover:border-blue-500 transition-colors cursor-pointer" onClick={() => router.push('/admin/users/drivers/vendor')}>
          <div className="absolute top-0 right-0 p-2 opacity-10"><Building2 className="w-10 h-10 text-blue-600"/></div>
          <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Vendor PT</span>
          <p className="text-xl font-black text-slate-900 mt-1">{stats.vendor}</p>
        </div>
        <div className="bg-[#7A171D]/5 border border-[#7A171D]/20 rounded-xl p-3 shadow-sm relative overflow-hidden group hover:bg-[#7A171D]/10 transition-colors cursor-pointer" onClick={() => router.push('/admin/users/drivers/fleet-drivers')}>
          <div className="absolute top-0 right-0 p-2 opacity-10"><UserSquare2 className="w-10 h-10 text-[#7A171D]"/></div>
          <span className="text-[#7A171D] text-[9px] font-bold uppercase tracking-wider">Sopir Vendor</span>
          <p className="text-xl font-black text-[#7A171D] mt-1">{stats.supirTruk}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg relative overflow-hidden group hover:bg-slate-800 transition-colors cursor-pointer" onClick={() => router.push('/admin/users/drivers/fleet-vehicles')}>
          <div className="absolute top-0 right-0 p-2 opacity-10"><Truck className="w-10 h-10 text-white"/></div>
          <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Armada Truk</span>
          <p className="text-xl font-black text-white mt-1">{stats.armadaTruk}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm relative overflow-hidden group cursor-pointer" onClick={() => setStatusFilter("Pending")}>
          <div className="absolute top-0 right-0 p-2 opacity-10"><Clock className="w-10 h-10 text-amber-500"/></div>
          <span className="text-amber-700 text-[9px] font-bold uppercase tracking-wider">Antrean Verifikasi</span>
          <p className="text-xl font-black text-amber-600 mt-1">{stats.pending}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari nama, PT, plat nomor, email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-[#7A171D] transition-all shadow-sm" />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | "Basic" | "Pending" | "Active" | "Suspended")} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[200px]">
              <option value="All">Semua Kondisi & Status</option>
              <option value="Basic">Akun Dasar (Pre-Onboard)</option>
              <option value="Pending">Menunggu Verifikasi</option>
              <option value="Active">Aktif / Berjalan</option>
              <option value="Suspended">Dibekukan (Suspend)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-500"><Activity className="w-8 h-8 text-[#7A171D] animate-pulse" /> Sinkronisasi Database...</div>
          ) : processedData.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada data yang sesuai filter.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6">Profil & Entitas</th>
                  <th className="p-5">Kategori Mitra</th>
                  <th className="p-5">Kelengkapan Data</th>
                  <th className="p-5">Status App</th>
                  <th className="p-5 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedData.map(p => {
                  // FIX LOGIC: Hanya dianggap Basic jika partnerType benar-benar tidak ada
                  const isBasic = !p.partnerType;

                  let rowClass = "hover:bg-slate-50 transition-colors";
                  if (isBasic) rowClass = "bg-slate-50/50 hover:bg-slate-100/50 transition-colors";
                  else if (p.status === "Pending") rowClass = "bg-amber-50/30 hover:bg-amber-50/60 transition-colors";
                  else if (p.isSuspended) rowClass = "bg-red-50/30 hover:bg-red-50/60 transition-colors";

                  return (
                    <tr key={p.id} className={rowClass}>
                      <td className="p-5 pl-6 align-top">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-xl border border-slate-200 shrink-0 overflow-hidden bg-white flex items-center justify-center shadow-sm">
                             {p.fotoProfileUrl ? <Image src={String(p.fotoProfileUrl)} alt="Foto" fill className="object-cover" sizes="40px" /> : 
                              isBasic ? <UserMinus className="w-5 h-5 text-slate-300" /> :
                              p.partnerType === "Vendor" ? <Building2 className="w-5 h-5 text-slate-400" /> :
                              p.partnerType === "FleetVehicle" ? <Truck className="w-5 h-5 text-slate-400" /> :
                              <User className="w-5 h-5 text-slate-400" />
                             }
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{String(p.companyName || p.name || "Pendaftar Baru")}</p>
                            <p className="text-[10px] font-black text-[#C5A059] uppercase tracking-widest mt-0.5">{String(p.partnerType || "User Biasa")}</p>
                            {(p.phone || p.email || p.licensePlate) ? <p className="text-xs text-slate-500 font-mono mt-0.5">{String(p.phone || p.email || p.licensePlate)}</p> : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-5 align-top">
                        {isBasic ? (
                          <Badge variant="outline">Belum Pilih Kemitraan</Badge>
                        ) : p.partnerType === "Vendor" ? (
                           <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">Induk Perusahaan</span>
                        ) : p.partnerType === "Individual" ? (
                           <div className="flex flex-col gap-1">
                             <span className="text-xs font-bold text-slate-700"><Truck className="w-3.5 h-3.5 inline mr-1 opacity-60"/> {String(p.vehicleType || "Armada")}</span>
                             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sopir Pribadi</span>
                           </div>
                        ) : (
                           <div className="flex flex-col gap-1">
                             {p.vehicleType ? <span className="text-xs font-bold text-slate-700"><Truck className="w-3.5 h-3.5 inline mr-1 opacity-60"/> {String(p.vehicleType)}</span> : null}
                             <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md font-bold truncate max-w-[150px]" title={String(p.vendorName || "Vendor")}>PT: {String(p.vendorName || "Unknown")}</span>
                           </div>
                        )}
                      </td>
                      <td className="p-5 align-top">
                        {isBasic ? (
                           <span className="text-[10px] text-slate-400 italic">Belum melengkapi formulir onboarding.</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                            {p.nik ? <Badge variant="default" className="text-[9px] px-1.5 py-0">NIK</Badge> : null}
                            {p.simNumber ? <Badge variant="default" className="text-[9px] px-1.5 py-0">SIM</Badge> : null}
                            {p.npwp ? <Badge variant="warning" className="text-[9px] px-1.5 py-0">NPWP</Badge> : null}
                            {p.stnkUrl ? <Badge variant="default" className="text-[9px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50">STNK</Badge> : null}
                            {p.kirUrl ? <Badge variant="success" className="text-[9px] px-1.5 py-0">KIR</Badge> : null}
                            {!p.nik && !p.simNumber && !p.npwp && !p.stnkUrl && !p.kirUrl ? <span className="text-[10px] text-slate-400 italic">Data minim</span> : null}
                          </div>
                        )}
                      </td>
                      <td className="p-5 align-top">
                        {isBasic ? (
                          <span className="px-2.5 py-1 rounded-lg font-black uppercase tracking-widest text-[9px] border bg-slate-100 text-slate-400 border-slate-200 shadow-sm">
                            PRE-ONBOARD
                          </span>
                        ) : p.status === "Pending" ? (
                          <span className="px-2.5 py-1 rounded-lg font-black uppercase tracking-widest text-[9px] border bg-amber-50 text-amber-600 border-amber-200 flex items-center gap-1 w-fit shadow-sm">
                            <Clock className="w-3 h-3"/> PERLU CEK
                          </span>
                        ) : p.isSuspended ? (
                          <span className="px-2.5 py-1 rounded-lg font-black uppercase tracking-widest text-[9px] border bg-red-50 text-red-600 border-red-200 shadow-sm">
                            SUSPENDED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg font-black uppercase tracking-widest text-[9px] border bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="p-5 pr-6 flex justify-end gap-2 align-top">
                        
                        {!isBasic && p.status === "Pending" && (
                          <button onClick={() => handleApprove(p.id)} className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Setujui Kemitraan">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        <button onClick={() => router.push(`/admin/users/drivers/${p.id}`)} className="p-2 rounded-xl bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm" title="Lihat Detail Entitas">
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {!isBasic && p.status !== "Pending" && (
                          <button onClick={() => handleToggleSuspend(p.id, p.isSuspended || false)} className={`p-2 rounded-xl border transition-all shadow-sm ${p.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-orange-500 hover:text-white hover:border-orange-500'}`} title={p.isSuspended ? "Aktifkan Kembali" : "Suspend Entitas"}>
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-xl bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all shadow-sm" title="Hapus Permanen">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}