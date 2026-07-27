import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-2xl border border-white bg-white/60 backdrop-blur-md px-5 py-3.5 text-sm font-bold text-slate-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-slate-400 placeholder:font-medium",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:bg-white focus-visible:shadow-sm",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error 
            ? "border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20 bg-red-50/50 text-red-900" 
            : "focus-visible:ring-[#7A171D]/15 hover:border-slate-300 focus-visible:border-[#7A171D]/50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };