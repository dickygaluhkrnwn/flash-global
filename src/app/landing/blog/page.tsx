"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Calendar, 
  Clock, 
  TrendingUp, 
  BookOpen,
  ChevronRight,
  Search
} from "lucide-react";

// ==========================================
// DUMMY DATA UNTUK ARTIKEL BLOG
// ==========================================
const FEATURED_POST = {
  id: "feat-1",
  title: "Masa Depan Logistik: Bagaimana AI Mengubah Rute Pengiriman B2B di Asia Tenggara",
  excerpt: "Dari algoritma prediksi cuaca hingga machine learning untuk routing multi-drop. Pelajari bagaimana Flash Global menekan biaya operasional armada hingga 35%.",
  category: "Technology",
  date: "15 Agustus 2026",
  readTime: "8 Min Read",
  gradient: "from-blue-100 via-indigo-100 to-purple-100", // Placeholder gambar
};

const BLOG_POSTS = [
  {
    id: "post-1",
    title: "Mengapa Fitur Limit Tempo Sangat Krusial untuk Pertumbuhan E-Commerce",
    category: "Business",
    date: "12 Agustus 2026",
    readTime: "5 Min Read",
    gradient: "from-emerald-100 to-teal-100",
  },
  {
    id: "post-2",
    title: "Strategi Sukses: Mendapatkan Profit Maksimal Sebagai Mitra Driver Independen",
    category: "Partners",
    date: "08 Agustus 2026",
    readTime: "6 Min Read",
    gradient: "from-amber-100 to-orange-100",
  },
  {
    id: "post-3",
    title: "Mengenal Smart Radar Bidding: Selamat Tinggal Rebutan Order Tidak Adil",
    category: "Product Update",
    date: "02 Agustus 2026",
    readTime: "4 Min Read",
    gradient: "from-rose-100 to-pink-100",
  },
  {
    id: "post-4",
    title: "Pentingnya Integrasi DANA API untuk Pencairan Dana COD Real-time",
    category: "Fintech",
    date: "28 Juli 2026",
    readTime: "5 Min Read",
    gradient: "from-blue-100 to-cyan-100",
  },
  {
    id: "post-5",
    title: "Klaim Asuransi Digital 100%: Menghapus Birokrasi Kertas dalam Logistik",
    category: "Technology",
    date: "20 Juli 2026",
    readTime: "7 Min Read",
    gradient: "from-purple-100 to-fuchsia-100",
  },
  {
    id: "post-6",
    title: "Panduan Integrasi Open API Flash Global untuk Sistem ERP Perusahaan",
    category: "Developer",
    date: "15 Juli 2026",
    readTime: "10 Min Read",
    gradient: "from-slate-200 to-slate-300",
  },
];

const CATEGORIES = ["Semua Topik", "Technology", "Business", "Partners", "Fintech", "Product Update", "Developer"];

