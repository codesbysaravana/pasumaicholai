import { motion } from "framer-motion";

interface OnlineStatusBadgeProps {
    isOnline: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const OnlineStatusBadge = ({ isOnline, size = 'md' }: OnlineStatusBadgeProps) => {
    const dotSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5';
    const borderSize = size === 'sm' ? 'border-2' : 'border-[3px]';

    return (
        <motion.div
            initial={false}
            animate={{
                scale: isOnline ? [1, 1.1, 1] : 1,
                opacity: isOnline ? [1, 0.8, 1] : 1
            }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className={`absolute bottom-0 right-0 ${dotSize} ${isOnline ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'} rounded-full ${borderSize} border-white shadow-lg ring-1 ring-black/5`}
        />
    );
};
