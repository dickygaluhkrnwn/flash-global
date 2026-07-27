"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, Package, AlertCircle, CreditCard, ArrowRight, Activity } from "lucide-react";
import Link from "next/link"; 
import { useRouter } from "next/navigation";

// --- IMPORT BACKEND CORE ---
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, DocumentData } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { DashboardOrder, FirebaseTimestamp } from "@/types/order";

// --- IMPORT SUB-COMPONENTS ---
import DashboardStats from "./components/DashboardStats";
import DashboardFilters from "./components/DashboardFilters";
import OrderCard from "./components/OrderCard";

export default function DesktopDashboardPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore(); 
  
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Tagihan B2B Proaktif
  const [b2bOutstanding, setB2bOutstanding] = useState(0);

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

  // REAL-TIME SYNCHRONIZATION MAPPING
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
    let localOrders: DashboardOrder[] = [];
    let localQuotes: DashboardOrder[] = [];

    const combineAndSetData = () => {
      const combined = [...localOrders, ...localQuotes];
      setOrders(combined);
      setIsLoading(false);
    };

    unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      let currentB2BDebt = 0; 

      localOrders = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        const rawDate = (typeof data.createdAt === 'object' && data.createdAt?.toDate) ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
        
        let primaryDest = "Multi Tujuan";
        if (data.destinations && data.destinations.length === 1) {
            primaryDest = data.destinations[0].address || "Tujuan";
        }

        // Kalkulasi Tagihan B2B Aktif
        if (user?.role === "b2b") {
          if (data.isB2BApplied && (data.paymentStatus === "Piutang B2B" || data.paymentStatus === "Belum Bayar" || data.paymentStatus === "Ditolak")) {
            currentB2BDebt += (data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost || 0);
          }
        }

        return {
          id: doc.id, 
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
          
          price: Number(data.breakdown?.grandTotal || data.totalCost) || 0,
          finalPrice: Number(data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost) || 0,
          promoCode: data.appliedPromoCode || "",
          discountAmount: Number(data.discountPromoAmount) || 0,
          breakdown: data.breakdown,
          
          vehicle: data.vehicleName || data.selectedVehicle || "Kurir Reguler",
          driverName: data.driverName || "",
          driverPhone: data.driverPhone || "",
          resi: data.destinations?.[0]?.resi || data.resi || doc.id.slice(-12).toUpperCase(),
          trackingHistory: data.trackingHistory || [],

          senderName: data.origin?.senderName || data.senderName || "",
          receiverName: data.destinations?.[0]?.receiverName || data.receiverName || "",
          senderPhone: data.origin?.senderPhone || data.senderPhone || "",
          receiverPhone: data.destinations?.[0]?.receiverPhone || data.receiverPhone || "",
          email: user.email || "",
          items: data.destinations?.[0]?.items || data.items || []
        };
      });

      if (user?.role === "b2b") setB2bOutstanding(currentB2BDebt);
      combineAndSetData();
    });

    unsubscribeQuotes = onSnapshot(quotesQuery, (snapshot) => {
      localQuotes = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        const rawDate = (typeof data.createdAt === 'object' && data.createdAt?.toDate) ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());

        return {
          id: doc.id, 
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
        if (!["Sedang Diproses", "Menunggu Pembayaran", "Menunggu Verifikasi Finance", "Menunggu Follow Up", "Menunggu Kurir", "Menuju Lokasi Jemput"].includes(order.status)) return false;
      } else if (activeTab === "Dibatalkan") {
        if (!order.status.includes("Batal") || order.statusSub?.includes("Refund") || order.paymentStatus?.includes("Refund")) return false;
      } else if (activeTab === "Pengembalian") {
        if (!order.paymentStatus?.includes("Refund") && !order.statusSub?.includes("Refund")) return false;
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

  // PENGURUTAN (SORTING)
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

  const handleWAConfirm = (orderId: string) => {
    const adminWhatsApp = "6281234567890"; 
    const message = `Halo Tim CS Flash Global,\n\nSaya ingin menanyakan status untuk pesanan saya:\n\n🧾 *ID Pesanan:* ${orderId}\n\nMohon dibantu pengecekannya. Terima kasih.`;
    window.open(`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const formatIDR = (val: number) => {
    if (val === 0) return "Menunggu Penawaran";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  };

  const tabs = ["Semua", "Sedang Diproses", "Dikirim", "Selesai", "Dibatalkan", "Pengembalian"];

  return (
    <main className="min-h-screen bg-[#f8fafc] p-4 md:p-8 lg:p-10 relative overflow-hidden font-sans pb-32 z-0">
      
      {/* --- AMBIENT GLOWING BACKGROUND --- */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vh] rounded-full bg-rose-200/30 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[50vh] rounded-full bg-amber-100/40 blur-[120px]" />
        <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vh] rounded-full bg-blue-100/20 blur-[100px]" />
      </div>

      <div className="max-w-[1200px] mx-auto relative z-10 space-y-6">
        
        {/* ============================================================== */}
        {/* BANNER TAGIHAN PROAKTIF B2B (GLASS RED) */}
        {/* ============================================================== */}
        <AnimatePresence>
          {user?.role === 'b2b' && b2bOutstanding > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20, height: 0 }} 
              animate={{ opacity: 1, y: 0, height: "auto" }} 
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 p-5 md:p-6 rounded-[2.5rem] shadow-[0_10px_30px_rgba(239,68,68,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-5 overflow-hidden relative"
            >
              <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-red-500/20 rounded-full blur-[60px] pointer-events-none"></div>
              
              <div className="flex items-start md:items-center gap-5 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center shrink-0 shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] border border-red-800">
                  <CreditCard className="w-7 h-7 drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-900 tracking-tight">Peringatan Tagihan Piutang (Net 30)</h3>
                  <p className="text-xs md:text-sm text-red-800/80 font-medium mt-1.5 leading-relaxed">
                    Anda memiliki total piutang berjalan sebesar <b className="text-white text-sm bg-red-600 px-2 py-0.5 rounded-lg ml-1 shadow-sm border border-red-700">{formatIDR(b2bOutstanding)}</b>. 
                    Segera lakukan pelunasan agar plafon kredit Anda kembali penuh.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => router.push("/finance")}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white text-sm font-black rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_16px_rgba(220,38,38,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 border border-red-900 relative z-10"
              >
                Lunasi Tagihan <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============================================================== */}
        {/* BENTO HEADER & CONTROLS */}
        {/* ============================================================== */}
        <div className="glass-card flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.03)]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-[40px] pointer-events-none"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Control Center</h1>
            <p className="text-slate-500 mt-2 text-sm max-w-lg font-medium">Pantau dan kelola seluruh riwayat distribusi logistik domestik dan global Anda.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto relative z-10">
            {/* Search Bar ala Apple Spotlight */}
            <div className="relative w-full sm:w-72 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID, Resi, Nama..." 
                className="w-full bg-white/60 backdrop-blur-md pl-12 pr-4 h-14 rounded-2xl border border-white focus:bg-white focus:border-[#7A171D]/50 focus:ring-[3px] focus:ring-[#7A171D]/15 outline-none text-sm font-bold text-slate-900 placeholder:text-slate-400 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
              />
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={cn(
                  "flex-1 sm:flex-none px-5 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm text-sm font-bold outline-none border",
                  showFilters ? "bg-slate-900 text-white border-slate-900 shadow-[0_8px_16px_rgba(15,23,42,0.3)]" : "bg-white/80 backdrop-blur-md hover:bg-white text-slate-700 border-white hover:border-slate-200"
                )}
              >
                <SlidersHorizontal className="w-5 h-5" /> <span className="hidden sm:inline">Filter</span>
              </button>
              
              <Link href="/delivery/booking" className="flex-1 sm:flex-none bg-gradient-to-b from-[#9A242B] to-[#7A171D] hover:from-[#A82B33] hover:to-[#8B1A21] text-white font-black px-6 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(122,23,29,0.25)] border border-[#5A0E13] active:scale-[0.96] text-sm whitespace-nowrap">
                <Package className="w-5 h-5" /> Buat Order
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

        {/* ============================================================== */}
        {/* DASHBOARD STATS */}
        {/* ============================================================== */}
        <DashboardStats orders={orders} />

        {/* ============================================================== */}
        {/* FLOATING TABS (Apple Glass Pills) */}
        {/* ============================================================== */}
        <div className="glass-panel p-2 rounded-[2rem] flex overflow-x-auto no-scrollbar shadow-sm border border-white relative z-20">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={cn(
                  "flex-1 min-w-[120px] md:min-w-[140px] text-center py-3.5 px-4 text-xs font-bold transition-all relative outline-none rounded-2xl whitespace-nowrap z-10",
                  isActive ? "text-white" : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTabBackground" 
                    className="absolute inset-0 bg-slate-900 rounded-2xl shadow-md border border-slate-800 -z-10" 
                    transition={{ type: "spring", stiffness: 380, damping: 30 }} 
                  />
                )}
                {tab}
              </button>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* ORDER LIST / EMPTY STATE */}
        {/* ============================================================== */}
        <div className="space-y-5">
          {isLoading ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center glass-card rounded-[2.5rem] relative overflow-hidden">
              <Activity className="w-12 h-12 text-[#7A171D] animate-pulse mb-4" />
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest animate-pulse">Menyelaraskan Data Kargo...</p>
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card bg-white/40 rounded-[3rem] border border-dashed border-white p-16 md:p-24 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
              <div className="w-24 h-24 bg-white/80 backdrop-blur-md border border-white rounded-[2rem] flex items-center justify-center mb-6 shadow-sm rotate-3">
                {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) 
                  ? <Search className="w-10 h-10 text-slate-400" /> 
                  : <AlertCircle className="w-10 h-10 text-slate-400" />}
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
                {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) 
                  ? "Tidak Ada Hasil Filter" 
                  : "Belum Ada Riwayat Kargo"}
              </h3>
              <p className="text-slate-500 text-sm font-medium max-w-md mb-8 leading-relaxed">
                {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) 
                  ? "Tidak ada manifes kargo yang cocok dengan kriteria pencarian Anda. Silakan atur ulang pengaturan filter."
                  : `Anda belum memiliki riwayat pesanan dengan status "${activeTab}". Silakan buat pesanan baru untuk memulai pengiriman.`}
              </p>
              {(searchQuery || filterCategory !== "Semua" || filterService !== "Semua" || dateStart) ? (
                <button onClick={resetFilters} className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-8 py-4 rounded-2xl transition-all active:scale-95 shadow-md">
                  Reset Semua Filter
                </button>
              ) : (
                <Link href="/delivery/booking" className="bg-gradient-to-b from-[#9A242B] to-[#7A171D] hover:from-[#A82B33] hover:to-[#8B1A21] border border-[#5A0E13] text-white text-sm font-black px-8 py-4 rounded-2xl transition-all active:scale-95 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_8px_20px_rgba(122,23,29,0.3)]">
                  Buat Pesanan Baru
                </Link>
              )}
            </motion.div>
          )}
        </div>

      </div>
    </main>
  );
}