import React from 'react';
import { motion } from 'motion/react';

export const RainOverlay = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute bg-white/20 w-[1px] h-[15px]"
          initial={{ top: -20, left: `${Math.random() * 100}%` }}
          animate={{ top: '100%' }}
          transition={{
            duration: Math.random() * 1 + 0.5,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};
