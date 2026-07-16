"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Receipt, Search, CheckCircle2, AlertCircle, Filter, 
  ArrowUpDown, DollarSign, XCircle, Eye, Image as ImageIcon,
  ShieldAlert, Clock, FileText, User, MapPin, Package, 
  Truck, X, Scale, TicketPercent, Wallet, CheckCircle, 
  PlusCircle, Building2, Undo2, Banknote, Upload
} from "lucide-react";

import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy, serverTimestamp, arrayUnion, increment, writeBatch } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// MENGGUNAKAN GLOBAL TYPES
import { OrderDetail, FirebaseTimestamp, LocationDetail } from "@/types/order";

interface DepositRequest {
  id: string;
  userId: string;
  clientName: string;
  amount: number;
  proofUrl: string;
  status: string; // 'Pending', 'Approved', 'Rejected'
  createdAt: FirebaseTimestamp;
  verifiedAt?: FirebaseTimestamp;
}

// Fallback Interface untuk RefundRequest jika belum ter-export sempurna dari global types
interface RefundRequest {
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

export default function FinanceVerificationPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<"orders" | "deposits" | "refunds">("orders");
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Pending"); 
  const [sortOrder, setSortOrder] = useState("newest");

  // State Detail Modals
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Upload State Khusus Refund
  const [refundProofFile, setRefundProofFile] = useState<File | null>(null);
  const [refundProofPreview, setRefundProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(true);

    // 1. Tarik data order
    const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail)));
    });

    // 2. Tarik data Deposit
    const qDeposits = query(collection(db, "deposit_requests"), orderBy("createdAt", "desc"));
    const unsubDeposits = onSnapshot(qDeposits, (snapshot) => {
      setDepositRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DepositRequest)));
    });

    // 3. Tarik data Refund Requests (BARU)
    const qRefunds = query(collection(db, "refund_requests"), orderBy("createdAt", "desc"));
    const unsubRefunds = onSnapshot(qRefunds, (snapshot) => {
      setRefundRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RefundRequest)));
      setIsLoading(false);
    });

    return () => {
      unsubOrders();
      unsubDeposits();
      unsubRefunds();
    };
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

  const formatDate = (timestamp: FirebaseTimestamp) => {
    if (!timestamp) return "-";
    let d: Date;
    if (typeof timestamp === 'object' && timestamp !== null) {
      const objTs = timestamp as Record<string, unknown>;
      if (typeof objTs.toDate === 'function') {
        d = objTs.toDate() as Date;
      } else {
        d = new Date(timestamp as string | number);
      }
    } else {
      d = new Date(timestamp as string | number);
    }
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getMillis = (ts: FirebaseTimestamp) => {
    if (!ts) return 0;
    if (typeof ts === 'object' && ts !== null) {
      const objTs = ts as Record<string, unknown>;
      if (typeof objTs.toMillis === 'function') return objTs.toMillis() as number;
      if (typeof objTs.seconds === 'number') return objTs.seconds * 1000;
    }
    return new Date(ts as string | number).getTime();
  };

  // Handler Gambar Refund
  const handleRefundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setRefundProofFile(file);
      setRefundProofPreview(URL.createObjectURL(file));
    }
  };

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

  const handleVerifyDeposit = async (reqId: string, action: "Approve" | "Reject") => {
    setIsProcessing(true);
    try {
      const targetReq = depositRequests.find(d => d.id === reqId);
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

  const handleVerifyRefund = async (reqId: string, action: "Approve" | "Reject") => {
    setIsProcessing(true);
    try {
      const targetReq = refundRequests.find(r => r.id === reqId);
      if (!targetReq) throw new Error("Data Refund tidak ditemukan");

      let finalProofUrl = "";

      // Khusus untuk Approve, Wajib Upload Bukti Transfer Refund
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

      // Referensi Order Terkait
      const orderRef = doc(db, "orders", targetReq.orderId);
      // Referensi Tiket Refund
      const refundRef = doc(db, "refund_requests", reqId);

      if (action === "Approve") {
        batch.update(refundRef, { 
          status: "Approved", 
          proofUrl: finalProofUrl, 
          processedAt: serverTimestamp() 
        });

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
        batch.update(refundRef, { 
          status: "Rejected", 
          processedAt: serverTimestamp() 
        });

        batch.update(orderRef, {
          paymentStatus: "Refund Ditolak",
          trackingHistory: arrayUnion({
            id: uniqueId,
            status: "Refund Ditolak",
            date: logDate,
            description: "Pengajuan Refund ditolak oleh Tim Finance. Harap hubungi Customer Service untuk informasi lebih lanjut.",
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

  const processedDeposits = useMemo(() => {
    let result = [...depositRequests];
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
  }, [depositRequests, searchQuery, filterStatus, sortOrder]);

  const processedRefunds = useMemo(() => {
    let result = [...refundRequests];
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
  }, [refundRequests, searchQuery, filterStatus, sortOrder]);

  const totalOrdersPending = orders.filter(o => o.paymentStatus === "Menunggu Verifikasi Finance").length;
  const totalDepositsPending = depositRequests.filter(d => d.status === "Pending").length;
  const totalRefundsPending = refundRequests.filter(r => r.status === "Pending").length;
  const totalVerifiedLunas = orders.filter(o => o.paymentStatus === "Lunas").reduce((acc, curr) => acc + (curr.finalGrandTotal || curr.breakdown?.grandTotal || curr.totalCost || 0), 0);

  // RBAC GUARD
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Keuangan & Tagihan ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Menghubungkan ke Buku Besar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-12">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[80px] pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Receipt className="w-8 h-8 text-emerald-600" /> Pusat Verifikasi
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">Validasi bukti transfer Tagihan Invoice, Setoran Deposit (B2B), dan Pengembalian Dana (Refund).</p>
        </div>
      </div>

      {/* STATS CARDS - Diubah jadi 4 Kolom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-16 h-16 text-amber-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Antrean Invoice</span>
          <p className="text-3xl font-black text-amber-600 mt-2">{totalOrdersPending} Tiket</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-16 h-16 text-blue-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Antrean Deposit</span>
          <p className="text-3xl font-black text-blue-600 mt-2">{totalDepositsPending} Tiket</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Undo2 className="w-16 h-16 text-rose-500"/></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pengajuan Refund</span>
          <p className="text-3xl font-black text-rose-600 mt-2">{totalRefundsPending} Tiket</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 border border-emerald-700 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-16 h-16 text-white"/></div>
          <span className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Uang Masuk Divalidasi</span>
          <p className="text-xl md:text-2xl font-black text-white mt-2 truncate">{formatRupiah(totalVerifiedLunas)}</p>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        
        {/* TABS SWITCHER (Ditambah Refund) */}
        <div className="flex flex-wrap bg-slate-50 p-2 border-b border-slate-200 w-full relative">
          <button onClick={() => { setActiveTab("orders"); setFilterStatus("Pending"); setSearchQuery(""); }} className={`flex-1 min-w-[120px] py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "orders" ? "text-slate-900 shadow-sm bg-white" : "text-slate-500 hover:text-slate-700"}`}>
            <Receipt className="w-4 h-4"/> Tagihan Invoice
            {totalOrdersPending > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center ml-1">{totalOrdersPending}</span>}
          </button>
          <button onClick={() => { setActiveTab("deposits"); setFilterStatus("Pending"); setSearchQuery(""); }} className={`flex-1 min-w-[120px] py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "deposits" ? "text-emerald-700 shadow-sm bg-white" : "text-slate-500 hover:text-slate-700"}`}>
            <Wallet className="w-4 h-4"/> Setoran Deposit
            {totalDepositsPending > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center ml-1">{totalDepositsPending}</span>}
          </button>
          <button onClick={() => { setActiveTab("refunds"); setFilterStatus("Pending"); setSearchQuery(""); }} className={`flex-1 min-w-[120px] py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "refunds" ? "text-rose-700 shadow-sm bg-white" : "text-slate-500 hover:text-slate-700"}`}>
            <Undo2 className="w-4 h-4"/> Pengembalian Dana
            {totalRefundsPending > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center ml-1">{totalRefundsPending}</span>}
          </button>
        </div>

        {/* TOOLBAR FILTER */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder={activeTab === 'orders' ? "Cari ID Manifes atau Nama..." : activeTab === 'deposits' ? "Cari Nama Klien atau ID Top-Up..." : "Cari ID Refund atau Order ID..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-slate-900 outline-none text-sm focus:border-emerald-500 focus:bg-white transition-all shadow-inner" />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white shadow-sm appearance-none font-bold text-slate-700 min-w-[150px]">
                <option value="All">Semua Status</option>
                <option value="Pending">Menunggu Cek</option>
                <option value="Approved">{activeTab === 'orders' ? 'Telah Lunas' : 'Disetujui'}</option>
                <option value={activeTab === 'orders' ? 'Ditolak' : 'Rejected'}>Ditolak</option>
              </select>
            </div>
            <div className="relative">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white shadow-sm appearance-none font-bold text-slate-700 min-w-[160px]">
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="highest_value">Nominal Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABEL DINAMIS */}
        <div className="overflow-x-auto flex-1 bg-white">
          
          {/* RENDER TAB ORDERS */}
          {activeTab === "orders" && (
            processedOrders.length === 0 ? (
              <div className="p-20 text-center text-slate-500 font-medium flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3 opacity-50"/>
                Semua antrean tagihan invoice telah bersih.
              </div>
            ) : (
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
                            <Eye className="w-4 h-4 mr-1.5" /> Lihat Detail & Validasi
                          </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* RENDER TAB DEPOSITS */}
          {activeTab === "deposits" && (
            processedDeposits.length === 0 ? (
              <div className="p-20 text-center text-slate-500 font-medium flex flex-col items-center">
                <Wallet className="w-12 h-12 text-slate-300 mb-3 opacity-50"/>
                Tidak ada pengajuan Top-Up saldo yang tertunda.
              </div>
            ) : (
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
            )
          )}

          {/* RENDER TAB REFUNDS */}
          {activeTab === "refunds" && (
            processedRefunds.length === 0 ? (
              <div className="p-20 text-center text-slate-500 font-medium flex flex-col items-center">
                <Undo2 className="w-12 h-12 text-slate-300 mb-3 opacity-50"/>
                Tidak ada pengajuan pengembalian dana (Refund) yang tertunda.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200 text-[10px]">
                    <th className="p-5 pl-6">ID Pengajuan & Klien</th>
                    <th className="p-5">Nominal & Resi Terkait</th>
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
                        <p className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded w-fit mt-1.5 font-bold flex items-center gap-1">
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
            )
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL VIEWER: DETAIL INVOICE ORDER                        */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedOrderDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isProcessing && setSelectedOrderDetail(null)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-5xl bg-slate-50 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
              {/* Header Modal */}
              <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><FileText className="w-6 h-6 text-[#7A171D]" /> Detail Pembayaran Transaksi</h2>
                  <p className="text-sm text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">#{selectedOrderDetail.id}</p>
                </div>
                <button onClick={() => !isProcessing && setSelectedOrderDetail(null)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {/* Body Modal */}
              <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* KIRI: INFO PENGIRIMAN */}
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
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Titik Asal Pengirim</p>
                              <p className="font-bold text-slate-900 text-sm">{typeof selectedOrderDetail.origin === 'object' && selectedOrderDetail.origin !== null ? (selectedOrderDetail.origin as LocationDetail).address : selectedOrderDetail.origin}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4">
                            <div className="mt-1 bg-white p-1 rounded-full"><MapPin className="w-5 h-5 text-[#7A171D]" /></div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Titik Tujuan (Destinasi)</p>
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

                  {/* KANAN: BUKTI & AKSI */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4"><ImageIcon className="w-4 h-4 text-blue-500" /> Lampiran Bukti Pembayaran</h4>
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
                          <p className="text-xs font-bold text-slate-500">Tidak ada bukti pembayaran terlampir.</p>
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tagihan & Uang Kas Masuk</p>
                      <p className="text-3xl font-black text-emerald-400">
                        {formatRupiah(selectedOrderDetail.finalGrandTotal || selectedOrderDetail.breakdown?.grandTotal || selectedOrderDetail.totalCost || selectedOrderDetail.offeredPrice || 0)}
                      </p>
                    </div>

                    {selectedOrderDetail.paymentStatus === "Menunggu Verifikasi Finance" && (
                      <div className="flex gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <Button onClick={() => handleVerifyPayment(selectedOrderDetail.id, "Approve")} disabled={isProcessing} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> VERIFIKASI LUNAS
                        </Button>
                        <Button onClick={() => { if(confirm("Tolak bukti pembayaran ini? Klien harus mengunggah ulang.")) { handleVerifyPayment(selectedOrderDetail.id, "Reject"); } }} disabled={isProcessing} variant="outline" className="w-16 h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl flex items-center justify-center shrink-0">
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

      {/* ========================================================= */}
      {/* MODAL VIEWER: DETAIL TOP-UP DEPOSIT                       */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedDeposit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isProcessing && setSelectedDeposit(null)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-4xl bg-slate-50 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
              {/* Header Modal */}
              <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Wallet className="w-6 h-6 text-emerald-600" /> Detail Top-Up Saldo</h2>
                  <p className="text-sm text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">#{selectedDeposit.id}</p>
                </div>
                <button onClick={() => !isProcessing && setSelectedDeposit(null)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {/* Body Modal */}
              <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* KIRI: INFO B2B */}
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
                      <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mb-1">Setoran Mutasi Bank Masuk</p>
                      <p className="text-3xl font-black text-white">
                        {formatRupiah(selectedDeposit.amount)}
                      </p>
                    </div>

                    {selectedDeposit.status === "Pending" && (
                      <div className="flex gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mt-4">
                        <Button onClick={() => handleVerifyDeposit(selectedDeposit.id, "Approve")} disabled={isProcessing} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> TERIMA & TAMBAH SALDO
                        </Button>
                        <Button onClick={() => { if(confirm("Tolak bukti transfer Top-Up ini? Saldo klien tidak akan bertambah.")) { handleVerifyDeposit(selectedDeposit.id, "Reject"); } }} disabled={isProcessing} variant="outline" className="w-16 h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl flex items-center justify-center shrink-0" title="Tolak">
                          <XCircle className="w-5 h-5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* KANAN: BUKTI TRANSFER */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4"><ImageIcon className="w-4 h-4 text-emerald-500" /> Lampiran Bukti Setoran</h4>
                    {selectedDeposit.proofUrl ? (
                      <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 flex items-center justify-center min-h-[400px] relative group overflow-hidden">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                         <img src={selectedDeposit.proofUrl} alt="Bukti Transfer Top Up" className="w-full h-full object-contain max-h-[500px] rounded-lg" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={selectedDeposit.proofUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-xs shadow-xl flex items-center gap-2 hover:bg-slate-100 transition-colors">
                              <Eye className="w-4 h-4" /> Buka Full Screen
                            </a>
                         </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-10 rounded-xl border border-dashed border-slate-300 text-center min-h-[400px] flex flex-col justify-center">
                        <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-500">Tidak ada bukti setoran terlampir.</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL VIEWER: DETAIL REFUND (NEW)                           */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedRefund && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !isProcessing && setSelectedRefund(null)}></motion.div>
            
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-4xl bg-slate-50 rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
              {/* Header Modal */}
              <div className="bg-white border-b border-slate-200 p-6 flex items-center justify-between shrink-0 relative z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><Undo2 className="w-6 h-6 text-rose-600" /> Detail Pengajuan Refund</h2>
                  <p className="text-sm text-slate-500 font-mono mt-1 uppercase tracking-widest font-bold">#{selectedRefund.id}</p>
                </div>
                <button onClick={() => !isProcessing && setSelectedRefund(null)} className="p-2 bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>

              {/* Body Modal */}
              <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* KIRI: INFO PEMBATALAN */}
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
                      <p className="text-3xl font-black text-white">
                        {formatRupiah(selectedRefund.nominal)}
                      </p>
                    </div>

                    {selectedRefund.status === "Pending" && (
                      <div className="flex gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mt-4">
                        <Button onClick={() => handleVerifyRefund(selectedRefund.id, "Approve")} disabled={isProcessing || !refundProofFile} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> KEMBALIKAN DANA
                        </Button>
                        <Button onClick={() => { if(confirm("Tolak pengajuan refund ini?")) { handleVerifyRefund(selectedRefund.id, "Reject"); } }} disabled={isProcessing} variant="outline" className="w-16 h-12 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl flex items-center justify-center shrink-0" title="Tolak">
                          <XCircle className="w-5 h-5" />
                        </Button>
                      </div>
                    )}
                    {selectedRefund.status === "Approved" && (
                      <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 font-bold text-center text-sm flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5" /> Dana Telah Berhasil Dikembalikan
                      </div>
                    )}
                  </div>

                  {/* KANAN: BUKTI TRANSFER BALIK */}
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
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <a href={selectedRefund.proofUrl} target="_blank" rel="noopener noreferrer" className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold text-xs shadow-xl flex items-center gap-2 hover:bg-slate-100 transition-colors">
                                <Eye className="w-4 h-4" /> Buka Full Screen
                              </a>
                           </div>
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

    </div>
  );
}