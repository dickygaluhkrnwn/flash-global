"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, CheckCircle2, Bell, Package, 
  CreditCard, ShieldAlert, Mail, Smartphone, 
  MessageCircle, MonitorDot
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

// --- INTERFACE UNTUK PROPS TOGGLE ROW ---
interface ToggleRowProps {
  icon: React.ElementType;
  label: string;
  desc: string;
  isChecked: boolean;
  onChange: () => void;
  locked?: boolean;
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

  // Komponen Helper untuk Baris Toggle (Sudah Tipe Aman)
  const ToggleRow = ({ icon: Icon, label, desc, isChecked, onChange, locked = false }: ToggleRowProps) => (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 text-gray-500 rounded-lg shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h5 className="font-bold text-gray-900 text-sm">{label}</h5>
          <p className="text-xs text-gray-500 mt-0.5 max-w-[250px] sm:max-w-md">{desc}</p>
        </div>
      </div>
      <button 
        type="button" 
        disabled={locked}
        onClick={onChange} 
        className={`w-11 h-6 rounded-full flex items-center transition-colors p-1 shrink-0 ${isChecked ? 'bg-[#7A171D]' : 'bg-gray-300'} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Notifications</h2>
          <p className="text-gray-500 text-sm mt-1">Pilih bagaimana sistem menghubungi Anda untuk berbagai aktivitas.</p>
        </div>
        <button onClick={handleSaveNotifications} disabled={isLoading} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2">
          {isLoading ? "Menyimpan..." : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>

      <div className="p-8 space-y-8">
        <AnimatePresence>
          {isSuccess && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-green-50 text-green-700 rounded-xl font-bold text-sm border border-green-200 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Preferensi notifikasi berhasil diperbarui!</motion.div>}
          {errorMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm border border-red-200">{errorMsg}</motion.div>}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* SECTION 1: ORDER UPDATES */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider border-b border-gray-100 pb-3">
              <Package className="w-4 h-4 text-[#7A171D]" /> Order & Tracking
            </h3>
            <p className="text-xs text-gray-500">Update status penjemputan, perjalanan manifes, hingga paket tiba.</p>
            <div className="space-y-2 divide-y divide-gray-50">
              <ToggleRow icon={MonitorDot} label="Push (Browser)" desc="Notifikasi langsung di layar perangkat Anda." isChecked={notifPrefs.orders.push} onChange={() => handleToggle('orders', 'push')} />
              <ToggleRow icon={Mail} label="Email Alerts" desc="Rangkuman perjalanan logistik ke inbox utama." isChecked={notifPrefs.orders.email} onChange={() => handleToggle('orders', 'email')} />
              <ToggleRow icon={MessageCircle} label="WhatsApp Bot" desc="Laporan instan via WA (Disarankan untuk B2B)." isChecked={notifPrefs.orders.whatsapp} onChange={() => handleToggle('orders', 'whatsapp')} />
            </div>
          </div>

          {/* SECTION 2: BILLING & FINANCE */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider border-b border-gray-100 pb-3">
              <CreditCard className="w-4 h-4 text-[#C5A059]" /> Billing & Finance
            </h3>
            <p className="text-xs text-gray-500">Informasi tagihan, invoice B2B, dan konfirmasi pembayaran.</p>
            <div className="space-y-2 divide-y divide-gray-50">
              <ToggleRow icon={Mail} label="Email Invoices" desc="Pengiriman dokumen tagihan format PDF." isChecked={notifPrefs.billing.email} onChange={() => handleToggle('billing', 'email')} />
              <ToggleRow icon={MessageCircle} label="WhatsApp Reminders" desc="Peringatan jatuh tempo tagihan (Khusus B2B)." isChecked={notifPrefs.billing.whatsapp} onChange={() => handleToggle('billing', 'whatsapp')} />
            </div>
          </div>

          {/* SECTION 3: OFFERS & PROMOTIONS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider border-b border-gray-100 pb-3">
              <Bell className="w-4 h-4 text-emerald-600" /> Offers & Promotions
            </h3>
            <p className="text-xs text-gray-500">Dapatkan informasi diskon kargo, rewards, dan rebate bulanan.</p>
            <div className="space-y-2 divide-y divide-gray-50">
              <ToggleRow icon={Mail} label="Email Newsletters" desc="Katalog promo dan penawaran eksklusif." isChecked={notifPrefs.promos.email} onChange={() => handleToggle('promos', 'email')} />
              <ToggleRow icon={Smartphone} label="SMS Promos" desc="Kode voucher instan langsung ke HP Anda." isChecked={notifPrefs.promos.sms} onChange={() => handleToggle('promos', 'sms')} />
            </div>
          </div>

          {/* SECTION 4: SYSTEM & SECURITY */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider border-b border-gray-100 pb-3">
              <ShieldAlert className="w-4 h-4 text-blue-600" /> System & Security
            </h3>
            <p className="text-xs text-gray-500">Peringatan keamanan akun dan login perangkat baru.</p>
            <div className="space-y-2 divide-y divide-gray-50">
              <ToggleRow icon={Mail} label="Security Emails" desc="Peringatan wajib jika ada aktivitas mencurigakan." isChecked={true} onChange={() => {}} locked={true} />
              <ToggleRow icon={MonitorDot} label="Push (Browser)" desc="Peringatan langsung di layar saat sesi login aktif." isChecked={notifPrefs.security.push} onChange={() => handleToggle('security', 'push')} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}