import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "danger" | "gold" | "brand" | "outline" | "glass";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    // Rombakan: Ditambah rounded-full, backdrop-blur, dan inner shadow tipis
    default: "bg-slate-100/80 backdrop-blur-sm text-slate-700 border-white shadow-sm",
    success: "bg-emerald-100/80 backdrop-blur-sm text-emerald-800 border-white shadow-sm",
    warning: "bg-amber-100/80 backdrop-blur-sm text-amber-800 border-white shadow-sm",
    danger: "bg-red-100/80 backdrop-blur-sm text-red-800 border-white shadow-sm",
    gold: "bg-[#C5A059]/15 backdrop-blur-sm text-[#A68345] border-white shadow-sm",
    brand: "bg-[#7A171D]/10 backdrop-blur-sm text-[#7A171D] border-white shadow-sm",
    outline: "bg-transparent text-slate-500 border-slate-300", 
    // BARU: Glass badge untuk melayang di atas gambar/peta
    glass: "bg-white/30 backdrop-blur-md text-slate-800 border-white/50 shadow-sm",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[10px] sm:text-xs font-black transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 tracking-widest uppercase",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };