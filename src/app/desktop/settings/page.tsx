"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Building, Package, Globe, Bell, FileText, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- IMPORT KOMPONEN TABS ---
import ProfileTab from "./tabs/ProfileTab";
import BusinessTab from "./tabs/BusinessTab";
import OrdersTab from "./tabs/OrdersTab";
import LocationLanguageTab from "./tabs/LocationLanguageTab";
import NotificationsTab from "./tabs/NotificationsTab";
import TermsTab from "./tabs/TermsTab"; 

// --- INTERFACE UNTUK PROPS COMPONENT ---
interface SidebarButtonProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export default function DesktopSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <main className="min-h-screen bg-[#f8fafc] py-12 lg:py-20 px-6 relative overflow-hidden font-sans pb-32 z-0">
      
      {/* === AMBIENT GLOWING BACKGROUND === */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vh] bg-[#7A171D]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[50vh] bg-[#C5A059]/15 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-[1200px] mx-auto z-10 relative">
        
        {/* ==========================================
            HEADER SECTIONS (Tanpa Tombol Back)
            ========================================== */}
        <div className="mb-12 relative z-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-3 mb-3">
             Pengaturan Akun
          </h1>
          <p className="text-slate-500 text-base font-medium max-w-xl leading-relaxed">
            Kelola profil pribadi, keamanan akses, serta preferensi operasional dan pengiriman Anda di satu tempat terpusat.
          </p>
        </div>

        {/* ==========================================
            MAIN GRID (SIDEBAR + DYNAMIC CONTENT)
            ========================================== */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
          
          {/* --- SIDEBAR NAVIGATION (GLASSMORPHISM STYLE) --- */}
          <div className="w-full lg:w-[30%] shrink-0 lg:sticky lg:top-28 space-y-6 z-20">
            <div className="glass-card rounded-[2.5rem] py-8 border border-white shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden relative">
              
              {/* Seksi 1: Personal & Operasional */}
              <div className="px-8 mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pribadi & Operasional</p>
              </div>
              <div className="flex flex-col space-y-1.5 px-4 relative">
                <SidebarButton icon={User} label="Profil & Keamanan" isActive={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
                <SidebarButton icon={Building} label="Akun Korporat (B2B)" isActive={activeTab === "business"} onClick={() => setActiveTab("business")} />
                <SidebarButton icon={Package} label="Preferensi Pesanan" isActive={activeTab === "orders"} onClick={() => setActiveTab("orders")} />
                <SidebarButton icon={Globe} label="Lokasi & Bahasa" isActive={activeTab === "location"} onClick={() => setActiveTab("location")} />
                <SidebarButton icon={Bell} label="Notifikasi Sistem" isActive={activeTab === "notifications"} onClick={() => setActiveTab("notifications")} />
              </div>

              {/* Seksi 2: Informasi Legal */}
              <div className="px-8 mb-4 mt-8 pt-6 border-t border-white/60">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Legal</p>
              </div>
              <div className="flex flex-col space-y-1.5 px-4">
                <SidebarButton icon={FileText} label="Syarat & Kebijakan Privasi" isActive={activeTab === "terms"} onClick={() => setActiveTab("terms")} />
              </div>

            </div>

            {/* --- BANNER KEAMANAN (3D EMERALD) --- */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2rem] p-6 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_10px_20px_rgba(16,185,129,0.2)] border border-emerald-400 hidden lg:flex items-start gap-4 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-white/30 transition-colors" />
               <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-[1rem] flex items-center justify-center shrink-0 border border-white/30 shadow-sm relative z-10">
                 <ShieldCheck className="w-6 h-6 text-white drop-shadow-sm" />
               </div>
               <div className="relative z-10">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1">Data Terenkripsi</h4>
                  <p className="text-[11px] font-medium text-emerald-50 leading-relaxed">Flash Global melindungi informasi privasi Anda menggunakan standar keamanan AES-256 tingkat enterprise.</p>
               </div>
            </div>
          </div>

          {/* --- DYNAMIC CONTENT AREA --- */}
          <div className="w-full lg:w-[70%] z-10">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab} 
                initial={{ opacity: 0, y: 15, scale: 0.98 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: -15, scale: 0.98 }} 
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                {activeTab === "profile" && <ProfileTab />}
                {activeTab === "business" && <BusinessTab />}
                {activeTab === "orders" && <OrdersTab />}
                {activeTab === "location" && <LocationLanguageTab />}
                {activeTab === "notifications" && <NotificationsTab />}
                {activeTab === "terms" && <TermsTab />} 
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}

// ==========================================
// KOMPONEN HELPER: TOMBOL SIDEBAR
// ==========================================
function SidebarButton({ icon: Icon, label, isActive, onClick }: SidebarButtonProps) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "relative flex items-center gap-3.5 px-5 py-3.5 rounded-[1.25rem] text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none z-10",
        isActive ? "text-[#7A171D]" : "text-slate-500 hover:text-slate-800"
      )}
    >
      {/* Animasi Gliding Block ala iOS / macOS */}
      {isActive && (
        <motion.div 
          layoutId="activeTabSettings" 
          className="absolute inset-0 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 z-0 rounded-[1.25rem]" 
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
      
      <Icon className={cn(
        "w-5 h-5 shrink-0 relative z-10 transition-colors duration-300", 
        isActive ? "text-[#7A171D]" : "text-slate-400 group-hover:text-slate-600"
      )} /> 
      
      <span className="relative z-10 tracking-wide">{label}</span>
    </button>
  );
}