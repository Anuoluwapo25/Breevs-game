import React from "react";

interface GlowingEffectProps {
  className?: string;
}

const GlowingEffect: React.FC<GlowingEffectProps> = ({ className = "" }) => {
  return (
    <div className={`absolute ${className}`}>
      {/* Main Glow */}
      <div className="absolute w-4 h-4 bg-[#FF3B3B] blur-[5px] opacity-70 rounded-full right-[5px] left-[8px] top-[3px]"></div>
      {/* Smaller Glows */}
      <div className="absolute w-3 h-3 bg-[#FF3B3B] blur-[3px] opacity-60 rounded-full top-[-10px] left-5"></div>
      <div className="absolute w-2 h-2 bg-[#FF3B3B] blur-[3px] opacity-60 rounded-full top-[-4px] left-2"></div>
      <div className="absolute w-3 h-3 bg-[#3568D4] blur-[3px] opacity-90 rounded-full top-[1px] -right-9"></div>
    </div>
  );
};

export default GlowingEffect;
