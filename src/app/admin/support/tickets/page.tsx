"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Search, Filter, ArrowUpDown, 
  Clock, CheckCircle2, AlertCircle, LifeBuoy, ShieldAlert
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";

// IMPORT DARI GLOBAL TYPES
import { SupportTicket } from "@/types/support";

export default function AdminTicketsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, "support_tickets"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket)));
      } catch (error) {
        console.error("Gagal menarik tiket:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTickets();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateTicket = async (id: string, newStatus: "Open" | "In Progress" | "Resolved") => {
    try {
      await updateDoc(doc(db, "support_tickets", id), { status: newStatus });
      showToast("success", `Status tiket diperbarui menjadi ${newStatus}`);
      
      // Update state lokal untuk optimalisasi agar tidak fetch ulang
      setTickets(prev => prev.map(t => 
        t.id === id ? { ...t, status: newStatus } : t
      ));
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memperbarui tiket.");
    }
  };

  // Safe Timestamp Parsers untuk lolos Strict Mode
  const getMillis = (ts: unknown) => {
    if (!ts) return 0;
    const t = ts as { toMillis?: () => number, seconds?: number };
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t.seconds === 'number') return t.seconds * 1000;
    return new Date(ts as string | number).getTime();
  };

  const formatTime = (ts?: unknown) => {
    if (!ts) return "Unknown";
    const t = ts as { toDate?: () => Date };
    const d = typeof t.toDate === 'function' ? t.toDate() : new Date(ts as string | number);
    return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const processedTickets = useMemo(() => {
    let res = [...tickets];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      res = res.filter(t => (t.clientName || "").toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }
    if (filterStatus !== "All") res = res.filter(t => t.status === filterStatus);
    if (filterPriority !== "All") res = res.filter(t => t.priority === filterPriority);
    
    res.sort((a, b) => {
      const timeA = getMillis(a.createdAt);
      const timeB = getMillis(b.createdAt);
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });
    return res;
  }, [tickets, searchQuery, filterStatus, filterPriority, sortOrder]);

  // =========================================================================
  // GUARDS: DITEMPATKAN DI BAWAH SEMUA HOOKS AGAR TIDAK MELANGGAR ATURAN REACT
  // =========================================================================

  // RBAC GUARD (Hanya Superadmin, Operational, & CS/Staff)
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational' && currentUser.role !== 'staff') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Tiket Bantuan ini hanya dapat dikelola oleh Divisi Customer Support atau Operasional.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[100] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <LifeBuoy className="w-8 h-8 text-blue-600" /> Tiket Bantuan CS
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Manajemen komplain dan pertanyaan dari klien operasional.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col lg:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="relative w-full lg:w-96 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Cari ID tiket atau nama klien..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-900 outline-none text-xs font-semibold focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm" />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
          <div className="relative shrink-0 flex-1 sm:flex-none">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl pl-9 pr-8 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 appearance-none shadow-sm">
              <option value="All">Semua Status</option>
              <option value="Open">Open (Baru)</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div className="relative shrink-0 flex-1 sm:flex-none">
            <AlertCircle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl pl-9 pr-8 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 appearance-none shadow-sm">
              <option value="All">Semua Prioritas</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <button onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")} className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-colors shrink-0 shadow-sm">
            <ArrowUpDown className="w-4 h-4 text-slate-400" /> {sortOrder === "desc" ? "Terbaru" : "Terlama"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-bold animate-pulse text-sm">Menarik Tiket Bantuan...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="p-5 pl-6">ID & Pengirim</th>
                  <th className="p-5">Kategori & Pesan Kendala</th>
                  <th className="p-5">Prioritas</th>
                  <th className="p-5 pr-6 text-right">Tindakan CS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedTickets.length === 0 ? (
                  <tr><td colSpan={4} className="p-16 text-center text-slate-400 font-medium">Tidak ada tiket ditemukan.</td></tr>
                ) : processedTickets.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 pl-6 align-top">
                      <p className="font-mono font-black text-slate-900 text-sm mb-1 uppercase">#{t.id.substring(0,8)}</p>
                      <p className="text-[11px] text-slate-600 font-bold mb-1">{t.clientName || "Klien"}</p>
                      <p className="text-[9px] text-slate-400 font-medium flex items-center gap-1"><Clock className="w-3 h-3"/> {formatTime(t.createdAt)}</p>
                    </td>
                    <td className="p-5 align-top">
                      <p className="text-slate-800 font-bold mb-1">{t.issueType}</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed max-w-[350px] line-clamp-2" title={t.message}>{t.message}</p>
                    </td>
                    <td className="p-5 align-top">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border inline-block ${
                        t.priority === 'Urgent' ? 'bg-red-50 text-red-600 border-red-200' :
                        t.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                        t.priority === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="p-5 pr-6 align-top flex flex-col items-end gap-2">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border mb-2 ${
                        t.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        t.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {t.status}
                      </span>
                      <select 
                        value={t.status}
                        onChange={(e) => handleUpdateTicket(t.id, e.target.value as "Open" | "In Progress" | "Resolved")}
                        className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 w-36 appearance-none cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
                      >
                        <option value="Open">Ubah ke: Open</option>
                        <option value="In Progress">Ubah ke: In Progress</option>
                        <option value="Resolved">Tandai Selesai</option>
                      </select>
                    </td>
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