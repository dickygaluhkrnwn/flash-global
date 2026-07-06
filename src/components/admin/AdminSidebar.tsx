"use client";

import Link from "next/link";
import { 
  Truck, Coins, LogOut, Package, ShieldCheck, 
  LayoutDashboard, WalletCards, Users, Send, 
  Banknote, Ticket, LifeBuoy 
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

interface AdminSidebarProps {
  currentRole: string;
  pathname: string;
}

interface SidebarButtonProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  href: string;
}

const allowedRoles = ["superadmin", "admin_finance", "admin_operational", "admin_cs"];

export default function AdminSidebar({ currentRole, pathname }: AdminSidebarProps) {
  const router = useRouter();

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
    if (role === "admin_finance") return "Finance Admin";
    if (role === "admin_operational") return "Ops Admin";
    if (role === "admin_cs") return "CS Admin";
    return "Secure Node";
  };

  if (!allowedRoles.includes(currentRole)) return null;

  return (
    <aside className="w-full md:w-64 bg-slate-950 border-b md:border-b-0 md:border-r border-slate-800 shrink-0 p-6 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-8">
        {/* Header Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-[#7A171D] to-[#5A0E13] rounded-xl flex items-center justify-center border border-red-500/20">
            <Package className="text-[#C5A059] w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm text-white tracking-tight leading-none">Core Engine</h3>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3 h-3" /> {getRoleBadgeLabel(currentRole)}
            </span>
          </div>
        </div>

        {/* Menu Navigasi Modul Dinamis dengan Filter Role */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Main</p>
          <SidebarButton icon={LayoutDashboard} label="Dashboard" href="/admin" isActive={pathname === "/admin"} />

          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 pt-4">User & Security</p>
          {(currentRole === "superadmin" || currentRole === "admin_operational") && (
            <SidebarButton icon={Users} label="Manajemen Pengguna" href="/admin/users" isActive={pathname === "/admin/users"} />
          )}
          
          {/* Menu Support & Audit (BARU) */}
          {(currentRole === "superadmin" || currentRole === "admin_cs") && (
            <SidebarButton icon={LifeBuoy} label="Keamanan & Dukungan" href="/admin/support" isActive={pathname === "/admin/support"} />
          )}

          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 pt-4">Dispatch & Finance</p>
          {(currentRole === "superadmin" || currentRole === "admin_operational") && (
            <SidebarButton icon={Send} label="Dispatch & Order" href="/admin/orders" isActive={pathname === "/admin/orders"} />
          )}
          {(currentRole === "superadmin" || currentRole === "admin_finance") && (
            <SidebarButton icon={Banknote} label="Keuangan & Tagihan" href="/admin/finance" isActive={pathname === "/admin/finance"} />
          )}
          {(currentRole === "superadmin" || currentRole === "admin_finance") && (
            <SidebarButton icon={WalletCards} label="Kas & Dompet Sopir" href="/admin/wallet" isActive={pathname === "/admin/wallet"} />
          )}
          
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 pt-4">Master Data</p>
          {(currentRole === "superadmin" || currentRole === "admin_operational") && (
            <SidebarButton icon={Truck} label="Data Armada" href="/admin/vehicles" isActive={pathname === "/admin/vehicles"} />
          )}
          {(currentRole === "superadmin" || currentRole === "admin_finance") && (
            <SidebarButton icon={Coins} label="Konfigurasi Tarif" href="/admin/pricing" isActive={pathname === "/admin/pricing"} />
          )}
          {(currentRole === "superadmin" || currentRole === "admin_finance") && (
            <SidebarButton icon={Ticket} label="Promo & Voucher" href="/admin/promo" isActive={pathname === "/admin/promo"} />
          )}
        </div>
      </div>

      {/* Tombol Logout Panel */}
      <div className="pt-4 border-t border-slate-800 mt-6 md:mt-0">
        <button 
          onClick={handleAdminLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400 hover:bg-red-950/20 transition-all text-left"
        >
          <LogOut className="w-5 h-5 shrink-0" /> Keluar Engine
        </button>
      </div>
    </aside>
  );
}

function SidebarButton({ icon: Icon, label, isActive, href }: SidebarButtonProps) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all w-full text-left ${
        isActive 
          ? "bg-gradient-to-r from-[#7A171D]/20 to-transparent text-white border-l-4 border-[#7A171D] pl-3" 
          : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-[#7A171D]" : "text-slate-400"}`} /> {label}
    </Link>
  );
}