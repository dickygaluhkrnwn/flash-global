"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Plane, CheckCircle2, Clock, 
  ArrowUpRight, FileText, Truck, 
  MapPin, Calendar, Star, Search, 
  Download, MessageCircle, AlertCircle,
  SlidersHorizontal, X, ArrowDownWideNarrow, ArrowUpWideNarrow
} from "lucide-react";
import Link from "next/link"; 

// --- IMPORT BACKEND CORE ---
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

interface DeliveryItem {
  id: string;
  name: string;
  weight: number;
}

interface Order {
  id: string;
  category: "domestik" | "internasional";
  origin: string;
  destination: string;
  weight: number;
  dimensions: string;
  type: string;
  status: string;
  statusSub: string;
  date: string;
  timestamp: number; // Field baru untuk akurasi pengurutan tanggal
  price: number;
  vehicle?: string;
  senderName?: string;
  receiverName?: string;
  senderPhone?: string;
  receiverPhone?: string;
  email?: string;
  items?: DeliveryItem[];
}

type FirebaseTimestamp = { toDate?: () => Date } | string | number | null | undefined;

export default function DesktopDashboardPage() {
  const { user } = useAuthStore(); 
  
  // State Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Tabs & Search
  const [activeTab, setActiveTab] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState(""); 
  
  // State Advanced Filters & Sorting
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("date_desc");
  const [filterCategory, setFilterCategory] = useState("Semua");
  const [filterService, setFilterService] = useState("Semua");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const formatFirebaseDate = (timestamp: FirebaseTimestamp) => {
    if (!timestamp) return "Memproses...";
    const date = (typeof timestamp === "object" && "toDate" in timestamp && typeof timestamp.toDate === "function") 
      ? timestamp.toDate() 
      : new Date(timestamp as string | number);
      
    return date.toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric"
    });
  };

  // REAL-TIME SYNCHRONIZATION
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const ordersQuery = query(collection(db, "orders"), where("email", "==", user.email));
    const quotesQuery = query(collection(db, "quotes"), where("userId", "==", user.uid));

    let unsubscribeOrders = () => {};
    let unsubscribeQuotes = () => {};
    let localOrders: Order[] = [];
    let localQuotes: Order[] = [];

    const combineAndSetData = () => {
      const combined = [...localOrders, ...localQuotes];
      setOrders(combined);
      setIsLoading(false);
    };

    unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      localOrders = snapshot.docs.map((doc) => {
        const data = doc.data();
        const rawDate = (typeof data.createdAt === 'object' && data.createdAt?.toDate) ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
        
        return {
          id: doc.id.slice(-12).toUpperCase(), 
          category: "domestik" as const,
          origin: data.origin || "-",
          destination: data.destination || "-",
          weight: Number(data.totalWeight || data.weight) || 0,
          dimensions: data.items && data.items.length > 0 ? `${data.items.length} Koli/Barang` : `${data.length || 0}x${data.width || 0}x${data.height || 0} cm`,
          type: data.serviceType || "Darat",
          status: data.status || "Menunggu Pembayaran",
          statusSub: data.paymentStatus || (data.originDetail ? `Pickup: ${data.originDetail.slice(0, 30)}...` : "Menunggu Kurir"),
          date: formatFirebaseDate(data.createdAt),
          timestamp: rawDate.getTime(), // Milisecond untuk sorting presisi
          price: Number(data.totalCost) || 0,
          vehicle: data.selectedVehicle || "Kurir",
          senderName: data.senderName || "",
          receiverName: data.receiverName || "",
          senderPhone: data.senderPhone || "",
          receiverPhone: data.receiverPhone || "",
          email: data.email || "",
          items: data.items || []
        };
      });
      combineAndSetData();
    });

    unsubscribeQuotes = onSnapshot(quotesQuery, (snapshot) => {
      localQuotes = snapshot.docs.map((doc) => {
        const data = doc.data();
        const rawDate = (typeof data.createdAt === 'object' && data.createdAt?.toDate) ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());

        return {
          id: data.quoteId || doc.id.slice(-12).toUpperCase(),
          category: "internasional" as const,
          origin: data.origin || "-",
          destination: data.destination || "-",
          weight: Number(data.weight) || 0,
          dimensions: `${data.length || 0}x${data.width || 0}x${data.height || 0} cm`,
          type: "Kargo",
          status: "Sedang Diproses", 
          statusSub: data.status || "Menunggu Penawaran CS",
          date: formatFirebaseDate(data.createdAt),
          timestamp: rawDate.getTime(),
          price: 0 
        };
      });
      combineAndSetData();
    });

    return () => {
      unsubscribeOrders();
      unsubscribeQuotes();
    };
  }, [user]);

  // LOGIKA ADVANCED FILTERING & SORTING (SUPER ENGINE)
  let filteredOrders = orders.filter(order => {
    // 1. Filter Tab Status
    if (activeTab !== "Semua") {
      if (activeTab === "Sedang Diproses") {
        if (!["Sedang Diproses", "Menunggu Pembayaran", "Menunggu Verifikasi Finance", "Menunggu Follow Up"].includes(order.status)) return false;
      } else {
        if (order.status !== activeTab) return false;
      }
    }

    // 2. Filter Kategori
    if (filterCategory !== "Semua" && order.category !== filterCategory.toLowerCase()) return false;

    // 3. Filter Layanan
    if (filterService !== "Semua" && order.type !== filterService) return false;

    // 4. Filter Rentang Tanggal
    if (dateStart) {
      const start = new Date(dateStart).setHours(0, 0, 0, 0);
      if (order.timestamp < start) return false;
    }
    if (dateEnd) {
      const end = new Date(dateEnd).setHours(23, 59, 59, 999);
      if (order.timestamp > end) return false;
    }

    // 5. Filter Search Query
    if (searchQuery.trim() !== "") {
      const sq = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(sq);
      const matchSender = order.senderName?.toLowerCase().includes(sq);
      const matchReceiver = order.receiverName?.toLowerCase().includes(sq);
      const matchPhone = order.senderPhone?.includes(sq) || order.receiverPhone?.includes(sq);
      const matchEmail = order.email?.toLowerCase().includes(sq);
      const matchItem = order.items?.some(item => item.id.toLowerCase().includes(sq) || item.name.toLowerCase().includes(sq));

      if (!(matchId || matchSender || matchReceiver || matchPhone || matchEmail || matchItem)) return false;
    }

    return true;
  });

  // PENGURUTAN (SORTING)
  filteredOrders.sort((a, b) => {
    switch (sortBy) {
      case "date_asc": return a.timestamp - b.timestamp;
      case "price_desc": return b.price - a.price;
      case "price_asc": return a.price - b.price;
      case "weight_desc": return b.weight - a.weight;
      case "date_desc":
      default: return b.timestamp - a.timestamp;
    }
  });

  // FUNGSI RESET FILTER
  const resetFilters = () => {
    setSortBy("date_desc");
    setFilterCategory("Semua");
    setFilterService("Semua");
    setDateStart("");
    setDateEnd("");
    setSearchQuery("");
  };

  // FUNGSI GENERATE REPORT (CSV) - Mengekspor data yang TELAH DIFILTER
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert("Tidak ada data yang bisa diekspor.");
      return;
    }

    const headers = ["ID Pesanan", "Kategori", "Layanan", "Asal", "Tujuan", "Total Berat (Kg)", "Total Biaya (Rp)", "Status", "Tanggal"];
    
    const rows = filteredOrders.map(o => [
      o.id,
      o.category.toUpperCase(),
      o.type,
      `"${o.origin}"`, 
      `"${o.destination}"`,
      o.weight,
      o.price,
      o.status,
      `"${o.date}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_FlashGlobal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWAConfirm = (orderId: string, price: number) => {
    const adminWhatsApp = "6281234567890"; 
    const message = `Halo Tim Finance Flash Global,\n\nSaya ingin menanyakan / mengonfirmasi pembayaran untuk pesanan saya:\n\n🧾 *ID Pesanan:* ${orderId}\n💰 *Total Tagihan:* ${formatIDR(price)}\n\nMohon bantuannya. Terima kasih.`;
    window.open(`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const formatIDR = (val: number) => {
    if (val === 0) return "Menunggu Penawaran";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  // STATISTIK MENGGUNAKAN DATA KESELURUHAN (orders) ATAU FILTERED (opsional)
  // Biar klien lihat total keseluruhan, kita tetap pakai `orders`
  const totalActivity = orders.length;
  const processingCount = orders.filter(o => o.status === "Sedang Diproses" || o.status === "Menunggu Pembayaran" || o.status.includes("Menunggu")).length;
  const shippingCount = orders.filter(o => o.status === "Dikirim").length;
  const successCount = orders.filter(o => o.status === "Selesai" || o.status === "Sudah Dinilai").length;
  const tabs = ["Semua", "Sedang Diproses", "Dikirim", "Selesai"];

  return (
    <main className="min-h-screen bg-slate-50 p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[30%] h-[30%] bg-[#7A171D]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[25%] h-[25%] bg-[#C5A059]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Atasan Dasbor */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dasbor Operasional</h1>
            <p className="text-gray-500 mt-1 text-sm max-w-lg">Pantau, filter mendalam, dan buat laporan distribusi logistik Anda.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-72 md:w-80 group">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#7A171D] transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID, Resi, Nama, HP, Email..." 
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none text-sm transition-all shadow-sm bg-white font-semibold placeholder:font-normal"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`flex-1 sm:flex-none px-4 py-3.5 rounded-xl border flex items-center justify-center gap-2 transition-all shadow-sm text-sm font-bold ${showFilters ? 'bg-gray-900 text-white border-gray-900' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'}`}
              >
                <SlidersHorizontal className="w-4 h-4" /> <span className="hidden sm:inline">Filter</span>
              </button>
              
              <button onClick={handleExportCSV} className="flex-1 sm:flex-none bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-gray-700 font-bold px-4 py-3.5 rounded-xl border border-gray-200 flex items-center justify-center gap-2 transition-all shadow-sm text-sm" title="Unduh CSV Berdasarkan Filter Ini">
                <Download className="w-4 h-4" /> <span className="hidden sm:inline">Laporan</span>
              </button>
              
              <Link href="/delivery/booking" className="flex-1 sm:flex-none bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#7A171D]/20 text-sm whitespace-nowrap">
                <Package className="w-4 h-4" /> Buat Pesanan
              </Link>
            </div>
          </div>
        </div>

        {/* ADVANCED FILTER PANEL */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -10 }} 
              animate={{ opacity: 1, height: "auto", y: 0 }} 
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-white border border-gray-200 shadow-sm p-6 rounded-3xl relative">
                <button onClick={() => setShowFilters(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors p-1 bg-gray-50 rounded-full hover:bg-red-50">
                  <X className="w-4 h-4" />
                </button>
                
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#C5A059]" /> Filter & Urutkan Lanjutan
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Sorting */}
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Urutkan</label>
                    <div className="relative">
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none text-sm font-semibold text-gray-800 appearance-none focus:border-[#C5A059]">
                        <option value="date_desc">Tanggal Terbaru</option>
                        <option value="date_asc">Tanggal Terlama</option>
                        <option value="price_desc">Tagihan Tertinggi</option>
                        <option value="price_asc">Tagihan Terendah</option>
                        <option value="weight_desc">Berat Max</option>
                      </select>
                      <ArrowDownWideNarrow className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Kategori */}
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none text-sm font-semibold text-gray-800 focus:border-[#C5A059]">
                      <option value="Semua">Semua Area</option>
                      <option value="Domestik">Domestik</option>
                      <option value="Internasional">Internasional</option>
                    </select>
                  </div>

                  {/* Layanan */}
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Layanan</label>
                    <select value={filterService} onChange={(e) => setFilterService(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none text-sm font-semibold text-gray-800 focus:border-[#C5A059]">
                      <option value="Semua">Semua Layanan</option>
                      <option value="Instan">Instan</option>
                      <option value="Sameday">Sameday</option>
                      <option value="Reguler">Reguler / Kargo</option>
                    </select>
                  </div>

                  {/* Tanggal Start */}
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dari Tanggal</label>
                    <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none text-sm font-semibold text-gray-800 focus:border-[#C5A059]" />
                  </div>

                  {/* Tanggal End */}
                  <div className="space-y-1.5 md:col-span-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hingga Tanggal</label>
                    <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none text-sm font-semibold text-gray-800 focus:border-[#C5A059]" />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button onClick={resetFilters} className="text-xs font-bold text-[#7A171D] hover:bg-[#7A171D]/10 px-4 py-2 rounded-lg transition-colors">
                    Reset Filter
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kotak Statistik */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {[
            { label: "Total Aktivitas", value: `${totalActivity}`, sub: "Domestik & Global", icon: Package, color: "text-[#7A171D] bg-[#7A171D]/5 border-[#7A171D]/10" },
            { label: "Sedang Diproses", value: `${processingCount}`, sub: "Menuju kargo/pickup", icon: Clock, color: "text-amber-600 bg-amber-50 border-amber-100" },
            { label: "Dalam Perjalanan", value: `${shippingCount}`, sub: "Darat, Udara & Laut", icon: Truck, color: "text-blue-600 bg-blue-50 border-blue-100" },
            { label: "Pengiriman Sukses", value: `${successCount}`, sub: "Manifes Aman Sampai", icon: CheckCircle2, color: "text-green-600 bg-green-50 border-green-100" },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }} className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
              </div>
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center border ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Navigasi Filter Status Tab */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden flex overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[120px] text-center py-4 text-sm font-bold transition-all relative ${activeTab === tab ? "text-[#7A171D]" : "text-gray-400 hover:text-gray-600"}`}>
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="activeTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7A171D]" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
              )}
            </button>
          ))}
        </div>

        {/* Daftar Kartu Pesanan Berdasarkan Filter */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-[#7A171D] rounded-full animate-spin mb-3"></div>
              <p className="text-gray-400 text-sm font-semibold animate-pulse">Menyelaraskan Data Kargo...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => (
                <motion.div key={order.id} layout initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-[#C5A059]/50 transition-all relative overflow-hidden group">
                  
                  {/* Header Card */}
                  <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        order.category === "internasional" ? "bg-[#7A171D]/5 text-[#7A171D] border border-[#7A171D]/10" : "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                      }`}>
                        {order.category}
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-sm">{order.id}</span>
                    </div>
                    
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                        order.status.includes("Menunggu") ? "bg-amber-50 text-amber-600 border border-amber-200" :
                        order.status === "Dikirim" ? "bg-blue-50 text-blue-600 border border-blue-200" :
                        order.status === "Selesai" ? "bg-green-50 text-green-600 border border-green-200" :
                        "bg-gray-50 text-gray-600 border border-gray-200"
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-[10px] text-gray-400 font-semibold mt-1.5 uppercase tracking-wider">{order.statusSub}</p>
                    </div>
                  </div>

                  {/* Body Card */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* Lokasi */}
                    <div className="md:col-span-5 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5"><MapPin className="w-4 h-4 text-gray-400" /></div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Asal & Pengirim</p>
                          <p className="font-bold text-gray-900 text-sm leading-snug">{order.origin}</p>
                          {order.senderName && <p className="text-xs text-gray-500 mt-0.5">{order.senderName} ({order.senderPhone})</p>}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5"><MapPin className="w-4 h-4 text-[#7A171D]" /></div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Tujuan & Penerima</p>
                          <p className="font-bold text-gray-900 text-sm leading-snug">{order.destination}</p>
                          {order.receiverName && <p className="text-xs text-gray-500 mt-0.5">{order.receiverName} ({order.receiverPhone})</p>}
                        </div>
                      </div>
                    </div>

                    {/* Spesifikasi Kargo */}
                    <div className="md:col-span-3 space-y-2 text-xs text-gray-600 font-semibold md:border-x md:border-gray-100 md:px-6">
                      <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span>Armada / Layanan:</span>
                        <span className="text-gray-900 font-bold flex items-center gap-1 text-right">
                          {order.category === "internasional" ? <Plane className="w-3.5 h-3.5 text-[#C5A059]" /> : <Truck className="w-3.5 h-3.5 text-emerald-600" />}
                          {order.type} {order.vehicle && <span className="text-gray-400 font-normal">({order.vehicle})</span>}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-gray-50 pb-2">
                        <span>Berat Total:</span>
                        <span className="text-gray-900 font-bold">{order.weight} Kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dimensi/Qty:</span>
                        <span className="text-gray-900 font-bold">{order.dimensions}</span>
                      </div>
                    </div>

                    {/* Harga & Action Buttons */}
                    <div className="md:col-span-4 flex flex-col md:items-end justify-between h-full gap-4">
                      <div className="md:text-right w-full flex md:flex-col justify-between md:justify-start items-center md:items-end bg-gray-50 p-3 md:bg-transparent md:p-0 rounded-xl border border-gray-100 md:border-none">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Biaya</p>
                        <p className="text-lg md:text-xl font-black text-gray-900 md:mt-0.5">{formatIDR(order.price)}</p>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto mt-auto">
                        <button className="flex-1 md:flex-none p-2.5 border border-gray-200 hover:border-[#7A171D] text-gray-400 hover:text-[#7A171D] transition-all rounded-xl flex items-center justify-center bg-white hover:bg-red-50 shadow-sm" title="Unduh Invoice (Coming Soon)">
                          <FileText className="w-4 h-4" />
                        </button>
                        
                        {(order.status === "Menunggu Pembayaran" || order.status.includes("Verifikasi")) && (
                          <button onClick={() => handleWAConfirm(order.id, order.price)} className="flex-1 md:flex-none bg-[#25D366] hover:bg-[#1DA851] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm">
                            Konfirmasi WA <MessageCircle className="w-4 h-4" />
                          </button>
                        )}

                        {order.status === "Dikirim" && (
                          <Link href={`/tracking/${order.id}`} className="flex-1 md:flex-none bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm">
                            Lacak Manifes <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        )}

                        {order.status === "Selesai" && (
                          <button className="flex-1 md:flex-none bg-[#C5A059] hover:bg-[#b08d4a] text-gray-900 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm">
                            Beri Ulasan <Star className="w-4 h-4 fill-current" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                  
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                    <Calendar className="w-3.5 h-3.5" /> Booked Date: {order.date}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-dashed border-gray-300 p-16 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) 
                  ? <Search className="w-8 h-8 text-gray-300" /> 
                  : <AlertCircle className="w-8 h-8 text-gray-300" />}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) 
                  ? "Hasil Filter Tidak Ditemukan" 
                  : "Tidak Ada Data Pesanan"}
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mb-4">
                {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) 
                  ? "Tidak ada manifes kargo yang cocok dengan kriteria filter atau pencarian Anda. Silakan ubah pengaturan filter."
                  : `Anda belum memiliki riwayat pesanan dengan status "${activeTab}". Silakan buat pesanan baru untuk memulai.`}
              </p>
              {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) && (
                <button onClick={resetFilters} className="text-[#7A171D] text-sm font-bold bg-[#7A171D]/10 hover:bg-[#7A171D]/20 px-4 py-2 rounded-xl transition-colors">
                  Reset Semua Filter
                </button>
              )}
            </motion.div>
          )}
        </div>

      </div>
    </main>
  );
}