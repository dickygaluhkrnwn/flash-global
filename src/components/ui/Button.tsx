// src/components/ui/Button.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gold";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, ...props }, ref) => {
    
    // Base style untuk semua tombol (Premium Feel)
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-xl font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-maroon/20 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
    
    // Varian Desain Tombol
    const variants = {
      primary: "bg-brand-maroon text-white hover:bg-brand-maroon-dark shadow-[0_4px_14px_0_rgba(122,23,29,0.25)] hover:shadow-[0_6px_20px_rgba(122,23,29,0.2)]",
      secondary: "bg-gray-900 text-white hover:bg-black shadow-[0_4px_14px_0_rgba(0,0,0,0.2)]",
      gold: "bg-brand-gold text-white hover:bg-brand-gold-dark shadow-[0_4px_14px_0_rgba(197,160,89,0.25)]",
      outline: "border-2 border-gray-200 bg-transparent hover:border-brand-maroon/50 hover:bg-brand-maroon/5 text-gray-700 hover:text-brand-maroon",
      ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    };

    // Ukuran Tombol
    const sizes = {
      sm: "h-9 px-4 text-xs",
      md: "h-11 px-6 text-sm",
      lg: "h-14 px-8 text-base",
      icon: "h-10 w-10",
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