"use client";

import { motion, AnimatePresence } from "framer-motion";

// Layout ini sekarang hanya berfungsi sebagai container transisi (passthrough)
// Karena navigasi tab sudah dipindah sepenuhnya ke AdminSidebar.
export default function AdminUsersLayout({ children }: { children: React.ReactNode }) {
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