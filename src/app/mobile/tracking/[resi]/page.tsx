"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, Clock, MapPin, Plane, ArrowLeft,
  Package, Ship, Truck, AlertCircle, MapPinned, User, Banknote, Camera, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// --- IMPORT FIREBASE CORE ---
import { db } from "@/lib/firebase";
import { doc, onSnapshot, getDoc, getDocs, collection } from "firebase/firestore";

import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

import { 
  Coordinates, LocationDetail, 
  MapDropItem, TrackingData, MapViewState 
} from "@/types/order";

const MapBase = dynamic(() => import("@/components/desktop/MapBase"), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-slate-100/50 backdrop-blur-md animate-pulse flex flex-col items-center justify-center text-slate-500 text-[10px] font-black uppercase tracking-widest"><div className="w-8 h-8 border-[3px] border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-3 shadow-sm"></div>Menghubungkan Radar...</div> 
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

export default function MobileTrackingResultPage({ params }: { params: { resi: string } }) {
  const router = useRouter();
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
          if (distanceKm < 5) dynamicZoom = 11.5;
          else if (distanceKm < 20) dynamicZoom = 10.5;
          else if (distanceKm < 50) dynamicZoom = 9.5;
          else if (distanceKm < 150) dynamicZoom = 8;
          else if (distanceKm < 400) dynamicZoom = 6.5;
          else if (distanceKm < 1000) dynamicZoom = 5;
          
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
      return [...trackingData.trackingHistory].reverse().map((item: Record<string, unknown>, idx) => {
        const rawLocation = (item.location as string) || "Pusat Logistik";
        const isGeotagged = rawLocation.includes("(Geotagged)");
        const displayLocation = rawLocation.replace("(Geotagged)", "").trim();

        return {
          ...item,
          id: (item.id as string) || `log-${idx}`, 
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
    // FULL OVERLAY (Native Push View) - Memblokir BottomNav Global
    <div className="fixed inset-0 z-[150] bg-[#f8fafc] flex justify-center font-sans overflow-hidden">
      
      {/* 🚀 MODAL PREVIEW BUKTI TRANSFER / PoD (FULLSCREEN GLASS) DI ATAS SEGALANYA */}
      <AnimatePresence>
        {proofModalUrl && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setProofModalUrl(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 max-w-sm w-full flex flex-col items-center">
              <button onClick={() => setProofModalUrl(null)} className="absolute -top-14 right-0 bg-white/20 text-white rounded-full p-2.5 hover:bg-white/40 transition-colors border border-white/30 shadow-lg active:scale-95 tap-highlight-transparent">
                <X className="w-5 h-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proofModalUrl} alt="Bukti Foto" className="rounded-[1.5rem] max-h-[70vh] w-auto shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/20 object-contain bg-slate-900" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md relative flex flex-col h-[100dvh] bg-[#f8fafc] shadow-2xl">
        
        {/* AMBIENT GLOW LOKAL */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-5%] right-[-10%] w-[60vw] h-[30vh] bg-[#7A171D]/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-5%] left-[-10%] w-[60vw] h-[30vh] bg-[#C5A059]/15 rounded-full blur-[100px]" />
        </div>

        {/* ==============================================================
            1. APP BAR (NATIVE HEADER)
            ============================================================== */}
        <div className="flex-none bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm pt-safe relative z-30">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-slate-700 bg-slate-100 rounded-full active:scale-90 tap-highlight-transparent transition-transform border border-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Detail Pelacakan</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{awbNumber.slice(-8)}</p>
            </div>
            <div className="w-10 h-10"></div>
          </div>
        </div>

        {/* ==============================================================
            2. SCROLLABLE WIZARD CONTENT
            ============================================================== */}
        <main className="flex-grow overflow-y-auto overflow-x-hidden p-4 pb-10 relative z-10 no-scrollbar">
          
          {isLoading ? (
             <div className="h-[300px] flex flex-col items-center justify-center glass-card rounded-[2rem] border border-white shadow-sm mt-4">
               <div className="w-10 h-10 border-[3px] border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4 shadow-sm"></div>
               <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase animate-pulse">Menghubungkan Radar...</p>
             </div>
          ) : isNotFound || !trackingData ? (
             <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center glass-card rounded-[2rem] border border-white p-6 text-center shadow-sm relative overflow-hidden mt-4">
               <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4 border border-red-100 shadow-sm relative z-10">
                 <AlertCircle className="w-8 h-8 text-red-500" />
               </div>
               <h2 className="text-xl font-black text-slate-900 tracking-tight relative z-10">Resi Tidak Ditemukan</h2>
               <p className="text-slate-500 mt-2 text-xs font-medium leading-relaxed relative z-10">Sistem tidak mendeteksi kode <b className="text-slate-800">{awbNumber}</b>.</p>
               <button onClick={() => router.back()} className="mt-6 bg-slate-900 text-white font-black text-xs uppercase tracking-widest h-12 w-full rounded-xl transition-all shadow-md active:scale-95 relative z-10">
                 Kembali
               </button>
             </motion.div>
          ) : (
            <div className="space-y-5">
              
              {/* --- KARTU IDENTITAS RESI --- */}
              <div className="glass-card rounded-[2rem] p-5 relative overflow-hidden border border-white shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <Badge variant="glass" className={cn("mb-2 px-2.5 py-1 shadow-sm text-[8px] font-black tracking-widest uppercase", trackingData.category === "Internasional" ? "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/30" : "bg-[#7A171D]/5 text-[#7A171D] border-[#7A171D]/20")}>
                      Kargo {trackingData.category}
                    </Badge>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5 break-all">
                      {trackingData.id}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-100 shadow-inner">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7A171D] to-[#5A0E13] shadow-sm flex items-center justify-center text-white border border-[#4A0A10] shrink-0">
                    {trackingData.status?.includes("Selesai") ? <CheckCircle2 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Status Terkini</p>
                    <p className="text-sm font-black text-slate-900 leading-tight">{trackingData.status || "In Transit"}</p>
                  </div>
                </div>
              </div>

              {/* --- KARTU PETA LIVE SATELIT --- */}
              <div className="glass-card rounded-[2rem] p-1.5 shadow-sm border border-white relative group overflow-hidden bg-white/40">
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white z-20 flex items-center gap-2 shadow-sm pointer-events-none">
                  <div className="relative flex items-center justify-center">
                    <div className={cn("w-2 h-2 rounded-full animate-ping absolute", isUsingLiveGPS ? "bg-emerald-500" : "bg-blue-500")}></div>
                    <div className={cn("w-1.5 h-1.5 rounded-full relative z-10", isUsingLiveGPS ? "bg-emerald-500" : "bg-blue-500")}></div>
                  </div>
                  <div>
                    <p className="text-slate-900 text-[8px] font-black uppercase tracking-widest leading-none mb-0.5">Radar Armada</p>
                    <p className="text-slate-500 text-[9px] font-bold leading-none">{routeDistanceKm > 0 ? `${routeDistanceKm} KM` : "Memetakan..."}</p>
                  </div>
                </div>

                {/* NOTE: interactive={true} namun dengan styling khusus agar tidak mengganggu scroll vertikal halaman */}
                <div className="w-full h-[250px] rounded-[1.5rem] relative overflow-hidden bg-slate-100/50 touch-pan-y">
                  <MapBase
                    longitude={mapViewState.longitude}
                    latitude={mapViewState.latitude}
                    zoom={mapViewState.zoom}
                    className="w-full h-full"
                    interactive={true}
                    originCoords={originLatLng}
                    drops={dropsForMap}
                    routeData={routeData}
                    driverCoords={liveDriverCoords} 
                  />
                  {!originLatLng && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm z-10 pointer-events-none">
                      <MapPinned className="w-8 h-8 text-slate-400 opacity-60 animate-bounce" />
                    </div>
                  )}
                </div>
              </div>

              {/* --- KARTU DETAIL RUTE --- */}
              <div className="glass-card rounded-[2rem] p-5 shadow-sm border border-white relative overflow-hidden">
                <div className="flex flex-col gap-4 relative z-10">
                  
                  {/* Asal */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400 shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Asal Pengirim</p>
                      <p className="text-xs font-black text-slate-900 leading-snug line-clamp-2">
                        {typeof trackingData.origin === 'string' ? trackingData.origin : (trackingData.origin?.address || "Titik Koordinat Asal")}
                      </p>
                      {typeof trackingData.origin === 'object' && trackingData.origin?.senderName && (
                        <p className="text-[10px] text-slate-500 font-bold mt-1 flex items-center gap-1"><User className="w-3 h-3"/> {trackingData.origin.senderName}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Garis & Kendaraan */}
                  <div className="flex items-center gap-3 pl-[15px] -my-1">
                    <div className="w-px h-6 bg-slate-200 border-l border-dashed border-slate-300"></div>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {trackingData.vehicleName || trackingData.serviceType || "Kargo"}
                    </span>
                  </div>
                  
                  {/* Tujuan */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9A242B] to-[#7A171D] border border-[#5A0E13] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                      <MapPin className="w-4 h-4 drop-shadow-sm"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tujuan Akhir</p>
                      <p className="text-xs font-black text-slate-900 leading-snug line-clamp-2">
                        {dropsForMap.length > 1 ? `${dropsForMap.length} Titik Tujuan` : (dropsForMap[0]?.address || "Titik Koordinat Tujuan")}
                      </p>
                      {((trackingData.destinations && trackingData.destinations[0]?.receiverName) || (typeof trackingData.destination === 'object' && trackingData.destination?.receiverName)) && (
                        <p className="text-[10px] text-slate-500 font-bold mt-1 flex items-center gap-1"><User className="w-3 h-3"/> {trackingData.destinations?.[0]?.receiverName || (typeof trackingData.destination === 'object' ? trackingData.destination?.receiverName : "")}</p>
                      )}
                    </div>
                  </div>
                  
                </div>
              </div>

              {/* --- KARTU TIMELINE --- */}
              <div className="glass-card rounded-[2rem] overflow-hidden border border-white shadow-sm mt-4">
                <div className="p-5 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
                  <Clock className="w-4 h-4 text-[#C5A059]" />
                  <h3 className="text-sm font-black text-slate-900 m-0 tracking-tight">Riwayat Pengiriman</h3>
                </div>
                
                <div className="p-5 pb-8 relative">
                  {/* Vertical Timeline Rail Line */}
                  <div className="absolute top-6 bottom-10 left-[35px] w-px bg-slate-200"></div>

                  <div className="space-y-6 relative">
                    <AnimatePresence>
                      {timelineData.map((item, index) => {
                        const NodeIcon = item.icon;
                        return (
                          <motion.div 
                            key={item.id || index}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="flex gap-4 relative items-start"
                          >
                            {/* Dot */}
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-[2px] mt-1",
                              item.isCurrent 
                                ? "bg-[#7A171D] text-white border-white shadow-[0_0_10px_rgba(122,23,29,0.3)]" 
                                : "bg-white text-slate-400 border-slate-100"
                            )}>
                              <NodeIcon className="w-3.5 h-3.5" />
                            </div>

                            {/* Content */}
                            <div className={cn(
                              "flex-1 p-4 rounded-[1.25rem] border",
                              item.isCurrent
                                ? "bg-white border-white shadow-sm"
                                : "bg-slate-50/50 border-slate-100"
                            )}>
                              <div className="flex flex-col gap-1 mb-2">
                                <h4 className={cn("text-xs font-black tracking-tight", item.isCurrent ? "text-slate-900" : "text-slate-700")}>
                                  {item.status}
                                </h4>
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest w-fit",
                                  item.isCurrent ? "text-red-500" : "text-slate-400"
                                )}>
                                  {item.date}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-3">{item.description}</p>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                  <MapPin className="w-3 h-3 text-[#C5A059]" /> {item.displayLocation}
                                </div>
                                
                                {item.isGeotagged && (
                                  <div className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md uppercase tracking-widest">
                                    <CheckCircle2 className="w-3 h-3" /> GPS Valid
                                  </div>
                                )}
                                
                                {/* 🚀 TOMBOL PREVIEW FOTO BUKTI PENGIRIMAN */}
                                {item.proofUrl && (
                                  <button 
                                    onClick={() => setProofModalUrl(item.proofUrl as string)}
                                    className="flex items-center gap-1 text-[8px] font-black text-white bg-blue-600 active:bg-blue-700 px-2 py-1 rounded-md uppercase tracking-widest shadow-sm tap-highlight-transparent"
                                  >
                                    <Camera className="w-3 h-3" /> Bukti
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
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}