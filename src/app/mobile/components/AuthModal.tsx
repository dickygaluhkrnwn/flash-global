import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end font-sans">
          {/* Dimmer Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer" 
          />
          
          {/* Bottom Sheet Card */}
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }} 
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative z-10 w-full bg-[#f8fafc] rounded-t-[2.5rem] p-6 pb-safe shadow-2xl border-t border-white"
          >
            {/* Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-6" />

            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-[#9A242B] to-[#7A171D] rounded-2xl flex items-center justify-center border border-[#5A0E13] shadow-sm">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <button onClick={onClose} className="p-2 bg-slate-200/50 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90 tap-highlight-transparent">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Akses Terbatas</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
              Untuk menjaga keamanan data dan melacak pengiriman, sistem mewajibkan Anda untuk masuk ke akun.
            </p>
            
            <div className="flex flex-col gap-3">
              <Button onClick={() => router.push("/login")} variant="primary" className="w-full h-14 rounded-2xl bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white shadow-md border border-[#5A0E13] active:scale-95 text-sm font-black tap-highlight-transparent flex items-center justify-center">
                <User className="w-4 h-4 mr-2" /> Login Dulu
              </Button>
              <Button onClick={onClose} variant="outline" className="w-full h-14 rounded-2xl border-slate-300 text-slate-600 bg-white active:scale-95 text-sm font-black tap-highlight-transparent">
                Batal
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}