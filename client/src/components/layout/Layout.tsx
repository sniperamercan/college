import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { motion } from "framer-motion";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8"
      >
        {children}
      </motion.main>
    </div>
  );
}
