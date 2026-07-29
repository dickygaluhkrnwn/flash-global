"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  LifeBuoy, PlusCircle, MessageSquare, 
  Clock, CheckCircle2, AlertCircle, XCircle, 
  Send, HelpCircle, ChevronDown, 
  BookOpen, Filter, Search, Check
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
    a: "Estimasi bergantung pada layanan. Sameday 6-12 Jam, Reguler (Darat) 2-5 Hari, dan Global Forwarding 5-14 hari kerja."
  },
  {
    q: "Bagaimana prosedur Klaim Asuransi?",
    a: "Jika barang tiba dalam kondisi rusak, buka menu 'Dasbor Portal' > 'Detail Pesanan' > Klik 'Ajukan Klaim Asuransi'. Siapkan foto bukti."
  },
  {
    q: "Mengapa status pesanan saya belum berubah?",
    a: "Jika status belum berubah lebih dari 24 jam, kemungkinan armada berada di area blank-spot atau menunggu jadwal roro."
  },
  {
    q: "Bagaimana cara mendapat Diskon B2B?",
    a: "Daftar sebagai 'Akun Perusahaan'. Setelah tim Finance memverifikasi NIB/NPWP, tagihan akan otomatis dipotong sesuai persentase kontrak."
  },
  {
    q: "Bisa merubah alamat setelah dijemput?",
    a: "Anda tidak dapat mengubah rute mandiri jika status sudah 'Dikirim'. Segera hubungi CS dengan membuat Tiket berprioritas 'Urgent'."
  }
];

