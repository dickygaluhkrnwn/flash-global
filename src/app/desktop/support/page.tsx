"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  LifeBuoy, PlusCircle, MessageSquare, 
  Clock, CheckCircle2, AlertCircle, XCircle, 
  Send, HelpCircle, ChevronDown, 
  BookOpen, Filter, Search, ShieldCheck, Check
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, query, where, addDoc, serverTimestamp, orderBy, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { SupportTicket } from "@/types/support";

const FAQ_DATA = [
  {
    q: "Berapa lama estimasi pengiriman kargo saya?",
    a: "Estimasi pengiriman bergantung pada layanan yang Anda pilih. Untuk layanan Sameday memakan waktu 6-12 Jam, Reguler (Darat) 2-5 Hari, dan Global Forwarding bisa 5-14 hari kerja tergantung negara tujuan dan proses Bea Cukai."
  },
  {
    q: "Bagaimana prosedur Klaim Asuransi jika barang saya rusak?",
    a: "Pastikan Anda mencentang opsi 'Gunakan Asuransi' saat membuat pesanan. Jika barang tiba dalam kondisi rusak, buka menu 'Dasbor Portal' > Klik 'Detail Pesanan' Anda > Pilih tombol kuning 'Ajukan Klaim Asuransi'. Siapkan foto bukti kerusakan dan nota barang."
  },
  {
    q: "Mengapa status pesanan saya belum berubah?",
    a: "Sistem tracking kami terintegrasi secara real-time dengan armada lapangan. Jika status belum berubah lebih dari 24 jam, kemungkinan armada sedang berada di area blank-spot (luar jangkauan sinyal satelit/seluler) atau sedang menunggu jadwal kapal roro."
  },
  {
    q: "Bagaimana cara mendapatkan Diskon Korporat (B2B)?",
    a: "Diskon B2B otomatis aktif jika Anda mendaftarkan akun menggunakan opsi 'Akun Perusahaan / Corporate'. Setelah tim Finance kami memverifikasi NIB/NPWP perusahaan Anda, sistem akan otomatis memotong tagihan sesuai persentase kontrak (default 5-15%)."
  },
  {
    q: "Apakah saya bisa merubah alamat tujuan setelah barang dijemput?",
    a: "Sayangnya, Anda tidak dapat mengubah rute/tujuan secara mandiri melalui aplikasi jika status sudah 'Dikirim' karena terkait manifes jalan. Silakan segera hubungi CS kami dengan membuat Tiket berprioritas 'Urgent'."
  }
];

const ISSUE_OPTIONS = [
  "Pertanyaan Umum", "Masalah Pengiriman/Kurir", "Billing & Tagihan", "Kendala Teknis/Aplikasi", "Klaim & Komplain Khusus", "Lainnya"
];

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"] as const;
type PriorityType = typeof PRIORITY_OPTIONS[number];

const FILTER_OPTIONS = ["All", "Open", "In Progress", "Resolved", "Closed"];

