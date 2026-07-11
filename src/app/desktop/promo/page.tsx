"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  TicketPercent, Copy, CheckCircle2, AlertCircle, 
  Clock, ShieldAlert, Percent, DollarSign, Globe2, Truck
} from "lucide-react";

// --- IMPORT FIREBASE & ZUSTAND ---
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface PromoData {
  id: string; // Kode Promo
  type: "percentage" | "fixed";
  value: number;
  quota: number;
  usedCount: number;
  expiresAt: string;
  targetService?: "all" | "domestik" | "forwarding"; 
  targetUser?: string; 
}

export default function ClientPromoPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  
  const [promos, setPromos] = useState<PromoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "domestik" | "forwarding">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    // Proteksi Route: Harus Login
    if (isHydrated && !user) {
      router.push("/login");
      return;
    }

    const fetchPromos = async () => {
      setIsLoading(true);
      try {
        // Ambil hanya promo yang masih aktif
        const q = query(collection(db, "promos"), where("isActive", "==", true));
        const snap = await getDocs(q);
        
        let promosList = snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as PromoData[];
        
        // Filter cerdas:
        // 1. Buang yang sudah kadaluarsa
        // 2. Buang yang kuotanya sudah habis
        // 3. Hanya ambil yang untuk publik ("all") ATAU khusus email user yang login
        const now = new Date();
        promosList = promosList.filter(p => {
          const isNotExpired = new Date(p.expiresAt) >= now;
          const hasQuota = p.usedCount < p.quota;
          const isTargetedForUser = !p.targetUser || p.targetUser === "all" || p.targetUser === user?.email?.toLowerCase();
          
          return isNotExpired && hasQuota && isTargetedForUser;
        });

        // Urutkan: Promo VIP khusus user tampil di atas
        promosList.sort((a, b) => {
          const aVip = a.targetUser && a.targetUser !== "all" ? 1 : 0;
          const bVip = b.targetUser && b.targetUser !== "all" ? 1 : 0;
          return bVip - aVip;
        });

        setPromos(promosList);
      } catch (error) {
        console.error("Gagal menarik promo:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPromos();
    }
  }, [user, isHydrated, router]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredPromos = promos.filter(p => activeTab === "all" || (p.targetService || "all") === activeTab || (p.targetService || "all") === "all");

  if (isHydrated && !user) return null; // Mencegah kedipan UI sebelum redirect

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col pt-24 pb-20 px-6 relative overflow-hidden font-sans">
      {/* Background Ornamen */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />

      <div className="max-w-[1200px] w-full mx-auto relative z-10">
        
        {/* HERO SECTION */}
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <Badge variant="gold" className="mb-4 shadow-sm inline-flex items-center gap-1.5 px-3 py-1 text-[10px]">
              <TicketPercent className="w-3.5 h-3.5" /> Rewards & Offers
            </Badge>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Voucher <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A059] to-[#A68345]">Eksklusif Anda</span>
            </h1>
            <p className="text-slate-500 mt-3 text-sm md:text-base font-medium max-w-xl">
              Klaim dan gunakan kode voucher di bawah ini pada saat proses pembayaran untuk mendapatkan potongan harga spesial.
            </p>
          </div>
        </div>

        {/* TABS FILTER */}
        <div className="flex bg-white p-1.5 rounded-2xl mb-8 shadow-sm border border-slate-200 w-full max-w-lg relative">
          <button 
            onClick={() => setActiveTab("all")} 
            className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "all" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            Semua
          </button>
          <button 
            onClick={() => setActiveTab("domestik")} 
            className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "domestik" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            Domestik
          </button>
          <button 
            onClick={() => setActiveTab("forwarding")} 
            className={`flex-1 py-3 text-sm font-bold transition-all rounded-xl relative z-10 flex items-center justify-center gap-2 ${activeTab === "forwarding" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            Global
          </button>
          <div className={`absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] bg-slate-100 rounded-xl shadow-sm transition-all duration-300 ease-out border border-slate-200 ${
            activeTab === "all" ? "left-1.5" : 
            activeTab === "domestik" ? "left-[calc(33.33%+2px)]" : 
            "left-[calc(66.66%-1.5px)]"
          }`}></div>
        </div>

        {/* VOUCHER GRID */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Menarik Data Voucher...</p>
          </div>
        ) : filteredPromos.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-24 bg-white rounded-[2rem] border border-dashed border-slate-300 flex flex-col items-center text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
              <TicketPercent className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Belum Ada Voucher Tersedia</h3>
            <p className="text-slate-500 text-sm max-w-md">Saat ini tidak ada promo aktif untuk kategori yang dipilih. Cek kembali nanti untuk penawaran menarik!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredPromos.map((promo) => {
                const isVIP = promo.targetUser && promo.targetUser !== "all";
                const isDomestik = (promo.targetService || "all") === "domestik";
                const isGlobal = (promo.targetService || "all") === "forwarding";
                const badgeColor = isVIP ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent" : "bg-slate-100 text-slate-600 border-slate-200";

                return (
                  <motion.div 
                    key={promo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 group"
                  >
                    {/* Sisi Kiri (Stub Tiket) */}
                    <div className={`w-[35%] p-5 flex flex-col items-center justify-center text-center relative ${isVIP ? 'bg-slate-900 text-white' : 'bg-gradient-to-br from-[#C5A059] to-[#A68345] text-white'}`}>
                      {/* Dotted border pemisah */}
                      <div className="absolute right-0 top-0 bottom-0 w-px border-r-2 border-dashed border-white/40"></div>
                      {/* Cutouts (Setengah Lingkaran) */}
                      <div className="absolute -right-3 -top-3 w-6 h-6 bg-slate-50 rounded-full border-b border-l border-slate-200 z-10"></div>
                      <div className="absolute -right-3 -bottom-3 w-6 h-6 bg-slate-50 rounded-full border-t border-l border-slate-200 z-10"></div>
                      
                      <div className="bg-white/20 p-2.5 rounded-xl mb-3 backdrop-blur-sm border border-white/30">
                        {promo.type === "percentage" ? <Percent className="w-6 h-6 text-white" /> : <DollarSign className="w-6 h-6 text-white" />}
                      </div>
                      <h3 className="text-2xl lg:text-3xl font-black tracking-tight leading-none mb-1">
                        {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value/1000}K`}
                      </h3>
                      <span className="text-[9px] uppercase tracking-widest font-bold opacity-90">Diskon</span>
                    </div>

                    {/* Sisi Kanan (Detail Info) */}
                    <div className="w-[65%] p-5 flex flex-col justify-between bg-white relative">
                      {isVIP && (
                        <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Khusus Anda</div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1 ${badgeColor}`}>
                            {isVIP ? <ShieldAlert className="w-3 h-3" /> : (isDomestik ? <Truck className="w-3 h-3"/> : isGlobal ? <Globe2 className="w-3 h-3"/> : <TicketPercent className="w-3 h-3"/>)}
                            {isVIP ? "VIP REWARD" : (isDomestik ? "DOMESTIK" : isGlobal ? "GLOBAL" : "SEMUA LAYANAN")}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-lg tracking-wide uppercase font-mono bg-slate-50 w-fit px-2 py-1 rounded-lg border border-slate-100">{promo.id}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-2">
                          <Clock className="w-3.5 h-3.5" /> Berlaku s/d {new Date(promo.expiresAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      
                      <div className="mt-5 pt-4 border-t border-dashed border-slate-100">
                        <Button 
                          onClick={() => handleCopyCode(promo.id)}
                          variant={copiedCode === promo.id ? "primary" : "outline"} 
                          className={`w-full h-10 text-xs font-bold transition-all shadow-sm ${copiedCode === promo.id ? 'bg-emerald-500 border-emerald-500 hover:bg-emerald-600' : 'border-slate-200 text-slate-700 hover:text-[#C5A059] hover:border-[#C5A059]'}`}
                        >
                          {copiedCode === promo.id ? (
                            <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Disalin!</>
                          ) : (
                            <><Copy className="w-4 h-4 mr-1.5" /> Salin Kode</>
                          )}
                        </Button>
                      </div>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>
    </main>
  );
}