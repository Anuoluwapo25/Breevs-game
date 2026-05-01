"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  getGameInfo,
  getPlayerData,
  getUserStats,
  createGame,
  joinGame,
  startGame,
  spin,
  advanceRound,
  claimPrize,
  getTotalGames,
  isPrizeClaimed,
  isUserInGame,
  isGameCreator,
  GameStatus,
  GameInfo,
  PlayerData,
  UserStats,
} from "@/lib/contractCalls";
import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";
import { useAccount } from "@micro-stacks/react";

// ----------------------
// READ HOOKS
// ----------------------

export function useGameInfo(gameId: bigint) {
  return useQuery<GameInfo, Error>({
    queryKey: ["gameInfo", gameId],
    queryFn: () => getGameInfo(gameId),
    enabled: !!gameId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
}

export function useGamePlayer(gameId: bigint, player: string) {
  return useQuery<PlayerData, Error>({
    queryKey: ["gamePlayer", gameId, player],
    queryFn: () => getPlayerData(gameId, player),
    enabled: !!gameId && !!player,
  });
}

export function useUserStats(user: string) {
  return useQuery<UserStats, Error>({
    queryKey: ["userStats", user],
    queryFn: () => getUserStats(user),
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useTotalGames() {
  return useQuery<bigint, Error>({
    queryKey: ["totalGames"],
    queryFn: getTotalGames,
    staleTime: 60000,
  });
}

export function useIsPrizeClaimed(gameId: bigint, user: string) {
  return useQuery<boolean, Error>({
    queryKey: ["isPrizeClaimed", gameId.toString(), user],
    queryFn: () => isPrizeClaimed(gameId, user),
    enabled: !!gameId && !!user,
    staleTime: 60_000,
  });
}

export function useIsGameCreator(gameId: bigint, user: string) {
  return useQuery<boolean, Error>({
    queryKey: ["isGameCreator", gameId.toString(), user],
    queryFn: () => isGameCreator(gameId, user),
    enabled: !!gameId && !!user,
  });
}

export function useIsUserInGame(gameId: bigint, user: string) {
  return useQuery<boolean, Error>({
    queryKey: ["isUserInGame", gameId, user],
    queryFn: () => isUserInGame(gameId, user),
    enabled: !!gameId && !!user,
  });
}

export function useAllGames(page: number = 1, pageSize: number = 10) {
  return useQuery<GameInfo[], Error>({
    queryKey: ["allGames", page],
    queryFn: async () => {
      const totalGames = await getTotalGames();
      const start = BigInt((page - 1) * pageSize + 1);
      const end = BigInt(Math.min(Number(totalGames), page * pageSize));
      const games: GameInfo[] = [];
      for (let i = start; i <= end; i++) {
        try {
          const game = await getGameInfo(i);
          games.push(game);
        } catch (error) {
          console.warn(`Skipping game ${i}:`, error);
        }
      }
      return games;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}

export function useActiveGames(page: number = 1, pageSize: number = 10) {
  const { setActiveGames } = useGameStore();
  const queryClient = useQueryClient();
  const query = useQuery<GameInfo[], Error>({
    queryKey: ["activeGames", page],
    queryFn: async () => {
      // Fetch or get cached allGames data
      const allGamesQueryKey = ["allGames", page];
      let allGames = queryClient.getQueryData<GameInfo[]>(allGamesQueryKey);
      if (!allGames) {
        allGames = await queryClient.fetchQuery({
          queryKey: allGamesQueryKey,
          queryFn: async () => {
            const totalGames = await getTotalGames();
            const start = BigInt((page - 1) * pageSize + 1);
            const end = BigInt(Math.min(Number(totalGames), page * pageSize));
            const games: GameInfo[] = [];
            for (let i = start; i <= end; i++) {
              try {
                const game = await getGameInfo(i);
                games.push(game);
              } catch (error) {
                console.warn(`Skipping game ${i}:`, error);
              }
            }
            return games;
          },
        });
      }

      if (!allGames) {
        return [];
      }
      return allGames.filter(
        (g: GameInfo) =>
          g.status === GameStatus.Active || g.status === GameStatus.InProgress
      );
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (query.data) setActiveGames(query.data);
  }, [query.data, setActiveGames]);

  return query;
}

export function useMyGames(): UseQueryResult<GameInfo[], Error> {
  const { stxAddress } = useAccount();
  const { addGame } = useGameStore();

  return useQuery<GameInfo[], Error>({
    queryKey: ["myGames", stxAddress ?? "invalid"],
    queryFn: async () => {
      if (!stxAddress) {
        console.warn("useMyGames: No stxAddress, returning empty games");
        return [];
      }
      const gameIds = Array.from({ length: 10 }, (_, i) => BigInt(i + 1));
      const games: GameInfo[] = [];
      for (const gameId of gameIds) {
        try {
          const game = await getGameInfo(gameId);
          if (game.players.includes(stxAddress)) {
            games.push(game);
            addGame(game);
          }
        } catch (error) {
          console.warn(`useMyGames: Skipping game ${gameId}:`, error);
          continue;
        }
      }
      return games;
    },
    enabled: !!stxAddress,
    staleTime: 60_000,
    refetchInterval: 30_000,
  });
}

export function useGameStatus(
  gameId?: bigint
): UseQueryResult<GameInfo, Error> {
  const { updateGameStatus } = useGameStore();

  const query = useQuery<GameInfo, Error>({
    queryKey: ["gameStatus", gameId?.toString() ?? "invalid"],
    queryFn: () => {
      if (!gameId) {
        throw new Error("Invalid game ID");
      }
      return getGameInfo(gameId);
    },
    refetchInterval: (query) =>
      query.state.data?.status === GameStatus.InProgress ? 5000 : 15000,
    refetchOnWindowFocus: (query) =>
      query.state.data?.status !== GameStatus.Ended,
    enabled: !!gameId,
    retry: 2,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data && gameId) {
      updateGameStatus(gameId, query.data.status);
    }
  }, [query.data, gameId, updateGameStatus]);

  return query;
}

// ----------------------
// WRITE HOOKS
// ----------------------

export function useCreateGame() {
  const qc = useQueryClient();
  return useMutation<
    { txId: string; gameId: bigint },
    Error,
    { stake: bigint; duration: bigint; stxAddress: string }
  >({
    mutationFn: ({ stake, duration, stxAddress }) =>
      createGame(stake, duration, stxAddress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeGames"] });
      qc.invalidateQueries({ queryKey: ["myGames"] });
      qc.invalidateQueries({ queryKey: ["gameStatus"] });
    },
    onError: (error) => {
      throw new Error(error.message);
    },
  });
}

export function useJoinGame() {
  const qc = useQueryClient();
  return useMutation<
    { txId: string },
    Error,
    { gameId: bigint; stake: bigint; stxAddress: string }
  >({
    mutationFn: ({ gameId, stake, stxAddress }) =>
      joinGame(gameId, stake, stxAddress),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeGames"] });
      qc.invalidateQueries({ queryKey: ["myGames"] });
      qc.invalidateQueries({ queryKey: ["gameStatus"] });
    },
    onError: (error) => {
      throw new Error(error.message);
    },
  });
}

export function useStartGame() {
  const qc = useQueryClient();
  return useMutation<{ txId: string }, Error, { gameId: bigint }>({
    mutationFn: ({ gameId }) => startGame(gameId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeGames"] });
      qc.invalidateQueries({ queryKey: ["myGames"] });
      qc.invalidateQueries({ queryKey: ["gameStatus"] });
    },
    onError: (error) => {
      throw new Error(error.message);
    },
  });
}

export interface SpinResult {
  spinTX: { txId: string; value: string };
}

export const useSpin = () => {
  const { updateGameInfo } = useGameStore();
  const qc = useQueryClient();
  return useMutation<SpinResult, Error, { gameId: bigint }>({
    mutationFn: ({ gameId }) => spin(gameId),
    onSuccess: async (data, variables) => {
      const gameInfo = await getGameInfo(variables.gameId);
      updateGameInfo(variables.gameId, gameInfo);
      qc.invalidateQueries({ queryKey: ["activeGames"] });
      qc.invalidateQueries({ queryKey: ["myGames"] });
      qc.invalidateQueries({ queryKey: ["game-status"] });
    },
    onError: (error) => {
      console.error("Spin error:", error);
      throw new Error(error.message);
    },
  });
};

export function useAdvanceRound() {
  const qc = useQueryClient();
  return useMutation<{ txId: string }, Error, { gameId: bigint }>({
    mutationFn: ({ gameId }) => advanceRound(gameId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeGames"] });
      qc.invalidateQueries({ queryKey: ["myGames"] });
      qc.invalidateQueries({ queryKey: ["gameStatus"] });
    },
    onError: (error) => {
      throw new Error(error.message);
    },
  });
}

// export function useClaimPrize() {
//   const qc = useQueryClient();
//   return useMutation<{ txId: string }, Error, { gameId: bigint }>({
//     mutationFn: ({ gameId }) => claimPrize(gameId),
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: ["activeGames"] });
//       qc.invalidateQueries({ queryKey: ["myGames"] });
//       qc.invalidateQueries({ queryKey: ["gameStatus"] });
//       qc.invalidateQueries({ queryKey: ["prizeClaimed"] });
//     },
//     onError: (error) => {
//       throw new Error(error.message);
//     },
//   });
// }

export function useClaimPrize() {
  const qc = useQueryClient();
  return useMutation<{ txId: string }, Error, { gameId: bigint; user: string }>(
    {
      mutationFn: ({ gameId }) => claimPrize(gameId),
      onSuccess: (_, { gameId, user }) => {
        qc.invalidateQueries({ queryKey: ["activeGames"] });
        qc.invalidateQueries({ queryKey: ["myGames"] });
        qc.invalidateQueries({ queryKey: ["gameStatus", gameId.toString()] });
        qc.invalidateQueries({
          queryKey: ["isPrizeClaimed", gameId.toString(), user],
        });
      },
      onError: (error) => {
        throw new Error(error.message);
      },
    }
  );
}
