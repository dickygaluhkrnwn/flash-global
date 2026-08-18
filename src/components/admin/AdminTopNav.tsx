"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, User, Settings, LogOut, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // =========================================================================
  // LOGIC AREA: REFACTORING SUB-DOMAIN ROUTING
  // =========================================================================
  
  // Helper cerdas untuk menyesuaikan URL (Hilangkan /admin jika di production sub-domain)
  const getAdminUrl = (path: string) => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('admin.flashglobalslogistik.com')) {
      return path; 
    }
    return `/admin${path}`; 
  };

  // 1. Logic Breadcrumbs: Diperbarui agar kebal terhadap Sub-Domain
  const generateBreadcrumbs = () => {
    // Normalisasi pathname: hilangkan kata '/admin' di awal agar konsisten antara localhost dan production
    const normalizedPath = pathname.startsWith("/admin") ? pathname.replace(/^\/admin/, "") : pathname;
    const paths = normalizedPath.split("/").filter((path) => path);

    // Jika beranda (kosong), tampilkan tulisan Dashboard
    if (paths.length === 0) {
      return (
        <div className="flex items-center">
          <span className="text-sm font-semibold text-[#7A171D] transition-colors">
            Dashboard
          </span>
        </div>
      );
    }

    return paths.map((path, index) => {
      const isLast = index === paths.length - 1;
      // Format text: hilangkan dash dan kapitalisasi huruf pertama
      const formattedPath = path.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      
      return (
        <div key={path} className="flex items-center">
          <span className={cn(
            "text-sm font-semibold transition-colors",
            isLast ? "text-[#7A171D]" : "text-slate-400"
          )}>
            {formattedPath}
          </span>
          {!isLast && <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />}
        </div>
      );
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // [BUG FIX]: Redirect menggunakan helper getAdminUrl agar tidak nyangkut di /admin/login saat production
      router.push(getAdminUrl("/login"));
    } catch (error) {
      console.error("Gagal logout:", error);
    }
  };

  // Generate inisial nama untuk Avatar
  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  // =========================================================================
  // UI AREA: TIDAK DISENTUH (TETAP MENGGUNAKAN APPLE GLASS GEN-Z)
  // =========================================================================
  return (
    <header className="w-full flex items-center justify-between mb-8 relative z-40">
      
      {/* KIRI: Breadcrumbs (Navigasi Jejak) */}
      <div className="flex items-center">
        <div className="flex items-center bg-white/60 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
          {generateBreadcrumbs()}
        </div>
      </div>

      {/* KANAN: Search, Notifikasi, Profile */}
      <div className="flex items-center gap-4">
        
        {/* Global Search Bar (Mac Style) */}
        <div className="relative group hidden md:block">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-[#7A171D] transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Cari order, resi, atau klien..." 
            className="w-64 lg:w-80 bg-white/60 backdrop-blur-md border border-slate-200 text-sm font-medium text-slate-900 rounded-xl py-2 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-[#7A171D]/20 focus:border-[#7A171D] transition-all duration-300 placeholder:text-slate-400 shadow-sm"
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              ⌘K
            </span>
          </div>
        </div>

        {/* Notification Bell dengan Dot Indicator */}
        <button className="relative p-2.5 bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl text-slate-500 hover:text-[#7A171D] hover:bg-white shadow-sm transition-all active:scale-95">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse" />
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 p-1.5 pr-3 bg-white/60 backdrop-blur-md border border-slate-200 rounded-xl hover:bg-white shadow-sm transition-all active:scale-95 outline-none focus:ring-2 focus:ring-[#7A171D]/20"
          >
            {/* Avatar Gen-Z (Gradient Background) */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#9A242B] to-[#7A171D] flex items-center justify-center text-white text-xs font-bold shadow-inner">
              {user?.displayName ? getInitials(user.displayName) : "AD"}
            </div>
            <div className="hidden lg:flex flex-col items-start">
              <span className="text-sm font-bold text-slate-800 leading-none">{user?.displayName || "Administrator"}</span>
              <span className="text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider mt-0.5">
                {user?.role?.replace("_", " ") || "Admin"}
              </span>
            </div>
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <>
              {/* Invisible overlay untuk menutup dropdown saat klik di luar */}
              <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
              
              <div className="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <p className="text-sm font-bold text-slate-900 truncate">{user?.displayName}</p>
                  <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{user?.email}</p>
                </div>
                
                <div className="p-2 space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
                    <User className="w-4 h-4" /> Profil Saya
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
                    <Settings className="w-4 h-4" /> Pengaturan Sistem
                  </button>
                </div>
                
                <div className="p-2 border-t border-slate-100">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Keluar Sesi
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
}