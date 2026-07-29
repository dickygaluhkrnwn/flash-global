"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileWarning, X, Ban } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { OrderDetail } from "@/types/order";
import { User } from "@/types/user";

const formatIDR = (val?: number) => {
  if (!val) return "Rp 0";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
};

export function ClaimModal({ order, user, maxClaimAllowed, onClose, onSuccess, showToast }: { order: OrderDetail; user: User; maxClaimAllowed: number; onClose: () => void; onSuccess: () => void; showToast: (type: "success" | "error", msg: string) => void; }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimData, setClaimData] = useState({ claimedAmount: "", reason: "", proofUrl: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "insurance_claims"), {
        userId: user.uid, orderId: order.id, clientName: user.displayName || "Klien", clientEmail: user.email || "",
        claimedAmount: Number(claimData.claimedAmount), reason: claimData.reason, proofUrl: claimData.proofUrl,
        status: "Pending Review", createdAt: serverTimestamp()
      });
      onSuccess();
      showToast("success", "Klaim diajukan. Tim kami akan segera meninjau.");
      onClose();
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal mengajukan klaim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      {/* Dimmer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Bottom Sheet */}
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-10 w-full bg-[#f8fafc] rounded-t-[2.5rem] p-6 pb-safe shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-5" />

        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm border border-amber-500 text-white">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Klaim Asuransi</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Maks {formatIDR(maxClaimAllowed)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200/50 rounded-full text-slate-500 active:scale-90 tap-highlight-transparent"><X className="w-5 h-5"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nominal Kerugian (Rp)</label>
            <Input type="number" max={maxClaimAllowed} value={claimData.claimedAmount} onChange={(e) => setClaimData({...claimData, claimedAmount: e.target.value})} placeholder="Cth: 1500000" required className="font-black h-14 rounded-2xl" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Kronologi</label>
            <textarea value={claimData.reason} onChange={(e) => setClaimData({...claimData, reason: e.target.value})} placeholder="Jelaskan detail kerusakan..." required rows={3} className="flex w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Link Bukti Foto (Gdrive)</label>
            <Input type="url" value={claimData.proofUrl} onChange={(e) => setClaimData({...claimData, proofUrl: e.target.value})} placeholder="https://..." required className="h-14 rounded-2xl" />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-gradient-to-b from-amber-500 to-amber-600 text-white rounded-2xl border border-amber-700 mt-4 active:scale-95 tap-highlight-transparent">
            {isSubmitting ? "Mengirim..." : "Kirim Pengajuan Klaim"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

export function RefundModal({ order, user, onClose, onSuccess, showToast }: { order: OrderDetail; user: User; onClose: () => void; onSuccess: (updates: Partial<OrderDetail>) => void; showToast: (type: "success" | "error", msg: string) => void; }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refundData, setRefundData] = useState({ alasan: "", rekeningTujuan: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const nominal = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
      await addDoc(collection(db, "refund_requests"), {
        orderId: order.id, userId: user.uid, clientName: user.displayName || "Klien", nominal: nominal,
        alasan: refundData.alasan, rekeningTujuan: refundData.rekeningTujuan, status: "Pending", createdAt: serverTimestamp()
      });

      const logDate = new Date().toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      await updateDoc(doc(db, "orders", order.id), {
        status: "Dibatalkan", paymentStatus: "Menunggu Refund",
        trackingHistory: arrayUnion({
          id: Date.now().toString(), status: "Dibatalkan & Proses Refund", date: logDate,
          description: "Pesanan dibatalkan. Pengembalian dana sedang diproses oleh Tim Finance.", location: "Sistem Keuangan"
        })
      });

      onSuccess({ status: "Dibatalkan", paymentStatus: "Menunggu Refund" });
      showToast("success", "Pengajuan refund berhasil.");
      onClose();
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal mengajukan refund.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative z-10 w-full bg-[#f8fafc] rounded-t-[2.5rem] p-6 pb-safe shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-5" />

        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-sm border border-red-600 text-white">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Ajukan Refund</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Total: {formatIDR(order?.finalGrandTotal || order?.breakdown?.grandTotal || order?.totalCost || 0)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-200/50 rounded-full text-slate-500 active:scale-90 tap-highlight-transparent"><X className="w-5 h-5"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 pb-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Alasan Batal</label>
            <textarea value={refundData.alasan} onChange={(e) => setRefundData({...refundData, alasan: e.target.value})} placeholder="Mengapa Anda membatalkan pesanan?" required rows={3} className="flex w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Rekening Tujuan</label>
            <Input type="text" value={refundData.rekeningTujuan} onChange={(e) => setRefundData({...refundData, rekeningTujuan: e.target.value})} placeholder="BCA - 123456789 - Nama" required className="h-14 rounded-2xl" />
            <p className="text-[9px] text-slate-400 font-bold mt-1.5">💡 Nama bank, nomor, dan atas nama rekening harus sesuai.</p>
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full h-14 bg-gradient-to-b from-red-600 to-red-700 text-white rounded-2xl border border-red-800 mt-4 active:scale-95 tap-highlight-transparent">
            {isSubmitting ? "Memproses..." : "Ajukan Refund"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}