"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Package, Search, CheckCircle2, AlertCircle, Filter, 
  ArrowUpDown, DollarSign, Weight, UserPlus, Calendar, ArrowRight
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// --- IMPORT GLOBAL TYPES ---
import { OrderDetail, FirebaseTimestamp, LocationDetail } from "@/types/order";

export default function DomesticOrdersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // =========================================================================
  // CUSTOM STYLES: APPLE GLASSMORPHISM
  // =========================================================================
  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
  const glassCard = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-[1.5rem]";

  // =========================================================================
  // LOGIC AREA: FETCHING DATA ONLY
  // =========================================================================
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // =========================================================================
  // UI AREA: GLASSMORPHISM BENTO-BOX & MODERN TABLES
  // =========================================================================
  
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <AlertCircle className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Dispatch & Order ini hanya dapat dikelola oleh Superadmin atau Divisi Operasional.</p>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-[#7A171D]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#7A171D] border-t-[#C5A059] rounded-full animate-spin"></div>
        </div>
        <span className="animate-pulse tracking-[0.2em] uppercase text-xs font-bold text-[#7A171D]">Memuat Data Domestik...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* 1. HEADER */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-white/80`}>
        <div className="relative z-10 space-y-3">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(122,23,29,0.3)] border border-[#5A0E13]">
              <Package className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Dispatch Domestik
          </h1>
          <p className="text-slate-500 text-sm max-w-xl font-medium mt-2">
            Pantau pesanan masuk, tugaskan armada, dan lacak riwayat beserta foto bukti pengiriman (PoD).
          </p>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Omset Domestik</span>
            <div className="w-10 h-10 rounded-full bg-white/60 border border-white shadow-sm flex items-center justify-center"><DollarSign className="w-5 h-5 text-[#C5A059]" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight">{formatRupiah(totalOmset)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Resi Aktif</span>
            <div className="w-10 h-10 rounded-full bg-white/60 border border-white shadow-sm flex items-center justify-center"><Package className="w-5 h-5 text-blue-500" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight">{orders.length} <span className="text-base text-slate-400 font-bold">Resi</span></p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 border-amber-200/50`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-amber-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">Butuh Kurir</span>
            <div className="w-10 h-10 rounded-full bg-amber-100/50 border border-amber-200 shadow-sm flex items-center justify-center"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
          </div>
          <p className="text-3xl font-black text-amber-700 mt-4 relative z-10 tracking-tight">{totalPending} <span className="text-base text-amber-600/50 font-bold">Pending</span></p>
        </motion.div>
      </div>

      {/* 3. MAIN DATA: CARD-BASED LIST */}
      <div className="flex flex-col gap-6">
        
        {/* Filters & Search Bar */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="w-full lg:w-1/3">
            <AdminInput 
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="Cari Resi AWB, Nama Pengirim..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#7A171D] focus:ring-[3px] focus:ring-[#7A171D]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[160px]">
                <option value="All">Semua Status</option>
                <option value="Menunggu">Pending</option>
                <option value="Sedang Diproses">Di Gudang / Hub</option>
                <option value="Dikirim">Dalam Perjalanan</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
            
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#7A171D] focus:ring-[3px] focus:ring-[#7A171D]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[180px]">
                <option value="newest">Sortir: Terbaru</option>
                <option value="oldest">Sortir: Terlama</option>
                <option value="heaviest">Sortir: Terberat (Kg)</option>
                <option value="highest_value">Sortir: Nilai Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* List Pesanan - Setiap Pesanan Adalah Kartu yang Terpisah */}
        <div className="space-y-4 min-h-[500px]">
          
          {/* Header Penjelas Kolom untuk Desktop */}
          {processedOrders.length > 0 && (
            <div className="hidden lg:grid grid-cols-12 gap-6 px-8 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="col-span-2">Resi & Tanggal</div>
              <div className="col-span-3">Rute & Klien</div>
              <div className="col-span-3">Spesifikasi & Tagihan</div>
              <div className="col-span-2">Status & Kurir</div>
              <div className="col-span-2 text-right">Tindakan Khusus</div>
            </div>
          )}

          {processedOrders.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full`}>
              <Package className="w-16 h-16 mb-4 opacity-20" />
              <p>Tidak ada data order yang cocok dengan filter pencarian.</p>
            </div>
          ) : (
            processedOrders.map((o, idx) => {
              const originObj = typeof o.origin === 'object' && o.origin !== null ? (o.origin as LocationDetail) : null;
              const originAddr = originObj?.address || (typeof o.origin === 'string' ? o.origin : "");
              const originName = originObj?.senderName || o.senderName || "Klien";
              const destAddr = o.destinations?.[0]?.address || o.destination || "";
              const destName = o.destinations?.[0]?.receiverName || "Penerima";

              // Tentukan varian badge berdasarkan status
              let badgeVariant: "success"|"warning"|"info"|"danger"|"default" = "default";
              if (o.status.includes("Selesai")) badgeVariant = "success";
              else if (o.status.includes("Menunggu")) badgeVariant = "warning";
              else if (o.status.includes("Dikirim") || o.status.includes("Diproses")) badgeVariant = "info";
              else if (o.status.includes("Retur") || o.status.includes("Gagal")) badgeVariant = "danger";

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  key={o.id} 
                  className={`${glassCard} p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center`}
                >
                  {/* KOLOM 1: RESI */}
                  <div className="lg:col-span-2 flex flex-col items-start gap-2">
                    <AdminBadge variant="brand" className="text-[10px] px-3 py-1 bg-gradient-to-br from-[#9A242B] to-[#7A171D] text-white">
                      #{o.id}
                    </AdminBadge>
                    <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 ml-1"><Calendar className="w-3.5 h-3.5"/> {formatDate(o.createdAt)}</p>
                  </div>
                  
                  {/* KOLOM 2: RUTE */}
                  <div className="lg:col-span-3 space-y-3 relative pl-5">
                    <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-200"></div>
                    
                    <div className="flex items-start gap-3 relative">
                      <span className="absolute -left-[24px] mt-1 w-3 h-3 bg-slate-300 rounded-full border-2 border-white shadow-sm"></span>
                      <div className="overflow-hidden w-full">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Asal (Origin)</p>
                        <p className="font-bold text-slate-900 truncate" title={originAddr}>{originName}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 relative">
                      <span className="absolute -left-[24px] mt-1 w-3 h-3 bg-[#7A171D] rounded-full border-2 border-white shadow-[0_0_5px_rgba(122,23,29,0.5)]"></span>
                      <div className="overflow-hidden w-full">
                        <p className="text-[9px] font-black text-[#7A171D] uppercase tracking-widest mb-0.5">Tujuan (Destination)</p>
                        <p className="font-bold text-slate-900 truncate" title={destAddr}>
                          {o.destinations && o.destinations.length > 1 ? `${o.destinations.length} Titik Tujuan` : destName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* KOLOM 3: SPESIFIKASI */}
                  <div className="lg:col-span-3 flex flex-col items-start gap-2">
                    <AdminBadge variant="gold" className="text-[9px] shadow-sm">
                      {o.serviceType} - {o.vehicleName || o.vehicle}
                    </AdminBadge>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5 bg-white/60 px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                        <Weight className="w-3.5 h-3.5 text-slate-400"/> {o.totalWeight || o.weight} Kg
                      </p>
                      <p className="text-xs text-emerald-700 font-black px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm">
                        {formatRupiah(o.finalGrandTotal || o.breakdown?.grandTotal || o.totalCost || 0)}
                      </p>
                    </div>
                  </div>

                  {/* KOLOM 4: STATUS & KURIR */}
                  <div className="lg:col-span-2 flex flex-col items-start gap-2">
                    <AdminBadge variant={badgeVariant} className="text-[10px]">
                      {o.status}
                    </AdminBadge>
                    
                    <div className={`text-[10px] font-bold flex items-center gap-2 px-2.5 py-1.5 rounded-lg border shadow-sm w-fit ${o.driverId ? "bg-white border-slate-200 text-slate-700" : "bg-red-50/50 border-red-200 text-red-600"}`}>
                      <UserPlus className={`w-3.5 h-3.5 ${o.driverId ? "text-[#C5A059]" : "text-red-500"}`} /> 
                      <span className="truncate max-w-[120px]">{o.driverName || "Belum Ada Kurir"}</span>
                    </div>
                  </div>

                  {/* KOLOM 5: TINDAKAN */}
                  <div className="lg:col-span-2 flex flex-col items-end gap-2 justify-center">
                    <AdminButton 
                      size="sm" 
                      variant="primary" 
                      onClick={() => router.push(`/admin/orders/domestic/${o.id}`)} 
                      className="w-full text-[11px] shadow-sm py-5"
                    >
                      Buka Detail <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </AdminButton>
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