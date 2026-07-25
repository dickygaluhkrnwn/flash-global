"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Search, Filter, ArrowUpDown, 
  Clock, CheckCircle2, AlertCircle, LifeBuoy, ShieldAlert,
  MessageCircle, Headset, CheckCircle, Flame, X, User, Mail, CalendarDays,
  Activity
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, doc, updateDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// IMPORT DARI GLOBAL TYPES
import { SupportTicket } from "@/types/support";

// =========================================================================
// CUSTOM STYLES: APPLE GLASSMORPHISM (Blue/Indigo Support Theme)
// =========================================================================
const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";
const glassRow = "bg-white/80 backdrop-blur-xl border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_15px_rgba(0,0,0,0.03)] hover:bg-white hover:shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_25px_rgba(59,130,246,0.15)] transition-all duration-300 rounded-[1.5rem]";

export default function AdminTicketsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // State Modal Detail Tiket
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // REAL-TIME LISTENER
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, "support_tickets"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket));
      setTickets(ticketsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Gagal menarik tiket secara real-time:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateTicket = async (id: string, newStatus: "Open" | "In Progress" | "Resolved") => {
    try {
      await updateDoc(doc(db, "support_tickets", id), { status: newStatus });
      showToast("success", `Status tiket diperbarui menjadi ${newStatus}`);
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memperbarui tiket.");
    }
  };

  // Safe Timestamp Parsers
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

  // LOGIKA FILTER & SORTING
  const processedTickets = useMemo(() => {
    let res = [...tickets];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter(t => 
        (t.clientName || "").toLowerCase().includes(q) || 
        t.id.toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        t.issueType.toLowerCase().includes(q)
      );
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

  // Derive active ticket for modal
  const activeTicket = useMemo(() => tickets.find(t => t.id === selectedTicketId), [tickets, selectedTicketId]);

  // Kalkulasi Statistik
  const totalOpen = tickets.filter(t => t.status === "Open").length;
  const totalInProgress = tickets.filter(t => t.status === "In Progress").length;
  const totalUrgent = tickets.filter(t => t.priority === "Urgent" && t.status !== "Resolved").length;

  // RBAC GUARD
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_operational' && currentUser.role !== 'staff') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Tiket Bantuan ini hanya dapat dikelola oleh Divisi Customer Support atau Operasional.</p>
        <AdminButton onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-sans max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[300] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER ZENDESK-STYLE */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="relative z-10 flex-1">
          <AdminBadge variant="info" className="mb-4 bg-blue-100 text-blue-700 border-blue-200">Helpdesk & Support</AdminBadge>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Headset className="w-8 h-8 text-blue-600" />
            Inbox Tiket Pelanggan
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl font-medium leading-relaxed">
            Pusat manajemen komplain, pelaporan bug, dan pertanyaan pelanggan. Klik pada tiket untuk membaca dan merespons via panel resolusi.
          </p>
        </div>
      </div>

      {/* STATISTIK TIKET */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${glassPanel} rounded-[2rem] p-6 flex flex-col justify-center relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><AlertCircle className="w-20 h-20 text-red-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-widest relative z-10">Tiket Baru Masuk</span>
          <p className="text-4xl font-black text-red-600 mt-2 tracking-tight relative z-10 flex items-center gap-2">
            {totalOpen} <span className="text-sm font-bold text-red-600/50 uppercase tracking-widest mt-2">Menunggu</span>
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`${glassPanel} rounded-[2rem] p-6 flex flex-col justify-center relative overflow-hidden group`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Clock className="w-20 h-20 text-amber-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-widest relative z-10">Sedang Ditangani CS</span>
          <p className="text-4xl font-black text-amber-600 mt-2 tracking-tight relative z-10 flex items-center gap-2">
            {totalInProgress} <span className="text-sm font-bold text-amber-600/50 uppercase tracking-widest mt-2">In Progress</span>
          </p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`${glassPanel} rounded-[2rem] p-6 flex flex-col justify-center relative overflow-hidden group border-red-200/50 bg-gradient-to-br from-white to-red-50/50`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Flame className="w-20 h-20 text-red-600"/></div>
          <span className="text-red-800 text-xs font-bold uppercase tracking-widest relative z-10">Status Darurat (Urgent)</span>
          <p className="text-4xl font-black text-red-600 mt-2 tracking-tight relative z-10 flex items-center gap-2">
            {totalUrgent} <span className="text-sm font-bold text-red-600/50 uppercase tracking-widest mt-2">Prioritas Tinggi</span>
          </p>
        </motion.div>
      </div>

      <div className="flex flex-col gap-6">
        
        {/* TOOLBAR FILTER */}
        <div className={`${glassPanel} rounded-[1.5rem] p-4 flex flex-col lg:flex-row gap-4 justify-between items-center z-20 relative`}>
          <div className="relative w-full lg:w-1/3">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
            <input 
              type="text" 
              placeholder="Cari ID tiket, Kategori, atau Nama..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 shadow-sm font-bold text-slate-700 transition-all hover:bg-white placeholder:text-slate-400 placeholder:font-medium" 
            />
          </div>

          <div className="flex flex-wrap lg:flex-nowrap w-full lg:w-auto gap-3">
            <div className="relative flex-1 lg:flex-none">
              <Filter className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)} 
                className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[180px]"
              >
                <option value="All">Semua Status</option>
                <option value="Open">Baru (Open)</option>
                <option value="In Progress">Sedang Diproses</option>
                <option value="Resolved">Selesai (Resolved)</option>
              </select>
            </div>
            
            <div className="relative flex-1 lg:flex-none">
              <AlertCircle className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <select 
                value={filterPriority} 
                onChange={(e) => setFilterPriority(e.target.value)} 
                className="w-full lg:w-auto bg-white/60 backdrop-blur-md border border-white rounded-xl pl-11 pr-8 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15 shadow-sm appearance-none font-bold text-slate-700 transition-all hover:bg-white cursor-pointer min-w-[180px]"
              >
                <option value="All">Semua Prioritas</option>
                <option value="Urgent">Darurat (Urgent)</option>
                <option value="High">Tinggi (High)</option>
                <option value="Medium">Sedang (Medium)</option>
                <option value="Low">Rendah (Low)</option>
              </select>
            </div>

            <button 
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")} 
              className="w-full sm:w-auto bg-white/60 hover:bg-white backdrop-blur-md border border-white text-slate-700 text-sm font-bold rounded-xl px-5 py-2.5 flex items-center justify-center gap-2 transition-all shadow-sm shrink-0 outline-none focus:ring-[3px] focus:ring-blue-500/15"
            >
              <ArrowUpDown className="w-4 h-4 text-slate-400" /> {sortOrder === "desc" ? "Terbaru" : "Terlama"}
            </button>
          </div>
        </div>

        {/* COMPACT LIST VIEW */}
        <div className="min-h-[500px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full">
              <Activity className="w-12 h-12 mb-4 text-blue-500 animate-pulse" />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Menarik Data Inbox...</p>
            </div>
          ) : processedTickets.length === 0 ? (
            <div className={`${glassPanel} rounded-[2rem] flex flex-col items-center justify-center p-20 text-slate-400 font-medium h-full border border-dashed border-slate-300`}>
              <CheckCircle2 className="w-16 h-16 mb-4 opacity-30 text-emerald-500" />
              <h4 className="text-slate-700 font-black text-xl tracking-tight mb-2">Inbox Bersih!</h4>
              <p className="font-medium text-slate-500">Keren! Tidak ada tiket atau antrean CS yang sesuai dengan filter.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {processedTickets.map((t, idx) => {
                  const isUrgent = t.priority === "Urgent";
                  const isResolved = t.status === "Resolved";
                  const isInProgress = t.status === "In Progress";
                  const isOpen = t.status === "Open";

                  return (
                    <motion.div 
                      key={t.id} 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.05 }}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={cn(
                        "p-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 group cursor-pointer relative overflow-hidden",
                        glassRow,
                        isUrgent && !isResolved && "border-red-200/50 hover:border-red-300/80 hover:shadow-[0_8px_25px_rgba(239,68,68,0.15)]"
                      )}
                    >
                      {/* STATUS INDICATOR (Vertical Bar) */}
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 z-10 transition-colors", isResolved ? "bg-emerald-400" : isInProgress ? "bg-amber-400" : "bg-blue-500", isUrgent && !isResolved && "bg-red-500")} />

                      <div className="flex items-center gap-4 w-full md:w-[40%] pl-2">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm transition-colors", isUrgent && !isResolved ? "bg-red-50 border-red-200 text-red-600 group-hover:bg-red-100" : "bg-slate-100 border-slate-200 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200")}>
                           <span className="text-[10px] font-black uppercase">{(t.clientName || "CS").substring(0,2)}</span>
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="text-sm font-black text-slate-900 tracking-tight truncate flex items-center gap-2">
                            {t.clientName || "Pelanggan"} 
                            {isUrgent && !isResolved && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                              </span>
                            )}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
                            <MessageCircle className="w-3 h-3"/> {t.issueType}
                          </p>
                        </div>
                      </div>

                      <div className="w-full md:w-[35%]">
                        <p className="text-[11px] text-slate-500 truncate group-hover:text-slate-700 transition-colors">
                          &quot;{t.message}&quot;
                        </p>
                      </div>

                      <div className="w-full md:w-[25%] flex items-center justify-between md:justify-end gap-4">
                        <p className="text-[10px] text-slate-400 font-medium font-mono shrink-0">
                          {formatTime(t.createdAt).split(",")[0]}
                        </p>
                        <AdminBadge variant={isResolved ? "success" : isInProgress ? "warning" : "info"} className="shadow-sm py-0.5 px-2 text-[9px] shrink-0">
                          {t.status}
                        </AdminBadge>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* POP-UP ZENDESK STYLE (MODAL DETAIL TIKET) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeTicket && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 md:p-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
              onClick={() => setSelectedTicketId(null)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-3xl bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-white"
            >
              {/* MODAL HEADER */}
              <div className="px-6 py-5 border-b border-slate-200/60 bg-white/50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md border border-blue-700 shrink-0">
                    <span className="text-sm font-black uppercase">{(activeTicket.clientName || "CS").substring(0,2)}</span>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      {activeTicket.clientName || "Pelanggan Tanpa Nama"}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3 h-3"/> {activeTicket.email || "Email tidak dicantumkan"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AdminBadge variant={activeTicket.priority === 'Urgent' ? "danger" : activeTicket.priority === 'High' ? "warning" : "default"} className="uppercase tracking-widest text-[9px] shadow-sm">
                    {activeTicket.priority} Priority
                  </AdminBadge>
                  <button onClick={() => setSelectedTicketId(null)} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MODAL BODY (CHAT AREA) */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 custom-scrollbar space-y-6">
                
                {/* Meta Tiket Info */}
                <div className="flex flex-wrap justify-center gap-3">
                  <span className="bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                    <LifeBuoy className="w-3 h-3"/> {activeTicket.issueType}
                  </span>
                  <span className="bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3"/> {formatTime(activeTicket.createdAt)}
                  </span>
                  <span className="bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm flex items-center gap-1.5 font-mono">
                    ID: {activeTicket.id.substring(0,8)}
                  </span>
                </div>

                {/* Bubble Chat Klien */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300 mt-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase">{(activeTicket.clientName || "CS").substring(0,2)}</span>
                  </div>
                  <div className="bg-white p-5 rounded-[2rem] rounded-tl-none border border-slate-200 shadow-sm relative inline-block max-w-[90%] md:max-w-[80%]">
                    <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {activeTicket.message}
                    </p>
                  </div>
                </div>

              </div>

              {/* MODAL FOOTER (ACTION & STATUS) */}
              <div className="p-6 border-t border-slate-200 bg-white shrink-0">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Penanganan Saat Ini</p>
                    <AdminBadge variant={activeTicket.status === 'Resolved' ? 'success' : activeTicket.status === 'In Progress' ? 'warning' : 'info'} className="text-[11px] px-3 py-1">
                      {activeTicket.status}
                    </AdminBadge>
                  </div>
                  
                  <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-auto">
                      <select 
                        value={activeTicket.status}
                        onChange={(e) => handleUpdateTicket(activeTicket.id, e.target.value as "Open" | "In Progress" | "Resolved")}
                        className={cn("w-full h-11 rounded-xl pl-4 pr-10 text-sm font-bold outline-none transition-all appearance-none cursor-pointer shadow-inner min-w-[200px]", 
                          activeTicket.status === 'Resolved' ? "bg-emerald-50 border-emerald-200 text-emerald-700 focus:ring-emerald-500/20" : 
                          activeTicket.status === 'In Progress' ? "bg-amber-50 border-amber-200 text-amber-700 focus:ring-amber-500/20" : 
                          "bg-blue-50 border-blue-200 text-blue-700 focus:ring-blue-500/20 border-2"
                        )}
                      >
                        <option value="Open">Tandai: Baru (Open)</option>
                        <option value="In Progress">Tandai: Diproses (In Progress)</option>
                        <option value="Resolved">Tandai: Selesai (Resolved)</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {activeTicket.status === 'Resolved' ? <CheckCircle className="w-4 h-4 text-emerald-600"/> : <ArrowUpDown className="w-4 h-4 text-slate-400"/>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}