"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Wallet, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  RefreshCcw, 
  Landmark,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";

export default function FlashWalletFeaturePage() {
  return (
    <div className="relative min-h-screen w-full bg-[#f4f7f9] overflow-hidden selection:bg-brand-gold/30 selection:text-brand-gold-dark font-sans">
      
      {/* ==========================================
          ULTRA-SOFT LIGHT AMBIENT BACKGROUND
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vh] bg-yellow-100/60 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vh] bg-rose-100/50 rounded-full blur-[140px]" />
        <div className="absolute top-[30%] left-[40%] w-[40vw] h-[40vh] bg-blue-50/60 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
        
        {/* ==========================================
            1. SPATIAL HERO SECTION (Center Focused)
            ========================================== */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white shadow-sm text-brand-gold-dark text-xs font-bold uppercase tracking-widest mb-8"
          >
            <Wallet className="w-4 h-4" />
            Fintech Logistik
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 text-balance leading-[1.05]"
          >
            Cairkan Pendapatan <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold-dark via-yellow-500 to-brand-gold">Secepat Kilat.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-slate-500 mb-10 text-balance leading-relaxed"
          >
            Sistem pembayaran logistik yang terintegrasi penuh. Uang COD dan hasil pengiriman langsung masuk ke <strong>Flash Wallet</strong>. Tarik ke DANA atau rekening bank Anda kapan saja, 24/7.
          </motion.p>
        </div>

        {/* ==========================================
            2. THE GLASS VAULT (Mockup UI Interaktif)
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-4xl mx-auto mb-32 perspective-1000"
        >
          {/* Main Glass Canvas */}
          <div className="relative bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-white p-8 sm:p-12 shadow-[0_20px_60px_rgb(0,0,0,0.05)] overflow-hidden flex flex-col items-center">
            
            {/* The Apple-style Credit Card Mockup */}
            <div className="relative w-full max-w-[380px] h-[240px] rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-maroon p-6 text-white shadow-2xl flex flex-col justify-between overflow-hidden transform hover:scale-105 transition-transform duration-500 cursor-pointer">
              {/* Glass reflection on card */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent opacity-50 pointer-events-none" />
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-brand-gold/30 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex justify-between items-start">
                <span className="font-heading font-bold tracking-widest">FLASH WALLET</span>
                <Zap className="w-6 h-6 text-brand-gold" />
              </div>

              <div className="relative z-10">
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Total Saldo Aktif</p>
                <h3 className="font-mono text-3xl font-bold tracking-tight">Rp 24.500.000</h3>
              </div>

              <div className="relative z-10 flex justify-between items-end">
                <div className="text-white/80 font-mono text-sm tracking-widest">**** **** **** 8892</div>
                <div className="w-10 h-6 rounded-md bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-brand-gold mr-1" />
                  <div className="w-3 h-3 rounded-full bg-brand-maroon" />
                </div>
              </div>
            </div>

            {/* Floating Transaction Pills (Simulasi Data) */}
            <div className="w-full max-w-md mx-auto mt-10 space-y-3">
              {[
                { type: 'in', title: 'Pencairan COD (Resi: FGL-982)', amount: '+ Rp 350.000', time: 'Hari ini, 14:30' },
                { type: 'out', title: 'Tarik Saldo ke DANA', amount: '- Rp 1.500.000', time: 'Kemarin, 09:15' },
              ].map((trx, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:bg-white transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${trx.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {trx.type === 'in' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{trx.title}</h4>
                      <p className="text-xs text-slate-500 font-medium">{trx.time}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold font-mono ${trx.type === 'in' ? 'text-green-600' : 'text-slate-800'}`}>
                    {trx.amount}
                  </span>
                </div>
              ))}
            </div>
            
          </div>
        </motion.div>

        {/* ==========================================
            3. CASCADING CARDS (Fitur Detail)
            Gaya tumpuk asimetris yang super clean
            ========================================== */}
        <div className="max-w-6xl mx-auto relative mb-32">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold text-slate-900 mb-4">Arsitektur Keuangan yang Solid.</h2>
            <p className="text-slate-500">Dirancang khusus untuk memutar roda ekonomi logistik dengan aman.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }}
              className="bg-white/60 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                <RefreshCcw className="w-7 h-7" />
              </div>
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Integrasi DANA API</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Tidak butuh waktu berhari-hari. Saldo dompet Anda terhubung langsung dengan ekosistem DANA untuk penarikan instan secara <em>real-time</em> tanpa biaya admin tersembunyi.
              </p>
            </motion.div>

            {/* Card 2 (Sedikit di-offset ke bawah untuk efek asimetris) */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 20 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-white/60 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 transition-transform duration-300 md:translate-y-8"
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 text-brand-gold-dark flex items-center justify-center mb-6">
                <Landmark className="w-7 h-7" />
              </div>
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Transfer Antar Bank</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Selain <em>e-wallet</em>, tarik tunai langsung ke rekening bank lokal ternama (BCA, Mandiri, BNI, BRI). Proses rekonsiliasi otomatis 24/7.
              </p>
            </motion.div>

            {/* Card 3 */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/60 backdrop-blur-xl border border-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-brand-maroon flex items-center justify-center mb-6">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">Keamanan Siber Tingkat Bank</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Setiap transaksi dilindungi oleh enkripsi 256-bit dan memerlukan otentikasi PIN serta OTP. Dana Anda dijamin aman 100%.
              </p>
            </motion.div>

          </div>
        </div>

        {/* ==========================================
            4. BRIGHT CLEAN CTA SECTION
            ========================================== */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto bg-white rounded-[3rem] border border-slate-100 p-12 text-center shadow-[0_20px_50px_rgb(0,0,0,0.05)] relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 rounded-full blur-[80px]" />
          
          <h2 className="relative z-10 font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            Kendalikan Arus Kas Logistik Anda Sekarang.
          </h2>
          <p className="relative z-10 text-slate-500 mb-8 max-w-xl mx-auto">
            Akses fitur Flash Wallet begitu Anda menyelesaikan pendaftaran. Transparan, aman, dan dapat diandalkan.
          </p>
          
          {/* 🚀 MENUJU /login */}
          <Link 
            href="/login" 
            className="relative z-10 inline-flex px-8 py-4 rounded-xl font-bold text-white bg-slate-900 shadow-xl shadow-slate-900/20 hover:bg-slate-800 hover:-translate-y-1 transition-all duration-300 items-center gap-2"
          >
            Masuk ke Portal <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

      </div>
    </div>
  );
}