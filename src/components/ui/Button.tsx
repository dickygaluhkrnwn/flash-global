import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gold" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    
    // Base style premium dengan active state dan focus ring yang halus
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98]";
    
    // Varian Desain Tombol yang lebih modern
    const variants = {
      primary: "bg-[#7A171D] text-white hover:bg-[#5A0E13] focus-visible:ring-[#7A171D]/50 shadow-md shadow-[#7A171D]/20 hover:shadow-lg hover:shadow-[#7A171D]/30",
      secondary: "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-900/50 shadow-md shadow-slate-900/20 hover:shadow-lg hover:shadow-slate-900/30",
      gold: "bg-[#C5A059] text-white hover:bg-[#A68345] focus-visible:ring-[#C5A059]/50 shadow-md shadow-[#C5A059]/20 hover:shadow-lg hover:shadow-[#C5A059]/30",
      danger: "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500/50 shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30",
      outline: "border border-slate-200 bg-transparent hover:border-[#7A171D] hover:bg-[#7A171D]/5 text-slate-700 hover:text-[#7A171D] focus-visible:ring-[#7A171D]/50",
      ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-200",
    };

    // Ukuran Tombol
    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-11 px-6 text-sm",
      lg: "h-14 px-8 text-base",
      icon: "h-11 w-11",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };