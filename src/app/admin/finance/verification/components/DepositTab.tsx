"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Eye, Image as ImageIcon, Wallet, Building2, Clock, PlusCircle, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, writeBatch, collection, serverTimestamp, increment } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { FirebaseTimestamp } from "@/types/order";

export interface DepositRequest {
  id: string;
  userId: string;
  clientName: string;
  amount: number;
  proofUrl: string;
  status: string;
  createdAt: FirebaseTimestamp;
  verifiedAt?: FirebaseTimestamp;
}

// UTILS LOKAL
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);
const getMillis = (ts: FirebaseTimestamp) => {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null) {
    const objTs = ts as Record<string, unknown>;
    if (typeof objTs.toMillis === 'function') return objTs.toMillis() as number;
    if (typeof objTs.seconds === 'number') return objTs.seconds * 1000;
  }
  return new Date(ts as string | number).getTime();
};
const formatDate = (timestamp: FirebaseTimestamp) => {
  if (!timestamp) return "-";
  return new Date(getMillis(timestamp)).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

interface Props {
  deposits: DepositRequest[];
  searchQuery: string;
  filterStatus: string;
  sortOrder: string;
  showToast: (type: "success" | "error", msg: string) => void;
}

export default function DepositTab({ deposits, searchQuery, filterStatus, sortOrder, showToast }: Props) {
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processedDeposits = useMemo(() => {
    let result = [...deposits];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.clientName.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
    }
    if (filterStatus !== "All") result = result.filter(d => d.status === filterStatus);
    
    result.sort((a, b) => {
      const tA = getMillis(a.createdAt);
      const tB = getMillis(b.createdAt);
      const cA = a.amount;
      const cB = b.amount;
      if (sortOrder === "newest") return tB - tA;
      if (sortOrder === "oldest") return tA - tB;
      if (sortOrder === "highest_value") return cB - cA;
      return 0;
    });
    return result;
  }, [deposits, searchQuery, filterStatus, sortOrder]);

  const handleVerifyDeposit = async (reqId: string, action: "Approve" | "Reject") => {
    setIsProcessing(true);
    try {
      const targetReq = deposits.find(d => d.id === reqId);
      if (!targetReq) throw new Error("Data Top-Up tidak ditemukan");

      if (action === "Approve") {
        const batch = writeBatch(db);
        
        const reqRef = doc(db, "deposit_requests", reqId);
        batch.update(reqRef, { status: "Approved", verifiedAt: serverTimestamp() });
        
        const userRef = doc(db, "users", targetReq.userId);
        batch.update(userRef, { depositBalance: increment(targetReq.amount) });
        
        const logRef = doc(collection(db, "wallet_logs"));
        batch.set(logRef, {
          entityId: targetReq.userId,
          entityName: targetReq.clientName,
          entityType: "B2B",
          type: "topup",
          amount: targetReq.amount,
          timestamp: serverTimestamp(),
          adminNote: "Setoran Deposit disetujui via Verifikasi Finance"
        });

        await batch.commit();
        showToast("success", "Top-Up disetujui! Saldo deposit klien berhasil ditambahkan.");
      } else {
        await updateDoc(doc(db, "deposit_requests", reqId), { 
          status: "Rejected", 
          verifiedAt: serverTimestamp() 
        });
        showToast("error", "Pengajuan Top-Up ditolak.");
      }
    } catch (error) {
      console.error("Gagal verifikasi Top-Up:", error);
      showToast("error", "Terjadi kesalahan sistem saat memproses Top-Up.");
    } finally {
      setIsProcessing(false);
      setSelectedDeposit(null);
    }
  };

  if (processedDeposits.length === 0) {
    return (
      <div className="p-20 text-center text-slate-500 font-medium flex flex-col items-center">
        <Wallet className="w-12 h-12 text-slate-300 mb-3 opacity-50"/>
        Tidak ada pengajuan Top-Up saldo yang tertunda.
      </div>
    );
  }

  return (
    <>
      <table className="w-full text-left border-collapse text-sm">
        <thead className="sticky top-0 bg-white shadow-sm z-10">
          <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
            <th className="p-5 pl-6">ID Top-Up & Entitas B2B</th>
            <th className="p-5">Setoran Deposit</th>
            <th className="p-5">Status Validasi</th>
            <th className="p-5 pr-6 text-right">Tindakan Admin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {processedDeposits.map(d => (
            <tr key={d.id} className="hover:bg-emerald-50/30 transition-colors">
              <td className="p-5 pl-6 align-top">
                <p className="font-mono font-black text-slate-900 text-sm uppercase">#{d.id.substring(0,8)}</p>
                <p className="text-xs text-slate-600 font-black mt-1 uppercase flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400"/> {d.clientName}</p>
                <p className="text-[10px] text-slate-400 mt-1">{formatDate(d.createdAt)}</p>
              </td>
              <td className="p-5 align-top">
                <p className="text-base font-black text-emerald-600 flex items-center gap-1.5"><PlusCircle className="w-4 h-4"/> {formatRupiah(d.amount)}</p>
              </td>
              <td className="p-5 align-top">
                <span className={`text-[9px] px-2 py-0.5 rounded inline-block font-bold uppercase tracking-widest border ${
                  d.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  d.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  {d.status}
                </span>
              </td>
              <td className="p-5 pr-6 align-top text-right">
                <Button onClick={() => setSelectedDeposit(d)} size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-9 font-bold shadow-sm">
                  <Eye className="w-4 h-4 mr-1.5" /> Verifikasi Mutasi
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL DEPOSIT */}
      <AnimatePresence>
        {selectedDeposit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isProcessing && setSelectedDeposit(null)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-4xl bg-slate-50 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
              <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Wallet className="w-6 h-6 text-emerald-600" /> Detail Top-Up Saldo</h2>
                  <p className="text-sm text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">#{selectedDeposit.id}</p>
                </div>
                <button onClick={() => !isProcessing && setSelectedDeposit(null)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* KIRI */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <Building2 className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Klien Korporat B2B</p>
                          <p className="text-sm font-black text-slate-900 uppercase">{selectedDeposit.clientName}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Waktu Pengajuan</p>
                        <p className="font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100">{formatDate(selectedDeposit.createdAt)}</p>
                      </div>
                    </div>

                    <div className="bg-emerald-900 rounded-2xl p-6 border border-emerald-800 shadow-xl text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
                      <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1">Setoran Mutasi Bank</p>
                      <p className="text-3xl font-black text-white">{formatRupiah(selectedDeposit.amount)}</p>
                    </div>

                    {selectedDeposit.status === "Pending" && (
                      <div className="flex gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mt-4">
                        <Button onClick={() => handleVerifyDeposit(selectedDeposit.id, "Approve")} disabled={isProcessing} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> TERIMA & TAMBAH SALDO
                        </Button>
                        <Button onClick={() => { if(confirm("Tolak bukti transfer Top-Up ini?")) { handleVerifyDeposit(selectedDeposit.id, "Reject"); } }} disabled={isProcessing} variant="outline" className="w-16 h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl flex items-center justify-center shrink-0">
                          <XCircle className="w-5 h-5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* KANAN */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4"><ImageIcon className="w-4 h-4 text-emerald-500" /> Lampiran Bukti Setoran</h4>
                    {selectedDeposit.proofUrl ? (
                      <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 flex items-center justify-center min-h-[400px] relative group overflow-hidden">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={selectedDeposit.proofUrl} alt="Bukti Transfer" className="w-full h-full object-contain max-h-[500px] rounded-lg" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={selectedDeposit.proofUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-xs shadow-xl flex items-center gap-2 hover:bg-slate-100 transition-colors">
                              <Eye className="w-4 h-4" /> Buka Full Screen
                            </a>
                         </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-10 rounded-xl border border-dashed border-slate-300 text-center min-h-[400px] flex flex-col justify-center">
                        <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-500">Tidak ada bukti terlampir.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}