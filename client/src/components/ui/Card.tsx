import { motion } from "framer-motion";
import type { PropsWithChildren } from "react";

interface CardProps {
  title?: string;
  className?: string;
}

export function Card({ title, className = "", children }: PropsWithChildren<CardProps>) {
  return (
    <motion.section
      className={`card ${className}`.trim()}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      whileHover={{ y: -3 }}
    >
      {title ? <h3>{title}</h3> : null}
      {children}
    </motion.section>
  );
}
