"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Truck, Globe2, Info, ShieldAlert, Wallet } from "lucide-react";

import { db } from "@/lib/firebase"; 
import { doc, getDoc, collection, serverTimestamp, query, where, getDocs, writeBatch, increment } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import ServiceVehicleSelector from "./components/ServiceVehicleSelector";
import OriginForm from "./components/OriginForm";
import DropsAccordion from "./components/DropsAccordion";
import ExtraServices from "./components/ExtraServices";
import BookingReceipt from "./components/BookingReceipt";

// PERBAIKAN: Mengambil tipe dari Global Types
import { 
  DropDestination, DynamicVehicle, Coordinates, 
  MapViewState, OriginData 
} from "@/types/order";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isHydrated } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeInfo, setActiveInfo] = useState<{ title: string; text: string } | null>(null);

  const [isB2BClient, setIsB2BClient] = useState(false);
  const [b2bDiscountPercent, setB2bDiscountPercent] = useState(0);
  
  // --- STATE CREDIT CONTROL & DEPOSIT B2B ---
  const [b2bLimit, setB2bLimit] = useState(0);
  const [b2bOutstanding, setB2bOutstanding] = useState(0);
  const [b2bDeposit, setB2bDeposit] = useState(0); // <-- BARU: Saldo Deposit

  const [tarifPerPorter, setTarifPerPorter] = useState<number>(50000);
  const [motorSettings, setMotorSettings] = useState({ weightSmall: 5, weightMedium: 20, warrantyPercent: 1.5, dimS: {p:20, l:20, t:20}, dimM: {p:40, l:40, t:40}, dimL: {p:50, l:50, t:50} });
  const [vehicles, setVehicles] = useState<DynamicVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<DynamicVehicle | null>(null);

  const [selectedService, setSelectedService] = useState<"Instan" | "Sameday">("Instan");
  
  const [originData, setOriginData] = useState<OriginData>({ address: searchParams.get("origin") || "", detail: "", senderName: user?.displayName || "", senderPhone: "" });
  const [originCoords, setOriginCoords] = useState<Coordinates | null>(null);

  const initialDropId = `DROP-${Math.floor(1000 + Math.random() * 9000)}`;
  const [drops, setDrops] = useState<DropDestination[]>([{
    id: initialDropId, address: searchParams.get("destination") || "", detail: "", receiverName: "", receiverPhone: "", receiverEmail: "",
    items: [{ id: `ITM-1`, name: "", weightType: "Kecil", dimType: "S", weightVal: Number(searchParams.get("weight")) || 0, length: Number(searchParams.get("l")) || 0, width: Number(searchParams.get("w")) || 0, height: Number(searchParams.get("h")) || 0, value: 0 }]
  }]);

  const [activeDropId, setActiveDropId] = useState<string | null>(initialDropId);
  const [addInsurance, setAddInsurance] = useState(false);
  const [porterCount, setPorterCount] = useState<number>(0);
  const [tollFee, setTollFee] = useState<number>(0);

  const [routeData, setRouteData] = useState<unknown>(null); 
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(0);
  const [activeDraggable, setActiveDraggable] = useState<"origin" | string | null>(null);
  const [mapViewState, setMapViewState] = useState<MapViewState>({ longitude: 118.0149, latitude: -2.5489, zoom: 4.5 });

  useEffect(() => {
    if (isHydrated && !user) router.push("/login");
  }, [user, isHydrated, router]);

  // AUTO GEOCODING API
  useEffect(() => {
    const autoGeocode = async () => {
      const originParam = searchParams.get("origin");
      const destParam = searchParams.get("destination");

      if (!MAPBOX_TOKEN) return;

      if (originParam && !originCoords) {
        try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(originParam)}.json?access_token=${MAPBOX_TOKEN}&country=id&limit=1`);
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            setOriginCoords({ lng: data.features[0].center[0], lat: data.features[0].center[1] });
          }
        } catch (e) { console.error("Auto Geocoding origin error", e); }
      }

      if (destParam && drops.length > 0 && !drops[0].lng) {
        try {
          const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destParam)}.json?access_token=${MAPBOX_TOKEN}&country=id&limit=1`);
          const data = await res.json();
          if (data.features && data.features.length > 0) {
            setDrops(prev => {
              const newDrops = [...prev];
              newDrops[0] = { ...newDrops[0], lng: data.features[0].center[0], lat: data.features[0].center[1] };
              return newDrops;
            });
          }
        } catch (e) { console.error("Auto Geocoding dest error", e); }
      }
    };
    autoGeocode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const fetchCoreData = async () => {
      setIsFetchingData(true);
      try {
        if (user?.role === "b2b") {
          setIsB2BClient(true);
          
          // 1. Tarik Limit Kredit & Saldo Deposit dari Profil User
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setB2bLimit(userData.b2bLimit || 0);
            setB2bDeposit(userData.depositBalance || 0); // SET SALDO DEPOSIT
          }

          // 2. Kalkulasi Piutang Berjalan (Outstanding Debt)
          const qDebt = query(
            collection(db, "orders"),
            where("userId", "==", user.uid),
            where("isB2BApplied", "==", true)
          );
          
          const debtSnap = await getDocs(qDebt);
          let totalHutang = 0;
          debtSnap.forEach(d => {
            const oData = d.data();
            if (oData.paymentStatus !== "Lunas") {
              totalHutang += (oData.finalGrandTotal || oData.breakdown?.grandTotal || oData.totalCost || 0);
            }
          });
          setB2bOutstanding(totalHutang);
        }

        const [vSnap, pSnap] = await Promise.all([ getDoc(doc(db, "settings", "vehicles")), getDoc(doc(db, "settings", "pricing")) ]);

        if (vSnap.exists() && vSnap.data().motor) setMotorSettings(vSnap.data().motor);

        if (pSnap.exists()) {
          const pData = pSnap.data();
          setB2bDiscountPercent(pData.b2bDiscount || 0);
          if (pData.tarifPorter) setTarifPerPorter(pData.tarifPorter);

          if (pData.customVehicles && Array.isArray(pData.customVehicles) && pData.customVehicles.length > 0) {
            const sortedVehicles = (pData.customVehicles as DynamicVehicle[]).sort((a, b) => a.maxWeight - b.maxWeight);
            setVehicles(sortedVehicles);
            setSelectedVehicle(sortedVehicles[0]);
          }
        }
      } catch (error) { 
        console.error("Gagal menarik data:", error); 
      } finally { 
        setIsFetchingData(false); 
      }
    };
    if (user) fetchCoreData();
  }, [user]);

  let totalWeight = 0; 
  let totalItemValue = 0; 
  let motorWarrantyTotal = 0;
  
  drops.forEach(drop => { 
    drop.items.forEach(item => { 
      if (selectedVehicle?.isMotor) { 
        totalWeight += item.weightType === "Kecil" ? motorSettings.weightSmall : motorSettings.weightMedium; 
        motorWarrantyTotal += (Number(item.value) || 0) * (motorSettings.warrantyPercent / 100); 
      } else { 
        const volumeWeight = ((Number(item.length) || 0) * (Number(item.width) || 0) * (Number(item.height) || 0)) / 6000;
        const chargeableWeight = Math.max(Number(item.weightVal) || 0, volumeWeight);
        totalWeight += chargeableWeight; 
      } 
      totalItemValue += Number(item.value) || 0; 
    }); 
  });

  useEffect(() => {
    if (vehicles.length > 0 && selectedVehicle) {
      if (totalWeight > selectedVehicle.maxWeight) {
        const suitableVehicle = vehicles.find(v => v.maxWeight >= totalWeight);
        if (suitableVehicle && suitableVehicle.id !== selectedVehicle.id) {
          setSelectedVehicle(suitableVehicle);
        }
      }
    }
  }, [totalWeight, vehicles, selectedVehicle]);

  const isOverweight = selectedVehicle ? totalWeight > selectedVehicle.maxWeight : false;

  useEffect(() => {
    const fetchRealRoute = async () => {
      const validDrops = drops.filter(d => d.lng !== undefined && d.lat !== undefined);
      if (!originCoords || validDrops.length === 0) {
        setRouteData(null);
        setRouteDistanceKm(0);
        if (originCoords) setMapViewState({ longitude: originCoords.lng, latitude: originCoords.lat, zoom: 12 });
        return;
      }
      
      const maxAllowedDrops = validDrops.slice(0, 24);
      const waypoints = [`${originCoords.lng},${originCoords.lat}`, ...maxAllowedDrops.map(d => `${d.lng},${d.lat}`)].join(";");
      
      try {
        const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const currentRoute = data.routes[0];
          const distanceKm = Number((currentRoute.distance / 1000).toFixed(1));
          setRouteData(currentRoute.geometry);
          setRouteDistanceKm(distanceKm);

          let midLng = originCoords.lng;
          let midLat = originCoords.lat;
          if (maxAllowedDrops.length === 1 && maxAllowedDrops[0].lng !== undefined && maxAllowedDrops[0].lat !== undefined) {
            midLng = (originCoords.lng + maxAllowedDrops[0].lng) / 2;
            midLat = (originCoords.lat + maxAllowedDrops[0].lat) / 2;
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
      } catch (err) { console.error("Gagal menarik garis rute:", err); }
    };
    const timer = setTimeout(fetchRealRoute, 600);
    return () => clearTimeout(timer);
  }, [originCoords, drops]);

  useEffect(() => {
    if (activeInfo) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [activeInfo]);

  const handleInfoClick = (title: string, text: string) => setActiveInfo({ title, text });
  const handleOriginChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setOriginData({ ...originData, [e.target.name]: e.target.value });
  
  const handleMarkerDragEnd = useCallback((lng: number, lat: number, type: "origin" | string) => {
    if (type === "origin") setOriginCoords({ lng, lat });
    else {
      const dropIndex = drops.findIndex(d => d.id === type);
      if (dropIndex !== -1) {
        const newDrops = [...drops];
        newDrops[dropIndex] = { ...newDrops[dropIndex], lng, lat };
        setDrops(newDrops);
      }
    }
  }, [drops]);

  // KALKULASI UANG
  let baseDeliveryCost = 0;
  if (selectedVehicle) { 
    const extraKm = Math.max(0, routeDistanceKm - selectedVehicle.minKm); 
    baseDeliveryCost = selectedVehicle.baseFare + (extraKm * selectedVehicle.perKm); 
  }
  let finalInsuranceCost = 0;
  if (selectedVehicle?.isMotor) finalInsuranceCost = motorWarrantyTotal; 
  else if (addInsurance) finalInsuranceCost = totalItemValue * ((selectedVehicle?.insurancePercent || 0) / 100); 

  const porterCost = porterCount * tarifPerPorter;
  const subTotal = baseDeliveryCost + finalInsuranceCost + porterCost + Number(tollFee);
  const b2bDiscountAmount = isB2BClient ? subTotal * (b2bDiscountPercent / 100) : 0;
  const grandTotal = subTotal - b2bDiscountAmount;

  // Cek apakah saldo deposit cukup, kalau cukup -> pakai deposit, kalau kurang -> pakai limit kredit
  const isDepositSufficient = isB2BClient && b2bDeposit >= grandTotal;
  
  // Hanya peringatkan "Limit Exceeded" jika saldo deposit juga tidak cukup (mengandalkan kredit)
  const isLimitExceeded = isB2BClient && !isDepositSufficient && b2bLimit > 0 && (b2bOutstanding + grandTotal > b2bLimit);

  const formatRupiah = (val: number) => isNaN(val) ? "Rp 0" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (isOverweight) { setErrorMsg(`Total estimasi berat (${totalWeight.toFixed(1)} Kg) melebihi kapasitas ${selectedVehicle?.name}.`); return; }
    if (routeDistanceKm === 0) { setErrorMsg(`Rute belum ditemukan. Pastikan alamat jemput dan tujuan sudah dipin pada peta satelit.`); return; }
    if (isLimitExceeded) { 
      setErrorMsg(`Plafon kredit B2B dan Saldo Deposit Anda tidak mencukupi. Hubungi Finance atau Top-Up Deposit Anda.`); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }
    
    setIsLoading(true); setErrorMsg("");
    
    try {
      // 1. Siapkan Resi (AWB)
      const resiInduk = `FLG-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
      const dropsWithResi = drops.map((drop, idx) => ({
        ...drop,
        resi: `${resiInduk}-${idx+1}`
      }));

      // 2. Tentukan Status & Metode Pembayaran B2B
      let finalStatus = "Menunggu Pembayaran";
      let finalPaymentStatus = "Belum Bayar";
      let finalPaymentMethod = "Belum Dipilih";

      if (isB2BClient) {
        if (isDepositSufficient) {
          // SKENARIO 1: SALDO DEPOSIT MENCUKUPI (OTOMATIS POTONG DEPOSIT)
          finalStatus = "Menunggu Kurir"; // Langsung bypass ke kurir
          finalPaymentStatus = "Lunas";
          finalPaymentMethod = "Potong Saldo Deposit";
        } else {
          // SKENARIO 2: SALDO KURANG, MASUK KE PIUTANG KREDIT
          finalStatus = "Menunggu Kurir"; // Langsung bypass ke kurir
          finalPaymentStatus = "Piutang B2B";
          finalPaymentMethod = "Invoice / Net 30";
        }
      }

      // 3. Gunakan BATCH WRITE (Atomic Transaction) agar uang dan order aman
      const batch = writeBatch(db);

      // A. Simpan Order ke koleksi 'orders'
      const newOrderRef = doc(collection(db, "orders"));
      batch.set(newOrderRef, {
        userId: user.uid,
        resi: resiInduk,
        origin: { ...originData, ...originCoords }, 
        destinations: dropsWithResi, 
        serviceType: selectedService, 
        vehicleId: selectedVehicle?.id, 
        vehicleName: selectedVehicle?.name, 
        totalWeight, 
        totalDistance: routeDistanceKm, 
        isB2BApplied: isB2BClient,
        breakdown: { deliveryFee: baseDeliveryCost, insuranceFee: finalInsuranceCost, porterFee: porterCost, tollFee: Number(tollFee), b2bDiscount: b2bDiscountAmount, grandTotal }, 
        status: finalStatus, 
        paymentStatus: finalPaymentStatus,
        paymentMethod: finalPaymentMethod,
        createdAt: serverTimestamp(),
        porterCount 
      });

      // B. Jika potong deposit, kurangi saldo user & catat di Ledger
      if (isB2BClient && isDepositSufficient) {
        // Kurangi saldo di tabel User
        const userRef = doc(db, "users", user.uid);
        batch.update(userRef, { depositBalance: increment(-grandTotal) });

        // Catat ke Buku Besar (Wallet Logs)
        const logRef = doc(collection(db, "wallet_logs"));
        batch.set(logRef, {
          entityId: user.uid,
          entityName: user.companyName || user.displayName || "Klien B2B",
          entityType: "B2B",
          type: "payment", // Jenis mutasi
          amount: grandTotal,
          timestamp: serverTimestamp(),
          adminNote: `Pembayaran otomatis AWB #${resiInduk}`
        });
      }

      // 4. Eksekusi semua transaksi sekaligus (Commit)
      await batch.commit();
      
      // Routing Dinamis
      if (isB2BClient) {
        // Jika B2B langsung ke dashboard untuk nge-track resi
        router.push("/desktop/dashboard");
      } else {
        // Jika personal, tetap lempar ke halaman pembayaran
        router.push("/desktop/pembayaran");
      }

    } catch (error) { 
      console.error("Kesalahan sistem submit order", error); 
      setErrorMsg("Gagal memproses pesanan. Periksa koneksi Anda."); 
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <>
      <div className="w-full relative z-10 pb-20 font-sans">
        
        {/* HEADER TITLE */}
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 mb-8 mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <Badge variant="brand" className="mb-4 shadow-sm inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7A171D] animate-pulse"></span>
              Pengiriman Terjadwal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Pesanan <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7A171D] to-[#C5A059]">Logistik Baru</span>
            </h1>
            <p className="text-slate-500 mt-2 text-base font-medium max-w-xl">Lengkapi detail pengiriman untuk melihat rute interaktif dan estimasi biaya secara otomatis.</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button onClick={() => router.push("/desktop/delivery/booking")} variant="primary" className="shadow-md h-11 text-xs px-5">
              <Truck className="w-4 h-4 mr-1.5"/> Pesan Kurir
            </Button>
            <Button onClick={() => router.push("/desktop/forwarding/quote")} variant="outline" className="border-slate-200 h-11 text-xs px-5">
              <Globe2 className="w-4 h-4 mr-1.5 text-slate-500"/> Kargo Global
            </Button>
          </div>
        </div>

        {/* ERROR MESSAGE */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-[1400px] mx-auto px-6 md:px-10 mb-8">
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl shadow-sm flex items-start gap-3 max-w-3xl">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 px-6 md:px-10 items-start">
          
          {/* KOLOM KIRI: FORM */}
          <div className="w-full lg:w-[60%] xl:w-[65%] space-y-8">
            <form id="booking-form" onSubmit={handleSubmit} className="space-y-8">
              <ServiceVehicleSelector 
                selectedService={selectedService} setSelectedService={setSelectedService}
                vehicles={vehicles} selectedVehicle={selectedVehicle} setSelectedVehicle={setSelectedVehicle}
                isFetchingData={isFetchingData} totalWeight={totalWeight} handleInfoClick={handleInfoClick}
              />
              <OriginForm 
                originData={originData} setOriginData={setOriginData} setOriginCoords={setOriginCoords}
                handleOriginChange={handleOriginChange} handleInfoClick={handleInfoClick}
              />
              <DropsAccordion 
                drops={drops} setDrops={setDrops} selectedService={selectedService} selectedVehicle={selectedVehicle}
                motorSettings={motorSettings} activeDropId={activeDropId} setActiveDropId={setActiveDropId}
                activeDraggable={activeDraggable} setActiveDraggable={setActiveDraggable}
                handleInfoClick={handleInfoClick} setErrorMsg={setErrorMsg} 
              />
              <ExtraServices 
                selectedVehicle={selectedVehicle} addInsurance={addInsurance} setAddInsurance={setAddInsurance}
                porterCount={porterCount} setPorterCount={setPorterCount} tarifPerPorter={tarifPerPorter}
                tollFee={tollFee} setTollFee={setTollFee} handleInfoClick={handleInfoClick}
              />
            </form>
          </div>

          {/* KOLOM KANAN: LIVE MAPBOX & RINGKASAN BIAYA */}
          <div className="w-full lg:w-[40%] xl:w-[35%] flex flex-col gap-6 lg:sticky lg:top-28">
            
            {/* ======================================================== */}
            {/* PANEL KONTROL KREDIT B2B DEPOSIT                         */}
            {/* ======================================================== */}
            {isB2BClient && (
              <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059] rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
                <h3 className="text-sm font-black flex items-center gap-2 mb-4 text-[#C5A059]">
                  <ShieldAlert className="w-4 h-4"/> Corporate Credit Line
                </h3>
                
                <div className="space-y-3 text-sm font-medium">
                  {/* Tampilkan Info Deposit */}
                  <div className="flex justify-between items-center text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5"/> Saldo Prabayar (Deposit)</span>
                    <span className="font-bold">{formatRupiah(b2bDeposit)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400 mt-2">
                    <span>Plafon Piutang B2B</span>
                    <span className="text-white font-bold">{formatRupiah(b2bLimit)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Piutang Berjalan</span>
                    <span className="text-red-400 font-bold">{formatRupiah(b2bOutstanding)}</span>
                  </div>

                  {/* LOGIKA INDIKATOR STATUS PEMBAYARAN CERDAS */}
                  <div className="border-t border-slate-700/50 pt-3 mt-3">
                    {isDepositSufficient ? (
                      <div className="flex items-center gap-2 text-emerald-400 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Tagihan ini akan memotong Saldo Deposit Anda.
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-amber-400">
                        <span>Sisa Plafon Kredit</span>
                        <span className={`font-black ${b2bLimit - b2bOutstanding - grandTotal < 0 ? 'text-red-500' : 'text-amber-400'}`}>
                          {formatRupiah(b2bLimit - b2bOutstanding - grandTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Peringatan Limit Habis (Hanya jika deposit tak cukup & limit habis) */}
                {isLimitExceeded && (
                  <div className="mt-5 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-200 leading-relaxed font-semibold">
                      Tagihan order ini melebihi sisa plafon kredit Anda. Harap isi Saldo Deposit atau lunasi tagihan bulan sebelumnya.
                    </p>
                  </div>
                )}
              </div>
            )}

            <BookingReceipt 
              selectedVehicle={selectedVehicle} drops={drops} totalWeight={totalWeight} isOverweight={isOverweight || isLimitExceeded}
              baseDeliveryCost={baseDeliveryCost} finalInsuranceCost={finalInsuranceCost} porterCount={porterCount}
              porterCost={porterCost} tollFee={tollFee} isB2BClient={isB2BClient} b2bDiscountPercent={b2bDiscountPercent}
              b2bDiscountAmount={b2bDiscountAmount} grandTotal={grandTotal} isLoading={isLoading} isFetchingData={isFetchingData}
              routeDistanceKm={routeDistanceKm} mapViewState={mapViewState} originCoords={originCoords} routeData={routeData}
              activeDraggable={activeDraggable} handleMarkerDragEnd={handleMarkerDragEnd} formatRupiah={formatRupiah}
            />
          </div>
        </div>
      </div>

      {/* MODAL POPUP INFORMASI (i) */}
      <AnimatePresence>
        {activeInfo && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveInfo(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl border border-slate-100">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5 border border-blue-100">
                 <Info className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3 leading-tight">{activeInfo.title}</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">{activeInfo.text}</p>
              <Button onClick={() => setActiveInfo(null)} variant="outline" className="w-full h-12 rounded-xl">Mengerti</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function DesktopBookingPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-16 relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />
      
      <Suspense fallback={
        <div className="min-h-[60vh] flex flex-col items-center justify-center z-10 relative">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin mb-4 shadow-lg"></div>
          <p className="text-slate-500 font-black tracking-widest uppercase text-[10px] animate-pulse">Menyiapkan Command Center...</p>
        </div>
      }>
        <BookingForm />
      </Suspense> 
    </main>
  );
}