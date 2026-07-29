"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { TicketPercent, Copy, CheckCircle2, Clock, ShieldAlert, Percent, DollarSign, Globe2, Truck } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { Promo } from "@/types/finance";
import { FirebaseTimestamp } from "@/types/order";

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

export default function MobilePromoPage() {
  const router = useRouter();
  const { user, isHydrated } = useAuthStore();
  
  const [promos, setPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "domestik" | "forwarding">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !user) { router.push("/login"); return; }

    const fetchPromos = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, "promos"), where("isActive", "==", true));
        const snap = await getDocs(q);
        
        let promosList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Promo[];
        const now = new Date();

        promosList = promosList.filter(p => {
          const isNotExpired = parsePromoDate(p.expiresAt) >= now;
          const hasQuota = p.usedCount < p.quota;
          const isTargetedForUser = !p.targetUser || p.targetUser === "all" || p.targetUser === user?.email?.toLowerCase();
          return isNotExpired && hasQuota && isTargetedForUser;
        });

        promosList.sort((a, b) => {
          const aVip = a.targetUser && a.targetUser !== "all" ? 1 : 0;
          const bVip = b.targetUser && b.targetUser !== "all" ? 1 : 0;
          return bVip - aVip;
        });

        setPromos(promosList);
      } catch (error) { console.error("Gagal menarik promo:", error); } 
      finally { setIsLoading(false); }
    };
    if (user) fetchPromos();
  }, [user, isHydrated, router]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredPromos = promos.filter(p => activeTab === "all" || (p.targetService || "all") === activeTab || (p.targetService || "all") === "all");

  if (isHydrated && !user) return null; 

  return (
    <div className="flex flex-col space-y-6 px-4 w-full">
      
      {/* HEADER SECTION */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="pt-4 relative z-10">
        <Badge variant="gold" className="mb-3 px-3 py-1.5 text-[9px] shadow-sm bg-white border-[#C5A059]/20">
          <TicketPercent className="w-3 h-3 mr-1" /> Flash Rewards
        </Badge>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight mb-2">
          Voucher <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#DFBE7B] to-[#C5A059]">Eksklusif.</span>
        </h1>
        <p className="text-slate-500 text-xs font-medium leading-relaxed">
          Klaim dan tempel kode saat pembayaran.
        </p>
      </motion.div>

      {/* FILTER TABS (APPLE PILL STYLE) */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="flex bg-white/80 backdrop-blur-md p-1.5 rounded-[1.25rem] shadow-sm border border-slate-100 relative z-20 w-full sticky top-[70px]">
        <button onClick={() => setActiveTab("all")} className={cn("flex-1 h-10 text-[10px] font-black transition-all rounded-xl relative z-10 tap-highlight-transparent", activeTab === "all" ? "text-slate-900" : "text-slate-500")}>Semua</button>
        <button onClick={() => setActiveTab("domestik")} className={cn("flex-1 h-10 text-[10px] font-black transition-all rounded-xl relative z-10 tap-highlight-transparent", activeTab === "domestik" ? "text-slate-900" : "text-slate-500")}>Domestik</button>
        <button onClick={() => setActiveTab("forwarding")} className={cn("flex-1 h-10 text-[10px] font-black transition-all rounded-xl relative z-10 tap-highlight-transparent", activeTab === "forwarding" ? "text-slate-900" : "text-slate-500")}>Global</button>
        
        <div className={cn("absolute top-1.5 bottom-1.5 w-[calc(33.33%-4px)] bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-all duration-300 border border-slate-100 z-0",
          activeTab === "all" ? "left-1.5" : activeTab === "domestik" ? "left-[calc(33.33%+2px)]" : "left-[calc(66.66%-1.5px)]"
        )}></div>
      </motion.div>

      {/* VOUCHER LIST */}
      <div className="relative z-10 pb-8">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#C5A059] rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-black uppercase tracking-widest text-[9px] animate-pulse">Menarik Data Voucher...</p>
          </div>
        ) : filteredPromos.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-16 glass-card rounded-[2rem] border border-white flex flex-col items-center text-center shadow-sm">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <TicketPercent className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">Belum Ada Voucher</h3>
            <p className="text-slate-500 text-xs px-4">Saat ini tidak ada promo aktif untuk kategori ini.</p>
          </motion.div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence>
              {filteredPromos.map((promo, index) => {
                const isVIP = promo.targetUser && promo.targetUser !== "all";
                const isDomestik = (promo.targetService || "all") === "domestik";
                const isGlobal = (promo.targetService || "all") === "forwarding";
                const promoDate = parsePromoDate(promo.expiresAt);

                return (
                  <motion.div 
                    key={promo.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="flex flex-col bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* ATAS: NOMINAL (Tiket Style) */}
                    <div className={cn("p-5 flex items-center justify-between relative overflow-hidden", isVIP ? 'bg-slate-900 text-white' : 'bg-gradient-to-r from-[#DFBE7B] to-[#C5A059] text-white')}>
                      <div className="relative z-10 flex items-center gap-4">
                        <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/30">
                          {promo.type === "percentage" ? <Percent className="w-5 h-5 drop-shadow-sm" /> : <DollarSign className="w-5 h-5 drop-shadow-sm" />}
                        </div>
                        <div>
                          <h3 className="text-3xl font-black tracking-tighter leading-none mb-1 drop-shadow-md">
                            {promo.type === 'percentage' ? `${promo.value}%` : `${promo.value/1000}K`}
                          </h3>
                          <span className="text-[9px] uppercase tracking-widest font-black opacity-90">Potongan Diskon</span>
                        </div>
                      </div>
                      
                      {isVIP && <ShieldAlert className="w-16 h-16 absolute -right-4 opacity-10 rotate-12" />}
                      {!isVIP && <TicketPercent className="w-16 h-16 absolute -right-4 opacity-10 rotate-12" />}
                      
                      {/* Efek Sobekan Bawah */}
                      <div className="absolute -bottom-2 left-4 right-4 h-4 bg-white rounded-t-xl z-20 hidden"></div>
                    </div>

                    {/* BAWAH: INFO & KLAIM */}
                    <div className="p-5 flex flex-col justify-between bg-white relative border-t-2 border-dashed border-slate-200">
                      {isVIP && (
                        <div className="absolute top-0 right-5 bg-purple-100 text-purple-700 text-[8px] font-black px-2 py-0.5 rounded-b-lg uppercase tracking-widest">Khusus Anda</div>
                      )}
                      
                      <div className="mb-4 pt-1">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border items-center gap-1 mb-2", 
                          isVIP ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-slate-50 text-slate-500 border-slate-200"
                        )}>
                          {isVIP ? <ShieldAlert className="w-3 h-3" /> : (isDomestik ? <Truck className="w-3 h-3"/> : isGlobal ? <Globe2 className="w-3 h-3"/> : <TicketPercent className="w-3 h-3"/>)}
                          {isVIP ? "VIP REWARD" : (isDomestik ? "DOMESTIK" : isGlobal ? "GLOBAL" : "SEMUA LAYANAN")}
                        </span>
                        <h4 className="font-black text-slate-900 text-base tracking-wider uppercase font-mono">{promo.id}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-1">
                          <Clock className="w-3 h-3" /> Berlaku s/d {promoDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      
                      <Button onClick={() => handleCopyCode(promo.id)} variant={copiedCode === promo.id ? "primary" : "outline"} className={cn("w-full h-12 text-xs font-black transition-all active:scale-95 tap-highlight-transparent rounded-xl", copiedCode === promo.id ? '!bg-emerald-500 !border-emerald-600' : 'bg-slate-50 text-slate-700 hover:border-[#C5A059] border-slate-200')}>
                        {copiedCode === promo.id ? <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Disalin</> : <><Copy className="w-4 h-4 mr-1.5" /> Salin Kode</>}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

    </div>
  );
}