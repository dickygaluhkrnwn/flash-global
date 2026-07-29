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
      {/* Backdrop Glassmorphism */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }} 
        className="relative w-full max-w-xl bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-10 shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_24px_60px_rgba(0,0,0,0.1)] border border-white overflow-hidden"
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_rgba(217,119,6,0.3)] shrink-0 border border-amber-500">
                <FileWarning className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Klaim Asuransi</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Maksimal klaim untuk resi ini: <br className="sm:hidden" /><strong className="text-slate-900 bg-white/60 px-2 py-0.5 rounded-md border border-slate-200">{formatIDR(maxClaimAllowed)}</strong></p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full bg-white shadow-sm border border-slate-100 shrink-0"><XCircle className="w-6 h-6"/></button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nominal Kerugian (Rp)</label>
              <Input type="number" max={maxClaimAllowed} value={claimData.claimedAmount} onChange={(e) => setClaimData({...claimData, claimedAmount: e.target.value})} placeholder="Cth: 1500000" required className="font-black text-lg h-14" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Alasan / Kronologi Kerusakan</label>
              <textarea value={claimData.reason} onChange={(e) => setClaimData({...claimData, reason: e.target.value})} placeholder="Jelaskan secara detail barang yang rusak..." required rows={3} className="flex w-full rounded-2xl border border-white bg-white/60 backdrop-blur-md px-5 py-4 text-sm font-bold text-slate-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-amber-500/20 focus-visible:bg-white focus-visible:border-amber-500/50 resize-none placeholder:text-slate-400 placeholder:font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bukti Foto (Link GDrive/Imgur)</label>
              <Input type="url" value={claimData.proofUrl} onChange={(e) => setClaimData({...claimData, proofUrl: e.target.value})} placeholder="https://..." required className="h-14" />
            </div>
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button type="button" onClick={onClose} variant="outline" className="w-full sm:flex-1 h-14">Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:flex-[2] h-14 bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_20px_rgba(217,119,6,0.3)] border border-amber-700">
                {isSubmitting ? "Mengirim Pengajuan..." : "Kirim Pengajuan"}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// Sudah aman dengan Partial<OrderDetail>
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
      {/* Backdrop Glassmorphism */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }} 
        className="relative w-full max-w-xl bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-10 shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_24px_60px_rgba(0,0,0,0.1)] border border-white overflow-hidden"
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none z-0"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_8px_16px_rgba(239,68,68,0.3)] shrink-0 border border-red-600">
                <Ban className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Ajukan Refund</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Dana dikembalikan: <strong className="text-slate-900 bg-white/60 px-2 py-0.5 rounded-md border border-slate-200">{formatIDR(order?.finalGrandTotal || order?.breakdown?.grandTotal || order?.totalCost || 0)}</strong></p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full bg-white shadow-sm border border-slate-100 shrink-0"><XCircle className="w-6 h-6"/></button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Alasan Pembatalan</label>
              <textarea value={refundData.alasan} onChange={(e) => setRefundData({...refundData, alasan: e.target.value})} placeholder="Mengapa Anda membatalkan pesanan ini?" required rows={3} className="flex w-full rounded-2xl border border-white bg-white/60 backdrop-blur-md px-5 py-4 text-sm font-bold text-slate-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-red-500/20 focus-visible:bg-white focus-visible:border-red-500/50 resize-none placeholder:text-slate-400 placeholder:font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Rekening Tujuan Refund</label>
              <Input type="text" value={refundData.rekeningTujuan} onChange={(e) => setRefundData({...refundData, rekeningTujuan: e.target.value})} placeholder="Cth: BCA - 123456789 - Budi Santoso" required className="h-14" />
              <p className="text-[10px] text-slate-400 font-bold mt-2 bg-slate-50/50 p-2 rounded-lg border border-slate-100">💡 Pastikan nama bank, nomor, dan atas nama rekening sesuai.</p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button type="button" onClick={onClose} variant="outline" className="w-full sm:flex-1 h-14">Batal</Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:flex-[2] h-14 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_20px_rgba(220,38,38,0.3)] border border-red-800">
                {isSubmitting ? "Memproses..." : "Ajukan Refund"}
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
} 