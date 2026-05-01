"use client";

import { useEffect } from "react";
import { useAuth } from "@micro-stacks/react";
import { useGameStore } from "@/store/gameStore";
import { useMyGames } from "@/hooks/useGame";
import { ToastContainer } from "@/component/Toast";

interface AppWrapperProps {
  children: React.ReactNode;
}

export default function AppWrapper({ children }: AppWrapperProps) {
  const { isSignedIn } = useAuth();
  const { clearGames, clearCurrentGames } = useGameStore();
  const { data: myGames, isLoading, isError, error } = useMyGames();

  useEffect(() => {
    if (!isSignedIn) {
      console.log("Wallet disconnected, clearing game store");
      clearGames();
      clearCurrentGames();
    }
  }, [isSignedIn, clearGames, clearCurrentGames]);

  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
