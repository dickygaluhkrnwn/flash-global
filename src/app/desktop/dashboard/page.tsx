"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, Package, AlertCircle } from "lucide-react";
import Link from "next/link"; 
import { useRouter } from "next/navigation";

// --- IMPORT BACKEND CORE ---
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// --- IMPORT SUB-COMPONENTS ---
import { Order } from "./components/types";
import DashboardStats from "./components/DashboardStats";
import DashboardFilters from "./components/DashboardFilters";
import OrderCard from "./components/OrderCard";

type FirebaseTimestamp = { toDate?: () => Date } | string | number | null | undefined;

export default function DesktopDashboardPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore(); 
  
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

  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  // REAL-TIME SYNCHRONIZATION MAPPING SUPER LENGKAP
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
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
        
        let primaryDest = "Multi Tujuan";
        if (data.destinations && data.destinations.length === 1) {
            primaryDest = data.destinations[0].address || "Tujuan";
        }

        return {
          id: doc.id, // KUNCI: ID asli utuh untuk routing ke halaman detail
          category: "domestik" as const,
          origin: data.origin?.address || data.origin || "-",
          destination: primaryDest,
          weight: Number(data.totalWeight || data.weight) || 0,
          dimensions: data.destinations && data.destinations.length > 1 ? `${data.destinations.length} Rute Tujuan` : `1 Tujuan`,
          type: data.serviceType || "Darat",
          status: data.status || "Menunggu Pembayaran",
          statusSub: data.paymentStatus || "Menunggu Verifikasi",
          date: formatFirebaseDate(data.createdAt),
          timestamp: rawDate.getTime(),
          
          // --- KEUANGAN & PROMO (BARU) ---
          price: Number(data.breakdown?.grandTotal || data.totalCost) || 0,
          finalPrice: Number(data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost) || 0,
          promoCode: data.appliedPromoCode || "",
          discountAmount: Number(data.discountPromoAmount) || 0,
          breakdown: data.breakdown,
          
          // --- OPERASIONAL & LOG PENGIRIMAN (BARU) ---
          vehicle: data.vehicleName || data.selectedVehicle || "Kurir Reguler",
          driverName: data.driverName || "",
          driverPhone: data.driverPhone || "",
          resi: data.destinations?.[0]?.resi || data.resi || doc.id.slice(-12).toUpperCase(),
          trackingHistory: data.trackingHistory || [],

          // --- DATA KLIEN ---
          senderName: data.origin?.senderName || data.senderName || "",
          receiverName: data.destinations?.[0]?.receiverName || data.receiverName || "",
          senderPhone: data.origin?.senderPhone || data.senderPhone || "",
          receiverPhone: data.destinations?.[0]?.receiverPhone || data.receiverPhone || "",
          email: user.email || "",
          items: data.destinations?.[0]?.items || data.items || []
        };
      });
      combineAndSetData();
    });

    unsubscribeQuotes = onSnapshot(quotesQuery, (snapshot) => {
      localQuotes = snapshot.docs.map((doc) => {
        const data = doc.data();
        const rawDate = (typeof data.createdAt === 'object' && data.createdAt?.toDate) ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());

        return {
          id: doc.id, // KUNCI
          category: "internasional" as const,
          origin: data.origin || "-",
          destination: data.destination || "-",
          weight: Number(data.weight) || 0,
          dimensions: `${data.length || 0}x${data.width || 0}x${data.height || 0} cm`,
          type: "Kargo Global",
          status: data.status || "Sedang Diproses", 
          statusSub: "Menunggu Penawaran CS",
          date: formatFirebaseDate(data.createdAt),
          timestamp: rawDate.getTime(),
          
          // Quotes tidak ada finalPrice sampai admin merespon
          price: Number(data.offeredPrice) || 0, 
          finalPrice: Number(data.offeredPrice) || 0,
          
          vehicle: "Kargo Lintas Negara",
          resi: data.quoteId || doc.id.slice(-12).toUpperCase(),
          trackingHistory: [],
          
          senderName: data.name || "",
          receiverName: "-",
          senderPhone: data.phone || "",
          receiverPhone: "-",
          email: data.email || user.email || "",
          items: []
        };
      });
      combineAndSetData();
    });

    return () => {
      unsubscribeOrders();
      unsubscribeQuotes();
    };
  }, [user]);

  // LOGIKA ADVANCED FILTERING & SORTING 
  const filteredOrders = orders.filter(order => {
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
    if (filterService !== "Semua" && !order.type.includes(filterService)) return false;

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
      const matchResi = (order.resi || "").toLowerCase().includes(sq);
      const matchOrigin = order.origin.toLowerCase().includes(sq);
      const matchDest = order.destination.toLowerCase().includes(sq);
      const matchPhone = order.senderPhone?.includes(sq) || order.receiverPhone?.includes(sq);

      if (!(matchId || matchResi || matchOrigin || matchDest || matchPhone)) return false;
    }

    return true;
  });

  // PENGURUTAN (SORTING) - Update sort berdasarkan finalPrice
  filteredOrders.sort((a, b) => {
    switch (sortBy) {
      case "date_asc": return a.timestamp - b.timestamp;
      case "price_desc": return (b.finalPrice || b.price) - (a.finalPrice || a.price);
      case "price_asc": return (a.finalPrice || a.price) - (b.finalPrice || b.price);
      case "weight_desc": return b.weight - a.weight;
      case "date_desc":
      default: return b.timestamp - a.timestamp;
    }
  });

  const resetFilters = () => {
    setSortBy("date_desc");
    setFilterCategory("Semua");
    setFilterService("Semua");
    setDateStart("");
    setDateEnd("");
    setSearchQuery("");
  };

  // Menghapus parameter `price` yang tidak dipakai linter
  const handleWAConfirm = (orderId: string) => {
    const adminWhatsApp = "6281234567890"; 
    const message = `Halo Tim CS Flash Global,\n\nSaya ingin menanyakan status untuk pesanan saya:\n\n🧾 *ID Pesanan:* ${orderId}\n\nMohon dibantu pengecekannya. Terima kasih.`;
    window.open(`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const formatIDR = (val: number) => {
    if (val === 0) return "Menunggu Penawaran";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  const tabs = ["Semua", "Sedang Diproses", "Dikirim", "Selesai"];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8 lg:p-10 relative overflow-hidden font-sans pb-20">
      {/* Background Ornamen */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />

      <div className="max-w-[1000px] mx-auto relative z-10 space-y-6">
        
        {/* Atasan Dasbor */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pesanan Saya</h1>
            <p className="text-slate-500 mt-1.5 text-sm max-w-lg font-medium">Pantau dan kelola seluruh riwayat distribusi logistik Anda.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Search Bar */}
            <div className="relative w-full sm:w-72 group">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID, Resi, Nama..." 
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#7A171D] focus:ring-4 focus:ring-[#7A171D]/10 outline-none text-sm transition-all bg-slate-50 font-medium text-slate-900"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`flex-1 sm:flex-none px-4 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all shadow-sm text-sm font-bold outline-none ${showFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`}
              >
                <SlidersHorizontal className="w-4 h-4" /> <span className="hidden sm:inline">Filter</span>
              </button>
              
              <Link href="/delivery/booking" className="flex-1 sm:flex-none bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#7A171D]/20 active:scale-[0.98] text-sm whitespace-nowrap">
                <Package className="w-4 h-4" /> Pesan
              </Link>
            </div>
          </div>
        </div>

        {/* ADVANCED FILTER PANEL */}
        <AnimatePresence>
          {showFilters && (
            <DashboardFilters 
              sortBy={sortBy} setSortBy={setSortBy}
              filterCategory={filterCategory} setFilterCategory={setFilterCategory}
              filterService={filterService} setFilterService={setFilterService}
              dateStart={dateStart} setDateStart={setDateStart}
              dateEnd={dateEnd} setDateEnd={setDateEnd}
              resetFilters={resetFilters} onClose={() => setShowFilters(false)}
            />
          )}
        </AnimatePresence>

        {/* Kotak Statistik Component */}
        <DashboardStats orders={orders} />

        {/* Navigasi Filter Status Tab */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[140px] text-center py-4 text-sm font-bold transition-all relative outline-none ${activeTab === tab ? "text-[#7A171D] bg-slate-50/50" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"}`}>
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="activeTabBorder" className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#7A171D]" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
              )}
            </button>
          ))}
        </div>

        {/* Daftar Kartu Pesanan Berdasarkan Filter */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center bg-white rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Menyelaraskan Data Kargo...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  formatIDR={formatIDR} 
                  handleWAConfirm={handleWAConfirm} 
                />
              ))}
            </AnimatePresence>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-[2rem] border border-dashed border-slate-300 p-16 md:p-20 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) 
                  ? <Search className="w-10 h-10 text-slate-300" /> 
                  : <AlertCircle className="w-10 h-10 text-slate-300" />}
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">
                {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) 
                  ? "Hasil Filter Tidak Ditemukan" 
                  : "Belum Ada Riwayat Pesanan"}
              </h3>
              <p className="text-slate-500 text-sm font-medium max-w-md mb-6 leading-relaxed">
                {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) 
                  ? "Tidak ada manifes kargo yang cocok dengan kriteria pencarian Anda. Silakan atur ulang pengaturan filter."
                  : `Anda belum memiliki riwayat pesanan dengan status "${activeTab}". Silakan buat pesanan baru untuk memulai pengiriman.`}
              </p>
              {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) && (
                <button onClick={resetFilters} className="text-[#7A171D] text-sm font-bold bg-[#7A171D]/10 hover:bg-[#7A171D]/20 px-6 py-3 rounded-xl transition-colors active:scale-95">
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