"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Globe, Map, Truck, Search, 
  CheckCircle2, AlertCircle, Send, 
  FileText, UserPlus, Navigation, Filter, SortDesc, Calendar, DollarSign, Weight, Box, ChevronRight, X, Clock
} from "lucide-react";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy, arrayUnion } from "firebase/firestore";

// --- IMPORT UI KIT ---
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// --- INTERFACES ---
interface DestinationData {
  address?: string;
  detail?: string;
  receiverName?: string;
  receiverPhone?: string;
  [key: string]: unknown; 
}

interface OrderData {
  id: string;
  serviceType: string;
  vehicleName: string;
  selectedVehicle?: string; // Ditambahkan untuk mengatasi error TypeScript
  totalWeight: number;
  weight?: number; // Ditambahkan untuk mengatasi error TypeScript
  status: string;
  origin: { address: string } | string | any;
  destination?: string;
  destDetail?: string;
  destinations?: DestinationData[];
  driverId?: string;
  driverName?: string;
  breakdown?: { grandTotal: number };
  totalCost?: number;
  createdAt?: any; 
  trackingHistory?: any[]; 
}

interface QuoteData {
  id: string;
  serviceType: string; 
  originCountry?: string;
  origin?: string; // Ditambahkan untuk sinkronisasi form
  destCountry?: string;
  destination?: string; // Ditambahkan untuk sinkronisasi form
  weight: number;
  status: string;
  offeredPrice?: number;
  customsDocUrl?: string;
  createdAt?: any;
}

interface DriverData {
  id: string;
  name: string;
  vehicleType: string;
  isSuspended: boolean;
}

