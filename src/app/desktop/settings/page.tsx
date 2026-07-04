"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Building, Package, Globe, Bell, FileText
} from "lucide-react";
import Link from "next/link";

// --- IMPORT KOMPONEN TABS ---
import ProfileTab from "./tabs/ProfileTab";
import BusinessTab from "./tabs/BusinessTab";
import OrdersTab from "./tabs/OrdersTab";
import LocationLanguageTab from "./tabs/LocationLanguageTab";
import NotificationsTab from "./tabs/NotificationsTab";
import TermsTab from "./tabs/TermsTab"; // <-- IMPORT TAB TERAKHIR KITA

export default function DesktopSettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-[#7A171D] rounded-full blur-[150px] opacity-5 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#C5A059] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      <div className="max-w-6xl mx-auto z-10 relative">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-[#7A171D] transition-colors font-semibold flex items-center gap-2 mb-4 w-fit">
            &larr; Kembali ke Dasbor
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900">Pengaturan</h1>
          <p className="text-gray-500 mt-1 text-sm">Kelola profil, keamanan, dan preferensi akun Anda.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LALAMOVE STYLE SIDEBAR */}
          <div className="w-full lg:w-1/4 shrink-0">
            <div className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 py-6 border border-gray-100 sticky top-24">
              
              <div className="px-6 mb-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account</p>
              </div>
              <div className="flex flex-col space-y-1 px-3">
                <SidebarButton icon={User} label="Profile" isActive={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
                <SidebarButton icon={Package} label="Orders" isActive={activeTab === "orders"} onClick={() => setActiveTab("orders")} />
                <SidebarButton icon={Globe} label="Location & Language" isActive={activeTab === "location"} onClick={() => setActiveTab("location")} />
                <SidebarButton icon={Bell} label="Notifications" isActive={activeTab === "notifications"} onClick={() => setActiveTab("notifications")} />
                <SidebarButton icon={Building} label="Business Profile" isActive={activeTab === "business"} onClick={() => setActiveTab("business")} />
              </div>

              <div className="px-6 mb-3 mt-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">About</p>
              </div>
              <div className="flex flex-col space-y-1 px-3">
                <SidebarButton icon={FileText} label="Terms and Policies" isActive={activeTab === "terms"} onClick={() => setActiveTab("terms")} />
              </div>

            </div>
          </div>

          {/* DYNAMIC CONTENT AREA */}
          <div className="w-full lg:w-3/4">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                {activeTab === "profile" && <ProfileTab />}
                {activeTab === "business" && <BusinessTab />}
                {activeTab === "orders" && <OrdersTab />}
                {activeTab === "location" && <LocationLanguageTab />}
                {activeTab === "notifications" && <NotificationsTab />}
                {/* RENDER TERMS TAB DI SINI */}
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
function SidebarButton({ icon: Icon, label, isActive, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all w-full text-left ${isActive ? "bg-gray-100 text-[#7A171D]" : "text-gray-600 hover:bg-gray-50"}`}>
      <Icon className="w-5 h-5 shrink-0" /> {label}
    </button>
  );
}