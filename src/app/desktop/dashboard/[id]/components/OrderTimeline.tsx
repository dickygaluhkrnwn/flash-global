import { Truck, MapPin, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

// BUG FIX: Membuat interface spesifik agar TypeScript tidak komplain soal 'any'
export interface TimelineItem {
  isCurrent?: boolean;
  status: string;
  date: string;
  description: string;
  location?: string;
}

export default function OrderTimeline({ timelineData, orderStatus }: { timelineData: TimelineItem[], orderStatus: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none"><MapPinned className="w-40 h-40" /></div>
      
      <h3 className="text-base font-black text-slate-900 mb-8 flex items-center gap-2 relative z-10">
        <Truck className="w-5 h-5 text-[#7A171D]" /> Status Pengiriman
      </h3>
      
      <div className="relative pl-3 md:pl-4 z-10">
        <div className="absolute top-3 bottom-6 left-[19px] md:left-[23px] w-0.5 bg-slate-100"></div>
        <div className="space-y-6 relative">
          {timelineData.map((item, idx) => (
            <div key={idx} className="flex gap-4 md:gap-5 items-start group">
              <div className={`w-3.5 h-3.5 rounded-full mt-1.5 shrink-0 z-10 border-2 transition-all ${
                item.isCurrent ? (orderStatus.includes("Batal") ? "bg-red-600 border-white ring-4 ring-red-600/20 scale-125" : "bg-[#7A171D] border-white ring-4 ring-[#7A171D]/20 scale-125") : "bg-slate-300 border-white"
              }`} />
              <div className={cn("flex-1", item.isCurrent ? "opacity-100" : "opacity-60 group-hover:opacity-100 transition-opacity")}>
                <h4 className={`text-sm font-black ${item.isCurrent ? (orderStatus.includes("Batal") ? "text-red-600" : "text-[#7A171D]") : "text-slate-700"}`}>{item.status}</h4>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5 mb-1.5">{item.date}</p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-md">{item.description}</p>
                {item.location && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 mt-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                    <MapPin className="w-3 h-3"/> {item.location}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}