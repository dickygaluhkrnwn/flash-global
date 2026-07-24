"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, Clock, MapPin, Plane, 
  Package, ArrowLeft, Ship, Truck, AlertCircle, MapPinned, User, Banknote, Camera, X
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { doc, onSnapshot, getDoc, getDocs, collection } from "firebase/firestore";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

import { 
  Coordinates, LocationDetail, 
  MapDropItem, TrackingData, MapViewState 
} from "@/types/order";

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex flex-col items-center justify-center text-slate-500 text-xs font-semibold rounded-[2rem]"><div className="w-8 h-8 border-4 border-slate-300 border-t-[#7A171D] rounded-full animate-spin mb-3"></div>Mengambil koordinat satelit...</div> 
});

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

const getSafeMillis = (ts: unknown): number => {
  if (!ts) return 0;
  if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts).getTime();
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    if (typeof obj.toMillis === 'function') return obj.toMillis();
    if (typeof obj.seconds === 'number') return obj.seconds * 1000;
    if (typeof obj.toDate === 'function') {
      const dateObj = obj.toDate() as Date;
      return dateObj.getTime();
    }
  }
  return new Date(String(ts)).getTime();
};

export default function TrackingResultPage({ params }: { params: { resi: string } }) {
  const awbNumber = decodeURIComponent(params.resi);

  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [routeData, setRouteData] = useState<unknown>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);

  const [mapViewState, setMapViewState] = useState<MapViewState>({ longitude: 118.0149, latitude: -2.5489, zoom: 4.5 });
  
  const [liveDriverCoords, setLiveDriverCoords] = useState<Coordinates | null>(null);

  // 🚀 STATE UNTUK MODAL FOTO BUKTI (PoD)
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  const getCoords = (locationData: unknown): Coordinates | null => {
    if (locationData && typeof locationData === "object" && "lng" in locationData && "lat" in locationData) {
      const loc = locationData as Record<string, unknown>;
      if (typeof loc.lng === "number" && typeof loc.lat === "number") {
        return { lng: loc.lng, lat: loc.lat };
      }
    }
    return null;
  };

  const originLatLng = trackingData ? getCoords(trackingData.origin) : null;
  
  const dropsForMap: MapDropItem[] = trackingData?.destinations ? trackingData.destinations.map((d, idx) => ({
    id: `dest-${idx}`, 
    lng: d.lng || 0, 
    lat: d.lat || 0, 
    address: d.address || ""
  })) : [];

  if (dropsForMap.length === 0 && trackingData?.destination && typeof trackingData.destination === 'object') {
    const dCoord = getCoords(trackingData.destination);
    if (dCoord) dropsForMap.push({ id: "dest-single", lng: dCoord.lng, lat: dCoord.lat, address: trackingData.destination.address || "" });
  }

  useEffect(() => {
    let unsub = () => {};
    setIsLoading(true);
    setIsNotFound(false);

    const findAndListenOrder = async () => {
      let targetId = awbNumber;
      let targetCollection = "orders";
      let isGlobal = false;

      try {
        let docRef = doc(db, "orders", targetId);
        let docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          docRef = doc(db, "quotes", targetId);
          docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            targetCollection = "quotes";
            isGlobal = true;
          } else {
            const ordersSnap = await getDocs(collection(db, "orders"));
            const queryUpper = awbNumber.toUpperCase();

            const foundOrder = ordersSnap.docs.find(d => {
              const data = d.data();
              const matchId = d.id.toUpperCase().includes(queryUpper);
              const matchResiArray = data.destinations?.some((dest: LocationDetail) => dest.resi?.toUpperCase().includes(queryUpper));
              const matchResiMain = data.resi?.toUpperCase().includes(queryUpper);
              
              return matchId || matchResiArray || matchResiMain;
            });
            
            if (foundOrder) {
              targetId = foundOrder.id; 
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
                 return;
              }
            }
          }
        }

        const finalDocRef = doc(db, targetCollection, targetId);
        unsub = onSnapshot(finalDocRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
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

  useEffect(() => {
    const fetchRealRoute = async () => {
      const validDrops = dropsForMap.filter((d) => d.lng !== 0 && d.lat !== 0);
      if (!originLatLng || validDrops.length === 0) {
        setRouteData(null);
        if (originLatLng) setMapViewState({ longitude: originLatLng.lng, latitude: originLatLng.lat, zoom: 12 });
        return;
      }
      
      const maxAllowedDrops = validDrops.slice(0, 24);
      const waypoints = [`${originLatLng.lng},${originLatLng.lat}`, ...maxAllowedDrops.map((d) => `${d.lng},${d.lat}`)].join(";");
      
      try {
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const currentRoute = data.routes[0];
          const distanceKm = Number((currentRoute.distance / 1000).toFixed(1));
          setRouteData(currentRoute.geometry);
          setRouteDistanceKm(distanceKm);

          let midLng = originLatLng.lng; let midLat = originLatLng.lat;
          if (maxAllowedDrops.length === 1) { 
            midLng = (originLatLng.lng + maxAllowedDrops[0].lng) / 2; 
            midLat = (originLatLng.lat + maxAllowedDrops[0].lat) / 2; 
          }

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

  // ====================================================================
  // ALGORITMA LOKASI TRUK (LIVE DARI DATABASE ATAU SIMULASI)
  // ====================================================================
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const status = trackingData?.status || "";
    const isActiveStatus = status === "Dikirim" || status.includes("Transit") || status.includes("Jemput");
    const isCompletedStatus = status.includes("Selesai") || status.includes("Tiba");

    const actualDriverCoords = getCoords(trackingData?.driverCoords);
    
    if (isCompletedStatus) {
      if (dropsForMap.length > 0) {
        const lastDrop = dropsForMap[dropsForMap.length - 1];
        setLiveDriverCoords({ lng: lastDrop.lng!, lat: lastDrop.lat! });
      }
    } else if (actualDriverCoords) {
       // Prioritaskan Live GPS dari Firebase
       setLiveDriverCoords(actualDriverCoords);
    } else if (isActiveStatus && routeData && typeof routeData === "object" && "coordinates" in routeData) {
      const geometry = routeData as { coordinates: [number, number][] };
      const coords = geometry.coordinates;
      let currentIndex = 0;

      if (coords && coords.length > 0) {
        interval = setInterval(() => {
          if (currentIndex < coords.length) {
            setLiveDriverCoords({ lng: coords[currentIndex][0], lat: coords[currentIndex][1] });
            const step = Math.max(1, Math.floor(coords.length / 80)); 
            currentIndex += step;
          } else {
            currentIndex = 0; 
          }
        }, 150);
      }
    } else {
      setLiveDriverCoords(originLatLng || null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingData?.status, routeData, trackingData?.driverCoords]);


  const formatFirebaseDate = (timestamp: unknown) => {
    const millis = getSafeMillis(timestamp);
    if (millis === 0) return "Baru saja";
    return new Date(millis).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getIconForStatus = (statusText: string) => {
    const s = statusText.toLowerCase();
    if (s.includes("terbang") || s.includes("udara") || s.includes("pesawat")) return Plane;
    if (s.includes("laut") || s.includes("kapal") || s.includes("pelabuhan")) return Ship;
    if (s.includes("kurir") || s.includes("truk") || s.includes("jalan") || s.includes("antar") || s.includes("jemput") || s.includes("transit")) return Truck;
    if (s.includes("tiba") || s.includes("sampai") || s.includes("selesai") || s.includes("lunas") || s.includes("terverifikasi")) return CheckCircle2;
    if (s.includes("pembayaran")) return Banknote;
    return Package;
  };

  const renderTimeline = () => {
    if (!trackingData) return [];
    
    if (trackingData.trackingHistory && Array.isArray(trackingData.trackingHistory) && trackingData.trackingHistory.length > 0) {
      // 🚀 Definisikan Record<string, unknown> agar aman dari linter
      return [...trackingData.trackingHistory].reverse().map((item: Record<string, unknown>, idx) => {
        const rawLocation = (item.location as string) || "Pusat Logistik";
        const isGeotagged = rawLocation.includes("(Geotagged)");
        const displayLocation = rawLocation.replace("(Geotagged)", "").trim();

        return {
          ...item,
          id: (item.id as string) || `log-${idx}`, // 🚀 PERBAIKAN: Pastikan ID Selalu Ada
          status: (item.status as string) || "",
          date: (item.date as string) || "",
          description: (item.description as string) || "",
          proofUrl: item.proofUrl as string | undefined, 
          icon: getIconForStatus((item.status as string) || ""),
          isCurrent: idx === 0, 
          isCompleted: true,
          isGeotagged,
          displayLocation
        };
      });
    }

    return [
      {
        id: "def-1",
        status: trackingData.status || "Menunggu Pembayaran",
        description: trackingData.statusSub || "Menunggu verifikasi sistem pembayaran atau penugasan kurir.",
        displayLocation: typeof trackingData.origin === 'string' ? trackingData.origin : (trackingData.origin?.address || "System Hub"),
        isGeotagged: false,
        date: formatFirebaseDate(trackingData.createdAt),
        icon: getIconForStatus(trackingData.status || "Menunggu Pembayaran"),
        isCompleted: true,
        isCurrent: true,
        proofUrl: undefined 
      }
    ];
  };

  const timelineData = renderTimeline();
  const isUsingLiveGPS = !!getCoords(trackingData?.driverCoords) && !trackingData?.status?.includes("Selesai");

  return (
    <main className="min-h-screen bg-slate-50 py-12 lg:py-16 px-6 relative overflow-hidden font-sans pb-20">
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.04] pointer-events-none" />

      {/* 🚀 MODAL PREVIEW BUKTI TRANSFER / PoD (FULLSCREEN) */}
      <AnimatePresence>
        {proofModalUrl && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={() => setProofModalUrl(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 max-w-2xl w-full flex flex-col items-center">
              <button onClick={() => setProofModalUrl(null)} className="absolute -top-12 right-0 bg-white/20 text-white rounded-full p-2 hover:bg-white/40 transition-colors">
                <X className="w-6 h-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proofModalUrl} alt="Bukti Foto" className="rounded-2xl max-h-[85vh] w-auto shadow-2xl border border-white/20" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-[1300px] mx-auto relative z-10">
        
        <div className="mb-8">
          <Link href="/desktop/tracking" className="text-xs font-bold text-slate-500 hover:text-[#7A171D] transition-all flex items-center gap-2 w-fit bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md">
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
            <Link href="/desktop/tracking" className="mt-8 bg-[#7A171D] hover:bg-[#5A0E13] text-white font-bold py-3.5 px-8 rounded-xl transition-colors shadow-lg shadow-[#7A171D]/20 active:scale-95">
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
                      {trackingData.status?.includes("Selesai") ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Package className="w-6 h-6" />}
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
                    <div className={`w-2 h-2 rounded-full animate-pulse shadow-sm ${isUsingLiveGPS ? 'bg-emerald-500 shadow-emerald-500/80' : 'bg-blue-500 shadow-blue-500/80'}`}></div>
                    <span className="text-slate-900 text-[10px] font-black uppercase tracking-widest">
                      {isUsingLiveGPS ? 'GPS Aktual Kurir' : 'Radar Armada Live'}
                    </span>
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
                    driverCoords={liveDriverCoords} 
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
                      {typeof trackingData.origin === 'object' && trackingData.origin?.senderName && (
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
                      {((trackingData.destinations && trackingData.destinations[0]?.receiverName) || (typeof trackingData.destination === 'object' && trackingData.destination?.receiverName)) && (
                        <p className="text-xs text-slate-500 font-medium mt-1 flex items-center md:justify-end gap-1.5"><User className="w-3 h-3"/> {trackingData.destinations?.[0]?.receiverName || (typeof trackingData.destination === 'object' ? trackingData.destination?.receiverName : "")}</p>
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
                      <AnimatePresence>
                        {timelineData.map((item, index) => {
                          const NodeIcon = item.icon;
                          return (
                            <motion.div 
                              key={item.id || index}
                              initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
                              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                              transition={{ duration: 0.4, delay: index * 0.15, ease: "easeOut" }}
                              className="flex gap-4 md:gap-6 relative items-start group"
                            >
                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 z-10 border-[3px] shadow-sm transition-all duration-300 ${
                                item.isCurrent 
                                  ? "bg-[#7A171D] text-white border-white shadow-lg shadow-[#7A171D]/30 scale-110" 
                                  : "bg-slate-50 text-slate-400 border-white group-hover:border-slate-200 group-hover:bg-slate-100"
                              }`}>
                                <NodeIcon className="w-4 h-4 md:w-5 md:h-5" />
                              </div>

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
                                
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-white w-fit px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {item.displayLocation}
                                  </div>
                                  {item.isGeotagged && (
                                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 w-fit px-2 py-1.5 rounded-lg uppercase tracking-wider shadow-sm">
                                      <CheckCircle2 className="w-3 h-3" /> GPS Verified
                                    </div>
                                  )}
                                  
                                  {/* 🚀 TOMBOL PREVIEW FOTO BUKTI PENGIRIMAN */}
                                  {item.proofUrl && (
                                    <button 
                                      onClick={() => setProofModalUrl(item.proofUrl as string)}
                                      className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors px-2 py-1.5 rounded-lg uppercase tracking-wider shadow-sm"
                                    >
                                      <Camera className="w-3 h-3" /> Lihat Bukti Foto
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
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