// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Breevs Russian Roulette – Single-Step Edition
 * @notice Russian-roulette elimination game using inline blockhash randomness.
 *         One call to spin() immediately eliminates a random active player.
 *
 * HOW RANDOMNESS WORKS
 * ────────────────────
 * The seed is derived from:
 *   keccak256(blockhash(block.number - 1), gameId, currentRound, active player list)
 *
 * blockhash(block.number - 1) is the most recent finalised block hash available
 * inside a transaction. It changes every block and is not known to the host
 * before the block is mined, giving reasonable unpredictability for a game
 * context without needing an oracle.
 *
 * NOTE: This is not cryptographically secure VRF — a miner/validator could
 * theoretically influence block hashes, but the practical cost far exceeds
 * the game's prize pool for typical stake sizes.
 *
 * FLOW
 * ────
 * 1. createGame()   – host stakes and sets round duration
 * 2. joinGame()     – 5 more players join (6 total required)
 * 3. startGame()    – host starts; round timer begins
 * 4. spin()         – host spins; one player eliminated immediately;
 *                     round auto-advances after each spin
 * 5. advanceRound() – (optional) manually advance if spin not called in time
 * 6. claimPrize()   – last player standing claims the full prize pool
 */
contract BreevsRussianRoulette {

    // ─── Constants ───────────────────────────────────────────────────────────

    uint256 public constant MAX_PLAYERS             = 6;
    uint256 public constant MIN_PLAYER_STAKE        = 1e18;    // 1 CELO
    uint256 public constant MAX_PLAYER_STAKE        = 1000e18; // 1000 CELO
    uint256 public constant HOST_BALANCE_MULTIPLIER = 5;       // host must hold >= 5x stake
    uint256 public constant MIN_ROUND_DURATION      = 10;      // blocks
    uint256 public constant MAX_ROUND_DURATION      = 1000;    // blocks

    // ─── Types ───────────────────────────────────────────────────────────────

    enum Status { CREATED, IN_PROGRESS, COMPLETED }

    struct Game {
        address   creator;
        address[] players;
        uint256   stake;
        uint256   prizePool;
        Status    status;
        uint256   roundDuration;
        uint256   roundEnd;
        uint256   currentRound;
        address   winner;
        uint256   totalRounds;
    }

    struct PlayerGameData {
        bool    eliminated;
        uint256 eliminationRound;
    }

    struct UserStats {
        uint256 gamesPlayed;
        uint256 gamesWon;
        uint256 totalWinnings;
        uint256 totalStaked;
    }

    // ─── State ───────────────────────────────────────────────────────────────

    uint256 public gameCounter;

    mapping(uint256 => Game)                                public games;
    mapping(uint256 => mapping(address => PlayerGameData)) public playerGameData;
    mapping(uint256 => mapping(address => uint256))        public playerDeposits;
    mapping(uint256 => bool)                               public prizeClaimed;
    mapping(address => UserStats)                          public userStats;

    // ─── Events ──────────────────────────────────────────────────────────────

    event GameCreated(uint256 indexed gameId);
    event PlayerJoined(uint256 indexed gameId, address player);
    event GameStarted(uint256 indexed gameId);
    event PlayerEliminated(uint256 indexed gameId, address player, uint256 round);
    event RoundAdvanced(uint256 indexed gameId, uint256 newRound);
    event GameCompleted(uint256 indexed gameId, address winner);
    event PrizeClaimed(uint256 indexed gameId, address winner, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════════════
    //  GAME MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Create a new game. The host deposits the player stake up front.
     * @param playerStake   Amount in wei every player (including host) must deposit.
     * @param roundDuration Number of blocks each round lasts before it expires.
     */
    function createGame(
        uint256 playerStake,
        uint256 roundDuration
    ) external payable returns (uint256) {
        require(
            playerStake >= MIN_PLAYER_STAKE && playerStake <= MAX_PLAYER_STAKE,
            "Stake must be between 1 and 1000 CELO"
        );
        require(
            roundDuration >= MIN_ROUND_DURATION && roundDuration <= MAX_ROUND_DURATION,
            "Invalid round duration"
        );
        require(msg.value == playerStake, "Host deposit must equal the player stake");

        // msg.value is deducted from balance before this code runs, so add it back
        require(
            address(msg.sender).balance + msg.value >= HOST_BALANCE_MULTIPLIER * playerStake,
            "Host wallet must hold at least 5x the player stake"
        );

        gameCounter++;
        Game storage g  = games[gameCounter];
        g.creator       = msg.sender;
        g.stake         = playerStake;
        g.prizePool     = playerStake;
        g.status        = Status.CREATED;
        g.roundDuration = roundDuration;

        g.players.push(msg.sender);
        playerGameData[gameCounter][msg.sender] = PlayerGameData(false, 0);
        playerDeposits[gameCounter][msg.sender] = playerStake;
        _updateUserStatsOnJoin(msg.sender, playerStake);

        emit GameCreated(gameCounter);
        return gameCounter;
    }

    /**
     * @notice Join an open game by sending the exact stake amount.
     */
    function joinGame(uint256 gameId) external payable {
        Game storage g = games[gameId];
        require(g.status == Status.CREATED,         "Game not joinable");
        require(g.players.length < MAX_PLAYERS,     "Game is full");
        require(!_isUserInGame(gameId, msg.sender), "Already in game");
        require(msg.value == g.stake,               "Must send exactly the game stake");

        g.players.push(msg.sender);
        g.prizePool += g.stake;
        playerGameData[gameId][msg.sender] = PlayerGameData(false, 0);
        playerDeposits[gameId][msg.sender] = g.stake;
        _updateUserStatsOnJoin(msg.sender, g.stake);

        emit PlayerJoined(gameId, msg.sender);
    }

    /**
     * @notice Start the game once all 6 players have joined.
     *         Only the host (creator) can call this.
     */
    function startGame(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.status == Status.CREATED,      "Game not ready");
        require(msg.sender == g.creator,         "Only creator can start");
        require(g.players.length == MAX_PLAYERS, "Need exactly 6 players");

        g.status       = Status.IN_PROGRESS;
        g.currentRound = 1;
        g.roundEnd     = block.number + g.roundDuration;

        emit GameStarted(gameId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  SPIN — single-step random elimination
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Spin the chamber. One active player is eliminated immediately.
     *
     *         Randomness seed:
     *           keccak256(blockhash(block.number - 1), gameId, currentRound, players)
     *
     *         The round advances automatically after every spin so the next
     *         spin can be requested without any extra call.
     *
     *         Must be called by the host while the round window is open.
     */
    function spin(uint256 gameId) external {
        Game storage g = games[gameId];
        require(msg.sender == g.creator,        "Only host can spin");
        require(g.status == Status.IN_PROGRESS, "Game not in progress");
        require(block.number <= g.roundEnd,     "Round has expired - call advanceRound");

        address[] memory active = _getActivePlayers(gameId);
        require(active.length > 1,              "Only one player left");

        // ── Derive seed from the previous finalised block hash ────────────────
        bytes32 seed = keccak256(
            abi.encodePacked(
                blockhash(block.number - 1), // changes every block; finalised before this tx
                gameId,                       // unique per game
                g.currentRound,              // unique per round
                _hashPlayers(active)         // unique per player configuration
            )
        );

        uint256 victimIdx = uint256(seed) % active.length;
        address victim    = active[victimIdx];

        // ── Eliminate chosen player ───────────────────────────────────────────
        _eliminatePlayer(gameId, victim, active);
        emit PlayerEliminated(gameId, victim, g.currentRound);

        // ── Auto-advance round (game stays live for next spin) ────────────────
        // Only advance if the game is still running — _eliminatePlayer may have
        // already called _completeGame when the last opponent was removed.
        if (g.status == Status.IN_PROGRESS) {
            g.currentRound++;
            g.roundEnd = block.number + g.roundDuration;
            emit RoundAdvanced(gameId, g.currentRound);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ROUND MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Manually advance the round if the host did not spin before the
     *         round timer expired. Anyone can call this.
     *         If only one player remains the game completes automatically.
     */
    function advanceRound(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.status == Status.IN_PROGRESS, "Not in progress");
        require(block.number > g.roundEnd,      "Round not ended yet");

        address[] memory active = _getActivePlayers(gameId);
        if (active.length <= 1) {
            _completeGame(gameId, active);
        } else {
            g.currentRound++;
            g.roundEnd = block.number + g.roundDuration;
            emit RoundAdvanced(gameId, g.currentRound);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  PRIZE CLAIMING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice The last surviving player calls this to collect the full prize pool.
     */
    function claimPrize(uint256 gameId) external {
        Game storage g = games[gameId];
        require(g.status == Status.COMPLETED, "Game not completed");
        require(g.winner != address(0),       "No winner set");
        require(msg.sender == g.winner,       "Not the winner");
        require(!prizeClaimed[gameId],        "Prize already claimed");

        prizeClaimed[gameId] = true;
        _updateUserStatsOnWin(msg.sender, g.prizePool);

        (bool sent, ) = payable(msg.sender).call{value: g.prizePool}("");
        require(sent, "Transfer failed");

        emit PrizeClaimed(gameId, msg.sender, g.prizePool);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  VIEW HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Returns all active (non-eliminated) players for a game.
    function getActivePlayers(uint256 gameId) external view returns (address[] memory) {
        return _getActivePlayers(gameId);
    }

    /// @notice Returns the full game struct.
    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    function _isUserInGame(uint256 gameId, address user) internal view returns (bool) {
        address[] storage players = games[gameId].players;
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] == user) return true;
        }
        return false;
    }

    function _getActivePlayers(uint256 gameId) internal view returns (address[] memory) {
        address[] storage all = games[gameId].players;
        uint256 count = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (!playerGameData[gameId][all[i]].eliminated) count++;
        }
        address[] memory active = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < all.length; i++) {
            if (!playerGameData[gameId][all[i]].eliminated) {
                active[idx++] = all[i];
            }
        }
        return active;
    }

    /// @dev Deterministic hash of the player list — extra entropy per spin.
    function _hashPlayers(address[] memory players) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(players));
    }

    /**
     * @dev Marks `player` as eliminated. Accepts the pre-computed `activeBefore`
     *      list so we avoid a redundant storage scan when building the
     *      post-elimination list.
     */
    function _eliminatePlayer(
        uint256 gameId,
        address player,
        address[] memory activeBefore
    ) internal {
        playerGameData[gameId][player].eliminated       = true;
        playerGameData[gameId][player].eliminationRound = games[gameId].currentRound;

        // Build post-elimination list without re-scanning storage
        uint256 remaining = 0;
        for (uint256 i = 0; i < activeBefore.length; i++) {
            if (activeBefore[i] != player) remaining++;
        }
        address[] memory activeAfter = new address[](remaining);
        uint256 idx = 0;
        for (uint256 i = 0; i < activeBefore.length; i++) {
            if (activeBefore[i] != player) activeAfter[idx++] = activeBefore[i];
        }

        if (activeAfter.length == 1) {
            _completeGame(gameId, activeAfter);
        }
    }

    /**
     * @dev Finalises the game. Accepts the already-computed single-element
     *      active array to avoid a redundant storage fetch.
     */
    function _completeGame(uint256 gameId, address[] memory active) internal {
        require(active.length == 1, "Cannot complete: no unique winner");

        Game storage g = games[gameId];
        g.status       = Status.COMPLETED;
        g.winner       = active[0];
        g.totalRounds  = g.currentRound;

        emit GameCompleted(gameId, g.winner);
    }

    function _updateUserStatsOnJoin(address user, uint256 stake) internal {
        UserStats storage s = userStats[user];
        s.gamesPlayed++;
        s.totalStaked += stake;
    }

    function _updateUserStatsOnWin(address user, uint256 winnings) internal {
        UserStats storage s = userStats[user];
        s.gamesWon++;
        s.totalWinnings += winnings;
    }

    /// @dev Reject accidental plain ETH transfers.
    receive() external payable {
        revert("Use joinGame or createGame");
    }
}
