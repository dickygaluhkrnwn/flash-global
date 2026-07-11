"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, Clock, MapPin, Plane, 
  Package, ArrowLeft, Ship, Truck, AlertCircle, MapPinned, FileText, User, Banknote
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { doc, onSnapshot, getDoc, getDocs, collection } from "firebase/firestore";

// --- IMPORT UI KIT KITA ---
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// --- DYNAMIC IMPORT MAPBASE ---
const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex flex-col items-center justify-center text-slate-500 text-xs font-semibold rounded-[2rem]"><div className="w-8 h-8 border-4 border-slate-300 border-t-[#7A171D] rounded-full animate-spin mb-3"></div>Mengambil koordinat satelit...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

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
  vehicleName?: string;
  serviceType?: string;
  resi?: string;
  [key: string]: unknown;
}

export default function TrackingResultPage({ params }: { params: { resi: string } }) {
  // Decode URI dari URL
  const awbNumber = decodeURIComponent(params.resi);

  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);

  const [mapViewState, setMapViewState] = useState({ longitude: 118.0149, latitude: -2.5489, zoom: 4.5 });

  const getCoords = (locationData: any) => {
    if (locationData && typeof locationData === "object" && locationData.lng && locationData.lat) {
      return { lng: Number(locationData.lng), lat: Number(locationData.lat) };
    }
    return null;
  };

  const originLatLng = trackingData ? getCoords(trackingData.origin) : null;
  
  // Format array destinations untuk MapBase
  const dropsForMap = trackingData?.destinations ? trackingData.destinations.map((d: any, idx: number) => ({
    id: `dest-${idx}`, lng: d.lng, lat: d.lat, address: d.address
  })) : [];

  if (dropsForMap.length === 0 && trackingData?.destination) {
    const dCoord = getCoords(trackingData.destination);
    if (dCoord) dropsForMap.push({ id: "dest-single", lng: dCoord.lng, lat: dCoord.lat, address: trackingData.destination.address || "" });
  }

  // ====================================================================
  // SUPER SMART FALLBACK TRACKING LOGIC (UPDATE)
  // ====================================================================
  useEffect(() => {
    let unsub = () => {};
    setIsLoading(true);
    setIsNotFound(false);

    const findAndListenOrder = async () => {
      let targetId = awbNumber;
      let targetCollection = "orders";
      let isGlobal = false;

      try {
        // 1. Coba pencarian Exact Match (Sama Persis) ID Dokumen
        let docRef = doc(db, "orders", targetId);
        let docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          docRef = doc(db, "quotes", targetId);
          docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            targetCollection = "quotes";
            isGlobal = true;
          } else {
            // 3. PENCARIAN CERDAS KE SELURUH DATABASE
            const ordersSnap = await getDocs(collection(db, "orders"));
            const queryUpper = awbNumber.toUpperCase();

            const foundOrder = ordersSnap.docs.find(d => {
              const data = d.data();
              // Cek ID Dokumen
              const matchId = d.id.toUpperCase().includes(queryUpper);
              // Cek Resi di Array Destinations
              const matchResiArray = data.destinations?.some((dest: any) => dest.resi?.toUpperCase().includes(queryUpper));
              // Cek Resi di Induk
              const matchResiMain = data.resi?.toUpperCase().includes(queryUpper);
              
              return matchId || matchResiArray || matchResiMain;
            });
            
            if (foundOrder) {
              targetId = foundOrder.id; // Kunci Target ID dengan ID Asli Database
              targetCollection = "orders";
            } else {
              const quotesSnap = await getDocs(collection(db, "quotes"));
              const foundQuote = quotesSnap.docs.find(d => d.id.toUpperCase().includes(queryUpper) || d.data().quoteId?.toUpperCase().includes(queryUpper));
              
              if (foundQuote) {
                 targetId = foundQuote.id;
                 targetCollection = "quotes";
                 isGlobal = true;
              } else {
                 setIsLoading(false);
                 setIsNotFound(true);
                 return; // Gagal Semua
              }
            }
          }
        }

        // Jika berhasil ditemukan, lakukan Live Data Snapshot
        const finalDocRef = doc(db, targetCollection, targetId);
        unsub = onSnapshot(finalDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            
            // Ambil resi representatif jika ada
            const resiStr = data.destinations?.[0]?.resi || data.resi || snap.id;

            setTrackingData({
              category: isGlobal || data.serviceType === "Kargo Global" ? "Internasional" : "Domestik",
              id: resiStr, 
              ...data
            });
            setIsLoading(false);
          } else {
            setIsNotFound(true);
            setIsLoading(false);
          }
        }, (err) => {
          console.error("Gagal Live Listener:", err);
          setIsNotFound(true);
          setIsLoading(false);
        });

      } catch (error) {
        console.error("Error finding tracking document:", error);
        setIsNotFound(true);
        setIsLoading(false);
      }
    };

    findAndListenOrder();

    return () => unsub();
  }, [awbNumber]);

  // Kalkulasi Garis Rute Mapbox & AUTO ZOOM
  useEffect(() => {
    const fetchRealRoute = async () => {
      const validDrops = dropsForMap.filter((d: any) => d.lng !== undefined && d.lat !== undefined);
      if (!originLatLng || validDrops.length === 0) {
        setRouteData(null);
        if (originLatLng) setMapViewState({ longitude: originLatLng.lng, latitude: originLatLng.lat, zoom: 12 });
        return;
      }
      
      const maxAllowedDrops = validDrops.slice(0, 24);
      const waypoints = [`${originLatLng.lng},${originLatLng.lat}`, ...maxAllowedDrops.map((d: any) => `${d.lng},${d.lat}`)].join(";");
      
      try {
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const currentRoute = data.routes[0];
          const distanceKm = Number((currentRoute.distance / 1000).toFixed(1));
          setRouteData(currentRoute.geometry);
          setRouteDistanceKm(distanceKm);

          let midLng = originLatLng.lng; let midLat = originLatLng.lat;
          if (maxAllowedDrops.length === 1) { midLng = (originLatLng.lng + maxAllowedDrops[0].lng!) / 2; midLat = (originLatLng.lat + maxAllowedDrops[0].lat!) / 2; }

          let dynamicZoom = 4;
          if (distanceKm < 5) dynamicZoom = 12.5;
          else if (distanceKm < 20) dynamicZoom = 11;
          else if (distanceKm < 50) dynamicZoom = 10;
          else if (distanceKm < 150) dynamicZoom = 8.5;
          else if (distanceKm < 400) dynamicZoom = 7;
          else if (distanceKm < 1000) dynamicZoom = 5.5;
          
          setMapViewState({ longitude: midLng, latitude: midLat, zoom: dynamicZoom });
        }
      } catch (err) { console.error("Gagal menarik rute:", err); }
    };
    
    if (trackingData) {
      const timer = setTimeout(fetchRealRoute, 600);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingData]);

  const formatFirebaseDate = (timestamp: FirebaseTimestamp) => {
    if (!timestamp) return "Baru saja";
    const date = (typeof timestamp === "object" && "toDate" in timestamp && typeof timestamp.toDate === "function") ? timestamp.toDate() : new Date(timestamp as string | number);
    return date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getIconForStatus = (statusText: string) => {
    const s = statusText.toLowerCase();
    if (s.includes("terbang") || s.includes("udara") || s.includes("pesawat")) return Plane;
    if (s.includes("laut") || s.includes("kapal") || s.includes("pelabuhan")) return Ship;
    if (s.includes("kurir") || s.includes("truk") || s.includes("jalan") || s.includes("antar") || s.includes("jemput")) return Truck;
    if (s.includes("tiba") || s.includes("sampai") || s.includes("selesai") || s.includes("lunas") || s.includes("terverifikasi")) return CheckCircle2;
    if (s.includes("pembayaran")) return Banknote;
    return Package;
  };

  const renderTimeline = () => {
    if (!trackingData) return [];
    
    // Reverse array agar log terbaru berada di paling atas
    if (trackingData.trackingHistory && Array.isArray(trackingData.trackingHistory) && trackingData.trackingHistory.length > 0) {
      return [...trackingData.trackingHistory].reverse().map((item, idx) => ({
        ...item,
        icon: getIconForStatus(item.status),
        isCurrent: idx === 0, // Item paling atas adalah status teraktual
        isCompleted: true
      }));
    }

    // Fallback pertama kali order dibuat
    return [
      {
        id: "def-1",
        status: trackingData.status || "Menunggu Pembayaran",
        description: trackingData.statusSub || "Menunggu verifikasi sistem pembayaran atau penugasan kurir.",
        location: typeof trackingData.origin === 'string' ? trackingData.origin : (trackingData.origin?.address || "System Hub"),
        date: formatFirebaseDate(trackingData.createdAt),
        icon: getIconForStatus(trackingData.status || "Menunggu Pembayaran"),
        isCompleted: true,
        isCurrent: true
      }
    ];
  };

  const timelineData = renderTimeline();

  return (
    <main className="min-h-screen bg-slate-50 py-12 lg:py-16 px-6 relative overflow-hidden font-sans pb-20">
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.04] pointer-events-none" />

      <div className="max-w-[1300px] mx-auto relative z-10">
        
        <div className="mb-8">
          <Link href="/tracking" className="text-xs font-bold text-slate-500 hover:text-[#7A171D] transition-all flex items-center gap-2 w-fit bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Pencarian
          </Link>
        </div>

        {isLoading ? (
          <div className="min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-[#7A171D] rounded-full animate-spin mb-5 shadow-sm"></div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Menyinkronkan Manifes</h2>
            <p className="text-slate-500 text-sm font-medium animate-pulse mt-1.5">Menghubungkan ke satelit pelacakan armada...</p>
          </div>
        ) : isNotFound || !trackingData ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="min-h-[500px] flex flex-col items-center justify-center bg-white rounded-[2rem] border border-dashed border-slate-300 p-8 text-center shadow-sm">
            <div className="w-20 h-20 bg-red-50 rounded-[1.5rem] flex items-center justify-center mb-6 border border-red-100">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Nomor Resi Tidak Ditemukan</h2>
            <p className="text-slate-500 mt-3 text-sm font-medium max-w-md leading-relaxed">Sistem tidak mendeteksi kode AWB/Resi <b className="text-slate-800">{awbNumber}</b>. Periksa kembali penulisan karakter atau hubungi CS Flash Global.</p>
            <Link href="/tracking" className="mt-8 bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-3.5 px-8 rounded-xl transition-colors shadow-lg shadow-[#7A171D]/20 active:scale-95">
              Cari Ulang Resi
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* PANEL KIRI: LIVE MAP & OVERVIEW */}
            <div className="w-full lg:w-[55%] xl:w-[60%] space-y-6 lg:sticky lg:top-28">
              
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <Badge variant="brand" className={cn("mb-3 px-3 py-1 shadow-sm text-[10px]", trackingData.category === "Internasional" ? "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/20" : "")}>
                      Kargo {trackingData.category}
                    </Badge>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      AWB <span className="text-[#7A171D] font-mono select-all">#{trackingData.id}</span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50 px-5 py-4 rounded-2xl border border-slate-200 shadow-inner">
                    <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#7A171D] border border-slate-100 shrink-0">
                      {trackingData.status === "Selesai" ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Package className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Status Terkini</p>
                      <p className="text-sm font-black text-slate-800 leading-tight">{trackingData.status || "In Transit"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-white rounded-[2rem] p-2 shadow-xl shadow-slate-200/50 border border-slate-200 relative group overflow-hidden">
                <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200 z-20 flex flex-col gap-1 shadow-sm pointer-events-none">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                    <span className="text-slate-900 text-[10px] font-black uppercase tracking-widest">Radar Armada Live</span>
                  </div>
                  <p className="text-slate-500 text-[9px] font-bold uppercase">{routeDistanceKm > 0 ? `Jarak: ${routeDistanceKm} KM` : "Menghitung Rute"}</p>
                </div>

                <div className="w-full h-[350px] md:h-[450px] rounded-[1.5rem] relative overflow-hidden bg-slate-100 border border-slate-200/50">
                  <MapBase
                    longitude={mapViewState.longitude}
                    latitude={mapViewState.latitude}
                    zoom={mapViewState.zoom}
                    className="w-full h-full"
                    originCoords={originLatLng}
                    drops={dropsForMap}
                    routeData={routeData}
                    driverCoords={trackingData.driverCoords as any}
                  />

                  {!originLatLng && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm z-10 pointer-events-none">
                      <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center">
                        <MapPinned className="w-8 h-8 text-slate-400 mb-3" />
                        <p className="text-slate-600 text-xs font-bold tracking-wide">Data koordinat belum disinkronkan</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200 text-slate-500 shrink-0 mt-1">
                      <MapPin className="w-5 h-5"/>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Asal Pengirim</p>
                      <p className="text-sm font-black text-slate-900 truncate" title={typeof trackingData.origin === 'string' ? trackingData.origin : (trackingData.origin?.address || "Titik Koordinat Asal")}>
                        {typeof trackingData.origin === 'string' ? trackingData.origin : (trackingData.origin?.address || "Titik Koordinat Asal")}
                      </p>
                      {trackingData.origin?.senderName && (
                        <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1.5"><User className="w-3 h-3"/> {trackingData.origin.senderName}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="hidden md:flex flex-col items-center justify-center text-slate-300">
                    <div className="w-full border-t-2 border-dashed border-slate-200 relative flex items-center justify-center">
                      <Truck className="w-5 h-5 text-slate-400 absolute bg-white px-1" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-3 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{trackingData.vehicleName || trackingData.serviceType || "Kargo"}</span>
                  </div>
                  
                  <div className="flex items-start gap-4 md:flex-row-reverse md:text-right">
                    <div className="w-10 h-10 rounded-xl bg-[#7A171D]/10 border border-[#7A171D]/20 flex items-center justify-center text-[#7A171D] shrink-0 mt-1">
                      <MapPin className="w-5 h-5"/>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tujuan Akhir</p>
                      <p className="text-sm font-black text-slate-900 truncate" title={dropsForMap.length > 1 ? "Multi-Drop Destinations" : (dropsForMap[0]?.address || "Tujuan")}>
                        {dropsForMap.length > 1 ? `${dropsForMap.length} Titik Tujuan` : (dropsForMap[0]?.address || "Titik Koordinat Tujuan")}
                      </p>
                      {(trackingData.destinations?.[0]?.receiverName || trackingData.destination?.receiverName) && (
                        <p className="text-xs text-slate-500 font-medium mt-1 flex items-center md:justify-end gap-1.5"><User className="w-3 h-3"/> {trackingData.destinations?.[0]?.receiverName || trackingData.destination?.receiverName}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* PANEL KANAN: TIMELINE MANIFES PROGRESS */}
            <div className="w-full lg:w-[45%] xl:w-[40%]">
              <Card className="shadow-xl shadow-slate-200/40 border-slate-200">
                <CardHeader className="p-6 md:p-8 border-b border-slate-100 flex flex-row items-center gap-3 bg-slate-50/50">
                  <Clock className="w-5 h-5 text-[#C5A059]" />
                  <h3 className="text-lg font-black text-slate-900 m-0 tracking-tight">Log Riwayat Perjalanan</h3>
                </CardHeader>
                
                <CardContent className="p-6 md:p-8">
                  <div className="relative pl-2 md:pl-4">
                    {/* Vertical Timeline Rail Line */}
                    <div className="absolute top-4 bottom-8 left-[23px] md:left-[31px] w-[2px] bg-slate-100"></div>

                    <div className="space-y-8 relative">
                      {timelineData.map((item, index) => {
                        const NodeIcon = item.icon;
                        return (
                          <div key={item.id || index} className="flex gap-4 md:gap-6 relative items-start group">
                            
                            {/* Ring Progress Node Status */}
                            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 z-10 border-[3px] shadow-sm transition-all duration-300 ${
                              item.isCurrent 
                                ? "bg-[#7A171D] text-white border-white shadow-lg shadow-[#7A171D]/30 scale-110" 
                                : "bg-slate-50 text-slate-400 border-white group-hover:border-slate-200 group-hover:bg-slate-100"
                            }`}>
                              <NodeIcon className="w-4 h-4 md:w-5 md:h-5" />
                            </div>

                            {/* Text Deskripsi Node */}
                            <div className={`flex-1 p-5 rounded-2xl transition-all duration-300 ${
                              item.isCurrent
                                ? "bg-white border-2 border-slate-200 shadow-md"
                                : "bg-slate-50/50 border border-slate-100 group-hover:bg-slate-50"
                            }`}>
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                                <h4 className={`text-sm font-black tracking-wide ${item.isCurrent ? "text-slate-900" : "text-slate-700"}`}>
                                  {item.status}
                                </h4>
                                <span className={`text-[10px] font-bold whitespace-nowrap px-2.5 py-1 rounded-md border w-fit ${
                                  item.isCurrent ? "bg-red-50 text-red-600 border-red-100" : "bg-white text-slate-500 border-slate-200"
                                }`}>
                                  {item.date}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-3">{item.description}</p>
                              
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 bg-white w-fit px-2.5 py-1.5 rounded-lg border border-slate-100">
                                <MapPin className="w-3.5 h-3.5" /> {item.location || "Pusat Logistik"}
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