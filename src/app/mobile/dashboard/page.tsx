"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, SlidersHorizontal, CreditCard, ArrowRight, Activity, Package } from "lucide-react";
import Link from "next/link"; 
import { useRouter } from "next/navigation";

// --- IMPORT BACKEND CORE ---
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, DocumentData } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

import { DashboardOrder, FirebaseTimestamp } from "@/types/order";
import DashboardStats from "./components/DashboardStats";
import DashboardFilters from "./components/DashboardFilters";
import OrderCard from "./components/OrderCard";

export default function MobileDashboardPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore(); 
  
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [b2bOutstanding, setB2bOutstanding] = useState(0);

  const [activeTab, setActiveTab] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState(""); 
  
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
      
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  useEffect(() => {
    if (!user?.uid) { setIsLoading(false); return; }

    setIsLoading(true);
    const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));
    const quotesQuery = query(collection(db, "quotes"), where("userId", "==", user.uid));

    let localOrders: DashboardOrder[] = [];
    let localQuotes: DashboardOrder[] = [];

    const combineAndSetData = () => {
      setOrders([...localOrders, ...localQuotes]);
      setIsLoading(false);
    };

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      let currentB2BDebt = 0; 
      localOrders = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        const rawDate = (typeof data.createdAt === 'object' && data.createdAt?.toDate) ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
        let primaryDest = "Multi Tujuan";
        if (data.destinations && data.destinations.length === 1) primaryDest = data.destinations[0].address || "Tujuan";

        if (user?.role === "b2b" && data.isB2BApplied && (data.paymentStatus === "Piutang B2B" || data.paymentStatus === "Belum Bayar")) {
          currentB2BDebt += (data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost || 0);
        }

        return {
          id: doc.id, category: "domestik", origin: data.origin?.address || data.origin || "-", destination: primaryDest,
          weight: Number(data.totalWeight || data.weight) || 0, dimensions: data.destinations && data.destinations.length > 1 ? `${data.destinations.length} Rute` : `1 Tujuan`,
          type: data.serviceType || "Darat", status: data.status || "Menunggu Pembayaran", statusSub: data.paymentStatus || "Verifikasi",
          date: formatFirebaseDate(data.createdAt), timestamp: rawDate.getTime(), price: Number(data.breakdown?.grandTotal || data.totalCost) || 0,
          finalPrice: Number(data.finalGrandTotal || data.breakdown?.grandTotal || data.totalCost) || 0, promoCode: data.appliedPromoCode || "",
          discountAmount: Number(data.discountPromoAmount) || 0, vehicle: data.vehicleName || data.selectedVehicle || "Kurir Reguler",
          resi: data.destinations?.[0]?.resi || data.resi || doc.id.slice(-12).toUpperCase()
        };
      });
      if (user?.role === "b2b") setB2bOutstanding(currentB2BDebt);
      combineAndSetData();
    });

    const unsubscribeQuotes = onSnapshot(quotesQuery, (snapshot) => {
      localQuotes = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        const rawDate = (typeof data.createdAt === 'object' && data.createdAt?.toDate) ? data.createdAt.toDate() : new Date(data.createdAt || Date.now());
        return {
          id: doc.id, category: "internasional", origin: data.origin || "-", destination: data.destination || "-",
          weight: Number(data.weight) || 0, dimensions: `${data.length || 0}x${data.width || 0}x${data.height || 0} cm`,
          type: "Kargo Global", status: data.status || "Sedang Diproses", statusSub: "Menunggu Penawaran CS",
          date: formatFirebaseDate(data.createdAt), timestamp: rawDate.getTime(), price: Number(data.offeredPrice) || 0, finalPrice: Number(data.offeredPrice) || 0,
          vehicle: "Kargo Global", resi: data.quoteId || doc.id.slice(-12).toUpperCase()
        };
      });
      combineAndSetData();
    });

    return () => { unsubscribeOrders(); unsubscribeQuotes(); };
  }, [user]);

  const filteredOrders = orders.filter(order => {
    if (activeTab !== "Semua") {
      if (activeTab === "Diproses" && !["Sedang Diproses", "Menunggu Pembayaran", "Menunggu Verifikasi Finance", "Menunggu Kurir", "Menuju Lokasi Jemput"].includes(order.status)) return false;
      else if (activeTab === "Batal" && (!order.status.includes("Batal") || order.statusSub?.includes("Refund"))) return false;
      else if (activeTab !== "Diproses" && activeTab !== "Batal" && order.status !== activeTab) return false;
    }
    if (filterCategory !== "Semua" && order.category !== filterCategory.toLowerCase()) return false;
    if (filterService !== "Semua" && !order.type.includes(filterService)) return false;
    if (dateStart && order.timestamp < new Date(dateStart).setHours(0, 0, 0, 0)) return false;
    if (dateEnd && order.timestamp > new Date(dateEnd).setHours(23, 59, 59, 999)) return false;
    if (searchQuery.trim() !== "") {
      const sq = searchQuery.toLowerCase();
      if (!(order.id.toLowerCase().includes(sq) || (order.resi || "").toLowerCase().includes(sq) || order.origin.toLowerCase().includes(sq) || order.destination.toLowerCase().includes(sq))) return false;
    }
    return true;
  });

  filteredOrders.sort((a, b) => {
    switch (sortBy) {
      case "date_asc": return a.timestamp - b.timestamp;
      case "price_desc": return (b.finalPrice || b.price) - (a.finalPrice || a.price);
      case "price_asc": return (a.finalPrice || a.price) - (b.finalPrice || b.price);
      case "weight_desc": return b.weight - a.weight;
      case "date_desc": default: return b.timestamp - a.timestamp;
    }
  });

  const resetFilters = () => { setSortBy("date_desc"); setFilterCategory("Semua"); setFilterService("Semua"); setDateStart(""); setDateEnd(""); setSearchQuery(""); };
  const handleWAConfirm = (orderId: string) => { window.open(`https://wa.me/6281234567890?text=Halo CS Flash Global, mohon cek pesanan ID: ${orderId}`, "_blank"); };
  const formatIDR = (val: number) => val === 0 ? "Menunggu" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
  const tabs = ["Semua", "Diproses", "Dikirim", "Selesai", "Batal"];

  return (
    <div className="flex flex-col w-full">
      {/* HEADER TITLE */}
      <div className="px-6 mb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pesanan</h1>
        <p className="text-slate-500 mt-1 text-xs font-medium">Pantau dan kelola resi pengiriman Anda.</p>
      </div>

      {/* STATS CAROUSEL */}
      <DashboardStats orders={orders} />

      <div className="px-6 space-y-6">
        {/* B2B WARNING */}
        <AnimatePresence>
          {user?.role === 'b2b' && b2bOutstanding > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/10 border border-red-500/30 p-5 rounded-[2rem] flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-red-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-red-900">Tagihan Net 30</h3>
                  <p className="text-[10px] text-red-800/80 font-bold mt-0.5">Piutang: {formatIDR(b2bOutstanding)}</p>
                </div>
              </div>
              <button onClick={() => router.push("/finance")} className="w-full h-12 bg-red-600 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 tap-highlight-transparent">
                Lunasi Sekarang <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SEARCH & FILTER BAR */}
        <div className="flex gap-2">
          <div className="relative flex-1 group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7A171D]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari Resi / Tujuan..." className="w-full bg-white/70 backdrop-blur-md pl-10 pr-4 h-12 rounded-xl border border-white focus:border-[#7A171D]/50 focus:ring-2 focus:ring-[#7A171D]/15 outline-none text-xs font-bold text-slate-900 shadow-sm" />
          </div>
          <button onClick={() => setShowFilters(true)} className="w-12 h-12 bg-white/70 backdrop-blur-md border border-white rounded-xl flex items-center justify-center text-slate-600 shadow-sm active:scale-95 tap-highlight-transparent">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* PILL TABS NATIVE SCROLL */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 -mx-6 px-6 pb-2 tap-highlight-transparent">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-5 h-10 rounded-full text-[11px] font-black whitespace-nowrap transition-all border shrink-0", activeTab === tab ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white/60 text-slate-500 border-white hover:bg-white")}>
              {tab}
            </button>
          ))}
        </div>

        {/* ORDER LIST */}
        <div className="space-y-4 pb-6">
          {isLoading ? (
            <div className="h-60 flex flex-col items-center justify-center glass-card rounded-[2rem]">
              <Activity className="w-10 h-10 text-[#7A171D] animate-pulse mb-3" />
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Menarik Data...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            filteredOrders.map(order => <OrderCard key={order.id} order={order} formatIDR={formatIDR} handleWAConfirm={handleWAConfirm} />)
          ) : (
            <div className="glass-card rounded-[2rem] p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm"><Package className="w-8 h-8 text-slate-300" /></div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Belum Ada Pesanan</h3>
              <p className="text-slate-500 text-xs font-medium mb-6">Anda belum memiliki riwayat pengiriman.</p>
              <Link href="/delivery/booking" className="bg-[#7A171D] text-white text-xs font-black px-6 h-12 rounded-xl flex items-center justify-center w-full active:scale-95 tap-highlight-transparent shadow-md">
                Kirim Paket Sekarang
              </Link>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <DashboardFilters 
            sortBy={sortBy} setSortBy={setSortBy} filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            filterService={filterService} setFilterService={setFilterService} dateStart={dateStart} setDateStart={setDateStart}
            dateEnd={dateEnd} setDateEnd={setDateEnd} resetFilters={resetFilters} onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}