"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, History, ShieldAlert, Filter, 
  ChevronLeft, ChevronRight, Activity, Database, Key, ShieldCheck,
  Globe
} from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { motion, AnimatePresence } from "framer-motion";

// IMPORT GLOBAL TYPES
import { AuditLog } from "@/types/support";

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Dark/Security Theme)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(15,23,42,0.1)] transition-all duration-300 rounded-2xl";

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getAdminUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
    return path.replace(/^\/admin/, '') || '/';
  }
  return path; 
};

export default function AdminAuditPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModule, setFilterModule] = useState("All");
  
  // State Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // REAL-TIME LISTENER UNTUK KEAMANAN TINGKAT TINGGI
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // KODE DIBERSIHKAN: Safe typing
      const logsData: AuditLog[] = snapshot.docs.map(d => {
        return { id: d.id, ...(d.data() as Record<string, unknown>) } as unknown as AuditLog;
      });
      setLogs(logsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Gagal menarik audit log secara real-time:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Safe Date Parsing
  const formatTime = (ts?: unknown) => {
    if (!ts) return { date: "Memproses...", time: "" };
    let dateObj: Date;
    
    if (ts instanceof Date) {
      dateObj = ts;
    } else if (typeof ts === 'object' && ts !== null) {
      const timestamp = ts as { toDate?: () => Date, seconds?: number };
      if (typeof timestamp.toDate === 'function') {
        dateObj = timestamp.toDate();
      } else if (typeof timestamp.seconds === 'number') {
        dateObj = new Date(timestamp.seconds * 1000);
      } else {
        dateObj = new Date();
      }
    } else {
      dateObj = new Date(ts as string | number);
    }
    
    return {
      date: dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  // Smart Color Coding untuk Action
  const getActionTheme = (action: string = "") => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('remove') || act.includes('suspend') || act.includes('reject')) {
      return { badge: "danger" as const, text: "text-red-600" };
    }
    if (act.includes('create') || act.includes('add') || act.includes('approve') || act.includes('lunas')) {
      return { badge: "success" as const, text: "text-emerald-600" };
    }
    if (act.includes('update') || act.includes('edit') || act.includes('modify') || act.includes('ubah')) {
      return { badge: "info" as const, text: "text-blue-600" };
    }
    return { badge: "default" as const, text: "text-slate-600" };
  };

  const uniqueModules = useMemo(() => {
    const modules = new Set(logs.map(l => l.targetModule).filter(Boolean));
    return Array.from(modules).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    let res = [...logs];
    
    if (searchQuery.trim()) {
      const sq = searchQuery.toLowerCase();
      res = res.filter(l => 
        (l.adminEmail || "").toLowerCase().includes(sq) || 
        (l.action || "").toLowerCase().includes(sq) || 
        (l.targetId || "").toLowerCase().includes(sq) ||
        (l.targetModule || "").toLowerCase().includes(sq)
      );
    }
    
    if (filterModule !== "All") {
      res = res.filter(l => l.targetModule === filterModule);
    }
    
    return res;
  }, [logs, searchQuery, filterModule]);

  // Reset page ke 1 setiap kali filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterModule]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentData = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // RBAC GUARD (Hanya Superadmin yang boleh melihat Audit Trail)
  if (currentUser && currentUser.role !== 'superadmin') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Audit Trail ini sangat rahasia dan hanya dapat diakses oleh Superadmin.</p>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-sans max-w-7xl mx-auto">

      {/* HEADER MODUL */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500 rounded-full blur-[100px] opacity-10 pointer-events-none" />
        <div className="relative z-10 flex-1">
          <AdminBadge variant="danger" className="mb-4 bg-red-100 text-red-700 border-red-200">System Security</AdminBadge>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <History className="w-8 h-8 text-red-600" />
            Audit Trail Keamanan
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl font-medium leading-relaxed">
            Jejak log aktivitas sistem yang tidak dapat diubah (Immutable). Pantau setiap manipulasi data krusial untuk investigasi, akuntabilitas, dan kepatuhan standar keamanan data.
          </p>
        </div>

        <div className="relative z-10 bg-slate-900 border border-slate-800 p-6 rounded-[1.5rem] flex items-center gap-5 shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
           <Database className="w-10 h-10 text-emerald-400" />
           <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Rekaman Event</p>
             <p className="text-3xl font-black text-white font-mono tracking-tight">{logs.length.toLocaleString('id-ID')}</p>
           </div>
        </div>
      </div>

      {/* ALERT COMPLIANCE */}
      <div className="bg-red-50/80 backdrop-blur-md border border-red-200 p-5 rounded-[1.5rem] flex items-start gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
        <ShieldCheck className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
        <p className="text-sm text-red-800 font-medium leading-relaxed">
          <b className="font-black tracking-wide">Data Compliance Level 3.</b> Setiap log yang ada di halaman ini dihasilkan secara otomatis oleh <i>Cloud Functions</i> (*server-side*). Data tidak dapat dimanipulasi, diedit, atau dihapus oleh siapapun (termasuk Superadmin) demi menjaga integritas audit.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* TOOLBAR FILTER & SEARCH */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/2">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari email admin, IP, atau target ID..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-slate-800 focus:ring-[3px] focus:ring-slate-800/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium" 
            />
          </div>
          
          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none w-full lg:w-64">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <select 
                value={filterModule} 
                onChange={(e) => setFilterModule(e.target.value)} 
                className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-slate-800 focus:ring-[3px] focus:ring-slate-800/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer"
              >
                <option value="All">Semua Modul Filter</option>
                {uniqueModules.map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* LIST LOG AKTIVITAS (ROW CARDS) */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full min-h-[400px]">
              <Activity className="w-12 h-12 mb-4 text-red-600 animate-pulse" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Mendekripsi Log Keamanan...</p>
            </div>
          ) : currentData.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <ShieldAlert className="w-16 h-16 mb-4 opacity-20 text-slate-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Tidak Ada Log Ditemukan</h4>
              <p className="font-medium text-slate-500">Coba gunakan kata kunci pencarian yang lain.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AnimatePresence>
                {currentData.map((log, i) => {
                  const { date, time } = formatTime(log.timestamp);
                  const theme = getActionTheme(log.action);

                  return (
                    <motion.div 
                      key={log.id || i} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.02 }}
                      className={`${glassRow} p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 group border border-white`}
                    >
                      {/* Kolom 1: Timestamp & IP */}
                      <div className="flex flex-col gap-2 w-full lg:w-[15%] shrink-0 border-b lg:border-b-0 border-slate-100 pb-4 lg:pb-0">
                        <div className="bg-slate-100/80 border border-slate-200 rounded-lg px-3 py-2 w-fit shadow-sm">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{date}</p>
                          <p className="text-sm font-black text-slate-900 font-mono tracking-tight leading-none">{time}</p>
                        </div>
                        {log.ipAddress && (
                          <p className="text-[9px] text-slate-400 font-mono font-bold flex items-center gap-1"><Globe className="w-3 h-3"/> {log.ipAddress}</p>
                        )}
                      </div>

                      {/* Kolom 2: Aktor (Admin) */}
                      <div className="w-full lg:w-[25%] flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm border border-slate-700">
                          <Key className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden pt-0.5">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Aktor / Admin</p>
                          <p className="text-sm font-bold text-slate-900 truncate">{log.adminEmail}</p>
                        </div>
                      </div>

                      {/* Kolom 3: Modul Target */}
                      <div className="w-full lg:w-[20%] flex flex-col">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Modul Target</p>
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[10px] uppercase font-black tracking-widest shadow-sm w-fit truncate max-w-full">
                          {log.targetModule}
                        </span>
                        {log.targetId && (
                          <p className="text-[10px] font-mono text-slate-400 mt-1.5 truncate max-w-full" title={log.targetId}>ID: {log.targetId}</p>
                        )}
                      </div>

                      {/* Kolom 4: Aksi & Deskripsi */}
                      <div className="w-full lg:w-[40%] flex flex-col gap-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-inner h-full min-h-[80px]">
                        <div className="flex items-center gap-2">
                          <AdminBadge variant={theme.badge} className="text-[9px] uppercase tracking-widest py-0.5 px-2">{log.action}</AdminBadge>
                        </div>
                        {log.details && (
                          <p className="text-[11px] font-medium text-slate-600 leading-relaxed line-clamp-2" title={log.details}>
                            {log.details}
                          </p>
                        )}
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && (
          <div className={`${glassPanel} rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-20 relative border border-white mt-2`}>
            <p className="text-xs font-bold text-slate-500">
              Menampilkan <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> dari <span className="text-slate-900">{filteredLogs.length}</span> rekam jejak
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <AdminButton 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-10 text-xs border-slate-200 font-bold bg-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </AdminButton>
              <div className="h-10 px-4 flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200 text-xs font-black text-slate-700 font-mono tracking-widest min-w-[80px]">
                {currentPage} / {totalPages}
              </div>
              <AdminButton 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-10 text-xs border-slate-200 font-bold bg-white"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </AdminButton>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}