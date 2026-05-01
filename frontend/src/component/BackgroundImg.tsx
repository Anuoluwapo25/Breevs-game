"use client";

import { ReactNode } from "react";
import Man from "../assets/RR_LOGO_1.png";

interface BackgroundImgProps {
  children: ReactNode;
}

const BackgroundImg: React.FC<BackgroundImgProps> = ({ children }) => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-screen overflow-hidden bg-[#030B1F]">
      <div
        className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url(${Man.src})`,
          zIndex: 0,
        }}
      ></div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default BackgroundImg;
