"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, Clock, MapPin, Plane, 
  Package, ArrowLeft, Ship, Truck, AlertCircle
} from "lucide-react";
import Link from "next/link";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";

// Tipe data untuk menangani Firebase Timestamp
type FirebaseTimestamp = { toDate?: () => Date } | string | number | null | undefined;

// Tipe data untuk riwayat pelacakan (array)
interface TrackingHistoryItem {
  id?: string | number; // PERBAIKAN: Menambahkan 'id' secara eksplisit
  status: string;
  date: string;
  description?: string;
  location?: string;
  [key: string]: unknown;
}

// Tipe data utama untuk TrackingData
interface TrackingData {
  id: string;
  category: "Domestik" | "Internasional";
  status?: string;
  statusSub?: string;
  origin?: string;
  destination?: string;
  createdAt?: FirebaseTimestamp;
  trackingHistory?: TrackingHistoryItem[];
  [key: string]: unknown;
}

export default function TrackingResultPage({ params }: { params: { resi: string } }) {
  const awbNumber = decodeURIComponent(params.resi).toUpperCase();

  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    let unsubDoc = () => {};
    let unsubQuotes = () => {};
    let isFound = false;

    const findAndListen = async () => {
      setIsLoading(true);
      setIsNotFound(false);
      
      try {
        const qQuotes = query(collection(db, "quotes"), where("quoteId", "==", awbNumber));
        unsubQuotes = onSnapshot(qQuotes, (snapshot) => {
          if (!snapshot.empty) {
            isFound = true;
            const data = snapshot.docs[0].data();
            setTrackingData({ 
              category: "Internasional", 
              id: snapshot.docs[0].id, 
              ...data 
            });
            setIsLoading(false);
          }
        });

        if (!isFound) {
          const ordersSnap = await getDocs(collection(db, "orders"));
          const matchedOrder = ordersSnap.docs.find(d => 
            d.id.toUpperCase().endsWith(awbNumber) || 
            (d.data().awb && d.data().awb.toUpperCase() === awbNumber)
          );

          if (matchedOrder) {
            isFound = true;
            unsubDoc = onSnapshot(doc(db, "orders", matchedOrder.id), (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                setTrackingData({ 
                  category: "Domestik", 
                  id: docSnap.id, 
                  ...data 
                });
                setIsLoading(false);
              }
            });
          }
        }

        setTimeout(() => {
          if (!isFound) {
            setIsLoading(false);
            setIsNotFound(true);
          }
        }, 2500);

      } catch (error) {
        console.error("Gagal melacak resi:", error);
        setIsLoading(false);
        setIsNotFound(true);
      }
    };

    findAndListen();

    return () => {
      unsubDoc();
      unsubQuotes();
    };
  }, [awbNumber]);

  const formatFirebaseDate = (timestamp: FirebaseTimestamp) => {
    if (!timestamp) return "Baru saja";
    const date = (typeof timestamp === "object" && "toDate" in timestamp && typeof timestamp.toDate === "function") 
      ? timestamp.toDate() 
      : new Date(timestamp as string | number);
      
    return date.toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short"
    });
  };

  const getIconForStatus = (statusText: string) => {
    const s = statusText.toLowerCase();
    if (s.includes("terbang") || s.includes("udara") || s.includes("pesawat") || s.includes("bandara")) return Plane;
    if (s.includes("laut") || s.includes("kapal") || s.includes("pelabuhan")) return Ship;
    if (s.includes("darat") || s.includes("kurir") || s.includes("truk") || s.includes("van") || s.includes("jemput")) return Truck;
    if (s.includes("tiba") || s.includes("sampai") || s.includes("selesai") || s.includes("terima")) return CheckCircle2;
    if (s.includes("gudang") || s.includes("sortir") || s.includes("transit") || s.includes("proses")) return Package;
    return Clock;
  };

  const renderTimeline = () => {
    if (!trackingData) return [];

    if (trackingData.trackingHistory && Array.isArray(trackingData.trackingHistory) && trackingData.trackingHistory.length > 0) {
      return [...trackingData.trackingHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item, idx) => ({
        ...item,
        icon: getIconForStatus(item.status),
        isCurrent: idx === 0,
        isCompleted: true
      }));
    }

    return [
      {
        id: "default-1",
        status: trackingData.status || "Menunggu Diproses",
        description: trackingData.statusSub || "Data pesanan Anda telah berhasil masuk ke sistem Flash Global dan sedang menunggu tindakan operasional.",
        location: trackingData.category === "Domestik" ? trackingData.origin : "Sistem Flash Global",
        date: formatFirebaseDate(trackingData.createdAt),
        icon: trackingData.status === "Selesai" ? CheckCircle2 : Package,
        isCompleted: true,
        isCurrent: true
      }
    ];
  };

  const timelineData = renderTimeline();

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#7A171D] rounded-full blur-[150px] opacity-5 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto z-10 relative">
        
        <div className="mb-8">
          <Link href="/tracking" className="text-sm text-gray-500 hover:text-[#7A171D] transition-colors font-semibold flex items-center gap-2 mb-4 w-fit">
            <ArrowLeft className="w-4 h-4" /> Cari Resi Lain
          </Link>
        </div>

        {isLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-xl shadow-[#7A171D]/5">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-[#7A171D] rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-black text-gray-900 mb-1">Menarik Manifes</h2>
            <p className="text-gray-400 font-semibold animate-pulse text-sm">Menyinkronkan data dengan satelit kargo...</p>
          </div>
        ) : isNotFound || !trackingData ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-h-[50vh] flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-gray-300 p-8 text-center shadow-xl shadow-[#7A171D]/5">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Resi Tidak Ditemukan</h2>
            <p className="text-gray-500 mb-8 max-w-md">
              Kami tidak dapat menemukan data untuk resi <b className="text-gray-900">{awbNumber}</b>. Pastikan nomor resi/ID yang Anda masukkan sudah benar atau hubungi layanan pelanggan kami.
            </p>
            <Link href="/tracking" className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl transition-colors">
              Kembali ke Pencarian
            </Link>
          </motion.div>
        ) : (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Hasil Pelacakan</h1>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    trackingData.category === "Internasional" ? "bg-[#C5A059]/10 text-[#C5A059]" : "bg-[#7A171D]/10 text-[#7A171D]"
                  }`}>
                    Kargo {trackingData.category}
                  </span>
                </div>
                
                <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-[#7A171D]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">No. AWB (Resi)</p>
                    <p className="text-lg font-black text-[#7A171D]">{awbNumber}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 border border-gray-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 w-full flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center shrink-0 border border-gray-200">
                    <MapPin className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-500">Lokasi Asal</p>
                    <p className="text-lg font-extrabold text-gray-900 truncate" title={trackingData.origin}>{trackingData.origin}</p>
                  </div>
                </div>

                <div className="hidden md:flex flex-1 w-full items-center justify-center text-[#C5A059]">
                  <div className="w-full h-0.5 bg-gray-100 relative flex items-center justify-center">
                    {trackingData.category === "Internasional" ? (
                      <Plane className="w-6 h-6 absolute bg-white px-1 text-[#C5A059]" />
                    ) : (
                      <Truck className="w-6 h-6 absolute bg-white px-1 text-[#7A171D]" />
                    )}
                  </div>
                </div>

                <div className="flex-1 w-full flex items-center md:justify-end gap-4 text-right">
                  <div className="md:order-1 order-2 overflow-hidden">
                    <p className="text-sm font-bold text-gray-500">Lokasi Tujuan</p>
                    <p className="text-lg font-extrabold text-gray-900 truncate" title={trackingData.destination}>{trackingData.destination}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 md:order-2 order-1 ${trackingData.category === "Internasional" ? "bg-[#C5A059]/10 border border-[#C5A059]/20" : "bg-[#7A171D]/10 border border-[#7A171D]/20"}`}>
                    <MapPin className={`w-5 h-5 ${trackingData.category === "Internasional" ? "text-[#C5A059]" : "text-[#7A171D]"}`} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-[#7A171D]/5 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-8 flex items-center gap-2 border-b pb-4 border-gray-100">
                  <Clock className="w-5 h-5 text-[#C5A059]" /> Riwayat Perjalanan
                </h3>

                <div className="relative pl-4 md:pl-8">
                  <div className="absolute top-0 bottom-0 left-[35px] md:left-[51px] w-0.5 bg-gray-100"></div>

                  <div className="space-y-8 relative">
                    {timelineData.map((item, index) => {
                      const NodeIcon = item.icon as React.ElementType;
                      
                      return (
                        <motion.div 
                          key={item.id || index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.1 }}
                          className="flex gap-4 md:gap-6 relative"
                        >
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 relative z-10 border-4 border-white shadow-sm ${
                            item.isCurrent ? "bg-[#7A171D] text-white shadow-lg shadow-[#7A171D]/30" : 
                            item.isCompleted ? "bg-[#C5A059] text-white" : "bg-gray-100 text-gray-400"
                          }`}>
                            <NodeIcon className="w-5 h-5" />
                          </div>

                          <div className="pt-1 flex-1 pb-2">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1 mb-1">
                              <h4 className={`text-base font-extrabold ${item.isCurrent ? "text-[#7A171D]" : "text-gray-900"}`}>
                                {item.status}
                              </h4>
                              <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg shrink-0">
                                {item.date}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed mb-2">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                              <MapPin className="w-3.5 h-3.5" /> {item.location}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </motion.div>
          </AnimatePresence>
        )}

      </div>
    </main>
  );
}