export default function BlogPage() {
  return (
    <div className="relative min-h-screen w-full bg-[#f6f8fb] overflow-hidden selection:bg-blue-100 selection:text-blue-900 font-sans">
      
      {/* ==========================================
          DYNAMIC AMBIENT BACKGROUND
          Cahaya pastel dinamis yang segar
          ========================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center items-center">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vh] bg-indigo-100/60 rounded-full blur-[140px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[60vh] bg-sky-100/60 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] left-[30%] w-[30vw] h-[30vh] bg-pink-50/50 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full pt-32 pb-24">
        
        {/* ==========================================
            1. HEADER & SEARCH BAR
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-white text-blue-700 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
              <BookOpen className="w-4 h-4" /> Flash Newsroom
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Wawasan Logistik.</h1>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="w-full md:w-auto">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
              </div>
              <input 
                type="text" 
                placeholder="Cari artikel..." 
                className="w-full md:w-72 h-12 pl-12 pr-4 bg-white/50 backdrop-blur-xl border border-white rounded-full text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-[3px] focus:ring-blue-100 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.02)]"
              />
            </div>
          </motion.div>
        </section>

        {/* ==========================================
            2. FEATURED ARTICLE (Majalah Kaca Raksasa)
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="group relative w-full h-[500px] sm:h-[600px] rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgb(0,0,0,0.05)] border border-white cursor-pointer"
          >
            {/* Background Image/Gradient Pattern */}
            <div className={`absolute inset-0 bg-gradient-to-br ${FEATURED_POST.gradient} group-hover:scale-105 transition-transform duration-700`} />
            
            {/* The Glass Overlay Content (Bottom) */}
            <div className="absolute inset-x-4 bottom-4 sm:inset-x-6 sm:bottom-6">
              <div className="bg-white/40 backdrop-blur-3xl border border-white/60 p-6 sm:p-10 rounded-[2rem] flex flex-col md:flex-row gap-6 md:items-end justify-between transition-all duration-300 hover:bg-white/50">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
                      {FEATURED_POST.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <Calendar className="w-4 h-4" /> {FEATURED_POST.date}
                    </span>
                  </div>
                  <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-tight">
                    {FEATURED_POST.title}
                  </h2>
                  <p className="text-slate-700 font-medium leading-relaxed line-clamp-2 md:line-clamp-none">
                    {FEATURED_POST.excerpt}
                  </p>
                </div>
                
                <div className="flex-shrink-0">
                  <button className="w-14 h-14 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg hover:bg-slate-900 hover:text-white transition-colors duration-300">
                    <ArrowRight className="w-6 h-6 -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ==========================================
            3. CATEGORY PILLS (Horizontal Scroll)
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-12">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {CATEGORIES.map((cat, idx) => (
              <motion.button 
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + (idx * 0.05) }}
                className={`flex-shrink-0 snap-start px-5 py-2.5 rounded-full text-sm font-bold border transition-all duration-300 ${
                  idx === 0 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                  : 'bg-white/50 backdrop-blur-md border-white text-slate-600 hover:bg-white hover:text-slate-900 shadow-[0_4px_20px_rgb(0,0,0,0.02)]'
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </section>

        {/* ==========================================
            4. THE HOVERING FRAMES GRID (Artikel Reguler)
            Gaya Polaroid Kaca (Glass Polaroid)
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post, idx) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: (idx % 3) * 0.1 }}
                className="group cursor-pointer flex flex-col h-full"
              >
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3] rounded-[2rem] overflow-hidden mb-[-2rem] z-0 shadow-sm">
                   <div className={`absolute inset-0 bg-gradient-to-br ${post.gradient} group-hover:scale-105 transition-transform duration-500`} />
                   {/* Top Badge */}
                   <div className="absolute top-4 left-4">
                     <span className="px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-md text-slate-800 text-[10px] font-black uppercase tracking-widest shadow-sm">
                       {post.category}
                     </span>
                   </div>
                </div>

                {/* Glass Frosted Text Area (Menimpa bawah gambar sedikit) */}
                <div className="relative z-10 flex-1 mx-4 bg-white/70 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-[0_10px_40px_rgb(0,0,0,0.04)] group-hover:bg-white transition-colors duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mb-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.readTime}</span>
                    </div>
                    <h3 className="font-heading text-xl font-bold text-slate-900 mb-4 line-clamp-3 group-hover:text-blue-700 transition-colors">
                      {post.title}
                    </h3>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-200/50 flex items-center justify-between text-sm font-bold text-blue-600">
                    Baca Selengkapnya
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ==========================================
            5. THE NEWSLETTER / CTA STRIP
            Melayang di atas background
            ========================================== */}
        <section className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="w-full bg-slate-900 rounded-[3rem] p-10 sm:p-16 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden"
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-maroon/20 rounded-full blur-[80px]" />
            
            <div className="relative z-10 max-w-md text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-widest mb-4 border border-white/20">
                <TrendingUp className="w-4 h-4 text-blue-400" /> Ekosistem Terpusat
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">Tingkatkan Skala Logistik Anda.</h2>
              <p className="text-slate-300 font-medium">
                Dapatkan akses penuh ke fitur pengiriman retail, manajemen B2B, dan integrasi API dalam satu akun.
              </p>
            </div>
            
            <div className="relative z-10 flex-shrink-0 w-full md:w-auto">
              {/* 🚀 MENUJU /login */}
              <Link 
                href="/login" 
                className="w-full inline-flex px-8 py-5 rounded-2xl font-bold text-slate-900 bg-white hover:bg-slate-100 hover:scale-105 transition-all duration-300 items-center justify-center gap-3 shadow-xl"
              >
                Masuk ke Portal <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </section>

      </div>
    </div>
  );
}