"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  User, Building, Package, Globe, Bell, FileText, 
  ChevronRight, ArrowLeft, ShieldCheck, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuthStore } from "@/store/useAuthStore";

// --- IMPORT KOMPONEN TABS (NANTI KITA BUAT VERSI MOBILE-NYA) ---
import ProfileTab from "./tabs/ProfileTab";
import BusinessTab from "./tabs/BusinessTab";
import OrdersTab from "./tabs/OrdersTab";
import LocationLanguageTab from "./tabs/LocationLanguageTab";
import NotificationsTab from "./tabs/NotificationsTab";
import TermsTab from "./tabs/TermsTab"; 

export default function MobileSettingsPage() {
  const router = useRouter();
  const { user, logout, isHydrated } = useAuthStore();
  
  // State untuk mengontrol view mana yang sedang aktif
  // null berarti sedang berada di Menu Utama
  const [activeView, setActiveView] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !user) {
      router.push("/login");
    }
  }, [user, isHydrated, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
      router.push("/login");
    } catch (error) {
      console.error("Gagal Logout:", error);
    }
  };

  const menuSections = [
    {
      title: "Pribadi & Operasional",
      items: [
        { id: "profile", icon: User, label: "Profil & Keamanan", color: "text-blue-500", bg: "bg-blue-50" },
        { id: "business", icon: Building, label: "Akun Korporat (B2B)", color: "text-indigo-500", bg: "bg-indigo-50" },
        { id: "orders", icon: Package, label: "Preferensi Pesanan", color: "text-amber-500", bg: "bg-amber-50" },
        { id: "location", icon: Globe, label: "Lokasi & Bahasa", color: "text-emerald-500", bg: "bg-emerald-50" },
        { id: "notifications", icon: Bell, label: "Notifikasi Sistem", color: "text-rose-500", bg: "bg-rose-50" },
      ]
    },
    {
      title: "Informasi Legal",
      items: [
        { id: "terms", icon: FileText, label: "Syarat & Kebijakan Privasi", color: "text-slate-500", bg: "bg-slate-100" },
      ]
    }
  ];

  if (!isHydrated || !user) return null;

  return (
    <div className="w-full relative min-h-screen bg-[#f8fafc] font-sans pb-28">
      
      {/* 
        ========================================================
        VIEW 1: MENU UTAMA (DAFTAR SETTINGS)
        ========================================================
      */}
      <AnimatePresence mode="wait">
        {!activeView && (
          <motion.div 
            key="main-menu"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20, filter: "blur(5px)" }} transition={{ duration: 0.3 }}
            className="w-full px-4 pt-6 space-y-8"
          >
            {/* Header User Singkat */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#9A242B] to-[#7A171D] flex items-center justify-center text-white border border-[#4A0A10] shrink-0 shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-slate-900 truncate tracking-tight">{user.displayName}</h2>
                <p className="text-[10px] text-slate-500 font-bold truncate mt-0.5">{user.email}</p>
                <div className="inline-block mt-1.5 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                  {user.role === 'b2b' ? 'Corporate Account' : 'Personal Account'}
                </div>
              </div>
            </div>

            {/* List Menu Settings Grouped */}
            <div className="space-y-6">
              {menuSections.map((section, sIdx) => (
                <div key={sIdx}>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-4 mb-2">
                    {section.title}
                  </h3>
                  <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                    {section.items.map((item) => (
                      <button 
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className="w-full flex items-center justify-between p-4 active:bg-slate-50 transition-colors tap-highlight-transparent"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white shadow-sm", item.bg, item.color)}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-800">{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Banner Keamanan (Mobile Version) */}
            <div className="bg-emerald-50 rounded-[1.5rem] p-5 flex items-start gap-3 border border-emerald-100 shadow-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Data Terenkripsi</h4>
                <p className="text-[10px] font-bold text-emerald-600/80 leading-relaxed">Informasi privasi Anda dilindungi dengan standar keamanan AES-256.</p>
              </div>
            </div>

            {/* Tombol Logout */}
            <button onClick={handleLogout} className="w-full h-14 bg-red-50 text-red-600 font-black text-sm rounded-[1.25rem] flex items-center justify-center gap-2 active:bg-red-100 transition-colors border border-red-100 shadow-sm tap-highlight-transparent">
              <LogOut className="w-4 h-4" /> Keluar Aplikasi
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 
        ========================================================
        VIEW 2: SUB-PAGES (PUSH VIEW OVERLAY)
        ========================================================
      */}
      <AnimatePresence>
        {activeView && (
          <motion.div 
            key="sub-view"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3, type: "tween", ease: "easeOut" }}
            className="fixed inset-0 z-[150] bg-[#f8fafc] flex flex-col font-sans"
          >
            {/* Header Native Push View */}
            <div className="flex-none bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm pt-safe relative z-20">
              <div className="flex items-center justify-between px-4 h-14">
                <button onClick={() => setActiveView(null)} className="flex items-center gap-1 text-[#7A171D] active:opacity-50 transition-opacity tap-highlight-transparent font-bold text-sm">
                  <ArrowLeft className="w-5 h-5" /> Pengaturan
                </button>
                {/* Judul Dinamis */}
                <h2 className="text-sm font-black text-slate-900 tracking-tight absolute left-1/2 -translate-x-1/2">
                  {menuSections.flatMap(s => s.items).find(i => i.id === activeView)?.label || "Detail"}
                </h2>
                <div className="w-14"></div> {/* Spacer balance */}
              </div>
            </div>

            {/* Scrollable Content Tab */}
            <div className="flex-grow overflow-y-auto overflow-x-hidden p-4 pb-[100px] relative z-10 no-scrollbar">
              {activeView === "profile" && <ProfileTab />}
              {activeView === "business" && <BusinessTab />}
              {activeView === "orders" && <OrdersTab />}
              {activeView === "location" && <LocationLanguageTab />}
              {activeView === "notifications" && <NotificationsTab />}
              {activeView === "terms" && <TermsTab />} 
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}