export default function AdminOperationalPage() {
  const [activeTab, setActiveTab] = useState<"domestik" | "global" | "tracking">("domestik");
  
  // Fitur Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "heaviest" | "highest_value">("newest");

  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Master States Data
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [drivers, setDrivers] = useState<DriverData[]>([]);

  // Modal States
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({ price: "", docUrl: "" });

  // Modal Update Status & Log Waktu Dinamis
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [statusForm, setStatusForm] = useState({
    status: "",
    location: "Pusat Logistik Flash Global",
    description: "",
    timeMode: "auto", 
    customDate: ""
  });

  const fetchOperationalData = async () => {
    setIsLoading(true);
    try {
      const orderQ = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const orderSnap = await getDocs(orderQ);
      setOrders(orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as OrderData)));

      const quoteQ = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
      const quoteSnap = await getDocs(quoteQ);
      setQuotes(quoteSnap.docs.map(d => ({ id: d.id, ...d.data() } as QuoteData)));

      const driverSnap = await getDocs(collection(db, "driver_wallets"));
      setDrivers(driverSnap.docs.map(d => ({ id: d.id, ...d.data() } as DriverData)));
    } catch (error) {
      console.error("Gagal menarik data operasional:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchOperationalData(); }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  const openStatusModal = (order: OrderData) => {
    setStatusOrderId(order.id);
    setStatusForm({
      status: order.status,
      location: "Pusat Hub Penjemputan",
      description: "",
      timeMode: "auto",
      customDate: ""
    });
    setShowStatusModal(true);
  };

  const handleConfirmStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusOrderId) return;

    try {
      let finalLogDate = "";
      
      if (statusForm.timeMode === "auto") {
        const timestamp = new Date();
        finalLogDate = timestamp.toLocaleString("id-ID", {
          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
      } else {
        const customTimestamp = new Date(statusForm.customDate);
        finalLogDate = customTimestamp.toLocaleString("id-ID", {
          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
        });
      }

      let finalDesc = statusForm.description;
      if (!finalDesc) {
        if (statusForm.status.includes("Kurir")) finalDesc = "Sistem sedang mengalokasikan kurir terdekat untuk menjemput barang.";
        if (statusForm.status.includes("Jemput")) finalDesc = "Armada kurir Flash Global telah ditugaskan dan sedang bergerak menuju alamat asal.";
        if (statusForm.status.includes("Transit")) finalDesc = "Kargo berhasil diamankan oleh kurir kargo dan dalam perjalanan menuju pusat distribusi.";
        if (statusForm.status.includes("Selesai")) finalDesc = "Paket logistik sukses diserahterimakan kepada penerima sah.";
      }

      await updateDoc(doc(db, "orders", statusOrderId), {
        status: statusForm.status,
        trackingHistory: arrayUnion({
          status: statusForm.status,
          date: finalLogDate,
          description: finalDesc,
          location: statusForm.location
        })
      });

      showToast("success", "Manifes logistik dan timeline berhasil diperbarui secara live!");
      setShowStatusModal(false);
      fetchOperationalData();
    } catch (error) {
      console.error(error);
      showToast("error", "Gagal melakukan pembaruan log manifes.");
    }
  };

  const handleAssignDriver = async (driverId: string, driverName: string) => {
    if (!selectedOrderId) return;
    try {
      const timestamp = new Date();
      const formattedDate = timestamp.toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      });

      await updateDoc(doc(db, "orders", selectedOrderId), {
        driverId: driverId, 
        driverName: driverName, 
        status: "Menuju Lokasi Jemput",
        trackingHistory: arrayUnion({
          status: "Menuju Lokasi Jemput",
          date: formattedDate,
          description: `Sopir ${driverName} telah resmi ditunjuk untuk mengeksekusi penjemputan barang.`,
          location: "Pusat Distribusi Flash"
        })
      });
      showToast("success", `Sopir ${driverName} berhasil ditugaskan!`);
      setShowDriverModal(false);
      fetchOperationalData();
    } catch (error) { showToast("error", "Gagal menugaskan sopir."); }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteId) return;
    try {
      await updateDoc(doc(db, "quotes", selectedQuoteId), {
        offeredPrice: Number(quoteForm.price), customsDocUrl: quoteForm.docUrl, status: "Menunggu Persetujuan Klien"
      });
      showToast("success", "Penawaran kargo internasional berhasil dikirim!");
      setShowQuoteModal(false);
      fetchOperationalData();
    } catch (error) { showToast("error", "Gagal mengirim penawaran."); }
  };

  const renderOriginAddress = (origin: any) => {
    if (!origin) return "Alamat Tidak Terbaca";
    if (typeof origin === "string") return origin;
    return origin.address || "Koordinat Tersemat Tanpa Teks";
  };

  // ====================================================================
  // LOGIKA CERDAS: FILTER & SORTING BERGANDA (PERBAIKAN BUG)
  // ====================================================================
  const processedOrders = useMemo(() => {
    let result = [...orders];

    if (searchQuery) {
      result = result.filter(o => 
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        renderOriginAddress(o.origin).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterStatus !== "All") {
      result = result.filter(o => o.status.includes(filterStatus));
    }
    result.sort((a, b) => {
      const costA = a.breakdown?.grandTotal || a.totalCost || 0;
      const costB = b.breakdown?.grandTotal || b.totalCost || 0;
      
      // Fallback weight handling
      const weightA = a.totalWeight || a.weight || 0;
      const weightB = b.totalWeight || b.weight || 0;

      if (sortOrder === "newest") return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      if (sortOrder === "oldest") return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      if (sortOrder === "heaviest") return weightB - weightA;
      if (sortOrder === "highest_value") return costB - costA;
      return 0;
    });

    return result;
  }, [orders, searchQuery, filterStatus, sortOrder]);

  const processedQuotes = useMemo(() => {
    let result = [...quotes];
    if (searchQuery) {
      result = result.filter(q => 
        q.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.originCountry || q.origin)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.destCountry || q.destination)?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterStatus !== "All") result = result.filter(q => q.status.includes(filterStatus));
    result.sort((a, b) => {
      if (sortOrder === "newest") return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      if (sortOrder === "oldest") return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      if (sortOrder === "heaviest") return b.weight - a.weight;
      if (sortOrder === "highest_value") return (b.offeredPrice || 0) - (a.offeredPrice || 0);
      return 0;
    });
    return result;
  }, [quotes, searchQuery, filterStatus, sortOrder]);

  const totalPendapatan = orders.reduce((acc, curr) => acc + (curr.breakdown?.grandTotal || curr.totalCost || 0), 0);
  const totalPending = orders.filter(o => o.status.includes("Menunggu")).length;

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8 selection:bg-brand-maroon selection:text-white text-gray-800">
      
      {/* HEADER CONTROL & STATS (LIGHT PREMIUM) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-premium border-gray-100 overflow-hidden relative bg-white">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-brand-maroon/5 to-transparent pointer-events-none"></div>
          <CardContent className="p-8 flex items-center justify-between">
            <div>
              <Badge variant="default" className="bg-brand-maroon/10 text-brand-maroon border-brand-maroon/20 mb-3 font-bold uppercase tracking-wider">Operational Dispatch</Badge>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                Pusat Kendali Logistik
              </h1>
              <p className="text-gray-500 text-sm mt-2 font-medium leading-relaxed">Eksekusi manifes kargo lokal, data bea cukai global forwarding, serta radar lacak posisi kurir.</p>
            </div>
            <div className="w-16 h-16 bg-brand-maroon/10 rounded-2xl flex items-center justify-center shrink-0 border border-brand-maroon/20 hidden sm:flex">
              <Send className="w-7 h-7 text-brand-maroon" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-premium border-gray-100 overflow-hidden relative group bg-gradient-to-br from-white to-gray-50/50">
          <div className="absolute right-[-10%] bottom-[-20%] w-32 h-32 bg-emerald-500/10 rounded-full blur-[30px] group-hover:bg-emerald-500/20 transition-colors"></div>
          <CardContent className="p-8 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <DollarSign className="w-4 h-4" /> <p className="text-xs font-bold uppercase tracking-widest">Akumulasi Omset Live</p>
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">{formatRupiah(totalPendapatan)}</h2>
            <div className="mt-3">
               <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">{totalPending} Pesanan Tertahan</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BARIS NAVIGATION TAB & FILTER PANEL */}
      <div className="bg-white rounded-3xl border border-gray-100 p-3 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-sm relative z-10">
        
        {/* TABS */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full lg:w-auto relative overflow-x-auto custom-scrollbar shrink-0 gap-1.5">
          <TabButton id="domestik" icon={Package} label="Order Domestik" isActive={activeTab === "domestik"} onClick={() => setActiveTab("domestik")} />
          <TabButton id="global" icon={Globe} label="Global Forwarding" isActive={activeTab === "global"} onClick={() => setActiveTab("global")} />
          <TabButton id="tracking" icon={Map} label="Radar Satelit" isActive={activeTab === "tracking"} onClick={() => setActiveTab("tracking")} />
        </div>

        {/* SMART FILTER TOOLS */}
        {activeTab !== "tracking" && (
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 z-10">
            <div className="relative w-full sm:w-64 shrink-0">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Ketik ID Resi penuh / Alamat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 h-11 text-sm text-gray-900 outline-none font-bold focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/10 transition-all shadow-sm placeholder:font-normal placeholder:text-gray-400"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto shrink-0">
              <div className="relative flex-1 sm:flex-none">
                <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full sm:w-auto appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-8 h-11 text-gray-700 outline-none text-xs font-bold focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/10 cursor-pointer shadow-sm">
                  <option value="All">Semua Status</option>
                  <option value="Menunggu">Menunggu</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Selesai">Selesai</option>
                </select>
              </div>

              <div className="relative flex-1 sm:flex-none">
                <SortDesc className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select value={sortOrder} onChange={(e: any) => setSortOrder(e.target.value)} className="w-full sm:w-auto appearance-none bg-white border border-gray-200 rounded-xl pl-9 pr-8 h-11 text-gray-700 outline-none text-xs font-bold focus:border-brand-maroon focus:ring-2 focus:ring-brand-maroon/10 cursor-pointer shadow-sm">
                  <option value="newest">Resi Terbaru</option>
                  <option value="oldest">Resi Terlama</option>
                  <option value="heaviest">Bobot Terberat</option>
                  <option value="highest_value">Nilai Omset Tertinggi</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* DATA WORKSPACE TABLE AREA */}
      <div className="min-h-[500px] relative z-0">
        <div className="p-0">
          
          {/* --- VIEW 1: DATA MANIFES DOMESTIK --- */}
          {activeTab === "domestik" && (
            <Card className="overflow-x-auto shadow-premium border-gray-100 rounded-3xl bg-white p-0">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 uppercase font-black tracking-widest text-[10px] border-b border-gray-100">
                    <th className="p-5 pl-8">Detail Resi & Alamat Manifes (AWB)</th>
                    <th className="p-5"><Calendar className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5"/> Spesifikasi Kargo</th>
                    <th className="p-5"><Truck className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5"/> Status & Kurir</th>
                    <th className="p-5 pr-8 text-right">Aksi Operasional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {processedOrders.length === 0 && (
                    <tr><td colSpan={4} className="p-12 text-center text-gray-400 font-bold">Data manifes domestik kosong / rute tidak ditemukan.</td></tr>
                  )}
                  {processedOrders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50/40 transition-colors group">
                      <td className="p-5 pl-8">
                        {/* KUNCI: Menampilkan ID resi secara utuh agar client bisa copy paste kode pelacakan */}
                        <p className="font-mono font-black text-brand-maroon text-base mb-1 uppercase select-all tracking-wide" title="Klik ganda untuk memblok kode resi">
                          {o.id}
                        </p>
                        <div className="space-y-1 mt-2 text-xs text-gray-500 font-semibold max-w-sm xl:max-w-md">
                          <p className="flex items-start gap-1.5 truncate"><div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 mt-1"></div> <span className="truncate">Asal: {renderOriginAddress(o.origin)}</span></p>
                          <p className="flex items-start gap-1.5"><div className="w-2 h-2 bg-brand-gold rounded-full shrink-0 mt-1"></div> <span>Tujuan: {o.destinations?.[0]?.address || o.destination || "Multi-drop destination Node"}</span></p>
                        </div>
                      </td>
                      <td className="p-5 align-top pt-6">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="bg-brand-maroon/5 text-brand-maroon font-black px-2.5 py-1 rounded-md text-[10px] uppercase border border-brand-maroon/10 tracking-wide">{o.vehicleName || o.selectedVehicle || "Blind Van"}</span>
                          <p className="text-xs text-gray-700 font-extrabold flex items-center gap-1.5 mt-1"><Weight className="w-4 h-4 text-gray-400"/> {o.totalWeight || o.weight} Kg</p>
                          <p className="text-sm text-emerald-600 font-black flex items-center gap-1 mt-0.5"><DollarSign className="w-4 h-4 text-emerald-500 shadow-none"/> {formatRupiah(o.breakdown?.grandTotal || o.totalCost || 0)}</p>
                        </div>
                      </td>
                      <td className="p-5 align-top pt-6">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest inline-block border ${
                          o.status.includes("Selesai") ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          o.status.includes("Menunggu") ? "bg-amber-50 text-amber-600 border-amber-200" :
                          "bg-blue-50 text-blue-600 border-blue-200"
                        }`}>
                          {o.status}
                        </span>
                        <div className="text-[11px] font-bold text-gray-500 flex items-center gap-2 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 w-fit mt-3">
                          <UserPlus className="w-3.5 h-3.5 text-gray-400" /> {o.driverName || "Belum Ada Driver"}
                        </div>
                      </td>
                      <td className="p-5 pr-8 align-top pt-6">
                        <div className="flex flex-col items-end gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => openStatusModal(o)}
                            className="bg-brand-maroon text-white font-bold h-9 w-40 text-xs justify-center shadow-sm"
                          >
                            Update Status / Log
                          </Button>
                          
                          {!o.driverId && (
                            <Button 
                              variant="outline"
                              size="sm" 
                              onClick={() => { setSelectedOrderId(o.id); setShowDriverModal(true); }}
                              className="border-gray-200 text-gray-600 font-bold h-9 w-40 text-xs justify-center hover:bg-gray-50"
                            >
                              <Truck className="w-3.5 h-3.5 mr-1" /> Tunjuk Sopir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* --- VIEW 2: DATA REQUEST GLOBAL FORWARDING --- */}
          {activeTab === "global" && (
            <Card className="overflow-x-auto shadow-premium border-gray-100 rounded-3xl bg-white p-0">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase font-black tracking-widest text-[10px] border-b border-gray-100">
                    <th className="p-5 pl-8">ID & Jalur Distribusi Global</th>
                    <th className="p-5"><Box className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5"/> Detail Spesifikasi</th>
                    <th className="p-5"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5"/> Status Final & Quotation</th>
                    <th className="p-5 pr-8 text-right">Action Center</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processedQuotes.length === 0 && (
                    <tr><td colSpan={4} className="p-12 text-center text-gray-400 font-bold">Data kuotasi forwarding global masih kosong.</td></tr>
                  )}
                  {processedQuotes.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-5 pl-8">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="font-mono font-black text-gray-900 text-base uppercase select-all tracking-wide">#{q.id}</p>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${q.serviceType?.toLowerCase().includes('export') ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-cyan-50 text-cyan-600 border-cyan-200'}`}>
                            {q.serviceType || "Freight Forwarding"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-3 text-xs font-bold text-gray-600">
                          <p className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div> Asal: {q.originCountry || q.origin}</p>
                          <div className="w-px h-2.5 bg-gray-200 ml-[2px]"></div>
                          <p className="text-gray-900 font-extrabold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div> Tujuan: {q.destCountry || q.destination}</p>
                        </div>
                      </td>
                      <td className="p-5 align-top pt-6">
                        <p className="font-black text-gray-700 text-sm flex items-center gap-2"><Weight className="w-4 h-4 text-gray-400"/> {q.weight} Kg</p>
                      </td>
                      <td className="p-5 align-top pt-6">
                        <span className="bg-gray-50 text-gray-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-gray-200">{q.status}</span>
                        <div className="mt-3">
                          {q.offeredPrice ? (
                            <p className="text-sm font-black text-emerald-600 flex items-center gap-1.5"><DollarSign className="w-4 h-4"/> {formatRupiah(q.offeredPrice)}</p>
                          ) : (
                            <p className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded w-fit border border-amber-200">Belum ada penawaran</p>
                          )}
                        </div>
                      </td>
                      <td className="p-5 pr-8 align-top pt-6 text-right">
                        <Button 
                          onClick={() => { setSelectedQuoteId(q.id); setQuoteForm({ price: q.offeredPrice?.toString() || "", docUrl: q.customsDocUrl || "" }); setShowQuoteModal(true); }}
                          variant="gold"
                          size="sm"
                          className="font-bold h-10 px-4 text-xs shadow-sm"
                        >
                          <FileText className="w-4 h-4 mr-1.5" /> Proses Penawaran Bea
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* --- VIEW 3: SIMULASI DEPLOYMENT MAP RADAR --- */}
          {activeTab === "tracking" && (
            <div className="relative w-full h-[650px] bg-slate-900 overflow-hidden flex items-center justify-center group m-0 rounded-[2rem] border-2 border-slate-800 shadow-2xl">
              {/* Grid Pattern Background untuk kesan Peta Canggih */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px]"></div>
              
              {/* Radar Sweep Animation */}
              <div className="absolute w-[800px] h-[800px] rounded-full border border-brand-gold/10 flex items-center justify-center">
                <div className="w-[600px] h-[600px] rounded-full border border-brand-gold/20 flex items-center justify-center">
                  <div className="w-[400px] h-[400px] rounded-full border border-brand-gold/30"></div>
                </div>
                {/* Sweep Line */}
                <div className="absolute top-1/2 left-1/2 w-[400px] h-[2px] bg-gradient-to-r from-transparent to-brand-gold origin-left animate-[spin_4s_linear_infinite] opacity-50"></div>
              </div>

              <div className="relative z-10 flex flex-col items-center bg-black/40 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-2xl">
                <Navigation className="w-16 h-16 text-brand-gold/80 mb-6 animate-pulse" />
                <h3 className="text-white font-black tracking-widest text-2xl mb-2">MAPBOX LIVE RADAR</h3>
                <p className="text-slate-400 text-sm font-medium mb-6 text-center max-w-sm">Visualisasi pergerakan armada logistik secara real-time via satelit.</p>
                <p className="text-emerald-400 text-[10px] font-mono mt-2 bg-emerald-950/50 px-4 py-2 rounded-lg border border-emerald-900/50 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> SATELLITE COM LINK ACTIVE
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: SUNTIK STATUS & ATUR TIMESTAMPS MANIPULASI       */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowStatusModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border border-gray-100 rounded-[2rem] p-8 w-full max-w-lg relative z-10 shadow-2xl text-gray-800 flex flex-col max-h-[95vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-4 border-b pb-4 border-gray-100">
                <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><Clock className="w-5 h-5 text-brand-maroon"/> Update Status & Log Riwayat</h2>
                <button type="button" onClick={() => setShowStatusModal(false)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500"><X className="w-4 h-4"/></button>
              </div>

              <form onSubmit={handleConfirmStatusUpdate} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Status Manifes</label>
                  <select 
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({...statusForm, status: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 h-12 text-sm font-bold outline-none focus:border-brand-maroon"
                  >
                    <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                    <option value="Menunggu Kurir">Menunggu Verifikasi / Cari Kurir</option>
                    <option value="Menuju Lokasi Jemput">Sopir Menuju Lokasi Jemput</option>
                    <option value="Picked Up (In Transit)">In Transit (Paket Dibawa Armada)</option>
                    <option value="Delivered (Selesai)">Delivered (Paket Sukses Sampai)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lokasi Update Log (Checkpoint)</label>
                  <Input type="text" value={statusForm.location} onChange={(e) => setStatusForm({...statusForm, location: e.target.value})} placeholder="Cth: Gudang Sortir Lombok Tengah" className="font-bold h-12" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi Kustom Riwayat (Opsional)</label>
                  <Input type="text" value={statusForm.description} onChange={(e) => setStatusForm({...statusForm, description: e.target.value})} placeholder="Kosongkan untuk deskripsi otomatis system" className="font-semibold h-12" />
                </div>

                {/* PENENTUAN WAKTU EDITING (SANGAT POWERFULL) */}
                <div className="space-y-2 border-t border-dashed border-gray-100 pt-4">
                  <label className="text-[10px] font-black text-brand-maroon uppercase tracking-widest block">Metode Pencatatan Waktu (Timestamp)</label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input type="radio" name="timeMode" checked={statusForm.timeMode === "auto"} onChange={() => setStatusForm({...statusForm, timeMode: "auto"})} className="w-4 h-4 accent-brand-maroon" />
                      Otomatis Waktu Sekarang
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input type="radio" name="timeMode" checked={statusForm.timeMode === "custom"} onChange={() => setStatusForm({...statusForm, timeMode: "custom"})} className="w-4 h-4 accent-brand-maroon" />
                      Atur Waktu Kustom (Backdate)
                    </label>
                  </div>

                  <AnimatePresence>
                    {statusForm.timeMode === "custom" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <input 
                          type="datetime-local" 
                          required 
                          value={statusForm.customDate} 
                          onChange={(e) => setStatusForm({...statusForm, customDate: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 h-12 text-sm font-bold outline-none focus:border-brand-maroon" 
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setShowStatusModal(false)} className="flex-1 h-12 font-bold text-xs">Batal</Button>
                  <Button type="submit" className="flex-1 h-12 font-bold text-xs shadow-md">Simpan Log Perjalanan</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: TUGASKAN SOPIR MANUAL */}
      <AnimatePresence>
        {showDriverModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDriverModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border border-gray-100 rounded-[2rem] p-8 w-full max-w-md relative z-10 shadow-2xl text-gray-800">
              <h2 className="text-xl font-black text-gray-900 mb-2">Penugasan Sopir Manual center</h2>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">Pilih mitra kurir aktif untuk mengeksekusi manifest ini secara paksa (override).</p>
              
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {drivers.filter(d => !d.isSuspended).length === 0 ? (
                  <p className="text-xs text-center text-red-500 py-6 bg-red-50 rounded-2xl border border-red-100">Tidak ada sopir aktif yang tersedia.</p>
                ) : (
                  drivers.filter(d => !d.isSuspended).map(driver => (
                    <button 
                      key={driver.id} type="button"
                      onClick={() => handleAssignDriver(driver.id, driver.name)}
                      className="w-full text-left p-4 bg-gray-50 border border-gray-200 rounded-2xl hover:border-brand-maroon hover:bg-brand-maroon/5 transition-all flex justify-between items-center group shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-black text-gray-900 group-hover:text-brand-maroon transition-colors">{driver.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-1 bg-white px-2 py-0.5 rounded w-fit border border-gray-200">{driver.vehicleType}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white border border-gray-200 group-hover:bg-brand-maroon flex items-center justify-center transition-colors">
                        <UserPlus className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      </div>
                    </button>
                  ))
                )}
              </div>
              <button type="button" onClick={() => setShowDriverModal(false)} className="w-full mt-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors">Batalkan Penugasan</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: PENAWARAN HARGA GLOBAL */}
      <AnimatePresence>
        {showQuoteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowQuoteModal(false)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 w-full max-w-lg relative z-10 shadow-2xl text-gray-800">
              <div className="w-14 h-14 bg-brand-gold/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-gold/20">
                <FileText className="w-7 h-7 text-brand-gold" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Proses Penawaran Bea Cukai</h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">Input harga final penawaran kargo (termasuk Freight, Duty & Tax) beserta tautan dokumen kargo.</p>
              
              <form onSubmit={handleSubmitQuote} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Harga Penawaran Final (IDR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                    <Input type="number" required value={quoteForm.price} onChange={(e) => setQuoteForm({...quoteForm, price: e.target.value})} className="pl-12 h-14 font-black text-lg focus-visible:border-brand-gold focus-visible:ring-brand-gold/20" placeholder="0" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tautan Dokumen Persetujuan (URL)</label>
                  <Input type="url" value={quoteForm.docUrl} onChange={(e) => setQuoteForm({...quoteForm, docUrl: e.target.value})} className="h-14 font-semibold focus-visible:border-brand-gold focus-visible:ring-brand-gold/20" placeholder="https://drive.google.com/..." />
                  <div className="flex items-start gap-2 mt-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">Penting: Upload dokumen fisik persetujuan cukai ke Google Drive internal, lalu paste link-nya di sini agar dapat diunduh klien.</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <Button type="button" variant="outline" onClick={() => setShowQuoteModal(false)} className="flex-1 h-14">Batal</Button>
                  <Button type="submit" variant="gold" className="flex-1 h-14">
                    <Send className="w-4 h-4 mr-2" /> Terbitkan Kuotasi
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function TabButton({ icon: Icon, label, isActive, onClick }: { id: string; icon: React.ElementType; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex items-center justify-center gap-2 px-6 h-12 font-black text-[11px] uppercase tracking-widest transition-all duration-300 relative outline-none shrink-0 z-10 rounded-xl", isActive ? 'text-brand-maroon bg-white border border-gray-200 shadow-sm' : 'text-gray-400 hover:text-gray-700' )}>
      <Icon className={cn("w-4 h-4", isActive ? 'text-brand-maroon' : 'text-gray-400')} /> {label}
    </button>
  );
}