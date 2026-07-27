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
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm cursor-pointer" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            className="relative w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] p-8 md:p-10 overflow-hidden border border-white"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#7A171D] to-[#C5A059]" />
            <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-[#7A171D]/10 rounded-2xl flex items-center justify-center mb-6 border border-[#7A171D]/20 shadow-sm">
              <Lock className="w-8 h-8 text-[#7A171D]" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Akses Terbatas</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
              Untuk menjaga keamanan data dan melacak pengiriman, sistem mewajibkan Anda untuk masuk ke akun.
            </p>
            
            <div className="flex gap-4">
              <Button onClick={onClose} variant="outline" className="flex-1 h-12">Batal</Button>
              <Button onClick={() => router.push("/login")} variant="primary" className="flex-1 h-12">
                <User className="w-4 h-4 mr-2" /> Login Dulu
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}