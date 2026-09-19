/**
 * Classic Real-Time Multiplayer Tic-Tac-Toe Shared Contracts
 */
export const WINNING_COMBINATIONS = [
    [0, 1, 2], // Row 0
    [3, 4, 5], // Row 1
    [6, 7, 8], // Row 2
    [0, 3, 6], // Col 0
    [1, 4, 7], // Col 1
    [2, 5, 8], // Col 2
    [0, 4, 8], // Diag 1
    [2, 4, 6], // Diag 2
];
export const TURN_TIMEOUT_SECONDS = 30;
export const RECONNECT_GRACE_WINDOW_MS = 15000;
export const HEALTH_CHECK_INTERVAL_MS = 15000; // 15 seconds keep-alive monitor
//# sourceMappingURL=index.js.map