export default function DesktopSupportPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  
  // Custom Dropdown States
  const [openFilter, setOpenFilter] = useState(false);
  const [openIssue, setOpenIssue] = useState(false);
  const [openPriority, setOpenPriority] = useState(false);

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Form State
  const [formData, setFormData] = useState({
    issueType: "Pertanyaan Umum",
    priority: "Medium" as PriorityType,
    message: ""
  });

  // Proteksi Route
  useEffect(() => {
    if (isHydrated && !user) {
      router.push("/login");
    }
  }, [user, isHydrated, router]);

  // REAL-TIME LISTENER
  useEffect(() => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    const q = query(
      collection(db, "support_tickets"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket));
      setTickets(ticketsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Gagal menarik tiket dukungan secara real-time:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const showToastMsg = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "support_tickets"), {
        userId: user.uid,
        clientName: user.displayName || "Klien Flash Global",
        email: user.email || "",
        issueType: formData.issueType,
        priority: formData.priority,
        message: formData.message,
        status: "Open",
        createdAt: serverTimestamp()
      });

      showToastMsg("success", "Tiket bantuan berhasil dikirim! Tim kami akan segera merespons.");
      setShowModal(false);
      setFormData({ issueType: "Pertanyaan Umum", priority: "Medium", message: "" });
    } catch (error) {
      console.error("Error submit tiket:", error);
      showToastMsg("error", "Gagal mengirim tiket. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (ts: unknown) => {
    if (!ts) return "Sedang diproses...";
    let dateObj: Date;
    
    const timestamp = ts as { toDate?: () => Date, seconds?: number };
    
    if (typeof timestamp.toDate === 'function') {
      dateObj = timestamp.toDate();
    } else if (typeof timestamp.seconds === 'number') {
      dateObj = new Date(timestamp.seconds * 1000);
    } else {
      dateObj = new Date(ts as string | number);
    }
    
    return dateObj.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.id.toLowerCase().includes(q) || 
        t.issueType.toLowerCase().includes(q) || 
        t.message.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== "All") {
      result = result.filter(t => t.status === filterStatus);
    }

    return result;
  }, [tickets, searchQuery, filterStatus]);

  if (!isHydrated || !user) return null;

  return (
    <main className="min-h-screen bg-[#f8fafc] py-10 px-4 md:px-8 relative overflow-hidden font-sans pb-32 z-0">
      
      {/* === AMBIENT GLOWING BACKGROUND === */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[50vh] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10 space-y-8">
        
        {/* === TOAST NOTIFICATIONS === */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} 
              className={cn(
                "fixed top-10 right-10 z-[200] p-4 rounded-[1.25rem] font-bold text-sm border flex items-center gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.1)] backdrop-blur-md",
                toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 'bg-red-50/90 border-red-200 text-red-800'
              )}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==========================================
            HEADER HERO (GLASS BENTO)
            ========================================== */}
        <div className="glass-card rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8 border border-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-white/40 to-transparent pointer-events-none" />
          
          <div className="max-w-2xl relative z-10">
            <Badge variant="brand" className="uppercase text-[10px] px-3.5 py-1.5 shadow-sm mb-4 bg-blue-50/80 backdrop-blur-md text-blue-700 border-blue-200">
              Pusat Layanan Klien
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-[1.25rem] flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_rgba(37,99,235,0.2)] border border-blue-600 shrink-0">
                <LifeBuoy className="w-7 h-7 text-white drop-shadow-sm" />
              </div>
              Bantuan & FAQ
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
              Temukan jawaban cepat untuk kendala logistik Anda melalui pusat bantuan kami, atau ajukan tiket langsung untuk ditangani oleh Tim Customer Success.
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col gap-3 relative z-10 w-full md:w-auto">
            <Button 
              onClick={() => setShowModal(true)}
              className="w-full md:w-auto bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border border-blue-800 text-white px-8 h-14 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_10px_20px_rgba(37,99,235,0.3)] font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <PlusCircle className="w-5 h-5" /> Buat Tiket Bantuan
            </Button>
            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/60 backdrop-blur-md py-2.5 rounded-xl border border-white shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> SLA Respons: &lt; 2 Jam
            </div>
          </div>
        </div>

        {/* ==========================================
            MAIN GRID CONTENT
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* --------------------------------------
              KOLOM KIRI: FREQUENTLY ASKED QUESTIONS
              -------------------------------------- */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 px-2 tracking-tight">
              <BookOpen className="w-5 h-5 text-blue-600" /> Pertanyaan Populer (FAQ)
            </h2>
            
            <div className="glass-card rounded-[2rem] border border-white shadow-sm p-3 overflow-hidden">
              {FAQ_DATA.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="border-b border-slate-200/50 last:border-0">
                    <button 
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className={cn(
                        "w-full flex items-center justify-between text-left p-4 md:p-5 transition-all outline-none rounded-xl cursor-pointer group",
                        isOpen ? "bg-white border border-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]" : "hover:bg-white/40"
                      )}
                    >
                      <span className={cn("font-black text-sm pr-4 tracking-tight", isOpen ? "text-blue-700" : "text-slate-700 group-hover:text-blue-600")}>{faq.q}</span>
                      <ChevronDown className={cn("w-5 h-5 shrink-0 transition-transform duration-300", isOpen ? "text-blue-600 rotate-180" : "text-slate-400")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 text-xs md:text-sm text-slate-500 font-medium leading-relaxed">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --------------------------------------
              KOLOM KANAN: RIWAYAT TIKET REAL-TIME
              -------------------------------------- */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
                <MessageSquare className="w-5 h-5 text-emerald-600" /> Riwayat Tiket CS
              </h2>
              
              {/* Search & Custom Filter Dropdown */}
              <div className="flex items-center gap-3 w-full sm:w-auto z-20 relative">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari ID tiket atau pesan..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/60 backdrop-blur-md border border-white rounded-[1.25rem] pl-10 pr-4 py-3 text-xs font-bold outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/20 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                  />
                </div>
                
                {/* Custom Filter Dropdown */}
                {openFilter && <div className="fixed inset-0 z-30" onClick={() => setOpenFilter(false)} />}
                <div className="relative z-40 shrink-0">
                  <button 
                    type="button"
                    onClick={() => setOpenFilter(!openFilter)}
                    className={cn(
                      "flex items-center justify-between gap-2 pl-10 pr-4 py-3 rounded-[1.25rem] border transition-all text-xs font-black outline-none shadow-sm",
                      openFilter ? "bg-white border-blue-500 text-blue-700 ring-[3px] ring-blue-500/20" : "bg-white/60 backdrop-blur-md border-white text-slate-600 hover:bg-white"
                    )}
                  >
                    <Filter className="w-4 h-4 absolute left-4 text-slate-400" />
                    <span>{filterStatus === "All" ? "Semua" : filterStatus}</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", openFilter && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {openFilter && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-[calc(100%+8px)] right-0 w-48 bg-white/90 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.1)] overflow-hidden py-2"
                      >
                        {FILTER_OPTIONS.map(opt => (
                          <div 
                            key={opt} 
                            onClick={() => { setFilterStatus(opt); setOpenFilter(false); }}
                            className={cn(
                              "px-4 py-3 text-xs font-black cursor-pointer transition-colors flex items-center justify-between group",
                              filterStatus === opt ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            {opt === "All" ? "Semua Status" : opt}
                            {filterStatus === opt && <Check className="w-4 h-4 text-blue-600" />}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* List Tiket */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[350px] glass-card rounded-[2.5rem] border border-white shadow-sm">
                  <div className="w-12 h-12 border-4 border-white border-t-blue-600 rounded-full animate-spin mb-4 shadow-sm"></div>
                  <p className="text-slate-400 font-black animate-pulse text-[10px] uppercase tracking-widest">Menyinkronkan Data...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[350px] glass-card rounded-[2.5rem] border border-dashed border-white shadow-sm text-center px-6">
                  <div className="w-20 h-20 bg-white/50 text-slate-300 rounded-[1.5rem] flex items-center justify-center mb-6 border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,1)]">
                    <HelpCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Belum Ada Tiket Bantuan</h3>
                  <p className="text-slate-500 font-medium max-w-sm mb-8 text-sm leading-relaxed">
                    {searchQuery || filterStatus !== "All" 
                      ? "Tidak ada tiket yang cocok dengan filter pencarian Anda."
                      : "Anda belum pernah mengajukan tiket bantuan. Jika butuh sesuatu, silakan klik tombol Buat Tiket Bantuan di atas."}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredTickets.map((ticket, index) => (
                    <motion.div 
                      key={ticket.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="glass-card rounded-[2rem] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_4px_10px_rgba(0,0,0,0.02)] p-5 md:p-6 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group flex flex-col sm:flex-row gap-5 justify-between sm:items-center relative overflow-hidden hover:-translate-y-1"
                    >
                      {/* Status Glow Indikator Samping */}
                      <div className={cn(
                        "absolute top-0 left-0 bottom-0 w-2 blur-[2px] opacity-70",
                        ticket.status === 'Resolved' ? 'bg-emerald-500' : ticket.status === 'In Progress' ? 'bg-amber-500' : ticket.status === 'Closed' ? 'bg-slate-500' : 'bg-blue-500'
                      )} />

                      <div className="space-y-3 w-full pl-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono font-black text-slate-900 text-xs uppercase bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                            #{ticket.id.substring(0,8)}
                          </span>
                          <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> {formatTime(ticket.createdAt)}
                          </span>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ml-auto sm:ml-0 shadow-sm backdrop-blur-sm",
                            ticket.priority === 'Urgent' ? 'bg-red-50/80 text-red-600 border-red-200' :
                            ticket.priority === 'High' ? 'bg-orange-50/80 text-orange-600 border-orange-200' :
                            ticket.priority === 'Medium' ? 'bg-blue-50/80 text-blue-600 border-blue-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          )}>
                            {ticket.priority}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="font-black text-slate-900 text-sm md:text-base tracking-tight">{ticket.issueType}</h4>
                          <p className="text-slate-500 text-xs md:text-sm font-medium mt-2 leading-relaxed bg-white/60 p-4 rounded-[1rem] border border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">{ticket.message}</p>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-white pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block sm:hidden">Status Tiket</span>
                        {/* BUG FIX DI SINI: Menghapus pengecekan === 'All' pada ticket.status */}
                        <span className={cn(
                          "px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border flex items-center justify-center gap-2 w-full sm:w-36 text-center shadow-sm backdrop-blur-md",
                          ticket.status === 'Resolved' ? 'bg-emerald-50/80 text-emerald-600 border-emerald-200' :
                          ticket.status === 'In Progress' ? 'bg-amber-50/80 text-amber-600 border-amber-200' :
                          ticket.status === 'Closed' ? 'bg-slate-100/80 text-slate-600 border-slate-300' :
                          'bg-blue-50/80 text-blue-600 border-blue-200' // Default for Open
                        )}>
                          {ticket.status === 'Resolved' && <CheckCircle2 className="w-4 h-4" />}
                          {ticket.status === 'In Progress' && <Clock className="w-4 h-4" />}
                          {(ticket.status === 'Open' || ticket.status === 'Closed') && <AlertCircle className="w-4 h-4" />}
                          {ticket.status}
                        </span>
                      </div>

                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ================================================= */}
      {/* MODAL BUAT TIKET BARU (PREMIUM GLASS)             */}
      {/* ================================================= */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowModal(false)} />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-10 shadow-[0_24px_60px_rgba(0,0,0,0.1)] border border-white overflow-visible"
            >
              {/* Modal Ambient Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none z-0" />

              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_rgba(37,99,235,0.2)] border border-blue-600 shrink-0">
                    <MessageSquare className="w-7 h-7 text-white drop-shadow-sm" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Buat Tiket Bantuan</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Lengkapi form di bawah agar CS dapat memahami kendala Anda.</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-full transition-all border border-transparent hover:border-red-100 active:scale-95"><XCircle className="w-6 h-6"/></button>
              </div>

              <form onSubmit={handleSubmitTicket} className="space-y-6 relative z-10">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Custom Dropdown: Kategori Kendala */}
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Kategori Kendala</label>
                    {openIssue && <div className="fixed inset-0 z-30" onClick={() => setOpenIssue(false)} />}
                    <div className="relative z-40">
                      <button 
                        type="button" 
                        onClick={() => { setOpenIssue(!openIssue); setOpenPriority(false); }}
                        className={cn(
                          "w-full flex items-center justify-between pl-5 pr-5 h-14 rounded-[1.25rem] border transition-all text-sm font-bold outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]",
                          openIssue ? "border-blue-500 bg-white ring-[3px] ring-blue-500/20 text-slate-900" : "border-slate-200 bg-white/60 backdrop-blur-md text-slate-900 hover:border-slate-300"
                        )}
                      >
                        <span className="truncate">{formData.issueType}</span>
                        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openIssue && "rotate-180")} />
                      </button>
                      <AnimatePresence>
                        {openIssue && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                            className="absolute top-[calc(100%+8px)] left-0 w-full bg-white/90 backdrop-blur-xl border border-slate-100 rounded-[1.5rem] shadow-[0_15px_30px_rgba(0,0,0,0.1)] overflow-hidden py-2"
                          >
                            {ISSUE_OPTIONS.map(opt => (
                              <div key={opt} onClick={() => { setFormData({...formData, issueType: opt}); setOpenIssue(false); }}
                                className={cn("px-5 py-3.5 text-sm font-bold cursor-pointer transition-colors flex items-center justify-between", formData.issueType === opt ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}
                              >
                                {opt} {formData.issueType === opt && <Check className="w-4 h-4 text-blue-600" />}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* BUG FIX DI SINI: Custom Dropdown Tingkat Prioritas dikunci dengan PriorityType */}
                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tingkat Prioritas</label>
                    {openPriority && <div className="fixed inset-0 z-30" onClick={() => setOpenPriority(false)} />}
                    <div className="relative z-40">
                      <button 
                        type="button" 
                        onClick={() => { setOpenPriority(!openPriority); setOpenIssue(false); }}
                        className={cn(
                          "w-full flex items-center justify-between pl-5 pr-5 h-14 rounded-[1.25rem] border transition-all text-sm font-bold outline-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]",
                          openPriority ? "border-blue-500 bg-white ring-[3px] ring-blue-500/20 text-slate-900" : "border-slate-200 bg-white/60 backdrop-blur-md text-slate-900 hover:border-slate-300"
                        )}
                      >
                        <span className="truncate">{formData.priority}</span>
                        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openPriority && "rotate-180")} />
                      </button>
                      <AnimatePresence>
                        {openPriority && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                            className="absolute top-[calc(100%+8px)] left-0 w-full bg-white/90 backdrop-blur-xl border border-slate-100 rounded-[1.5rem] shadow-[0_15px_30px_rgba(0,0,0,0.1)] overflow-hidden py-2"
                          >
                            {PRIORITY_OPTIONS.map(opt => (
                              <div key={opt} onClick={() => { setFormData({...formData, priority: opt as PriorityType}); setOpenPriority(false); }}
                                className={cn("px-5 py-3.5 text-sm font-bold cursor-pointer transition-colors flex items-center justify-between", formData.priority === opt ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}
                              >
                                {opt} {formData.priority === opt && <Check className="w-4 h-4 text-blue-600" />}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pesan / Deskripsi Detail</label>
                  <textarea 
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Ceritakan detail kendala atau pertanyaan Anda di sini..."
                    required
                    rows={4}
                    className="flex w-full rounded-[1.5rem] border border-slate-200 bg-white/60 backdrop-blur-md px-5 py-4 text-sm font-bold text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-blue-500/20 resize-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                  />
                  <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase pl-1 pt-1">💡 Sertakan ID Pesanan / Resi jika terkait pengiriman.</p>
                </div>

                <div className="pt-6 border-t border-slate-200/60 flex flex-col-reverse sm:flex-row gap-4 justify-end mt-8">
                  <Button type="button" onClick={() => setShowModal(false)} variant="glass" className="w-full sm:w-32 h-14 border-slate-200 text-slate-600 font-black text-sm active:scale-95 shadow-sm">Batal</Button>
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-black px-10 h-14 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_20px_rgba(37,99,235,0.3)] border border-blue-800 flex items-center justify-center gap-2 active:scale-95 transition-all">
                    {isSubmitting ? "Mengirim..." : <><Send className="w-4 h-4"/> Kirim Tiket</>}
                  </Button>
                </div>
              </form>
              
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
} 