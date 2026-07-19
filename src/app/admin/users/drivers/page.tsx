"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Search, CheckCircle2, AlertCircle, Ban, Truck, 
  Plus, User, Building2, UserSquare2, 
  ShieldAlert, Activity, Eye, Trash2
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// IMPORT GLOBAL TYPES
import { DriverData } from "@/types/admin";

type LocalPartnerType = "Individual" | "Vendor" | "FleetDriver" | "FleetVehicle";

export default function FleetManagementPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [partners, setPartners] = useState<DriverData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Tabs View
  const [activeTab, setActiveTab] = useState<LocalPartnerType | "All">("All");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, "driver_wallets"));
      
      const list = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      })) as DriverData[];
      
      // Urutkan berdasarkan yang paling baru dibuat tanpa menggunakan 'any'
      const sortedList = list.sort((a, b) => {
        // Safe access ke Firebase Timestamp
        const getSeconds = (item: DriverData) => {
          if (!item.createdAt) return 0;
          // Bypass strict type checking dengan Record
          const ts = item.createdAt as Record<string, unknown>;
          return typeof ts.seconds === 'number' ? ts.seconds : 0;
        };

        const timeA = getSeconds(a);
        const timeB = getSeconds(b);
        return timeB - timeA;
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

  // FUNGSI SUSPEND
  const handleToggleSuspend = async (partnerId: string, currentStatus: boolean) => {
    if (!confirm(currentStatus ? "Yakin ingin mengaktifkan kembali entitas ini?" : "PERINGATAN! Entitas yang di-suspend tidak akan bisa menerima order/jalan. Yakin suspend?")) return;
    
    try {
      await updateDoc(doc(db, "driver_wallets", partnerId), { isSuspended: !currentStatus });
      showToast("success", "Status operasional diperbarui.");
      setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, isSuspended: !currentStatus } : p));
    } catch {
      showToast("error", "Gagal merubah status.");
    }
  };

  // FUNGSI DELETE
  const handleDelete = async (partnerId: string) => {
    if (!confirm("Tindakan ini sangat fatal! Menghapus mitra akan menghilangkan seluruh rekam jejak dompet dan data mereka. Anda yakin ingin MENGHAPUS PERMANEN?")) return;

    try {
      await deleteDoc(doc(db, "driver_wallets", partnerId));
      showToast("success", "Data mitra berhasil dihapus permanen.");
      setPartners(prev => prev.filter(p => p.id !== partnerId));
    } catch (error) {
      console.error("Gagal menghapus data:", error);
      showToast("error", "Gagal menghapus mitra. Periksa koneksi atau izin akses.");
    }
  };

  const processedData = useMemo(() => {
    let result = [...partners];
    
    if (activeTab !== "All") {
      result = result.filter(p => p.partnerType === activeTab);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        String(p.name || "").toLowerCase().includes(q) || 
        String(p.companyName || "").toLowerCase().includes(q) ||
        String(p.phone || "").includes(q) ||
        String(p.licensePlate || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [partners, activeTab, searchQuery]);

  const stats = {
    individu: partners.filter(p => p.partnerType === "Individual").length,
    vendor: partners.filter(p => p.partnerType === "Vendor").length,
    supirTruk: partners.filter(p => p.partnerType === "FleetDriver").length,
    armadaTruk: partners.filter(p => p.partnerType === "FleetVehicle").length,
    suspended: partners.filter(p => p.isSuspended).length
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
            <Building2 className="w-7 h-7 text-[#7A171D]" /> Fleet Management System
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Kelola kemitraan Individu (Kurir) dan Vendor/Perusahaan (Truk) dalam satu ekosistem terpadu.</p>
        </div>
        <Button onClick={() => router.push("/admin/users/drivers/add")} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white shadow-md shadow-[#7A171D]/20 font-bold h-12 px-6">
          <Plus className="w-4 h-4 mr-2" /> Pendaftaran Kemitraan Baru
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10"><User className="w-10 h-10 text-[#C5A059]"/></div>
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Mitra Individu</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.individu}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Building2 className="w-10 h-10 text-blue-600"/></div>
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Vendor / Perusahaan</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.vendor}</p>
        </div>
        <div className="bg-[#7A171D]/5 border border-[#7A171D]/20 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10"><UserSquare2 className="w-10 h-10 text-[#7A171D]"/></div>
          <span className="text-[#7A171D] text-[10px] font-bold uppercase tracking-wider">Sopir Truk (Fleet)</span>
          <p className="text-2xl font-black text-[#7A171D] mt-1">{stats.supirTruk}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Truck className="w-10 h-10 text-white"/></div>
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Armada Berat (Truk)</span>
          <p className="text-2xl font-black text-white mt-1">{stats.armadaTruk}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10"><Ban className="w-10 h-10 text-red-600"/></div>
          <span className="text-red-700 text-[10px] font-bold uppercase tracking-wider">Entitas Di-Suspend</span>
          <p className="text-2xl font-black text-red-600 mt-1">{stats.suspended}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 bg-slate-50/50">
          {[
            { id: "All", label: "Semua Kemitraan" },
            { id: "Individual", label: "Individu (Motor/Mobil)" },
            { id: "Vendor", label: "Vendor (PT/CV)" },
            { id: "FleetDriver", label: "Sopir (Fleet)" },
            { id: "FleetVehicle", label: "Armada Kendaraan (Fleet)" }
          ].map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as LocalPartnerType | "All")} 
              className={cn(
                "px-6 py-4 text-sm font-bold transition-all relative outline-none whitespace-nowrap",
                activeTab === tab.id ? "text-[#7A171D] bg-white" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              )}
            >
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="fleetTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7A171D]" />}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari nama, PT, plat nomor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-[#7A171D] transition-all shadow-sm" />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-500"><Activity className="w-8 h-8 text-[#7A171D] animate-pulse" /> Sinkronisasi Fleet Database...</div>
          ) : processedData.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada data kemitraan.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm relative">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6">Profil & Entitas</th>
                  <th className="p-5">Relasi & Kendaraan</th>
                  <th className="p-5">Kelengkapan Dokumen</th>
                  <th className="p-5">Status Operasional</th>
                  <th className="p-5 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedData.map(p => (
                  <tr key={p.id} className={cn("transition-colors", p.isSuspended ? "bg-red-50/30" : "hover:bg-slate-50")}>
                    <td className="p-5 pl-6 align-top">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl border border-slate-200 shrink-0 overflow-hidden bg-slate-50 flex items-center justify-center">
                           {p.fotoProfileUrl ? <Image src={String(p.fotoProfileUrl)} alt="Foto" fill className="object-cover" sizes="40px" /> : 
                            p.partnerType === "Vendor" ? <Building2 className="w-5 h-5 text-slate-400" /> :
                            p.partnerType === "FleetVehicle" ? <Truck className="w-5 h-5 text-slate-400" /> :
                            <User className="w-5 h-5 text-slate-400" />
                           }
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{String(p.companyName || p.name || "Tanpa Nama")}</p>
                          <p className="text-[10px] font-black text-[#C5A059] uppercase tracking-widest mt-0.5">{String(p.partnerType)}</p>
                          {(p.phone || p.licensePlate) ? <p className="text-xs text-slate-500 font-mono mt-0.5">{String(p.phone || p.licensePlate)}</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-5 align-top">
                      {p.partnerType === "Vendor" ? (
                         <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">Induk / Pusat</span>
                      ) : p.partnerType === "Individual" ? (
                         <div className="flex flex-col gap-1">
                           <span className="text-xs font-bold text-slate-700"><Truck className="w-3.5 h-3.5 inline mr-1 opacity-60"/> {String(p.vehicleType || "Armada")}</span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mandiri</span>
                         </div>
                      ) : (
                         <div className="flex flex-col gap-1">
                           {p.vehicleType ? <span className="text-xs font-bold text-slate-700"><Truck className="w-3.5 h-3.5 inline mr-1 opacity-60"/> {String(p.vehicleType)}</span> : null}
                           <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md font-bold truncate max-w-[150px]" title={String(p.vendorName || "Vendor")}>PT: {String(p.vendorName || "Unknown")}</span>
                         </div>
                      )}
                    </td>
                    <td className="p-5 align-top">
                       <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                         {p.nik ? <Badge variant="default" className="text-[9px] px-1.5 py-0">NIK</Badge> : null}
                         {p.simNumber ? <Badge variant="default" className="text-[9px] px-1.5 py-0">SIM</Badge> : null}
                         {p.npwp ? <Badge variant="warning" className="text-[9px] px-1.5 py-0">NPWP</Badge> : null}
                         {p.stnkUrl ? <Badge variant="default" className="text-[9px] px-1.5 py-0 border-blue-200 text-blue-700 bg-blue-50">STNK</Badge> : null}
                         {p.kirUrl ? <Badge variant="success" className="text-[9px] px-1.5 py-0">KIR</Badge> : null}
                         {!p.nik && !p.simNumber && !p.npwp && !p.stnkUrl && !p.kirUrl ? <span className="text-[10px] text-slate-400 italic">Data minim</span> : null}
                       </div>
                    </td>
                    <td className="p-5 align-top">
                      <span className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-widest text-[9px] border ${p.isSuspended ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {p.isSuspended ? "SUSPENDED" : "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-5 pr-6 flex justify-end gap-2 align-top">
                      
                      {/* View & Edit */}
                      <button onClick={() => router.push(`/admin/users/drivers/${p.id}`)} className="p-2 rounded-xl bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm" title="Lihat/Edit Detail">
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {/* Suspend Toggle */}
                      <button onClick={() => handleToggleSuspend(p.id, p.isSuspended || false)} className={`p-2 rounded-xl border transition-all shadow-sm ${p.isSuspended ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:bg-orange-500 hover:text-white hover:border-orange-500'}`} title={p.isSuspended ? "Aktifkan Kembali" : "Suspend Entitas"}>
                        <Ban className="w-4 h-4" />
                      </button>
                      
                      {/* Delete */}
                      <button onClick={() => handleDelete(p.id)} className="p-2 rounded-xl bg-white border border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all shadow-sm" title="Hapus Permanen">
                        <Trash2 className="w-4 h-4" />
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