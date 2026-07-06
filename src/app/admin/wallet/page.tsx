"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, Plus, Search, ArrowUpCircle, 
  ArrowDownCircle, UserCircle, CheckCircle2, AlertCircle, History 
} from "lucide-react";
import { db } from "@/lib/firebase";
// PERBAIKAN: Menambahkan addDoc ke dalam import
import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp, increment, addDoc } from "firebase/firestore";

interface DriverWallet {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  balance: number;
}

export default function AdminDriverWalletPage() {
  const [drivers, setDrivers] = useState<DriverWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // State untuk form tambah sopir
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: "", phone: "", vehicleType: "Motor" });
  
  // State untuk mutasi (Top Up / Tarik)
  const [showMutasiModal, setShowMutasiModal] = useState(false);
  const [mutasiType, setMutasiType] = useState<"topup" | "withdraw">("topup");
  const [selectedDriver, setSelectedDriver] = useState<DriverWallet | null>(null);
  const [mutasiAmount, setMutasiAmount] = useState<number | "">("");

  const [toast, setToast] = useState<{ type: "success" | "error", msg: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "driver_wallets"));
      const driversList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DriverWallet[];
      setDrivers(driversList);
    } catch (error) {
      console.error("Gagal menarik data dompet sopir:", error);
      showToast("error", "Gagal memuat data dari database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      // Gunakan nomor HP sebagai ID Dokumen agar unik
      const driverId = `DRV-${newDriver.phone}`; 
      await setDoc(doc(db, "driver_wallets", driverId), {
        name: newDriver.name,
        phone: newDriver.phone,
        vehicleType: newDriver.vehicleType,
        balance: 0, // Saldo awal 0
        createdAt: serverTimestamp()
      });
      
      showToast("success", "Sopir berhasil didaftarkan.");
      setShowAddModal(false);
      setNewDriver({ name: "", phone: "", vehicleType: "Motor" });
      fetchDrivers();
    } catch (error) {
      console.error("Gagal mendaftar sopir:", error);
      showToast("error", "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMutasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver || !mutasiAmount) return;

    const amount = Number(mutasiAmount);
    if (amount <= 0) {
      showToast("error", "Nominal harus lebih dari 0.");
      return;
    }

    if (mutasiType === "withdraw" && amount > selectedDriver.balance) {
      showToast("error", "Saldo sopir tidak mencukupi untuk ditarik.");
      return;
    }

    setIsProcessing(true);
    try {
      const driverRef = doc(db, "driver_wallets", selectedDriver.id);
      
      // Menggunakan atomic increment agar aman dari race condition
      const valueChange = mutasiType === "topup" ? amount : -amount;
      
      await updateDoc(driverRef, {
        balance: increment(valueChange),
        lastMutasi: serverTimestamp()
      });

      // Catat di log history mutasi
      await addDoc(collection(db, "wallet_logs"), {
        driverId: selectedDriver.id,
        driverName: selectedDriver.name,
        type: mutasiType,
        amount: amount,
        timestamp: serverTimestamp(),
        adminNote: `Manual ${mutasiType} by Admin`
      });

      showToast("success", `Berhasil ${mutasiType === 'topup' ? 'Top-Up' : 'Tarik'} Rp ${amount.toLocaleString('id-ID')}`);
      setShowMutasiModal(false);
      setMutasiAmount("");
      fetchDrivers(); // Refresh data layar
    } catch (error) {
      console.error("Gagal mutasi:", error);
      showToast("error", "Transaksi gagal diproses.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-8 pb-10">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`fixed top-10 right-10 z-50 p-4 rounded-xl font-bold text-sm border flex items-center gap-3 shadow-xl ${toast.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-400' : 'bg-red-950 border-red-500 text-red-400'}`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Wallet className="w-6 h-6 text-purple-400" /> Dompet Deposit Sopir
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl leading-relaxed">
            Sistem closed-loop. Kelola saldo jaminan mitra untuk pemotongan komisi otomatis saat order COD tunai selesai.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 shrink-0">
          <Plus className="w-4 h-4" /> Daftar Sopir Baru
        </button>
      </div>

      {/* Panel Search & List */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Cari nama atau no. HP sopir..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-purple-500 text-sm font-medium"
            />
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Total {filteredDrivers.length} Mitra Aktif
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-10 text-center text-slate-500 font-bold animate-pulse">Memuat data dompet...</div>
          ) : filteredDrivers.length === 0 ? (
            <div className="p-10 text-center text-slate-500">Tidak ada data sopir ditemukan.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4 pl-6 font-bold">Identitas Sopir</th>
                  <th className="p-4 font-bold">Armada</th>
                  <th className="p-4 font-bold">Saldo Deposit</th>
                  <th className="p-4 pr-6 font-bold text-right">Aksi Mutasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <UserCircle className="w-8 h-8 text-slate-500" />
                        <div>
                          <p className="text-sm font-bold text-white">{driver.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{driver.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-300 font-medium">{driver.vehicleType}</td>
                    <td className="p-4">
                      <span className={`text-sm font-black ${driver.balance < 15000 ? 'text-red-400' : 'text-emerald-400'}`}>
                        Rp {driver.balance.toLocaleString('id-ID')}
                      </span>
                      {driver.balance < 15000 && <p className="text-[10px] text-red-500 mt-0.5">Saldo Minim!</p>}
                    </td>
                    <td className="p-4 pr-6 flex justify-end gap-2">
                      <button 
                        onClick={() => { setSelectedDriver(driver); setMutasiType("topup"); setShowMutasiModal(true); }}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors tooltip-trigger"
                        title="Top Up Saldo"
                      >
                        <ArrowUpCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => { setSelectedDriver(driver); setMutasiType("withdraw"); setShowMutasiModal(true); }}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors tooltip-trigger"
                        title="Tarik Saldo Tunai"
                      >
                        <ArrowDownCircle className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL: DAFTAR SOPIR BARU */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowAddModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-6">Pendaftaran Sopir Baru</h2>
              <form onSubmit={handleAddDriver} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Nama Lengkap</label>
                  <input type="text" required value={newDriver.name} onChange={(e) => setNewDriver({...newDriver, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500" placeholder="Ketik nama sopir..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Nomor WhatsApp Aktif</label>
                  <input type="tel" required value={newDriver.phone} onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500" placeholder="0812..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Jenis Kendaraan</label>
                  <select value={newDriver.vehicleType} onChange={(e) => setNewDriver({...newDriver, vehicleType: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-purple-500 appearance-none">
                    <option value="Motor">Motor Kurir</option>
                    <option value="Mobil Hatchback/MPV">Mobil (Hatchback/MPV)</option>
                    <option value="Pickup">Pickup Bak/Box</option>
                    <option value="Truk Engkel">Truk Engkel</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors">Batal</button>
                  <button type="submit" disabled={isProcessing} className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center">
                    {isProcessing ? "Menyimpan..." : "Daftarkan Mitra"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: MUTASI SALDO */}
      <AnimatePresence>
        {showMutasiModal && selectedDriver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isProcessing && setShowMutasiModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
              {/* Colored top border */}
              <div className={`absolute top-0 left-0 w-full h-1.5 ${mutasiType === 'topup' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl ${mutasiType === 'topup' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{mutasiType === 'topup' ? 'Setor Top-Up Saldo' : 'Tarik Saldo Tunai'}</h2>
                  <p className="text-xs text-slate-400">{selectedDriver.name} • {selectedDriver.phone}</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-400">Saldo Saat Ini</span>
                <span className="text-lg font-black text-white">Rp {selectedDriver.balance.toLocaleString('id-ID')}</span>
              </div>

              <form onSubmit={handleMutasi} className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block">Masukkan Nominal (Rp)</label>
                  <input 
                    type="number" 
                    required 
                    min="1000"
                    value={mutasiAmount} 
                    onChange={(e) => setMutasiAmount(e.target.value === "" ? "" : Number(e.target.value))} 
                    className={`w-full bg-slate-950 border-2 rounded-xl px-4 py-4 text-white text-xl font-black outline-none transition-colors text-center ${mutasiType === 'topup' ? 'border-slate-700 focus:border-emerald-500' : 'border-slate-700 focus:border-red-500'}`} 
                    placeholder="0" 
                  />
                </div>
                
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowMutasiModal(false)} className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors">Batal</button>
                  <button type="submit" disabled={isProcessing} className={`flex-1 py-3.5 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center ${mutasiType === 'topup' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>
                    {isProcessing ? "Memproses..." : "Konfirmasi Transaksi"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}