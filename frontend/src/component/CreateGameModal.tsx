"use client";

import Modal from "@/component/ResuableModal";
import GlowingEffect from "@/component/GlowingEffectProps";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAccount } from "@micro-stacks/react";
import { useCreateGame } from "@/hooks/useGame";
import { useGameStore } from "@/store/gameStore";
import { getGameInfo } from "@/lib/contractCalls";
import {
  showErrorToast,
  showSuccessToast,
  showTransactionToast,
} from "@/component/Toast";

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateGameModal: React.FC<CreateGameModalProps> = ({
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { stxAddress } = useAccount();
  const { mutateAsync: createGame, isPending } = useCreateGame();
  const { setCurrentCreatorGame, getCurrentActiveGame, hasActiveGame } =
    useGameStore();
  const [stake, setStake] = useState("1");

  const handleCreateGame = async () => {
    if (!isSignedIn || !stxAddress) {
      showErrorToast("Please connect your Stacks wallet first", "Wallet Error");
      return;
    }

    // Check if user has any active game
    if (hasActiveGame(stxAddress)) {
      const activeGame = getCurrentActiveGame(stxAddress);
      showErrorToast(
        `You have an active game (#${activeGame?.gameId}). Please complete it first.`,
        "Active Game"
      );
      if (activeGame) {
        router.push(`/GameScreen/${activeGame.gameId.toString()}`);
      }
      onClose();
      return;
    }

    const stakeValue = Number(stake);
    if (stakeValue < 0.1 || stakeValue > 100) {
      showErrorToast("Stake must be between 0.1 and 100 STX", "Invalid Stake");
      return;
    }

    try {
      const stakeBigInt = BigInt(Math.floor(stakeValue * 1_000_000));
      const durationBigInt = BigInt(600);

      const { txId, gameId } = await createGame({
        stake: stakeBigInt,
        duration: durationBigInt,
        stxAddress,
      });

      showTransactionToast(
        txId,
        "success",
        `https://explorer.stacks.co/txid/${txId}?chain=testnet`
      );

      const gameInfo = await getGameInfo(gameId);
      setCurrentCreatorGame(gameInfo);

      showSuccessToast("Game created successfully!", "Success");

      onClose();
      router.push(`/GameScreen/${gameId}`);
    } catch (err: any) {
      console.error("Create game error:", err);

      const errorMessage = err.message?.includes("User canceled")
        ? "Transaction canceled by user"
        : err.message || "Failed to create game. Please try again.";
      showErrorToast(errorMessage, "Create Game Error");
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setStake("1");
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-gradient-to-br from-[#0B1445] via-[#0a1529] to-[#0B1445] text-white p-4 sm:p-6 rounded-2xl border border-red-500/20 max-w-sm w-full mb-[80px]">
        <GlowingEffect className="top-[63px] left-[47px]" />

        {/* Header */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1">
            Create New Game
          </h2>
          <p className="text-xs text-gray-400">
            Set your stake and start a new game room
          </p>
        </div>

        {/* Stake Input */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-[#FF3B3B] mb-2 text-center">
            Set Stake Amount
          </label>
          <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 backdrop-blur-sm p-4 rounded-xl border border-gray-700/50">
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              min="0.1"
              max="100"
              step="0.1"
              className="w-full bg-transparent text-white text-center text-2xl font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="1.0"
              disabled={isPending}
            />
            <p className="text-xs text-gray-400 mt-2 text-center font-semibold">
              STX
            </p>
          </div>
        </div>

        {/* Info Text */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-200 text-center">
            💡 Players will need to stake{" "}
            <span className="text-[#FF3B3B] font-bold">{stake} STX</span> to
            join your game
          </p>
        </div>

        {/* Wallet Warning */}
        {!isSignedIn && (
          <div className="mb-4 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
            <p className="text-xs text-yellow-300 text-center">
              Please connect your wallet to proceed
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          className={`w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-2 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/50 ${
            isPending || !isSignedIn
              ? "opacity-50 cursor-not-allowed"
              : "hover:scale-105"
          }`}
          onClick={handleCreateGame}
          disabled={isPending || !isSignedIn}
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Creating Game...
            </span>
          ) : (
            "Create Game Room"
          )}
        </button>
      </div>
    </Modal>
  );
};

export default CreateGameModal;
