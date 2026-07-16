"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  LifeBuoy, PlusCircle, MessageSquare, 
  Clock, CheckCircle2, AlertCircle, XCircle, 
  Send, ChevronRight, HelpCircle, ChevronDown, 
  BookOpen, Filter, Search, ShieldCheck
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

  // FAQ State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Form State
  const [formData, setFormData] = useState({
    issueType: "Pertanyaan Umum",
    priority: "Medium" as "Low" | "Medium" | "High" | "Urgent",
    message: ""
  });

  // Proteksi Route
  useEffect(() => {
    if (isHydrated && !user) {
      router.push("/login");
    }
  }, [user, isHydrated, router]);

  // REAL-TIME LISTENER (Mencegah bug render dan tidak perlu manual fetch)
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
        status: "Open", // Default status saat tiket baru dibuat
        createdAt: serverTimestamp()
      });

      showToastMsg("success", "Tiket bantuan berhasil dikirim! Tim kami akan segera merespons.");
      setShowModal(false);
      setFormData({ issueType: "Pertanyaan Umum", priority: "Medium", message: "" });
      // Tidak perlu panggil fetchMyTickets() lagi karena sudah pakai onSnapshot (Real-time)
    } catch (error) {
      console.error("Error submit tiket:", error);
      showToastMsg("error", "Gagal mengirim tiket. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // PARSER WAKTU ANTI CRASH (Menangani ServerTimestamp yang belum sync)
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

  // LOGIKA FILTERING CANGGIH
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
    <main className="min-h-screen bg-slate-50 py-10 px-4 md:px-8 relative overflow-hidden font-sans pb-24">
      {/* Background Ornamen Premium */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-emerald-600 rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto relative z-10 space-y-8">
        
        {/* Toast Notifikasi */}
        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-24 right-10 z-[100] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER HERO */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-blue-50 to-transparent pointer-events-none" />
          
          <div className="max-w-2xl relative z-10">
            <Badge variant="brand" className="uppercase text-[10px] px-3 py-1 shadow-sm mb-4 bg-blue-50 text-blue-700 border-blue-200">
              Pusat Layanan Klien
            </Badge>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-4">
              <LifeBuoy className="w-10 h-10 text-blue-600" /> Bantuan & FAQ
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
              Temukan jawaban cepat untuk kendala logistik Anda melalui pusat bantuan kami, atau ajukan tiket langsung untuk ditangani oleh Tim Customer Success.
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col gap-3 relative z-10 w-full md:w-auto">
            <Button 
              onClick={() => setShowModal(true)}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 h-14 rounded-2xl shadow-lg shadow-blue-600/20 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <PlusCircle className="w-5 h-5" /> Buat Tiket Bantuan
            </Button>
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 py-2 rounded-xl border border-slate-100">
              <ShieldCheck className="w-3.5 h-3.5" /> SLA Respons: &lt; 2 Jam
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* KOLOM KIRI: FREQUENTLY ASKED QUESTIONS */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 px-2">
              <BookOpen className="w-5 h-5 text-slate-400" /> Pertanyaan Populer (FAQ)
            </h2>
            
            <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-2 overflow-hidden">
              {FAQ_DATA.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className="border-b border-slate-100 last:border-0">
                    <button 
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className={cn(
                        "w-full flex items-center justify-between text-left p-4 transition-colors outline-none rounded-xl",
                        isOpen ? "bg-blue-50/50" : "hover:bg-slate-50"
                      )}
                    >
                      <span className={cn("font-bold text-sm pr-4", isOpen ? "text-blue-700" : "text-slate-700")}>{faq.q}</span>
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
                          <div className="p-4 pt-0 text-xs md:text-sm text-slate-600 font-medium leading-relaxed bg-blue-50/50 rounded-b-xl">
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

          {/* KOLOM KANAN: RIWAYAT TIKET REAL-TIME */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-400" /> Riwayat Tiket CS
              </h2>
              
              {/* Filter & Search Mini */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Cari tiket..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm"
                  />
                </div>
                <div className="relative shrink-0">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs font-bold outline-none focus:border-blue-500 appearance-none shadow-sm cursor-pointer"
                  >
                    <option value="All">Semua Status</option>
                    <option value="Open">Open</option>
                    <option value="In Progress">Diproses</option>
                    <option value="Resolved">Selesai</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-400 font-bold animate-pulse text-sm uppercase tracking-widest">Menyinkronkan Data...</p>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[300px] bg-white rounded-[2rem] border border-slate-200 shadow-sm text-center px-6 border-dashed">
                  <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                    <HelpCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">Belum Ada Tiket Bantuan</h3>
                  <p className="text-slate-500 font-medium max-w-sm mb-8 text-sm">
                    {searchQuery || filterStatus !== "All" 
                      ? "Tidak ada tiket yang cocok dengan filter pencarian Anda."
                      : "Anda belum pernah mengajukan tiket bantuan. Jika butuh sesuatu, silakan klik tombol Buat Tiket Bantuan."}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredTickets.map((ticket) => (
                    <motion.div 
                      key={ticket.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm p-5 md:p-6 hover:shadow-md transition-shadow group flex flex-col sm:flex-row gap-5 justify-between sm:items-center relative overflow-hidden"
                    >
                      {/* Status Indikator Dekoratif (Garis Samping) */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${ticket.status === 'Resolved' ? 'bg-emerald-400' : ticket.status === 'In Progress' ? 'bg-amber-400' : 'bg-blue-400'}`} />

                      <div className="space-y-3 w-full pl-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono font-black text-slate-900 text-xs uppercase bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            #{ticket.id.substring(0,8)}
                          </span>
                          <span className="text-[10px] md:text-xs font-bold text-slate-400 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> {formatTime(ticket.createdAt)}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ml-auto sm:ml-0 ${
                            ticket.priority === 'Urgent' ? 'bg-red-50 text-red-600 border-red-200' :
                            ticket.priority === 'High' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                            ticket.priority === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {ticket.priority}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm md:text-base">{ticket.issueType}</h4>
                          <p className="text-slate-500 text-xs md:text-sm font-medium mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{ticket.message}</p>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-5 w-full sm:w-auto">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block sm:hidden">Status Tiket</span>
                        <span className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border inline-flex items-center justify-center gap-2 w-full sm:w-36 text-center shadow-sm ${
                          ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          ticket.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                          {ticket.status === 'Resolved' && <CheckCircle2 className="w-4 h-4" />}
                          {ticket.status === 'In Progress' && <Clock className="w-4 h-4" />}
                          {ticket.status === 'Open' && <AlertCircle className="w-4 h-4" />}
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
      {/* MODAL BUAT TIKET BARU                             */}
      {/* ================================================= */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-xl bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100">
              
              <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-blue-600" /> Buat Tiket Bantuan
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 font-medium">Lengkapi formulir di bawah agar tim CS kami dapat memahami kendala Anda.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-2 rounded-full transition-colors"><XCircle className="w-6 h-6"/></button>
              </div>

              <form onSubmit={handleSubmitTicket} className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kategori Kendala</label>
                    <div className="relative">
                      <select 
                        value={formData.issueType}
                        onChange={(e) => setFormData({...formData, issueType: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl pl-4 pr-10 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 appearance-none transition-all cursor-pointer"
                        required
                      >
                        <option value="Pertanyaan Umum">Pertanyaan Umum</option>
                        <option value="Masalah Pengiriman/Kurir">Masalah Pengiriman/Kurir</option>
                        <option value="Billing & Tagihan">Billing & Tagihan</option>
                        <option value="Kendala Teknis/Aplikasi">Kendala Teknis/Aplikasi</option>
                        <option value="Klaim & Komplain">Klaim & Komplain Khusus</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                      <ChevronRight className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tingkat Prioritas</label>
                    <div className="relative">
                      <select 
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value as "Low" | "Medium" | "High" | "Urgent"})}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl pl-4 pr-10 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 appearance-none transition-all cursor-pointer"
                        required
                      >
                        <option value="Low">Low (Rendah)</option>
                        <option value="Medium">Medium (Sedang)</option>
                        <option value="High">High (Tinggi)</option>
                        <option value="Urgent">Urgent (Darurat)</option>
                      </select>
                      <ChevronRight className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pesan / Deskripsi Detail</label>
                  <textarea 
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Ceritakan detail kendala atau pertanyaan Anda di sini..."
                    required
                    rows={4}
                    className="flex w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:border-blue-500 focus-visible:bg-white focus-visible:ring-blue-50 resize-none shadow-sm"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Mohon sertakan ID Pesanan / Resi jika kendala terkait pengiriman.</p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-3 justify-end">
                  <Button type="button" onClick={() => setShowModal(false)} variant="outline" className="w-full sm:w-32 h-12 border-slate-200 bg-white font-bold text-sm">Batal</Button>
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-blue-600/20 border-none flex items-center justify-center gap-2 active:scale-95 transition-all">
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