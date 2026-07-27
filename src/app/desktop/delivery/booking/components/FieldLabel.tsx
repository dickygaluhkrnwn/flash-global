import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const FieldLabel = ({ 
  label, 
  infoTitle, 
  infoText, 
  onInfoClick,
  className
}: { 
  label: string; 
  infoTitle?: string; 
  infoText?: string; 
  onInfoClick?: (t: string, text: string) => void;
  className?: string;
}) => (
  <div className={cn("flex items-center justify-between px-1 mb-2", className)}>
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
    {infoTitle && onInfoClick && infoText && (
      <button 
        type="button" 
        onClick={() => onInfoClick(infoTitle, infoText)} 
        className="text-slate-400 hover:text-[#7A171D] transition-colors bg-white/50 hover:bg-white p-1 rounded-full shadow-sm border border-transparent hover:border-slate-200" 
        title={`Informasi ${label}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);