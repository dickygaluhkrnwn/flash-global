"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ChevronDown, 
  Package, 
  CreditCard, 
  ShieldCheck, 
  UserCircle,
  ArrowRight,
  LifeBuoy,
  MessageSquare
} from "lucide-react";

// ==========================================
// DATA FAQ & KATEGORI
// ==========================================
const CATEGORIES = [
  { id: "all", label: "Semua Topik", icon: Search },
  { id: "delivery", label: "Pengiriman & Resi", icon: Package },
  { id: "finance", label: "Pembayaran & Limit", icon: CreditCard },
  { id: "account", label: "Akun & Keamanan", icon: UserCircle },
  { id: "insurance", label: "Klaim Asuransi", icon: ShieldCheck },
];

const FAQS = [
  {
    id: 1,
    category: "delivery",
    question: "Bagaimana cara melacak posisi kurir secara real-time?",
    answer: "Anda dapat melacak kurir melalui menu 'Lacak Pesanan' di Portal Client. Sistem kami terhubung langsung dengan GPS armada, sehingga Anda bisa melihat pergerakan kurir secara real-time di atas peta hingga barang sampai di tujuan."
  },
  {
    id: 2,
    category: "finance",
    question: "Apa syarat pengajuan Limit Tempo (Kasbon) untuk B2B?",
    answer: "Untuk mengaktifkan Limit Tempo bulanan, Anda harus terdaftar sebagai akun Enterprise. Syarat utamanya meliputi verifikasi legalitas perusahaan (NIB/SIUP) dan mutasi rekening 3 bulan terakhir. Tim Sales kami akan memproses persetujuan dalam waktu 2x24 jam kerja."
  },
  {
    id: 3,
    category: "delivery",
    question: "Apakah bisa melakukan pengiriman ke lebih dari 5 alamat sekaligus?",
    answer: "Tentu! Flash Global memiliki fitur Multi-drop Routing. Anda bisa menginput hingga 20 alamat pengiriman dalam satu resi pesanan. Sistem AI kami akan otomatis mengurutkan rute pengiriman yang paling efisien untuk menghemat biaya operasional Anda."
  },
  {
    id: 4,
    category: "insurance",
    question: "Bagaimana proses klaim jika barang rusak saat pengiriman?",
    answer: "Jika Anda menggunakan layanan Proteksi Asuransi Digital, klaim dapat dilakukan 100% via aplikasi. Masuk ke riwayat pesanan, pilih pesanan yang bermasalah, lalu unggah foto bukti kerusakan. Proses pencairan dana maksimal 2 hari kerja ke Flash Wallet Anda."
  },
  {
    id: 5,
    category: "account",
    question: "Lupa kata sandi Portal Client, apa yang harus saya lakukan?",
    answer: "Di halaman login, silakan klik tombol 'Lupa Password'. Masukkan email yang terdaftar, dan kami akan mengirimkan tautan aman untuk mereset kata sandi Anda. Demi keamanan, tautan tersebut hanya berlaku selama 15 menit."
  }
];

