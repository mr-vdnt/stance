import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AIOrbProps {
  isThinking?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AIOrb({ isThinking, className, size = 'md' }: AIOrbProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const particles = Array.from({ length: 12 });

  return (
    <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
      {/* Particles effect */}
      {isThinking && (
        <div className="absolute inset-0 pointer-events-none">
          {particles.map((_, i) => (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{
                x: (Math.random() - 0.5) * (size === 'lg' ? 120 : 80),
                y: (Math.random() - 0.5) * (size === 'lg' ? 120 : 80),
                opacity: [0, 0.6, 0],
                scale: [0, Math.random() * 0.5 + 0.5, 0],
              }}
              transition={{
                duration: Math.random() * 1.5 + 1,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
              className="absolute top-1/2 left-1/2 w-1 h-1 bg-indigo-400 rounded-full blur-[1px] shadow-[0_0_8px_rgba(129,140,248,0.6)]"
            />
          ))}
        </div>
      )}

      {/* Outer Glow / Breathing */}
      <motion.div
        animate={{
          scale: isThinking ? [1, 1.3, 1] : [1, 1.1, 1],
          opacity: isThinking ? [0.4, 0.7, 0.4] : [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: isThinking ? 1.2 : 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-indigo-500 rounded-full blur-2xl"
      />

      {/* Main Orb Body */}
      <motion.div
        animate={isThinking ? {
          rotate: 360,
          scale: [1, 0.95, 1.05, 1],
        } : {
          scale: [1, 1.05, 1],
        }}
        transition={{
          rotate: { duration: 3, repeat: Infinity, ease: "linear" },
          scale: { duration: isThinking ? 1 : 4, repeat: Infinity, ease: "easeInOut" }
        }}
        className={cn(
          "relative z-10 w-full h-full rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-tighter shadow-lg overflow-hidden border border-white/20",
          isThinking 
            ? "bg-indigo-600 text-white shadow-indigo-500/40" 
            : "bg-black/5 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
        )}
      >
        <span>AI</span>
        
        {/* Internal Shimmer */}
        <motion.div
          animate={{ x: ['-200%', '200%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
        />
        
        {/* Active Core Ring */}
        {isThinking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 border-2 border-white/20 rounded-2xl"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-t-2 border-white rounded-2xl opacity-40"
            />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
