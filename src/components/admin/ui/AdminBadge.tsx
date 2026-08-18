import * as React from "react";
import { cn } from "@/lib/utils";

interface AdminBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info" | "gold" | "brand" | "outline";
}

function AdminBadge({ className, variant = "default", ...props }: AdminBadgeProps) {
  // ✨ Menerapkan Glassmorphism & 3D Neumorphism
  const variants = {
    default: "bg-white/50 backdrop-blur-md text-slate-700 border-white/60 shadow-sm",
    success: "bg-emerald-500/15 backdrop-blur-md text-emerald-700 border-emerald-500/20 shadow-sm",
    warning: "bg-amber-500/15 backdrop-blur-md text-amber-700 border-amber-500/20 shadow-sm",
    danger: "bg-red-500/15 backdrop-blur-md text-red-700 border-red-500/20 shadow-sm",
    info: "bg-sky-500/15 backdrop-blur-md text-sky-700 border-sky-500/20 shadow-sm",
    
    // 3D Metalic Effect khusus Brand & Gold
    gold: "bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-white border border-[#A68345] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(197,160,89,0.3)]",
    brand: "bg-gradient-to-br from-[#9A242B] to-[#7A171D] text-white border border-[#5A0E13] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),0_2px_8px_rgba(122,23,29,0.3)]",
    
    outline: "bg-white/20 backdrop-blur-md text-slate-500 border-white/60 shadow-sm", 
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-300",
        variants[variant],
        className
      )}
      {...props}
    />
  );
} 

export { AdminBadge };