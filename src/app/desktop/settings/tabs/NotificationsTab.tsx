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

// --- INTERFACE UNTUK PROPS TOGGLE ROW (Lokal UI) ---
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

  // Komponen Helper untuk Baris Toggle
  const ToggleRow = ({ icon: Icon, label, desc, isChecked, onChange, locked = false, maintenance = false }: ToggleRowProps) => (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4", (locked || maintenance) && "opacity-60")}>
      <div className="flex items-start gap-4">
        <div className={cn("p-2.5 rounded-xl shrink-0 border shadow-sm", isChecked && !locked && !maintenance ? "bg-[#7A171D]/10 text-[#7A171D] border-[#7A171D]/20" : "bg-slate-50 text-slate-400 border-slate-200")}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h5 className="font-black text-slate-900 text-sm flex items-center gap-2">
            {label} 
            
            {/* MANUAL BADGE MAINTENANCE (Mencegah Error TS) */}
            {maintenance && (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-md text-[9px] font-bold">
                <Hammer className="w-2.5 h-2.5" /> Dev
              </span>
            )}
            
            {/* MANUAL BADGE Wajib */}
            {locked && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                Wajib
              </span>
            )}
          </h5>
          <p className="text-xs text-slate-500 mt-1 max-w-[250px] sm:max-w-xs font-medium leading-relaxed">{desc}</p>
        </div>
      </div>
      <button 
        type="button" 
        disabled={locked || maintenance}
        onClick={onChange} 
        className={cn(
          "w-12 h-6 rounded-full flex items-center transition-colors p-1 shrink-0 self-start sm:self-auto outline-none focus-visible:ring-2 focus-visible:ring-[#7A171D]/50 border shadow-inner",
          isChecked ? "bg-[#7A171D] border-[#5A0E13]" : "bg-slate-200 border-slate-300",
          (locked || maintenance) ? "cursor-not-allowed" : "cursor-pointer"
        )}
      >
        <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform border border-slate-100", isChecked ? "translate-x-6" : "translate-x-0")} />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden font-sans">
      
      {/* Header Sticky */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan Notifikasi</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Pilih jalur komunikasi yang paling nyaman untuk Anda.</p>
        </div>
        <Button 
          onClick={handleSaveNotifications} 
          disabled={isLoading} 
          variant="primary"
          className="w-full sm:w-auto px-6 shadow-md"
        >
          {isLoading ? "Menyimpan..." : <><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</>}
        </Button>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        
        {/* Notifikasi Status */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm border border-emerald-100 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0"/> Preferensi notifikasi berhasil diperbarui!
              </div>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm border border-red-100 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0"/> {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
          
          {/* SECTION 1: ORDER UPDATES */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
              <Package className="w-4 h-4 text-[#7A171D]" /> Order & Tracking
            </h3>
            <p className="text-xs font-semibold text-slate-500">Update status penjemputan, perjalanan manifes, hingga paket tiba.</p>
            <div className="space-y-2 divide-y divide-slate-50 border border-slate-100 rounded-2xl px-5 bg-slate-50/30">
              <ToggleRow icon={MonitorDot} label="Push (Browser)" desc="Notifikasi langsung di layar perangkat Anda." isChecked={notifPrefs.orders.push} onChange={() => handleToggle('orders', 'push')} maintenance={true} />
              <ToggleRow icon={Mail} label="Email Alerts" desc="Rangkuman perjalanan logistik ke inbox utama." isChecked={notifPrefs.orders.email} onChange={() => handleToggle('orders', 'email')} />
              <ToggleRow icon={MessageCircle} label="WhatsApp Bot" desc="Laporan instan via WA (Disarankan untuk B2B)." isChecked={notifPrefs.orders.whatsapp} onChange={() => handleToggle('orders', 'whatsapp')} />
            </div>
          </div>

          {/* SECTION 2: BILLING & FINANCE */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
              <CreditCard className="w-4 h-4 text-[#C5A059]" /> Billing & Finance
            </h3>
            <p className="text-xs font-semibold text-slate-500">Informasi tagihan, e-receipt, dan konfirmasi pembayaran.</p>
            <div className="space-y-2 divide-y divide-slate-50 border border-slate-100 rounded-2xl px-5 bg-slate-50/30">
              <ToggleRow icon={Mail} label="Email Invoices" desc="Pengiriman dokumen tagihan & resi format PDF." isChecked={notifPrefs.billing.email} onChange={() => handleToggle('billing', 'email')} />
              <ToggleRow icon={MessageCircle} label="WhatsApp Reminders" desc="Peringatan jatuh tempo tagihan (Khusus Piutang B2B)." isChecked={notifPrefs.billing.whatsapp} onChange={() => handleToggle('billing', 'whatsapp')} />
            </div>
          </div>

          {/* SECTION 3: OFFERS & PROMOTIONS */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
              <Bell className="w-4 h-4 text-emerald-600" /> Offers & Promotions
            </h3>
            <p className="text-xs font-semibold text-slate-500">Dapatkan informasi diskon kargo, voucher, dan rebate bulanan.</p>
            <div className="space-y-2 divide-y divide-slate-50 border border-slate-100 rounded-2xl px-5 bg-slate-50/30">
              <ToggleRow icon={Mail} label="Email Newsletters" desc="Katalog promo dan penawaran eksklusif per bulan." isChecked={notifPrefs.promos.email} onChange={() => handleToggle('promos', 'email')} />
              <ToggleRow icon={Smartphone} label="SMS Promos" desc="Kode voucher instan kilat langsung ke HP Anda." isChecked={notifPrefs.promos.sms} onChange={() => handleToggle('promos', 'sms')} maintenance={true} />
            </div>
          </div>

          {/* SECTION 4: SYSTEM & SECURITY */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest border-b border-slate-100 pb-3">
              <ShieldAlert className="w-4 h-4 text-blue-600" /> System & Security
            </h3>
            <p className="text-xs font-semibold text-slate-500">Peringatan keamanan akun dan login dari perangkat baru.</p>
            <div className="space-y-2 divide-y divide-slate-50 border border-slate-100 rounded-2xl px-5 bg-slate-50/30">
              <ToggleRow icon={Mail} label="Security Emails" desc="Peringatan mutlak jika ada aktivitas mencurigakan pada akun." isChecked={true} onChange={() => {}} locked={true} />
              <ToggleRow icon={MonitorDot} label="Push (Browser)" desc="Peringatan langsung di layar saat sesi login aktif." isChecked={notifPrefs.security.push} onChange={() => handleToggle('security', 'push')} maintenance={true} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}