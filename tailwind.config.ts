import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Font bawaan portal admin/client/driver (TIDAK DIUBAH)
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        // 🚀 TAMBAHAN: Font khusus Landing Page (Marketing)
        heading: ['var(--font-bricolage)', 'sans-serif'],
        marketing: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        // Bawaan project (TIDAK DIUBAH)
        background: "var(--background)",
        "background-alt": "var(--background-alt)",
        foreground: "var(--foreground)",
        muted: "var(--foreground-muted)",
        brand: {
          maroon: "var(--brand-maroon)",
          "maroon-dark": "var(--brand-maroon-dark)",
          "maroon-light": "var(--brand-maroon-light)",
          gold: "var(--brand-gold)",
          "gold-dark": "var(--brand-gold-dark)",
          "gold-light": "var(--brand-gold-light)",
        },
        // 🚀 TAMBAHAN: Surface netral ala Vercel untuk kontras Bento Grid
        surface: {
          50: '#fafafa',
          100: '#f4f4f5',
          900: '#18181b', // Elegan dipadukan dengan Maroon/Gold
        }
      },
      boxShadow: {
        // Bawaan project (TIDAK DIUBAH)
        'premium': '0 10px 40px -10px rgba(0,0,0,0.03)',
        'premium-hover': '0 20px 40px -10px rgba(122,23,29,0.06)', 
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.03)',
        // 🚀 TAMBAHAN: Shadow tajam & garis tepi kaca ala Apple/Discord
        'bento': '0 4px 24px -1px rgba(0, 0, 0, 0.05), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
        'bento-hover': '0 12px 32px -1px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.05)',
        'glass-edge': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
      animation: {
        // Bawaan project
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        // Bawaan project
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      },
    },
  },
  plugins: [],
};
export default config;