// src/app/template.tsx
"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        // Easing khusus (cubic-bezier) ini yang bikin animasinya terasa "Premium" dan mahal
        ease: [0.22, 1, 0.36, 1], 
      }}
      className="w-full h-full min-h-screen"
    >
      {children}
    </motion.div>
  );
}