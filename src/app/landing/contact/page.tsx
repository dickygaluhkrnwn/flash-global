"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Phone, 
  Send, 
  MessageSquare,
  ArrowRight,
  Headphones
} from "lucide-react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Simulasi submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 5000);
    }, 1500);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#f2f5f8] flex flex-col justify-center items-center py-24 sm:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden font-sans selection:bg-brand-gold/30 selection:text-brand-gold-dark">
      
      {/* ==========================================
          DYNAMIC AMBIENT BACKGROUND
          Cahaya super lembut untuk menonjolkan konsol kaca
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[10%] left-[10%] w-[40vw] h-[40vh] bg-blue-100/60 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[45vw] h-[45vh] bg-rose-100/50 rounded-full blur-[120px]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30vw] h-[30vh] bg-amber-50/50 rounded-full blur-[100px]" />
      </div>

      {/* ==========================================
          THE GLASS CONSOLE
          Modal UI raksasa di tengah layar
          ========================================== */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-6xl bg-white/40 backdrop-blur-3xl border border-white rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.6)] overflow-hidden flex flex-col lg:flex-row"
      >
        
        {/* --- LEFT PANEL: CONTACT DIRECTORY --- */}
        <div className="w-full lg:w-5/12 p-10 sm:p-14 border-b lg:border-b-0 lg:border-r border-white/60 bg-gradient-to-br from-white/40 to-transparent flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-maroon/5 border border-brand-maroon/10 text-brand-maroon text-xs font-bold uppercase tracking-widest mb-6">
              <MessageSquare className="w-4 h-4" /> Bantuan & Kemitraan
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-[1.1]">
              Mari <br/>Berdiskusi.
            </h1>
            <p className="text-slate-500 font-medium leading-relaxed mb-10">
              Tim kami siap membantu Anda mendigitalisasi operasional logistik, menyelesaikan kendala pengiriman, atau menjajaki peluang kemitraan.
            </p>

            {/* Contact Chips / Tickets */}
            <div className="space-y-4">
              {/* Sales / B2B */}
              <div className="group flex items-start gap-4 p-4 rounded-2xl bg-white/50 border border-white shadow-sm hover:bg-white transition-colors duration-300">
                <div className="w-10 h-10 rounded-full bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Corporate Sales</h4>
                  <p className="text-xs text-slate-500 mb-1">Khusus akun Enterprise & B2B</p>
                  <p className="font-mono text-sm font-bold text-slate-700 group-hover:text-brand-gold-dark transition-colors">+62 811 9999 8888</p>
                </div>
              </div>

              {/* Customer Support */}
              <div className="group flex items-start gap-4 p-4 rounded-2xl bg-white/50 border border-white shadow-sm hover:bg-white transition-colors duration-300">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Layanan Pelanggan</h4>
                  <p className="text-xs text-slate-500 mb-1">Bantuan resi & klaim asuransi</p>
                  <p className="font-mono text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">support@flashglobals.com</p>
                </div>
              </div>

              {/* HQ Office */}
              <div className="group flex items-start gap-4 p-4 rounded-2xl bg-transparent border border-transparent hover:bg-white/50 hover:border-white transition-all duration-300">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Kantor Pusat</h4>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    Flash Global Tower, Jl. Jend. Sudirman Kav 52-53,<br/>
                    Senayan, Kebayoran Baru, Jakarta Selatan 12190
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT PANEL: INTERACTIVE FORM --- */}
        <div className="w-full lg:w-7/12 p-10 sm:p-14 relative bg-white/20">
          <div className="max-w-md mx-auto h-full flex flex-col justify-center">
            <h3 className="font-heading text-2xl font-bold text-slate-900 mb-2">Kirim Pesan Langsung</h3>
            <p className="text-sm text-slate-500 mb-8">Kami akan membalas ke email Anda dalam waktu maksimal 1x24 jam kerja.</p>

            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-green-50 border border-green-100 rounded-3xl p-8 text-center flex flex-col items-center justify-center h-full"
              >
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-green-500/30">
                  <Send className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Pesan Terkirim!</h4>
                <p className="text-slate-600 text-sm">Terima kasih telah menghubungi kami. Tim terkait akan segera menindaklanjuti pesan Anda.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Input Nama */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Nama Lengkap</label>
                    <input 
                      type="text" 
                      required
                      placeholder="John Doe" 
                      className="w-full bg-white/60 backdrop-blur-md border border-white rounded-2xl h-[52px] px-5 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-gold/20 focus:border-brand-gold/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                    />
                  </div>
                  {/* Input Email */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Email Perusahaan</label>
                    <input 
                      type="email" 
                      required
                      placeholder="john@perusahaan.com" 
                      className="w-full bg-white/60 backdrop-blur-md border border-white rounded-2xl h-[52px] px-5 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-gold/20 focus:border-brand-gold/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                    />
                  </div>
                </div>

                {/* Input Kategori */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Topik Pembahasan</label>
                  <div className="relative">
                    <select className="w-full bg-white/60 backdrop-blur-md border border-white rounded-2xl h-[52px] px-5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-gold/20 focus:border-brand-gold/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] appearance-none cursor-pointer">
                      <option value="">Pilih topik diskusi...</option>
                      <option value="sales">Pengajuan Akun B2B / Enterprise</option>
                      <option value="api">Integrasi API & Sistem</option>
                      <option value="vendor">Pendaftaran Vendor Armada</option>
                      <option value="support">Kendala Pengiriman / Klaim</option>
                    </select>
                    {/* Custom Arrow for select */}
                    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                {/* Input Pesan */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Detail Pesan</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Ceritakan detail kebutuhan logistik Anda di sini..." 
                    className="w-full bg-white/60 backdrop-blur-md border border-white rounded-2xl py-4 px-5 text-sm font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-gold/20 focus:border-brand-gold/50 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] resize-none"
                  ></textarea>
                </div>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full mt-4 bg-slate-900 hover:bg-brand-maroon text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_8px_20px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgba(122,23,29,0.3)] disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>Kirim Pesan Sekarang <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.div>

      {/* ==========================================
          BOTTOM QUICK LINK (Bypass Support)
          ========================================== */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="mt-10 flex items-center gap-4"
      >
        <span className="text-sm font-medium text-slate-500">Sudah memiliki akun pengiriman?</span>
        <Link 
          href="/login" 
          className="text-sm font-bold text-brand-maroon hover:text-brand-gold-dark flex items-center gap-1 transition-colors bg-white/50 px-4 py-2 rounded-full border border-white shadow-sm"
        >
          Masuk Portal Client <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>

    </div>
  );
}