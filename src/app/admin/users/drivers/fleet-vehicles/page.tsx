"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Search, CheckCircle2, AlertCircle, 
  ShieldAlert, Activity, Eye, Trash2, 
  Clock, Filter, ArrowLeft, Truck, Building2, FileText, Wrench
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// IMPORT GLOBAL TYPES
import { DriverData } from "@/types/admin";

export default function FleetVehiclesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [fleetVehicles, setFleetVehicles] = useState<DriverData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Active" | "Suspended">("All");

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // FIREBASE QUERY OPTIMIZATION: Hanya panggil yang bertipe FleetVehicle (Armada Truk Vendor)
      const q = query(collection(db, "driver_wallets"), where("partnerType", "==", "FleetVehicle"));
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

      setFleetVehicles(sortedList);
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memuat data armada truk (fleet).");
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

  // FUNGSI APPROVE PENDAFTARAN
  const handleApprove = async (partnerId: string) => {
    if (!confirm("Verifikasi kelengkapan dokumen armada ini (STNK/KIR) dan izinkan beroperasi?")) return;
    
    try {
      // Armada benda mati tidak perlu update ke tabel 'users' karena tidak bisa login
      await updateDoc(doc(db, "driver_wallets", partnerId), { status: "Active", isSuspended: false });

      showToast("success", "Armada berhasil diverifikasi dan siap operasi.");
      setFleetVehicles(prev => prev.map(v => v.id === partnerId ? { ...v, status: "Active", isSuspended: false } : v));
    } catch (error) {
      console.error("Gagal verifikasi:", error);
      showToast("error", "Gagal memverifikasi armada.");
    }
  };

  // FUNGSI SUSPEND / MAINTENANCE
  const handleToggleSuspend = async (partnerId: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Armada sudah selesai maintenance/suspend dan siap jalan?" : "Tarik armada ini dari peredaran? (Suspend / Masuk Bengkel)")) return;
    
    try {
      await updateDoc(doc(db, "driver_wallets", partnerId), { isSuspended: !currentStatus });
      showToast("success", "Status operasional armada diperbarui.");
      setFleetVehicles(prev => prev.map(v => v.id === partnerId ? { ...v, isSuspended: !currentStatus } : v));
    } catch {
      showToast("error", "Gagal merubah status armada.");
    }
  };

  // FUNGSI DELETE
  const handleDelete = async (partnerId: string) => {
    if (!confirm("Hapus armada ini dari database sistem? Data manifes sebelumnya mungkin akan kehilangan referensi kendaraan.")) return;

    try {
      await deleteDoc(doc(db, "driver_wallets", partnerId));
      showToast("success", "Data armada berhasil dihapus.");
      setFleetVehicles(prev => prev.filter(v => v.id !== partnerId));
    } catch (error) {
      console.error("Gagal menghapus data:", error);
      showToast("error", "Gagal menghapus armada.");
    }
  };

  const processedData = useMemo(() => {
    let result = [...fleetVehicles];
    
    if (statusFilter === "Pending") {
      result = result.filter(v => v.status === "Pending");
    } else if (statusFilter === "Suspended") {
      result = result.filter(v => v.isSuspended === true);
    } else if (statusFilter === "Active") {
      result = result.filter(v => v.status !== "Pending" && !v.isSuspended);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => 
        String(v.name || "").toLowerCase().includes(q) || 
        String(v.vendorName || "").toLowerCase().includes(q) || 
        String(v.licensePlate || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [fleetVehicles, statusFilter, searchQuery]);

  const stats = {
    total: fleetVehicles.length,
    active: fleetVehicles.filter(v => v.status !== "Pending" && !v.isSuspended).length,
    pending: fleetVehicles.filter(v => v.status === "Pending").length,
    suspended: fleetVehicles.filter(v => v.isSuspended).length
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

      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push("/admin/users/drivers")} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Truck className="w-7 h-7 text-slate-800" /> Database Armada Truk
          </h1>
          <p className="text-slate-500 text-sm mt-1">Inventarisir armada fisik (alat berat/truk) yang didaftarkan oleh Mitra Perusahaan (Vendor).</p>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Truck className="w-16 h-16 text-white"/></div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Armada B2B</span>
          <p className="text-3xl font-black text-white mt-2">{stats.total}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 className="w-16 h-16 text-emerald-600"/></div>
          <span className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Aktif / Siap Jalan</span>
          <p className="text-3xl font-black text-emerald-600 mt-2">{stats.active}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-16 h-16 text-amber-500"/></div>
          <span className="text-amber-700 text-[10px] font-bold uppercase tracking-wider">Cek Surat (KIR/STNK)</span>
          <p className="text-3xl font-black text-amber-600 mt-2">{stats.pending}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wrench className="w-16 h-16 text-red-600"/></div>
          <span className="text-red-700 text-[10px] font-bold uppercase tracking-wider">Masuk Bengkel / Suspend</span>
          <p className="text-3xl font-black text-red-600 mt-2">{stats.suspended}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row gap-4 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari merk truk, plat nomor, atau nama vendor PT..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-slate-900 outline-none text-sm focus:border-slate-800 transition-all shadow-sm" />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | "Pending" | "Active" | "Suspended")} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-slate-800 shadow-sm appearance-none font-semibold text-slate-700 min-w-[200px] h-full">
              <option value="All">Filter: Semua Kondisi</option>
              <option value="Active">Hanya Aktif</option>
              <option value="Pending">Butuh Verifikasi</option>
              <option value="Suspended">Masuk Bengkel</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px] custom-scrollbar">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-500"><Activity className="w-8 h-8 text-slate-800 animate-pulse" /> Memuat Database Armada...</div>
          ) : processedData.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium flex flex-col items-center">
              <Truck className="w-12 h-12 text-slate-300 mb-3" />
              Tidak ada data armada truk yang ditemukan.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6">Identitas Armada</th>
                  <th className="p-5">Kepemilikan (Vendor)</th>
                  <th className="p-5">Legalitas Jalan</th>
                  <th className="p-5">Kondisi / Status</th>
                  <th className="p-5 pr-6 text-right">Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedData.map(v => {
                  let rowClass = "hover:bg-slate-50 transition-colors";
                  if (v.status === "Pending") rowClass = "bg-amber-50/30 hover:bg-amber-50/60 transition-colors";
                  else if (v.isSuspended) rowClass = "bg-red-50/30 hover:bg-red-50/60 transition-colors";

                  return (
                    <tr key={v.id} className={rowClass}>
                      <td className="p-5 pl-6 align-top">
                        <div className="flex items-start gap-3">
                          <div className="relative w-12 h-12 rounded-xl border border-slate-200 shrink-0 overflow-hidden bg-slate-800 flex items-center justify-center shadow-sm">
                             {v.fotoProfileUrl ? <Image src={String(v.fotoProfileUrl)} alt="Truk" fill className="object-cover" sizes="48px" /> : <Truck className="w-6 h-6 text-slate-300" />}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-black text-slate-900 truncate max-w-[180px]">{String(v.name || "Truk Kargo")}</p>
                            <p className="text-xs text-slate-600 font-bold mt-1">{String(v.vehicleType || "Tipe Belum Diset")}</p>
                            {v.licensePlate ? (
                              <span className="inline-block mt-1.5 text-[11px] font-mono font-black text-slate-800 bg-slate-200 px-2 py-0.5 rounded border border-slate-300 uppercase tracking-widest shadow-sm">
                                {String(v.licensePlate)}
                              </span>
                            ) : (
                              <span className="inline-block mt-1 text-[10px] text-red-500 italic">Plat Kosong</span>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* KEPEMILIKAN VENDOR */}
                      <td className="p-5 align-top">
                        <div className="space-y-1.5 mt-1">
                          <div className="flex items-start gap-2 text-sm font-bold text-blue-700">
                            <Building2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="leading-tight truncate max-w-[200px]" title={String(v.vendorName)}>{String(v.vendorName || "Belum ditautkan ke PT")}</span>
                          </div>
                          {v.vendorId && (
                            <span className="text-[9px] text-slate-400 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Vendor ID: {`${v.vendorId}`.substring(0,8)}
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* DOKUMEN LEGALITAS TRUK */}
                      <td className="p-5 align-top">
                         <div className="flex flex-col gap-2 mt-1">
                           <div className="flex flex-wrap gap-2 max-w-[180px]">
                             {v.stnkUrl ? (
                               <Badge variant="default" className="text-[9px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50 flex items-center gap-1 cursor-pointer hover:bg-blue-100" onClick={() => window.open(String(v.stnkUrl), '_blank')}>
                                 <FileText className="w-2.5 h-2.5"/> STNK Valid
                               </Badge>
                             ) : <span className="text-[10px] text-red-400 italic font-bold">STNK Kosong!</span>}
                             
                             {v.kirUrl ? (
                               <Badge variant="success" className="text-[9px] px-1.5 py-0 cursor-pointer flex items-center gap-1" onClick={() => window.open(String(v.kirUrl), '_blank')}>
                                 <FileText className="w-2.5 h-2.5"/> KIR Lulus
                               </Badge>
                             ) : <span className="text-[10px] text-amber-500 italic font-bold">KIR Kosong!</span>}
                           </div>
                         </div>
                      </td>
                      
                      {/* STATUS ARMADA */}
                      <td className="p-5 align-top">
                        <div className="mt-1">
                          {v.status === "Pending" ? (
                            <span className="px-2.5 py-1 rounded-lg font-black uppercase tracking-widest text-[9px] border bg-amber-50 text-amber-600 border-amber-200 flex items-center gap-1 w-fit shadow-sm">
                              <Clock className="w-3 h-3"/> Pending Verifikasi
                            </span>
                          ) : v.isSuspended ? (
                            <span className="px-2.5 py-1 rounded-lg font-black uppercase tracking-widest text-[9px] border bg-red-50 text-red-600 border-red-200 shadow-sm flex items-center gap-1 w-fit">
                              <Wrench className="w-3 h-3"/> Maintenance
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg font-black uppercase tracking-widest text-[9px] border bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm">
                              Siap Jalan
                            </span>
                          )}
                        </div>
                      </td>
                      
                      {/* AKSI */}
                      <td className="p-5 pr-6 flex justify-end gap-2 align-top pt-6">
                        {v.status === "Pending" && (
                          <button onClick={() => handleApprove(v.id)} className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Loloskan Pengecekan Fisik & Dokumen">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        <button onClick={() => router.push(`/admin/users/drivers/${v.id}`)} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all shadow-sm" title="Lihat/Edit Armada">
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {v.status !== "Pending" && (
                          <button onClick={() => handleToggleSuspend(v.id, v.isSuspended || false)} className={`p-2 rounded-xl border transition-all shadow-sm ${v.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-orange-500 hover:text-white hover:border-orange-500'}`} title={v.isSuspended ? "Keluarkan dari Bengkel (Aktifkan)" : "Tarik ke Bengkel (Suspend)"}>
                            <Wrench className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button onClick={() => handleDelete(v.id)} className="p-2 rounded-xl bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all shadow-sm" title="Hapus Permanen">
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