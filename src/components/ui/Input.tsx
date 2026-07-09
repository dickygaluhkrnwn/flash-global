// src/components/ui/Input.tsx
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
          "flex h-12 w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-2 text-sm font-semibold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 placeholder:font-medium focus-visible:outline-none focus-visible:ring-4 focus-visible:border-brand-maroon/50 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
          error ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20" : "focus-visible:ring-brand-maroon/10",
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