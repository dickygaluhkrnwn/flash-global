"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Package, Search, CheckCircle2, AlertCircle, Filter, 
  ArrowUpDown, DollarSign, Weight, UserPlus, X, Clock, ShieldAlert, 
  Calendar
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, query, orderBy, getDocs } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// --- IMPORT GLOBAL TYPES ---
import { OrderDetail, FirebaseTimestamp, LocationDetail } from "@/types/order";
import { DriverData } from "@/types/admin";

export default function DomesticOrdersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // Modals
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  const [statusForm, setStatusForm] = useState({
    status: "", location: "Pusat Logistik Flash Global", description: "", timeMode: "auto", customDate: ""
  });

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const snap = await getDocs(collection(db, "driver_wallets"));
        setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() } as DriverData)));
      } catch (error) {
        console.error("Gagal menarik data sopir:", error);
      }
    };
    fetchDrivers();

    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);
  
  // Safe Date Formatting untuk Strict Mode
  const formatDate = (timestamp: FirebaseTimestamp) => {
    if (!timestamp) return "-";
    let d: Date;
    if (typeof timestamp === 'object' && timestamp !== null) {
      const objTs = timestamp as Record<string, unknown>;
      if (typeof objTs.toDate === 'function') {
        d = objTs.toDate() as Date;
      } else {
        d = new Date(timestamp as string | number);
      }
    } else {
      d = new Date(timestamp as string | number);
    }
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Safe Milliseconds Parser untuk Sorting
  const getMillis = (ts: FirebaseTimestamp) => {
    if (!ts) return 0;
    if (typeof ts === 'object' && ts !== null) {
      const objTs = ts as Record<string, unknown>;
      if (typeof objTs.toMillis === 'function') return objTs.toMillis() as number;
      if (typeof objTs.seconds === 'number') return objTs.seconds * 1000;
    }
    return new Date(ts as string | number).getTime();
  };

  const openStatusModal = (order: OrderDetail) => {
    setSelectedOrderId(order.id);
    setStatusForm({ status: "Menuju Lokasi Jemput", location: "Pusat Hub Penjemputan", description: "", timeMode: "auto", customDate: "" });
    setShowStatusModal(true);
  };

  // =======================================================================
  // LOGIKA CERDAS: AUTO ID UNION AGAR LOG TIDAK TERTIMPA (REPLACE)
  // =======================================================================
  const handleConfirmStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    
    try {
      let finalLogDate = "";
      if (statusForm.timeMode === "auto") {
        finalLogDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      } else {
        finalLogDate = new Date(statusForm.customDate).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      }

      let finalDesc = statusForm.description;
      if (!finalDesc) {
        if (statusForm.status.includes("Transit")) finalDesc = "Paket berhasil diamankan oleh kurir dan dalam perjalanan.";
        else if (statusForm.status.includes("Selesai")) finalDesc = "Paket logistik sukses diserahterimakan kepada penerima.";
        else finalDesc = "Status manifes diperbarui oleh Operasional.";
      }

      const uniqueId = Date.now().toString();

      await updateDoc(doc(db, "orders", selectedOrderId), {
        status: statusForm.status,
        trackingHistory: arrayUnion({ 
          id: uniqueId, 
          status: statusForm.status, 
          date: finalLogDate, 
          description: finalDesc, 
          location: statusForm.location 
        })
      });

      showToast("success", "Status & log riwayat berhasil diperbarui!");
      setShowStatusModal(false);
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memperbarui status order.");
    }
  };

  const handleAssignDriver = async (driverId: string, driverName: string) => {
    if (!selectedOrderId) return;
    try {
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();

      await updateDoc(doc(db, "orders", selectedOrderId), {
        driverId: driverId, driverName: driverName, status: "Menuju Lokasi Jemput",
        trackingHistory: arrayUnion({ 
          id: uniqueId,
          status: "Menuju Lokasi Jemput", 
          date: logDate, 
          description: `Sopir ${driverName} ditugaskan untuk menjemput barang.`, 
          location: "Pusat Distribusi Flash" 
        })
      });
      showToast("success", `Sopir ${driverName} berhasil ditugaskan!`);
      setShowDriverModal(false);
    } catch (error) { 
      console.error(error);
      showToast("error", "Gagal menugaskan sopir."); 
    }
  };

  // USEMEMO HARUS DI ATAS GUARD RETURN
  const processedOrders = useMemo(() => {
    let result = [...orders];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => {
        const originObj = typeof o.origin === 'object' && o.origin !== null ? (o.origin as LocationDetail) : null;
        const originAddr = originObj?.address || (typeof o.origin === 'string' ? o.origin : "");
        const originName = originObj?.senderName || o.senderName || "";
        return o.id.toLowerCase().includes(q) || originAddr.toLowerCase().includes(q) || originName.toLowerCase().includes(q);
      });
    }
    if (filterStatus !== "All") result = result.filter(o => o.status.includes(filterStatus));
    
    result.sort((a, b) => {
      const wA = a.totalWeight || a.weight || 0; 
      const wB = b.totalWeight || b.weight || 0;
      const cA = a.breakdown?.grandTotal || 0; 
      const cB = b.breakdown?.grandTotal || 0;
      
      const tA = getMillis(a.createdAt); 
      const tB = getMillis(b.createdAt);

      if (sortOrder === "newest") return tB - tA;
      if (sortOrder === "oldest") return tA - tB;
      if (sortOrder === "heaviest") return wB - wA;
      if (sortOrder === "highest_value") return cB - cA;
      return 0;
    });
    return result;
  }, [orders, searchQuery, filterStatus, sortOrder]);

  const totalOmset = orders.reduce((acc, o) => acc + (o.breakdown?.grandTotal || 0), 0);
  const totalPending = orders.filter(o => o.status.includes("Menunggu Kurir")).length;

  // =========================================================================
  // GUARDS: DITEMPATKAN DI BAWAH SEMUA HOOKS AGAR TIDAK MELANGGAR ATURAN REACT
  // =========================================================================
  
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Dispatch & Order ini hanya dapat dikelola oleh Superadmin atau Divisi Operasional.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Memuat Data Domestik...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Package className="w-7 h-7 text-[#7A171D]" /> Dispatch Domestik
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Pantau pesanan masuk, tugaskan armada, dan perbarui status resi (AWB).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-16 h-16 text-white"/></div>
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Omset Terkumpul (Domestik)</span>
          <p className="text-3xl font-black text-white mt-2">{formatRupiah(totalOmset)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Resi Aktif</span>
          <p className="text-3xl font-black text-slate-900 mt-2">{orders.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <span className="text-amber-600 text-xs font-bold uppercase tracking-wider">Butuh Diproses (Cari Kurir)</span>
          <p className="text-3xl font-black text-amber-700 mt-2">{totalPending}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari Resi AWB, Nama Pengirim..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-[#7A171D] transition-all shadow-sm" />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[140px]">
                <option value="All">Semua Status</option>
                <option value="Menunggu">Pending</option>
                <option value="Transit">In Transit</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#7A171D] shadow-sm appearance-none font-semibold text-slate-700 min-w-[160px]">
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="heaviest">Terberat (Kg)</option>
                <option value="highest_value">Tagihan Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {processedOrders.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada data order yang cocok dengan filter pencarian.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-white text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6">Resi & Tanggal</th>
                  <th className="p-5">Rute & Klien</th>
                  <th className="p-5">Spek & Tagihan</th>
                  <th className="p-5">Status & Kurir</th>
                  <th className="p-5 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedOrders.map(o => {
                  const originObj = typeof o.origin === 'object' && o.origin !== null ? (o.origin as LocationDetail) : null;
                  const originAddr = originObj?.address || (typeof o.origin === 'string' ? o.origin : "");
                  const originName = originObj?.senderName || o.senderName || "Klien";
                  const destAddr = o.destinations?.[0]?.address || o.destination || "";
                  const destName = o.destinations?.[0]?.receiverName || "Penerima";

                  return (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 pl-6 align-top">
                        <p className="font-mono font-black text-[#7A171D] text-sm uppercase">{o.id}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> {formatDate(o.createdAt)}</p>
                      </td>
                      <td className="p-5 align-top">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Pengirim</p>
                            <p className="font-bold text-slate-900 truncate max-w-[200px]" title={originAddr}>
                              {originName}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Tujuan</p>
                            <p className="font-bold text-slate-900 truncate max-w-[200px]" title={destAddr}>
                              {o.destinations && o.destinations.length > 1 ? `${o.destinations.length} Titik Tujuan` : destName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 align-top">
                         <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded text-[10px] uppercase border border-slate-200 mb-2 inline-block">{o.serviceType} - {o.vehicleName || o.vehicle}</span>
                         <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5"><Weight className="w-3.5 h-3.5"/> {o.totalWeight || o.weight} Kg</p>
                         <p className="text-sm text-emerald-600 font-black mt-1">{formatRupiah(o.breakdown?.grandTotal || 0)}</p>
                      </td>
                      <td className="p-5 align-top">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest inline-block border ${
                          o.status.includes("Selesai") ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          o.status.includes("Menunggu") ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-blue-50 text-blue-600 border-blue-200"
                        }`}>{o.status}</span>
                        <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 w-fit mt-2">
                          <UserPlus className="w-3 h-3 text-slate-400" /> {o.driverName || "Belum Ada Kurir"}
                        </div>
                      </td>
                      <td className="p-5 pr-6 align-top text-right">
                        <div className="flex flex-col items-end gap-2">
                          <Button size="sm" onClick={() => openStatusModal(o)} className="h-8 text-[10px] w-32 shadow-sm border-slate-200" variant="outline">Update Log</Button>
                          {!o.driverId && (
                            <Button size="sm" onClick={() => { setSelectedOrderId(o.id); setShowDriverModal(true); }} className="h-8 text-[10px] w-32 shadow-sm bg-[#7A171D] hover:bg-[#5A0E13]">Tunjuk Sopir</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowStatusModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-lg relative z-10 shadow-2xl flex flex-col max-h-[95vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-100">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Clock className="w-5 h-5 text-[#7A171D]"/> Update Status & Log</h2>
                <button type="button" onClick={() => setShowStatusModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500"><X className="w-4 h-4"/></button>
              </div>
              <form onSubmit={handleConfirmStatusUpdate} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Manifes (Operasional)</label>
                  <select value={statusForm.status} onChange={(e) => setStatusForm({...statusForm, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold outline-none focus:border-[#7A171D]">
                    <option value="Menuju Lokasi Jemput">Sopir Menuju Lokasi Jemput</option>
                    <option value="Picked Up (In Transit)">In Transit (Paket Dibawa Armada)</option>
                    <option value="Tiba di Hub Transit">Tiba di Hub Transit</option>
                    <option value="Delivered (Selesai)">Delivered (Paket Sukses Sampai)</option>
                    <option value="Retur / Gagal Kirim">Retur / Pengiriman Gagal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lokasi Checkpoint</label>
                  <Input type="text" value={statusForm.location} onChange={(e) => setStatusForm({...statusForm, location: e.target.value})} placeholder="Cth: Gudang Sortir Lombok Tengah" className="font-bold h-12" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deskripsi Kustom (Opsional)</label>
                  <Input type="text" value={statusForm.description} onChange={(e) => setStatusForm({...statusForm, description: e.target.value})} placeholder="Kosongkan untuk otomatis" className="font-semibold h-12" />
                </div>
                
                <div className="space-y-2 border-t border-dashed border-slate-200 pt-4 mt-2">
                  <label className="text-[10px] font-bold text-[#7A171D] uppercase tracking-widest block">Metode Pencatatan Waktu</label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="radio" name="timeMode" checked={statusForm.timeMode === "auto"} onChange={() => setStatusForm({...statusForm, timeMode: "auto"})} className="w-4 h-4 accent-[#7A171D]" /> Otomatis</label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="radio" name="timeMode" checked={statusForm.timeMode === "custom"} onChange={() => setStatusForm({...statusForm, timeMode: "custom"})} className="w-4 h-4 accent-[#7A171D]" /> Manual (Backdate)</label>
                  </div>
                  {statusForm.timeMode === "custom" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <input type="datetime-local" required value={statusForm.customDate} onChange={(e) => setStatusForm({...statusForm, customDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold outline-none focus:border-[#7A171D]" />
                    </motion.div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                  <Button type="button" variant="outline" onClick={() => setShowStatusModal(false)} className="flex-1 h-12 font-bold text-xs border-slate-300">Batal</Button>
                  <Button type="submit" variant="primary" className="flex-1 h-12 font-bold text-xs">Simpan Log Update</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDriverModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDriverModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-md relative z-10 shadow-2xl">
              <h2 className="text-xl font-black text-slate-900 mb-2">Penugasan Sopir Manual</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Pilih mitra kurir aktif untuk mengeksekusi manifes pengiriman ini secara paksa (override).</p>
              
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {drivers.filter(d => !d.isSuspended).length === 0 ? (
                  <p className="text-xs text-center text-red-500 py-6 bg-red-50 rounded-2xl border border-red-100">Tidak ada sopir aktif yang tersedia.</p>
                ) : (
                  drivers.filter(d => !d.isSuspended).map(driver => (
                    <button key={driver.id} type="button" onClick={() => handleAssignDriver(driver.id, driver.name)} className="w-full text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-[#7A171D] hover:bg-[#7A171D]/5 transition-all flex justify-between items-center group shadow-sm">
                      <div>
                        <p className="text-sm font-black text-slate-900 group-hover:text-[#7A171D] transition-colors">{driver.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 bg-white px-2 py-0.5 rounded w-fit border border-slate-200">{driver.vehicleType}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 group-hover:bg-[#7A171D] flex items-center justify-center transition-colors">
                        <UserPlus className="w-4 h-4 text-slate-400 group-hover:text-white" />
                      </div>
                    </button>
                  ))
                )}
              </div>
              <button type="button" onClick={() => setShowDriverModal(false)} className="w-full mt-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors">Batalkan Penugasan</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}