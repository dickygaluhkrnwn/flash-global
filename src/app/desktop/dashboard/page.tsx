"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, Ship, Plane, CheckCircle2, Clock, 
  ArrowUpRight, FileText, Truck, 
  MapPin, Calendar, Star
} from "lucide-react";
import Link from "next/link"; // FUNGSI YANG DIPERBAIKI: Import Link dari next/link

// --- IMPORT BACKEND CORE ---
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// Struktur data terpadu hasil normalisasi dari Firestore
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
  price: number;
  vehicle?: string;
}

export default function DesktopDashboardPage() {
  const { user } = useAuthStore(); // Tarik status pengguna aktif
  const [activeTab, setActiveTab] = useState<string>("Semua");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi konversi format tanggal Firebase Timestamp ke teks yang rapi
  const formatFirebaseDate = (timestamp: any) => {
    if (!timestamp) return "Memproses...";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // REAL-TIME SYNCHRONIZATION LISTENERS
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Query 1: Tarik data real-time koleksi orders (Domestik) milik user aktif
    const ordersQuery = query(
      collection(db, "orders"),
      where("email", "==", user.email) // Menggunakan filter email pemesan
    );

    // Query 2: Tarik data real-time koleksi quotes (Internasional) milik user aktif
    const quotesQuery = query(
      collection(db, "quotes"),
      where("userId", "==", user.uid)
    );

    let unsubscribeOrders = () => {};
    let unsubscribeQuotes = () => {};
    let localOrders: Order[] = [];
    let localQuotes: Order[] = [];

    // Menggabungkan hasil snapshot dari kedua koleksi secara presisi
    const combineAndSetData = () => {
      const combined = [...localOrders, ...localQuotes].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setOrders(combined);
      setIsLoading(false);
    };

    // Nyalakan Listener Koleksi Orders
    unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      localOrders = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id.slice(-12).toUpperCase(), // Ambil potongan ID dokumen yang unik
          category: "domestik" as const,
          origin: data.origin || "-",
          destination: data.destination || "-",
          weight: Number(data.weight) || 0,
          dimensions: `${data.length || 0}x${data.width || 0}x${data.height || 0} cm`,
          type: "Darat",
          status: data.status || "Sedang Diproses",
          statusSub: data.originDetail ? `Pickup: ${data.originDetail.slice(0, 30)}...` : "Menunggu Kurir",
          date: formatFirebaseDate(data.createdAt),
          price: Number(data.totalCost) || 0,
          vehicle: data.selectedVehicle || "Kurir"
        };
      });
      combineAndSetData();
    }, (error) => {
      console.error("Error fetching orders:", error);
    });

    // Nyalakan Listener Koleksi Quotes
    unsubscribeQuotes = onSnapshot(quotesQuery, (snapshot) => {
      localQuotes = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.quoteId || doc.id.slice(-12).toUpperCase(),
          category: "internasional" as const,
          origin: data.origin || "-",
          destination: data.destination || "-",
          weight: Number(data.weight) || 0,
          dimensions: `${data.length || 0}x${data.width || 0}x${data.height || 0} cm`,
          type: "Kargo",
          status: "Sedang Diproses", // Default internasional masuk status draft awal
          statusSub: data.status || "Menunggu Penawaran CS",
          date: formatFirebaseDate(data.createdAt),
          price: 0 // Harga forwarding dihitung manual oleh CS via WhatsApp
        };
      });
      combineAndSetData();
    }, (error) => {
      console.error("Error fetching quotes:", error);
    });

    // Clean up listeners saat komponen unmount
    return () => {
      unsubscribeOrders();
      unsubscribeQuotes();
    };
  }, [user]);

  // Kalkulasi Statistik Dinamis Berdasarkan Data Firestore Nyata
  const totalActivity = orders.length;
  const processingCount = orders.filter(o => o.status === "Sedang Diproses" || o.status === "Menunggu Pembayaran" || o.status === "Menunggu Follow Up").length;
  const shippingCount = orders.filter(o => o.status === "Dikirim").length;
  const successCount = orders.filter(o => o.status === "Selesai" || o.status === "Sudah Dinilai").length;

  const tabs = ["Semua", "Sedang Diproses", "Dikirim", "Selesai"];

  // Filter tab dinamis (menangani fleksibilitas pemetaan status kustom)
  const filteredOrders = orders.filter(order => {
    if (activeTab === "Semua") return true;
    if (activeTab === "Sedang Diproses") {
      return order.status === "Sedang Diproses" || order.status === "Menunggu Pembayaran" || order.status === "Menunggu Follow Up";
    }
    return order.status === activeTab;
  });

  const formatIDR = (val: number) => {
    if (val === 0) return "Menunggu Penawaran";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(val);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[30%] h-[30%] bg-[#7A171D]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[25%] h-[25%] bg-[#C5A059]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Atasan Dasbor */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dasbor Pengiriman</h1>
            <p className="text-gray-500 mt-1 text-sm">Pantau aktivitas distribusi logistik domestik dan internasional Anda dalam satu platform terpadu.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/" className="bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#7A171D]/20 text-sm">
              <Package className="w-4 h-4" /> Buat Booking Baru
            </Link>
          </div>
        </div>

        {/* Kotak Statistik Ringkas Dinamis */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: "Total Aktivitas", value: `${totalActivity} Order`, sub: "Domestik & Global", icon: Package, color: "text-[#7A171D] bg-[#7A171D]/5" },
            { label: "Sedang Diproses", value: `${processingCount} Paket`, sub: "Menuju kargo/pickup", icon: Clock, color: "text-amber-600 bg-amber-50" },
            { label: "Dalam Perjalanan", value: `${shippingCount} Kiriman`, sub: "Darat, Udara & Laut", icon: Truck, color: "text-blue-600 bg-blue-50" },
            { label: "Pengiriman Sukses", value: `${successCount} Selesai`, sub: "Manifes Aman Sampai", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between"
            >
              <div className="space-y-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
                <span className="text-xs font-semibold text-gray-500 block">{stat.sub}</span>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Navigasi Filter Status Tab */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-none">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 min-w-[120px] text-center py-4 text-sm font-bold transition-all relative ${
                  activeTab === tab ? "text-[#7A171D]" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTabBorder"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7A171D]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Daftar Kartu Pesanan Berdasarkan Real-time Filter */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="min-h-[200px] flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-[#7A171D] rounded-full animate-spin mb-3"></div>
              <p className="text-gray-400 text-sm font-semibold animate-pulse">Menyelaraskan Data Kargo...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-50 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        order.category === "internasional" 
                          ? "bg-[#7A171D]/5 text-[#7A171D] border border-[#7A171D]/10" 
                          : "bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20"
                      }`}>
                        {order.category}
                      </span>
                      <span className="font-mono font-bold text-gray-900 text-sm">{order.id}</span>
                    </div>
                    
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        order.status === "Sedang Diproses" || order.status === "Menunggu Pembayaran" || order.status === "Menunggu Follow Up" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                        order.status === "Dikirim" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                        "bg-green-50 text-green-600 border border-green-100"
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-[10px] text-gray-400 font-semibold mt-1">{order.statusSub}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-gray-400 text-xs w-12 font-bold">ASAL</span>
                        <span className="font-bold text-gray-900 truncate max-w-[140px]">{order.origin}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-700 shrink-0" />
                        <span className="text-gray-400 text-xs w-12 font-bold">TUJUAN</span>
                        <span className="font-bold text-gray-900 truncate max-w-[140px]">{order.destination}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-gray-500 font-semibold md:border-x md:border-gray-100 md:px-6">
                      <div className="flex justify-between">
                        <span>Berat Kargo:</span>
                        <span className="text-gray-900 font-bold">{order.weight} Kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dimensi Ukuran:</span>
                        <span className="text-gray-900 font-bold">{order.dimensions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Metode Jalur:</span>
                        <span className="text-gray-900 font-bold flex items-center gap-1">
                          {order.category === "internasional" ? <Plane className="w-3.5 h-3.5 text-[#C5A059]" /> : <Truck className="w-3.5 h-3.5 text-emerald-600" />}
                          {order.type} {order.vehicle ? `(${order.vehicle})` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end justify-between h-full gap-4">
                      <div className="md:text-right">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Biaya Pengiriman</p>
                        <p className="text-xl font-black text-gray-900 mt-0.5">{formatIDR(order.price)}</p>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto">
                        <button className="flex-1 md:flex-none p-2.5 border border-gray-200 hover:border-[#7A171D] text-gray-400 hover:text-[#7A171D] transition-all rounded-xl flex items-center justify-center bg-slate-50 hover:bg-red-50">
                          <FileText className="w-4 h-4" />
                        </button>
                        
                        {order.status === "Dikirim" && (
                          <Link href={`/tracking/${order.id}`} className="flex-1 md:flex-none bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all">
                            Lacak Manifes <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        )}

                        {order.status === "Selesai" && (
                          <button className="flex-1 md:flex-none bg-[#C5A059] hover:bg-[#b08d4a] text-gray-900 font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all">
                            Beri Ulasan <Star className="w-4 h-4 fill-current" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                    <Calendar className="w-3.5 h-3.5" /> Manifested Date: {order.date}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center text-gray-400 font-semibold">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              Tidak ditemukan data riwayat untuk filter status "{activeTab}"
            </div>
          )}
        </div>

      </div>
    </main>
  );
}