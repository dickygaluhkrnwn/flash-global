"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Save, CheckCircle2, AlertCircle, 
  Building2, QrCode, RefreshCw, ShieldAlert, 
  Plus, Trash2, X, Upload, CreditCard, Image as ImageIcon,
  Activity, Check
} from "lucide-react";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { PaymentMethod, PaymentConfig } from "@/types/finance";

const BANK_COLOR_OPTIONS = [
  { label: "Biru (BCA / Mandiri / BNI)", value: "bg-gradient-to-br from-blue-500 to-blue-700 border-blue-600 shadow-blue-500/20" },
  { label: "Kuning (Mandiri / Maybank)", value: "bg-gradient-to-br from-amber-400 to-amber-600 border-amber-500 shadow-amber-500/20" },
  { label: "Hijau (BSI / Tokopedia)", value: "bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-600 shadow-emerald-500/20" },
  { label: "Ungu (OVO / Muamalat)", value: "bg-gradient-to-br from-purple-500 to-purple-700 border-purple-600 shadow-purple-500/20" },
  { label: "Merah (CIMB / Telkomsel)", value: "bg-gradient-to-br from-red-500 to-red-700 border-red-600 shadow-red-500/20" },
  { label: "Cyan (Bank Jago / BNC)", value: "bg-gradient-to-br from-cyan-400 to-cyan-600 border-cyan-500 shadow-cyan-500/20" },
  { label: "Gelap (Default)", value: "bg-gradient-to-br from-slate-700 to-slate-900 border-slate-800 shadow-slate-900/20" },
];

const glassPanel = "bg-white/70 backdrop-blur-[40px] saturate-[180%] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-300";

