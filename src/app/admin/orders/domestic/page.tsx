"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Package, Search, CheckCircle2, AlertCircle, Filter, 
  ArrowUpDown, DollarSign, Weight, UserPlus, X, Clock, ShieldAlert, 
  Calendar, MapPin, Truck, Building2, User, Lock, Eye, Camera
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
  const [rawAllPartners, setRawAllPartners] = useState<DriverData[]>([]);
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // Modals Penugasan & Update Status
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // 🚀 MODALS RIWAYAT (TRACKING & PoD)
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  
  const [statusForm, setStatusForm] = useState({
    status: "", location: "Pusat Logistik Flash Global", description: "", timeMode: "auto", customDate: ""
  });

  useEffect(() => {
    // 1. Tarik Data Sopir & Mitra
    const fetchDrivers = async () => {
      try {
        const snap = await getDocs(collection(db, "driver_wallets"));
        const rawPartners = snap.docs.map(d => ({ id: d.id, ...d.data() } as DriverData));
        setRawAllPartners(rawPartners);
        
        const assignableDrivers = rawPartners.filter(d => 
          (d.partnerType === "Individual" || d.partnerType === "FleetDriver") && !d.isSuspended
        );
        setDrivers(assignableDrivers);
      } catch (error) {
        console.error("Gagal menarik data sopir:", error);
      }
    };
    fetchDrivers();

    // 2. Tarik Data Order (Live)
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
    const nextStatus = order.status === "Menunggu Kurir" ? "Menuju Lokasi Jemput" : 
                       order.status === "Menuju Lokasi Jemput" ? "Sedang Diproses" : 
                       order.status === "Sedang Diproses" ? "Dikirim" : "Selesai";

    setStatusForm({ status: nextStatus, location: "Pusat Hub Penjemputan", description: "", timeMode: "auto", customDate: "" });
    setShowStatusModal(true);
  };

  const openHistoryModal = (order: OrderDetail) => {
    setSelectedOrder(order);
    setShowHistoryModal(true);
  };

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
        if (statusForm.status === "Menuju Lokasi Jemput") finalDesc = "Kurir sedang dalam perjalanan menuju lokasi pengirim.";
        else if (statusForm.status === "Sedang Diproses") finalDesc = "Paket telah tiba di gudang sortir / hub dan sedang diproses.";
        else if (statusForm.status === "Dikirim") finalDesc = "Paket sedang dalam perjalanan menuju alamat penerima (In Transit).";
        else if (statusForm.status === "Selesai") finalDesc = "Paket logistik sukses diserahterimakan kepada penerima.";
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

  const handleAssignDriver = async (driver: DriverData) => {
    if (!selectedOrderId) return;
    try {
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();
      
      const safeDriverName = String(driver.name || "Mitra Kurir");
      let vehicleText = driver.vehicleType || "Armada Pribadi";
      let logDesc = `Sopir ${safeDriverName} ditugaskan untuk menjemput barang.`;

      if (driver.partnerType === "FleetDriver") {
        const tiedVehicle = rawAllPartners.find(p => p.partnerType === "FleetVehicle" && p.driverId === driver.id);
        if (tiedVehicle) {
          vehicleText = tiedVehicle.name || tiedVehicle.vehicleType || "Truk Vendor";
          logDesc = `Sopir ${safeDriverName} ditugaskan menjemput barang dengan armada ${vehicleText}.`;
        } else {
          logDesc = `Sopir ${safeDriverName} dari PT ${driver.vendorName || "Vendor"} ditugaskan untuk menjemput barang.`;
        }
      }

      await updateDoc(doc(db, "orders", selectedOrderId), {
        driverId: driver.id, 
        driverName: safeDriverName, 
        vehicleName: vehicleText,
        status: "Menuju Lokasi Jemput",
        trackingHistory: arrayUnion({ 
          id: uniqueId,
          status: "Menuju Lokasi Jemput", 
          date: logDate, 
          description: logDesc, 
          location: "Pusat Distribusi Flash" 
        })
      });
      showToast("success", `Sopir ${safeDriverName} berhasil ditugaskan!`);
      setShowDriverModal(false);
    } catch (error) { 
      console.error(error);
      showToast("error", "Gagal menugaskan sopir."); 
    }
  };

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
      const cA = a.breakdown?.grandTotal || a.finalGrandTotal || a.totalCost || 0; 
      const cB = b.breakdown?.grandTotal || b.finalGrandTotal || b.totalCost || 0;
      
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

  const totalOmset = orders.reduce((acc, o) => acc + (o.finalGrandTotal || o.breakdown?.grandTotal || o.totalCost || 0), 0);
  const totalPending = orders.filter(o => o.status.includes("Menunggu Kurir") || !o.driverId).length;

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
    <div className="space-y-6 pb-10">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[100] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🚀 MODAL PREVIEW BUKTI TRANSFER / PoD (FULLSCREEN) */}
      <AnimatePresence>
        {proofModalUrl && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setProofModalUrl(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 max-w-2xl w-full flex flex-col items-center">
              <button onClick={() => setProofModalUrl(null)} className="absolute -top-12 right-0 bg-white/20 text-white rounded-full p-2 hover:bg-white/40 transition-colors">
                <X className="w-6 h-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proofModalUrl} alt="Bukti Foto" className="rounded-2xl max-h-[85vh] w-auto shadow-2xl border border-white/20" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <Package className="w-7 h-7 text-[#7A171D]" /> Dispatch Domestik
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">Pantau pesanan masuk, tugaskan armada, dan lacak riwayat beserta foto bukti pengiriman (PoD).</p>
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

      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        
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
                <option value="Sedang Diproses">Di Gudang / Hub</option>
                <option value="Dikirim">Dalam Perjalanan</option>
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

        <div className="overflow-x-auto min-h-[400px]">
          {processedOrders.length === 0 ? (
            <div className="p-20 text-center text-slate-500 font-medium">Tidak ada data order yang cocok dengan filter pencarian.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
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
                  const isPaymentVerified = o.paymentStatus === "Lunas";

                  return (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 pl-6 align-top">
                        <p className="font-mono font-black text-[#7A171D] text-sm uppercase">#{o.id}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> {formatDate(o.createdAt)}</p>
                      </td>
                      <td className="p-5 align-top">
                        <div className="space-y-2.5">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <div className="overflow-hidden">
                              <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-0.5">Asal</p>
                              <p className="font-bold text-slate-900 truncate max-w-[200px]" title={originAddr}>{originName}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#7A171D] shrink-0 mt-0.5" />
                            <div className="overflow-hidden">
                              <p className="text-[9px] font-bold text-[#7A171D] uppercase leading-none mb-0.5">Tujuan</p>
                              <p className="font-bold text-slate-900 truncate max-w-[200px]" title={destAddr}>
                                {o.destinations && o.destinations.length > 1 ? `${o.destinations.length} Titik Tujuan` : destName}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 align-top">
                         <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded text-[10px] uppercase border border-slate-200 mb-2 inline-block">{o.serviceType} - {o.vehicleName || o.vehicle}</span>
                         <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5"><Weight className="w-3.5 h-3.5"/> {o.totalWeight || o.weight} Kg</p>
                         <p className="text-sm text-emerald-600 font-black mt-1.5">{formatRupiah(o.finalGrandTotal || o.breakdown?.grandTotal || o.totalCost || 0)}</p>
                      </td>
                      <td className="p-5 align-top">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest inline-block border shadow-sm ${
                          o.status.includes("Selesai") ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          o.status.includes("Menunggu") ? "bg-amber-50 text-amber-600 border-amber-200" : 
                          o.status.includes("Dikirim") ? "bg-blue-50 text-blue-600 border-blue-200" :
                          "bg-purple-50 text-purple-600 border-purple-200"
                        }`}>{o.status}</span>
                        
                        <div className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded border w-fit mt-2 ${o.driverId ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-red-50 border-red-200 text-red-600"}`}>
                          <UserPlus className="w-3 h-3" /> 
                          <span className="truncate max-w-[120px]">{o.driverName || "Belum Ada Kurir"}</span>
                        </div>
                      </td>
                      <td className="p-5 pr-6 align-top text-right">
                        <div className="flex flex-col items-end gap-2">
                          {/* 🚀 TOMBOL BARU: RIWAYAT & POD */}
                          <Button size="sm" onClick={() => openHistoryModal(o)} className="h-8 text-[10px] w-32 shadow-sm border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700" variant="outline">
                            <Eye className="w-3 h-3 mr-1"/> Lacak & PoD
                          </Button>
                          <Button size="sm" onClick={() => openStatusModal(o)} className="h-8 text-[10px] w-32 shadow-sm border-slate-200 bg-white hover:bg-slate-50 text-slate-600" variant="outline">Update Log</Button>
                          
                          {!o.driverId && (
                            <Button 
                              size="sm" 
                              disabled={!isPaymentVerified}
                              onClick={() => { setSelectedOrderId(o.id); setShowDriverModal(true); }} 
                              className={`h-8 text-[10px] w-32 shadow-sm flex items-center justify-center gap-1 transition-all ${
                                isPaymentVerified 
                                  ? "bg-[#7A171D] hover:bg-[#5A0E13] text-white" 
                                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                              }`}
                              title={!isPaymentVerified ? "Selesaikan Verifikasi Pembayaran di Menu Finance terlebih dahulu" : "Tugaskan Kurir"}
                            >
                              {!isPaymentVerified && <Lock className="w-3 h-3" />}
                              {isPaymentVerified ? "Tunjuk Sopir" : "Menunggu Finance"}
                            </Button>
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

      {/* 🚀 MODAL RIWAYAT PELACAKAN & POD */}
      <AnimatePresence>
        {showHistoryModal && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 w-full max-w-lg relative z-10 shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-100 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><Eye className="w-5 h-5 text-[#7A171D]"/> Riwayat Pelacakan</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Resi: #{selectedOrder.id}</p>
                </div>
                <button type="button" onClick={() => setShowHistoryModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500"><X className="w-4 h-4"/></button>
              </div>
              
              <div className="overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
                {(!selectedOrder.trackingHistory || selectedOrder.trackingHistory.length === 0) ? (
                   <p className="text-center text-sm text-slate-400 py-10 font-medium">Belum ada riwayat pelacakan.</p>
                ) : (
                  <div className="space-y-6">
                    {/* Reverse array agar yang terbaru di atas */}
                    {[...selectedOrder.trackingHistory].reverse().map((log: Record<string, any>, idx: number) => (
                      <div key={log.id || idx} className="relative pl-6 border-l-2 border-slate-100 last:border-transparent pb-2">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white ${idx === 0 ? 'bg-[#7A171D]' : 'bg-slate-300'}`}></div>
                        
                        <div className="-mt-1.5">
                          <p className="text-[10px] font-bold text-slate-400 mb-0.5">{log.date}</p>
                          <h4 className="text-sm font-black text-slate-800">{log.status}</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{log.description}</p>
                          
                          {log.location && (
                            <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400"/> {log.location}</p>
                          )}

                          {/* Tampilkan Tombol Bukti Foto (PoD) Jika Ada */}
                          {log.proofUrl && (
                            <div className="mt-3">
                              <button 
                                onClick={() => setProofModalUrl(log.proofUrl)}
                                className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors px-3 py-2 rounded-xl border border-emerald-200"
                              >
                                <Camera className="w-4 h-4" /> Lihat Foto Bukti
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowStatusModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-lg relative z-10 shadow-2xl flex flex-col max-h-[95vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-100">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Clock className="w-5 h-5 text-[#7A171D]"/> Update Status & Log</h2>
                <button type="button" onClick={() => setShowStatusModal(false)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-red-50 text-slate-400 hover:text-red-500"><X className="w-4 h-4"/></button>
              </div>
              <form onSubmit={handleConfirmStatusUpdate} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Baku Operasional</label>
                  <select value={statusForm.status} onChange={(e) => setStatusForm({...statusForm, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold outline-none focus:border-[#7A171D] shadow-sm">
                    <option value="Menunggu Kurir">Menunggu Kurir / Belum Dijemput</option>
                    <option value="Menuju Lokasi Jemput">Sopir Menuju Lokasi Jemput</option>
                    <option value="Sedang Diproses">Paket Tiba di Gudang Sortir (Diproses)</option>
                    <option value="Dikirim">Paket Dikirim ke Penerima (In Transit)</option>
                    <option value="Selesai">Pesanan Selesai (Delivered)</option>
                    <option value="Retur / Gagal Kirim">Retur / Pengiriman Gagal</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lokasi / Checkpoint Saat Ini</label>
                  <Input type="text" value={statusForm.location} onChange={(e) => setStatusForm({...statusForm, location: e.target.value})} placeholder="Cth: Gudang Sortir Lombok Tengah" className="font-bold h-12 shadow-sm" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deskripsi Kustom (Opsional)</label>
                  <Input type="text" value={statusForm.description} onChange={(e) => setStatusForm({...statusForm, description: e.target.value})} placeholder="Kosongkan untuk kalimat otomatis sistem" className="font-semibold h-12 shadow-sm" />
                </div>
                
                <div className="space-y-2 border-t border-dashed border-slate-200 pt-5 mt-3">
                  <label className="text-[10px] font-bold text-[#7A171D] uppercase tracking-widest block">Metode Pencatatan Waktu</label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="radio" name="timeMode" checked={statusForm.timeMode === "auto"} onChange={() => setStatusForm({...statusForm, timeMode: "auto"})} className="w-4 h-4 accent-[#7A171D]" /> Real-time Otomatis</label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="radio" name="timeMode" checked={statusForm.timeMode === "custom"} onChange={() => setStatusForm({...statusForm, timeMode: "custom"})} className="w-4 h-4 accent-[#7A171D]" /> Manual (Backdate)</label>
                  </div>
                  {statusForm.timeMode === "custom" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                      <input type="datetime-local" required value={statusForm.customDate} onChange={(e) => setStatusForm({...statusForm, customDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold outline-none focus:border-[#7A171D] shadow-sm" />
                    </motion.div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
                  <Button type="button" variant="outline" onClick={() => setShowStatusModal(false)} className="flex-1 h-12 font-bold text-xs border-slate-300">Batal</Button>
                  <Button type="submit" variant="primary" className="flex-1 h-12 font-bold text-xs shadow-md shadow-[#7A171D]/20">Simpan Log Update</Button>
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
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white border border-slate-200 rounded-[2rem] p-8 w-full max-w-lg relative z-10 shadow-2xl">
              <h2 className="text-xl font-black text-slate-900 mb-2">Penugasan Kurir Operasional</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Pilih mitra kurir (Sopir Fisik) yang siap (idle) untuk mengeksekusi manifes pengiriman ini secara manual.</p>
              
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar border-y border-slate-100 py-4">
                {drivers.length === 0 ? (
                  <p className="text-xs text-center text-red-500 py-6 bg-red-50 rounded-2xl border border-red-100 font-bold">Tidak ada mitra kurir yang aktif di sistem.</p>
                ) : (
                  drivers.map(driver => (
                    <button key={driver.id} type="button" onClick={() => handleAssignDriver(driver)} className="w-full text-left p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:border-[#7A171D] hover:bg-[#7A171D]/5 transition-all flex justify-between items-center group shadow-sm">
                      <div>
                        <p className="text-sm font-black text-slate-900 group-hover:text-[#7A171D] transition-colors flex items-center gap-2">
                          {String(driver.name || "Mitra Kurir")}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                           <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1"><Truck className="w-3 h-3"/> {String(driver.vehicleType || "Personal")}</span>
                           <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                             driver.partnerType === 'FleetDriver' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                           }`}>
                             {driver.partnerType === 'FleetDriver' ? <Building2 className="w-3 h-3"/> : <User className="w-3 h-3"/>}
                             {driver.partnerType === 'Individual' ? 'Individu' : 'Sopir Vendor'}
                           </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200 group-hover:bg-[#7A171D] flex items-center justify-center transition-colors shrink-0">
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