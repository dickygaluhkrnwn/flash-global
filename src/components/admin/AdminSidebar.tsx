"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Truck, Coins, LogOut, Package, ShieldCheck, 
  LayoutDashboard, WalletCards, Users, Send, 
  Banknote, Ticket, LifeBuoy, ChevronDown, 
  User, Building2, UserCog, CreditCard, Globe, Map,
  Receipt, FileSpreadsheet, MessageSquare, FileWarning, History
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

// REVISI ROLE: Sesuaikan dengan tipe UserRole di useAuthStore (admin_ops diganti dari admin_operational)
const allowedRoles = ["superadmin", "admin_finance", "admin_ops", "admin_cs"];

export default function AdminSidebar({ currentRole, pathname }: AdminSidebarProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // State khusus untuk membuka/menutup sub-menu Manajemen Pengguna
  const isUsersRouteActive = pathname.startsWith("/admin/users");
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(isUsersRouteActive);

  // State khusus untuk membuka/menutup sub-menu Dispatch & Orders
  const isOrdersRouteActive = pathname.startsWith("/admin/orders");
  const [isOrdersMenuOpen, setIsOrdersMenuOpen] = useState(isOrdersRouteActive);

  // State khusus untuk membuka/menutup sub-menu Keuangan & Finance
  const isFinanceRouteActive = pathname.startsWith("/admin/finance");
  const [isFinanceMenuOpen, setIsFinanceMenuOpen] = useState(isFinanceRouteActive);

  // State khusus untuk membuka/menutup sub-menu Pusat Bantuan (BARU)
  const isSupportRouteActive = pathname.startsWith("/admin/support");
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(isSupportRouteActive);

  // Otomatis buka sub-menu jika sedang berada di dalam route tersebut
  useEffect(() => {
    if (isUsersRouteActive && isExpanded) setIsUsersMenuOpen(true);
    if (isOrdersRouteActive && isExpanded) setIsOrdersMenuOpen(true);
    if (isFinanceRouteActive && isExpanded) setIsFinanceMenuOpen(true);
    if (isSupportRouteActive && isExpanded) setIsSupportMenuOpen(true);
  }, [isUsersRouteActive, isOrdersRouteActive, isFinanceRouteActive, isSupportRouteActive, isExpanded]);

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
    if (role === "admin_ops") return "Operational";
    if (role === "admin_cs") return "Support";
    return "Secure Node";
  };

  if (!allowedRoles.includes(currentRole)) return null;

  return (
    <>
      {/* MOBILE OVERLAY */}
      {isExpanded && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsExpanded(false)} 
        />
      )}

      {/* SIDEBAR CONTAINER (Light Mode Premium) */}
      <aside 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => {
          setIsExpanded(false);
          // Tutup sub-menu jika tidak sedang di halaman itu saat mouse keluar
          if (!isUsersRouteActive) setIsUsersMenuOpen(false); 
          if (!isOrdersRouteActive) setIsOrdersMenuOpen(false);
          if (!isFinanceRouteActive) setIsFinanceMenuOpen(false);
          if (!isSupportRouteActive) setIsSupportMenuOpen(false);
        }}
        className={cn(
          "fixed top-0 left-0 h-screen bg-white border-r border-slate-200 shadow-sm shrink-0 py-6 flex flex-col justify-between transition-all duration-300 z-50 overflow-y-auto overflow-x-hidden no-scrollbar",
          isExpanded ? "w-72 px-5 shadow-2xl shadow-slate-200/50" : "w-20 px-3 hidden md:flex" 
        )}
      >
        <div className="space-y-8">
          
          {/* Header Brand */}
          <div className={cn("flex items-center px-2 transition-all duration-300", isExpanded ? "gap-4" : "justify-center")}>
            <div className="w-12 h-12 bg-gradient-to-br from-[#7A171D] to-[#5A0E13] rounded-xl flex items-center justify-center shadow-lg shadow-[#7A171D]/20 shrink-0 border border-red-500/10">
              <Package className="text-[#C5A059] w-6 h-6" />
            </div>
            <div className={cn("transition-all duration-300 overflow-hidden whitespace-nowrap", isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0")}>
              <h3 className="font-black text-lg text-slate-900 tracking-tight leading-none">Central Engine</h3>
              <span className="text-[11px] text-[#7A171D] font-bold flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-red-50 rounded-full w-max border border-red-100">
                <ShieldCheck className="w-3 h-3" /> {getRoleBadgeLabel(currentRole)}
              </span>
            </div>
          </div>

          {/* Menu Navigasi Modul Dinamis */}
          <div className="space-y-1.5 w-full">
            
            {isExpanded && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-4 transition-opacity">Main Dashboard</p>}
            <SidebarButton icon={LayoutDashboard} label="Dashboard" href="/admin" isActive={pathname === "/admin"} isExpanded={isExpanded} />

            {isExpanded && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">User & Security</p>}
            
            {/* MENU MANAJEMEN PENGGUNA (ACCORDION DENGAN SUB-MENU) */}
            {(currentRole === "superadmin" || currentRole === "admin_ops" || currentRole === "admin_cs") && (
              <div className="flex flex-col">
                <button 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsUsersMenuOpen(!isUsersMenuOpen);
                  }}
                  className={cn(
                    "flex items-center py-3 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
                    isExpanded ? "px-4" : "justify-center px-0",
                    isUsersRouteActive 
                      ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
                  )}
                  title="Manajemen Pengguna"
                >
                  <Users className={cn("w-5 h-5 shrink-0 transition-colors", isUsersRouteActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
                  <span className={cn("transition-all duration-300 whitespace-nowrap flex-1", isExpanded ? "ml-3 opacity-100" : "opacity-0 w-0 hidden")}>Manajemen Pengguna</span>
                  {isExpanded && (
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isUsersMenuOpen ? "rotate-180" : "", isUsersRouteActive ? "text-white/70" : "text-slate-400")} />
                  )}
                </button>

                {/* Sub-Menu Items */}
                <div 
                  className={cn(
                    "overflow-hidden transition-all duration-300 flex flex-col gap-1",
                    isExpanded && isUsersMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <SubMenuButton href="/admin/users/b2c" label="Klien Personal (B2C)" icon={User} isActive={pathname.includes("/users/b2c")} />
                  <SubMenuButton href="/admin/users/b2b" label="Klien Korporat (B2B)" icon={Building2} isActive={pathname.includes("/users/b2b")} />
                  <SubMenuButton href="/admin/users/drivers" label="Mitra Sopir" icon={Truck} isActive={pathname.includes("/users/drivers")} />
                  {currentRole === "superadmin" && (
                    <SubMenuButton href="/admin/users/staff" label="Manajemen Staf" icon={UserCog} isActive={pathname.includes("/users/staff")} />
                  )}
                </div>
              </div>
            )}
            
            {/* MENU PUSAT BANTUAN & AUDIT (ACCORDION BARU) */}
            {(currentRole === "superadmin" || currentRole === "admin_cs") && (
              <div className="flex flex-col">
                <button 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsSupportMenuOpen(!isSupportMenuOpen);
                  }}
                  className={cn(
                    "flex items-center py-3 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
                    isExpanded ? "px-4" : "justify-center px-0",
                    isSupportRouteActive 
                      ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
                  )}
                  title="Pusat Bantuan & Audit"
                >
                  <LifeBuoy className={cn("w-5 h-5 shrink-0 transition-colors", isSupportRouteActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
                  <span className={cn("transition-all duration-300 whitespace-nowrap flex-1", isExpanded ? "ml-3 opacity-100" : "opacity-0 w-0 hidden")}>Pusat Bantuan</span>
                  {isExpanded && (
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isSupportMenuOpen ? "rotate-180" : "", isSupportRouteActive ? "text-white/70" : "text-slate-400")} />
                  )}
                </button>

                {/* Sub-Menu Items */}
                <div 
                  className={cn(
                    "overflow-hidden transition-all duration-300 flex flex-col gap-1",
                    isExpanded && isSupportMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <SubMenuButton href="/admin/support/tickets" label="Tiket Bantuan CS" icon={MessageSquare} isActive={pathname.includes("/support/tickets")} />
                  <SubMenuButton href="/admin/support/claims" label="Klaim Asuransi" icon={FileWarning} isActive={pathname.includes("/support/claims")} />
                  {currentRole === "superadmin" && (
                    <SubMenuButton href="/admin/support/audit" label="Audit Trail" icon={History} isActive={pathname.includes("/support/audit")} />
                  )}
                </div>
              </div>
            )}

            {isExpanded && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">Dispatch & Finance</p>}
            
            {/* MENU DISPATCH & ORDER (ACCORDION DENGAN SUB-MENU) */}
            {(currentRole === "superadmin" || currentRole === "admin_ops") && (
              <div className="flex flex-col">
                <button 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsOrdersMenuOpen(!isOrdersMenuOpen);
                  }}
                  className={cn(
                    "flex items-center py-3 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
                    isExpanded ? "px-4" : "justify-center px-0",
                    isOrdersRouteActive 
                      ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
                  )}
                  title="Dispatch & Order"
                >
                  <Send className={cn("w-5 h-5 shrink-0 transition-colors", isOrdersRouteActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
                  <span className={cn("transition-all duration-300 whitespace-nowrap flex-1", isExpanded ? "ml-3 opacity-100" : "opacity-0 w-0 hidden")}>Dispatch & Orders</span>
                  {isExpanded && (
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isOrdersMenuOpen ? "rotate-180" : "", isOrdersRouteActive ? "text-white/70" : "text-slate-400")} />
                  )}
                </button>

                {/* Sub-Menu Items */}
                <div 
                  className={cn(
                    "overflow-hidden transition-all duration-300 flex flex-col gap-1",
                    isExpanded && isOrdersMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <SubMenuButton href="/admin/orders/domestic" label="Order Domestik" icon={Package} isActive={pathname.includes("/orders/domestic")} />
                  <SubMenuButton href="/admin/orders/global" label="Global Forwarding" icon={Globe} isActive={pathname.includes("/orders/global")} />
                  <SubMenuButton href="/admin/orders/radar" label="Radar Satelit" icon={Map} isActive={pathname.includes("/orders/radar")} />
                </div>
              </div>
            )}

            {/* MENU KEUANGAN & TAGIHAN (FINANCE) */}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <div className="flex flex-col">
                <button 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsFinanceMenuOpen(!isFinanceMenuOpen);
                  }}
                  className={cn(
                    "flex items-center py-3 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
                    isExpanded ? "px-4" : "justify-center px-0",
                    isFinanceRouteActive 
                      ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
                  )}
                  title="Keuangan & Tagihan"
                >
                  <Banknote className={cn("w-5 h-5 shrink-0 transition-colors", isFinanceRouteActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
                  <span className={cn("transition-all duration-300 whitespace-nowrap flex-1", isExpanded ? "ml-3 opacity-100" : "opacity-0 w-0 hidden")}>Keuangan & Tagihan</span>
                  {isExpanded && (
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isFinanceMenuOpen ? "rotate-180" : "", isFinanceRouteActive ? "text-white/70" : "text-slate-400")} />
                  )}
                </button>

                {/* Sub-Menu Items */}
                <div 
                  className={cn(
                    "overflow-hidden transition-all duration-300 flex flex-col gap-1",
                    isExpanded && isFinanceMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <SubMenuButton href="/admin/finance/verification" label="Verifikasi Manual" icon={Receipt} isActive={pathname.includes("/finance/verification")} />
                  <SubMenuButton href="/admin/finance/receivables" label="Piutang B2B (Net)" icon={Building2} isActive={pathname.includes("/finance/receivables")} />
                  <SubMenuButton href="/admin/finance/reports" label="Laporan Pembukuan" icon={FileSpreadsheet} isActive={pathname.includes("/finance/reports")} />
                </div>
              </div>
            )}

            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={WalletCards} label="Kas & Dompet Sopir" href="/admin/wallet" isActive={pathname === "/admin/wallet"} isExpanded={isExpanded} />
            )}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={CreditCard} label="Metode Pembayaran" href="/admin/payments" isActive={pathname === "/admin/payments"} isExpanded={isExpanded} />
            )}
            
            {isExpanded && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 mt-6 transition-opacity">Master Data</p>}
            {(currentRole === "superadmin" || currentRole === "admin_ops") && (
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
        <div className="pt-4 border-t border-slate-100 mt-8 w-full px-2">
          <button 
            onClick={handleAdminLogout}
            className={`w-full flex items-center ${isExpanded ? 'px-4' : 'justify-center'} py-3.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-all text-left overflow-hidden group outline-none`}
            title="Keluar dari Engine"
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
            <span className={cn("transition-all duration-300 ml-3 whitespace-nowrap", isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 hidden")}>Keluar Session</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TRIGGER BUTTON */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="md:hidden fixed bottom-6 right-6 z-50 bg-[#7A171D] text-white p-4 rounded-full shadow-xl shadow-[#7A171D]/40 active:scale-95 transition-transform"
      >
        <Package className="w-6 h-6" />
      </button>
    </>
  );
}

// Sub-Komponen Sidebar Menu Utama
function SidebarButton({ icon: Icon, label, isActive, href, isExpanded }: SidebarButtonProps) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center py-3.5 rounded-xl text-sm font-bold transition-all w-full text-left overflow-hidden group outline-none",
        isExpanded ? "px-4" : "justify-center px-0",
        isActive 
          ? "bg-[#7A171D] text-white shadow-md shadow-[#7A171D]/20" 
          : "text-slate-600 hover:bg-slate-50 hover:text-[#7A171D]"
      )}
      title={label}
    >
      <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-[#7A171D]")} /> 
      <span className={cn("transition-all duration-300 whitespace-nowrap", isExpanded ? "ml-3 opacity-100 w-auto" : "opacity-0 w-0 hidden")}>{label}</span>
    </Link>
  );
}

// Sub-Komponen Anak Menu (Sub-Menu)
function SubMenuButton({ href, label, isActive, icon: Icon }: { href: string; label: string; isActive: boolean; icon: React.ElementType }) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 py-2.5 px-4 ml-4 rounded-lg text-xs font-bold transition-all outline-none border border-transparent",
        isActive 
          ? "bg-red-50 text-[#7A171D] border-red-100" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      )}
    >
      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#7A171D]" : "text-slate-400")} />
      {label}
    </Link>
  );
}