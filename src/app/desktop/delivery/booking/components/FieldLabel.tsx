import { Info } from "lucide-react";

export const FieldLabel = ({ 
  label, 
  infoTitle, 
  infoText, 
  onInfoClick 
}: { 
  label: string; 
  infoTitle?: string; 
  infoText?: string; 
  onInfoClick?: (t: string, text: string) => void;
}) => (
  <div className="flex items-center justify-between px-1 mb-2">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    {infoTitle && onInfoClick && infoText && (
      <button 
        type="button" 
        onClick={() => onInfoClick(infoTitle, infoText)} 
        className="text-slate-400 hover:text-[#7A171D] transition-colors" 
        title={`Informasi ${label}`}
      >
        <Info className="w-4 h-4" />
      </button>
    )}
  </div>
);