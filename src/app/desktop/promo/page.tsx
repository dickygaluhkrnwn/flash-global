"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  TicketPercent, Copy, CheckCircle2, 
  Clock, ShieldAlert, Percent, DollarSign, Globe2, Truck
} from "lucide-react";

// --- IMPORT FIREBASE & ZUSTAND ---
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { Promo } from "@/types/finance";
import { FirebaseTimestamp } from "@/types/order";

// --- HELPER FUNCTION: PARSING FIREBASE TIMESTAMP KE DATE ---
const parsePromoDate = (ts: string | Date | FirebaseTimestamp): Date => {
  if (!ts) return new Date();
  if (typeof ts === 'object' && ts !== null) {
    const objTs = ts as Record<string, unknown>;
    if (typeof objTs.toDate === 'function') return objTs.toDate() as Date;
    if (typeof objTs.seconds === 'number') return new Date(objTs.seconds * 1000);
    if (ts instanceof Date) return ts;
  }
  return new Date(ts as string | number);
};

export default function ClientPromoPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  
  const [promos, setPromos] = useState<Promo[]>([]);
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
        })) as Promo[];
        
        // Filter cerdas:
        // 1. Buang yang sudah kadaluarsa
        // 2. Buang yang kuotanya sudah habis
        // 3. Hanya ambil yang untuk publik ("all") ATAU khusus email user yang login
        const now = new Date();
        promosList = promosList.filter(p => {
          const isNotExpired = parsePromoDate(p.expiresAt) >= now;
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
    <main className="min-h-screen bg-[#f8fafc] flex flex-col py-16 px-6 relative overflow-hidden font-sans z-0 pb-32">
      
      {/* === AMBIENT GLOWING BACKGROUND === */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[0%] left-[-10%] w-[50vw] h-[50vh] bg-[#C5A059]/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40vw] h-[50vh] bg-[#7A171D]/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1200px] w-full mx-auto relative z-10">
        
        {/* ==========================================
            HERO SECTION (GLASS PANEL)
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-panel p-8 md:p-10 rounded-[2.5rem] mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-white/40 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <Badge variant="gold" className="mb-4 shadow-sm inline-flex items-center gap-1.5 px-4 py-1.5">
              <TicketPercent className="w-3.5 h-3.5" /> Rewards & Offers
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight mb-3">
              Voucher <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFBE7B] to-[#A68345]">Eksklusif Anda</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl leading-relaxed">
              Klaim dan gunakan kode voucher di bawah ini pada saat proses pembayaran untuk mendapatkan potongan harga spesial pada pengiriman Anda berikutnya.
            </p>
          </div>
          
          {/* Decorative Icon */}
          <div className="hidden md:flex w-24 h-24 bg-white/60 backdrop-blur-md rounded-[2rem] items-center justify-center border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),0_8px_16px_rgba(0,0,0,0.05)] shrink-0 relative z-10 rotate-3">
             <TicketPercent className="w-10 h-10 text-[#C5A059]" />
          </div>
        </motion.div>

        {/* ==========================================
            TABS FILTER (APPLE PILL STYLE)
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex bg-white/60 backdrop-blur-md p-1.5 rounded-[1.5rem] mb-10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] border border-white w-full max-w-lg relative z-20 mx-auto lg:mx-0"
        >
          <button 
            onClick={() => setActiveTab("all")} 
            className={cn("flex-1 py-3 text-sm font-black transition-all rounded-[1.25rem] relative z-10 flex items-center justify-center gap-2", activeTab === "all" ? "text-slate-900" : "text-slate-500 hover:text-slate-700")}
          >
            Semua
          </button>
          <button 
            onClick={() => setActiveTab("domestik")} 
            className={cn("flex-1 py-3 text-sm font-black transition-all rounded-[1.25rem] relative z-10 flex items-center justify-center gap-2", activeTab === "domestik" ? "text-slate-900" : "text-slate-500 hover:text-slate-700")}
          >
            Domestik
          </button>
          <button 
            onClick={() => setActiveTab("forwarding")} 
            className={cn("flex-1 py-3 text-sm font-black transition-all rounded-[1.25rem] relative z-10 flex items-center justify-center gap-2", activeTab === "forwarding" ? "text-slate-900" : "text-slate-500 hover:text-slate-700")}
          >
            Global
          </button>
          <div className={cn("absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] bg-white rounded-[1.25rem] shadow-sm transition-all duration-300 ease-out border border-slate-100 z-0",
            activeTab === "all" ? "left-1.5" : 
            activeTab === "domestik" ? "left-[calc(33.33%+2px)]" : 
            "left-[calc(66.66%-1.5px)]"
          )}></div>
        </motion.div>

        {/* ==========================================
            VOUCHER GRID
            ========================================== */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 border-4 border-white border-t-[#C5A059] rounded-full animate-spin mb-4 shadow-sm"></div>
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs animate-pulse">Menarik Data Voucher...</p>
          </div>
        ) : filteredPromos.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-24 glass-card rounded-[3rem] border border-dashed border-white flex flex-col items-center text-center shadow-sm">
            <div className="w-20 h-20 bg-white/50 backdrop-blur-md rounded-[2rem] flex items-center justify-center mb-6 border border-white shadow-[inset_0_2px_4px_rgba(255,255,255,1)]">
              <TicketPercent className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Belum Ada Voucher</h3>
            <p className="text-slate-500 text-sm max-w-md font-medium leading-relaxed">Saat ini tidak ada promo aktif untuk kategori yang dipilih. Cek kembali nanti untuk penawaran menarik!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
            <AnimatePresence>
              {filteredPromos.map((promo, index) => {
                const isVIP = promo.targetUser && promo.targetUser !== "all";
                const isDomestik = (promo.targetService || "all") === "domestik";
                const isGlobal = (promo.targetService || "all") === "forwarding";
                const badgeColor = isVIP ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-transparent" : "bg-white/60 text-slate-600 border-white";
                
                // Konversi tanggal menggunakan helper aman
                const promoDate = parsePromoDate(promo.expiresAt);

                return (
                  <motion.div 
                    key={promo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="flex glass-card rounded-[2rem] border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_20px_rgba(0,0,0,0.03)] overflow-hidden hover:shadow-[0_15px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group"
                  >
                    {/* Sisi Kiri (Stub Tiket Premium) */}
                    <div className={cn("w-[35%] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden", isVIP ? 'bg-slate-900 text-white' : 'bg-gradient-to-b from-[#DFBE7B] to-[#C5A059] text-white')}>
                      {/* Dotted border pemisah (Efek Sobekan) */}
                      <div className="absolute right-0 top-0 bottom-0 w-px border-r-2 border-dashed border-white/40 z-20"></div>
                      
                      {/* Cutouts (Setengah Lingkaran ala Tiket Nyata) */}
                      <div className="absolute -right-3 -top-3 w-6 h-6 bg-[#f8fafc] rounded-full shadow-[inset_1px_-1px_3px_rgba(0,0,0,0.1)] z-20"></div>
                      <div className="absolute -right-3 -bottom-3 w-6 h-6 bg-[#f8fafc] rounded-full shadow-[inset_1px_1px_3px_rgba(0,0,0,0.1)] z-20"></div>
                      
                      {/* Inner Glow */}
                      <div className="absolute top-0 right-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                      <div className="bg-white/20 p-3 rounded-2xl mb-4 backdrop-blur-md border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] relative z-10">
                        {promo.type === "percentage" ? <Percent className="w-6 h-6 text-white drop-shadow-sm" /> : <DollarSign className="w-6 h-6 text-white drop-shadow-sm" />}
                      </div>
                      <h3 className="text-3xl font-black tracking-tighter leading-none mb-1 relative z-10 drop-shadow-sm">
                        {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value/1000}K`}
                      </h3>
                      <span className="text-[9px] uppercase tracking-widest font-black opacity-90 relative z-10">Diskon</span>
                    </div>

                    {/* Sisi Kanan (Detail Info Glass) */}
                    <div className="w-[65%] p-6 flex flex-col justify-between bg-white/40 relative">
                      {isVIP && (
                        <div className="absolute top-0 right-0 bg-purple-100 text-purple-700 text-[9px] font-black px-3 py-1 rounded-bl-[1rem] uppercase tracking-widest shadow-sm">Khusus Anda</div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={cn("px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 shadow-sm backdrop-blur-sm", badgeColor)}>
                            {isVIP ? <ShieldAlert className="w-3.5 h-3.5" /> : (isDomestik ? <Truck className="w-3.5 h-3.5"/> : isGlobal ? <Globe2 className="w-3.5 h-3.5"/> : <TicketPercent className="w-3.5 h-3.5"/>)}
                            {isVIP ? "VIP REWARD" : (isDomestik ? "DOMESTIK" : isGlobal ? "GLOBAL" : "SEMUA LAYANAN")}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-lg tracking-wider uppercase font-mono bg-white w-fit px-3 py-1.5 rounded-xl border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">{promo.id}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold mt-3">
                          <Clock className="w-3.5 h-3.5" /> Berlaku s/d {promoDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-white">
                        <Button 
                          onClick={() => handleCopyCode(promo.id)}
                          variant={copiedCode === promo.id ? "primary" : "glass"} 
                          className={cn("w-full h-12 text-xs font-black transition-all shadow-sm active:scale-95", 
                            copiedCode === promo.id 
                              ? '!bg-gradient-to-b !from-emerald-500 !to-emerald-600 !border-emerald-700 text-white' 
                              : 'bg-white hover:bg-[#C5A059]/10 text-slate-700 hover:text-[#C5A059] border border-white hover:border-[#C5A059]/30'
                          )}
                        >
                          {copiedCode === promo.id ? (
                            <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Berhasil Disalin</>
                          ) : (
                            <><Copy className="w-4 h-4 mr-1.5" /> Salin Kode Voucher</>
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