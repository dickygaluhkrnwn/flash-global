"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { 
  Truck, Coins, Package, ShieldCheck, 
  LayoutDashboard, WalletCards, Users, Send, 
  Banknote, Ticket, LifeBuoy, ChevronDown, 
  User, Building2, UserCog, CreditCard, Globe, Map,
  MessageSquare, FileWarning, History, Users2,
  Receipt, FileSpreadsheet, UserSquare2
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// --- IMPORT GLOBAL TYPES ---
import { Role } from "@/types/user";

interface AdminSidebarProps {
  currentRole: Role | string;
  pathname: string;
}

interface SidebarButtonProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  href: string;
  isExpanded: boolean;
}

interface MenuDropdownButtonProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

const allowedRoles: Role[] = ["superadmin", "admin_finance", "admin_operational", "staff"];

export default function AdminSidebar({ currentRole, pathname }: AdminSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Deteksi rute aktif
  const isUsersRouteActive = pathname.startsWith("/admin/users/b2");
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(isUsersRouteActive);

  const isFleetRouteActive = pathname.startsWith("/admin/users/drivers");
  const [isFleetMenuOpen, setIsFleetMenuOpen] = useState(isFleetRouteActive);

  const isOrdersRouteActive = pathname.startsWith("/admin/orders");
  const [isOrdersMenuOpen, setIsOrdersMenuOpen] = useState(isOrdersRouteActive);

  const isFinanceRouteActive = pathname.startsWith("/admin/finance");
  const [isFinanceMenuOpen, setIsFinanceMenuOpen] = useState(isFinanceRouteActive);

  // 🚀 DETEKSI RUTE WALLET BARU
  const isWalletRouteActive = pathname.startsWith("/admin/wallet");
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(isWalletRouteActive);

  const isSupportRouteActive = pathname.startsWith("/admin/support");
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(isSupportRouteActive);

  // Auto-expand menu jika sedang aktif
  useEffect(() => {
    if (isUsersRouteActive && isExpanded) setIsUsersMenuOpen(true);
    if (isFleetRouteActive && isExpanded) setIsFleetMenuOpen(true);
    if (isOrdersRouteActive && isExpanded) setIsOrdersMenuOpen(true);
    if (isFinanceRouteActive && isExpanded) setIsFinanceMenuOpen(true);
    if (isWalletRouteActive && isExpanded) setIsWalletMenuOpen(true); // Auto expand wallet
    if (isSupportRouteActive && isExpanded) setIsSupportMenuOpen(true);
  }, [isUsersRouteActive, isFleetRouteActive, isOrdersRouteActive, isFinanceRouteActive, isWalletRouteActive, isSupportRouteActive, isExpanded]);

  if (!allowedRoles.includes(currentRole as Role)) return null;

  return (
    <>
      {/* Overlay untuk mobile */}
      {isExpanded && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsExpanded(false)} 
        />
      )}

      {/* FLOATING SIDEBAR DESKTOP (iPHONE GLASS STYLE) */}
      <aside 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => {
          setIsExpanded(false);
          if (!isUsersRouteActive) setIsUsersMenuOpen(false); 
          if (!isFleetRouteActive) setIsFleetMenuOpen(false);
          if (!isOrdersRouteActive) setIsOrdersMenuOpen(false);
          if (!isFinanceRouteActive) setIsFinanceMenuOpen(false);
          if (!isWalletRouteActive) setIsWalletMenuOpen(false); // Tutup wallet jika bukan di rute itu
          if (!isSupportRouteActive) setIsSupportMenuOpen(false);
        }}
        className={cn(
          "fixed top-4 left-4 h-[calc(100vh-32px)] shrink-0 py-6 flex flex-col transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] z-50 overflow-y-auto overflow-x-hidden admin-scrollbar rounded-[2rem]",
          // ✨ iPHONE GLASSMORPHISM MAGIC ✨
          "bg-white/40 backdrop-blur-[40px] saturate-[180%] border border-white/60",
          isExpanded ? "w-72 px-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]" : "w-[84px] px-3 hidden md:flex shadow-[0_4px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.05)]" 
        )}
      >
        <div className="space-y-6 flex-1">
          
          {/* Header Brand (Super Clean) */}
          <div className={cn("flex flex-col px-2 transition-all duration-300", isExpanded ? "items-start" : "items-center")}>
            <div className={cn("relative transition-all duration-300 ease-in-out", isExpanded ? "w-[160px] h-[35px]" : "w-[40px] h-[40px]")}>
              <Image 
                src="/logo.png" 
                alt="Flash Globals" 
                fill
                priority
                className={cn("object-contain transition-all duration-300", isExpanded ? "object-left" : "object-left overflow-hidden object-cover rounded-xl")}
              />
            </div>
          </div>

          <div className="space-y-1.5 w-full mt-4">
            
            {isExpanded && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-4 mb-2 mt-4 transition-opacity">Main Board</p>}
            <SidebarButton icon={LayoutDashboard} label="Dashboard" href="/admin" isActive={pathname === "/admin"} isExpanded={isExpanded} />

            {/* ==================================================== */}
            {/* KATEGORI 1: CUSTOMER & SECURITY */}
            {/* ==================================================== */}
            {isExpanded && <p className="text-[10px] font-bold text-slate-400/80 uppercase tracking-[0.2em] px-4 mb-2 mt-6 transition-opacity">Clients & Team</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational" || currentRole === "staff") && (
              <div className="flex flex-col">
                <MenuDropdownButton 
                  icon={Users} 
                  label="Data Pelanggan" 
                  isActive={isUsersRouteActive} 
                  isOpen={isUsersMenuOpen} 
                  isExpanded={isExpanded} 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsUsersMenuOpen(!isUsersMenuOpen);
                  }} 
                />
                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isUsersMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  <SubMenuButton href="/admin/users/b2c" label="Personal (B2C)" isActive={pathname.includes("/users/b2c")} />
                  <SubMenuButton href="/admin/users/b2b" label="Korporat (B2B)" isActive={pathname.includes("/users/b2b")} />
                  {currentRole === "superadmin" && (
                    <SubMenuButton href="/admin/users/staff" label="Manajemen Staf" isActive={pathname.includes("/users/staff")} />
                  )}
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* KATEGORI 2: FLEET & DRIVER MANAGEMENT */}
            {/* ==================================================== */}
            {isExpanded && <p className="text-[10px] font-bold text-slate-400/80 uppercase tracking-[0.2em] px-4 mb-2 mt-6 transition-opacity">Fleet Network</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational") && (
              <div className="flex flex-col">
                <MenuDropdownButton 
                  icon={Users2} 
                  label="Mitra Pengemudi" 
                  isActive={isFleetRouteActive} 
                  isOpen={isFleetMenuOpen} 
                  isExpanded={isExpanded} 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsFleetMenuOpen(!isFleetMenuOpen);
                  }} 
                />
                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isFleetMenuOpen ? "max-h-96 mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  <SubMenuButton href="/admin/users/drivers" label="Pusat Verifikasi" isActive={pathname === "/admin/users/drivers"} />
                  <SubMenuButton href="/admin/users/drivers/individual" label="Mitra Individu" isActive={pathname.includes("/users/drivers/individual")} />
                  <SubMenuButton href="/admin/users/drivers/vendor" label="Vendor (PT/CV)" isActive={pathname.includes("/users/drivers/vendor")} />
                  <SubMenuButton href="/admin/users/drivers/fleet-drivers" label="Sopir Vendor" isActive={pathname.includes("/users/drivers/fleet-drivers")} />
                  <SubMenuButton href="/admin/users/drivers/fleet-vehicles" label="Armada Truk" isActive={pathname.includes("/users/drivers/fleet-vehicles")} />
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* SISA MENU (DISPATCH, FINANCE, WALLET, DLL) */}
            {/* ==================================================== */}
            {isExpanded && <p className="text-[10px] font-bold text-slate-400/80 uppercase tracking-[0.2em] px-4 mb-2 mt-6 transition-opacity">Operations</p>}
            
            {(currentRole === "superadmin" || currentRole === "admin_operational") && (
              <div className="flex flex-col">
                <MenuDropdownButton 
                  icon={Send} 
                  label="Dispatch & Orders" 
                  isActive={isOrdersRouteActive} 
                  isOpen={isOrdersMenuOpen} 
                  isExpanded={isExpanded} 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsOrdersMenuOpen(!isOrdersMenuOpen);
                  }} 
                />
                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isOrdersMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  <SubMenuButton href="/admin/orders/domestic" label="Order Domestik" isActive={pathname.includes("/orders/domestic")} />
                  <SubMenuButton href="/admin/orders/global" label="Global Forwarding" isActive={pathname.includes("/orders/global")} />
                  <SubMenuButton href="/admin/orders/radar" label="Radar Satelit" isActive={pathname.includes("/orders/radar")} />
                </div>
              </div>
            )}

            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <div className="flex flex-col">
                <MenuDropdownButton 
                  icon={Banknote} 
                  label="Finance & Billing" 
                  isActive={isFinanceRouteActive} 
                  isOpen={isFinanceMenuOpen} 
                  isExpanded={isExpanded} 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsFinanceMenuOpen(!isFinanceMenuOpen);
                  }} 
                />
                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isFinanceMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  <SubMenuButton href="/admin/finance/verification" label="Verifikasi Manual" isActive={pathname.includes("/finance/verification")} />
                  <SubMenuButton href="/admin/finance/receivables" label="Piutang B2B (Net)" isActive={pathname.includes("/finance/receivables")} />
                  <SubMenuButton href="/admin/finance/reports" label="Laporan Pembukuan" isActive={pathname.includes("/finance/reports")} />
                </div>
              </div>
            )}

            {/* 🚀 DROPDOWN WALLET BARU 🚀 */}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <div className="flex flex-col">
                <MenuDropdownButton 
                  icon={WalletCards} 
                  label="Manajemen Kas & E-Wallet" 
                  isActive={isWalletRouteActive} 
                  isOpen={isWalletMenuOpen} 
                  isExpanded={isExpanded} 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsWalletMenuOpen(!isWalletMenuOpen);
                  }} 
                />
                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isWalletMenuOpen ? "max-h-[300px] mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  {/* Exact match untuk Dashboard utama */}
                  <SubMenuButton href="/admin/wallet" label="Pusat Kas (Hub)" isActive={pathname === "/admin/wallet"} />
                  <SubMenuButton href="/admin/wallet/drivers" label="Buku Kas Mitra" isActive={pathname.includes("/wallet/drivers")} />
                  <SubMenuButton href="/admin/wallet/clients" label="Deposit Korporat" isActive={pathname.includes("/wallet/clients")} />
                  <SubMenuButton href="/admin/wallet/topups" label="Validasi Top-Up" isActive={pathname.includes("/wallet/topups")} />
                  <SubMenuButton href="/admin/wallet/withdrawals" label="Pencairan Dana (WD)" isActive={pathname.includes("/wallet/withdrawals")} />
                </div>
              </div>
            )}

            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={CreditCard} label="Payment Methods" href="/admin/payments" isActive={pathname === "/admin/payments"} isExpanded={isExpanded} />
            )}
            
            {isExpanded && <p className="text-[10px] font-bold text-slate-400/80 uppercase tracking-[0.2em] px-4 mb-2 mt-6 transition-opacity">System Config</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational") && (
              <SidebarButton icon={Truck} label="Data Armada" href="/admin/vehicles" isActive={pathname === "/admin/vehicles"} isExpanded={isExpanded} />
            )}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={Coins} label="Pricing Rules" href="/admin/pricing" isActive={pathname === "/admin/pricing"} isExpanded={isExpanded} />
            )}
            {(currentRole === "superadmin" || currentRole === "admin_finance") && (
              <SidebarButton icon={Ticket} label="Promo & Voucher" href="/admin/promo" isActive={pathname === "/admin/promo"} isExpanded={isExpanded} />
            )}

            {isExpanded && <p className="text-[10px] font-bold text-slate-400/80 uppercase tracking-[0.2em] px-4 mb-2 mt-6 transition-opacity">Support & Logs</p>}
            {(currentRole === "superadmin" || currentRole === "admin_operational" || currentRole === "staff") && (
              <div className="flex flex-col">
                <MenuDropdownButton 
                  icon={LifeBuoy} 
                  label="Pusat Bantuan" 
                  isActive={isSupportRouteActive} 
                  isOpen={isSupportMenuOpen} 
                  isExpanded={isExpanded} 
                  onClick={() => {
                    if (!isExpanded) setIsExpanded(true);
                    setIsSupportMenuOpen(!isSupportMenuOpen);
                  }} 
                />
                <div className={cn("overflow-hidden transition-all duration-300 flex flex-col gap-1", isExpanded && isSupportMenuOpen ? "max-h-60 mt-1.5 opacity-100" : "max-h-0 opacity-0")}>
                  <SubMenuButton href="/admin/support/tickets" label="Tiket Bantuan CS" isActive={pathname.includes("/support/tickets")} />
                  <SubMenuButton href="/admin/support/claims" label="Klaim Asuransi" isActive={pathname.includes("/support/claims")} />
                  {currentRole === "superadmin" && (
                    <SubMenuButton href="/admin/support/audit" label="Audit Trail" isActive={pathname.includes("/support/audit")} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

// =========================================================================
// KOMPONEN TOMBOL DENGAN EFEK 3D NEUMORPHISM (Gen-Z & Premium)
// =========================================================================
function SidebarButton({ icon: Icon, label, isActive, href, isExpanded }: SidebarButtonProps) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center py-1.5 rounded-xl text-[13px] font-bold transition-all w-full text-left group outline-none mb-1",
        isExpanded ? "px-3 hover:bg-slate-500/5" : "justify-center px-0"
      )}
      title={label}
    >
      {/* 3D ICON WRAPPER */}
      <div className={cn(
        "w-[42px] h-[42px] shrink-0 rounded-2xl flex items-center justify-center transition-all duration-300",
        isActive 
          ? "bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(122,23,29,0.3)] border border-[#5A0E13] scale-100" 
          : "bg-transparent text-slate-400 group-hover:bg-[#7A171D]/10 group-hover:text-[#7A171D] group-active:scale-95"
      )}>
        <Icon className={cn("w-5 h-5", isActive ? "text-white" : "")} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      
      <span className={cn("transition-all duration-300 whitespace-nowrap", isActive ? "text-[#7A171D]" : "text-slate-500 group-hover:text-slate-800", isExpanded ? "ml-3 opacity-100 w-auto" : "opacity-0 w-0 hidden")}>
        {label}
      </span>
    </Link>
  );
}

