"use client";

import Modal from "@/component/ResuableModal";
import GlowingEffect from "@/component/GlowingEffectProps";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAccount } from "@micro-stacks/react";
import { useJoinGame } from "@/hooks/useGame";
import { useGameStore } from "@/store/gameStore";
import {
  showErrorToast,
  showSuccessToast,
  showTransactionToast,
} from "@/component/Toast";
import { GameStatus, GameInfo } from "@/lib/contractCalls";

interface StakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const StakeModal: React.FC<StakeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { stxAddress } = useAccount();
  const { mutateAsync: joinGameMutation, isPending } = useJoinGame();
  const {
    selectedGame,
    setSelectedGame,
    setCurrentPlayerGame,
    hasActiveGame,
    getCurrentActiveGame,
    addToMyGames,
  } = useGameStore();
  const [txId, setTxId] = useState<string | null>(null);

  const stake = selectedGame?.stake ?? 0n;
  const gameId = selectedGame?.gameId;

  const stakeValue = typeof stake === "bigint" ? stake : BigInt(stake ?? 0);
  const stakeInSTX = Number(stakeValue) / 1_000_000;

  const handleStake = async () => {
    try {
      setTxId(null);

      if (!isSignedIn || !stxAddress) {
        showErrorToast(
          "Please connect your Stacks wallet first",
          "Wallet Error"
        );
        return;
      }

      if (!selectedGame || !gameId) {
        showErrorToast("No game selected", "Invalid Game");
        return;
      }

      if (selectedGame.status !== GameStatus.Active) {
        showErrorToast("Cannot join a game that is not active", "Invalid Game");
        return;
      }

      // Check if user has an active game
      const hasActive = hasActiveGame(stxAddress);
      const activeGame = getCurrentActiveGame(stxAddress);
      if (hasActive && activeGame && activeGame.gameId !== gameId) {
        showErrorToast(
          `You are already in an active game (#${activeGame.gameId}). Please complete it first.`,
          "Active Game"
        );
        router.push(`/GameScreen/${activeGame.gameId.toString()}`);
        return;
      }

      const tx = await joinGameMutation({
        gameId,
        stake: stakeValue,
        stxAddress,
      });

      // Update store with the joined game
      if (selectedGame) {
        addToMyGames({
          ...selectedGame,
          players: [...selectedGame.players, stxAddress],
        });
        setCurrentPlayerGame(selectedGame, stxAddress);
      }

      setTxId(tx.txId);

      showTransactionToast(
        tx.txId,
        "success",
        `https://explorer.stacks.co/txid/${tx.txId}?chain=testnet`
      );
      showSuccessToast("Successfully joined the game!", "Success");

      onClose();
      setSelectedGame(null);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/GameScreen/${gameId}`);
      }
    } catch (err: any) {
      console.error("Stake error:", err);
      const errorMessage = err.message?.includes("User canceled")
        ? "Transaction canceled by user"
        : err.message || "Failed to stake";
      showErrorToast(errorMessage, "Stake Error");
      setTxId(null);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setTxId(null);
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-gradient-to-br from-[#0B1445] via-[#0a1529] to-[#0B1445] text-white p-4 sm:p-6 rounded-2xl border border-red-500/20 max-w-sm w-full mb-[80px]">
        <GlowingEffect className="top-[63px] left-[47px]" />
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1">Join Game</h2>
          <p className="text-xs text-gray-400">Stake to enter and compete</p>
        </div>
        <div className="bg-gradient-to-r from-red-500/20 via-purple-500/20 to-red-500/20 border border-red-500/30 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-2 text-center">
            Required Stake
          </p>
          <div className="text-center">
            <p className="text-3xl sm:text-4xl font-bold text-[#FF3B3B] drop-shadow-lg">
              {stakeValue > 0n
                ? `${Number(stakeInSTX.toFixed(3))
                    .toString()
                    .replace(/\.?0+$/, "")} STX`
                : "Free Entry"}
            </p>
          </div>
        </div>
        {selectedGame && (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 mb-4 border border-white/10">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Game ID:</span>
              <span className="text-xs font-bold text-white">
                #{selectedGame.gameId.toString()}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">Players:</span>
              <span className="text-xs font-bold text-white">
                {selectedGame.players.includes(selectedGame.creator)
                  ? selectedGame.playerCount - 1
                  : selectedGame.playerCount}
                /5
              </span>
            </div>
          </div>
        )}
        {txId && (
          <div className="mb-4 p-2 bg-green-900/30 border border-green-500/50 rounded-lg">
            <p className="text-xs text-green-300 text-center font-mono break-all">
              Transaction: {txId}
            </p>
          </div>
        )}
        {!isSignedIn && (
          <div className="mb-4 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
            <p className="text-xs text-yellow-300 text-center">
              Please connect your wallet to proceed
            </p>
          </div>
        )}
        <button
          className={`w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-2 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/50 ${
            isPending || !isSignedIn || hasActiveGame(stxAddress || "")
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-105"
          }`}
          onClick={handleStake}
          disabled={isPending || !isSignedIn || hasActiveGame(stxAddress || "")}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            "Stake & Join Game"
          )}
        </button>
      </div>
    </Modal>
  );
};

export default StakeModal;