export default function HelpCenterPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter logika
  const filteredFaqs = FAQS.filter(faq => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleFaq = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#fcfdfe] overflow-hidden selection:bg-brand-gold/20 selection:text-slate-900 font-sans">
      
      {/* ==========================================
          AIRY & SPACIOUS AMBIENT BACKGROUND
          Cahaya blur yang sangat luas dan bersih
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[70vw] h-[70vh] bg-blue-50/50 rounded-full blur-[150px]" />
        <div className="absolute top-[30%] right-[-10%] w-[40vw] h-[40vh] bg-rose-50/40 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-amber-50/30 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full pt-40 pb-24">
        
        {/* ==========================================
            1. THE SPOTLIGHT SEARCH (Hero Section)
            Elemen raksasa di tengah ruang kosong
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm border border-slate-100 text-blue-600 mb-6">
              <LifeBuoy className="w-8 h-8" />
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Halo, ada yang bisa kami bantu?
            </h1>
            <p className="text-lg text-slate-500 font-medium">Temukan panduan, solusi, dan jawaban atas pertanyaan Anda.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative group w-full max-w-3xl mx-auto"
          >
            <div className="absolute inset-y-0 left-8 flex items-center pointer-events-none">
              <Search className="w-6 h-6 text-slate-400 group-focus-within:text-brand-maroon transition-colors" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik topik bantuan (Cth: Lacak Resi, Limit Tempo...)" 
              className="w-full h-20 pl-20 pr-8 bg-white/70 backdrop-blur-3xl border border-white rounded-[2rem] text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-[4px] focus:ring-brand-gold/20 shadow-[0_10px_50px_rgba(0,0,0,0.04)] transition-all duration-300"
            />
          </motion.div>
        </section>

        {/* ==========================================
            2. THE FLOATING PILLS (Kategori Bantuan)
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto mb-12">
          <div className="flex flex-wrap justify-center gap-3">
            {CATEGORIES.map((cat, idx) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + (idx * 0.05) }}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeCategory === cat.id
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                  : 'bg-white/50 backdrop-blur-md border border-white text-slate-600 hover:bg-white hover:text-slate-900 shadow-sm'
                }`}
              >
                <cat.icon className="w-4 h-4" /> {cat.label}
              </motion.button>
            ))}
          </div>
        </section>

        {/* ==========================================
            3. FLUID ACCORDIONS (Daftar FAQ Tembus Pandang)
            Tanpa kotak, hanya garis pembatas edge-to-edge
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto mb-32 min-h-[400px]">
          <div className="border-t border-slate-200/50">
            <AnimatePresence>
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq) => (
                  <motion.div 
                    key={faq.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-slate-200/50"
                  >
                    <button 
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full py-8 text-left flex items-start justify-between gap-6 group focus:outline-none"
                    >
                      <h3 className={`font-heading text-lg sm:text-xl font-bold transition-colors duration-300 ${expandedFaq === faq.id ? 'text-brand-maroon' : 'text-slate-900 group-hover:text-brand-maroon'}`}>
                        {faq.question}
                      </h3>
                      <div className={`mt-1 shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${expandedFaq === faq.id ? 'bg-brand-maroon text-white rotate-180' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-900'}`}>
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </button>
                    
                    {/* Jawaban yang Mengalir Bawah */}
                    <AnimatePresence>
                      {expandedFaq === faq.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0, paddingBottom: 0 }}
                          animate={{ height: "auto", opacity: 1, paddingBottom: 32 }}
                          exit={{ height: 0, opacity: 0, paddingBottom: 0 }}
                          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="text-slate-600 text-lg leading-relaxed bg-white/40 p-6 rounded-3xl backdrop-blur-sm border border-white">
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="py-20 text-center"
                >
                  <p className="text-slate-500 text-lg">Maaf, kami tidak menemukan jawaban untuk pencarian Anda.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ==========================================
            4. SOFT SUPPORT POP-UP BOX
            Bentuk lembut di bagian bawah layar
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/60 backdrop-blur-2xl border border-white rounded-[3rem] p-10 md:p-16 text-center flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_20px_80px_rgba(0,0,0,0.03)]"
          >
            <div className="text-center md:text-left">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 mx-auto md:mx-0 shadow-sm border border-blue-100">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-900 mb-2">Masih Butuh Bantuan?</h2>
              <p className="text-slate-500 font-medium">Tim spesialis kami siap membantu Anda menyelesaikan masalah.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <Link 
                href="/contact" 
                className="px-8 py-4 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                Hubungi Support
              </Link>
              {/* 🚀 MENUJU /login */}
              <Link 
                href="/login" 
                className="px-8 py-4 rounded-xl font-bold text-white bg-slate-900 hover:bg-brand-maroon transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                Masuk ke Portal <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </section>

      </div>
    </div>
  );
}