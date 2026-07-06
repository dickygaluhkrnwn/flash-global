"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Globe, Map, Truck, Search, 
  CheckCircle2, AlertCircle, Send, 
  FileText, UserPlus, Navigation
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";

// --- INTERFACES ---
interface DestinationData {
  address?: string;
  detail?: string;
  receiverName?: string;
  receiverPhone?: string;
  [key: string]: unknown; // Mengizinkan field lain tanpa pakai 'any'
}

interface OrderData {
  id: string;
  serviceType: string;
  vehicleName: string;
  totalWeight: number;
  status: string;
  origin: { address: string };
  destinations: DestinationData[];
  driverId?: string;
  driverName?: string;
  breakdown: { grandTotal: number };
}

interface QuoteData {
  id: string;
  serviceType: string; // Export / Import
  originCountry: string;
  destCountry: string;
  weight: number;
  status: string;
  offeredPrice?: number;
  customsDocUrl?: string;
}

interface DriverData {
  id: string;
  name: string;
  vehicleType: string;
  isSuspended: boolean;
}

export default function AdminOperationalPage() {
  const [activeTab, setActiveTab] = useState<"domestik" | "global" | "tracking">("domestik");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Data States
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [drivers, setDrivers] = useState<DriverData[]>([]);

  // Modal Assign Driver State
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Modal Penawaran Global State
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({ price: "", docUrl: "" });

  const fetchOperationalData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Orders (Domestik)
      const orderQ = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const orderSnap = await getDocs(orderQ);
      setOrders(orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as OrderData)));

      // 2. Fetch Quotes (Global)
      const quoteQ = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
      const quoteSnap = await getDocs(quoteQ);
      setQuotes(quoteSnap.docs.map(d => ({ id: d.id, ...d.data() } as QuoteData)));

      // 3. Fetch Drivers (Untuk Assign Manual)
      const driverSnap = await getDocs(collection(db, "driver_wallets"));
      setDrivers(driverSnap.docs.map(d => ({ id: d.id, ...d.data() } as DriverData)));

    } catch (error) {
      console.error("Gagal menarik data operasional:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationalData();
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  // HANDLER: Update Status Order Domestik
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
      showToast("success", `Status pesanan diperbarui menjadi: ${newStatus}`);
      fetchOperationalData();
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal memperbarui status.");
    }
  };

  // HANDLER: Assign Driver ke Order
  const handleAssignDriver = async (driverId: string, driverName: string) => {
    if (!selectedOrderId) return;
    try {
      await updateDoc(doc(db, "orders", selectedOrderId), {
        driverId: driverId,
        driverName: driverName,
        status: "Menuju Lokasi Jemput" // Auto update status
      });
      showToast("success", `Sopir ${driverName} berhasil ditugaskan!`);
      setShowDriverModal(false);
      fetchOperationalData();
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal menugaskan sopir.");
    }
  };

  // HANDLER: Submit Penawaran & Dokumen Kargo Global
  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteId) return;
    try {
      await updateDoc(doc(db, "quotes", selectedQuoteId), {
        offeredPrice: Number(quoteForm.price),
        customsDocUrl: quoteForm.docUrl,
        status: "Menunggu Persetujuan Klien"
      });
      showToast("success", "Penawaran harga dan dokumen berhasil dikirim ke klien.");
      setShowQuoteModal(false);
      fetchOperationalData();
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal mengirim penawaran.");
    }
  };

  const filteredOrders = orders.filter(o => o.id.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredQuotes = quotes.filter(q => q.id.toLowerCase().includes(searchQuery.toLowerCase()));

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

      {/* Header Modul */}
      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Send className="w-6 h-6 text-blue-500" /> Dispatch & Operational Node
          </h1>
          <p className="text-slate-400 text-sm mt-1">Pusat kendali pergerakan kargo domestik, forwarding global, dan radar armada aktif.</p>
        </div>
        
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Cari ID Pesanan (Manifest)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-white outline-none text-xs font-semibold focus:border-blue-500"
          />
        </div>
      </div>

      {/* TABULASI MENU */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
        <TabButton id="domestik" icon={Package} label="Order Domestik (Kurir)" isActive={activeTab === "domestik"} onClick={() => { setActiveTab("domestik"); setSearchQuery(""); }} />
        <TabButton id="global" icon={Globe} label="Order Global (Kargo)" isActive={activeTab === "global"} onClick={() => { setActiveTab("global"); setSearchQuery(""); }} />
        <TabButton id="tracking" icon={Map} label="Live Tracking Radar" isActive={activeTab === "tracking"} onClick={() => { setActiveTab("tracking"); setSearchQuery(""); }} />
      </div>

      {/* AREA WORKSPACE */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-[500px]">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 font-bold animate-pulse text-sm">Mensinkronkan Log Logistik...</div>
        ) : (
          <div className="p-6">
            
            {/* ========================================= */}
            {/* TAB 1: ORDER DOMESTIK (LOKAL)             */}
            {/* ========================================= */}
            {activeTab === "domestik" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      <th className="p-4 pl-6">ID Manifest & Rute</th>
                      <th className="p-4">Info Armada</th>
                      <th className="p-4">Status & Sopir</th>
                      <th className="p-4 pr-6 text-right">Tindakan Operasional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredOrders.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada data order domestik.</td></tr>
                    )}
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-mono font-bold text-white text-sm mb-1 uppercase">#{o.id.substring(0,8)}</p>
                          <div className="space-y-0.5 text-[11px] text-slate-400">
                            <p className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Asal: {o.origin?.address || "Unknown"}</p>
                            <p className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> {o.destinations?.length || 1} Titik Tujuan Drop</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded text-[10px]">{o.vehicleName}</span>
                          <p className="text-[10px] text-slate-400 mt-1.5 font-bold">Total: {o.totalWeight} Kg</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            o.status.includes("Selesai") ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900" :
                            o.status.includes("Menunggu") ? "bg-amber-950/50 text-amber-400 border border-amber-900" :
                            "bg-blue-950/50 text-blue-400 border border-blue-900"
                          }`}>
                            {o.status}
                          </span>
                          <div className="mt-2 text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {o.driverName || "Belum ada sopir"}
                          </div>
                        </td>
                        <td className="p-4 pr-6 flex flex-col items-end gap-2">
                          <select 
                            value={o.status}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-white text-[10px] font-bold rounded px-2 py-1.5 outline-none focus:border-blue-500 w-36"
                          >
                            <option value="Menunggu Pembayaran">Draft / Pending Pay</option>
                            <option value="Menunggu Kurir">Mencari Kurir</option>
                            <option value="Menuju Lokasi Jemput">Sopir OTW Jemput</option>
                            <option value="Picked Up (In Transit)">Barang Dibawa (Transit)</option>
                            <option value="Delivered (Selesai)">Selesai (Delivered)</option>
                          </select>
                          
                          {!o.driverId && (
                            <button 
                              onClick={() => { setSelectedOrderId(o.id); setShowDriverModal(true); }}
                              className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 px-2 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition-colors w-36 justify-center"
                            >
                              <UserPlus className="w-3 h-3" /> Assign Manual Sopir
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ========================================= */}
            {/* TAB 2: ORDER GLOBAL (FORWARDING / QUOTES) */}
            {/* ========================================= */}
            {activeTab === "global" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                      <th className="p-4 pl-6">ID & Tipe Rute</th>
                      <th className="p-4">Volume Kargo</th>
                      <th className="p-4">Status & Harga Penawaran</th>
                      <th className="p-4 pr-6 text-right">Tindakan Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredQuotes.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada permintaan kargo global.</td></tr>
                    )}
                    {filteredQuotes.map(q => (
                      <tr key={q.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-mono font-bold text-white text-sm mb-1 uppercase">#{q.id.substring(0,8)}</p>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${q.serviceType === 'Export' ? 'bg-purple-950/30 text-purple-400 border-purple-900' : 'bg-cyan-950/30 text-cyan-400 border-cyan-900'}`}>
                            {q.serviceType}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-2 font-bold">{q.originCountry} &rarr; {q.destCountry}</p>
                        </td>
                        <td className="p-4 font-bold text-slate-300">{q.weight} Kg</td>
                        <td className="p-4">
                          <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-[10px] font-bold uppercase">{q.status}</span>
                          <p className="text-xs font-black text-[#C5A059] mt-2">
                            {q.offeredPrice ? formatRupiah(q.offeredPrice) : "Belum ada penawaran"}
                          </p>
                        </td>
                        <td className="p-4 pr-6 flex justify-end">
                          <button 
                            onClick={() => { setSelectedQuoteId(q.id); setQuoteForm({ price: q.offeredPrice?.toString() || "", docUrl: q.customsDocUrl || "" }); setShowQuoteModal(true); }}
                            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" /> Proses Penawaran & Dokumen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ========================================= */}
            {/* TAB 3: LIVE TRACKING SYSTEM (RADAR NODE)  */}
            {/* ========================================= */}
            {activeTab === "tracking" && (
              <div className="relative w-full h-[600px] bg-[#0B0F19] rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center group">
                {/* Grid Pattern Background untuk kesan Peta Militer */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
                
                {/* Radar Sweep Animation */}
                <div className="absolute w-[800px] h-[800px] rounded-full border border-blue-500/10 flex items-center justify-center">
                  <div className="w-[600px] h-[600px] rounded-full border border-blue-500/20 flex items-center justify-center">
                    <div className="w-[400px] h-[400px] rounded-full border border-blue-500/30"></div>
                  </div>
                  {/* Sweep Line */}
                  <div className="absolute top-1/2 left-1/2 w-[400px] h-[2px] bg-gradient-to-r from-transparent to-blue-500 origin-left animate-[spin_4s_linear_infinite] opacity-50"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  <Navigation className="w-16 h-16 text-blue-500/50 mb-4 animate-pulse" />
                  <h3 className="text-white font-black tracking-widest text-lg">MAPBOX LIVE NODE API</h3>
                  <p className="text-slate-500 text-xs font-mono mt-2 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-800">STATUS: MENUNGGU INTEGRASI KORDINAT GPS KLIEN</p>
                </div>

                {/* Simulasi Titik Kurir (Dummy Nodes) */}
                <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981] animate-ping"></div>
                <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_#10b981] animate-ping" style={{ animationDelay: "1s" }}></div>
                <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-amber-500 rounded-full shadow-[0_0_15px_#f59e0b] animate-ping" style={{ animationDelay: "0.5s" }}></div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* MODAL: ASSIGN MANUAL SOPIR                */}
      {/* ========================================= */}
      <AnimatePresence>
        {showDriverModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDriverModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-2">Penugasan Sopir Manual</h2>
              <p className="text-xs text-slate-400 mb-6">Pilih mitra kurir aktif untuk mengeksekusi manifest ini secara paksa (override).</p>
              
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {drivers.filter(d => !d.isSuspended).length === 0 ? (
                  <p className="text-xs text-center text-red-400 py-4 bg-red-950/20 rounded-xl border border-red-900/30">Tidak ada sopir aktif yang tersedia.</p>
                ) : (
                  drivers.filter(d => !d.isSuspended).map(driver => (
                    <button 
                      key={driver.id}
                      onClick={() => handleAssignDriver(driver.id, driver.name)}
                      className="w-full text-left p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-blue-500 hover:bg-blue-950/20 transition-all flex justify-between items-center group"
                    >
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{driver.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{driver.vehicleType}</p>
                      </div>
                      <UserPlus className="w-4 h-4 text-slate-600 group-hover:text-blue-400" />
                    </button>
                  ))
                )}
              </div>
              <button onClick={() => setShowDriverModal(false)} className="w-full mt-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-colors">Batal</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================= */}
      {/* MODAL: PENAWARAN HARGA GLOBAL             */}
      {/* ========================================= */}
      <AnimatePresence>
        {showQuoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuoteModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-2">Proses Penawaran Forwarding</h2>
              <p className="text-xs text-slate-400 mb-6">Input harga final penawaran kargo (termasuk pajak) dan tautan dokumen bea cukai (Customs).</p>
              
              <form onSubmit={handleSubmitQuote} className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1.5 block uppercase">Harga Penawaran (IDR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                    <input type="number" required value={quoteForm.price} onChange={(e) => setQuoteForm({...quoteForm, price: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3.5 text-white font-black outline-none focus:border-emerald-500" placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 mb-1.5 block uppercase">Tautan Dokumen Bea Cukai (URL)</label>
                  <input type="url" value={quoteForm.docUrl} onChange={(e) => setQuoteForm({...quoteForm, docUrl: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-xs outline-none focus:border-emerald-500" placeholder="https://drive.google.com/..." />
                  <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">*Upload dokumen fisik persetujuan cukai ke Google Drive/Cloud, lalu paste link-nya di sini agar dapat diunduh oleh klien.</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowQuoteModal(false)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs transition-colors">Batal</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2">
                    <Send className="w-3.5 h-3.5" /> Kirim Penawaran
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

// Sub-komponen helper tombol tabulasi rute
function TabButton({ icon: Icon, label, isActive, onClick }: { id: string; icon: React.ElementType; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3.5 font-bold text-xs transition-all relative outline-none shrink-0 ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>
      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-slate-500'}`} /> {label}
      {isActive && <motion.div layoutId="activeOpTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
    </button>
  );
}