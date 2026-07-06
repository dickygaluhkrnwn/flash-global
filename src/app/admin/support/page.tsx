"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LifeBuoy, ShieldAlert, Search, 
  CheckCircle2, AlertCircle, MessageSquare, 
  FileWarning, History, Eye, XCircle
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy, Timestamp } from "firebase/firestore";

interface SupportTicket {
  id: string;
  clientName: string;
  email: string;
  issueType: string;
  message: string;
  status: "Open" | "In Progress" | "Resolved";
  priority: "Low" | "Medium" | "High" | "Urgent";
  createdAt?: Timestamp;
}

interface InsuranceClaim {
  id: string;
  orderId: string;
  clientName: string;
  claimedAmount: number;
  reason: string;
  proofUrl: string;
  status: "Pending Review" | "Approved" | "Rejected";
  createdAt?: Timestamp;
}

interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetModule: string;
  timestamp?: Timestamp;
}

export default function AdminSupportPage() {
  const [activeTab, setActiveTab] = useState<"tickets" | "claims" | "audit">("tickets");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Data States
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Modal States
  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSupportData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Tickets
      const ticketQ = query(collection(db, "support_tickets"), orderBy("createdAt", "desc"));
      const ticketSnap = await getDocs(ticketQ);
      setTickets(ticketSnap.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket)));

      // 2. Fetch Claims
      const claimQ = query(collection(db, "insurance_claims"), orderBy("createdAt", "desc"));
      const claimSnap = await getDocs(claimQ);
      setClaims(claimSnap.docs.map(d => ({ id: d.id, ...d.data() } as InsuranceClaim)));

      // 3. Fetch Audit Logs
      const logQ = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"));
      const logSnap = await getDocs(logQ);
      setLogs(logSnap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog)));

    } catch (error) {
      console.error("Gagal menarik data dukungan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSupportData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  // HANDLER: Update Ticket Status
  const handleUpdateTicket = async (id: string, newStatus: "Open" | "In Progress" | "Resolved") => {
    try {
      await updateDoc(doc(db, "support_tickets", id), { status: newStatus });
      showToast("success", `Tiket ${id} diperbarui menjadi ${newStatus}`);
      fetchSupportData();
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memperbarui tiket.");
    }
  };

  // HANDLER: Proses Klaim Asuransi
  const handleProcessClaim = async (id: string, newStatus: "Approved" | "Rejected") => {
    if (!confirm(`Yakin ingin merubah status klaim menjadi ${newStatus}?`)) return;
    setIsProcessing(true);
    try {
      await updateDoc(doc(db, "insurance_claims", id), { status: newStatus });
      showToast("success", `Klaim asuransi ${id} berhasil diproses.`);
      fetchSupportData();
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memproses klaim.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredTickets = tickets.filter(t => t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.includes(searchQuery));
  const filteredClaims = claims.filter(c => c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || c.orderId.includes(searchQuery));

  return (
    <div className="space-y-8 pb-10">
      
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-xl ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-red-950 border-red-500 text-red-400'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Modul */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <LifeBuoy className="w-6 h-6 text-blue-500" /> Pusat Bantuan & Audit Sistem
          </h1>
          <p className="text-slate-400 text-sm mt-1">Kelola tiket komplain klien, klaim asuransi barang, dan pantau log keamanan.</p>
        </div>
        
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Cari ID tiket, nama, atau manifest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-white outline-none text-xs font-semibold focus:border-blue-500"
          />
        </div>
      </div>

      {/* TABULASI MENU */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
        <TabButton id="tickets" icon={MessageSquare} label="Tiket Bantuan (CS)" isActive={activeTab === "tickets"} onClick={() => { setActiveTab("tickets"); setSearchQuery(""); }} />
        <TabButton id="claims" icon={FileWarning} label="Klaim Asuransi Barang" isActive={activeTab === "claims"} onClick={() => { setActiveTab("claims"); setSearchQuery(""); }} />
        <TabButton id="audit" icon={History} label="Audit Trail (Log Keamanan)" isActive={activeTab === "audit"} onClick={() => { setActiveTab("audit"); setSearchQuery(""); }} />
      </div>

      {/* AREA WORKSPACE */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-[500px]">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-bold animate-pulse text-sm">Mensinkronkan Data Infrastruktur Bantuan...</div>
        ) : (
          <div className="p-6">
            
            {/* ========================================= */}
            {/* TAB 1: TIKET BANTUAN CS                   */}
            {/* ========================================= */}
            {activeTab === "tickets" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      <th className="p-4 pl-6">ID & Pengirim</th>
                      <th className="p-4">Kategori Kendala</th>
                      <th className="p-4">Prioritas</th>
                      <th className="p-4 pr-6 text-right">Status & Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredTickets.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada tiket pengaduan aktif.</td></tr>
                    ) : filteredTickets.map(t => (
                      <tr key={t.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-mono font-bold text-white text-sm mb-1 uppercase">#{t.id.substring(0,8)}</p>
                          <p className="text-[11px] text-slate-400 font-bold">{t.clientName}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-slate-300 font-bold">{t.issueType}</p>
                          <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] truncate" title={t.message}>{t.message}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            t.priority === 'Urgent' || t.priority === 'High' ? 'bg-red-950/40 text-red-400 border border-red-900' :
                            'bg-amber-950/40 text-amber-400 border border-amber-900'
                          }`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-4 pr-6 flex flex-col items-end gap-2">
                          <select 
                            value={t.status}
                            onChange={(e) => handleUpdateTicket(t.id, e.target.value as "Open" | "In Progress" | "Resolved")}
                            className="bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded px-2 py-1.5 outline-none focus:border-blue-500 w-32"
                          >
                            <option value="Open">Open (Baru)</option>
                            <option value="In Progress">Sedang Ditangani</option>
                            <option value="Resolved">Selesai (Resolved)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ========================================= */}
            {/* TAB 2: KLAIM ASURANSI KERUSAKAN           */}
            {/* ========================================= */}
            {activeTab === "claims" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      <th className="p-4 pl-6">ID Manifest & Klien</th>
                      <th className="p-4">Nilai Tuntutan</th>
                      <th className="p-4">Bukti Lampiran</th>
                      <th className="p-4 pr-6 text-right">Keputusan Klaim</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredClaims.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada pengajuan klaim asuransi.</td></tr>
                    ) : filteredClaims.map(c => (
                      <tr key={c.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-mono font-bold text-white text-sm mb-1 uppercase">ORDER: #{c.orderId.substring(0,8)}</p>
                          <p className="text-[11px] text-slate-400 font-bold">{c.clientName}</p>
                          <p className="text-[9px] text-red-400 mt-1 max-w-[200px] truncate">Alasan: {c.reason}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-base font-black text-amber-400">{formatRupiah(c.claimedAmount)}</p>
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => setShowImageModal(c.proofUrl)}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> Lihat Bukti Fisik
                          </button>
                        </td>
                        <td className="p-4 pr-6 flex justify-end gap-2">
                          {c.status === "Pending Review" ? (
                            <>
                              <button 
                                disabled={isProcessing}
                                onClick={() => handleProcessClaim(c.id, "Approved")}
                                className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50"
                              >
                                Setujui Cair
                              </button>
                              <button 
                                disabled={isProcessing}
                                onClick={() => handleProcessClaim(c.id, "Rejected")}
                                className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50"
                              >
                                Tolak Klaim
                              </button>
                            </>
                          ) : (
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              c.status === 'Approved' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900' : 'bg-red-950/50 text-red-400 border border-red-900'
                            }`}>
                              {c.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ========================================= */}
            {/* TAB 3: AUDIT TRAIL (LOG KEAMANAN)         */}
            {/* ========================================= */}
            {activeTab === "audit" && (
              <div className="space-y-4">
                <div className="bg-blue-950/20 border border-blue-900/40 text-blue-300 text-xs font-medium rounded-xl p-4 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-blue-400 shrink-0" />
                  <p>Catatan ini di-generate otomatis oleh Firebase Cloud Functions. Jejak log tidak dapat dihapus atau diedit oleh siapapun termasuk Superadmin demi menjaga kepatuhan dan integritas data (Data Compliance).</p>
                </div>
                
                <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[400px]">
                  <table className="w-full text-left border-collapse text-xs relative">
                    <thead className="sticky top-0 bg-slate-950 shadow-md z-10">
                      <tr className="text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                        <th className="p-3 pl-5">Timestamp (UTC+7)</th>
                        <th className="p-3">Pelaku (Admin/System)</th>
                        <th className="p-3">Aktivitas Modul</th>
                        <th className="p-3">Deskripsi Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {logs.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">Log sistem kosong.</td></tr>
                      ) : logs.map((log, i) => {
                        const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
                        return (
                          <tr key={i} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-3 pl-5 text-slate-500 font-mono">
                              {dateObj.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="p-3 font-bold text-slate-300">{log.adminEmail}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded uppercase font-bold text-[9px]">
                                {log.targetModule}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300">{log.action}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* MODAL: BUKTI KLAIM PREVIEW */}
      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowImageModal(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 w-full max-w-2xl max-h-full flex flex-col">
              <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 rounded-t-2xl">
                <h3 className="font-bold text-white flex items-center gap-2"><Eye className="w-4 h-4"/> Pratinjau Bukti Kerusakan</h3>
                <button onClick={() => setShowImageModal(null)} className="text-slate-400 hover:text-white"><XCircle className="w-6 h-6"/></button>
              </div>
              <div className="bg-slate-950 p-2 rounded-b-2xl overflow-hidden flex items-center justify-center min-h-[300px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={showImageModal} alt="Bukti Klaim" className="max-w-full max-h-[70vh] object-contain rounded-xl border border-slate-800" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Sub-komponen helper tombol tabulasi
function TabButton({ icon: Icon, label, isActive, onClick }: { id: string; icon: React.ElementType; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3.5 font-bold text-xs transition-all relative outline-none shrink-0 ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-slate-500'}`} /> {label}
      {isActive && <motion.div layoutId="activeSupTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
    </button>
  );
}