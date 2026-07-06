"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Banknote, Receipt, FileSpreadsheet, Building2, 
  CheckCircle2, AlertCircle, XCircle, Search, 
  Download, Eye, Image as ImageIcon, CalendarClock
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy, where, serverTimestamp, Timestamp } from "firebase/firestore";

// --- INTERFACES ---
interface PaymentVerification {
  id: string;
  email: string;
  origin: { senderName: string };
  totalCost: number;
  breakdown?: { grandTotal: number };
  status: string;
  paymentStatus: string;
  receiptUrl: string;
  createdAt?: Timestamp;
}

interface B2BClientDebt {
  id: string; // email atau ID user
  name: string;
  email: string;
  unpaidCount: number;
  totalDebt: number;
}

interface FinanceReport {
  id: string;
  date: string;
  clientEmail: string;
  serviceType: string;
  amount: number;
  paymentStatus: string;
}

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<"verifikasi" | "invoice" | "laporan">("verifikasi");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Data States
  const [verifications, setVerifications] = useState<PaymentVerification[]>([]);
  const [b2bDebts, setB2bDebts] = useState<B2BClientDebt[]>([]);
  const [reports, setReports] = useState<FinanceReport[]>([]);

  // Modal Image State
  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchFinanceData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch data yang butuh verifikasi manual
      const verifQ = query(collection(db, "orders"), where("paymentStatus", "==", "Menunggu Verifikasi Finance"));
      const verifSnap = await getDocs(verifQ);
      setVerifications(verifSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentVerification)));

      // 2. Fetch Piutang B2B (Order dengan isB2BApplied == true yang belum lunas)
      const b2bOrderQ = query(collection(db, "orders"), where("isB2BApplied", "==", true));
      const b2bOrderSnap = await getDocs(b2bOrderQ);
      
      const debtMap = new Map<string, B2BClientDebt>();
      b2bOrderSnap.forEach(docObj => {
        const data = docObj.data();
        if (data.paymentStatus !== "Lunas") {
          const clientEmail = data.email || data.origin?.senderName || "Unknown B2B Client";
          const amount = data.breakdown?.grandTotal || data.totalCost || 0;
          
          if (debtMap.has(clientEmail)) {
            const existing = debtMap.get(clientEmail)!;
            existing.unpaidCount += 1;
            existing.totalDebt += amount;
          } else {
            debtMap.set(clientEmail, {
              id: docObj.id,
              name: data.origin?.senderName || "Corporate Client",
              email: clientEmail,
              unpaidCount: 1,
              totalDebt: amount
            });
          }
        }
      });
      setB2bDebts(Array.from(debtMap.values()));

      // 3. Fetch Laporan (Semua transaksi untuk report)
      const reportQ = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const reportSnap = await getDocs(reportQ);
      setReports(reportSnap.docs.map(d => {
        const data = d.data();
        const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        return {
          id: d.id,
          date: dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
          clientEmail: data.email || data.origin?.senderName || "Guest",
          serviceType: data.serviceType || "Unknown",
          amount: data.breakdown?.grandTotal || data.totalCost || 0,
          paymentStatus: data.paymentStatus || "Belum Bayar"
        };
      }));

    } catch (error) {
      console.error("Gagal menarik data keuangan:", error);
      showToast("error", "Gagal menghubungkan ke database keuangan.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  // HANDLER: Verifikasi (Approve / Reject) Bukti Transfer
  const handleVerifyPayment = async (orderId: string, action: "Approve" | "Reject") => {
    setIsProcessing(true);
    try {
      const orderRef = doc(db, "orders", orderId);
      if (action === "Approve") {
        await updateDoc(orderRef, {
          paymentStatus: "Lunas",
          status: "Menunggu Kurir", // Setelah lunas, cari kurir
          verifiedAt: serverTimestamp()
        });
        showToast("success", "Pembayaran disetujui. Order diteruskan ke operasional.");
      } else {
        await updateDoc(orderRef, {
          paymentStatus: "Ditolak",
          status: "Menunggu Pembayaran",
          receiptUrl: null // Hapus bukti yang salah
        });
        showToast("error", "Pembayaran ditolak. Klien harus mengunggah ulang bukti.");
      }
      fetchFinanceData();
    } catch (error) {
      console.error("Verifikasi error:", error);
      showToast("error", "Terjadi kesalahan saat memproses verifikasi.");
    } finally {
      setIsProcessing(false);
    }
  };

  // HANDLER: Export CSV
  const handleExportCSV = () => {
    if (reports.length === 0) {
      showToast("error", "Tidak ada data untuk diekspor.");
      return;
    }

    try {
      // Header CSV
      const headers = ["ID Transaksi", "Tanggal", "Klien/Pengirim", "Layanan", "Nominal (IDR)", "Status Pembayaran"];
      
      // Map data ke format baris CSV (hati-hati dengan koma di dalam string)
      const rows = reports.map(r => 
        `"${r.id}","${r.date}","${r.clientEmail.replace(/"/g, '""')}","${r.serviceType}","${r.amount}","${r.paymentStatus}"`
      );

      // Gabungkan header dan baris
      const csvContent = headers.join(",") + "\n" + rows.join("\n");
      
      // Buat Blob dan Link untuk Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Laporan_Keuangan_FlashGlobal_${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("success", "File CSV Laporan Keuangan berhasil diunduh.");
    } catch (error) {
      console.error("Export error:", error);
      showToast("error", "Gagal mengekspor file CSV.");
    }
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* Toast Notification */}
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
            <Banknote className="w-6 h-6 text-emerald-500" /> Pusat Keuangan & Penagihan
          </h1>
          <p className="text-slate-400 text-sm mt-1">Validasi mutasi kas, manajemen piutang korporat B2B, dan pembukuan ekspor CSV.</p>
        </div>
        
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Cari transaksi / email klien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-white outline-none text-xs font-semibold focus:border-emerald-500"
          />
        </div>
      </div>

      {/* TABULASI MENU */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
        <TabButton id="verifikasi" icon={Receipt} label="Verifikasi Manual" isActive={activeTab === "verifikasi"} onClick={() => { setActiveTab("verifikasi"); setSearchQuery(""); }} />
        <TabButton id="invoice" icon={Building2} label="Piutang B2B (Net 30)" isActive={activeTab === "invoice"} onClick={() => { setActiveTab("invoice"); setSearchQuery(""); }} />
        <TabButton id="laporan" icon={FileSpreadsheet} label="Laporan Pembukuan" isActive={activeTab === "laporan"} onClick={() => { setActiveTab("laporan"); setSearchQuery(""); }} />
      </div>

      {/* AREA WORKSPACE */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-[500px]">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-bold animate-pulse text-sm">Menarik Buku Besar Kas Perusahaan...</div>
        ) : (
          <div className="p-6">
            
            {/* ========================================= */}
            {/* TAB 1: VERIFIKASI TRANSFER MANUAL         */}
            {/* ========================================= */}
            {activeTab === "verifikasi" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      <th className="p-4 pl-6">ID Manifest & Klien</th>
                      <th className="p-4">Total Tagihan</th>
                      <th className="p-4">Bukti Lampiran</th>
                      <th className="p-4 pr-6 text-right">Keputusan Mutasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {verifications.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-emerald-500/70 font-bold">Semua pembayaran telah diverifikasi. Kas aman!</td></tr>
                    )}
                    {verifications.filter(v => v.id.toLowerCase().includes(searchQuery.toLowerCase()) || v.email?.includes(searchQuery)).map(v => (
                      <tr key={v.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-mono font-bold text-white text-sm mb-1 uppercase">#{v.id.substring(0,8)}</p>
                          <p className="text-[11px] text-slate-400">{v.email || v.origin?.senderName}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-base font-black text-amber-400">{formatRupiah(v.breakdown?.grandTotal || v.totalCost)}</p>
                          <span className="text-[9px] bg-amber-950 text-amber-400 px-2 py-0.5 rounded mt-1 inline-block border border-amber-900">Menunggu Cek Kas</span>
                        </td>
                        <td className="p-4">
                          {v.receiptUrl ? (
                            <button 
                              onClick={() => setShowImageModal(v.receiptUrl)}
                              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg border border-slate-700 transition-colors"
                            >
                              <ImageIcon className="w-4 h-4" /> Lihat Bukti
                            </button>
                          ) : (
                            <span className="text-slate-500 italic">Tidak ada lampiran</span>
                          )}
                        </td>
                        <td className="p-4 pr-6 flex justify-end gap-2">
                          <button 
                            disabled={isProcessing}
                            onClick={() => handleVerifyPayment(v.id, "Approve")}
                            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" /> LUNAS (Approve)
                          </button>
                          <button 
                            disabled={isProcessing}
                            onClick={() => handleVerifyPayment(v.id, "Reject")}
                            className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" /> TOLAK
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ========================================= */}
            {/* TAB 2: PIUTANG B2B (INVOICING)            */}
            {/* ========================================= */}
            {activeTab === "invoice" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      <th className="p-4 pl-6">Profil Perusahaan B2B</th>
                      <th className="p-4">Tunggakan Invoice</th>
                      <th className="p-4">Total Piutang</th>
                      <th className="p-4 pr-6 text-right">Tindakan Penagihan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {b2bDebts.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada piutang aktif dari klien B2B saat ini.</td></tr>
                    )}
                    {b2bDebts.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.email.includes(searchQuery)).map((debt, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-bold text-white text-sm mb-1">{debt.name}</p>
                          <p className="text-[11px] text-slate-400">{debt.email}</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-red-950/40 border border-red-900 text-red-400 font-bold px-2 py-1 rounded text-[10px] flex items-center gap-1.5 w-fit">
                            <AlertCircle className="w-3 h-3" /> {debt.unpaidCount} Transaksi Menggantung
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-base font-black text-red-400">{formatRupiah(debt.totalDebt)}</p>
                        </td>
                        <td className="p-4 pr-6 flex justify-end">
                          <button className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors">
                            <FileSpreadsheet className="w-3.5 h-3.5" /> Cetak Tagihan PDF (Mockup)
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ========================================= */}
            {/* TAB 3: LAPORAN PEMBUKUAN (EXPORT)         */}
            {/* ========================================= */}
            {activeTab === "laporan" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2"><CalendarClock className="w-4 h-4 text-emerald-500"/> Buku Besar Transaksi</h3>
                    <p className="text-xs text-slate-400 mt-1">Gunakan tombol ekspor untuk menarik data ke aplikasi akuntansi pihak ketiga (Excel/CSV).</p>
                  </div>
                  <button 
                    onClick={handleExportCSV}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                  >
                    <Download className="w-4 h-4" /> Unduh Laporan CSV
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[400px]">
                  <table className="w-full text-left border-collapse text-xs relative">
                    <thead className="sticky top-0 bg-slate-950 shadow-md">
                      <tr className="text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                        <th className="p-3 pl-5">Tanggal</th>
                        <th className="p-3">ID Manifest</th>
                        <th className="p-3">Klien</th>
                        <th className="p-3">Layanan</th>
                        <th className="p-3">Status Bayar</th>
                        <th className="p-3 pr-5 text-right">Nominal Masuk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {reports.filter(r => r.id.toLowerCase().includes(searchQuery.toLowerCase()) || r.clientEmail.includes(searchQuery)).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 pl-5 text-slate-400">{r.date}</td>
                          <td className="p-3 font-mono font-bold text-slate-300">#{r.id.substring(0,8).toUpperCase()}</td>
                          <td className="p-3 text-slate-300">{r.clientEmail}</td>
                          <td className="p-3 text-slate-400">{r.serviceType}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${r.paymentStatus === 'Lunas' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-slate-800 text-slate-400'}`}>
                              {r.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3 pr-5 text-right font-black text-white">{formatRupiah(r.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* MODAL: BUKTI TRANSFER PREVIEW             */}
      {/* ========================================= */}
      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowImageModal(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 w-full max-w-2xl max-h-full flex flex-col">
              <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 rounded-t-2xl">
                <h3 className="font-bold text-white flex items-center gap-2"><Eye className="w-4 h-4"/> Pratinjau Dokumen Transfer</h3>
                <button onClick={() => setShowImageModal(null)} className="text-slate-400 hover:text-white"><XCircle className="w-6 h-6"/></button>
              </div>
              <div className="bg-slate-950 p-2 rounded-b-2xl overflow-hidden flex items-center justify-center min-h-[300px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={showImageModal} alt="Bukti Transfer" className="max-w-full max-h-[70vh] object-contain rounded-xl border border-slate-800" />
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
      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-slate-500'}`} /> {label}
      {isActive && <motion.div layoutId="activeFinTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />}
    </button>
  );
}