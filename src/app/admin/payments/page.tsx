"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Save, CheckCircle2, AlertCircle, 
  Building2, QrCode, RefreshCw, ShieldAlert, 
  Plus, Trash2, X, Upload, CreditCard, Image as ImageIcon,
  Activity
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// --- IMPORT UI KIT PREMIUM ---
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { PaymentMethod, PaymentConfig } from "@/types/finance";

const BANK_COLOR_OPTIONS = [
  { label: "Biru (BCA / Mandiri / BNI)", value: "bg-blue-600" },
  { label: "Kuning (Mandiri / Maybank)", value: "bg-amber-500" },
  { label: "Hijau (BSI / Tokopedia)", value: "bg-emerald-600" },
  { label: "Ungu (OVO / Muamalat)", value: "bg-purple-600" },
  { label: "Merah (CIMB / Telkomsel)", value: "bg-red-600" },
  { label: "Cyan (Bank Jago / BNC)", value: "bg-cyan-500" },
  { label: "Gelap (Default)", value: "bg-slate-800" },
];

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  // Core Data
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    transferBank: [],
    qrisImageUrl: null
  });

  // State File QRIS
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [qrisPreview, setQrisPreview] = useState<string | null>(null);

  // State Modal Tambah Bank
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBank, setNewBank] = useState<PaymentMethod>({
    bankName: "",
    accountNumber: "",
    accountName: "PT FLASH GLOBAL LOGISTIK",
    color: "bg-blue-600"
  });

  // Tarik data saat halaman dimuat
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "payments");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as PaymentConfig;
          setPaymentConfig({
            transferBank: data.transferBank || [],
            qrisImageUrl: data.qrisImageUrl || null
          });
          if (data.qrisImageUrl) {
            setQrisPreview(data.qrisImageUrl);
          }
        }
      } catch (error) {
        console.error("Gagal menarik master data pembayaran:", error);
        showToast("error", "Gagal memuat konfigurasi dari database.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mencegah scroll body saat modal terbuka
  useEffect(() => {
    if (isModalOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isModalOpen]);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleQrisFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQrisFile(file);
      setQrisPreview(URL.createObjectURL(file));
    }
  };

  const uploadQrisToCloudinary = async (): Promise<string | null> => {
    if (!qrisFile) return paymentConfig.qrisImageUrl; // Jika tidak ada file baru, kembalikan URL lama

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error("Kredensial Cloudinary belum diatur.");
    }

    const imageFormData = new FormData();
    imageFormData.append("file", qrisFile);
    imageFormData.append("upload_preset", uploadPreset);

    const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: imageFormData,
    });

    const cloudData = await cloudinaryRes.json();
    if (cloudData.secure_url) {
      return cloudData.secure_url;
    } else {
      throw new Error("Gagal mengunggah QRIS ke server gambar.");
    }
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    try {
      // 1. Upload Gambar QRIS jika ada perubahan
      let finalQrisUrl = paymentConfig.qrisImageUrl;
      if (qrisFile) {
        showToast("success", "Mengunggah gambar QRIS...");
        finalQrisUrl = await uploadQrisToCloudinary();
      }

      const finalConfig = {
        transferBank: paymentConfig.transferBank,
        qrisImageUrl: finalQrisUrl,
        updatedAt: serverTimestamp(),
      };

      // 2. Simpan ke Firestore
      await setDoc(doc(db, "settings", "payments"), finalConfig, { merge: true });
      
      setPaymentConfig({ ...paymentConfig, qrisImageUrl: finalQrisUrl });
      setQrisFile(null); // Reset state file karena sudah tersimpan

      showToast("success", "Konfigurasi metode pembayaran berhasil diperbarui!");
    } catch (error: unknown) {
      console.error("Gagal menyimpan konfigurasi:", error);
      const errMsg = error instanceof Error ? error.message : "Gagal menyimpan konfigurasi ke database.";
      showToast("error", errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBankSubmit = () => {
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountName) {
      alert("Harap lengkapi semua field rekening bank!");
      return;
    }

    setPaymentConfig(prev => ({
      ...prev,
      transferBank: [...prev.transferBank, newBank]
    }));

    setIsModalOpen(false);
    setNewBank({ bankName: "", accountNumber: "", accountName: "PT FLASH GLOBAL LOGISTIK", color: "bg-blue-600" });
  };

  const handleDeleteBank = (index: number) => {
    if (confirm("Yakin ingin menghapus rekening ini?")) {
      const updatedBanks = paymentConfig.transferBank.filter((_, i) => i !== index);
      setPaymentConfig(prev => ({ ...prev, transferBank: updatedBanks }));
    }
  };

  // =========================================================================
  // GUARDS: DITEMPATKAN DI BAWAH SEMUA HOOKS AGAR TIDAK MELANGGAR ATURAN REACT
  // =========================================================================

  // RBAC GUARD (Hanya Superadmin & Finance)
  if (currentUser && currentUser.role !== 'superadmin' && currentUser.role !== 'admin_finance') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center font-sans">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6 opacity-50" />
        <h2 className="text-3xl font-black text-slate-800">Akses Ditolak</h2>
        <p className="text-slate-500 max-w-lg mt-3 text-lg">Modul Konfigurasi Pembayaran ini hanya dapat dikelola oleh Superadmin atau Divisi Finance.</p>
        <Button onClick={() => router.push("/admin")} variant="outline" className="mt-8">Kembali ke Dashboard</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center font-sans">
        <Activity className="w-10 h-10 text-[#C5A059] animate-pulse mb-4" />
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest animate-pulse">Memuat Modul Pembayaran...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 font-sans">
      
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-2xl ${toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toastMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER CONTROL PANEL */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Badge variant="gold" className="mb-3 px-3 py-1 shadow-sm inline-flex items-center gap-1.5">
            <CreditCard className="w-3 h-3 fill-current"/> Finance & Billing Panel
          </Badge>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
            Metode <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A059] to-[#A68345]">Pembayaran</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 max-w-2xl">Kelola daftar rekening bank aktif dan barcode QRIS yang akan ditampilkan pada halaman pembayaran Klien.</p>
        </div>
        
        <Button 
          onClick={handleSaveConfiguration}
          disabled={isSaving}
          variant="gold"
          className="w-full md:w-auto h-12 px-8 text-sm font-bold shrink-0"
        >
          {isSaving ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Menyimpan Data...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Publikasi & Simpan</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* KOLOM KIRI: TRANSFER BANK */}
        <div className="xl:col-span-7 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#C5A059]/10 text-[#C5A059] rounded-xl flex items-center justify-center shrink-0 border border-[#C5A059]/20">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Rekening Transfer Bank</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Daftar bank penerima pembayaran manual.</p>
                </div>
              </div>
              <Button onClick={() => setIsModalOpen(true)} variant="outline" size="sm" className="h-9 border-slate-300">
                <Plus className="w-4 h-4 mr-1.5" /> Tambah Bank
              </Button>
            </CardHeader>

            <CardContent className="p-6">
              {paymentConfig.transferBank.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Building2 className="w-10 h-10 text-slate-300 mb-3" />
                  <h4 className="text-slate-700 font-bold">Belum Ada Rekening Bank</h4>
                  <p className="text-slate-500 text-sm mt-1">Tambahkan rekening agar klien dapat melakukan pembayaran.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AnimatePresence>
                    {paymentConfig.transferBank.map((rek, index) => (
                      <motion.div key={index} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative group">
                        <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-white hover:border-[#C5A059] hover:shadow-md transition-all h-full flex flex-col justify-between">
                          <div className="space-y-1 mb-4">
                            <span className={cn("inline-block text-white font-black px-2.5 py-0.5 rounded text-[10px] tracking-wide", rek.color)}>{rek.bankName}</span>
                            <p className="font-mono font-black text-slate-900 text-lg tracking-wider mt-2">{rek.accountNumber}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{rek.accountName}</p>
                          </div>
                          
                          <button 
                            type="button" 
                            onClick={() => handleDeleteBank(index)}
                            className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                            title="Hapus Rekening"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* KOLOM KANAN: QRIS UPLOAD */}
        <div className="xl:col-span-5 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center gap-4 space-y-0">
              <div className="w-10 h-10 bg-[#7A171D]/10 text-[#7A171D] rounded-xl flex items-center justify-center shrink-0 border border-[#7A171D]/20">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">QRIS Pembayaran</h2>
                <p className="text-xs text-slate-500 mt-0.5">Barcode universal untuk e-wallet & m-banking.</p>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-4">
                
                {/* Upload Area */}
                <label className="block border-2 border-dashed border-slate-200 hover:border-[#C5A059] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 hover:bg-[#C5A059]/5 min-h-[280px] relative overflow-hidden group">
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleQrisFileChange} className="hidden" />
                  
                  <AnimatePresence mode="wait">
                    {qrisPreview ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-white p-3 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrisPreview} alt="QRIS Flash Global" className="max-w-full max-h-full object-contain rounded-xl" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <span className="bg-white text-slate-900 font-bold px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 transform group-hover:scale-105 transition-transform text-sm">
                            <Upload className="w-4 h-4" /> Ganti Gambar QRIS
                          </span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-slate-400 group-hover:text-[#C5A059] group-hover:scale-110 transition-all duration-300">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700">Unggah Gambar QRIS</p>
                          <p className="text-[11px] text-slate-400 mt-1 font-medium max-w-[200px] mx-auto">Gunakan gambar jelas dan tidak terpotong (Maks 5MB)</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </label>

                {qrisFile && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Gambar QRIS baru belum tersimpan. Jangan lupa klik Publikasi.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* MODAL TAMBAH BANK */}
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
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#C5A059]" /> Tambah Rekening Bank
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nama Bank (Cth: BCA)</label>
                  <Input 
                    placeholder="BCA" 
                    value={newBank.bankName} 
                    onChange={(e) => setNewBank({...newBank, bankName: e.target.value.toUpperCase()})} 
                    className="border-slate-200 uppercase font-bold" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nomor Rekening</label>
                  <Input 
                    type="number"
                    placeholder="1234567890" 
                    value={newBank.accountNumber} 
                    onChange={(e) => setNewBank({...newBank, accountNumber: e.target.value})} 
                    className="border-slate-200 font-mono font-bold text-lg tracking-wider" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Atas Nama (A.N)</label>
                  <Input 
                    placeholder="PT FLASH GLOBAL LOGISTIK" 
                    value={newBank.accountName} 
                    onChange={(e) => setNewBank({...newBank, accountName: e.target.value.toUpperCase()})} 
                    className="border-slate-200 uppercase font-bold" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tema Warna Label</label>
                  <select 
                    value={newBank.color} 
                    onChange={(e) => setNewBank({...newBank, color: e.target.value})}
                    className="flex w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-all outline-none focus:border-[#C5A059] focus:ring-4 focus:ring-[#C5A059]/10"
                  >
                    {BANK_COLOR_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex gap-4">
                <Button onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 border-slate-300">Batal</Button>
                <Button onClick={handleAddBankSubmit} variant="gold" className="flex-1 shadow-md">
                  <Plus className="w-4 h-4 mr-1.5" /> Tambah Rekening
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}