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
  
  // State terpusat untuk semua preferensi notifikasi
  const [notifPrefs, setNotifPrefs] = useState({
    orders: { push: true, email: true, whatsapp: true },
    billing: { email: true, whatsapp: false },
    promos: { email: true, sms: false },
    security: { email: true, push: true }
  });

  // Tarik data preferensi dari Firestore
  useEffect(() => {
    if (user?.uid) {
      const fetchPreferences = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().notifications) {
            setNotifPrefs(prev => ({
              ...prev,
              ...userDoc.data().notifications
            }));
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
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Gagal menyimpan preferensi notifikasi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ====================================================================
  // KOMPONEN HELPER: CUSTOM IOS TOGGLE SWITCH
  // ====================================================================
  const ToggleRow = ({ icon: Icon, label, desc, isChecked, onChange, locked = false, maintenance = false }: ToggleRowProps) => (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-5 py-5", (locked || maintenance) && "opacity-60")}>
      <div className="flex items-start gap-5">
        <div className={cn(
          "w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 border shadow-sm transition-all duration-300", 
          isChecked && !locked && !maintenance 
            ? "bg-gradient-to-br from-[#9A242B] to-[#7A171D] text-white border-[#5A0E13] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_10px_rgba(122,23,29,0.2)]" 
            : "bg-slate-100 border-white text-slate-400"
        )}>
          <Icon className="w-5 h-5 drop-shadow-sm" />
        </div>
        <div>
          <h5 className="font-black text-slate-900 text-sm flex items-center gap-2 tracking-tight">
            {label} 
            
            {/* BADGE MAINTENANCE */}
            {maintenance && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50/80 backdrop-blur-sm text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                <Hammer className="w-3 h-3" /> Dev
              </span>
            )}
            
            {/* BADGE WAJIB */}
            {locked && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                Wajib
              </span>
            )}
          </h5>
          <p className="text-xs text-slate-500 mt-1 max-w-[250px] sm:max-w-xs font-medium leading-relaxed">{desc}</p>
        </div>
      </div>
      
      {/* CUSTOM 3D TOGGLE BUTTON */}
      <button 
        type="button" 
        disabled={locked || maintenance}
        onClick={onChange} 
        className={cn(
          "w-14 h-8 rounded-full flex items-center transition-all duration-300 p-1 shrink-0 self-start sm:self-auto outline-none focus-visible:ring-4 focus-visible:ring-[#7A171D]/20 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] border",
          isChecked ? "bg-emerald-500 border-emerald-600" : "bg-slate-200 border-slate-300",
          (locked || maintenance) ? "cursor-not-allowed" : "cursor-pointer active:scale-95"
        )}
      >
        <motion.div 
          layout
          initial={false}
          animate={{ x: isChecked ? 24 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-6 h-6 bg-white rounded-full shadow-md border border-slate-100" 
        />
      </button>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="glass-card rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white overflow-hidden font-sans relative"
    >
      {/* --- Ambient Glow --- */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#7A171D]/5 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* --- HEADER STICKY --- */}
      <div className="p-6 md:p-8 border-b border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white/40 backdrop-blur-xl sticky top-0 z-20 shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Notifikasi Sistem</h2>
          <p className="text-slate-500 text-sm mt-1.5 font-medium leading-relaxed">Pilih jalur komunikasi yang paling nyaman untuk Anda.</p>
        </div>
        <Button 
          onClick={handleSaveNotifications} 
          disabled={isLoading} 
          variant="primary"
          className="w-full sm:w-auto h-12 px-8 shadow-[0_8px_20px_rgba(122,23,29,0.2)] active:scale-95"
        >
          {isLoading ? "Menyimpan..." : <><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</>}
        </Button>
      </div>

      <div className="p-6 md:p-8 space-y-8 relative z-10">
        
        {/* --- TOAST NOTIFICATIONS (IN-CARD) --- */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-emerald-50/80 backdrop-blur-md text-emerald-700 rounded-[1.25rem] font-bold text-sm border border-emerald-200 shadow-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500"/> Preferensi notifikasi berhasil diperbarui!
              </div>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-red-50/80 backdrop-blur-md text-red-600 rounded-[1.25rem] font-bold text-sm border border-red-200 shadow-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500"/> {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
          
          {/* ========================================================= */}
          {/* SECTION 1: ORDER UPDATES (Bento Card) */}
          {/* ========================================================= */}
          <div className="bg-white/60 backdrop-blur-md border border-white p-6 rounded-[2rem] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-widest border-b border-slate-200/60 pb-4 mb-4">
              <div className="bg-[#7A171D]/10 p-1.5 rounded-lg border border-[#7A171D]/20"><Package className="w-4 h-4 text-[#7A171D]" /></div> Order & Tracking
            </h3>
            <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">Update status penjemputan, perjalanan manifes, hingga paket tiba di tujuan akhir.</p>
            <div className="space-y-1 divide-y divide-slate-100">
              <ToggleRow icon={MonitorDot} label="Push (Browser)" desc="Notifikasi langsung di layar perangkat Anda." isChecked={notifPrefs.orders.push} onChange={() => handleToggle('orders', 'push')} maintenance={true} />
              <ToggleRow icon={Mail} label="Email Alerts" desc="Rangkuman perjalanan logistik ke inbox utama." isChecked={notifPrefs.orders.email} onChange={() => handleToggle('orders', 'email')} />
              <ToggleRow icon={MessageCircle} label="WhatsApp Bot" desc="Laporan instan via WA (Disarankan untuk B2B)." isChecked={notifPrefs.orders.whatsapp} onChange={() => handleToggle('orders', 'whatsapp')} />
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 2: BILLING & FINANCE (Bento Card) */}
          {/* ========================================================= */}
          <div className="bg-white/60 backdrop-blur-md border border-white p-6 rounded-[2rem] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-widest border-b border-slate-200/60 pb-4 mb-4">
              <div className="bg-[#C5A059]/10 p-1.5 rounded-lg border border-[#C5A059]/20"><CreditCard className="w-4 h-4 text-[#A68345]" /></div> Billing & Finance
            </h3>
            <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">Informasi rincian tagihan, e-receipt, dan konfirmasi validasi pembayaran Anda.</p>
            <div className="space-y-1 divide-y divide-slate-100">
              <ToggleRow icon={Mail} label="Email Invoices" desc="Pengiriman dokumen tagihan & resi format PDF." isChecked={notifPrefs.billing.email} onChange={() => handleToggle('billing', 'email')} />
              <ToggleRow icon={MessageCircle} label="WhatsApp Reminders" desc="Peringatan jatuh tempo tagihan (Khusus Piutang B2B)." isChecked={notifPrefs.billing.whatsapp} onChange={() => handleToggle('billing', 'whatsapp')} />
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 3: OFFERS & PROMOTIONS (Bento Card) */}
          {/* ========================================================= */}
          <div className="bg-white/60 backdrop-blur-md border border-white p-6 rounded-[2rem] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-widest border-b border-slate-200/60 pb-4 mb-4">
              <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20"><Bell className="w-4 h-4 text-emerald-600" /></div> Offers & Promos
            </h3>
            <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">Dapatkan informasi diskon rute kargo, kode voucher, dan rebate bulanan.</p>
            <div className="space-y-1 divide-y divide-slate-100">
              <ToggleRow icon={Mail} label="Email Newsletters" desc="Katalog promo dan penawaran eksklusif per bulan." isChecked={notifPrefs.promos.email} onChange={() => handleToggle('promos', 'email')} />
              <ToggleRow icon={Smartphone} label="SMS Promos" desc="Kode voucher instan kilat langsung ke HP Anda." isChecked={notifPrefs.promos.sms} onChange={() => handleToggle('promos', 'sms')} maintenance={true} />
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 4: SYSTEM & SECURITY (Bento Card) */}
          {/* ========================================================= */}
          <div className="bg-white/60 backdrop-blur-md border border-white p-6 rounded-[2rem] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-widest border-b border-slate-200/60 pb-4 mb-4">
              <div className="bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20"><ShieldAlert className="w-4 h-4 text-blue-600" /></div> System & Security
            </h3>
            <p className="text-xs font-bold text-slate-500 mb-6 leading-relaxed">Peringatan keamanan akun, perubahan kata sandi, dan login dari perangkat baru.</p>
            <div className="space-y-1 divide-y divide-slate-100">
              <ToggleRow icon={Mail} label="Security Emails" desc="Peringatan mutlak jika ada aktivitas mencurigakan pada akun." isChecked={true} onChange={() => {}} locked={true} />
              <ToggleRow icon={MonitorDot} label="Push (Browser)" desc="Peringatan langsung di layar saat sesi login aktif." isChecked={notifPrefs.security.push} onChange={() => handleToggle('security', 'push')} maintenance={true} />
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}