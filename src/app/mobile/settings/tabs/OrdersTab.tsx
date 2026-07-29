"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, CheckCircle2, Receipt, Mail, ShieldCheck, AlertCircle } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export default function OrdersTab() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [eReceipt, setEReceipt] = useState(false);
  const [eReceiptEmail, setEReceiptEmail] = useState("");
  const [proofOfDelivery, setProofOfDelivery] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      setEReceiptEmail(user.email || ""); 
      const fetchPreferences = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().preferences) {
            const prefs = userDoc.data().preferences;
            setEReceipt(prefs.eReceipt || false);
            setEReceiptEmail(prefs.eReceiptEmail || user.email || "");
            setProofOfDelivery(prefs.proofOfDelivery || false);
          }
        } catch (error) {
          console.error("Gagal menarik preferensi pesanan:", error);
        }
      };
      fetchPreferences();
    }
  }, [user]);

  const handleSavePreferences = async () => {
    if (!user?.uid) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      await setDoc(doc(db, "users", user.uid), {
        preferences: {
          eReceipt,
          eReceiptEmail: eReceipt ? eReceiptEmail : "",
          proofOfDelivery
        },
        updatedAt: serverTimestamp()
      }, { merge: true });

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error: unknown) {
      if (error instanceof Error) setErrorMsg(error.message);
      else setErrorMsg("Gagal menyimpan preferensi pesanan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 relative z-10">
      
      {/* TOAST NOTIFICATIONS */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-[1.25rem] font-bold text-xs border border-emerald-200 shadow-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5"/> <span>Preferensi pesanan berhasil diperbarui secara sistem!</span>
            </div>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
            <div className="p-3 bg-red-50 text-red-600 rounded-[1.25rem] font-bold text-xs border border-red-200 shadow-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5"/> <span>{errorMsg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        
        {/* ========================================================= */}
        {/* SECTION 1: E-RECEIPT DIGITAL */}
        {/* ========================================================= */}
        <div className={cn(
          "p-5 rounded-[2rem] border transition-all duration-300 shadow-sm relative overflow-hidden", 
          eReceipt ? "bg-white border-white" : "bg-slate-50 border-slate-200"
        )}>
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300", 
                  eReceipt ? "bg-gradient-to-br from-[#9A242B] to-[#7A171D] text-white border-[#5A0E13] shadow-sm" : "bg-slate-100 border-white text-slate-400"
                )}>
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0 pr-2">
                  <h4 className="font-black text-slate-900 text-xs tracking-tight">E-Receipt Digital</h4>
                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed truncate">Invoice dikirim via email.</p>
                </div>
              </div>
              
              {/* IOS STYLE TOGGLE */}
              <button 
                type="button" onClick={() => setEReceipt(!eReceipt)} 
                className={cn(
                  "w-12 h-7 rounded-full flex items-center transition-all duration-300 p-1 shrink-0 outline-none shadow-inner border tap-highlight-transparent",
                  eReceipt ? "bg-[#7A171D] border-[#5A0E13]" : "bg-slate-200 border-slate-300"
                )}
              >
                <motion.div layout initial={false} animate={{ x: eReceipt ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-5 h-5 bg-white rounded-full shadow-sm border border-slate-100" />
              </button>
            </div>

            {/* Email Input Field */}
            <AnimatePresence>
              {eReceipt && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 16 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.3 }}
                  className="overflow-hidden relative z-10"
                >
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email Penerima Invoice</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        type="email" value={eReceiptEmail} onChange={(e) => setEReceiptEmail(e.target.value)} 
                        placeholder="Contoh: finance@company.com" 
                        className="pl-10 h-12 text-sm font-black bg-white rounded-xl" 
                        required={eReceipt}
                      />
                    </div>
                    <p className="text-[9px] text-slate-500 font-bold leading-relaxed pt-1 px-1">
                      Kosongkan jika ingin tagihan dikirimkan ke email utama Anda.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECTION 2: PROOF OF DELIVERY */}
        {/* ========================================================= */}
        <div className={cn(
          "p-5 rounded-[2rem] border transition-all duration-300 shadow-sm relative overflow-hidden", 
          proofOfDelivery ? "bg-white border-white" : "bg-slate-50 border-slate-200"
        )}>
          <div className="flex flex-col gap-4 relative z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300", 
                  proofOfDelivery ? "bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-[#5A0E13] border-[#A68345] shadow-sm" : "bg-slate-100 border-white text-slate-400"
                )}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 pr-2">
                  <h4 className="font-black text-slate-900 text-xs tracking-tight uppercase tracking-widest">Proof of Delivery</h4>
                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed line-clamp-2">Konfirmasi tanda tangan & foto saat tiba.</p>
                </div>
              </div>
              
              {/* IOS STYLE TOGGLE */}
              <button 
                type="button" onClick={() => setProofOfDelivery(!proofOfDelivery)} 
                className={cn(
                  "w-12 h-7 rounded-full flex items-center transition-all duration-300 p-1 shrink-0 outline-none shadow-inner border tap-highlight-transparent",
                  proofOfDelivery ? "bg-[#C5A059] border-[#a88645]" : "bg-slate-200 border-slate-300"
                )}
              >
                <motion.div layout initial={false} animate={{ x: proofOfDelivery ? 20 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-5 h-5 bg-white rounded-full shadow-sm border border-slate-100" />
              </button>
            </div>

            <AnimatePresence>
               {proofOfDelivery && (
                 <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 16 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.3 }}
                  className="pt-4 border-t border-slate-100 relative z-10"
                 >
                    <span className="text-[9px] font-black text-[#C5A059] bg-[#C5A059]/10 px-3 py-1.5 rounded-lg uppercase tracking-widest border border-[#C5A059]/20 flex items-center justify-center gap-1.5 w-max shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5" /> Fitur Keamanan Aktif
                    </span>
                 </motion.div>
               )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* BOTTOM ACTION BAR (STICKY) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <Button 
          onClick={handleSavePreferences} 
          disabled={isLoading} 
          className="w-full h-14 bg-gradient-to-b from-[#9A242B] to-[#7A171D] text-white rounded-[1.25rem] font-black shadow-md flex items-center justify-center gap-2 active:scale-95 tap-highlight-transparent border border-[#5A0E13] text-sm"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <><Save className="w-4 h-4" /> Simpan Konfigurasi</>
          )}
        </Button>
      </div>

    </div>
  );
}