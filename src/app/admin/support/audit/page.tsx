"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, History, ShieldAlert } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";

interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetModule: string;
  timestamp?: Timestamp;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));
    } catch (error) {
      console.error("Gagal menarik audit log:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const formatTime = (ts?: Timestamp) => {
    if (!ts) return "Unknown";
    return ts.toDate().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const processedLogs = useMemo(() => {
    let res = [...logs];
    if (searchQuery) res = res.filter(l => l.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()) || l.action.toLowerCase().includes(searchQuery.toLowerCase()) || l.targetModule.toLowerCase().includes(searchQuery.toLowerCase()));
    return res;
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6 pb-12 font-sans">

      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <History className="w-8 h-8 text-slate-600" /> Audit Trail Keamanan
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Jejak log aktivitas sistem yang tidak dapat diubah (Immutable).</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 text-blue-700 text-[11px] md:text-xs font-medium rounded-2xl p-5 flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">Sistem ini mematuhi standar <strong>Data Compliance</strong>. Setiap perubahan data krusial di-*generate* otomatis oleh sistem *backend* dan tidak dapat diedit/dihapus oleh level otorisasi manapun demi keperluan investigasi keamanan.</p>
      </div>

      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari email admin, aksi, atau modul..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-900 outline-none text-xs font-semibold focus:border-slate-500 focus:ring-4 focus:ring-slate-50 transition-all shadow-sm" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-bold animate-pulse text-sm">Menarik Log Keamanan...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs relative">
              <thead className="sticky top-0 bg-slate-50 shadow-sm z-10 border-b border-slate-200">
                <tr className="text-slate-500 uppercase font-bold tracking-wider text-[10px]">
                  <th className="p-5 pl-6">Waktu Eksekusi</th>
                  <th className="p-5">Pelaku (Admin/System)</th>
                  <th className="p-5">Modul Target</th>
                  <th className="p-5 pr-6">Deskripsi Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {processedLogs.length === 0 ? (
                  <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-medium">Log sistem tidak ditemukan.</td></tr>
                ) : processedLogs.map((log, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 pl-6 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="p-5 font-bold text-slate-900">{log.adminEmail}</td>
                    <td className="p-5">
                      <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-md uppercase font-bold text-[9px] tracking-widest whitespace-nowrap">
                        {log.targetModule}
                      </span>
                    </td>
                    <td className="p-5 pr-6 text-slate-600 font-medium">{log.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}