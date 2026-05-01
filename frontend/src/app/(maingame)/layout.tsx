import Navbar from "@/component/Navbar";
import React from "react";

type Props = {
  children: React.ReactNode;
};

const layout = ({ children }: Props) => {
  return (
    <div className="w-full h-full">
      {children}
      <Navbar />
    </div>
  );
};

export default layout;
