"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, CheckCircle2, Bell, Package, 
  CreditCard, ShieldAlert, Mail, Smartphone, 
  MessageCircle, MonitorDot, AlertCircle, Hammer
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// --- INTERFACE UNTUK PROPS TOGGLE ROW ---
interface ToggleRowProps {
  icon: React.ElementType;
  label: string;
  desc: string;
  isChecked: boolean;
  onChange: () => void;
  locked?: boolean;
  maintenance?: boolean;
}

export default function NotificationsTab() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [notifPrefs, setNotifPrefs] = useState({
    orders: { push: true, email: true, whatsapp: true },
    billing: { email: true, whatsapp: false },
    promos: { email: true, sms: false },
    security: { email: true, push: true }
  });

  useEffect(() => {
    if (user?.uid) {
      const fetchPreferences = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().notifications) {
            setNotifPrefs(prev => ({ ...prev, ...userDoc.data().notifications }));
          }
        } catch (error) {
          console.error("Gagal menarik preferensi notifikasi:", error);
        }
      };
      fetchPreferences();
    }
  }, [user]);

  const handleToggle = (category: keyof typeof notifPrefs, channel: string) => {
    setNotifPrefs(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: !prev[category][channel as keyof typeof prev[typeof category]]
      }
    }));
  };

  const handleSaveNotifications = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    setErrorMsg("");
    try {
      await setDoc(doc(db, "users", user.uid), {
        notifications: notifPrefs,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: unknown) {
      if (error instanceof Error) setErrorMsg(error.message);
      else setErrorMsg("Gagal menyimpan preferensi notifikasi.");
    } finally {
      setIsLoading(false);
    }
  };

  // ====================================================================
  // KOMPONEN HELPER: CUSTOM IOS TOGGLE SWITCH (MOBILE OPTIMIZED)
  // ====================================================================
  const ToggleRow = ({ icon: Icon, label, desc, isChecked, onChange, locked = false, maintenance = false }: ToggleRowProps) => (
    <div className={cn("flex items-center justify-between gap-4 py-4", (locked || maintenance) && "opacity-60 grayscale-[30%]")}>
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-all duration-300", 
          isChecked && !locked && !maintenance 
            ? "bg-gradient-to-br from-[#9A242B] to-[#7A171D] text-white border-[#5A0E13]" 
            : "bg-slate-100 border-white text-slate-400"
        )}>
          <Icon className="w-4 h-4 drop-shadow-sm" />
        </div>
        <div className="min-w-0">
          <h5 className="font-black text-slate-900 text-[11px] flex flex-wrap items-center gap-1.5 tracking-tight leading-none mb-1">
            {label} 
            {maintenance && (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest">
                <Hammer className="w-2.5 h-2.5" /> Dev
              </span>
            )}
            {locked && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 border border-slate-300">
                Wajib
              </span>
            )}
          </h5>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{desc}</p>
        </div>
      </div>
      
      {/* IOS STYLE TOGGLE */}
      <button 
        type="button" 
        disabled={locked || maintenance}
        onClick={onChange} 
        className={cn(
          "w-12 h-7 rounded-full flex items-center transition-all duration-300 p-1 shrink-0 outline-none shadow-inner border tap-highlight-transparent",
          isChecked ? "bg-emerald-500 border-emerald-600" : "bg-slate-200 border-slate-300",
          (locked || maintenance) ? "cursor-not-allowed" : "active:scale-95"
        )}
      >
        <motion.div 
          layout
          initial={false}
          animate={{ x: isChecked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-5 h-5 bg-white rounded-full shadow-sm border border-slate-100" 
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-6 relative z-10">
      
      {/* TOAST NOTIFICATIONS */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-[1.25rem] font-bold text-xs border border-emerald-200 shadow-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5"/> <span>Preferensi notifikasi berhasil diperbarui!</span>
            </div>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
            <div className="p-3 bg-red-50 text-red-600 rounded-[1.25rem] font-bold text-xs border border-red-200 shadow-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5"/> <span>{errorMsg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        
        {/* SECTION 1: ORDER UPDATES */}
        <div className="glass-card bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
            <div className="bg-[#7A171D]/10 p-2 rounded-xl border border-[#7A171D]/20"><Package className="w-4 h-4 text-[#7A171D]" /></div>
            <div>
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-0.5">Order & Tracking</h3>
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed">Update pergerakan manifes.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            <ToggleRow icon={MonitorDot} label="Push (Browser)" desc="Notifikasi langsung di layar perangkat Anda." isChecked={notifPrefs.orders.push} onChange={() => handleToggle('orders', 'push')} maintenance={true} />
            <ToggleRow icon={Mail} label="Email Alerts" desc="Rangkuman perjalanan logistik ke inbox utama." isChecked={notifPrefs.orders.email} onChange={() => handleToggle('orders', 'email')} />
            <ToggleRow icon={MessageCircle} label="WhatsApp Bot" desc="Laporan instan via WA (Disarankan untuk B2B)." isChecked={notifPrefs.orders.whatsapp} onChange={() => handleToggle('orders', 'whatsapp')} />
          </div>
        </div>

        {/* SECTION 2: BILLING & FINANCE */}
        <div className="glass-card bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
            <div className="bg-[#C5A059]/10 p-2 rounded-xl border border-[#C5A059]/20"><CreditCard className="w-4 h-4 text-[#A68345]" /></div>
            <div>
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-0.5">Billing & Finance</h3>
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed">Informasi e-receipt & konfirmasi tagihan.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            <ToggleRow icon={Mail} label="Email Invoices" desc="Pengiriman dokumen tagihan & resi format PDF." isChecked={notifPrefs.billing.email} onChange={() => handleToggle('billing', 'email')} />
            <ToggleRow icon={MessageCircle} label="WhatsApp Reminders" desc="Peringatan jatuh tempo tagihan (Khusus B2B)." isChecked={notifPrefs.billing.whatsapp} onChange={() => handleToggle('billing', 'whatsapp')} />
          </div>
        </div>

        {/* SECTION 3: OFFERS & PROMOTIONS */}
        <div className="glass-card bg-white border border-slate-100 p-5 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20"><Bell className="w-4 h-4 text-emerald-600" /></div>
            <div>
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-0.5">Offers & Promos</h3>
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed">Katalog diskon rute & voucher.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            <ToggleRow icon={Mail} label="Email Newsletters" desc="Katalog promo bulanan." isChecked={notifPrefs.promos.email} onChange={() => handleToggle('promos', 'email')} />
            <ToggleRow icon={Smartphone} label="SMS Promos" desc="Kode voucher instan kilat langsung ke HP Anda." isChecked={notifPrefs.promos.sms} onChange={() => handleToggle('promos', 'sms')} maintenance={true} />
          </div>
        </div>

        {/* SECTION 4: SYSTEM & SECURITY */}
        <div className="glass-card bg-slate-50 border border-slate-200 p-5 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-200 pb-3">
            <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20"><ShieldAlert className="w-4 h-4 text-blue-600" /></div>
            <div>
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-0.5">System & Security</h3>
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed">Peringatan login baru & sandi.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-200">
            <ToggleRow icon={Mail} label="Security Emails" desc="Peringatan mutlak jika ada aktivitas mencurigakan." isChecked={true} onChange={() => {}} locked={true} />
            <ToggleRow icon={MonitorDot} label="Push (Browser)" desc="Peringatan saat sesi login aktif." isChecked={notifPrefs.security.push} onChange={() => handleToggle('security', 'push')} maintenance={true} />
          </div>
        </div>

      </div>

      {/* BOTTOM ACTION BAR (STICKY) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <Button 
          onClick={handleSaveNotifications} 
          disabled={isLoading} 
          className="w-full h-14 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white rounded-[1.25rem] font-black shadow-md flex items-center justify-center gap-2 active:scale-95 tap-highlight-transparent border border-[#5A0E13] text-sm"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <><Save className="w-4 h-4" /> Simpan Perubahan</>
          )}
        </Button>
      </div>

    </div>
  );
}