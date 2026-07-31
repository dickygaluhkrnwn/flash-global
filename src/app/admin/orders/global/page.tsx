"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe2, Search, Filter, 
  ArrowUpDown, Weight, ShieldAlert,
  PlaneTakeoff, ArrowRight, User, Anchor, Plane, Box
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";

// IMPORT GLOBAL TYPES
import { Quote } from "@/types/order";

// Type Extension untuk menangani data lama dan data baru secara aman
type QuoteWithDisplayId = Quote & { quoteId?: string };

// KODE DIBERSIHKAN: Export default HARUS ada agar next build tidak crash
export default function GlobalOrdersPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [quotes, setQuotes] = useState<QuoteWithDisplayId[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  // =========================================================================
  // CUSTOM STYLES & LAYOUTS
  // =========================================================================
  const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
  const glassCard = "bg-white/80 backdrop-blur-xl border border-slate-100 shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 rounded-[1.5rem]";

  // =========================================================================
  // LOGIC AREA & BACKWARD COMPATIBILITY HELPERS
  // =========================================================================
  useEffect(() => {
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQuotes(snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          // BUG FIX: Memastikan id SELALU berisi Document ID dari Firebase, tidak tertimpa oleh data dalam dokumen
          id: d.id, 
          // Menyimpan FFW-xxx ke quoteId agar bisa ditampilkan di UI
          quoteId: data.id || data.quoteId || d.id, 
        } as QuoteWithDisplayId;
      }));
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

  // Helper untuk Backward Compatibility (Orderan Lama yang hanya punya string origin/destination)
  const getCity = (city?: string, fullAddress?: string) => {
    if (city) return city;
    if (!fullAddress) return "-";
    return fullAddress.split(",")[0].trim();
  };

  const getCountry = (country?: string, fullAddress?: string) => {
    if (country) return country;
    if (!fullAddress) return "-";
    const parts = fullAddress.split(",");
    return parts[parts.length - 1].trim();
  };

  const processedQuotes = useMemo(() => {
    let result = [...quotes];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(q) || 
        (o.quoteId || "").toLowerCase().includes(q) || // Fitur pencarian FFW-xxx
        (o.originCountry || o.origin || "").toLowerCase().includes(q) || 
        (o.destCountry || o.destination || "").toLowerCase().includes(q) ||
        (o.name || "").toLowerCase().includes(q)
      );
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

  // =======================================================================
  // UI RENDER
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
    <div className="space-y-8 pb-16 font-sans max-w-[1600px] mx-auto">

      {/* ======================================================================= */}
      {/* 1. POWERFUL HERO SECTION (COMMAND CENTER VIBE) */}
      {/* ======================================================================= */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-[2.5rem] p-8 lg:p-12 overflow-hidden shadow-[0_20px_50px_rgba(15,23,42,0.4)] border border-slate-700">
        {/* Ambient Lights */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.15)_0,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.1)_0,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 text-[#C5A059] text-[10px] font-black uppercase tracking-widest">
              <Globe2 className="w-3.5 h-3.5" /> Forwarding Command Center
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Lalu Lintas <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFBE7B] to-[#C5A059]">Ekspor & Impor.</span>
            </h1>
            <p className="text-slate-400 text-sm lg:text-base leading-relaxed font-medium max-w-2xl">
              Pusat kendali kargo internasional. Evaluasi klasifikasi HS Code, kalkulasi biaya (Freight, Duty & Tax), dan terbitkan Quotation resmi dengan presisi dan cepat kepada klien.
            </p>
          </div>

          {/* Abstract Floating Icon */}
          <div className="hidden lg:flex items-center justify-center shrink-0 w-32 h-32 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] rounded-[2rem] opacity-20 blur-xl animate-pulse"></div>
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] p-[1px] shadow-[0_0_30px_rgba(197,160,89,0.3)] relative z-10">
              <div className="w-full h-full bg-slate-900 rounded-[2rem] flex items-center justify-center">
                <PlaneTakeoff className="w-10 h-10 text-[#DFBE7B]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. MAIN DATA: FILTER & MODERN LIST */}
      {/* ======================================================================= */}
      <div className="flex flex-col gap-6">
        
        {/* Filters & Search Bar */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="w-full lg:w-1/3">
            <AdminInput 
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              placeholder="Cari ID, Klien, atau Negara..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="bg-white/60 focus:bg-white"
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-[1.25rem] pl-11 pr-8 py-3 text-sm outline-none focus:border-[#C5A059] focus:ring-[3px] focus:ring-[#C5A059]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[160px]">
                <option value="All">Semua Status</option>
                <option value="Menunggu">Pending</option>
                <option value="Disetujui">Approved</option>
              </select>
            </div>
            
            <div className="relative flex-1 lg:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-[1.25rem] pl-11 pr-8 py-3 text-sm outline-none focus:border-[#C5A059] focus:ring-[3px] focus:ring-[#C5A059]/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[180px]">
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="heaviest">Terberat (Kg)</option>
                <option value="highest_value">Nilai Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* List Pesanan - Presisi Layout Grid */}
        <div className="space-y-4 min-h-[500px]">
          
          {/* Header Penjelas Kolom untuk Desktop */}
          {processedQuotes.length > 0 && (
            <div className="hidden lg:grid grid-cols-12 gap-6 px-8 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="col-span-3">Identitas & Pemohon</div>
              <div className="col-span-4">Rute Internasional</div>
              <div className="col-span-3">Spesifikasi Kargo</div>
              <div className="col-span-2 text-right">Status & Tindakan</div>
            </div>
          )}

          <AnimatePresence>
            {processedQuotes.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${glassPanel} rounded-[2.5rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border-dashed border-2 border-slate-300 bg-slate-50/50`}>
                <Globe2 className="w-16 h-16 mb-4 opacity-20" />
                <p>Tidak ada data penawaran yang ditemukan.</p>
              </motion.div>
            ) : (
              processedQuotes.map((q, idx) => {
                let badgeVariant: "success"|"warning"|"danger"|"default" = "default";
                if (q.status.includes("Setuju") || q.status.includes("Approved")) badgeVariant = "success";
                else if (q.status.includes("Menunggu") || q.status.includes("Pending")) badgeVariant = "warning";
                else if (q.status.includes("Tolak") || q.status.includes("Rejected")) badgeVariant = "danger";

                // Backward Compatibility Data Extraction
                const oCity = getCity(q.originCity, q.origin);
                const oCountry = getCountry(q.originCountry, q.origin);
                const dCity = getCity(q.destCity, q.destination);
                const dCountry = getCountry(q.destCountry, q.destination);

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    key={q.id} 
                    className={`${glassCard} p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-center group`}
                  >
                    {/* KOLOM 1: ID & KLIEN (Col-span-3) */}
                    <div className="lg:col-span-3 flex flex-col items-start justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        {/* Menampilkan quoteId (FFW-XXX) di UI */}
                        <AdminBadge variant="gold" className="text-[10px] px-2.5 py-0.5 bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-white border-[#A68345] shadow-sm">
                          #{q.quoteId}
                        </AdminBadge>
                        <span className="text-[9px] font-bold text-slate-400">
                          {q.createdAt ? new Date(getMillis(q.createdAt)).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : "-"}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-900 truncate max-w-full" title={q.name}>
                        {q.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mt-0.5 truncate max-w-full">
                        <User className="w-3 h-3 text-slate-400"/> {q.email || q.phone}
                      </p>
                    </div>
                    
                    {/* KOLOM 2: JALUR PENERBANGAN (Col-span-4) */}
                    <div className="lg:col-span-4 flex items-center justify-between bg-slate-50/50 border border-slate-100 p-3 rounded-[1.25rem]">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1"><Anchor className="w-3 h-3"/> Origin</p>
                        <p className="text-xs font-black text-slate-900 truncate" title={oCity}>{oCity}</p>
                        <p className="text-[10px] font-bold text-slate-500 truncate" title={oCountry}>{oCountry}</p>
                      </div>
                      
                      <div className="w-8 flex justify-center shrink-0">
                        <ArrowRight className="w-4 h-4 text-[#C5A059] opacity-50" />
                      </div>

                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-[9px] font-black text-[#C5A059] uppercase tracking-widest mb-0.5 flex items-center justify-end gap-1"><Plane className="w-3 h-3"/> Dest</p>
                        <p className="text-xs font-black text-slate-900 truncate" title={dCity}>{dCity}</p>
                        <p className="text-[10px] font-bold text-slate-500 truncate" title={dCountry}>{dCountry}</p>
                      </div>
                    </div>

                    {/* KOLOM 3: SPESIFIKASI KARGO (Col-span-3) */}
                    <div className="lg:col-span-3 flex flex-col justify-center gap-1.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Box className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 truncate" title={q.itemType || "General Cargo"}>
                          {q.itemType || "General Cargo"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-slate-700 font-black flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                          <Weight className="w-3 h-3 text-slate-500"/> {q.weight} Kg
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                          {q.length}x{q.width}x{q.height} cm
                        </span>
                      </div>
                    </div>

                    {/* KOLOM 4: STATUS & ACTION (Col-span-2) */}
                    <div className="lg:col-span-2 flex flex-col items-end gap-2.5 justify-center border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-4">
                      {q.offeredPrice ? (
                        <div className="text-xs font-black text-emerald-700 w-full text-right truncate">
                          {formatRupiah(q.offeredPrice)}
                        </div>
                      ) : (
                        <AdminBadge variant={badgeVariant} className="text-[9px] px-2 py-0.5 w-max">
                          {q.status}
                        </AdminBadge>
                      )}
                      
                      {/* 
                        Mengarahkan menggunakan q.id (Document ID Asli di Firestore), BUKAN FFW-xxx.
                        Sehingga halaman detail pasti menemukannya tanpa error Not Found.
                      */}
                      <AdminButton 
                        size="sm" 
                        variant="gold" 
                        onClick={() => router.push(`/admin/orders/global/${q.id}`)} 
                        className="w-full text-[10px] shadow-sm py-4 h-auto rounded-xl"
                      >
                        Buka Detail <ArrowRight className="w-3 h-3 ml-1" />
                      </AdminButton>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}