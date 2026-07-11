"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function AdminOrdersLayout({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="font-sans pb-10"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}