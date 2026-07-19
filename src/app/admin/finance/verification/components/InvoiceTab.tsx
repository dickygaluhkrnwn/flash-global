"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Eye, Image as ImageIcon, FileText, User, MapPin, Package, Truck, Scale, TicketPercent, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, arrayUnion, increment } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { OrderDetail, FirebaseTimestamp, LocationDetail } from "@/types/order";

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
  orders: OrderDetail[];
  searchQuery: string;
  filterStatus: string;
  sortOrder: string;
  showToast: (type: "success" | "error", msg: string) => void;
}

export default function InvoiceTab({ orders, searchQuery, filterStatus, sortOrder, showToast }: Props) {
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processedOrders = useMemo(() => {
    let result = orders.filter(o => o.paymentMethod === "Transfer Bank Manual" || o.paymentStatus === "Menunggu Verifikasi Finance" || o.paymentStatus === "Lunas" || o.paymentStatus === "Ditolak");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => {
        const originName = typeof o.origin === 'object' && o.origin !== null ? (o.origin as LocationDetail).senderName : "";
        return o.id.toLowerCase().includes(q) || (o.email || "").toLowerCase().includes(q) || (originName || "").toLowerCase().includes(q);
      });
    }
    const mappedStatus = filterStatus === "Pending" ? "Menunggu Verifikasi Finance" : filterStatus;
    if (filterStatus !== "All") result = result.filter(o => o.paymentStatus === mappedStatus);
    
    result.sort((a, b) => {
      const cA = a.breakdown?.grandTotal || a.finalGrandTotal || a.totalCost || 0; 
      const cB = b.breakdown?.grandTotal || b.finalGrandTotal || b.totalCost || 0;
      const tA = getMillis(a.createdAt);
      const tB = getMillis(b.createdAt);
      if (sortOrder === "newest") return tB - tA;
      if (sortOrder === "oldest") return tA - tB;
      if (sortOrder === "highest_value") return cB - cA;
      return 0;
    });
    return result;
  }, [orders, searchQuery, filterStatus, sortOrder]);

  const handleVerifyPayment = async (orderId: string, action: "Approve" | "Reject") => {
    setIsProcessing(true);
    try {
      const targetOrder = orders.find(o => o.id === orderId); 
      const orderRef = doc(db, "orders", orderId);
      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const uniqueId = Date.now().toString();

      if (action === "Approve") {
        await updateDoc(orderRef, {
          paymentStatus: "Lunas",
          status: "Menunggu Kurir", 
          verifiedAt: serverTimestamp(),
          trackingHistory: arrayUnion({
            id: uniqueId,
            status: "Pembayaran Divalidasi",
            date: logDate,
            description: "Pembayaran telah berhasil divalidasi oleh Tim Finance. Sistem operasional sedang mencari kurir untuk pickup.",
            location: "Pusat Keuangan Flash Global"
          })
        });

        if (targetOrder && targetOrder.appliedPromoCode) {
          const promoRef = doc(db, "promos", targetOrder.appliedPromoCode);
          await updateDoc(promoRef, { usedCount: increment(1) });
        }
        showToast("success", "Pembayaran disetujui! Otomatis diteruskan ke Operasional.");
      } else {
        await updateDoc(orderRef, {
          paymentStatus: "Ditolak",
          status: "Menunggu Pembayaran",
          receiptUrl: null, 
          trackingHistory: arrayUnion({
            id: uniqueId,
            status: "Verifikasi Ditolak",
            date: logDate,
            description: "Bukti transfer ditolak/tidak sah oleh Tim Finance. Harap periksa nominal dan unggah ulang bukti yang benar.",
            location: "Pusat Keuangan Flash Global"
          })
        });
        showToast("error", "Pembayaran ditolak. Klien akan diminta mengunggah ulang.");
      }
    } catch (error) {
      console.error("Gagal verifikasi pembayaran:", error);
      showToast("error", "Terjadi kesalahan saat memproses verifikasi.");
    } finally {
      setIsProcessing(false);
      setSelectedOrderDetail(null);
    }
  };

  if (processedOrders.length === 0) {
    return (
      <div className="p-20 text-center text-slate-500 font-medium flex flex-col items-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3 opacity-50"/>
        Semua antrean tagihan invoice telah bersih.
      </div>
    );
  }

  return (
    <>
      <table className="w-full text-left border-collapse text-sm">
        <thead className="sticky top-0 bg-white shadow-sm z-10">
          <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
            <th className="p-5 pl-6">ID Manifes & Klien</th>
            <th className="p-5">Total Tagihan Akhir</th>
            <th className="p-5">Status Pembayaran</th>
            <th className="p-5 pr-6 text-right">Aksi Penanganan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {processedOrders.map(v => (
            <tr key={v.id} className="hover:bg-slate-50 transition-colors">
              <td className="p-5 pl-6 align-top">
                <p className="font-mono font-black text-slate-900 text-sm uppercase">#{v.id}</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {v.email || (typeof v.origin === 'object' && v.origin !== null ? (v.origin as LocationDetail).senderName : "") || "Klien"}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">{formatDate(v.createdAt)}</p>
              </td>
              <td className="p-5 align-top">
                <div className="flex flex-col">
                  <p className="text-base font-black text-emerald-600">{formatRupiah(v.finalGrandTotal || v.breakdown?.grandTotal || v.totalCost || 0)}</p>
                  {v.appliedPromoCode && <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded w-fit mt-1.5 font-bold flex items-center gap-1"><TicketPercent className="w-3 h-3"/> Promo Aktif</span>}
                </div>
              </td>
              <td className="p-5 align-top">
                <span className={`text-[9px] px-2 py-0.5 rounded inline-block font-bold uppercase tracking-widest border ${
                  v.paymentStatus === 'Lunas' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                  v.paymentStatus === 'Ditolak' ? 'bg-red-50 text-red-600 border-red-200' :
                  'bg-amber-50 text-amber-600 border-amber-200'
                }`}>
                  {v.paymentStatus}
                </span>
              </td>
              <td className="p-5 pr-6 align-top text-right">
                <Button onClick={() => setSelectedOrderDetail(v)} size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-9 font-bold shadow-sm">
                  <Eye className="w-4 h-4 mr-1.5" /> Lihat Detail
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL INVOICE */}
      <AnimatePresence>
        {selectedOrderDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isProcessing && setSelectedOrderDetail(null)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-5xl bg-slate-50 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
              <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><FileText className="w-6 h-6 text-[#7A171D]" /> Detail Pembayaran Transaksi</h2>
                  <p className="text-sm text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">#{selectedOrderDetail.id}</p>
                </div>
                <button onClick={() => !isProcessing && setSelectedOrderDetail(null)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* KIRI */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <User className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Akun Pemesan</p>
                          <p className="text-sm font-black text-slate-900">{selectedOrderDetail.email || "Guest User"}</p>
                        </div>
                      </div>
                      <div className="relative pl-2">
                        <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-slate-100 border-dashed border-l-2 border-slate-200 z-0"></div>
                        <div className="space-y-6 relative z-10">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 bg-white p-1 rounded-full"><MapPin className="w-5 h-5 text-slate-400" /></div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Titik Asal</p>
                              <p className="font-bold text-slate-900 text-sm">{typeof selectedOrderDetail.origin === 'object' && selectedOrderDetail.origin !== null ? (selectedOrderDetail.origin as LocationDetail).address : selectedOrderDetail.origin}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="mt-1 bg-white p-1 rounded-full"><MapPin className="w-5 h-5 text-[#7A171D]" /></div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Titik Tujuan</p>
                              {selectedOrderDetail.destinations ? selectedOrderDetail.destinations.map((dest: LocationDetail, idx: number) => (
                                <p key={idx} className="font-bold text-slate-900 text-sm mb-2">{dest.address}</p>
                              )) : (
                                <p className="font-bold text-slate-900 text-sm">{selectedOrderDetail.destination || "-"}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-[#C5A059]" /> Spesifikasi Kargo</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Berat</p>
                          <p className="text-lg font-black text-slate-900 flex items-center gap-2"><Scale className="w-4 h-4 text-slate-400"/> {selectedOrderDetail.totalWeight || selectedOrderDetail.weight || 0} Kg</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipe Kendaraan</p>
                          <p className="text-sm font-black text-slate-900 flex items-center gap-2 mt-1"><Truck className="w-4 h-4 text-slate-400"/> {selectedOrderDetail.vehicleName || selectedOrderDetail.vehicle || "Armada"}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KANAN */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4"><ImageIcon className="w-4 h-4 text-blue-500" /> Lampiran Bukti</h4>
                      {selectedOrderDetail.receiptUrl ? (
                        <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 flex items-center justify-center min-h-[250px] relative group overflow-hidden">
                           {/* eslint-disable-next-line @next/next/no-img-element */}
                           <img src={selectedOrderDetail.receiptUrl} alt="Bukti Transfer" className="w-full h-full object-contain max-h-[300px] rounded-lg" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <a href={selectedOrderDetail.receiptUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-xs shadow-xl flex items-center gap-2 hover:bg-slate-100 transition-colors">
                                <Eye className="w-4 h-4" /> Buka Full Screen
                              </a>
                           </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-10 rounded-xl border border-dashed border-slate-300 text-center">
                          <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-500">Tidak ada bukti terlampir.</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tagihan Masuk</p>
                      <p className="text-3xl font-black text-emerald-400">
                        {formatRupiah(selectedOrderDetail.finalGrandTotal || selectedOrderDetail.breakdown?.grandTotal || selectedOrderDetail.totalCost || selectedOrderDetail.offeredPrice || 0)}
                      </p>
                    </div>

                    {selectedOrderDetail.paymentStatus === "Menunggu Verifikasi Finance" && (
                      <div className="flex gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <Button onClick={() => handleVerifyPayment(selectedOrderDetail.id, "Approve")} disabled={isProcessing} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> TERIMA LUNAS
                        </Button>
                        <Button onClick={() => { if(confirm("Tolak bukti pembayaran ini?")) { handleVerifyPayment(selectedOrderDetail.id, "Reject"); } }} disabled={isProcessing} variant="outline" className="w-16 h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl flex items-center justify-center shrink-0">
                          <XCircle className="w-5 h-5" />
                        </Button>
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