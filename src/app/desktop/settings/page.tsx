"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Building, Package, Globe, Bell, FileText, ChevronLeft, ShieldCheck
} from "lucide-react";
import Link from "next/link";
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
    <main className="min-h-screen bg-slate-50 py-12 lg:py-16 px-6 relative overflow-hidden font-sans pb-24">
      {/* Ornamen Background Premium */}
      <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-[0.03] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-[0.05] pointer-events-none" />

      <div className="max-w-[1200px] mx-auto z-10 relative">
        {/* Header */}
        <div className="mb-8 md:mb-10">
          <Link href="/dashboard" className="text-xs font-bold text-slate-500 hover:text-[#7A171D] transition-all flex items-center gap-2 mb-4 w-fit bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:shadow-md">
            <ChevronLeft className="w-4 h-4" /> Kembali ke Dasbor
          </Link>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
             Pengaturan Akun
          </h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Kelola profil pribadi, keamanan akses, dan preferensi operasional Anda.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
          
          {/* SIDEBAR NAVIGATION (SHOPEE/LALAMOVE STYLE) */}
          <div className="w-full lg:w-[28%] shrink-0 lg:sticky lg:top-28 space-y-6">
            <div className="bg-white rounded-[2rem] shadow-sm shadow-slate-200/50 py-6 border border-slate-200 overflow-hidden">
              
              <div className="px-6 mb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personal & Operasional</p>
              </div>
              <div className="flex flex-col space-y-1 px-3 relative">
                <SidebarButton icon={User} label="Profil & Keamanan" isActive={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
                <SidebarButton icon={Building} label="Akun Korporat (B2B)" isActive={activeTab === "business"} onClick={() => setActiveTab("business")} />
                <SidebarButton icon={Package} label="Preferensi Pesanan" isActive={activeTab === "orders"} onClick={() => setActiveTab("orders")} />
                <SidebarButton icon={Globe} label="Lokasi & Bahasa" isActive={activeTab === "location"} onClick={() => setActiveTab("location")} />
                <SidebarButton icon={Bell} label="Notifikasi Sistem" isActive={activeTab === "notifications"} onClick={() => setActiveTab("notifications")} />
              </div>

              <div className="px-6 mb-3 mt-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Legal</p>
              </div>
              <div className="flex flex-col space-y-1 px-3">
                <SidebarButton icon={FileText} label="Syarat & Kebijakan Privasi" isActive={activeTab === "terms"} onClick={() => setActiveTab("terms")} />
              </div>

            </div>

            {/* Banner Security */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-[1.5rem] p-5 flex items-start gap-3 shadow-sm hidden lg:flex">
               <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
               <div>
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wide">Data Terenkripsi</h4>
                  <p className="text-[10px] font-medium text-emerald-700 mt-1 leading-relaxed">Flash Global melindungi informasi privasi Anda menggunakan standar keamanan AES-256 tingkat enterprise.</p>
               </div>
            </div>
          </div>

          {/* DYNAMIC CONTENT AREA */}
          <div className="w-full lg:w-[72%]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab} 
                initial={{ opacity: 0, y: 10, scale: 0.98 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: -10, scale: 0.98 }} 
                transition={{ duration: 0.3, ease: "easeOut" }}
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

// Komponen Helper untuk Tombol Sidebar
function SidebarButton({ icon: Icon, label, isActive, onClick }: SidebarButtonProps) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none z-10",
        isActive ? "text-[#7A171D]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      {/* Animasi Gliding Block untuk Menu Aktif */}
      {isActive && (
        <motion.div 
          layoutId="activeTabSettings" 
          className="absolute inset-0 bg-[#7A171D]/10 z-0 border-l-4 border-[#7A171D] rounded-xl" 
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <Icon className={cn("w-5 h-5 shrink-0 relative z-10 transition-colors", isActive ? "text-[#7A171D]" : "text-slate-400 group-hover:text-slate-600")} /> 
      <span className="relative z-10">{label}</span>
    </button>
  );
}