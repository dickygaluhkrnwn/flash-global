"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, CheckCircle2, Receipt, Mail, ShieldCheck } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";

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
          console.error("Gagal menarik preferensi:", error);
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
    <div className="bg-white rounded-3xl shadow-xl shadow-[#7A171D]/5 border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Order Preferences</h2>
          <p className="text-gray-500 text-sm mt-1">Atur penerimaan struk digital dan bukti pengiriman armada.</p>
        </div>
        <button onClick={handleSavePreferences} disabled={isLoading} className="bg-[#7A171D] hover:bg-[#5A0E13] text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center gap-2">
          {isLoading ? "Menyimpan..." : <><Save className="w-4 h-4" /> Simpan Perubahan</>}
        </button>
      </div>

      <div className="p-8 space-y-8">
        <AnimatePresence>
          {isSuccess && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-green-50 text-green-700 rounded-xl font-bold text-sm border border-green-200 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Preferensi pesanan berhasil diperbarui!</motion.div>}
          {errorMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-50 text-red-600 rounded-xl font-bold text-sm border border-red-200">{errorMsg}</motion.div>}
        </AnimatePresence>

        {/* E-Receipt Section */}
        <div className="p-6 border border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base">E-receipt</h4>
                <p className="text-xs text-gray-500">Terima invoice dan struk digital secara otomatis via email.</p>
              </div>
            </div>
            {/* Toggle Switch */}
            <button type="button" onClick={() => setEReceipt(!eReceipt)} className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 ${eReceipt ? 'bg-[#7A171D]' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${eReceipt ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <AnimatePresence>
            {eReceipt && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="pt-4 overflow-hidden">
                <div className="space-y-1.5 ml-14">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">E-receipt Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={eReceiptEmail} onChange={(e) => setEReceiptEmail(e.target.value)} placeholder="Email untuk menerima struk" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#7A171D] outline-none text-sm font-semibold text-gray-900 bg-white" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Proof of Delivery Section */}
        <div className="p-6 border border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-base uppercase tracking-wider">Proof of Delivery</h4>
                <p className="text-xs text-gray-500 max-w-sm mt-0.5">Terima konfirmasi tanda tangan atau bukti foto barang secara otomatis saat paket tiba di tujuan.</p>
              </div>
            </div>
            {/* Toggle Switch */}
            <button type="button" onClick={() => setProofOfDelivery(!proofOfDelivery)} className={`w-12 h-6 rounded-full flex items-center transition-colors p-1 ${proofOfDelivery ? 'bg-[#C5A059]' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${proofOfDelivery ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}