// Komponen Pembungkus Menu Dropdown
function MenuDropdownButton({ icon: Icon, label, isActive, isOpen, isExpanded, onClick }: MenuDropdownButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center py-1.5 rounded-xl text-[13px] font-bold transition-all w-full text-left group outline-none mb-1",
        isExpanded ? "px-3 hover:bg-slate-500/5" : "justify-center px-0"
      )}
    >
      <div className={cn(
        "w-[42px] h-[42px] shrink-0 rounded-2xl flex items-center justify-center transition-all duration-300",
        isActive 
          ? "bg-gradient-to-br from-[#9A242B] to-[#7A171D] shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_8px_16px_rgba(122,23,29,0.3)] border border-[#5A0E13] scale-100" 
          : "bg-transparent text-slate-400 group-hover:bg-[#7A171D]/10 group-hover:text-[#7A171D] group-active:scale-95"
      )}>
        <Icon className={cn("w-5 h-5", isActive ? "text-white" : "")} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      
      <span className={cn("transition-all duration-300 whitespace-nowrap flex-1", isActive ? "text-[#7A171D]" : "text-slate-500 group-hover:text-slate-800", isExpanded ? "ml-3 opacity-100" : "opacity-0 w-0 hidden")}>
        {label}
      </span>
      {isExpanded && (
        <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isOpen ? "rotate-180" : "", isActive ? "text-[#7A171D]" : "text-slate-400")} />
      )}
    </button>
  );
}

// Submenu
function SubMenuButton({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 py-2 px-3 ml-[21px] rounded-lg text-xs font-semibold transition-all outline-none relative",
        isActive 
          ? "text-[#7A171D] bg-[#7A171D]/10" 
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-500/5"
      )}
    >
      <div className={cn("absolute -left-[14px] w-[12px] h-[1px] bg-slate-300", isActive && "bg-[#7A171D]")} />
      <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-300", isActive ? "bg-[#C5A059] shadow-[0_0_8px_#C5A059]" : "bg-slate-300")} />
      {label}
    </Link>
  );
}