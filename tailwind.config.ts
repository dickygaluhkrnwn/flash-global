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
        sans: ['var(--font-geist-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
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
      },
      boxShadow: {
        // Soft shadow premium ala agensi kelas atas
        'premium': '0 10px 40px -10px rgba(0,0,0,0.03)',
        'premium-hover': '0 20px 40px -10px rgba(122,23,29,0.06)', 
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.03)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
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