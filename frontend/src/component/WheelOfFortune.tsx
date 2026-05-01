"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useAuth } from "@micro-stacks/react";
import { Open_Sans } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { connectWebSocketClient } from "@stacks/blockchain-api-client";
import {
  useGameStatus,
  useIsGameCreator,
  useStartGame,
  useSpin,
  useAdvanceRound,
  useClaimPrize,
  useIsPrizeClaimed,
} from "@/hooks/useGame";
import { GameStatus } from "@/lib/contractCalls";
import BackgroundImgBlur from "@/component/BackgroundBlur";
import Link from "next/link";
import StakeModal from "@/component/StakeModal";
import { useGameStore } from "@/store/gameStore";

const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "700"] });
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "ST168JS95Y70CV8T7T63GF8V420FG2VCBZ5TXP2DA";
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME || "Breevs-v2";

interface Player {
  name: string;
  address: string;
  status: "Still in" | "Eliminated";
  eliminatedInRound?: number;
}

interface WinnerAnnouncement {
  address: string;
  amount: string;
}

interface WheelOfFortuneProps {
  gameId: bigint;
}

const WheelOfFortune: React.FC<WheelOfFortuneProps> = ({ gameId }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [winners, setWinners] = useState<WinnerAnnouncement[]>([]);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastEliminatedPlayer, setLastEliminatedPlayer] = useState<
    string | null
  >(null);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number>(0);

  const { isSignedIn } = useAuth();
  const { stxAddress } = useAccount();
  const { setSelectedGame, updateGameStatus } = useGameStore();

  const {
    data: game,
    isLoading: isLoadingStatus,
    isError,
    error: gameError,
    refetch,
  } = useGameStatus(gameId);

  const { data: isGameCreator } = useIsGameCreator(gameId, stxAddress || "");

  const {
    mutateAsync: startGame,
    isPending: isStarting,
    error: startError,
  } = useStartGame();

  const {
    mutateAsync: spin,
    isPending: isSpinningTx,
    error: spinError,
  } = useSpin();

  const {
    mutateAsync: advanceRound,
    isPending: isAdvancing,
    error: advanceError,
  } = useAdvanceRound();

  const {
    mutateAsync: claimPrize,
    isPending: isClaiming,
    error: claimError,
  } = useClaimPrize();

  const { data: isPrizeClaimed, isLoading: loadingClaim } = useIsPrizeClaimed(
    gameId,
    stxAddress || ""
  );

  if (!gameId) {
    return (
      <BackgroundImgBlur>
        <div className="flex flex-col justify-center items-center min-h-screen text-red-400 px-4">
          <p className="text-base sm:text-lg">Invalid game ID</p>
          <Link
            href="/"
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm sm:text-base"
          >
            Back to Home
          </Link>
        </div>
      </BackgroundImgBlur>
    );
  }

  // Update players list, including creator for spin wheel
  const updatePlayers = useCallback(() => {
    if (!game || !game.players) return;

    const formattedPlayers: Player[] = game.players.map((address, index) => {
      const isCreator = address === game.creator;
      const name = isCreator ? "Host" : `Player ${index + 1}`;
      if (game.status === GameStatus.Ended && game.winner) {
        const isWinner = address === game.winner;
        return {
          name,
          address,
          status: isWinner ? "Still in" : "Eliminated",
          eliminatedInRound: !isWinner ? game.currentRound : undefined,
        };
      }
      return {
        name,
        address,
        status: "Still in",
      };
    });

    setPlayers(formattedPlayers);

    if (game.status === GameStatus.Ended && game.winner) {
      const winnerPlayer = formattedPlayers.find(
        (p) => p.address === game.winner
      );
      if (winnerPlayer) {
        setWinner(winnerPlayer.name);
      }
    }
  }, [game]);

  useEffect(() => {
    updatePlayers();
  }, [updatePlayers]);

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchBlockHeight = async () => {
      // Use the extended API which has better CORS support
      const apiUrl =
        "https://stacks-node-api.testnet.stacks.co/extended/v1/block?limit=1";

      try {
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited - back off exponentially
            const backoffTime = Math.min(30000, 5000 * Math.pow(2, retryCount));
            console.warn(`Rate limited. Backing off for ${backoffTime}ms`);
            retryCount++;
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.results && data.results[0] && data.results[0].height) {
          const blockHeight = data.results[0].height;
          if (isMounted && typeof blockHeight === "number" && blockHeight > 0) {
            setCurrentBlockHeight(blockHeight);
            retryCount = 0; // Reset retry count on success
          }
        }
      } catch (err) {
        if (retryCount < maxRetries) {
          console.error(
            `Failed to fetch block height (attempt ${
              retryCount + 1
            }/${maxRetries}):`,
            err
          );
          retryCount++;
        } else {
          console.error("Max retries reached for block height fetch");
        }
        // Don't set to 0, keep the last known value
      }
    };

    // Initial fetch
    fetchBlockHeight();

    // Fetch every 30 seconds (reduced from 10 to avoid rate limiting)
    const interval = setInterval(fetchBlockHeight, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Calculate remaining time for round duration
  useEffect(() => {
    if (
      !game?.roundEnd ||
      game.status !== GameStatus.InProgress ||
      currentBlockHeight === 0
    ) {
      setTimeLeft(0);
      return;
    }

    const roundEndBlock = Number(game.roundEnd);
    const blocksRemaining = Math.max(0, roundEndBlock - currentBlockHeight);
    const secondsRemaining = blocksRemaining * 600; // ~10 minutes per block
    setTimeLeft(secondsRemaining);
  }, [game?.roundEnd, game?.status, currentBlockHeight]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    let client: any;

    const fetchWinners = async () => {
      try {
        client = await connectWebSocketClient(
          "wss://stacks-node-api.testnet.stacks.co"
        );

        client.subscribeAddressTransactions(
          `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
          (event: any) => {
            if (
              event.event_type === "contract_event" &&
              event.contract_event.event_name === "prize-claimed"
            ) {
              setWinners((prev) => [
                ...prev,
                {
                  address: event.contract_event.value.winner,
                  amount: `${(
                    Number(event.contract_event.value.amount) / 1_000_000
                  ).toFixed(4)} STX`,
                },
              ]);
            }
          }
        );
      } catch (err) {
        console.error("Failed to subscribe to winner events:", err);
      }
    };

    fetchWinners();

    return () => {
      if (client?.close) {
        client.close();
      }
    };
  }, []);

  useEffect(() => {
    if (winners.length > 0) {
      const interval = setInterval(() => {
        setWinners((prev) => {
          const newWinners = [...prev];
          newWinners.push(newWinners.shift()!);
          return newWinners;
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [winners]);

  const showError = (message: string) => {
    setError(message);
    setIsProcessing(false);
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
  };

  const refreshGameState = async () => {
    try {
      await refetch();
      if (game) {
        updateGameStatus(game.gameId, game.status);
      }
    } catch (err) {
      console.error("Failed to refresh game state:", err);
    }
  };

  const startGameAction = async () => {
    if (isProcessing || isStarting) return;
    setError(null);
    setIsProcessing(true);

    try {
      if (game?.status !== GameStatus.Active) {
        throw new Error("Game is not waiting for players");
      }

      if (game?.playerCount !== 6) {
        throw new Error(
          `Game requires exactly 6 players to start. Currently have ${game.playerCount}/6 players.`
        );
      }

      if (stxAddress !== game?.creator) {
        throw new Error("Only the game creator can start the game");
      }

      showSuccess("🎮 Starting game...");

      await startGame({ gameId });

      await refreshGameState();

      showSuccess("🎮 Game started! Round 1 begins!");
      setIsProcessing(false);
    } catch (err: any) {
      console.error("Start game error:", err);
      showError(err.message || "Failed to start game");
      setIsProcessing(false);
    }
  };

  const spinWheel = async () => {
    if (isSpinning || isSpinningTx || isProcessing || winner) return;
    setError(null);
    setIsProcessing(true);

    try {
      if (game?.status !== GameStatus.InProgress) {
        throw new Error("Game is not in progress");
      }

      if (game?.playerCount <= 1) {
        throw new Error("Not enough players to spin");
      }

      if (stxAddress !== game?.creator) {
        throw new Error("Only the game creator can spin the wheel");
      }

      if (
        game?.roundEnd &&
        currentBlockHeight > 0 &&
        currentBlockHeight >= Number(game.roundEnd)
      ) {
        throw new Error("Round has expired. Please advance to the next round.");
      }

      setIsSpinning(true);
      showSuccess("🎡 Spinning the wheel...");

      const result = await spin({ gameId });
      const eliminatedPlayer: string = result.spinTX.value;

      console.log("Spin result:", {
        eliminatedPlayer,
        players,
        gamePlayers: game.players,
        txId: result.spinTX.txId,
      });

      // Validate eliminatedPlayer
      if (!eliminatedPlayer || !game.players.includes(eliminatedPlayer)) {
        console.error("Invalid eliminated player:", {
          eliminatedPlayer,
          gamePlayers: game.players,
        });
        throw new Error(
          `Invalid eliminated player address: ${eliminatedPlayer || "empty"}`
        );
      }

      const remainingPlayers = players.filter((p) => p.status === "Still in");
      const eliminatedIndex = remainingPlayers.findIndex(
        (p) => p.address === eliminatedPlayer
      );

      if (eliminatedIndex === -1) {
        console.error("Eliminated player not found in remainingPlayers:", {
          eliminatedPlayer,
          remainingPlayers,
          gamePlayers: game.players,
        });
        throw new Error(
          `Eliminated player (${eliminatedPlayer}) not found in active players`
        );
      }

      setLastEliminatedPlayer(eliminatedPlayer);

      const anglePerSegment = 360 / remainingPlayers.length;
      const targetAngle = eliminatedIndex * anglePerSegment;
      const totalSpins = 5 + Math.random() * 3;
      const finalAngle = 360 * totalSpins + targetAngle;

      let currentRotation = rotation;
      const totalDuration = 6000;
      const accelerationDuration = 1000;
      const decelerationDuration = 2000;
      const constantDuration =
        totalDuration - accelerationDuration - decelerationDuration;

      const accelerationSteps = 30;
      const accelerationStepTime = accelerationDuration / accelerationSteps;

      for (let i = 0; i <= accelerationSteps; i++) {
        await new Promise((resolve) =>
          setTimeout(resolve, accelerationStepTime)
        );
        const progress = i / accelerationSteps;
        const easedProgress = progress * progress * (3 - 2 * progress);
        currentRotation += easedProgress * 30;
        setRotation(currentRotation);
      }

      const constantSteps = 60;
      const constantStepTime = constantDuration / constantSteps;

      for (let i = 0; i < constantSteps; i++) {
        await new Promise((resolve) => setTimeout(resolve, constantStepTime));
        currentRotation += 30;
        setRotation(currentRotation);
      }

      const decelerationSteps = 40;
      const decelerationStepTime = decelerationDuration / decelerationSteps;

      for (let i = 0; i <= decelerationSteps; i++) {
        await new Promise((resolve) =>
          setTimeout(resolve, decelerationStepTime)
        );
        const progress = i / decelerationSteps;
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const remainingAngle = finalAngle - currentRotation;
        currentRotation +=
          (remainingAngle / (decelerationSteps - i + 1)) * easedProgress;
        setRotation(currentRotation);
      }

      setRotation(finalAngle);

      await new Promise((resolve) => setTimeout(resolve, 500));

      setPlayers((prevPlayers) =>
        prevPlayers.map((p) =>
          p.address === eliminatedPlayer
            ? {
                ...p,
                status: "Eliminated" as const,
                eliminatedInRound: game.currentRound,
              }
            : p
        )
      );

      await refreshGameState();

      const eliminatedPlayerName =
        players.find((p) => p.address === eliminatedPlayer)?.name || "Player";

      const remainingCount =
        players.filter((p) => p.status === "Still in").length - 1;

      if (remainingCount === 1) {
        showSuccess(`🏆 ${eliminatedPlayerName} eliminated! We have a winner!`);
      } else {
        showSuccess(`❌ ${eliminatedPlayerName} has been eliminated!`);
      }

      setIsSpinning(false);
      setIsProcessing(false);
    } catch (err: any) {
      console.error("Spin error:", err);
      showError(err.message || "Failed to spin the wheel");
      setIsSpinning(false);
      setIsProcessing(false);
    }
  };

  const advanceRoundAction = async () => {
    if (isProcessing || isAdvancing || winner) return;
    setError(null);
    setIsProcessing(true);

    try {
      if (game?.status !== GameStatus.InProgress) {
        throw new Error("Game is not in progress");
      }

      if (stxAddress !== game?.creator) {
        throw new Error("Only the game creator can advance the round");
      }

      if (
        game?.roundEnd &&
        currentBlockHeight > 0 &&
        currentBlockHeight < Number(game.roundEnd)
      ) {
        const blocksRemaining = Number(game.roundEnd) - currentBlockHeight;
        throw new Error(
          `Round hasn't expired yet. Approximately ${blocksRemaining} blocks remaining.`
        );
      }

      showSuccess("⏭️ Advancing to next round...");

      await advanceRound({ gameId });

      await refreshGameState();

      showSuccess(`⏭️ Round ${(game?.currentRound || 0) + 1} started!`);
      setIsProcessing(false);
    } catch (err: any) {
      console.error("Advance round error:", err);
      showError(err.message || "Failed to advance round");
      setIsProcessing(false);
    }
  };

  const claimPrizeAction = async () => {
    if (isProcessing || isClaiming) return;
    setError(null);
    setIsProcessing(true);

    try {
      if (game?.status !== GameStatus.Ended) {
        throw new Error("Game has not ended yet");
      }

      if (stxAddress !== game?.winner) {
        throw new Error("Only the winner can claim the prize");
      }

      if (isPrizeClaimed) {
        throw new Error("Prize has already been claimed");
      }

      showSuccess("🏆 Claiming your prize...");

      await claimPrize({ gameId, user: stxAddress });

      await refreshGameState();

      if (stxAddress && game) {
        setWinners((prev) => [
          ...prev,
          {
            address: stxAddress,
            amount: `${(Number(game.prizePool) / 1_000_000).toFixed(4)} STX`,
          },
        ]);
      }

      showSuccess(
        `🎉 Congratulations! Prize of ${(
          Number(game?.prizePool) / 1_000_000
        ).toFixed(4)} STX claimed!`
      );
      setIsProcessing(false);
    } catch (err: any) {
      console.error("Claim prize error:", err);
      showError(err.message || "Failed to claim prize");
      setIsProcessing(false);
    }
  };

  const handleJoinGame = () => {
    if (game) {
      setSelectedGame(game);
      setIsStakeModalOpen(true);
    }
  };

  const getGameStatusText = () => {
    if (!game || isLoadingStatus) return "Loading...";
    switch (game.status) {
      case GameStatus.Active:
        return "Waiting for Players";
      case GameStatus.InProgress:
        return `In Progress - Round ${game.currentRound}`;
      case GameStatus.Ended:
        return "Game Ended";
      default:
        return "Unknown";
    }
  };

  const canStartGame = () => {
    if (!game || !isSignedIn || !stxAddress || !game.creator) return false;
    return (
      game.status === GameStatus.Active &&
      game.playerCount === 6 &&
      stxAddress === game.creator &&
      !isProcessing &&
      !isStarting
    );
  };

  const canSpin = () =>
    game?.status === GameStatus.InProgress &&
    game?.playerCount > 1 &&
    isSignedIn &&
    stxAddress === game?.creator &&
    !isSpinning &&
    !isSpinningTx &&
    !isProcessing &&
    game?.roundEnd &&
    (currentBlockHeight === 0 || currentBlockHeight < Number(game.roundEnd));

  const canAdvanceRound = () =>
    game?.status === GameStatus.InProgress &&
    isSignedIn &&
    stxAddress === game?.creator &&
    game?.roundEnd &&
    (currentBlockHeight === 0 || currentBlockHeight >= Number(game.roundEnd)) &&
    !isAdvancing &&
    !isProcessing;

  const canClaimPrize = () =>
    game?.status === GameStatus.Ended &&
    isSignedIn &&
    stxAddress === game?.winner &&
    !isClaiming &&
    !isProcessing &&
    !isPrizeClaimed;

  const canJoinGame = () =>
    game?.status === GameStatus.Active &&
    isSignedIn &&
    stxAddress &&
    !game.players.includes(stxAddress) &&
    game.playerCount < 6;

  if (isLoadingStatus || isError) {
    return (
      <BackgroundImgBlur>
        <div className="flex flex-col justify-center items-center min-h-screen text-white px-4">
          {isLoadingStatus && (
            <div className="text-lg sm:text-xl animate-pulse">
              Loading game...
            </div>
          )}
          {isError && (
            <>
              <p className="text-red-400 text-sm sm:text-base text-center">
                Error: {gameError?.message || "Failed to load game"}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm sm:text-base"
              >
                Retry
              </button>
            </>
          )}
        </div>
      </BackgroundImgBlur>
    );
  }

  if (!stxAddress) {
    return (
      <BackgroundImgBlur>
        <div className="flex flex-col justify-center items-center min-h-screen text-white px-4">
          <p className="text-yellow-300 text-sm sm:text-base text-center">
            Please connect your wallet to view the game
          </p>
        </div>
      </BackgroundImgBlur>
    );
  }

  return (
    <BackgroundImgBlur>
      <div
        className={`${openSans.className} w-full h-screen overflow-hidden flex flex-col`}
      >
        <StakeModal
          isOpen={isStakeModalOpen}
          onClose={() => {
            setIsStakeModalOpen(false);
            setSelectedGame(null);
          }}
          onSuccess={() => {
            setIsStakeModalOpen(false);
            refetch();
          }}
        />

        <div className="w-full bg-gradient-to-r from-[#030b1f] via-[#0a1529] to-[#030b1f] border-b border-red-500/20 py-3 px-4 sm:px-6 flex-shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-center sm:text-left">
              <h1 className="text-xl text-white sm:text-2xl lg:text-3xl font-bold">
                <span className="text-[#FF3B3B]">WIN</span> or LOSE
              </h1>
              <p className="text-xs sm:text-sm text-gray-300">
                Last man standing{" "}
                <span className="text-[#FF3B3B] font-bold">WINS BIG!</span>
              </p>
            </div>

            {winners.length > 0 && (
              <motion.div
                key={winners[0].address}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-r from-purple-900/40 to-red-900/40 backdrop-blur-sm rounded-lg px-3 py-2 border border-red-500/30"
              >
                <p className="text-xs text-gray-400">Latest Winner</p>
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-white font-mono">
                    {winners[0].address.slice(0, 6)}...
                    {winners[0].address.slice(-4)}
                  </span>
                  <span className="text-gray-400">won</span>
                  <span className="text-[#FF3B3B] font-bold">
                    {winners[0].amount}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
            >
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 rounded-lg shadow-2xl border border-green-400/50">
                <p className="text-sm font-semibold text-center">{success}</p>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
            >
              <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-3 rounded-lg shadow-2xl border border-red-400/50">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-semibold flex-1">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-white hover:text-gray-200 font-bold text-lg"
                  >
                    ×
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
              <div className="lg:col-span-4 xl:col-span-3">
                <div className="bg-gradient-to-br from-[#030b1f]/95 to-[#0a1529]/95 backdrop-blur-md rounded-xl border border-red-500/20 p-4 shadow-xl sticky top-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      Game #{gameId.toString()}
                    </h2>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        game?.status === GameStatus.Active
                          ? "bg-yellow-500/20 text-yellow-400"
                          : game?.status === GameStatus.InProgress
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {getGameStatusText()}
                    </span>
                  </div>

                  {isGameCreator && (
                    <div className="mb-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                      <p className="text-xs text-purple-300 font-semibold">
                        🎮 You are the Game Host
                      </p>
                    </div>
                  )}

                  {game?.status === GameStatus.InProgress && game.roundEnd && (
                    <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs text-gray-400">Round Time Left</p>
                      <p
                        className={`text-xl font-bold ${
                          timeLeft <= 600 && timeLeft > 0
                            ? "text-red-400 animate-pulse"
                            : "text-blue-400"
                        }`}
                      >
                        {timeLeft > 0
                          ? `${Math.floor(timeLeft / 60)}m ${timeLeft % 60}s`
                          : "Expired"}
                      </p>
                      {timeLeft <= 600 && timeLeft > 0 && (
                        <p className="text-xs text-red-300 mt-1">
                          ⚠️ Time almost up!
                        </p>
                      )}
                      {timeLeft === 0 && (
                        <p className="text-xs text-yellow-300 mt-1">
                          ⏰ Round expired - Advance!
                        </p>
                      )}
                    </div>
                  )}

                  {game && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                        <p className="text-xs text-gray-400">Stake</p>
                        <p className="text-sm font-bold text-white">
                          {(Number(game.stake) / 1_000_000).toFixed(4)} STX
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                        <p className="text-xs text-gray-400">Players</p>
                        <p className="text-sm font-bold text-white">
                          {game.playerCount}/6
                        </p>
                      </div>
                      <div className="col-span-2 bg-gradient-to-r from-[#FF3B3B]/20 to-purple-500/20 rounded-lg p-2 border border-[#FF3B3B]/30">
                        <p className="text-xs text-gray-400">Prize Pool</p>
                        <p className="text-lg sm:text-xl font-bold text-[#FF3B3B]">
                          {(Number(game.prizePool) / 1_000_000).toFixed(4)} STX
                        </p>
                      </div>
                    </div>
                  )}

                  {!isSignedIn && (
                    <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                      <p className="text-xs text-yellow-300">
                        Connect wallet to interact
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {canJoinGame() && (
                      <button
                        onClick={handleJoinGame}
                        className="block w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold py-2 px-4 rounded-lg text-center transition-all text-sm shadow-lg"
                      >
                        🎯 Join Game
                      </button>
                    )}

                    {canStartGame() && (
                      <button
                        onClick={startGameAction}
                        disabled={isStarting || isProcessing}
                        className={`w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm shadow-lg ${
                          isStarting || isProcessing
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isStarting || isProcessing
                          ? "Starting..."
                          : "🎮 Start Game"}
                      </button>
                    )}

                    {canSpin() && (
                      <button
                        onClick={spinWheel}
                        disabled={isSpinning || isSpinningTx || isProcessing}
                        className={`w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm shadow-lg ${
                          isSpinning || isSpinningTx || isProcessing
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isSpinning || isSpinningTx || isProcessing
                          ? "🎡 Spinning..."
                          : "🎡 Spin Wheel"}
                      </button>
                    )}

                    {canAdvanceRound() && (
                      <button
                        onClick={advanceRoundAction}
                        disabled={isAdvancing || isProcessing}
                        className={`w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm shadow-lg ${
                          isAdvancing || isProcessing
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isAdvancing || isProcessing
                          ? "Advancing..."
                          : "⏭️ Advance Round"}
                      </button>
                    )}

                    {canClaimPrize() && (
                      <button
                        onClick={claimPrizeAction}
                        disabled={isClaiming || isProcessing || isPrizeClaimed}
                        className={`w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm shadow-lg ${
                          isClaiming || isProcessing || isPrizeClaimed
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isClaiming || isProcessing
                          ? "Claiming..."
                          : "🏆 Claim Prize"}
                      </button>
                    )}

                    {isPrizeClaimed &&
                      game?.status === GameStatus.Ended &&
                      stxAddress === game?.winner && (
                        <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <p className="text-xs text-green-300 text-center">
                            ✅ Prize Already Claimed
                          </p>
                        </div>
                      )}
                  </div>

                  {isProcessing && (
                    <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-blue-300">
                          Processing transaction...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4 xl:col-span-5 flex items-center justify-center">
                <div className="relative w-full max-w-sm aspect-square sticky top-4">
                  <motion.div
                    className={`w-full h-full rounded-full border-8 border-red-500 flex items-center justify-center shadow-2xl ${
                      isSpinning || isSpinningTx || isProcessing
                        ? "pointer-events-none"
                        : ""
                    }`}
                    animate={{ rotate: rotation }}
                    transition={{
                      ease: "linear",
                      duration: 0.1,
                    }}
                    style={{
                      filter: isSpinning ? "blur(2px)" : "none",
                      background:
                        "radial-gradient(circle, rgba(255,59,59,0.1) 0%, rgba(3,11,31,0.9) 70%)",
                    }}
                  >
                    <div
                      className={`absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center font-bold text-base sm:text-lg shadow-2xl z-10 cursor-pointer transition-all ${
                        canSpin()
                          ? "bg-white text-black hover:bg-gray-200 hover:scale-110"
                          : "bg-gray-600 text-gray-400 cursor-not-allowed"
                      }`}
                      onClick={spinWheel}
                    >
                      {isSpinning || isSpinningTx || isProcessing
                        ? "..."
                        : "SPIN"}
                    </div>
                    <div className="absolute w-full h-full flex flex-col items-center justify-center">
                      {players
                        .filter((p) => p.status === "Still in")
                        .map((player, index) => {
                          const remainingCount = players.filter(
                            (p) => p.status === "Still in"
                          ).length;
                          const angle = index * (360 / remainingCount);
                          return (
                            <div
                              key={index}
                              className={`absolute w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full font-semibold text-xs shadow-lg border-2 transition-all ${
                                lastEliminatedPlayer === player.address
                                  ? "bg-gradient-to-br from-gray-500 to-gray-700 text-white border-red-500/50 opacity-50"
                                  : "bg-gradient-to-br from-red-500 to-red-700 text-white border-white/30"
                              }`}
                              style={{
                                transform: `rotate(${angle}deg) translateY(-95px) rotate(-${angle}deg)`,
                              }}
                            >
                              {player.name}
                            </div>
                          );
                        })}
                    </div>
                  </motion.div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                    <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-l-transparent border-r-transparent border-t-[28px] border-t-white drop-shadow-lg"></div>
                  </div>

                  {game?.status === GameStatus.InProgress && (
                    <div className="absolute -bottom-16 left-0 right-0 text-center">
                      <p className="text-sm text-gray-400">Current Round</p>
                      <p className="text-2xl font-bold text-white">
                        {game.currentRound}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="bg-gradient-to-br from-[#030b1f]/95 to-[#0a1529]/95 backdrop-blur-md rounded-xl border border-red-500/20 p-4 shadow-xl sticky top-4">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-3">
                    👥 Participants
                  </h3>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 mb-2">
                      Players ({game?.playerCount || 0}/6)
                    </p>
                    {players.length === 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400">
                          Waiting for players to join...
                        </p>
                      </div>
                    )}
                    {players.map((player, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 1 }}
                        animate={{
                          opacity: player.status === "Eliminated" ? 0.5 : 1,
                        }}
                        className={`bg-white/5 border rounded-lg p-2 transition-all ${
                          player.status === "Eliminated"
                            ? "border-red-500/30"
                            : "border-green-500/30"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p
                              className={`text-xs sm:text-sm font-semibold ${
                                player.status === "Eliminated"
                                  ? "line-through text-gray-500"
                                  : "text-white"
                              }`}
                            >
                              {player.name}
                              {player.address === game?.creator && " (Host)"}
                            </p>
                            <p className="text-xs text-gray-400 font-mono mt-1">
                              {player.address.slice(0, 6)}...
                              {player.address.slice(-4)}
                            </p>
                            {player.eliminatedInRound && (
                              <p className="text-xs text-red-400 mt-1">
                                ❌ Round {player.eliminatedInRound}
                              </p>
                            )}
                            {stxAddress === player.address && (
                              <p className="text-xs text-blue-300 mt-1">
                                🫵 You
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap ${
                              player.status === "Still in"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {player.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {winner && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                      className="mt-4 p-3 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/50 rounded-lg"
                    >
                      <h3 className="text-base font-bold text-green-300 mb-1">
                        🎉 Winner!
                      </h3>
                      <p className="text-sm text-green-200">
                        {winner} wins{" "}
                        {(Number(game?.prizePool) / 1_000_000).toFixed(4)} STX!
                      </p>
                      {stxAddress === game?.winner && !isPrizeClaimed && (
                        <p className="text-xs text-yellow-300 mt-2">
                          👆 Claim your prize above!
                        </p>
                      )}
                    </motion.div>
                  )}

                  {game?.status === GameStatus.Active && isGameCreator && (
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-xs text-blue-300">
                        ℹ️ Waiting for 6 players to join. Once full, start the
                        game!
                      </p>
                    </div>
                  )}

                  {game?.status === GameStatus.InProgress && isGameCreator && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-xs text-yellow-300">
                        ℹ️ Spin to eliminate a player. If timer runs out,
                        advance the round first.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundImgBlur>
  );
};

export default WheelOfFortune;