const ISSUE_OPTIONS = ["Pertanyaan Umum", "Masalah Pengiriman/Kurir", "Billing & Tagihan", "Kendala Teknis/Aplikasi", "Klaim & Komplain Khusus", "Lainnya"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"] as const;
type PriorityType = typeof PRIORITY_OPTIONS[number];
const FILTER_OPTIONS = ["All", "Open", "In Progress", "Resolved", "Closed"];

export default function MobileSupportPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"faq" | "tiket">("faq");

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
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  // REAL-TIME LISTENER
  useEffect(() => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    const q = query(collection(db, "support_tickets"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));

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

      showToastMsg("success", "Tiket berhasil dikirim!");
      setShowModal(false);
      setFormData({ issueType: "Pertanyaan Umum", priority: "Medium", message: "" });
      setActiveTab("tiket"); // Otomatis pindah ke tab tiket
    } catch (error) {
      console.error("Error submit tiket:", error);
      showToastMsg("error", "Gagal mengirim tiket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (ts: unknown) => {
    if (!ts) return "Memproses...";
    let dateObj: Date;
    const timestamp = ts as { toDate?: () => Date, seconds?: number };
    if (typeof timestamp.toDate === 'function') dateObj = timestamp.toDate();
    else if (typeof timestamp.seconds === 'number') dateObj = new Date(timestamp.seconds * 1000);
    else dateObj = new Date(ts as string | number);
    
    return dateObj.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.id.toLowerCase().includes(q) || t.issueType.toLowerCase().includes(q) || t.message.toLowerCase().includes(q));
    }
    if (filterStatus !== "All") result = result.filter(t => t.status === filterStatus);
    return result;
  }, [tickets, searchQuery, filterStatus]);

  if (!isHydrated || !user) return null;

  return (
    <div className="flex flex-col space-y-6 px-4 pb-32 pt-4 w-full relative">
      
      {/* === TOAST NOTIFICATIONS === */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} 
            className={cn("fixed top-20 left-4 right-4 z-[200] p-3 rounded-2xl font-bold text-xs border flex items-center gap-3 shadow-lg backdrop-blur-md", toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 'bg-red-50/90 border-red-200 text-red-800')}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="leading-relaxed">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER MOBILE */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center flex flex-col items-center pt-2">
        <Badge variant="brand" className="mb-3 px-3 py-1 shadow-sm bg-blue-50/80 text-blue-700 border-blue-200 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <LifeBuoy className="w-3.5 h-3.5" /> Bantuan Pelanggan
        </Badge>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-2">
          Pusat <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">Bantuan.</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium px-4 leading-relaxed">
          Temukan jawaban atau ajukan tiket langsung ke tim CS kami.
        </p>
      </motion.div>

      {/* BUTTON BUAT TIKET */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="relative z-10 w-full">
        <Button onClick={() => setShowModal(true)} className="w-full bg-gradient-to-b from-blue-600 to-blue-700 text-white h-14 rounded-2xl shadow-lg border border-blue-800 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform tap-highlight-transparent">
          <PlusCircle className="w-5 h-5" /> Buat Tiket CS
        </Button>
      </motion.div>

      {/* TABS SWITCHER */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="w-full relative z-20 sticky top-[70px]">
        <div className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-200 tap-highlight-transparent">
          <button onClick={() => setActiveTab("faq")} className={cn("flex-1 py-2.5 text-xs font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-1.5", activeTab === "faq" ? "text-blue-700 bg-white shadow-sm border border-blue-100" : "text-slate-500")}>
            <BookOpen className="w-4 h-4"/> FAQ
          </button>
          <button onClick={() => setActiveTab("tiket")} className={cn("flex-1 py-2.5 text-xs font-black transition-all rounded-xl relative z-10 flex items-center justify-center gap-1.5", activeTab === "tiket" ? "text-slate-900 bg-white shadow-sm border border-slate-200" : "text-slate-500")}>
            <MessageSquare className="w-4 h-4"/> Riwayat Tiket
          </button>
        </div>
      </motion.div>

      {/* AREA KONTEN (FAQ / TIKET) */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          
          {/* TAB FAQ */}
          {activeTab === "faq" && (
            <motion.div key="faq" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
              {FAQ_DATA.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <button onClick={() => setOpenFaqIndex(isOpen ? null : idx)} className="w-full flex items-center justify-between text-left p-4 tap-highlight-transparent">
                      <span className={cn("font-black text-xs pr-4 tracking-tight", isOpen ? "text-blue-700" : "text-slate-800")}>{faq.q}</span>
                      <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform duration-300", isOpen ? "text-blue-600 rotate-180" : "text-slate-400")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden bg-slate-50/50 border-t border-slate-100">
                          <div className="p-4 text-[11px] text-slate-500 font-medium leading-relaxed">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* TAB RIWAYAT TIKET */}
          {activeTab === "tiket" && (
            <motion.div key="tiket" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
              
              {/* Filter Area Mobile */}
              <div className="flex gap-2 relative z-30">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari pesan..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 h-12 text-xs font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                  />
                </div>
                
                {/* Custom Filter Dropdown */}
                <div className="relative shrink-0">
                  {openFilter && <div className="fixed inset-0 z-30" onClick={() => setOpenFilter(false)} />}
                  <button 
                    type="button"
                    onClick={() => setOpenFilter(!openFilter)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 px-4 h-12 rounded-xl border transition-all text-xs font-black shadow-sm tap-highlight-transparent",
                      openFilter ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-slate-200 text-slate-600"
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:block">{filterStatus === "All" ? "Semua" : filterStatus}</span>
                  </button>

                  <AnimatePresence>
                    {openFilter && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }}
                        className="absolute top-[calc(100%+8px)] right-0 w-44 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-2 z-50"
                      >
                        {FILTER_OPTIONS.map(opt => (
                          <div 
                            key={opt} onClick={() => { setFilterStatus(opt); setOpenFilter(false); }}
                            className={cn("px-4 py-3 text-[11px] font-black cursor-pointer transition-colors flex items-center justify-between", filterStatus === opt ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-50")}
                          >
                            {opt === "All" ? "Semua Status" : opt}
                            {filterStatus === opt && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Ticket List */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-[2rem] border border-white">
                  <div className="w-8 h-8 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                  <p className="text-slate-400 font-black animate-pulse text-[9px] uppercase tracking-widest">Sinkronisasi Data...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 glass-card rounded-[2rem] border border-white text-center shadow-sm">
                  <div className="w-16 h-16 bg-white text-slate-300 rounded-[1.25rem] flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                    <HelpCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">Belum Ada Tiket</h3>
                  <p className="text-slate-500 font-medium text-xs leading-relaxed">
                    {searchQuery || filterStatus !== "All" ? "Tidak ada tiket yang cocok dengan filter pencarian." : "Jika butuh sesuatu, klik tombol Buat Tiket Bantuan."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {filteredTickets.map((ticket, index) => (
                      <motion.div 
                        key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative overflow-hidden"
                      >
                        {/* Indikator Status Kiri */}
                        <div className={cn(
                          "absolute top-0 left-0 bottom-0 w-1.5",
                          ticket.status === 'Resolved' ? 'bg-emerald-500' : ticket.status === 'In Progress' ? 'bg-amber-500' : ticket.status === 'Closed' ? 'bg-slate-400' : 'bg-blue-500'
                        )} />

                        <div className="pl-3">
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-mono font-black text-slate-900 text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100">
                              #{ticket.id.substring(0,8)}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shadow-sm",
                              ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                              ticket.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                              ticket.status === 'Closed' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                              'bg-blue-50 text-blue-600 border-blue-200'
                            )}>
                              {ticket.status}
                            </span>
                          </div>

                          <h4 className="font-black text-slate-900 text-sm tracking-tight leading-tight mb-1.5">{ticket.issueType}</h4>
                          <p className="text-slate-500 text-[11px] font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">{ticket.message}</p>
                          
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> {formatTime(ticket.createdAt)}
                            </span>
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest",
                              ticket.priority === 'Urgent' ? 'text-red-500' : ticket.priority === 'High' ? 'text-orange-500' : ticket.priority === 'Medium' ? 'text-blue-500' : 'text-slate-400'
                            )}>
                              {ticket.priority} Priority
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================================================= */}
      {/* MODAL BUAT TIKET BARU (PUSH VIEW DI MOBILE) */}
      {/* ================================================= */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] bg-slate-50 flex flex-col font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm relative z-20">
              <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-slate-100 transition-colors tap-highlight-transparent text-slate-600">
                <XCircle className="w-6 h-6"/>
              </button>
              <h3 className="text-sm font-black text-slate-900">Buat Tiket Baru</h3>
              <div className="w-10 h-10"></div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 relative z-10">
              <form id="ticket-form" onSubmit={handleSubmitTicket} className="space-y-5 bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                
                {/* Kategori Kendala */}
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Kategori Kendala</label>
                  {openIssue && <div className="fixed inset-0 z-30" onClick={() => setOpenIssue(false)} />}
                  <div className="relative z-40">
                    <button type="button" onClick={() => { setOpenIssue(!openIssue); setOpenPriority(false); }} className={cn("w-full flex items-center justify-between px-4 h-14 rounded-2xl border transition-all text-sm font-bold outline-none tap-highlight-transparent", openIssue ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 bg-slate-50 hover:bg-slate-100")}>
                      <span className="truncate">{formData.issueType}</span>
                      <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openIssue && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {openIssue && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-2 z-50">
                          {ISSUE_OPTIONS.map(opt => (
                            <div key={opt} onClick={() => { setFormData({...formData, issueType: opt}); setOpenIssue(false); }} className={cn("px-4 py-3 text-xs font-bold cursor-pointer transition-colors flex items-center justify-between", formData.issueType === opt ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-50")}>
                              {opt} {formData.issueType === opt && <Check className="w-4 h-4 text-blue-600" />}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Tingkat Prioritas */}
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Prioritas</label>
                  {openPriority && <div className="fixed inset-0 z-30" onClick={() => setOpenPriority(false)} />}
                  <div className="relative z-30">
                    <button type="button" onClick={() => { setOpenPriority(!openPriority); setOpenIssue(false); }} className={cn("w-full flex items-center justify-between px-4 h-14 rounded-2xl border transition-all text-sm font-bold outline-none tap-highlight-transparent", openPriority ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 bg-slate-50 hover:bg-slate-100")}>
                      <span className="truncate">{formData.priority}</span>
                      <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", openPriority && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {openPriority && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden py-2 z-50">
                          {PRIORITY_OPTIONS.map(opt => (
                            <div key={opt} onClick={() => { setFormData({...formData, priority: opt as PriorityType}); setOpenPriority(false); }} className={cn("px-4 py-3 text-xs font-bold cursor-pointer transition-colors flex items-center justify-between", formData.priority === opt ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:bg-slate-50")}>
                              {opt} {formData.priority === opt && <Check className="w-4 h-4 text-blue-600" />}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Deskripsi */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pesan Lengkap</label>
                  <textarea 
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Ceritakan detail kendala di sini..."
                    required
                    rows={5}
                    className="flex w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition-all focus:outline-none focus:ring-2 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20 resize-none"
                  />
                  <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase pl-1 pt-1">💡 Sertakan AWB jika terkait paket.</p>
                </div>
              </form>
            </div>

            {/* Modal Footer (Sticky Bottom) */}
            <div className="p-4 bg-white border-t border-slate-200 pb-safe relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
              <Button type="submit" form="ticket-form" disabled={isSubmitting} className="w-full h-14 rounded-2xl bg-blue-600 active:bg-blue-700 text-white font-black text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2 tap-highlight-transparent">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Send className="w-4 h-4"/> Kirim Tiket</>}
              </Button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}