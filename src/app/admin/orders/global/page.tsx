"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Globe, Search, Filter, 
  ArrowUpDown, DollarSign, Weight, FileText, ShieldAlert,
  PlaneTakeoff, ArrowRight, User
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
import { Quote } from "@/types/order";

export default function GlobalOrdersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // =========================================================================
  // CUSTOM STYLES: APPLE GLASSMORPHISM
  // =========================================================================
  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
  // Khusus untuk card per order agar punya batas/sekat yang tegas
  const glassCard = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.05)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(0,0,0,0.08)] transition-all duration-300 rounded-[1.5rem]";

  // =========================================================================
  // LOGIC AREA: JANGAN DIUBAH!
  // =========================================================================
  useEffect(() => {
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Quote)));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  const getMillis = (ts: unknown) => {
    if (!ts) return 0;
    const t = ts as { seconds?: number; toMillis?: () => number };
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t.seconds === 'number') return t.seconds * 1000;
    return new Date(ts as string | number).getTime();
  };

  const processedQuotes = useMemo(() => {
    let result = [...quotes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => o.id.toLowerCase().includes(q) || (o.originCountry || "").toLowerCase().includes(q) || (o.destCountry || "").toLowerCase().includes(q));
    }
    if (filterStatus !== "All") result = result.filter(o => o.status.includes(filterStatus));
    
    result.sort((a, b) => {
      const wA = a.weight || 0; 
      const wB = b.weight || 0;
      const cA = a.offeredPrice || 0; 
      const cB = b.offeredPrice || 0;
      const tA = getMillis(a.createdAt);
      const tB = getMillis(b.createdAt);

      if (sortOrder === "newest") return tB - tA;
      if (sortOrder === "oldest") return tA - tB;
      if (sortOrder === "heaviest") return wB - wA;
      if (sortOrder === "highest_value") return cB - cA;
      return 0;
    });
    return result;
  }, [quotes, searchQuery, filterStatus, sortOrder]);

  const totalQuotes = quotes.length;
  const pendingQuotes = quotes.filter(q => !q.offeredPrice).length;

  // =======================================================================
  // UI AREA: GLASSMORPHISM BENTO-BOX & MODERN LIST
  // =======================================================================
  
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
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
          <div className="absolute inset-0 border-4 border-[#C5A059]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#C5A059] border-t-[#7A171D] rounded-full animate-spin"></div>
        </div>
        <p className="text-[#C5A059] text-xs font-bold uppercase tracking-widest animate-pulse">Menghubungkan ke Global Node...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* 1. HEADER (Bento Glass) */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:bg-white/80`}>
        <div className="relative z-10 space-y-3">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            {/* 3D ICON GOLD ACCENT */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_16px_rgba(197,160,89,0.3)] border border-[#A68345]">
              <Globe className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            Global Forwarding
          </h1>
          <p className="text-slate-500 text-sm max-w-xl font-medium mt-2">
            Manajemen bea cukai internasional, tracking global, dan penawaran harga ekspor/impor.
          </p>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Permintaan Kuotasi</span>
            <div className="w-10 h-10 rounded-full bg-white/60 border border-white shadow-sm flex items-center justify-center"><FileText className="w-5 h-5 text-[#C5A059]" /></div>
          </div>
          <p className="text-3xl font-black text-slate-900 mt-4 relative z-10 tracking-tight">{totalQuotes} <span className="text-base text-slate-400 font-bold">Request</span></p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassPanel} rounded-2xl p-6 relative overflow-hidden group hover:bg-white/80 border-amber-200/50`}>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-amber-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="flex justify-between items-start relative z-10">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">Menunggu Penawaran</span>
            <div className="w-10 h-10 rounded-full bg-amber-100/50 border border-amber-200 shadow-sm flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-amber-600" /></div>
          </div>
          <p className="text-3xl font-black text-amber-700 mt-4 relative z-10 tracking-tight">{pendingQuotes} <span className="text-base text-amber-600/50 font-bold">Pending</span></p>
        </motion.div>
      </div>

      {/* 3. MAIN DATA: CARD-BASED LIST (Floating Cards) */}
      <div className="flex flex-col gap-6">
        
        {/* Filters & Search Bar (Terpisah dari List Order) */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="w-full lg:w-1/3">
            <AdminInput 
              leftIcon={<Search className="w-4 h-4" />}
              placeholder="Cari ID Req, Negara Asal / Tujuan..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#C5A059] focus:ring-[3px] focus:ring-[#C5A059]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[160px]">
                <option value="All">Semua Status</option>
                <option value="Menunggu">Pending</option>
                <option value="Disetujui">Approved</option>
              </select>
            </div>
            
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-[#C5A059] focus:ring-[3px] focus:ring-[#C5A059]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[180px]">
                <option value="newest">Sortir: Terbaru</option>
                <option value="oldest">Sortir: Terlama</option>
                <option value="heaviest">Sortir: Terberat (Kg)</option>
                <option value="highest_value">Sortir: Nilai Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* List Pesanan - Card Layout Float */}
        <div className="space-y-4 min-h-[500px]">
          
          {/* Header Penjelas Kolom untuk Desktop */}
          {processedQuotes.length > 0 && (
            <div className="hidden lg:grid grid-cols-12 gap-6 px-8 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="col-span-3">ID & Klien</div>
              <div className="col-span-3">Jalur Penerbangan</div>
              <div className="col-span-3">Spesifikasi Kargo</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Tindakan</div>
            </div>
          )}

          {processedQuotes.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full`}>
              <Globe className="w-16 h-16 mb-4 opacity-20" />
              <p>Tidak ada data kuotasi forwarding yang cocok.</p>
            </div>
          ) : (
            processedQuotes.map((q, idx) => {
              // Tentukan varian badge
              let badgeVariant: "success"|"warning"|"danger"|"default" = "default";
              if (q.status.includes("Setuju") || q.status.includes("Approved")) badgeVariant = "success";
              else if (q.status.includes("Menunggu")) badgeVariant = "warning";
              else if (q.status.includes("Tolak")) badgeVariant = "danger";

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  key={q.id} 
                  className={`${glassCard} p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center group`}
                >
                  {/* KOLOM 1: ID & KLIEN */}
                  <div className="lg:col-span-3 flex flex-col items-start gap-2">
                    <AdminBadge variant="gold" className="text-[10px] px-3 py-1 bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-white border-[#A68345]">
                      #{q.id}
                    </AdminBadge>
                    <p className="text-[11px] text-slate-600 font-bold flex items-center gap-1.5 ml-1 mt-1 truncate max-w-[200px]" title={q.name}>
                      <User className="w-3.5 h-3.5 text-slate-400"/> {q.name}
                    </p>
                  </div>
                  
                  {/* KOLOM 2: JALUR PENERBANGAN */}
                  <div className="lg:col-span-3 space-y-3 relative pl-5">
                    <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-slate-200 group-hover:bg-[#C5A059]/40 transition-colors"></div>
                    
                    <div className="flex items-start gap-3 relative">
                      <span className="absolute -left-[24px] mt-1 w-3 h-3 bg-slate-300 rounded-full border-2 border-white shadow-sm"></span>
                      <div className="overflow-hidden w-full bg-white/50 px-3 py-2 rounded-xl border border-white shadow-sm">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Asal (Export)</p>
                        <p className="font-bold text-slate-900 truncate" title={q.originCountry}>
                           {q.originCountry}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 relative">
                      <span className="absolute -left-[24px] mt-1 w-3 h-3 bg-[#C5A059] rounded-full border-2 border-white shadow-[0_0_5px_rgba(197,160,89,0.5)]"></span>
                      <div className="overflow-hidden w-full bg-white/50 px-3 py-2 rounded-xl border border-white shadow-sm">
                        <p className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest mb-0.5">Tujuan (Import)</p>
                        <p className="font-bold text-slate-900 truncate" title={q.destCountry}>
                           {q.destCountry}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* KOLOM 3: SPESIFIKASI KARGO */}
                  <div className="lg:col-span-3 flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm w-fit mb-1">
                      <PlaneTakeoff className="w-4 h-4 text-[#C5A059]" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jenis Komoditi</span>
                        <span className="text-xs font-bold text-slate-800">{q.itemType || "General Cargo"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5 bg-white/50 px-2.5 py-1 rounded-lg border border-slate-200">
                        <Weight className="w-3.5 h-3.5 text-slate-400"/> {q.weight} Kg
                      </p>
                      <p className="text-[10px] text-slate-500 font-semibold bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                        Dim: {q.length}x{q.width}x{q.height} cm
                      </p>
                    </div>
                  </div>

                  {/* KOLOM 4: STATUS & HARGA */}
                  <div className="lg:col-span-1 flex flex-col items-start gap-2">
                    <AdminBadge variant={badgeVariant} className="text-[10px]">
                      {q.status}
                    </AdminBadge>
                    
                    {q.offeredPrice ? (
                      <div className="text-[11px] font-black flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-sm w-fit bg-emerald-50/50 border-emerald-200 text-emerald-700 mt-1">
                        <DollarSign className="w-4 h-4 text-emerald-500" /> 
                        {formatRupiah(q.offeredPrice)}
                      </div>
                    ) : (
                      <div className="text-[9px] font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-sm w-fit bg-amber-50/50 border-amber-200 text-amber-600 mt-1 uppercase tracking-widest">
                        <ShieldAlert className="w-4 h-4" /> Pending
                      </div>
                    )}
                  </div>

                  {/* KOLOM 5: TINDAKAN */}
                  <div className="lg:col-span-2 flex flex-col items-end gap-2 justify-center">
                    <AdminButton 
                      size="sm" 
                      variant="gold" 
                      onClick={() => router.push(`/admin/orders/global/${q.id}`)} 
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