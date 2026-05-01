"use client";

import Image from "next/image";
import { ReactNode } from "react";
import Man from "../assets/RR_LOGO_1.png";
import Russian from "../assets/RR_LOGO_2_1.png";

interface BackgroundImgProps {
  children: ReactNode;
}

const BackgroundImgWithLogo: React.FC<BackgroundImgProps> = ({ children }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen  h-screen w-screen bg-[#030B1F] overflow-auto">
      <div
        className="inset-0 bg-contain bg-center bg-no-repeat opacity-12 fixed"
        style={{ backgroundImage: `url(${Man.src})` }}
      ></div>
      <Image
        src={Russian}
        alt="Russian"
        className="absolute right-4 top-0 w-[200px]"
      />
      {children}
    </div>
  );
};

export default BackgroundImgWithLogo;
