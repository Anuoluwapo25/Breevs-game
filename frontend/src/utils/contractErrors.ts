export const mapContractError = (
  error: any
): { code: number; message: string } => {
  const code = error?.error?.code || 0;

  // Check for specific error messages in the error object
  const errorMessage = error?.message || error?.error?.message || "";

  // Handle specific error patterns
  if (
    errorMessage.includes("ERR-ROUND-NOT-ACTIVE") ||
    errorMessage.includes("Round is still active")
  ) {
    return {
      code: 412,
      message: "Round is still active - wait for the timer to expire",
    };
  }

  if (
    errorMessage.includes("ERR-INVALID-STATE") ||
    errorMessage.includes("Invalid game state")
  ) {
    return {
      code: 402,
      message: "Game is not in the correct state for this action",
    };
  }

  if (
    errorMessage.includes("ERR-NOT-HOST") ||
    errorMessage.includes("Only the game creator")
  ) {
    return {
      code: 411,
      message: "Only the game creator can perform this action",
    };
  }

  if (
    errorMessage.includes("ERR-GAME-NOT-FOUND") ||
    errorMessage.includes("Game not found")
  ) {
    return { code: 404, message: "Game not found" };
  }

  switch (code) {
    case 100:
      return { code, message: "Game is full" };
    case 401:
      return { code, message: "Unauthorized action" };
    case 402:
      return { code, message: "Invalid game state" };
    case 403:
      return { code, message: "Round has expired" };
    case 404:
      return { code, message: "Insufficient balance or game not found" };
    case 405:
      return { code, message: "Player already eliminated" };
    case 406:
      return { code, message: "Invalid stake amount" };
    case 407:
      return { code, message: "Invalid round duration" };
    case 408:
      return { code, message: "Only the winner can claim the prize" };
    case 409:
      return { code, message: "Prize already claimed" };
    case 410:
      return { code, message: "No winner found" };
    case 411:
      return { code, message: "Only the game creator can perform this action" };
    case 412:
      return {
        code,
        message: "Round is still active - wait for the timer to expire",
      };
    case 413:
      return { code, message: "Minimum host balance not met" };
    default:
      return {
        code,
        message:
          error instanceof Error
            ? error.message.includes("stx-transfer")
              ? "Failed to transfer STX. Check your balance."
              : error.message
            : "Unknown error occurred",
      };
  }
};
