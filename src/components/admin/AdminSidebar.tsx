"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  Truck, Coins, LogOut, Package, ShieldCheck, 
  LayoutDashboard, WalletCards, Users, Send, 
  Banknote, Ticket, LifeBuoy 
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  currentRole: string;
  pathname: string;
}

interface SidebarButtonProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  href: string;
  isExpanded: boolean;
}

const allowedRoles = ["superadmin", "admin_finance", "admin_operational", "admin_cs"];

export default function AdminSidebar({ currentRole, pathname }: AdminSidebarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin/login");
    } catch (error) {
      console.error("Gagal logout admin:", error);
    }
  };

  const getRoleBadgeLabel = (role: string) => {
    if (role === "superadmin") return "Super Admin";
    if (role === "admin_finance") return "Finance";
    if (role === "admin_operational") return "Operational";
    if (role === "admin_cs") return "Support";
    return "Secure Node";
  };

  if (!allowedRoles.includes(currentRole)) return null;

  return (
    <>
      {/* MOBILE OVERLAY (Mencegah klik di luar area saat terbuka di HP) */}
      {isExpanded && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" 
          onClick={() => setIsExpanded(false)} 
        />
      )}

      {/* SIDEBAR CONTAINER
        Menggunakan fixed position agar konten di kanannya tidak ikut terdorong saat mekar
      */}
      <aside 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={cn(
          "fixed top-0 left-0 h-screen bg-white border-r border-gray-100 shadow-glass shrink-0 py-6 flex flex-col justify-between transition-all duration-300 z-50 overflow-hidden",
          isExpanded ? "w-64 px-5 shadow-2xl" : "w-20 px-3 hidden md:flex" // Di mobile, sembunyikan jika tidak di-expand
        )}
      >
        <div className="space-y-8">
          {/* Header Brand */}
          <div className={`flex items-center ${isExpanded ? 'gap-3' : 'justify-center'} px-2 transition-all duration-300`}>
            <div className="w-10 h-10 bg-brand-maroon rounded-xl flex items-center justify-center shadow-md shadow-brand-maroon/20 shrink-0">
              <Package className="text-white w-5 h-5" />
            </div>
            <div className={cn("transition-all duration-300 overflow-hidden whitespace-nowrap", isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0")}>
              <h3 className="font-black text-sm text-gray-900 tracking-tight leading-none">Flash Control</h3>
              <span className="text-[10px] text-brand-gold font-bold flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3 h-3" /> {getRoleBadgeLabel(currentRole)}
              </span>
            </div>
          </div>

          {/* Menu Navigasi Modul Dinamis dengan Filter Role */}
          <div className="space-y-1 w-full">
            
            {isExpanded && <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2 mt-4 transition-opacity">Main</p>}
            <SidebarButton icon={LayoutDashboard} label="Dashboard" href="/admin" isActive={pathname === "/admin"} isExpanded={isExpanded} />

            {isExpanded && <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">User & Security</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational") && (
              <SidebarButton icon={Users} label="Manajemen Pengguna" href="/admin/users" isActive={pathname === "/admin/users"} isExpanded={isExpanded} />
            )}
            
            {(currentRole === "superadmin" || currentRole === "admin_cs") && (
              <SidebarButton icon={LifeBuoy} label="Keamanan & Dukungan" href="/admin/support" isActive={pathname === "/admin/support"} isExpanded={isExpanded} />
            )}

            {isExpanded && <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">Dispatch & Finance</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational") && (
              <SidebarButton icon={Send} label="Dispatch & Order" href="/admin/orders" isActive={pathname === "/admin/orders"} isExpanded={isExpanded} />
            )}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={Banknote} label="Keuangan & Tagihan" href="/admin/finance" isActive={pathname === "/admin/finance"} isExpanded={isExpanded} />
            )}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={WalletCards} label="Kas & Dompet Sopir" href="/admin/wallet" isActive={pathname === "/admin/wallet"} isExpanded={isExpanded} />
            )}
            
            {isExpanded && <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">Master Data</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational") && (
              <SidebarButton icon={Truck} label="Data Armada" href="/admin/vehicles" isActive={pathname === "/admin/vehicles"} isExpanded={isExpanded} />
            )}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={Coins} label="Konfigurasi Tarif" href="/admin/pricing" isActive={pathname === "/admin/pricing"} isExpanded={isExpanded} />
            )}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={Ticket} label="Promo & Voucher" href="/admin/promo" isActive={pathname === "/admin/promo"} isExpanded={isExpanded} />
            )}
          </div>
        </div>

        {/* Tombol Logout Panel */}
        <div className="pt-4 border-t border-gray-100 mt-6 md:mt-0 w-full px-2">
          <button 
            onClick={handleAdminLogout}
            className={`w-full flex items-center ${isExpanded ? 'px-4' : 'justify-center'} py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all text-left overflow-hidden`}
            title="Keluar dari Engine"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={cn("transition-all duration-300 ml-3 whitespace-nowrap", isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>Keluar Engine</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TRIGGER BUTTON (MUNcul di HP) */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-brand-maroon text-white p-4 rounded-full shadow-lg shadow-brand-maroon/30"
      >
        <Package className="w-6 h-6" />
      </button>
    </>
  );
}

function SidebarButton({ icon: Icon, label, isActive, href, isExpanded }: SidebarButtonProps) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center py-3 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group",
        isExpanded ? "px-4" : "justify-center px-0",
        isActive 
          ? "bg-brand-maroon text-white shadow-md shadow-brand-maroon/20" 
          : "text-gray-500 hover:bg-gray-50 hover:text-brand-maroon"
      )}
      title={label} // Agar label tetap bisa dibaca saat hover icon (ketika collapsed)
    >
      <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-white" : "text-gray-400 group-hover:text-brand-maroon")} /> 
      <span className={cn("transition-all duration-300 whitespace-nowrap", isExpanded ? "ml-3 opacity-100 w-auto" : "opacity-0 w-0 hidden")}>{label}</span>
    </Link>
  );
}