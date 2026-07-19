"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileWarning, XCircle, Ban } from "lucide-react";
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
        userId: user.uid,
        orderId: order.id,
        clientName: user.displayName || "Klien", 
        clientEmail: user.email || "",
        claimedAmount: Number(claimData.claimedAmount),
        reason: claimData.reason,
        proofUrl: claimData.proofUrl,
        status: "Pending Review",
        createdAt: serverTimestamp()
      });
      onSuccess();
      showToast("success", "Klaim Asuransi berhasil diajukan. Tim kami akan segera meninjaunya.");
    } catch (error) {
      console.error("Gagal mengajukan klaim:", error);
      showToast("error", "Terjadi kesalahan sistem saat mengajukan klaim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2"><FileWarning className="w-6 h-6 text-amber-500" /> Formulir Klaim Asuransi</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Nominal maksimal yang dapat diajukan: <strong className="text-slate-900">{formatIDR(maxClaimAllowed)}</strong></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><XCircle className="w-6 h-6"/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nominal Kerugian (Rp)</label>
            <Input type="number" max={maxClaimAllowed} value={claimData.claimedAmount} onChange={(e) => setClaimData({...claimData, claimedAmount: e.target.value})} placeholder="Contoh: 1500000" required className="font-bold border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/10" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alasan / Kronologi Kerusakan</label>
            <textarea value={claimData.reason} onChange={(e) => setClaimData({...claimData, reason: e.target.value})} placeholder="Jelaskan secara detail barang yang rusak..." required rows={3} className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:border-amber-500 focus-visible:ring-amber-500/10 resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tautan Bukti Foto (Google Drive / Imgur)</label>
            <Input type="url" value={claimData.proofUrl} onChange={(e) => setClaimData({...claimData, proofUrl: e.target.value})} placeholder="https://..." required className="border-slate-200 focus-visible:border-amber-500 focus-visible:ring-amber-500/10" />
          </div>
          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <Button type="button" onClick={onClose} variant="outline" className="w-full text-xs border-slate-200">Batal</Button>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 border-none">
              {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// BUG FIX: Mengganti any dengan Partial<OrderDetail> agar Typescript senang
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
      showToast("success", "Pengajuan refund berhasil. Dana akan dikembalikan maksimal 3x24 Jam Kerja.");
    } catch (error) {
      console.error(error);
      showToast("error", "Terjadi kesalahan sistem saat mengajukan refund.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-lg bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xl font-black text-red-600 flex items-center gap-2"><Ban className="w-6 h-6" /> Pembatalan & Refund</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">Dana dikembalikan: <strong className="text-slate-900">{formatIDR(order?.finalGrandTotal || order?.breakdown?.grandTotal || order?.totalCost || 0)}</strong></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><XCircle className="w-6 h-6"/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alasan Pembatalan</label>
            <textarea value={refundData.alasan} onChange={(e) => setRefundData({...refundData, alasan: e.target.value})} placeholder="Mengapa Anda membatalkan pesanan ini?" required rows={3} className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:border-red-500 focus-visible:ring-red-500/10 resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rekening Tujuan Refund</label>
            <Input type="text" value={refundData.rekeningTujuan} onChange={(e) => setRefundData({...refundData, rekeningTujuan: e.target.value})} placeholder="Cth: BCA - 123456789 - Budi Santoso" required className="font-bold border-slate-200 focus-visible:border-red-500 focus-visible:ring-red-500/10" />
            <p className="text-[10px] text-slate-400 font-medium mt-1">Pastikan nama bank, nomor, dan atas nama rekening sesuai.</p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <Button type="button" onClick={onClose} variant="outline" className="w-full text-xs border-slate-200">Batal</Button>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 border-none">
              {isSubmitting ? "Memproses..." : "Ajukan Refund"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}