"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, History, ShieldAlert, Filter, 
  ChevronLeft, ChevronRight, Activity, Database
} from "lucide-react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// IMPORT GLOBAL TYPES
import { AuditLog } from "@/types/support";

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
      const logsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
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
    if (!ts) return "Memproses...";
    let dateObj: Date;
    const timestamp = ts as { toDate?: () => Date, seconds?: number };
    
    if (typeof timestamp.toDate === 'function') {
      dateObj = timestamp.toDate();
    } else if (typeof timestamp.seconds === 'number') {
      dateObj = new Date(timestamp.seconds * 1000);
    } else {
      dateObj = new Date(ts as string | number);
    }
    
    return dateObj.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Smart Color Coding untuk Action
  const getActionBadgeClass = (action: string = "") => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('remove') || act.includes('suspend') || act.includes('reject')) {
      return 'bg-red-50 text-red-700 border-red-200';
    }
    if (act.includes('create') || act.includes('add') || act.includes('approve') || act.includes('lunas')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('update') || act.includes('edit') || act.includes('modify') || act.includes('ubah')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  // Ekstrak unik modul dari database untuk dropdown filter dinamis
  const uniqueModules = useMemo(() => {
    const modules = new Set(logs.map(l => l.targetModule).filter(Boolean));
    return Array.from(modules).sort();
  }, [logs]);

  // ENGINE FILTERING
  const filteredLogs = useMemo(() => {
    let res = [...logs];
    
    if (searchQuery.trim()) {
      const sq = searchQuery.toLowerCase();
      res = res.filter(l => 
        (l.adminEmail || "").toLowerCase().includes(sq) || 
        (l.action || "").toLowerCase().includes(sq) || 
        (l.targetId || "").toLowerCase().includes(sq)
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

  // ENGINE PAGINATION
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentData = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // =========================================================================
  // GUARDS: DITEMPATKAN DI BAWAH SEMUA HOOKS AGAR TIDAK MELANGGAR ATURAN REACT
  // =========================================================================

  // RBAC GUARD (Hanya Superadmin yang boleh melihat Audit Trail)
  if (currentUser && currentUser.role !== 'superadmin') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Audit Trail ini sangat rahasia dan hanya dapat diakses oleh Superadmin.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">

      <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <Badge variant="default" className="text-slate-300 border-slate-700 mb-3 px-3 py-1 shadow-sm text-[10px] uppercase tracking-widest bg-slate-800/50 backdrop-blur-sm">
            Security & Compliance
          </Badge>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 tracking-tight">
            <History className="w-8 h-8 text-red-400" /> Audit Trail Keamanan
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium max-w-xl leading-relaxed">
            Jejak log aktivitas sistem yang tidak dapat diubah (Immutable). Pantau setiap manipulasi data krusial untuk investigasi dan kepatuhan.
          </p>
        </div>
        <div className="relative z-10 bg-slate-800/50 border border-slate-700 p-4 rounded-2xl flex items-center gap-4 shrink-0 backdrop-blur-sm">
           <Database className="w-8 h-8 text-slate-400" />
           <div>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Rekaman Event</p>
             <p className="text-2xl font-black text-slate-200">{logs.length.toLocaleString('id-ID')}</p>
           </div>
        </div>
      </div>

      <div className="bg-red-50/50 border border-red-100 text-red-800 text-[11px] md:text-xs font-medium rounded-2xl p-5 flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">Sistem ini mematuhi standar <strong>Data Compliance Internasional</strong>. Setiap perubahan data krusial di-*generate* otomatis oleh sistem *backend* (Cloud Functions) dan tidak dapat diedit atau dihapus oleh level otorisasi manapun demi keperluan audit.</p>
      </div>

      {/* TOOLBAR FILTER */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="relative w-full sm:flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari email admin, aksi, atau ID target..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-slate-900 outline-none text-xs font-semibold focus:border-slate-500 focus:bg-white transition-all shadow-inner" 
          />
        </div>
        <div className="relative w-full sm:w-64 shrink-0">
          <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <select 
            value={filterModule} 
            onChange={(e) => setFilterModule(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-8 py-3 text-slate-700 text-xs font-bold outline-none focus:border-slate-500 focus:bg-white appearance-none shadow-inner cursor-pointer"
          >
            <option value="All">Semua Modul Target</option>
            {uniqueModules.map(mod => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABEL DATA */}
      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm flex flex-col min-h-[500px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[400px]">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-red-600 rounded-full animate-spin mb-4 shadow-sm"></div>
            <p className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-widest">Dekripsi Log Keamanan...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs relative">
                <thead className="sticky top-0 bg-slate-50 shadow-sm z-10 border-b border-slate-200">
                  <tr className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">
                    <th className="p-5 pl-6">Waktu Eksekusi (Server)</th>
                    <th className="p-5">Pelaku / Aktor (Admin)</th>
                    <th className="p-5">Modul & Target ID</th>
                    <th className="p-5 pr-6 w-1/3">Deskripsi Aktivitas Terenkripsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {currentData.length === 0 ? (
                    <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-medium flex flex-col items-center justify-center"><Activity className="w-10 h-10 mb-3 opacity-20"/> Tidak ada aktivitas log yang cocok dengan filter.</td></tr>
                  ) : currentData.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-5 pl-6 align-top">
                        <p className="text-slate-900 font-mono font-bold text-[11px] whitespace-nowrap bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm w-fit">
                          {formatTime(log.timestamp)}
                        </p>
                      </td>
                      <td className="p-5 align-top">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-slate-400"/> {log.adminEmail}</p>
                        {log.ipAddress && <p className="text-[9px] text-slate-400 font-mono mt-1">IP: {log.ipAddress}</p>}
                      </td>
                      <td className="p-5 align-top">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="px-2.5 py-0.5 bg-slate-800 text-white rounded text-[9px] uppercase font-black tracking-widest shadow-sm">
                            {log.targetModule}
                          </span>
                          {log.targetId && <span className="text-[10px] font-mono text-slate-500 font-bold border-b border-slate-200 border-dashed pb-0.5" title="Target Document ID">ID: {log.targetId.substring(0,10)}...</span>}
                        </div>
                      </td>
                      <td className="p-5 pr-6 align-top">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border inline-block mb-2 shadow-sm ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                        {log.details && <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">{log.details}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
                <p className="text-xs font-bold text-slate-500 hidden sm:block">
                  Menampilkan <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> dari <span className="text-slate-900">{filteredLogs.length}</span> log
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-9 text-xs border-slate-300 font-bold"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Button>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                    {currentPage} / {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-9 text-xs border-slate-300 font-bold"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}