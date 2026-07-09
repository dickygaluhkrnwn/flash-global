"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, Clock, MapPin, Plane, 
  Package, ArrowLeft, Ship, Truck, AlertCircle, MapPinned 
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

// --- IMPORT UI KIT KITA ---
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// --- DYNAMIC IMPORT MAPBASE ---
const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500 text-xs font-semibold">Mengambil koordinat satelit kargo...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// --- TYPES & INTERFACES ---
type FirebaseTimestamp = { toDate?: () => Date } | string | number | null | undefined;

interface TrackingHistoryItem {
  id?: string | number;
  status: string;
  date: string;
  description?: string;
  location?: string;
  [key: string]: unknown;
}

interface TrackingData {
  id: string;
  category: "Domestik" | "Internasional";
  status?: string;
  statusSub?: string;
  origin?: any; 
  destination?: any; 
  destinations?: any[];
  createdAt?: FirebaseTimestamp;
  trackingHistory?: TrackingHistoryItem[];
  driverCoords?: { lat: number; lng: number };
  [key: string]: unknown;
}

export default function TrackingResultPage({ params }: { params: { resi: string } }) {
  // KUNCI UTAMA: Decode URI dan pastikan menjadi huruf besar untuk dicocokkan ke dokumen Firestore
  const awbNumber = decodeURIComponent(params.resi).toUpperCase();

  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);

  const getCoords = (locationData: any) => {
    if (locationData && typeof locationData === "object" && locationData.lng && locationData.lat) {
      return { lng: Number(locationData.lng), lat: Number(locationData.lat) };
    }
    return null;
  };

  const originLatLng = trackingData ? getCoords(trackingData.origin) : null;
  const destLatLng = trackingData && Array.isArray(trackingData.destinations) && trackingData.destinations.length > 0 
    ? getCoords(trackingData.destinations[0]) 
    : (trackingData ? getCoords(trackingData.destination) : null);

  const originLng = originLatLng?.lng;
  const originLat = originLatLng?.lat;
  const destLng = destLatLng?.lng;
  const destLat = destLatLng?.lat;

  useEffect(() => {
    let unsub = () => {};
    setIsLoading(true);
    setIsNotFound(false);

    // PERBAIKAN LOGIKA: Gunakan ID huruf besar asli (awbNumber) agar tidak loop loading/404
    const docRef = doc(db, "orders", awbNumber);
    unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTrackingData({
          category: "Domestik",
          id: docSnap.id,
          ...data
        });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setIsNotFound(true);
      }
    }, (error) => {
      console.error("Gagal melacak manifes:", error);
      setIsLoading(false);
      setIsNotFound(true);
    });

    return () => unsub();
  }, [awbNumber]);

  // Kalkulasi Garis Rute Mapbox
  useEffect(() => {
    if (!originLng || !originLat || !destLng || !destLat) return;

    const getTrackRoute = async () => {
      try {
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          setRouteData(data.routes[0].geometry);
        }
      } catch (err) {
        console.error("Gagal menggambar lintasan kargo:", err);
      }
    };
    getTrackRoute();
  }, [originLng, originLat, destLng, destLat]);

  const formatFirebaseDate = (timestamp: FirebaseTimestamp) => {
    if (!timestamp) return "Baru saja";
    const date = (typeof timestamp === "object" && "toDate" in timestamp && typeof timestamp.toDate === "function") 
      ? timestamp.toDate() 
      : new Date(timestamp as string | number);
      
    return date.toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const getIconForStatus = (statusText: string) => {
    const s = statusText.toLowerCase();
    if (s.includes("terbang") || s.includes("udara") || s.includes("pesawat")) return Plane;
    if (s.includes("laut") || s.includes("kapal") || s.includes("pelabuhan")) return Ship;
    if (s.includes("kurir") || s.includes("truk") || s.includes("jalan") || s.includes("antar")) return Truck;
    if (s.includes("tiba") || s.includes("sampai") || s.includes("selesai") || s.includes("terima")) return CheckCircle2;
    return Package;
  };

  const renderTimeline = () => {
    if (!trackingData) return [];
    // Jika sudah ada log history yang di-update admin, tampilkan list lengkapnya
    if (trackingData.trackingHistory && Array.isArray(trackingData.trackingHistory) && trackingData.trackingHistory.length > 0) {
      return [...trackingData.trackingHistory].reverse().map((item, idx) => ({
        ...item,
        icon: getIconForStatus(item.status),
        isCurrent: idx === 0,
        isCompleted: true
      }));
    }
    // Jika belum ada history log dari admin, buat fallback default dari data pembuatan order
    return [
      {
        id: "def-1",
        status: trackingData.status || "Pesanan Diterima",
        description: trackingData.statusSub || "Paket sedang dipersiapkan di pusat sortir Flash Global.",
        location: typeof trackingData.origin === "string" ? trackingData.origin : (trackingData.origin?.address || "Hub Penjemputan"),
        date: formatFirebaseDate(trackingData.createdAt),
        icon: trackingData.status === "Selesai" ? CheckCircle2 : Package,
        isCompleted: true,
        isCurrent: true
      }
    ];
  };

  const timelineData = renderTimeline();

  return (
    <main className="min-h-screen bg-[#F8F9FA] py-12 px-4 md:px-8 relative overflow-hidden selection:bg-brand-maroon selection:text-white">
      {/* Premium Background Elements */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-brand-maroon rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-gold rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none mix-blend-overlay"></div>

      <div className="max-w-[1300px] mx-auto relative z-10">
        
        <div className="mb-8">
          <Link href="/tracking" className="text-xs font-bold text-gray-500 hover:text-brand-maroon transition-all flex items-center gap-2 w-fit bg-white px-4 py-2.5 rounded-xl border border-gray-200/60 shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Pencarian
          </Link>
        </div>

        {isLoading ? (
          <Card className="min-h-[550px] flex flex-col items-center justify-center border-gray-100 shadow-premium">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-brand-maroon rounded-full animate-spin mb-4 shadow-sm"></div>
            <h2 className="text-lg font-black text-gray-900">Menyinkronkan Manifes</h2>
            <p className="text-gray-400 text-xs font-semibold animate-pulse mt-1">Menghubungkan ke satelit pelacakan armada...</p>
          </Card>
        ) : isNotFound || !trackingData ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[2rem] border border-dashed border-gray-300 p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-5 border border-red-100">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Nomor Resi Tidak Terdaftar</h2>
            <p className="text-gray-500 mt-2 text-sm max-w-sm leading-relaxed">Sistem tidak mendeteksi kode resi <b className="text-gray-800">{awbNumber}</b>. Periksa kembali karakter atau hubungi CS Flash Global.</p>
            <Link href="/tracking" className="mt-8 bg-gray-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-md">
              Cari Ulang Resi
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* ========================================================= */}
            {/* PANEL KIRI: LIVE MAP MONITORING & OVERVIEW                */}
            {/* ========================================================= */}
            <div className="w-full lg:w-[55%] xl:w-[60%] space-y-6">
              
              {/* Header Title Info */}
              <Card className="shadow-premium border-gray-100">
                <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <Badge variant="default" className={cn("mb-2", trackingData.category === "Internasional" ? "bg-brand-gold/10 text-brand-gold border-brand-gold/20" : "bg-brand-maroon/10 text-brand-maroon border-brand-maroon/20")}>
                      Kargo {trackingData.category}
                    </Badge>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                      Manifes <span className="text-brand-maroon font-mono">{awbNumber}</span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-brand-maroon">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Status Utama</p>
                      <p className="text-sm font-black text-gray-800">{trackingData.status || "In Transit"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* LIVE MAP BOX CONTAINER */}
              <div className="bg-slate-900 rounded-[2rem] p-1.5 shadow-premium border border-slate-800 relative group overflow-hidden">
                <div className="absolute top-5 left-5 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 z-10 flex items-center gap-2 shadow-lg pointer-events-none">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                  <span className="text-white text-[9px] font-black uppercase tracking-widest">Radar Armada Live</span>
                </div>

                <div className="w-full h-80 md:h-[400px] rounded-[1.75rem] relative overflow-hidden bg-[#0B0F19]">
                  <MapBase
                    longitude={trackingData.driverCoords?.lng || originLng || 116.2736}
                    latitude={trackingData.driverCoords?.lat || originLat || -8.7060}
                    zoom={originLatLng ? 12 : 9}
                    className="w-full h-full"
                    originCoords={originLatLng}
                    drops={destLatLng ? [{ id: "dest-1", lng: destLatLng.lng, lat: destLatLng.lat }] : []}
                    routeData={routeData}
                    driverCoords={trackingData.driverCoords as any}
                  />

                  {!originLatLng && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm z-10 pointer-events-none">
                      <MapPinned className="w-10 h-10 text-slate-500 mb-3 opacity-80" />
                      <p className="text-slate-300 text-xs font-semibold bg-black/60 px-4 py-2 rounded-full border border-slate-700 mt-3">Data koordinat belum tersedia</p>
                    </div>
                  )}
                  <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] pointer-events-none z-10"></div>
                </div>
              </div>

              {/* ROUTE NODE OVERVIEW */}
              <Card className="shadow-premium border-gray-100">
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 text-gray-500 shrink-0">
                      <MapPin className="w-5 h-5"/>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Asal Pengiriman</p>
                      <p className="text-sm font-black text-gray-800 truncate">{typeof trackingData.origin === 'string' ? trackingData.origin : (trackingData.origin?.address || "Titik Koordinat Asal")}</p>
                    </div>
                  </div>
                  
                  <div className="hidden md:flex items-center justify-center text-gray-200">
                    <div className="w-full h-[2px] bg-dashed border-t-2 border-gray-100"></div>
                  </div>
                  
                  <div className="flex items-center gap-3 md:justify-end md:text-right">
                    <div className="md:order-1 order-2 overflow-hidden">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Destinasi Akhir</p>
                      <p className="text-sm font-black text-gray-800 truncate">
                        {Array.isArray(trackingData.destinations) && trackingData.destinations.length > 0 
                          ? trackingData.destinations[0].address 
                          : (trackingData.destination?.address || trackingData.destination || "Titik Koordinat Tujuan")}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold shrink-0 md:order-2 order-1">
                      <MapPin className="w-5 h-5"/>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* ========================================================= */}
            {/* PANEL KANAN: TIMELINE MANIFES PROGRESS                    */}
            {/* ========================================================= */}
            <div className="w-full lg:w-[45%] xl:w-[40%]">
              <Card className="shadow-premium border-gray-100">
                <CardHeader className="p-6 md:p-8 border-b border-gray-100 flex flex-row items-center gap-3">
                  <Clock className="w-5 h-5 text-brand-gold" />
                  <h3 className="text-lg font-black text-gray-900 m-0">Log Alur Manifes Paket</h3>
                </CardHeader>
                
                <CardContent className="p-6 md:p-8">
                  <div className="relative pl-2 md:pl-4">
                    {/* Vertical Timeline Rail Line */}
                    <div className="absolute top-2 bottom-6 left-[21px] md:left-[29px] w-[2px] bg-gray-100"></div>

                    <div className="space-y-6 relative">
                      {timelineData.map((item, index) => {
                        const NodeIcon = item.icon;
                        return (
                          <div key={item.id || index} className="flex gap-4 md:gap-5 relative items-start">
                            {/* Ring Progress Node Status */}
                            <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm ${
                              item.isCurrent ? "bg-brand-maroon text-white shadow-md shadow-brand-maroon/20 animate-in zoom-in" : "bg-gray-100 text-gray-400"
                            }`}>
                              <NodeIcon className="w-4 h-4" />
                            </div>

                            {/* Text Deskripsi Node */}
                            <div className="flex-1 bg-gray-50/50 hover:bg-gray-50 border border-gray-100/70 p-4 rounded-2xl transition-colors shadow-inner">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                                <h4 className={`text-sm font-black ${item.isCurrent ? "text-brand-maroon" : "text-gray-800"}`}>
                                  {item.status}
                                </h4>
                                <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap bg-white px-2 py-0.5 rounded-md border shadow-sm mt-1 sm:mt-0">
                                  {item.date}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 font-medium leading-relaxed mb-2">{item.description}</p>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                <MapPin className="w-3 h-3" /> {item.location || "Pusat Logistik"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}