// =========================================================================
// LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
// =========================================================================
const getAdminUrl = (path: string) => {
  if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
    return path.replace(/^\/admin/, '') || '/';
  }
  return path; 
};

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Core Data Asli dari Server
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    transferBank: [],
    qrisImageUrl: null
  });

  // State Lokal (Contextual Editing)
  const [localBanks, setLocalBanks] = useState<PaymentMethod[]>([]);
  const [localQrisUrl, setLocalQrisUrl] = useState<string | null>(null);
  
  // File QRIS (Unsaved)
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [qrisPreview, setQrisPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal Bank State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBank, setNewBank] = useState<PaymentMethod>({
    bankName: "",
    accountNumber: "",
    accountName: "PT FLASH GLOBAL LOGISTIK",
    color: BANK_COLOR_OPTIONS[0].value
  });

  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSavingQris, setIsSavingQris] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "payments");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          // KODE DIBERSIHKAN: Safe Extraction untuk menghindari crash jika data corrupt
          const rawData = docSnap.data() || {};
          
          const safeData: PaymentConfig = {
            transferBank: Array.isArray(rawData.transferBank) ? rawData.transferBank : [],
            qrisImageUrl: typeof rawData.qrisImageUrl === 'string' ? rawData.qrisImageUrl : null
          };

          setPaymentConfig(safeData);
          setLocalBanks(safeData.transferBank);
          setLocalQrisUrl(safeData.qrisImageUrl);
          setQrisPreview(safeData.qrisImageUrl);
        }
      } catch (error) {
        console.error("Gagal menarik master data pembayaran:", error);
        showToast("error", "Gagal memuat konfigurasi dari database.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // =========================================================================
  // HANDLERS: REKENING BANK
  // =========================================================================
  const isBankDirty = JSON.stringify(localBanks) !== JSON.stringify(paymentConfig.transferBank);

  const handleAddBankSubmit = () => {
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountName) {
      alert("Harap lengkapi semua field rekening bank!");
      return;
    }
    setLocalBanks([...localBanks, newBank]);
    setIsModalOpen(false);
    setNewBank({ bankName: "", accountNumber: "", accountName: "PT FLASH GLOBAL LOGISTIK", color: BANK_COLOR_OPTIONS[0].value });
  };

  const handleDeleteBank = (index: number) => {
    if (confirm("Yakin ingin menghapus rekening ini?")) {
      setLocalBanks(localBanks.filter((_, i) => i !== index));
    }
  };

  const handleSaveBanks = async () => {
    setIsSavingBank(true);
    try {
      await setDoc(doc(db, "settings", "payments"), { transferBank: localBanks, updatedAt: serverTimestamp() }, { merge: true });
      setPaymentConfig(prev => ({ ...prev, transferBank: localBanks }));
      showToast("success", "Daftar Rekening Bank berhasil diperbarui!");
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal menyimpan konfigurasi rekening bank.");
    } finally {
      setIsSavingBank(false);
    }
  };

  // =========================================================================
  // HANDLERS: QRIS UPLOAD
  // =========================================================================
  const isQrisDirty = qrisFile !== null;

  const handleQrisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQrisFile(file);
      setQrisPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveQris = async () => {
    setIsSavingQris(true);
    try {
      let finalQrisUrl = localQrisUrl;
      
      if (qrisFile) {
        showToast("success", "Mengunggah barcode QRIS...");
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) throw new Error("Kredensial Cloudinary belum diatur.");

        const imageFormData = new FormData();
        imageFormData.append("file", qrisFile);
        imageFormData.append("upload_preset", uploadPreset);

        const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: imageFormData });
        const cloudData = await cloudinaryRes.json();
        
        if (cloudData.secure_url) {
          finalQrisUrl = cloudData.secure_url;
        } else {
          throw new Error("Gagal mengunggah QRIS ke server gambar.");
        }
      }

      await setDoc(doc(db, "settings", "payments"), { qrisImageUrl: finalQrisUrl, updatedAt: serverTimestamp() }, { merge: true });
      
      setPaymentConfig(prev => ({ ...prev, qrisImageUrl: finalQrisUrl }));
      setLocalQrisUrl(finalQrisUrl);
      setQrisFile(null);
      showToast("success", "Barcode QRIS berhasil diperbarui!");
    } catch (error: unknown) {
      console.error("Gagal menyimpan QRIS:", error);
      const errMsg = error instanceof Error ? error.message : "Gagal menyimpan QRIS ke database.";
      showToast("error", errMsg);
    } finally {
      setIsSavingQris(false);
    }
  };

  // RBAC GUARD
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Konfigurasi Pembayaran ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <AdminButton onClick={() => router.push(getAdminUrl("/admin"))} variant="outline" className="mt-8">Kembali ke Dashboard</AdminButton>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-12 h-12 text-[#C5A059] animate-pulse mb-4" />
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Memuat Modul Pembayaran...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 font-sans max-w-7xl mx-auto">
      
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-[200] p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-[0_20px_40px_rgba(0,0,0,0.1)] backdrop-blur-xl ${toastMessage.type === 'success' ? 'bg-white/90 border-emerald-200 text-emerald-700' : 'bg-white/90 border-red-200 text-red-700'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />} {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER CONTROL PANEL */}
      <div className={`${glassPanel} p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C5A059] rounded-full blur-[100px] opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <AdminBadge variant="gold" className="mb-4">Finance & Billing Panel</AdminBadge>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-[#C5A059]" />
            Metode Pembayaran
          </h1>
          <p className="text-slate-500 text-sm mt-2 max-w-2xl font-medium leading-relaxed">
            Kelola daftar rekening bank aktif dan barcode QRIS yang akan ditampilkan pada halaman pembayaran tagihan klien secara real-time.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* KOLOM KIRI: TRANSFER BANK */}
        <div className="xl:col-span-7 space-y-6">
          <div className={`${glassPanel} rounded-[2rem] p-6 lg:p-8 flex flex-col h-full`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-white/60 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 border border-blue-200">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Rekening Transfer Bank</h2>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Metode Bayar Manual</p>
                </div>
              </div>
              <AdminButton onClick={() => setIsModalOpen(true)} variant="outline" className="h-10 bg-white border-slate-200 text-slate-600 hover:text-blue-600 font-bold shrink-0">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Bank
              </AdminButton>
            </div>

            <div className="flex-1">
              {localBanks.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center bg-white/50 rounded-[1.5rem] border border-dashed border-slate-300">
                  <Building2 className="w-12 h-12 text-slate-300 mb-3 opacity-50" />
                  <h4 className="text-slate-700 font-black tracking-tight">Belum Ada Rekening Aktif</h4>
                  <p className="text-slate-500 text-sm mt-1 max-w-xs">Tambahkan rekening bank resmi perusahaan agar klien dapat melakukan pembayaran.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {localBanks.map((rek, index) => (
                      <motion.div key={index} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative group">
                        <div className={cn("p-5 border rounded-2xl transition-all h-full flex flex-col justify-between shadow-lg relative overflow-hidden", rek.color)}>
                          <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                            <Building2 className="w-16 h-16 text-white mix-blend-overlay" />
                          </div>
                          <div className="space-y-1 mb-6 relative z-10">
                            <span className="inline-block text-white font-black px-2 py-0.5 rounded text-[10px] tracking-widest bg-black/20 uppercase backdrop-blur-sm border border-white/10 mb-2">{rek.bankName}</span>
                            <p className="font-mono font-black text-white text-xl tracking-widest drop-shadow-md">{rek.accountNumber}</p>
                            <p className="text-[10px] text-white/80 font-bold uppercase tracking-widest leading-snug">{rek.accountName}</p>
                          </div>
                          
                          <button 
                            type="button" 
                            onClick={() => handleDeleteBank(index)}
                            className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-sm z-20"
                            title="Hapus Rekening"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* ACTION FOOTER KHUSUS BANK */}
            <div className="mt-8 pt-6 border-t border-white/60 flex items-center justify-end">
              <AdminButton 
                onClick={handleSaveBanks} 
                disabled={!isBankDirty || isSavingBank}
                className={cn("h-12 px-8 font-bold transition-all", isBankDirty ? "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20" : "bg-slate-100 text-slate-400 border-transparent")}
              >
                {isSavingBank ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : isBankDirty ? <Save className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                {isBankDirty ? "Simpan Perubahan Bank" : "Tersimpan"}
              </AdminButton>
            </div>

          </div>
        </div>

        {/* KOLOM KANAN: QRIS UPLOAD */}
        <div className="xl:col-span-5 space-y-6">
          <div className={`${glassPanel} rounded-[2rem] p-6 lg:p-8 flex flex-col h-full`}>
            
            <div className="flex items-center gap-4 mb-6 border-b border-white/60 pb-6">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-200">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">QRIS Pembayaran</h2>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">E-Wallet & M-Banking</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <label className="group relative block w-full h-[320px] rounded-[1.5rem] border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white/50 hover:bg-emerald-50/50 transition-all cursor-pointer overflow-hidden shadow-inner">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleQrisFileChange} className="hidden" />
                
                <AnimatePresence mode="wait">
                  {qrisPreview ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrisPreview} alt="QRIS Flash Global" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <span className="bg-white text-slate-900 font-bold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 transform group-hover:scale-105 transition-transform text-xs">
                          <Upload className="w-4 h-4" /> Ganti Gambar QRIS
                        </span>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4 text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all duration-300">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <p className="text-sm font-black text-slate-700">Unggah Gambar QRIS</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest max-w-[200px] leading-relaxed">Format JPG/PNG. Pastikan gambar jelas & tidak blur.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </label>

              {qrisFile && (
                <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Gambar baru belum disimpan!
                </div>
              )}
            </div>

            {/* ACTION FOOTER KHUSUS QRIS */}
            <div className="mt-6 pt-6 border-t border-white/60 flex items-center justify-end">
              <AdminButton 
                onClick={handleSaveQris} 
                disabled={!isQrisDirty || isSavingQris}
                className={cn("h-12 px-8 font-bold transition-all w-full", isQrisDirty ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20" : "bg-slate-100 text-slate-400 border-transparent")}
              >
                {isSavingQris ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : isQrisDirty ? <Upload className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                {isQrisDirty ? "Upload & Simpan QRIS" : "QRIS Tersimpan"}
              </AdminButton>
            </div>

          </div>
        </div>

      </div>

      {/* ================================================================= */}
      {/* MODAL TAMBAH BANK */}
      {/* ================================================================= */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl overflow-hidden border border-white flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-slate-200 flex items-center justify-between bg-white/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Tambah Bank Baru</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Input Detail Rekening</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nama Bank Resmi</label>
                  <input 
                    type="text"
                    placeholder="Contoh: BANK BCA" 
                    value={newBank.bankName} 
                    onChange={(e) => setNewBank({...newBank, bankName: e.target.value.toUpperCase()})} 
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 text-sm font-black outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nomor Rekening</label>
                  <input 
                    type="number"
                    placeholder="1234567890" 
                    value={newBank.accountNumber} 
                    onChange={(e) => setNewBank({...newBank, accountNumber: e.target.value})} 
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 text-lg font-mono font-black outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all tracking-widest" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atas Nama (A.N)</label>
                  <input 
                    type="text"
                    placeholder="PT FLASH GLOBAL LOGISTIK" 
                    value={newBank.accountName} 
                    onChange={(e) => setNewBank({...newBank, accountName: e.target.value.toUpperCase()})} 
                    className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-slate-900 text-sm font-black outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all uppercase" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tema Visual Kartu</label>
                  <div className="relative">
                    <select 
                      value={newBank.color} 
                      onChange={(e) => setNewBank({...newBank, color: e.target.value})}
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 text-slate-900 text-sm font-bold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                    >
                      {BANK_COLOR_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50/50 shrink-0 flex flex-col-reverse sm:flex-row gap-3 justify-end">
                <AdminButton onClick={() => setIsModalOpen(false)} variant="outline" className="h-12 px-6 w-full sm:w-auto bg-white border-slate-300 font-bold">Batal</AdminButton>
                <AdminButton onClick={handleAddBankSubmit} className="h-12 px-8 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 font-bold border-blue-700">
                  <Plus className="w-4 h-4 mr-1.5" /> Tambah Rekening
                </AdminButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}