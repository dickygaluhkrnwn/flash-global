"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom"; // 🚀 SOLUSI PORTAL
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Plus, X, CheckCircle, 
  User, CreditCard, Camera, ShieldAlert, AlertTriangle, Trash2, Edit2,
  History, MapPin, Package, UserPlus, CheckCircle2
} from "lucide-react";
import { collection, query, where, setDoc, doc, serverTimestamp, getDoc, onSnapshot, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { OrderDetail } from "@/types/order";

// ==========================================
// UTILS
// ==========================================
const formatRupiah = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val || 0);

const getSafeMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj.toDate === 'function') {
      const dateObj = obj.toDate() as Date;
      return dateObj.getTime();
    }
  }
  return new Date(String(ts)).getTime();
};

interface FleetDriver {
  id: string;
  name: string;
  phone: string;
  status: string;
  fotoProfileUrl?: string;
  fotoKtpUrl?: string;
  fotoSimUrl?: string;
  simNumber: string;
  nik: string;
}

export default function DriverTab() {
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false); // State Portal
  const [drivers, setDrivers] = useState<FleetDriver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [vendorCompanyName, setVendorCompanyName] = useState("");
  const [toast, setToast] = useState<{type: "success"|"error", msg: string} | null>(null);

  // History Modal State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedHistoryDriver, setSelectedHistoryDriver] = useState<FleetDriver | null>(null);
  const [driverHistoryOrders, setDriverHistoryOrders] = useState<OrderDetail[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ name: "", phone: "", nik: "", simNumber: "" });
  
  // File State
  const [files, setFiles] = useState<{ profile: File|null, ktp: File|null, sim: File|null }>({ profile: null, ktp: null, sim: null });
  const [oldUrls, setOldUrls] = useState<{ profile: string, ktp: string, sim: string }>({ profile: "", ktp: "", sim: "" });

  const refs = {
    profile: useRef<HTMLInputElement>(null),
    ktp: useRef<HTMLInputElement>(null),
    sim: useRef<HTMLInputElement>(null),
  };

  // Mencegah Hydration Mismatch
  useEffect(() => setMounted(true), []);

  const showToast = (msg: string, type: "success"|"error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 🔄 REAL-TIME LISTENER
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const fetchVendorInfo = async () => {
      const vendorSnap = await getDoc(doc(db, "users", user.uid));
      if (vendorSnap.exists()) setVendorCompanyName(vendorSnap.data().companyName || vendorSnap.data().displayName || "Vendor");
    };
    fetchVendorInfo();

    const q = query(
      collection(db, "driver_wallets"), 
      where("partnerType", "==", "FleetDriver"),
      where("vendorId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as FleetDriver[];
      setDrivers(data);
      setIsLoading(false);
    }, (error) => {
      console.error(error);
      showToast("Gagal menyinkronkan data sopir.", "error");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleFileChange = (type: keyof typeof files, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleOpenAdd = () => {
    setModalMode("add");
    setEditingDriverId(null);
    setFormData({ name: "", phone: "", nik: "", simNumber: "" });
    setFiles({ profile: null, ktp: null, sim: null });
    setOldUrls({ profile: "", ktp: "", sim: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver: FleetDriver) => {
    setModalMode("edit");
    setEditingDriverId(driver.id);
    setFormData({ 
      name: driver.name || "", 
      phone: driver.phone || "", 
      nik: driver.nik || "", 
      simNumber: driver.simNumber || "" 
    });
    setFiles({ profile: null, ktp: null, sim: null }); 
    setOldUrls({ 
      profile: driver.fotoProfileUrl || "", 
      ktp: driver.fotoKtpUrl || "", 
      sim: driver.fotoSimUrl || "" 
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (modalMode === "add" && (!files.ktp || !files.sim)) {
      return showToast("Foto KTP dan SIM wajib diunggah!", "error");
    }

    setIsSaving(true);
    try {
      const [profileUrl, ktpUrl, simUrl] = await Promise.all([
        files.profile ? uploadToCloudinary(files.profile) : Promise.resolve(oldUrls.profile),
        files.ktp ? uploadToCloudinary(files.ktp) : Promise.resolve(oldUrls.ktp),
        files.sim ? uploadToCloudinary(files.sim) : Promise.resolve(oldUrls.sim)
      ]);

      const docId = modalMode === "add" 
        ? `PRT-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}` 
        : editingDriverId!;

      const payload = {
        id: docId, name: formData.name, phone: formData.phone, partnerType: "FleetDriver", 
        status: "Pending", 
        isSuspended: false, balance: 0, vendorId: user.uid, vendorName: vendorCompanyName,
        nik: formData.nik, simNumber: formData.simNumber, fotoProfileUrl: profileUrl, fotoKtpUrl: ktpUrl, fotoSimUrl: simUrl
      };

      if (modalMode === "add") Object.assign(payload, { createdAt: serverTimestamp() });
      else Object.assign(payload, { updatedAt: serverTimestamp() });

      await setDoc(doc(db, "driver_wallets", docId), payload, { merge: true });

      showToast(modalMode === "add" ? "Sopir berhasil didaftarkan!" : "Data sopir diperbarui. Menunggu review Admin.");
      setIsModalOpen(false);

    } catch (error) {
      console.error(error);
      showToast("Gagal menyimpan data. Silakan coba lagi.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDriver = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus data Karyawan "${name}" dari sistem?`)) return;
    try {
      await deleteDoc(doc(db, "driver_wallets", id));
      showToast(`Data sopir ${name} berhasil dihapus.`);
    } catch (error) {
      console.error(error);
      showToast("Gagal menghapus data. Periksa koneksi Anda.", "error");
    }
  };

  // 🚀 FITUR BARU: TARIK RIWAYAT ORDER PER SOPIR
  const handleOpenHistory = async (driver: FleetDriver) => {
    setSelectedHistoryDriver(driver);
    setIsHistoryOpen(true);
    setIsLoadingHistory(true);
    setDriverHistoryOrders([]);

    try {
      const q = query(collection(db, "orders"), where("driverId", "==", driver.id));
      const snap = await getDocs(q);
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderDetail));
      orders.sort((a, b) => getSafeMillis(b.updatedAt || b.createdAt) - getSafeMillis(a.updatedAt || a.createdAt));
      setDriverHistoryOrders(orders);
    } catch (error) {
      console.error("Gagal menarik riwayat", error);
      showToast("Gagal menarik riwayat sopir.", "error");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 🚀 RENDER MODALS DI DALAM PORTAL (TUTUP BOTTOM BAR GLOBAL)
  const renderModals = () => {
    if (!mounted) return null;
    return createPortal(
      <>
        {/* ========================================================= */}
        {/* MODAL TAMBAH/EDIT SOPIR (BOTTOM SHEET iOS)                */}
        {/* ========================================================= */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[999999] flex items-end justify-center font-sans">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)} />
              
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-white/90 backdrop-blur-2xl border-t border-white rounded-t-[2.5rem] w-full max-w-md relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]"
              >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 bg-slate-300/80 rounded-full mb-2" />
                </div>

                <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-blue-600"/> 
                      {modalMode === "add" ? "Pendaftaran Sopir" : "Edit Data Sopir"}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Manajemen Karyawan PT</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors active:scale-90 tap-highlight-transparent"><X size={18} strokeWidth={2.5}/></button>
                </div>

                <div className="px-6 py-6 overflow-y-auto flex-1 no-scrollbar space-y-6">
                  
                  {modalMode === "edit" && (
                    <div className="mb-2 bg-amber-50/80 backdrop-blur-md border border-amber-200 p-4 rounded-[1.25rem] flex gap-3 shadow-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                        Menyimpan perubahan akan mengembalikan status sopir menjadi <b className="font-black">Pending</b> untuk ditinjau ulang oleh Admin.
                      </p>
                    </div>
                  )}

                  <form id="form-sopir" onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">Nama Lengkap Sopir</label>
                      <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Sesuai KTP" className="w-full bg-white focus-visible:ring-blue-600/20 focus-visible:border-blue-600" />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">No. HP / WhatsApp Aktif</label>
                      <Input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="0812xxxxxx" className="w-full bg-white font-mono font-bold focus-visible:ring-blue-600/20 focus-visible:border-blue-600" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">No. NIK KTP</label>
                        <Input required type="number" value={formData.nik} onChange={e => setFormData({...formData, nik: e.target.value})} placeholder="16 Digit" className="w-full bg-white font-mono font-bold focus-visible:ring-blue-600/20 focus-visible:border-blue-600" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest">No. SIM</label>
                        <Input required value={formData.simNumber} onChange={e => setFormData({...formData, simNumber: e.target.value})} placeholder="B / B1 / B2" className="w-full bg-white font-mono font-bold uppercase focus-visible:ring-blue-600/20 focus-visible:border-blue-600" />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5"/> Upload Dokumen Legalitas</label>
                      <div className="grid grid-cols-3 gap-3">
                        <UploadBox label="Foto Diri" isUploaded={!!oldUrls.profile} file={files.profile} onClick={() => refs.profile.current?.click()} icon={<User className="w-5 h-5"/>} />
                        <UploadBox label="KTP" isRequired={modalMode === "add"} isUploaded={!!oldUrls.ktp} file={files.ktp} onClick={() => refs.ktp.current?.click()} icon={<ShieldAlert className="w-5 h-5"/>} />
                        <UploadBox label="SIM" isRequired={modalMode === "add"} isUploaded={!!oldUrls.sim} file={files.sim} onClick={() => refs.sim.current?.click()} icon={<CreditCard className="w-5 h-5"/>} />
                      </div>
                    </div>

                    {/* Hidden Inputs */}
                    <input type="file" accept="image/*" ref={refs.profile} onChange={e => handleFileChange('profile', e)} className="hidden" />
                    <input type="file" accept="image/*" ref={refs.ktp} onChange={e => handleFileChange('ktp', e)} className="hidden" />
                    <input type="file" accept="image/*" ref={refs.sim} onChange={e => handleFileChange('sim', e)} className="hidden" />
                  </form>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white/90 backdrop-blur-md pb-safe shrink-0">
                  <Button 
                    type="submit" 
                    form="form-sopir" 
                    disabled={isSaving} 
                    variant="primary"
                    size="lg"
                    className="w-full h-14 bg-gradient-to-b from-blue-600 to-blue-700 border-blue-800 shadow-blue-600/30 gap-2"
                  >
                    {isSaving ? "Memproses Data..." : <><CheckCircle2 className="w-5 h-5"/> Simpan Data Sopir</>}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* MODAL RIWAYAT ORDER SOPIR (BOTTOM SHEET)                  */}
        {/* ========================================================= */}
        <AnimatePresence>
          {isHistoryOpen && selectedHistoryDriver && (
            <div className="fixed inset-0 z-[999999] flex items-end justify-center font-sans">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsHistoryOpen(false)} />
              
              <motion.div 
                initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-white/90 backdrop-blur-2xl border-t border-white rounded-t-[2.5rem] w-full max-w-md relative z-10 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] flex flex-col max-h-[85vh]"
              >
                <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-12 h-1.5 bg-slate-300/80 rounded-full mb-2" />
                </div>

                <div className="px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <History className="w-5 h-5 text-blue-600"/> Riwayat Sopir
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{selectedHistoryDriver.name}</p>
                  </div>
                  <button onClick={() => setIsHistoryOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors active:scale-90 tap-highlight-transparent"><X size={18} strokeWidth={2.5}/></button>
                </div>

                <div className="px-6 py-6 overflow-y-auto flex-1 no-scrollbar space-y-4">
                  {isLoadingHistory ? (
                    <div className="flex flex-col items-center justify-center h-40">
                      <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-3 shadow-sm"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Mencari rekam jejak...</p>
                    </div>
                  ) : driverHistoryOrders.length === 0 ? (
                    <div className="glass-card bg-slate-50 border border-slate-200 border-dashed rounded-[2rem] p-8 text-center flex flex-col items-center shadow-sm">
                      <div className="w-14 h-14 bg-white rounded-[1.25rem] flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                        <Package className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-black text-slate-800 tracking-tight">Belum Ada Riwayat</p>
                      <p className="text-xs font-medium text-slate-500 mt-1 max-w-[200px] leading-relaxed">Sopir ini belum pernah mengerjakan atau menyelesaikan order apapun.</p>
                    </div>
                  ) : (
                    driverHistoryOrders.map(order => {
                      const destObj = order.destinations && order.destinations.length > 0 ? order.destinations[0] : null;
                      const destAddr = destObj?.address || order.destination || "Alamat tidak diketahui";
                      const earned = order.finalGrandTotal || order.breakdown?.grandTotal || order.totalCost || 0;
                      
                      const tsMillis = getSafeMillis(order.updatedAt || order.createdAt);
                      const dateStr = tsMillis > 0 ? new Date(tsMillis).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
                      const isDone = order.status === "Selesai";

                      return (
                        <div key={order.id} className="glass-card bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm">
                          <div className="flex justify-between items-start mb-4">
                            <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", isDone ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200')}>
                              {order.status}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{dateStr}</span>
                          </div>
                          
                          <div className="flex items-start gap-3 mb-4">
                            <div className="mt-0.5 bg-slate-50 shadow-sm p-1.5 rounded-full border border-slate-100 shrink-0">
                              <MapPin className="w-4 h-4 text-slate-400" />
                            </div>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed line-clamp-2">{destAddr}</p>
                          </div>

                          <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-5 px-5 pb-1">
                            <div>
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Resi AWB</p>
                              <p className="text-xs font-mono font-black text-slate-600">#{order.id.substring(0,8)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Omset Order</p>
                              <p className="text-sm font-black text-emerald-600 tracking-tight">{formatRupiah(earned)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>,
      document.body
    );
  };

  return (
    <div className="space-y-4">
      {/* 🚀 TOAST GLOBAL (PORTAL READY) */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={cn(
            "fixed top-4 left-4 right-4 z-[9999999] p-4 rounded-[1.25rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 backdrop-blur-md border",
            toast.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-white" : "bg-red-500/90 border-red-400 text-white"
          )}>
            {toast.type === "success" ? <CheckCircle size={24} /> : <AlertTriangle size={24} />}
            <p className="text-sm font-bold tracking-tight">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RENDER MODAL DARI PORTAL */}
      {renderModals()}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" /> Daftar Sopir PT
        </h2>
        <button 
          onClick={handleOpenAdd} 
          className="bg-gradient-to-b from-blue-500 to-blue-600 text-white text-[10px] uppercase tracking-widest font-black px-4 py-2.5 rounded-full shadow-[0_4px_15px_rgba(37,99,235,0.3)] hover:shadow-blue-500/50 border border-blue-700 transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Plus size={14} strokeWidth={3} /> Daftarkan Baru
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin shadow-sm mb-3"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Data Sopir...</p>
        </div>
      ) : drivers.length === 0 ? (
        <div className="glass-card bg-blue-50/50 border border-blue-100 rounded-[2rem] p-8 text-center shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-100 rounded-[1.25rem] flex items-center justify-center mb-4 border border-white shadow-sm">
            <Users className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-sm font-black text-slate-800 tracking-tight">Belum Ada Sopir Terdaftar</h3>
          <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed mb-6 max-w-[220px]">Tambahkan data karyawan sopir yang bekerja di bawah naungan PT Anda.</p>
          <Button 
            variant="primary" 
            size="md"
            onClick={handleOpenAdd} 
            className="w-full bg-gradient-to-b from-blue-500 to-blue-600 border-blue-700 shadow-blue-500/30 text-xs font-bold shadow-lg"
          >
            <Plus size={16} className="mr-1" /> Daftarkan Sopir Sekarang
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {drivers.map(driver => (
              <motion.div 
                key={driver.id} 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.9 }} 
                className="glass-card bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] overflow-hidden relative border border-slate-200 shadow-inner shrink-0">
                    {driver.fotoProfileUrl ? <Image src={driver.fotoProfileUrl} fill className="object-cover" alt="" /> : <User className="w-6 h-6 text-slate-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"/>}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-black text-slate-800 text-base tracking-tight truncate">{driver.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                      <CreditCard className="w-3 h-3 text-blue-400"/> NIK: {driver.nik}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full pt-4 border-t border-slate-100">
                  {driver.status === "Active" ? (
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm">Aktif Mengaspal</span>
                  ) : (
                    <span className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm animate-pulse">Menunggu Verifikasi</span>
                  )}
                  
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenHistory(driver)} className="w-9 h-9 flex items-center justify-center bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm active:scale-90 tap-highlight-transparent" title="Riwayat Order">
                      <History className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpenEdit(driver)} className="w-9 h-9 flex items-center justify-center bg-blue-50 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 shadow-sm active:scale-90 tap-highlight-transparent" title="Edit Data">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteDriver(driver.id, driver.name)} className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-xl transition-colors border border-red-200 shadow-sm active:scale-90 tap-highlight-transparent" title="Hapus Karyawan">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// APPLE-STYLE UPLOAD BOX COMPONENT
// --------------------------------------------------------------------------
function UploadBox({ label, file, onClick, isRequired = false, isUploaded = false, icon }: { label: string, file: File | null, onClick: () => void, isRequired?: boolean, isUploaded?: boolean, icon: React.ReactNode }) {
  const showSuccess = file || isUploaded;
  return (
    <div onClick={onClick} className={cn(
      "cursor-pointer border-2 rounded-[1rem] p-3 flex flex-col items-center justify-center text-center transition-all h-28 group tap-highlight-transparent active:scale-95 shadow-sm",
      showSuccess ? "border-emerald-400 bg-emerald-50/50" : "border-slate-200 border-dashed bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
    )}>
      <div className={cn("mb-2 w-8 h-8 rounded-lg flex items-center justify-center transition-colors border", showSuccess ? "bg-emerald-100 text-emerald-600 border-emerald-200" : "bg-white text-slate-400 border-slate-200 group-hover:text-blue-500 group-hover:border-blue-200 group-hover:shadow-sm")}>
        {showSuccess ? <CheckCircle2 className="w-4 h-4" /> : icon}
      </div>
      <p className={cn("text-[9px] font-black uppercase tracking-widest leading-tight", showSuccess ? "text-emerald-700" : "text-slate-600")}>
        {label} {isRequired && !showSuccess && <span className="text-red-500 ml-0.5">*</span>}
      </p>
      {file && <p className="text-[8px] text-emerald-600 mt-1 truncate w-full px-1 font-bold">{file.name}</p>}
      {!file && isUploaded && <p className="text-[8px] text-emerald-600 mt-1 truncate w-full px-1 font-bold">Terunggah</p>}
    </div>
  );
}