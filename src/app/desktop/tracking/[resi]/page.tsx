"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, Clock, MapPin, Plane, 
  Package, Ship, Truck, AlertCircle, MapPinned, User, Banknote, Camera, X
} from "lucide-react";
import Link from "next/link";
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
  loading: () => <div className="w-full h-full bg-slate-100/50 backdrop-blur-md animate-pulse flex flex-col items-center justify-center text-slate-500 text-xs font-black uppercase tracking-widest"><div className="w-10 h-10 border-4 border-slate-200 border-t-[#7A171D] rounded-full animate-spin mb-4 shadow-sm"></div>Menghubungkan Satelit...</div> 
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

  // 🚀 STATE UNTUK MODAL FOTO BUKTI (PoD & PoP)
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
          
          // 🚀 FASE 3: AMBIL PROOF URL DAN CATATAN
          proofUrl: item.proofUrl as string | undefined, 
          note: item.note as string | undefined,

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
        proofUrl: undefined,
        note: undefined
      }
    ];
  };

  const timelineData = renderTimeline();
  const isUsingLiveGPS = !!getCoords(trackingData?.driverCoords) && !trackingData?.status?.includes("Selesai");

  return (
    <main className="min-h-screen bg-[#f8fafc] py-12 lg:py-20 px-6 relative overflow-hidden font-sans pb-32 z-0">
      
      {/* === AMBIENT GLOWING BACKGROUND === */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[#7A171D]/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[50vh] bg-[#C5A059]/15 rounded-full blur-[120px]" />
      </div>

      {/* 🚀 MODAL PREVIEW BUKTI TRANSFER / PoD (FULLSCREEN GLASS) */}
      <AnimatePresence>
        {proofModalUrl && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setProofModalUrl(null)}></motion.div>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 max-w-3xl w-full flex flex-col items-center">
              <button onClick={() => setProofModalUrl(null)} className="absolute -top-16 right-0 bg-white/20 text-white rounded-full p-3 hover:bg-white/40 transition-colors border border-white/30 shadow-lg active:scale-95">
                <X className="w-6 h-6" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proofModalUrl} alt="Bukti Foto" className="rounded-[2rem] max-h-[80vh] w-auto shadow-[0_20px_60px_rgba(0,0,0,0.4)] border border-white/20 object-contain bg-slate-900" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-[1300px] mx-auto relative z-10">
        
        {isLoading ? (
          <div className="min-h-[500px] flex flex-col items-center justify-center glass-card rounded-[3rem] border border-white shadow-sm relative overflow-hidden mt-10">
             <div className="absolute top-0 right-0 w-64 h-64 bg-[#7A171D]/5 rounded-full blur-[80px] pointer-events-none" />
             <div className="w-16 h-16 border-[5px] border-white border-t-[#7A171D] rounded-full animate-spin mb-6 shadow-sm"></div>
             <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">Menyinkronkan Manifes</h2>
             <p className="text-slate-500 text-sm font-bold tracking-widest uppercase animate-pulse mt-3">Menghubungkan ke satelit pelacakan armada...</p>
          </div>
        ) : isNotFound || !trackingData ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="min-h-[500px] flex flex-col items-center justify-center glass-card rounded-[3rem] border border-white p-8 text-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] relative overflow-hidden mt-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 rounded-[2rem] flex items-center justify-center mb-8 border border-red-200 shadow-sm relative z-10">
              <AlertCircle className="w-12 h-12 text-red-500 drop-shadow-sm" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter relative z-10">Nomor Resi Tidak Ditemukan</h2>
            <p className="text-slate-500 mt-4 text-base font-medium max-w-lg leading-relaxed relative z-10">Sistem tidak mendeteksi kode AWB/Resi <b className="text-slate-800 bg-white/60 px-2 py-0.5 rounded-md border border-slate-200">{awbNumber}</b>. Periksa kembali penulisan karakter atau hubungi CS Flash Global.</p>
            <Link href="/tracking" className="mt-10 bg-gradient-to-b from-[#7A171D] to-[#5A0E13] hover:from-[#9A242B] hover:to-[#7A171D] text-white font-black text-sm uppercase tracking-widest py-4 px-10 rounded-[1.25rem] transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_8px_20px_rgba(122,23,29,0.3)] border border-[#4A0A10] active:scale-95 relative z-10">
              Cari Ulang Resi
            </Link>
          </motion.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start mt-6">
            
            {/* ======================================================== */}
            {/* PANEL KIRI: LIVE MAP & OVERVIEW (BENTO STYLE) */}
            {/* ======================================================== */}
            <div className="w-full lg:w-[55%] xl:w-[60%] space-y-8 lg:sticky lg:top-10 z-20">
              
              {/* --- KARTU IDENTITAS RESI --- */}
              <div className="glass-card rounded-[2.5rem] p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden border border-white shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
                <div className="absolute top-[-50%] right-[-10%] w-64 h-64 bg-slate-200/50 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="relative z-10">
                  <Badge variant="glass" className={cn("mb-3 px-3.5 py-1.5 shadow-sm text-[10px] font-black tracking-widest uppercase", trackingData.category === "Internasional" ? "bg-[#C5A059]/10 text-[#A68345] border-[#C5A059]/30" : "bg-[#7A171D]/5 text-[#7A171D] border-[#7A171D]/20")}>
                    Kargo {trackingData.category}
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                    AWB <span className="text-[#7A171D] font-mono tracking-tight select-all">#{trackingData.id}</span>
                  </h2>
                </div>

                <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md px-6 py-4 rounded-[1.5rem] border border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] relative z-10 w-full sm:w-auto">
                  <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-[#7A171D] to-[#5A0E13] shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_10px_rgba(122,23,29,0.3)] flex items-center justify-center text-white border border-[#4A0A10] shrink-0">
                    {trackingData.status?.includes("Selesai") ? <CheckCircle2 className="w-7 h-7 drop-shadow-sm" /> : <Package className="w-7 h-7 drop-shadow-sm" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Terkini</p>
                    <p className="text-base font-black text-slate-900 leading-tight">{trackingData.status || "In Transit"}</p>
                  </div>
                </div>
              </div>

              {/* --- KARTU PETA LIVE SATELIT --- */}
              <div className="glass-card rounded-[2.5rem] p-2 shadow-[0_15px_40px_rgba(0,0,0,0.06)] border border-white relative group overflow-hidden bg-white/40">
                
                {/* Floating GPS Info */}
                <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-xl px-5 py-3 rounded-[1.25rem] border border-white z-20 flex flex-col gap-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.08)] pointer-events-none">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className={cn("w-2.5 h-2.5 rounded-full animate-pulse shadow-sm", isUsingLiveGPS ? 'bg-emerald-500 shadow-emerald-500/80' : 'bg-blue-500 shadow-blue-500/80')}></div>
                    <span className="text-slate-900 text-[10px] font-black uppercase tracking-widest">
                      {isUsingLiveGPS ? 'Sinyal GPS Aktual' : 'Radar Armada Live'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{routeDistanceKm > 0 ? `Jarak Est: ${routeDistanceKm} KM` : "Menghitung Rute..."}</p>
                </div>

                <div className="w-full h-[400px] md:h-[500px] rounded-[2rem] relative overflow-hidden bg-slate-100/50 border border-white/60">
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-md z-10 pointer-events-none">
                      <div className="bg-white/80 p-6 rounded-[1.5rem] shadow-xl border border-white flex flex-col items-center">
                        <MapPinned className="w-10 h-10 text-slate-400 mb-3" />
                        <p className="text-slate-600 text-xs font-black uppercase tracking-widest">Data koordinat belum sinkron</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* --- KARTU DETAIL RUTE (ORIGIN -> DESTINATION) --- */}
              <div className="glass-card rounded-[2.5rem] p-6 md:p-8 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-8 items-center border border-white shadow-[0_8px_30px_rgba(0,0,0,0.03)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#C5A059]/5 rounded-full blur-[60px] pointer-events-none z-0" />
                
                {/* Asal */}
                <div className="flex items-start gap-4 relative z-10 min-w-0 w-full">
                  <div className="w-12 h-12 rounded-[1rem] bg-white flex items-center justify-center border border-slate-100 text-slate-400 shadow-sm shrink-0 mt-1">
                    <MapPin className="w-6 h-6"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Asal Pengirim</p>
                    <p className="text-sm md:text-base font-black text-slate-900 leading-snug break-words line-clamp-3">
                      {typeof trackingData.origin === 'string' ? trackingData.origin : (trackingData.origin?.address || "Titik Koordinat Asal")}
                    </p>
                    {typeof trackingData.origin === 'object' && trackingData.origin?.senderName && (
                      <p className="text-[11px] text-slate-500 font-bold mt-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> {trackingData.origin.senderName}</p>
                    )}
                  </div>
                </div>
                
                {/* Panah Tengah */}
                <div className="hidden md:flex flex-col items-center justify-center text-slate-300 px-4 w-32 relative z-10 shrink-0">
                  <div className="w-full border-t-2 border-dashed border-slate-300 relative flex items-center justify-center">
                    <div className="bg-[#f8fafc] p-2 rounded-full absolute">
                       <Truck className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-6 bg-white px-2.5 py-1 rounded-md border border-slate-100 shadow-sm">{trackingData.vehicleName || trackingData.serviceType || "Kargo"}</span>
                </div>
                
                {/* Tujuan */}
                <div className="flex items-start gap-4 md:flex-row-reverse md:text-right relative z-10 min-w-0 w-full">
                  <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-[#9A242B] to-[#7A171D] border border-[#5A0E13] flex items-center justify-center text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_4px_10px_rgba(122,23,29,0.2)] shrink-0 mt-1">
                    <MapPin className="w-6 h-6 drop-shadow-sm"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tujuan Akhir</p>
                    <p className="text-sm md:text-base font-black text-slate-900 leading-snug break-words line-clamp-3">
                      {dropsForMap.length > 1 ? `${dropsForMap.length} Titik Tujuan` : (dropsForMap[0]?.address || "Titik Koordinat Tujuan")}
                    </p>
                    {((trackingData.destinations && trackingData.destinations[0]?.receiverName) || (typeof trackingData.destination === 'object' && trackingData.destination?.receiverName)) && (
                      <p className="text-[11px] text-slate-500 font-bold mt-2 flex items-center md:justify-end gap-1.5"><User className="w-3.5 h-3.5"/> {trackingData.destinations?.[0]?.receiverName || (typeof trackingData.destination === 'object' ? trackingData.destination?.receiverName : "")}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* PANEL KANAN: TIMELINE MANIFES PROGRESS (3D TIMELINE) */}
            {/* ======================================================== */}
            <div className="w-full lg:w-[45%] xl:w-[40%] relative z-10">
              <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white shadow-[0_15px_40px_rgba(0,0,0,0.05)]">
                
                <div className="p-6 md:p-8 border-b border-white/60 flex flex-row items-center gap-3 bg-white/40 backdrop-blur-md shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)]">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] flex items-center justify-center border border-[#A68345] shadow-sm">
                     <Clock className="w-5 h-5 text-[#5A0E13]" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 m-0 tracking-tight">Log Riwayat Perjalanan</h3>
                </div>
                
                <div className="p-6 md:p-8 bg-white/20">
                  <div className="relative pl-3 md:pl-5">
                    
                    {/* Vertical Timeline Rail Line */}
                    <div className="absolute top-6 bottom-10 left-[31px] md:left-[39px] w-[2px] bg-gradient-to-b from-slate-300 via-slate-200 to-transparent"></div>

                    <div className="space-y-10 relative">
                      <AnimatePresence>
                        {timelineData.map((item, index) => {
                          const NodeIcon = item.icon;
                          return (
                            <motion.div 
                              key={item.id || index}
                              initial={{ opacity: 0, x: 20, filter: "blur(5px)" }}
                              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                              transition={{ duration: 0.5, delay: index * 0.1, type: "spring", stiffness: 300, damping: 24 }}
                              className="flex gap-5 md:gap-6 relative items-start group"
                            >
                              {/* 3D Timeline Dot */}
                              <div className={cn(
                                "w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center shrink-0 z-10 border-4 transition-all duration-500",
                                item.isCurrent 
                                  ? "bg-gradient-to-br from-[#9A242B] to-[#7A171D] text-white border-white shadow-[0_0_20px_rgba(122,23,29,0.4)] scale-110" 
                                  : "bg-white text-slate-400 border-slate-100 shadow-sm group-hover:border-slate-300 group-hover:text-slate-600"
                              )}>
                                <NodeIcon className="w-5 h-5 md:w-6 md:h-6 drop-shadow-sm" />
                              </div>

                              {/* Timeline Content Card */}
                              <div className={cn(
                                "flex-1 p-5 md:p-6 rounded-[1.5rem] transition-all duration-300 border backdrop-blur-md",
                                item.isCurrent
                                  ? "bg-white/90 border-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] scale-100"
                                  : "bg-white/40 border-white/60 hover:bg-white/80 hover:shadow-md hover:-translate-y-1"
                              )}>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                                  <h4 className={cn("text-base font-black tracking-tight", item.isCurrent ? "text-slate-900" : "text-slate-700")}>
                                    {item.status}
                                  </h4>
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest whitespace-nowrap px-3 py-1.5 rounded-lg border w-fit shadow-sm",
                                    item.isCurrent ? "bg-red-50/80 text-red-600 border-red-200" : "bg-white text-slate-500 border-slate-200"
                                  )}>
                                    {item.date}
                                  </span>
                                </div>
                                <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed mb-4">{item.description}</p>
                                
                                <div className="flex flex-col gap-3">
                                  {/* INFO LOKASI & GEOTAG */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white/80 backdrop-blur-sm w-fit px-3 py-2 rounded-[0.75rem] border border-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                                      <MapPin className="w-3.5 h-3.5 text-[#C5A059]" /> {item.displayLocation}
                                    </div>
                                    
                                    {item.isGeotagged && (
                                      <div className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 w-fit px-2.5 py-1.5 rounded-[0.5rem] uppercase tracking-widest shadow-sm">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> GPS Valid
                                      </div>
                                    )}
                                  </div>

                                  {/* 🚀 FASE 3: TOMBOL PREVIEW FOTO BUKTI & CATATAN PENGIRIMAN */}
                                  {(item.proofUrl || item.note) && (
                                    <div className="flex flex-wrap items-center gap-2 mt-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                      {item.proofUrl && (
                                        <button 
                                          onClick={() => setProofModalUrl(item.proofUrl as string)}
                                          className="flex items-center gap-1.5 text-[10px] font-black text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border border-blue-800 transition-all px-3 py-2 rounded-[0.75rem] uppercase tracking-widest shadow-[0_4px_10px_rgba(37,99,235,0.3)] active:scale-95"
                                        >
                                          <Camera className="w-3.5 h-3.5" /> Lihat Bukti
                                        </button>
                                      )}
                                      {item.note && (
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Catatan Kurir</p>
                                          {/* 🚀 PERBAIKAN: Escape quote mark */}
                                          <p className="text-xs font-black text-slate-700 leading-snug line-clamp-2 italic">&quot;{item.note}&quot;</p>
                                        </div>
                                      )}
                                    </div>
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
            </div>

          </div>
        )}

      </div>
    </main>
  );
}