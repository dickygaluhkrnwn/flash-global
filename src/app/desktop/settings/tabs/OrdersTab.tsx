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

  // Tarik data preferensi user dari Firestore
  useEffect(() => {
    if (user?.uid) {
      setEReceiptEmail(user.email || ""); // Default ke email login
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
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("Gagal menyimpan preferensi pesanan.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="glass-card rounded-[2.5rem] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white overflow-hidden font-sans relative transition-all duration-300"
    >
      {/* --- Background Ambient Glow --- */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#C5A059]/10 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-[#7A171D]/10 rounded-full blur-[80px] pointer-events-none z-0" />

      {/* --- HEADER STICKY --- */}
      <div className="p-6 md:p-8 border-b border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white/40 backdrop-blur-xl sticky top-0 z-20 shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)]">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Preferensi Pesanan</h2>
          <p className="text-slate-500 text-sm mt-1.5 font-medium leading-relaxed">Atur penerimaan struk digital dan opsi bukti pengiriman (Proof of Delivery).</p>
        </div>
        <Button 
          onClick={handleSavePreferences} 
          disabled={isLoading} 
          variant="primary"
          className="w-full sm:w-auto h-12 px-8 shadow-[0_8px_20px_rgba(122,23,29,0.2)] active:scale-95"
        >
          {isLoading ? "Menyimpan..." : <><Save className="w-4 h-4 mr-2" /> Simpan Konfigurasi</>}
        </Button>
      </div>

      <div className="p-6 md:p-8 space-y-8 relative z-10">
        
        {/* --- TOAST NOTIFICATIONS (IN-CARD) --- */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-emerald-50/80 backdrop-blur-md text-emerald-700 rounded-[1.25rem] font-bold text-sm border border-emerald-200 shadow-sm flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500"/> Preferensi pesanan berhasil diperbarui secara sistem!
              </div>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-red-50/80 backdrop-blur-md text-red-600 rounded-[1.25rem] font-bold text-sm border border-red-200 shadow-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500"/> {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* ========================================================= */}
          {/* SECTION 1: E-RECEIPT DIGITAL (Bento Box) */}
          {/* ========================================================= */}
          <div className={cn(
            "p-6 md:p-8 rounded-[2rem] border transition-all duration-300 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] relative overflow-hidden", 
            eReceipt ? "bg-white/80 border-white shadow-[0_10px_30px_rgba(122,23,29,0.06)]" : "bg-white/40 border-white/60"
          )}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#7A171D]/5 rounded-full blur-[40px] pointer-events-none z-0" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 border transition-all duration-300", 
                  eReceipt 
                    ? "bg-gradient-to-br from-[#9A242B] to-[#7A171D] text-white border-[#5A0E13] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_10px_rgba(122,23,29,0.2)]" 
                    : "bg-slate-100 border-white text-slate-400 shadow-sm"
                )}>
                  <Receipt className="w-5 h-5 drop-shadow-sm" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base md:text-lg tracking-tight">E-Receipt Digital</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1 max-w-[220px] leading-relaxed">Terima invoice dan struk tagihan secara otomatis ke email Anda.</p>
                </div>
              </div>
              
              {/* Custom 3D Toggle Button */}
              <button 
                type="button" 
                onClick={() => setEReceipt(!eReceipt)} 
                className={cn(
                  "w-14 h-8 rounded-full flex items-center transition-all duration-300 p-1 shrink-0 self-start sm:self-auto outline-none focus-visible:ring-4 focus-visible:ring-[#7A171D]/20 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] border active:scale-95",
                  eReceipt ? "bg-[#7A171D] border-[#5A0E13]" : "bg-slate-200 border-slate-300"
                )}
              >
                <motion.div 
                  layout
                  initial={false}
                  animate={{ x: eReceipt ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-6 h-6 bg-white rounded-full shadow-md border border-slate-100" 
                />
              </button>
            </div>

            {/* Email Input Field (Expandable with Framer Motion) */}
            <AnimatePresence>
              {eReceipt && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                  animate={{ opacity: 1, height: "auto", marginTop: 24 }} 
                  exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden relative z-10"
                >
                  <div className="space-y-2 pt-4 border-t border-slate-100/60 pl-0 sm:pl-[4.5rem]">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Penerima Invoice</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        type="email" 
                        value={eReceiptEmail} 
                        onChange={(e) => setEReceiptEmail(e.target.value)} 
                        placeholder="Contoh: finance@company.com" 
                        className="pl-12 h-14 font-black bg-white/60 focus-visible:bg-white focus-visible:border-[#7A171D]/50 focus-visible:ring-[#7A171D]/15" 
                        required={eReceipt}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed pt-1">Kosongkan jika ingin tagihan dikirimkan langsung ke email utama Anda (<span className="text-slate-600">{user?.email}</span>).</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ========================================================= */}
          {/* SECTION 2: PROOF OF DELIVERY (Bento Box) */}
          {/* ========================================================= */}
          <div className={cn(
            "p-6 md:p-8 rounded-[2rem] border transition-all duration-300 shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)] relative overflow-hidden", 
            proofOfDelivery ? "bg-white/80 border-white shadow-[0_10px_30px_rgba(197,160,89,0.08)]" : "bg-white/40 border-white/60"
          )}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/10 rounded-full blur-[40px] pointer-events-none z-0" />
            
            <div className="flex flex-col sm:flex-row justify-between gap-5 relative z-10">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-[1rem] flex items-center justify-center shrink-0 border transition-all duration-300", 
                  proofOfDelivery 
                    ? "bg-gradient-to-br from-[#DFBE7B] to-[#C5A059] text-[#5A0E13] border-[#A68345] shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_4px_10px_rgba(197,160,89,0.3)]" 
                    : "bg-slate-100 border-white text-slate-400 shadow-sm"
                )}>
                  <ShieldCheck className="w-5 h-5 drop-shadow-sm" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base md:text-lg tracking-tight uppercase tracking-widest">Proof of Delivery</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1 max-w-[220px] leading-relaxed">Dapatkan konfirmasi tanda tangan atau bukti foto saat paket tiba di tujuan akhir.</p>
                </div>
              </div>
              
              {/* Custom 3D Toggle Button */}
              <button 
                type="button" 
                onClick={() => setProofOfDelivery(!proofOfDelivery)} 
                className={cn(
                  "w-14 h-8 rounded-full flex items-center transition-all duration-300 p-1 shrink-0 self-start sm:self-auto outline-none focus-visible:ring-4 focus-visible:ring-[#C5A059]/20 shadow-[inset_0_2px_6px_rgba(0,0,0,0.15)] border active:scale-95",
                  proofOfDelivery ? "bg-[#C5A059] border-[#a88645]" : "bg-slate-200 border-slate-300"
                )}
              >
                <motion.div 
                  layout
                  initial={false}
                  animate={{ x: proofOfDelivery ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="w-6 h-6 bg-white rounded-full shadow-md border border-slate-100" 
                />
              </button>
            </div>
            
            {/* Dekorasi Khusus PoD */}
            <AnimatePresence>
               {proofOfDelivery && (
                 <motion.div 
                  initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                  animate={{ opacity: 1, height: "auto", marginTop: 24 }} 
                  exit={{ opacity: 0, height: 0, marginTop: 0 }} 
                  transition={{ duration: 0.3 }}
                  className="pt-6 border-t border-slate-100/80 flex items-center justify-start sm:pl-[4.5rem] relative z-10"
                 >
                    <span className="text-[10px] font-black text-[#C5A059] bg-[#C5A059]/10 px-4 py-1.5 rounded-[0.75rem] uppercase tracking-widest border border-[#C5A059]/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Fitur Keamanan Aktif
                    </span>
                 </motion.div>
               )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </motion.div>
  );
}