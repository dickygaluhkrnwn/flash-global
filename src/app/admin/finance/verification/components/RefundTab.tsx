"use client";

import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Eye, User, FileText, Banknote, Undo2, Upload, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, serverTimestamp, arrayUnion, writeBatch } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { FirebaseTimestamp } from "@/types/order";

export interface RefundRequest {
  id: string;
  orderId: string;
  userId: string;
  clientName?: string;
  nominal: number;
  alasan: string;
  rekeningTujuan: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  proofUrl?: string;
  createdAt: FirebaseTimestamp;
  processedAt?: FirebaseTimestamp;
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
  refunds: RefundRequest[];
  searchQuery: string;
  filterStatus: string;
  sortOrder: string;
  showToast: (type: "success" | "error", msg: string) => void;
}

export default function RefundTab({ refunds, searchQuery, filterStatus, sortOrder, showToast }: Props) {
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refundProofFile, setRefundProofFile] = useState<File | null>(null);
  const [refundProofPreview, setRefundProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processedRefunds = useMemo(() => {
    let result = [...refunds];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => (r.clientName || "").toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.orderId.toLowerCase().includes(q));
    }
    if (filterStatus !== "All") result = result.filter(r => r.status === filterStatus);
    
    result.sort((a, b) => {
      const tA = getMillis(a.createdAt);
      const tB = getMillis(b.createdAt);
      const cA = a.nominal;
      const cB = b.nominal;
      if (sortOrder === "newest") return tB - tA;
      if (sortOrder === "oldest") return tA - tB;
      if (sortOrder === "highest_value") return cB - cA;
      return 0;
    });
    return result;
  }, [refunds, searchQuery, filterStatus, sortOrder]);

  const handleRefundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRefundProofFile(file);
      setRefundProofPreview(URL.createObjectURL(file));
    }
  };

  const handleVerifyRefund = async (reqId: string, action: "Approve" | "Reject") => {
    setIsProcessing(true);
    try {
      const targetReq = refunds.find(r => r.id === reqId);
      if (!targetReq) throw new Error("Data Refund tidak ditemukan");

      let finalProofUrl = "";

      if (action === "Approve") {
        if (!refundProofFile) {
          showToast("error", "Harap unggah bukti transfer pengembalian dana kepada klien.");
          setIsProcessing(false);
          return;
        }

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (cloudName && uploadPreset) {
          const imageFormData = new FormData();
          imageFormData.append("file", refundProofFile);
          imageFormData.append("upload_preset", uploadPreset);

          const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST", body: imageFormData,
          });

          const cloudData = await cloudinaryRes.json();
          if (cloudData.secure_url) {
            finalProofUrl = cloudData.secure_url;
          } else {
            throw new Error("Gagal mengunggah bukti refund.");
          }
        }
      }

      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();
      const batch = writeBatch(db);

      const orderRef = doc(db, "orders", targetReq.orderId);
      const refundRef = doc(db, "refund_requests", reqId);

      if (action === "Approve") {
        batch.update(refundRef, { status: "Approved", proofUrl: finalProofUrl, processedAt: serverTimestamp() });
        batch.update(orderRef, {
          paymentStatus: "Refund Selesai",
          trackingHistory: arrayUnion({
            id: uniqueId,
            status: "Refund Selesai",
            date: logDate,
            description: "Pengembalian dana (Refund) telah berhasil ditransfer ke rekening Anda oleh Tim Finance.",
            location: "Pusat Keuangan Flash Global"
          })
        });
        await batch.commit();
        showToast("success", "Refund disetujui! Bukti transfer telah terkirim ke Klien.");
      } else {
        batch.update(refundRef, { status: "Rejected", processedAt: serverTimestamp() });
        batch.update(orderRef, {
          paymentStatus: "Refund Ditolak",
          trackingHistory: arrayUnion({
            id: uniqueId,
            status: "Refund Ditolak",
            date: logDate,
            description: "Pengajuan Refund ditolak oleh Tim Finance. Harap hubungi Customer Service untuk info lanjut.",
            location: "Pusat Keuangan Flash Global"
          })
        });
        await batch.commit();
        showToast("error", "Pengajuan Refund telah ditolak.");
      }
    } catch (error) {
      console.error("Gagal verifikasi Refund:", error);
      showToast("error", "Terjadi kesalahan sistem saat memproses Refund.");
    } finally {
      setIsProcessing(false);
      setSelectedRefund(null);
      setRefundProofFile(null);
      setRefundProofPreview(null);
    }
  };

  if (processedRefunds.length === 0) {
    return (
      <div className="p-20 text-center text-slate-500 font-medium flex flex-col items-center">
        <Undo2 className="w-12 h-12 text-slate-300 mb-3 opacity-50"/>
        Tidak ada pengajuan pengembalian dana (Refund) yang tertunda.
      </div>
    );
  }

  return (
    <>
      <table className="w-full text-left border-collapse text-sm">
        <thead className="sticky top-0 bg-white shadow-sm z-10">
          <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
            <th className="p-5 pl-6">ID Pengajuan & Klien</th>
            <th className="p-5">Nominal & Resi</th>
            <th className="p-5">Status Eksekusi</th>
            <th className="p-5 pr-6 text-right">Tindakan Admin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {processedRefunds.map(r => (
            <tr key={r.id} className="hover:bg-rose-50/30 transition-colors">
              <td className="p-5 pl-6 align-top">
                <p className="font-mono font-black text-slate-900 text-sm uppercase">#{r.id.substring(0,8)}</p>
                <p className="text-xs text-slate-600 font-black mt-1 uppercase flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400"/> {r.clientName || "Klien"}</p>
                <p className="text-[10px] text-slate-400 mt-1">{formatDate(r.createdAt)}</p>
              </td>
              <td className="p-5 align-top">
                <p className="text-base font-black text-rose-600 flex items-center gap-1.5"><Banknote className="w-4 h-4"/> {formatRupiah(r.nominal)}</p>
                <p className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded w-fit mt-1.5 font-bold">
                  AWB: {r.orderId.substring(0,8).toUpperCase()}
                </p>
              </td>
              <td className="p-5 align-top">
                <span className={`text-[9px] px-2 py-0.5 rounded inline-block font-bold uppercase tracking-widest border ${
                  r.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  r.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  {r.status}
                </span>
              </td>
              <td className="p-5 pr-6 align-top text-right">
                <Button onClick={() => setSelectedRefund(r)} size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:border-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9 font-bold shadow-sm">
                  <Eye className="w-4 h-4 mr-1.5" /> Proses Refund
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL REFUND */}
      <AnimatePresence>
        {selectedRefund && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isProcessing && setSelectedRefund(null)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-4xl bg-slate-50 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
              <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Undo2 className="w-6 h-6 text-rose-600" /> Detail Pengajuan Refund</h2>
                  <p className="text-sm text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">#{selectedRefund.id}</p>
                </div>
                <button onClick={() => !isProcessing && setSelectedRefund(null)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* KIRI */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <User className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Klien Pengaju</p>
                          <p className="text-sm font-black text-slate-900 uppercase">{selectedRefund.clientName || "Klien"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Alasan Pembatalan</p>
                        <p className="font-medium text-slate-700 bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-sm leading-relaxed">{selectedRefund.alasan}</p>
                      </div>
                      <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Rekening Tujuan Refund</p>
                        <p className="font-bold text-slate-900 text-sm">{selectedRefund.rekeningTujuan}</p>
                      </div>
                    </div>

                    <div className="bg-rose-900 rounded-2xl p-6 border border-rose-800 shadow-xl text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500 rounded-full blur-[60px] opacity-20 pointer-events-none"></div>
                      <p className="text-[10px] font-bold text-rose-200 uppercase tracking-widest mb-1">Nominal Harus Dikembalikan</p>
                      <p className="text-3xl font-black text-white">{formatRupiah(selectedRefund.nominal)}</p>
                    </div>

                    {selectedRefund.status === "Pending" && (
                      <div className="flex gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mt-4">
                        <Button onClick={() => handleVerifyRefund(selectedRefund.id, "Approve")} disabled={isProcessing || !refundProofFile} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> KEMBALIKAN DANA
                        </Button>
                        <Button onClick={() => { if(confirm("Tolak pengajuan refund ini?")) { handleVerifyRefund(selectedRefund.id, "Reject"); } }} disabled={isProcessing} variant="outline" className="w-16 h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl flex items-center justify-center shrink-0">
                          <XCircle className="w-5 h-5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* KANAN */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-full flex flex-col">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4"><Upload className="w-4 h-4 text-emerald-500" /> Unggah Bukti Transfer Balik</h4>
                    
                    {selectedRefund.status === "Pending" ? (
                      <div className="flex-1 flex flex-col justify-center">
                        <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 hover:bg-emerald-50/50 min-h-[300px] relative overflow-hidden group">
                          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleRefundFileChange} className="hidden" />
                          
                          <AnimatePresence mode="wait">
                            {refundProofPreview ? (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-slate-900 p-2 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={refundProofPreview} alt="Bukti Refund" className="max-h-full rounded-lg object-contain" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                  <span className="bg-white text-slate-900 font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 transform group-hover:scale-105 transition-transform text-xs">
                                    <Upload className="w-4 h-4" /> Ganti Gambar
                                  </span>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-300">
                                  <Upload className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-700">Unggah Struk Pengembalian</p>
                                  <p className="text-[10px] text-slate-400 mt-1 font-medium max-w-[200px] mx-auto">Wajib diunggah sebelum Approve.</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </label>
                      </div>
                    ) : (
                      selectedRefund.proofUrl ? (
                        <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 flex items-center justify-center min-h-[400px] relative group overflow-hidden">
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={selectedRefund.proofUrl} alt="Bukti Transfer Refund" className="w-full h-full object-contain max-h-[500px] rounded-lg" />
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-10 rounded-xl border border-dashed border-slate-300 text-center flex-1 flex flex-col justify-center">
                          <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-500">Tidak ada bukti setoran terlampir.</p>
                        </div>
                      )
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