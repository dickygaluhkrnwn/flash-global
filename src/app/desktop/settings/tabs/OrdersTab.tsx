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
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden font-sans">
      
      {/* Header Sticky */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Preferensi Pesanan</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">Atur penerimaan struk digital dan bukti pengiriman armada operasional.</p>
        </div>
        <Button 
          onClick={handleSavePreferences} 
          disabled={isLoading} 
          variant="primary"
          className="w-full sm:w-auto px-6 shadow-md"
        >
          {isLoading ? "Menyimpan..." : <><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</>}
        </Button>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        
        {/* Notifikasi Status */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm border border-emerald-100 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 shrink-0"/> Preferensi pesanan berhasil diperbarui secara sistem!
              </div>
            </motion.div>
          )}
          {errorMsg && (
            <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
              <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm border border-red-100 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0"/> {errorMsg}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Section: E-Receipt */}
          <div className={cn("p-6 md:p-8 rounded-3xl border transition-all shadow-sm", eReceipt ? "bg-white border-[#7A171D]/30 shadow-md ring-4 ring-[#7A171D]/5" : "bg-slate-50/50 border-slate-200")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-start gap-4">
                <div className={cn("p-3 rounded-2xl shrink-0 border shadow-sm transition-colors", eReceipt ? "bg-[#7A171D]/10 text-[#7A171D] border-[#7A171D]/20" : "bg-white text-slate-400 border-slate-200")}>
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base md:text-lg tracking-tight">E-Receipt Digital</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1 max-w-[220px] leading-relaxed">Terima invoice dan struk tagihan secara otomatis ke email Anda.</p>
                </div>
              </div>
              
              {/* Toggle Switch Modern */}
              <button 
                type="button" 
                onClick={() => setEReceipt(!eReceipt)} 
                className={cn(
                  "w-12 h-6.5 rounded-full flex items-center transition-colors p-1 shrink-0 self-start sm:self-auto outline-none focus-visible:ring-2 focus-visible:ring-[#7A171D]/50 border shadow-inner",
                  eReceipt ? "bg-[#7A171D] border-[#5A0E13]" : "bg-slate-200 border-slate-300"
                )}
              >
                <div className={cn("w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform border border-slate-100", eReceipt ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>

            {/* Email Input Field (Expandable) */}
            <AnimatePresence>
              {eReceipt && (
                <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 24 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                  <div className="space-y-2 pt-4 border-t border-slate-100/60 pl-0 sm:pl-16">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email Penerima Invoice</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input 
                        type="email" 
                        value={eReceiptEmail} 
                        onChange={(e) => setEReceiptEmail(e.target.value)} 
                        placeholder="Contoh: finance@company.com" 
                        className="pl-11 border-slate-200 focus-visible:border-[#7A171D] focus-visible:ring-[#7A171D]/10 bg-slate-50 focus-visible:bg-white" 
                        required={eReceipt}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Kosongkan jika ingin dikirim ke email login Anda ({user?.email}).</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section: Proof of Delivery */}
          <div className={cn("p-6 md:p-8 rounded-3xl border transition-all shadow-sm", proofOfDelivery ? "bg-white border-[#C5A059]/40 shadow-md ring-4 ring-[#C5A059]/10" : "bg-slate-50/50 border-slate-200")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={cn("p-3 rounded-2xl shrink-0 border shadow-sm transition-colors", proofOfDelivery ? "bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20" : "bg-white text-slate-400 border-slate-200")}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base md:text-lg tracking-tight uppercase tracking-wider">Proof of Delivery</h4>
                  <p className="text-xs font-medium text-slate-500 mt-1 max-w-[220px] leading-relaxed">Dapatkan konfirmasi tanda tangan atau bukti foto saat paket tiba di tujuan.</p>
                </div>
              </div>
              
              {/* Toggle Switch Modern */}
              <button 
                type="button" 
                onClick={() => setProofOfDelivery(!proofOfDelivery)} 
                className={cn(
                  "w-12 h-6.5 rounded-full flex items-center transition-colors p-1 shrink-0 self-start sm:self-auto outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]/50 border shadow-inner",
                  proofOfDelivery ? "bg-[#C5A059] border-[#a88645]" : "bg-slate-200 border-slate-300"
                )}
              >
                <div className={cn("w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform border border-slate-100", proofOfDelivery ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>
            
            {/* Dekorasi Khusus PoD */}
            <AnimatePresence>
               {proofOfDelivery && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center">
                    <p className="text-[10px] font-bold text-[#C5A059] bg-[#C5A059]/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-[#C5A059]/20">Fitur Keamanan Aktif</p>
                 </motion.div>
               )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}