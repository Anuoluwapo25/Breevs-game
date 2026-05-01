import { useAuth } from "@micro-stacks/react";

export function useWalletConnect() {
  const { openAuthRequest } = useAuth();

  const connectWallet = async () => {
    try {
      await openAuthRequest();
    } catch (err) {
      console.error("Wallet connect error:", err);
      alert(
        "⚠️ No Stacks wallet found. Please install Hiro or Xverse to continue."
      );
    }
  };

  return { connectWallet };
}
